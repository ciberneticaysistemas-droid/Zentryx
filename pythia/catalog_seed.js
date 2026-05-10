/**
 * catalog_seed.js — Poblador del catálogo interno de Pythia
 * Velvet Software
 *
 * Ejecutar UNA SOLA VEZ:
 *   node catalog_seed.js
 *
 * El servidor NO ejecuta este script automáticamente.
 * Después de correrlo, los nodos del catálogo estarán disponibles
 * inmediatamente sin necesidad de reiniciar el servidor.
 */

require('dotenv').config();
const db = require('./db');

const nodes = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    node_type: 'n8n-nodes-base.set',
    category: 'transform',
    description: 'Asigna o transforma campos del objeto de datos',
    code: `async function execute(nodeParams, inputData, nodeOutputs) {
  const assignments = nodeParams.values?.number || nodeParams.values?.string || [];
  const keepOnly = nodeParams.keepOnlySet === true;

  // Soporta tanto el formato legacy como el nuevo de n8n
  const values = nodeParams.values || {};
  const result = keepOnly ? {} : { ...inputData };

  // Procesar campos de tipo string
  (values.string || []).forEach(item => {
    if (item.name) result[item.name] = item.value ?? '';
  });

  // Procesar campos de tipo número
  (values.number || []).forEach(item => {
    if (item.name) result[item.name] = Number(item.value) || 0;
  });

  // Procesar campos de tipo boolean
  (values.boolean || []).forEach(item => {
    if (item.name) result[item.name] = item.value === true || item.value === 'true';
  });

  // Formato nuevo n8n: assignments array
  if (nodeParams.assignments?.assignments) {
    nodeParams.assignments.assignments.forEach(a => {
      if (a.name) result[a.name] = a.value ?? '';
    });
  }

  return result;
}`
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    node_type: 'n8n-nodes-base.code',
    category: 'transform',
    description: 'Ejecuta código JavaScript personalizado en sandbox',
    code: `async function execute(nodeParams, inputData, nodeOutputs) {
  const jsCode = nodeParams.jsCode || nodeParams.code || '';
  if (!jsCode.trim()) return inputData;

  // Ejecutamos el código del usuario con acceso a $input y $node
  // Usamos Function() con variables inyectadas de forma segura
  try {
    const fn = new Function(
      '$input', '$node', '$json',
      \`"use strict"; \${jsCode}\`
    );
    const result = fn(
      { item: { json: inputData } },
      nodeOutputs,
      inputData
    );
    // Si retorna un objeto, lo usamos; si no, devolvemos inputData con el resultado
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      return result;
    }
    return { ...inputData, codeResult: result };
  } catch (e) {
    return { ...inputData, codeError: e.message };
  }
}`
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    node_type: 'n8n-nodes-base.wait',
    category: 'logic',
    description: 'Pausa la ejecución del flujo por N milisegundos',
    code: `async function execute(nodeParams, inputData, nodeOutputs) {
  const amount = Number(nodeParams.amount) || 1000;
  const unit = nodeParams.unit || 'milliseconds';

  let ms = amount;
  if (unit === 'seconds') ms = amount * 1000;
  else if (unit === 'minutes') ms = amount * 60 * 1000;
  else if (unit === 'hours') ms = amount * 60 * 60 * 1000;

  // Máximo 5 minutos para evitar bloqueos
  const safems = Math.min(ms, 5 * 60 * 1000);

  await new Promise(resolve => setTimeout(resolve, safems));

  return { ...inputData, waited: safems };
}`
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    node_type: 'n8n-nodes-base.noOp',
    category: 'logic',
    description: 'Nodo vacío que pasa los datos sin modificar (No Operation)',
    code: `async function execute(nodeParams, inputData, nodeOutputs) {
  // No Operation: retorna el input exactamente como llegó
  return inputData;
}`
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    node_type: 'n8n-nodes-base.dateTime',
    category: 'transform',
    description: 'Formatea y manipula fechas con soporte de zonas horarias',
    code: `async function execute(nodeParams, inputData, nodeOutputs) {
  const action = nodeParams.action || 'format';
  const field = nodeParams.value || nodeParams.dateValue || '';
  const format = nodeParams.outputFormat || 'YYYY-MM-DD';
  const outputField = nodeParams.dataPropertyName || 'formattedDate';

  // Resolver valor de fecha
  let dateStr = field;
  if (field.startsWith('$json')) {
    const key = field.match(/\["([^"]+)"\]/)?.[1];
    dateStr = key ? inputData[key] : new Date().toISOString();
  }

  const date = dateStr ? new Date(dateStr) : new Date();

  if (isNaN(date.getTime())) {
    return { ...inputData, [outputField]: null, dateError: 'Fecha inválida: ' + dateStr };
  }

  const pad = n => String(n).padStart(2, '0');
  const Y = date.getFullYear();
  const M = pad(date.getMonth() + 1);
  const D = pad(date.getDate());
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  const formatted = format
    .replace('YYYY', Y).replace('YY', String(Y).slice(-2))
    .replace('MM', M).replace('DD', D)
    .replace('HH', h).replace('mm', m).replace('ss', s);

  return { ...inputData, [outputField]: formatted, timestamp: date.getTime() };
}`
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    node_type: 'n8n-nodes-base.splitInBatches',
    category: 'logic',
    description: 'Divide un array de items en lotes de N elementos',
    code: `async function execute(nodeParams, inputData, nodeOutputs) {
  const batchSize = Number(nodeParams.batchSize) || 10;
  const field = nodeParams.fieldToSplitOut || nodeParams.field || null;

  // Obtener el array a dividir
  let items = [];
  if (field && inputData[field] && Array.isArray(inputData[field])) {
    items = inputData[field];
  } else if (Array.isArray(inputData)) {
    items = inputData;
  } else if (Array.isArray(inputData.items)) {
    items = inputData.items;
  } else {
    // Si no hay array, envolver el input en un array de un elemento
    return { ...inputData, batches: [[inputData]], totalBatches: 1, totalItems: 1 };
  }

  // Crear lotes
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  return {
    ...inputData,
    batches,
    totalBatches: batches.length,
    totalItems: items.length,
    batchSize,
    currentBatch: batches[0] || [],
  };
}`
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    node_type: 'n8n-nodes-base.itemLists',
    category: 'transform',
    description: 'Opera sobre listas: agrupar, ordenar, deduplicar, agregar',
    code: `async function execute(nodeParams, inputData, nodeOutputs) {
  const operation = nodeParams.operation || 'sort';
  const field = nodeParams.fieldToSplitOut || nodeParams.field || 'id';

  // Obtener lista desde inputData
  let list = Array.isArray(inputData) ? inputData
    : Array.isArray(inputData.items) ? inputData.items
    : Array.isArray(inputData[field]) ? inputData[field]
    : [inputData];

  let result = [...list];

  if (operation === 'sort') {
    const sortField = nodeParams.sortFieldName || field;
    const order = nodeParams.order || 'asc';
    result = result.sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      return order === 'asc'
        ? (av > bv ? 1 : av < bv ? -1 : 0)
        : (av < bv ? 1 : av > bv ? -1 : 0);
    });
  } else if (operation === 'removeDuplicates') {
    const dedupeField = nodeParams.compare || field;
    const seen = new Set();
    result = result.filter(item => {
      const key = JSON.stringify(item[dedupeField]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } else if (operation === 'limit') {
    const max = Number(nodeParams.maxItems) || 10;
    result = result.slice(0, max);
  } else if (operation === 'filter') {
    const filterField = nodeParams.filterField || field;
    const filterValue = nodeParams.filterValue || '';
    result = result.filter(item => String(item[filterField] ?? '') === String(filterValue));
  }

  return { items: result, count: result.length, operation };
}`
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    node_type: 'n8n-nodes-base.markdown',
    category: 'transform',
    description: 'Convierte Markdown a HTML o extrae texto plano de Markdown',
    code: `async function execute(nodeParams, inputData, nodeOutputs) {
  const mode = nodeParams.mode || 'markdownToHtml';
  const field = nodeParams.markdown || nodeParams.html || 'content';
  const outputField = nodeParams.destinationKey || 'converted';

  // Obtener texto a convertir
  let text = typeof field === 'string' && !field.includes(' ')
    ? (inputData[field] || inputData.content || inputData.text || '')
    : field;

  if (mode === 'markdownToHtml') {
    // Conversión básica de Markdown a HTML sin dependencias externas
    let html = text
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
      .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
      .replace(/\`(.+?)\`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>')
      .replace(/\\[(.+?)\\]\\((.+?)\\)/g, '<a href="$2">$1</a>')
      .replace(/\\n\\n/g, '</p><p>')
      .trim();
    if (!html.startsWith('<')) html = '<p>' + html + '</p>';
    return { ...inputData, [outputField]: html };
  }

  // htmlToText: eliminar tags HTML
  const plainText = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();

  return { ...inputData, [outputField]: plainText };
}`
  },
];

// ─── Poblar base de datos ─────────────────────────────────────────────────────
console.log('\n🌱 Iniciando poblado del catálogo de nodos de Pythia...\n');

let inserted = 0;
let skipped = 0;

for (const node of nodes) {
  try {
    const existing = db.getCatalogNode(node.node_type);
    if (existing) {
      console.log(`  ⏭ Ya existe: ${node.node_type} — saltando`);
      skipped++;
      continue;
    }
    db.insertCatalogNode(node.node_type, node.description, node.code, node.category);
    console.log(`  ✅ Insertado [${node.category}]: ${node.node_type}`);
    inserted++;
  } catch (e) {
    console.error(`  🔴 Error insertando ${node.node_type}: ${e.message}`);
  }
}

console.log(`\n📦 Catálogo poblado: ${inserted} insertados, ${skipped} ya existían`);
console.log('   Puedes verificar el catálogo en: GET /api/catalog\n');

process.exit(0);
