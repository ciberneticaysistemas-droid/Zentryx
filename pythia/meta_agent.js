const db = require('./db');
const { validate } = require('./node_validator');

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

async function callLLM(prompt, apiKeys) {
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
      console.error('🔴 MetaAgente OpenAI error:', e.message);
    }
  }

  if (apiKeys.gemini) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKeys.gemini);
    const m = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await m.generateContent(prompt);
    return result.response.text().trim();
  }

  throw new Error('No hay API keys disponibles para el meta-agente');
}

function cleanCode(raw) {
  return raw
    .replace(/^```(?:javascript|js)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();
}

async function runOptimizationCycle(apiKeys) {
  if (!apiKeys.openai && !apiKeys.gemini) {
    console.log('🤖 Meta-agente: no hay API keys configuradas, saltando ciclo');
    return;
  }

  console.log('🤖 Meta-agente iniciando ciclo de optimización...');
  const problematicNodes = db.getProblematicNodes();

  if (problematicNodes.length === 0) {
    console.log('🤖 Meta-agente: no hay nodos problemáticos que optimizar');
    return;
  }

  console.log(`🤖 Meta-agente: encontró ${problematicNodes.length} nodo(s) problemático(s)`);

  for (const node of problematicNodes) {
    try {
      const successRate = node.usage_count > 0
        ? Math.round((node.success_count / node.usage_count) * 100)
        : 0;

      console.log(`🔧 Meta-agente analizando: ${node.node_type} (éxito: ${successRate}%)`);

      const prompt = `Eres un optimizador de código de nodos para Pythia, motor de automatización de Velvet Software.

El siguiente nodo de tipo "${node.node_type}" tiene una tasa de éxito del ${successRate}% (${node.success_count}/${node.usage_count} ejecuciones exitosas).

Último error registrado: ${node.last_error || 'Sin información'}

Código actual:
${node.code}

Mejora este código para que no falle en los casos problemáticos. El contrato de la función debe mantenerse:
async function execute(nodeParams, inputData, nodeOutputs) { ... }

RESTRICCIONES:
- Solo puedes usar: node-fetch, https (nativo), crypto (nativo)
- Siempre retorna un objeto, nunca null ni undefined
- Máximo 80 líneas

Responde ÚNICAMENTE con el código JavaScript puro, sin markdown, sin explicaciones.`;

      const rawCode = await callLLM(prompt, apiKeys);
      const improvedCode = cleanCode(rawCode);

      // Validar el código mejorado con un nodo sintético
      const fakeNode = { type: node.node_type, parameters: {} };
      const result = await validate(improvedCode, fakeNode);

      if (result.valid) {
        const newVersion = node.version + 1;
        db.updateNodeCode(node.node_type, improvedCode, newVersion);
        console.log(`🧠 Meta-agente mejoró nodo: ${node.node_type} v${node.version} → v${newVersion}`);
      } else {
        console.warn(`⚠ Meta-agente: código mejorado no pasó validación para ${node.node_type}: ${result.error}`);
      }
    } catch (e) {
      console.error(`🔴 Meta-agente error procesando ${node.node_type}: ${e.message}`);
    }
  }

  console.log('🤖 Meta-agente ciclo completado');
}

function start(getApiKeys) {
  // Primer ciclo después de 5 minutos del arranque (no bloquear startup)
  setTimeout(async () => {
    try {
      await runOptimizationCycle(getApiKeys());
    } catch (e) {
      console.error('🔴 Meta-agente error en ciclo inicial:', e.message);
    }
  }, 5 * 60 * 1000);

  // Ciclos subsiguientes cada 24 horas
  setInterval(async () => {
    try {
      await runOptimizationCycle(getApiKeys());
    } catch (e) {
      console.error('🔴 Meta-agente error en ciclo periódico:', e.message);
    }
  }, INTERVAL_MS);

  console.log('🤖 Meta-agente iniciado (ciclos cada 24h, primer ciclo en 5min)');
}

module.exports = { start, runOptimizationCycle };
