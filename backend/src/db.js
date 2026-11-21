const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite"); // SQLite embutido no Node 22 (sem instalar nada)

/**
 * Abre (e cria, se necessário) o banco SQLite.
 * Use ":memory:" nos testes. Em desenvolvimento o arquivo fica em backend/data/estoque.db.
 */
function abrirBanco(arquivo = process.env.DB_FILE || path.join(__dirname, "..", "data", "estoque.db")) {
  if (arquivo !== ":memory:") {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  }
  const db = new DatabaseSync(arquivo);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS produtos (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      nome           TEXT    NOT NULL,
      sku            TEXT    NOT NULL UNIQUE,
      categoria      TEXT    NOT NULL DEFAULT 'Geral',
      preco          REAL    NOT NULL DEFAULT 0 CHECK (preco >= 0),
      estoque_atual  INTEGER NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
      estoque_minimo INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
      criado_em      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS movimentacoes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      tipo       TEXT    NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
      quantidade INTEGER NOT NULL CHECK (quantidade > 0),
      observacao TEXT,
      criado_em  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mov_produto ON movimentacoes(produto_id);
  `);

  return db;
}

/** Executa fn dentro de uma transação: ou grava tudo, ou desfaz tudo. */
function transacao(db, fn) {
  db.exec("BEGIN");
  try {
    const resultado = fn();
    db.exec("COMMIT");
    return resultado;
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

module.exports = { abrirBanco, transacao };
