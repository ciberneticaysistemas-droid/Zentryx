const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'executions.db');
const db = new Database(DB_PATH);

// Optimizaciones de rendimiento
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Esquema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS executions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_name TEXT NOT NULL,
    started_at   TEXT NOT NULL,
    finished_at  TEXT,
    duration_ms  INTEGER,
    status       TEXT CHECK(status IN ('success','error','timeout')),
    input_data   TEXT,
    output_data  TEXT,
    logs         TEXT,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS node_catalog (
    node_type    TEXT PRIMARY KEY,
    description  TEXT,
    code         TEXT NOT NULL,
    category     TEXT CHECK(category IN ('communication','database','file','http','transform','logic','crm','storage')),
    source       TEXT DEFAULT 'velvet-builtin',
    version      INTEGER DEFAULT 1,
    added_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS generated_nodes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    node_type     TEXT UNIQUE NOT NULL,
    description   TEXT,
    code          TEXT NOT NULL,
    version       INTEGER DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    usage_count   INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    last_error    TEXT
  );
`);

// ─── Helpers de ejecuciones ──────────────────────────────────────────────────
const stmtInsertExec = db.prepare(`
  INSERT INTO executions (workflow_name, started_at, finished_at, duration_ms, status, input_data, output_data, logs, error_message)
  VALUES (@workflow_name, @started_at, @finished_at, @duration_ms, @status, @input_data, @output_data, @logs, @error_message)
`);

const stmtListExec = db.prepare(`
  SELECT id, workflow_name, started_at, finished_at, duration_ms, status, error_message
  FROM executions
  ORDER BY id DESC
  LIMIT @limit OFFSET @offset
`);

const stmtGetExec = db.prepare(`
  SELECT * FROM executions WHERE id = ?
`);

const stmtDeleteExec = db.prepare(`DELETE FROM executions`);

const stmtCountExec = db.prepare(`SELECT COUNT(*) as total FROM executions`);

// ─── Helpers de nodos generados ──────────────────────────────────────────────
const stmtUpsertNode = db.prepare(`
  INSERT INTO generated_nodes (node_type, description, code, created_at, updated_at)
  VALUES (@node_type, @description, @code, @now, @now)
  ON CONFLICT(node_type) DO UPDATE SET
    code        = excluded.code,
    description = excluded.description,
    version     = version + 1,
    updated_at  = excluded.updated_at
`);

const stmtGetNode = db.prepare(`SELECT * FROM generated_nodes WHERE node_type = ?`);

const stmtListNodes = db.prepare(`SELECT * FROM generated_nodes ORDER BY usage_count DESC`);

const stmtDeleteNode = db.prepare(`DELETE FROM generated_nodes WHERE node_type = ?`);

const stmtIncrUsage = db.prepare(`
  UPDATE generated_nodes SET usage_count = usage_count + 1 WHERE node_type = ?
`);

const stmtIncrSuccess = db.prepare(`
  UPDATE generated_nodes SET success_count = success_count + 1 WHERE node_type = ?
`);

const stmtSetLastError = db.prepare(`
  UPDATE generated_nodes SET last_error = ? WHERE node_type = ?
`);

const stmtResetCounters = db.prepare(`
  UPDATE generated_nodes SET usage_count = 0, success_count = 0, last_error = NULL WHERE node_type = ?
`);

const stmtUpdateNode = db.prepare(`
  UPDATE generated_nodes SET code = @code, version = @version, updated_at = @updated_at,
    usage_count = 0, success_count = 0 WHERE node_type = @node_type
`);

const stmtProblematicNodes = db.prepare(`
  SELECT * FROM generated_nodes
  WHERE usage_count >= 5 AND (CAST(success_count AS REAL) / usage_count) < 0.7
`);

// ─── Stats globales ──────────────────────────────────────────────────────────
const stmtStats = db.prepare(`
  SELECT
    COUNT(*) as total_executions,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
    AVG(duration_ms) as avg_duration_ms
  FROM executions
`);

const stmtNodeCount = db.prepare(`SELECT COUNT(*) as total FROM generated_nodes`);

module.exports = {
  // Ejecuciones
  saveExecution(data) {
    const result = stmtInsertExec.run({
      workflow_name: data.workflow_name,
      started_at: data.started_at,
      finished_at: data.finished_at || null,
      duration_ms: data.duration_ms || null,
      status: data.status,
      input_data: JSON.stringify(data.input_data ?? null),
      output_data: JSON.stringify(data.output_data ?? null),
      logs: JSON.stringify(data.logs ?? []),
      error_message: data.error_message || null,
    });
    return result.lastInsertRowid;
  },

  listExecutions(limit = 20, offset = 0) {
    return stmtListExec.all({ limit, offset });
  },

  getExecution(id) {
    const row = stmtGetExec.get(id);
    if (!row) return null;
    return {
      ...row,
      input_data: JSON.parse(row.input_data || 'null'),
      output_data: JSON.parse(row.output_data || 'null'),
      logs: JSON.parse(row.logs || '[]'),
    };
  },

  deleteAllExecutions() {
    return stmtDeleteExec.run().changes;
  },

  countExecutions() {
    return stmtCountExec.get().total;
  },

  // Nodos generados
  upsertNode(node_type, description, code) {
    const now = new Date().toISOString();
    stmtUpsertNode.run({ node_type, description, code, now });
  },

  getNode(node_type) {
    return stmtGetNode.get(node_type);
  },

  listNodes() {
    return stmtListNodes.all();
  },

  deleteNode(node_type) {
    return stmtDeleteNode.run(node_type).changes;
  },

  incrementUsage(node_type) {
    stmtIncrUsage.run(node_type);
  },

  incrementSuccess(node_type) {
    stmtIncrSuccess.run(node_type);
  },

  setLastError(node_type, error) {
    stmtSetLastError.run(error, node_type);
  },

  resetCounters(node_type) {
    stmtResetCounters.run(node_type);
  },

  updateNodeCode(node_type, code, version) {
    stmtUpdateNode.run({ node_type, code, version, updated_at: new Date().toISOString() });
  },

  getProblematicNodes() {
    return stmtProblematicNodes.all();
  },

  // Stats
  getStats() {
    const exec = stmtStats.get();
    const nodes = stmtNodeCount.get();
    return {
      total_executions: exec.total_executions,
      success_count: exec.success_count || 0,
      error_count: exec.error_count || 0,
      avg_duration_ms: Math.round(exec.avg_duration_ms || 0),
      success_rate: exec.total_executions > 0
        ? Math.round((exec.success_count / exec.total_executions) * 100)
        : 0,
      generated_nodes_total: nodes.total,
    };
  },

  // ─── Catálogo interno (Fase 5) ───────────────────────────────────────────
  getCatalogNode(node_type) {
    return db.prepare('SELECT * FROM node_catalog WHERE node_type = ?').get(node_type);
  },

  listCatalog(category = null) {
    if (category) {
      return db.prepare(
        'SELECT node_type, description, category, source, version, added_at FROM node_catalog WHERE category = ? ORDER BY node_type'
      ).all(category);
    }
    return db.prepare(
      'SELECT node_type, description, category, source, version, added_at FROM node_catalog ORDER BY category, node_type'
    ).all();
  },

  insertCatalogNode(node_type, description, code, category, source = 'velvet-builtin') {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO node_catalog (node_type, description, code, category, source, version, added_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(node_type, description, code, category, source, now);
  },

  deleteCatalogNode(node_type) {
    return db.prepare('DELETE FROM node_catalog WHERE node_type = ?').run(node_type).changes;
  },

  catalogNodeExists(node_type) {
    return !!db.prepare('SELECT 1 FROM node_catalog WHERE node_type = ?').get(node_type);
  },

  generatedNodeExists(node_type) {
    return !!db.prepare('SELECT id FROM generated_nodes WHERE node_type = ?').get(node_type);
  },

  promoteFromCatalog(node_type, description, code) {
    db.prepare(`
      INSERT INTO generated_nodes
        (node_type, description, code, version, created_at, updated_at, usage_count, success_count)
      VALUES (?, ?, ?, 1, datetime('now'), datetime('now'), 0, 0)
    `).run(node_type, description, code);
  },
};
