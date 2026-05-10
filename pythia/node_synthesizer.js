const { NodeVM } = require('vm2');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { validate } = require('./node_validator');

const GENERATED_DIR = path.join(__dirname, 'generated_nodes');
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR);

function nodeTypeToFilename(nodeType) {
  return nodeType.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.js';
}

function buildSynthesisPrompt(node, extraContext = '') {
  return `Eres un generador de nodos para Pythia, motor de automatización de Velvet Software.
Necesito el código JavaScript de un nodo ejecutor para el tipo: "${node.type}"

El nodo tiene estos parámetros: ${JSON.stringify(node.parameters, null, 2)}

CONTRATO OBLIGATORIO — tu función debe tener exactamente esta firma:
async function execute(nodeParams, inputData, nodeOutputs) {
  // nodeParams: los parámetros del nodo del JSON de n8n
  // inputData: datos del nodo anterior en la cadena
  // nodeOutputs: objeto con outputs de todos los nodos ejecutados
  // Retorna: objeto con los datos procesados
}

RESTRICCIONES:
- Solo puedes usar: node-fetch, https (nativo), crypto (nativo)
- No puedes usar: fs, child_process, eval, require de módulos no listados
- Si necesitas una API key, búscala en nodeParams.credentials o nodeParams.apiKey
- Siempre retorna un objeto, nunca null ni undefined
- Máximo 80 líneas de código
- Responde ÚNICAMENTE con el código JavaScript puro, sin markdown, sin explicaciones${extraContext ? '\n\n' + extraContext : ''}`;
}

async function callLLM(prompt, apiKeys) {
  // Intentar OpenAI primero, fallback a Gemini
  if (apiKeys.openai) {
    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: apiKeys.openai });
      const res = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });
      return res.choices[0].message.content.trim();
    } catch (e) {
      console.error('🔴 NodeSynthesizer OpenAI error:', e.message);
    }
  }

  if (apiKeys.gemini) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKeys.gemini);
    const m = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await m.generateContent(prompt);
    return result.response.text().trim();
  }

  throw new Error('No hay API keys disponibles para síntesis de nodos');
}

function cleanGeneratedCode(raw) {
  // Eliminar bloques markdown si el LLM los incluyó
  return raw
    .replace(/^```(?:javascript|js)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();
}

async function synthesize(node, apiKeys) {
  console.log(`🧬 Sintetizando nodo: ${node.type}`);
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const extraContext = lastError
        ? `INTENTO ${attempt}/3. El código anterior falló con este error: "${lastError}". Corrige el problema.`
        : '';

      const prompt = buildSynthesisPrompt(node, extraContext);
      const rawCode = await callLLM(prompt, apiKeys);
      const code = cleanGeneratedCode(rawCode);

      console.log(`🔍 Validando nodo generado (intento ${attempt}/3)...`);
      const result = await validate(code, node);

      if (result.valid) {
        console.log(`✅ Nodo ${node.type} sintetizado y validado correctamente`);
        return code;
      } else {
        lastError = result.error;
        console.warn(`⚠ Validación falló (intento ${attempt}/3): ${result.error}`);
      }
    } catch (e) {
      lastError = e.message;
      console.error(`🔴 Error en síntesis (intento ${attempt}/3): ${e.message}`);
    }
  }

  return null; // Todos los intentos fallaron
}

async function executeGeneratedCode(code, node, input, nodeOutputs) {
  const vm = new NodeVM({
    timeout: 10000,
    sandbox: {},
    require: {
      external: ['node-fetch'],
      builtin: ['https', 'crypto', 'url', 'querystring'],
    },
  });

  const wrappedCode = `${code}\nmodule.exports = execute;`;
  const executeFn = vm.run(wrappedCode, 'generated_node.js');
  return await executeFn(node.parameters || {}, input, nodeOutputs);
}

/**
 * Punto de entrada principal.
 * Resuelve un nodo desconocido: busca en BD, ejecuta si existe,
 * o sintetiza uno nuevo.
 */
async function resolve(node, input, nodeOutputs, apiKeys) {
  const nodeType = node.type;

  // 1. Buscar en BD
  const existing = db.getNode(nodeType);

  if (existing) {
    const successRate = existing.usage_count > 0
      ? existing.success_count / existing.usage_count
      : 1;

    if (successRate >= 0.6) {
      // Ejecutar código guardado
      db.incrementUsage(nodeType);
      try {
        const output = await executeGeneratedCode(existing.code, node, input, nodeOutputs);
        db.incrementSuccess(nodeType);
        console.log(`🧠 Nodo resuelto desde historial: ${nodeType} (v${existing.version})`);
        return output;
      } catch (e) {
        db.setLastError(nodeType, e.message);
        console.error(`🔴 Nodo cacheado falló: ${e.message} — re-sintetizando`);
      }
    } else {
      console.log(`🔄 Nodo ${nodeType} tiene tasa de éxito baja (${Math.round(successRate * 100)}%) — re-sintetizando`);
    }
  }

  // ── CATÁLOGO INTERNO (Fase 5) ─────────────────────────────────────────────
  // Consultar antes de llamar al LLM
  const catalogEntry = db.getCatalogNode(nodeType);

  if (catalogEntry) {
    // Promover al historial de generated_nodes para seguimiento futuro
    if (!db.generatedNodeExists(nodeType)) {
      db.promoteFromCatalog(nodeType, catalogEntry.description, catalogEntry.code);
      const filename = path.join(GENERATED_DIR, nodeTypeToFilename(nodeType));
      fs.writeFileSync(filename, catalogEntry.code, 'utf8');
    }
    console.log(`📦 Nodo resuelto desde catálogo: ${nodeType}`);
    db.incrementUsage(nodeType);
    try {
      const output = await executeGeneratedCode(catalogEntry.code, node, input, nodeOutputs);
      db.incrementSuccess(nodeType);
      return output;
    } catch (e) {
      db.setLastError(nodeType, e.message);
      console.error(`🔴 Nodo de catálogo falló: ${e.message} — sintetizando con LLM`);
    }
  }
  // ── FIN CATÁLOGO INTERNO ──────────────────────────────────────────────────

  // 2. Sintetizar nuevo nodo vía LLM
  const code = await synthesize(node, apiKeys);

  if (!code) {
    console.error(`🔴 No se pudo sintetizar ${nodeType} después de 3 intentos — pasando input sin modificar`);
    return input;
  }

  // 3. Guardar en BD y archivo
  console.log(`✨ Nodo sintetizado por LLM: ${nodeType}`);
  db.upsertNode(nodeType, `Nodo auto-generado para ${nodeType}`, code);

  const filename = path.join(GENERATED_DIR, nodeTypeToFilename(nodeType));
  fs.writeFileSync(filename, code, 'utf8');
  console.log(`💾 Nodo ${nodeType} guardado en ${filename}`);

  // 4. Ejecutar
  db.incrementUsage(nodeType);
  try {
    const output = await executeGeneratedCode(code, node, input, nodeOutputs);
    db.incrementSuccess(nodeType);
    return output;
  } catch (e) {
    db.setLastError(nodeType, e.message);
    console.error(`🔴 Nodo recién sintetizado falló: ${e.message}`);
    return input;
  }
}

module.exports = { resolve };
