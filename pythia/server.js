require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { VM, NodeVM } = require('vm2');
const chokidar = require('chokidar');
const db = require('./db');
const NodeSynthesizer = require('./node_synthesizer');
const MetaAgent = require('./meta_agent');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const PROJECT_NAME = process.env.PROJECT_NAME || '';
const FLOWS_DIR = path.join(__dirname, 'workflows');
const GENERATED_DIR = path.join(__dirname, 'generated_nodes');
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR);

// ─── Token Tracker de sesión (Zentryx — preservado) ──────────────────────────
let sessionStats = {
  tokensUsed: 0,
  requests: 0,
  lastRequestTime: null,
  tpm: 0,
};

// ─── Memoria de sesiones por sessionId (Fase 3.3) ────────────────────────────
const sessionMemory = new Map();
const SESSION_MAX_MSGS = 10;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function getSession(sessionId) {
  if (!sessionId) return null;
  const s = sessionMemory.get(sessionId);
  if (!s) return [];
  s.lastActive = Date.now();
  return s.history;
}

function saveToSession(sessionId, role, content) {
  if (!sessionId) return;
  if (!sessionMemory.has(sessionId)) {
    sessionMemory.set(sessionId, { history: [], lastActive: Date.now() });
  }
  const s = sessionMemory.get(sessionId);
  s.history.push({ role, content });
  s.lastActive = Date.now();
  if (s.history.length > SESSION_MAX_MSGS) {
    s.history.splice(0, s.history.length - SESSION_MAX_MSGS);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessionMemory.entries()) {
    if (now - s.lastActive > SESSION_TTL_MS) {
      sessionMemory.delete(id);
      console.log(`🗑 Sesión expirada eliminada: ${id}`);
    }
  }
}, 30 * 60 * 1000);

// ─── 1.3 Middleware de autenticación (opcional, backward compatible) ───────────
function authMiddleware(req, res, next) {
  const secret = process.env.PYTHIA_SECRET;
  if (!secret) return next();
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}
app.use('/api', authMiddleware);
app.use('/webhook', authMiddleware);

// ─── Cargar workflows ─────────────────────────────────────────────────────────
function loadWorkflows() {
  if (!fs.existsSync(FLOWS_DIR)) fs.mkdirSync(FLOWS_DIR);
  return fs.readdirSync(FLOWS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(FLOWS_DIR, f), 'utf8'));
      } catch (e) {
        console.error(`⚠ Error leyendo workflow ${f}: ${e.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

let workflows = loadWorkflows();

// ─── 2.3 Hot-reload con Chokidar ─────────────────────────────────────────────
let reloadDebounce = null;
function scheduleReload(label) {
  clearTimeout(reloadDebounce);
  reloadDebounce = setTimeout(() => {
    workflows = loadWorkflows();
    console.log(`♻ Workflow recargado: ${label} (total: ${workflows.length})`);
    registerWebhooks();
  }, 300);
}

chokidar.watch(FLOWS_DIR, { ignoreInitial: true })
  .on('add', f => scheduleReload(path.basename(f)))
  .on('change', f => scheduleReload(path.basename(f)))
  .on('unlink', f => scheduleReload(path.basename(f)));

chokidar.watch(GENERATED_DIR, { ignoreInitial: true })
  .on('add', f => console.log(`🧩 Nuevo nodo generado: ${path.basename(f)}`))
  .on('change', f => console.log(`🔄 Nodo actualizado: ${path.basename(f)}`));

// ─── Utilidades Zentryx (preservadas) ────────────────────────────────────────
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

async function extractTextFromBase64(base64Data) {
  if (!base64Data || typeof base64Data !== 'string' || !base64Data.startsWith('data:')) {
    return base64Data;
  }
  try {
    const [header, content] = base64Data.split(';base64,');
    const buffer = Buffer.from(content, 'base64');
    if (header.includes('pdf')) {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (header.includes('word') || header.includes('officedocument')) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    return base64Data;
  } catch (e) {
    console.error('Error extrayendo texto:', e.message);
    return `[Error al extraer texto del archivo]`;
  }
}

// ─── 1.1 Evaluador de expresiones n8n con vm2 (reemplaza eval) ───────────────
function evalExpr(template, $json, nodeOutputs = {}) {
  if (typeof template !== 'string') return template;

  const buildVM = () => new VM({
    timeout: 500,
    sandbox: {
      $json,
      $: (name) => ({ item: { json: nodeOutputs[name] || {} } }),
      $node: (name) => ({ item: { json: nodeOutputs[name] || {} } }),
      $now: { toFormat: () => new Date().toISOString().split('T')[0] },
    }
  });

  const isPure = template.startsWith('={{') && template.endsWith('}}') && template.indexOf('{{', 3) === -1;
  if (isPure) {
    const expr = template.slice(3, -2).trim();
    try { return buildVM().run(`(${expr})`); }
    catch (e) { console.error('VM eval error:', e.message, 'en', template); return null; }
  }

  let str = template.startsWith('=') ? template.slice(1) : template;
  return str.replace(/\{\{([\s\S]+?)\}\}/g, (_, expr) => {
    try { const result = buildVM().run(expr.trim()); return result ?? ''; }
    catch { return ''; }
  });
}

// ─── Motor de ejecución ───────────────────────────────────────────────────────
class FlowExecutor {
  constructor(workflow, apiKeys, sessionId = null) {
    this.workflow = workflow;
    this.apiKeys = apiKeys;
    this.sessionId = sessionId;
    this.nodeOutputs = {};
    this.logs = [];
    this.nodeMap = {};
    workflow.nodes.forEach(n => (this.nodeMap[n.name] = n));

    this.lmOf = {};
    this.parserOf = {};
    Object.entries(workflow.connections || {}).forEach(([src, conns]) => {
      conns.ai_languageModel?.[0]?.forEach(c => (this.lmOf[c.node] = this.nodeMap[src]));
      conns.ai_outputParser?.[0]?.forEach(c => (this.parserOf[c.node] = this.nodeMap[src]));
    });
  }

  log(msg, type = 'info') {
    const entry = { time: new Date().toLocaleTimeString('es-CO'), msg, type };
    this.logs.push(entry);
    console.log(`[${type.toUpperCase()}] ${msg}`);
    if (this.onLog) this.onLog(entry);
  }

  async execute(inputData) {
    this.log('📄 Procesando entrada de datos...', 'info');

    // Pre-procesamiento de base64 (Zentryx — preservado)
    if (inputData?.body) {
      const b = inputData.body;
      if (b.candidates && Array.isArray(b.candidates)) {
        for (const c of b.candidates) {
          if (c.cvText && c.cvText.startsWith('data:')) {
            this.log(`🔍 Extrayendo texto de CV: ${c.name || 'Sin nombre'}`, 'info');
            c.cvText = await extractTextFromBase64(c.cvText);
            this.log(`✅ Texto extraído: "${c.cvText.slice(0, 100)}..."`, 'success');
          }
        }
      }
      if (b.documentDescription && b.documentDescription.startsWith('data:')) {
        this.log(`🔍 Extrayendo texto de Justificación Médica`, 'info');
        b.documentDescription = await extractTextFromBase64(b.documentDescription);
        this.log(`✅ Texto extraído: "${b.documentDescription.slice(0, 100)}..."`, 'success');
      }
      if (b.docContent && b.docContent.startsWith('data:')) {
        this.log(`🔍 Extrayendo texto de Documento para Envío`, 'info');
        b.docContent = await extractTextFromBase64(b.docContent);
        this.log(`✅ Texto extraído: "${b.docContent.slice(0, 100)}..."`, 'success');
      }
    }

    const trigger = this.workflow.nodes.find(n =>
      n.type === 'n8n-nodes-base.webhook' ||
      n.type === 'n8n-nodes-base.gmailTrigger'
    );
    if (!trigger) throw new Error('No se encontró nodo trigger');
    this.log(`▶ Iniciando: ${this.workflow.name}`, 'start');
    this.nodeOutputs[trigger.name] = inputData;
    const firstConn = this.workflow.connections[trigger.name]?.main?.[0]?.[0];
    if (!firstConn) return inputData;
    return await this.runChain(firstConn.node, inputData);
  }

  async runChain(nodeName, input) {
    const node = this.nodeMap[nodeName];
    if (!node) return input;
    this.log(`⚙ Nodo: ${nodeName}`, 'node');
    let output;
    try {
      switch (node.type) {
        case '@n8n/n8n-nodes-langchain.agent':
          output = await this.runAgent(node, input); break;
        case 'n8n-nodes-base.respondToWebhook':
          output = this.runRespond(node, input); break;
        case 'n8n-nodes-base.httpRequest':
          output = await this.runHttp(node, input); break;
        case 'n8n-nodes-base.gmail':
          output = this.runGmailLog(node, input); break;

        // ── Fase 3.2: Control de flujo ─────────────────────────────────────
        case 'n8n-nodes-base.if':
          return await this.runIf(node, input);
        case 'n8n-nodes-base.switch':
          return await this.runSwitch(node, input);
        case 'n8n-nodes-base.merge':
          output = this.runMerge(node, input); break;

        // ── Fase 4.3: OCR ──────────────────────────────────────────────────
        case 'n8n-nodes-base.googleCloudNaturalLanguage':
        case 'velvet.ocr-vision':
          output = await this.runOcrVision(node, input); break;

        // ── Fase 4.4: Bases de datos ───────────────────────────────────────
        case 'n8n-nodes-base.postgres':
          output = await this.runPostgres(node, input); break;
        case 'velvet.sqlite':
          output = await this.runSqliteNode(node, input); break;

        // ── Síntesis automática (Fase 3.1) ─────────────────────────────────
        default:
          this.log(`🧬 Nodo desconocido: ${node.type} — intentando síntesis automática`, 'warn');
          output = await NodeSynthesizer.resolve(node, input, this.nodeOutputs, this.apiKeys);
      }
    } catch (e) {
      this.log(`✗ Error en ${nodeName}: ${e.message}`, 'error');
      throw e;
    }
    this.nodeOutputs[nodeName] = output;
    const next = this.workflow.connections[nodeName]?.main?.[0];
    if (next?.length) {
      for (const conn of next) output = await this.runChain(conn.node, output);
    }
    return output;
  }

  // ── Fase 3.2: If/Else ──────────────────────────────────────────────────────
  async runIf(node, input) {
    const conditions = node.parameters.conditions?.conditions || [];
    let result = true;
    for (const cond of conditions) {
      const leftVal = evalExpr(String(cond.leftValue ?? ''), input, this.nodeOutputs);
      const rightVal = evalExpr(String(cond.rightValue ?? ''), input, this.nodeOutputs);
      let condResult = false;
      switch (cond.operation) {
        case 'equal':        condResult = leftVal == rightVal; break;
        case 'notEqual':     condResult = leftVal != rightVal; break;
        case 'larger':       condResult = Number(leftVal) > Number(rightVal); break;
        case 'largerEqual':  condResult = Number(leftVal) >= Number(rightVal); break;
        case 'smaller':      condResult = Number(leftVal) < Number(rightVal); break;
        case 'smallerEqual': condResult = Number(leftVal) <= Number(rightVal); break;
        case 'contains':     condResult = String(leftVal).includes(String(rightVal)); break;
        case 'notContains':  condResult = !String(leftVal).includes(String(rightVal)); break;
        case 'startsWith':   condResult = String(leftVal).startsWith(String(rightVal)); break;
        case 'endsWith':     condResult = String(leftVal).endsWith(String(rightVal)); break;
        case 'isEmpty':      condResult = !leftVal || leftVal === ''; break;
        case 'isNotEmpty':   condResult = !!leftVal && leftVal !== ''; break;
        default:             condResult = !!leftVal;
      }
      if (!condResult) { result = false; break; }
    }
    this.log(`🔀 If: condición ${result ? 'VERDADERA' : 'FALSA'}`, 'node');
    this.nodeOutputs[node.name] = input;
    const branch = this.workflow.connections[node.name]?.main?.[result ? 0 : 1];
    if (branch?.length) {
      let output = input;
      for (const conn of branch) output = await this.runChain(conn.node, output);
      return output;
    }
    return input;
  }

  // ── Fase 3.2: Switch ───────────────────────────────────────────────────────
  async runSwitch(node, input) {
    const value = evalExpr(String(node.parameters.value ?? ''), input, this.nodeOutputs);
    const rules = node.parameters.rules?.rules || [];
    let matchedBranch = rules.length;
    for (let i = 0; i < rules.length; i++) {
      const ruleVal = evalExpr(String(rules[i].value ?? ''), input, this.nodeOutputs);
      if (String(value) === String(ruleVal)) { matchedBranch = i; break; }
    }
    this.log(`🔀 Switch: rama ${matchedBranch}`, 'node');
    this.nodeOutputs[node.name] = input;
    const branch = this.workflow.connections[node.name]?.main?.[matchedBranch];
    if (branch?.length) {
      let output = input;
      for (const conn of branch) output = await this.runChain(conn.node, output);
      return output;
    }
    return input;
  }

  // ── Fase 3.2: Merge ────────────────────────────────────────────────────────
  runMerge(node, input) {
    const mode = node.parameters.mode || 'append';
    if (mode === 'append') {
      const allOutputs = Object.values(this.nodeOutputs).filter(o => o !== null);
      return { merged: allOutputs, count: allOutputs.length };
    }
    return input;
  }

  // ── Agente IA — Zentryx (token tracking) + Fase 3.3 (historial sesión) ─────
  async runAgent(node, input) {
    const lmNode = this.lmOf[node.name];
    const parserNode = this.parserOf[node.name];
    const prompt = evalExpr(node.parameters.text, input, this.nodeOutputs);
    const system = node.parameters.options?.systemMessage || '';
    const schemaHint = parserNode
      ? `\n\nResponde ÚNICAMENTE con un JSON válido con esta estructura exacta:\n${parserNode.parameters.jsonSchemaExample || parserNode.parameters.schema}`
      : '';

    // Historial de sesión (Fase 3.3)
    const history = getSession(this.sessionId);
    const historyText = history && history.length > 0
      ? '\n\n[Conversación previa con este usuario:]\n' +
        history.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n') +
        '\n[Fin del historial]'
      : '';

    let isGemini = lmNode?.type?.includes('GoogleGemini');
    if (!this.apiKeys.openai && this.apiKeys.gemini) isGemini = true;
    const model = lmNode?.parameters?.model?.value || 'gpt-4o-mini';
    const safeModel = model === 'gpt-5-mini' ? 'gpt-4o-mini' : model;

    const fullSystem = system + historyText;
    const inputTokens = estimateTokens(fullSystem + prompt + schemaHint);
    this.log(`🤖 Llamando ${isGemini ? 'Gemini' : safeModel}... (${inputTokens} tokens est.)`, 'ai');

    const startTime = Date.now();
    const raw = isGemini
      ? await this.callGemini(fullSystem, prompt + schemaHint, safeModel)
      : await this.callOpenAI(safeModel, fullSystem, prompt + schemaHint);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const outputTokens = estimateTokens(raw);
    const total = inputTokens + outputTokens;

    // Token tracker de sesión (Zentryx — preservado)
    sessionStats.tokensUsed += total;
    sessionStats.requests += 1;
    sessionStats.lastRequestTime = new Date().toISOString();

    this.log(`✓ Respuesta IA recibida (${duration}s | ${outputTokens} tokens est.)`, 'success');
    this.log(`📊 Uso total estimado: ${total} tokens`, 'info');

    // Guardar en memoria de sesión
    saveToSession(this.sessionId, 'user', prompt);
    saveToSession(this.sessionId, 'assistant', typeof raw === 'string' ? raw : JSON.stringify(raw));

    if (parserNode) {
      try {
        const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        const parsed = JSON.parse(match ? match[0] : raw);
        return { output: parsed };
      } catch { return { output: { raw } }; }
    }
    return { output: raw };
  }

  // ── 2.1 Timeouts en llamadas IA ────────────────────────────────────────────
  async callOpenAI(model, system, prompt) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: this.apiKeys.openai });
      const res = await client.chat.completions.create({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        temperature: 0.3,
      }, { signal: controller.signal });
      return res.choices[0].message.content;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error(`IA timeout después de 30s — modelo: ${model}`);
      throw e;
    } finally { clearTimeout(timer); }
  }

  // ── callGemini con retry logic (Zentryx — preservado) ─────────────────────
  async callGemini(system, prompt, model = 'gemini-flash-latest') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      if (!this.apiKeys.gemini) throw new Error('GEMINI_API_KEY no configurada');
      const genAI = new GoogleGenerativeAI(this.apiKeys.gemini);
      const modelName = model.includes('gemini') ? model : 'gemini-flash-latest';
      try {
        const m = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1' });
        const result = await m.generateContent(system ? `${system}\n\n${prompt}` : prompt);
        return result.response.text();
      } catch (e) {
        this.log(`✗ Error en Gemini (${modelName}): ${e.message}`, 'error');
        if (modelName !== 'gemini-2.5-flash') {
          this.log('🔄 Reintentando con gemini-2.5-flash...', 'warn');
          const m = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });
          const result = await m.generateContent(system ? `${system}\n\n${prompt}` : prompt);
          return result.response.text();
        }
        throw e;
      }
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('IA timeout después de 30s — modelo: Gemini');
      throw e;
    } finally { clearTimeout(timer); }
  }

  runRespond(node, input) {
    const rb = node.parameters.responseBody;
    if (typeof rb === 'string') {
      const evaluated = evalExpr(rb, input, this.nodeOutputs);
      if (typeof evaluated === 'object') return evaluated;
      try { return JSON.parse(evaluated); }
      catch { return { result: evaluated }; }
    }
    return rb || input;
  }

  async runHttp(node, input) {
    const url = evalExpr(node.parameters.url, input, this.nodeOutputs);
    this.log(`🌐 HTTP ${node.parameters.method} → ${url}`, 'http');
    try {
      const fetch = require('node-fetch');
      const bodyParams = node.parameters.bodyParameters?.parameters || [];
      const body = {};
      bodyParams.forEach(p => { body[p.name] = evalExpr(p.value, input, this.nodeOutputs); });
      const res = await fetch(url, {
        method: node.parameters.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeout: 5000,
      });
      const data = await res.json().catch(() => ({}));
      this.log(`✓ HTTP ${res.status}`, 'success');
      return data;
    } catch (e) {
      this.log(`⚠ HTTP falló (${e.message}) — continuando`, 'warn');
      return { skipped: true, reason: e.message };
    }
  }

  runGmailLog(node, input) {
    const to = evalExpr(node.parameters.sendTo, input, this.nodeOutputs);
    const subject = evalExpr(node.parameters.subject, input, this.nodeOutputs);
    this.log(`📧 Gmail → ${to} | Asunto: ${subject} (modo demo)`, 'email');
    return { sent: true, demo: true, to, subject };
  }

  // ── Fase 4.3: OCR Google Vision ────────────────────────────────────────────
  async runOcrVision(node, input) {
    const apiKey = node.parameters.credentials?.googleCloudApiKey || '';
    const imageBase64 = input.image || input.imageBase64 || '';
    if (!imageBase64) {
      this.log('⚠ OCR: no se encontró imagen en inputData', 'warn');
      return { text: '', confidence: 0, blocks: [] };
    }
    this.log('👁 Llamando Google Vision OCR...', 'http');
    try {
      const fetch = require('node-fetch');
      const body = { requests: [{ image: { content: imageBase64 }, features: [{ type: 'TEXT_DETECTION' }] }] };
      const res = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      const data = await res.json();
      const annotation = data.responses?.[0]?.fullTextAnnotation;
      const blocks = data.responses?.[0]?.textAnnotations?.slice(1) || [];
      this.log(`✓ OCR completado — ${blocks.length} bloques detectados`, 'success');
      return { text: annotation?.text || '', confidence: annotation?.pages?.[0]?.confidence || 0, blocks };
    } catch (e) {
      this.log(`⚠ OCR falló: ${e.message}`, 'warn');
      return { text: '', confidence: 0, blocks: [], error: e.message };
    }
  }

  // ── Fase 4.4: PostgreSQL ───────────────────────────────────────────────────
  async runPostgres(node, input) {
    const { Client } = require('pg');
    const connectionString = node.parameters.credentials?.connectionString || '';
    const query = evalExpr(node.parameters.query || '', input, this.nodeOutputs);
    this.log(`🗄 PostgreSQL: ${query.slice(0, 60)}...`, 'http');
    const client = new Client({ connectionString });
    try {
      await client.connect();
      const result = await client.query(query);
      this.log(`✓ PostgreSQL: ${result.rowCount} fila(s)`, 'success');
      return { rows: result.rows, rowCount: result.rowCount };
    } catch (e) {
      this.log(`⚠ PostgreSQL error: ${e.message}`, 'warn');
      return { rows: [], rowCount: 0, error: e.message };
    } finally { await client.end().catch(() => {}); }
  }

  // ── Fase 4.4: SQLite local ─────────────────────────────────────────────────
  async runSqliteNode(node, input) {
    const Database = require('better-sqlite3');
    const dbPath = node.parameters.databasePath || path.join(__dirname, 'workflow_data.db');
    const query = evalExpr(node.parameters.query || '', input, this.nodeOutputs);
    const operation = node.parameters.operation || 'query';
    this.log(`🗄 SQLite ${operation}: ${query.slice(0, 60)}...`, 'http');
    try {
      const localDb = new Database(dbPath);
      if (operation === 'query' || operation === 'select') {
        const rows = localDb.prepare(query).all();
        this.log(`✓ SQLite: ${rows.length} fila(s)`, 'success');
        return { rows, rowCount: rows.length };
      } else {
        const result = localDb.prepare(query).run();
        this.log(`✓ SQLite: ${result.changes} cambio(s)`, 'success');
        return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
      }
    } catch (e) {
      this.log(`⚠ SQLite error: ${e.message}`, 'warn');
      return { rows: [], changes: 0, error: e.message };
    }
  }
}

// ─── Registro dinámico de webhooks ───────────────────────────────────────────
const webhookMap = new Map();

function registerWebhooks() {
  webhookMap.clear();
  workflows.forEach(w => {
    const wh = w.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
    if (wh?.parameters?.path) webhookMap.set(wh.parameters.path, w);
  });
}
registerWebhooks();

// ─── Rutas API ────────────────────────────────────────────────────────────────
app.get('/api/config', (_, res) => {
  res.json({ projectName: PROJECT_NAME });
});

// /api/stats → Zentryx sessionStats (preservado) + métricas SQLite fusionadas
app.get('/api/stats', (_, res) => {
  const sqliteStats = db.getStats();
  res.json({
    // Zentryx session stats (preservados)
    tokensUsed: sessionStats.tokensUsed,
    requests: sessionStats.requests,
    lastRequestTime: sessionStats.lastRequestTime,
    tpm: sessionStats.tpm,
    // SQLite global metrics (nuevos)
    totalExecutions: sqliteStats.total_executions,
    successRate: sqliteStats.success_rate,
    avgDurationMs: sqliteStats.avg_duration_ms,
    generatedNodesTotal: sqliteStats.generated_nodes_total,
  });
});

app.get('/api/workflows', (_, res) => {
  res.json(workflows.map(w => {
    const trigger = w.nodes.find(n => n.type.includes('gmailTrigger') || n.type.includes('webhook'));
    const lmNode = w.nodes.find(n => n.type.includes('lmChat'));
    return {
      name: w.name,
      triggerType: trigger?.type.includes('gmail') ? 'gmail' : 'webhook',
      webhookPath: trigger?.parameters?.path || null,
      aiModel: lmNode?.parameters?.model?.value || (lmNode?.type?.includes('Gemini') ? 'gemini' : null),
      nodeCount: w.nodes.filter(n => !n.type.includes('langchain.lm') && !n.type.includes('outputParser')).length,
    };
  }));
});

// ── 1.2 API keys: acepta body (Zentryx compat) Y headers (nuevo) ─────────────
app.post('/api/execute', async (req, res) => {
  const { workflowName, inputData, sessionId } = req.body;
  // Body primero (Zentryx frontend), luego headers (nuevo), luego .env
  const openaiKey = req.body.openaiKey || req.headers['x-openai-key'] || process.env.OPENAI_API_KEY || '';
  const geminiKey = req.body.geminiKey || req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY || '';

  const workflow = workflows.find(w => w.name === workflowName);
  if (!workflow) return res.status(404).json({ error: 'Workflow no encontrado' });

  const apiKeys = { openai: openaiKey, gemini: geminiKey };
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const executor = new FlowExecutor(workflow, apiKeys, sessionId || null);

  try {
    const result = await executor.execute(inputData);
    const duration = Date.now() - t0;
    db.saveExecution({
      workflow_name: workflowName,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: duration,
      status: 'success',
      input_data: inputData,
      output_data: result,
      logs: executor.logs,
    });
    res.json({ success: true, result, logs: executor.logs });
  } catch (e) {
    const duration = Date.now() - t0;
    const status = e.message.includes('timeout') ? 'timeout' : 'error';
    db.saveExecution({
      workflow_name: workflowName,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: duration,
      status,
      input_data: inputData,
      output_data: null,
      logs: executor.logs,
      error_message: e.message,
    });
    res.json({ success: false, error: e.message, logs: executor.logs });
  }
});

// ── 2.2 Historial de ejecuciones ─────────────────────────────────────────────
app.get('/api/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;
  res.json({ items: db.listExecutions(limit, offset), total: db.countExecutions(), limit, offset });
});

app.get('/api/history/:id', (req, res) => {
  const item = db.getExecution(parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Ejecución no encontrada' });
  res.json(item);
});

app.delete('/api/history', (req, res) => {
  res.json({ ok: true, deleted: db.deleteAllExecutions() });
});

// ── 4.2 Gestión de nodos generados ───────────────────────────────────────────
app.get('/api/nodes', (_, res) => {
  res.json(db.listNodes().map(n => ({
    ...n,
    success_rate: n.usage_count > 0 ? Math.round((n.success_count / n.usage_count) * 100) : null,
  })));
});

app.get('/api/nodes/:type', (req, res) => {
  const node = db.getNode(decodeURIComponent(req.params.type));
  if (!node) return res.status(404).json({ error: 'Nodo no encontrado' });
  res.json({ ...node, success_rate: node.usage_count > 0 ? Math.round((node.success_count / node.usage_count) * 100) : null });
});

app.delete('/api/nodes/:type', (req, res) => {
  const nodeType = decodeURIComponent(req.params.type);
  const deleted = db.deleteNode(nodeType);
  if (!deleted) return res.status(404).json({ error: 'Nodo no encontrado' });
  const filename = path.join(GENERATED_DIR, nodeType.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.js');
  if (fs.existsSync(filename)) fs.unlinkSync(filename);
  res.json({ ok: true, node_type: nodeType });
});

app.post('/api/nodes/:type/reset', (req, res) => {
  const nodeType = decodeURIComponent(req.params.type);
  if (!db.getNode(nodeType)) return res.status(404).json({ error: 'Nodo no encontrado' });
  db.resetCounters(nodeType);
  res.json({ ok: true, node_type: nodeType });
});

// ── 5.4 Catálogo interno ─────────────────────────────────────────────────────
app.get('/api/catalog', (_, res) => res.json(db.listCatalog()));

app.get('/api/catalog/:category', (req, res) => {
  const valid = ['communication','database','file','http','transform','logic','crm','storage'];
  if (!valid.includes(req.params.category))
    return res.status(400).json({ error: `Categoría inválida. Válidas: ${valid.join(', ')}` });
  res.json(db.listCatalog(req.params.category));
});

app.post('/api/catalog', (req, res) => {
  const { node_type, description, code, category } = req.body;
  if (!node_type || !code || !category) return res.status(400).json({ error: 'Requeridos: node_type, code, category' });
  const valid = ['communication','database','file','http','transform','logic','crm','storage'];
  if (!valid.includes(category)) return res.status(400).json({ error: `Categoría inválida` });
  db.insertCatalogNode(node_type, description || '', code, category, 'manual');
  console.log(`📦 Nodo añadido al catálogo: ${node_type}`);
  res.json({ ok: true, node_type });
});

app.delete('/api/catalog/:node_type', (req, res) => {
  const node_type = decodeURIComponent(req.params.node_type);
  const deleted = db.deleteCatalogNode(node_type);
  if (!deleted) return res.status(404).json({ error: 'Nodo no encontrado en catálogo' });
  res.json({ ok: true, node_type });
});

// ── Reload manual (preservado) ────────────────────────────────────────────────
app.get('/api/reload', (_, res) => {
  workflows = loadWorkflows();
  registerWebhooks();
  res.json({ ok: true, count: workflows.length });
});

// ── Webhooks dinámicos ────────────────────────────────────────────────────────
app.post('/webhook/:path', async (req, res) => {
  const w = webhookMap.get(req.params.path);
  if (!w) return res.status(404).json({ error: 'Webhook no encontrado' });
  console.log(`\n📥 Webhook recibido: ${req.params.path}`);
  const openaiKey = req.headers['x-openai-key'] || process.env.OPENAI_API_KEY || '';
  const geminiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY || '';
  const executor = new FlowExecutor(w, { openai: openaiKey, gemini: geminiKey });
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  try {
    const result = await executor.execute({ body: req.body });
    db.saveExecution({ workflow_name: w.name, started_at: startedAt, finished_at: new Date().toISOString(), duration_ms: Date.now() - t0, status: 'success', input_data: req.body, output_data: result, logs: executor.logs });
    res.json(result);
  } catch (e) {
    db.saveExecution({ workflow_name: w.name, started_at: startedAt, finished_at: new Date().toISOString(), duration_ms: Date.now() - t0, status: 'error', input_data: req.body, logs: executor.logs, error_message: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, '127.0.0.1', () => {
  const displayProject = PROJECT_NAME ? `${PROJECT_NAME} ` : '';
  console.log(`\n🚀 ${displayProject}Pythia corriendo en http://127.0.0.1:${PORT}`);
  console.log(`🔒 Auth: ${process.env.PYTHIA_SECRET ? 'ACTIVO' : 'LOCAL (sin auth)'}`);
  console.log(`🗄 SQLite: executions.db inicializado`);
  console.log(`👁 Chokidar observando: workflows/ y generated_nodes/`);
  console.log('📋 Workflows cargados:');
  workflows.forEach(w => console.log(`   • ${w.name}`));
  if (workflows.length === 0) console.log('   (sin workflows)');

  MetaAgent.start(() => ({
    openai: process.env.OPENAI_API_KEY || '',
    gemini: process.env.GEMINI_API_KEY || '',
  }));
});
