const express = require("express");
const cors = require("cors");
const { transacao } = require("./db");

class ErroDeValidacao extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

function texto(valor, campo, { obrigatorio = true } = {}) {
  const v = typeof valor === "string" ? valor.trim() : "";
  if (obrigatorio && !v) throw new ErroDeValidacao(`O campo "${campo}" é obrigatório.`);
  return v;
}

function inteiro(valor, campo, { min = 0 } = {}) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min) {
    throw new ErroDeValidacao(`O campo "${campo}" deve ser um número inteiro maior ou igual a ${min}.`);
  }
  return n;
}

function decimal(valor, campo, { min = 0 } = {}) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < min) {
    throw new ErroDeValidacao(`O campo "${campo}" deve ser um número maior ou igual a ${min}.`);
  }
  return n;
}

function criarApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const comAlerta = (p) => ({ ...p, estoque_baixo: p.estoque_atual <= p.estoque_minimo });

  // ---------- Saúde ----------
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  // ---------- Resumo (painel) ----------
  app.get("/api/resumo", (_req, res) => {
    const r = db
      .prepare(
        `SELECT COUNT(*) AS total_produtos,
                COALESCE(SUM(estoque_atual), 0) AS total_unidades,
                COALESCE(SUM(estoque_atual * preco), 0) AS valor_em_estoque,
                COALESCE(SUM(CASE WHEN estoque_atual <= estoque_minimo THEN 1 ELSE 0 END), 0) AS produtos_em_alerta
           FROM produtos`
      )
      .get();
    res.json(r);
  });

  // ---------- Produtos ----------
  app.get("/api/produtos", (req, res) => {
    const busca = (req.query.busca || "").toString().trim();
    const somenteBaixo = req.query.baixo === "1" || req.query.baixo === "true";
    let sql = "SELECT * FROM produtos WHERE 1=1";
    const params = [];
    if (busca) {
      sql += " AND (nome LIKE ? OR sku LIKE ? OR categoria LIKE ?)";
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
    }
    if (somenteBaixo) sql += " AND estoque_atual <= estoque_minimo";
    sql += " ORDER BY nome COLLATE NOCASE";
    res.json(db.prepare(sql).all(...params).map(comAlerta));
  });

  app.get("/api/produtos/:id", (req, res) => {
    const p = db.prepare("SELECT * FROM produtos WHERE id = ?").get(req.params.id);
    if (!p) throw new ErroDeValidacao("Produto não encontrado.", 404);
    res.json(comAlerta(p));
  });

  app.post("/api/produtos", (req, res) => {
    const b = req.body || {};
    const dados = {
      nome: texto(b.nome, "nome"),
      sku: texto(b.sku, "sku"),
      categoria: texto(b.categoria, "categoria", { obrigatorio: false }) || "Geral",
      preco: decimal(b.preco ?? 0, "preco"),
      estoque_atual: inteiro(b.estoque_atual ?? 0, "estoque_atual"),
      estoque_minimo: inteiro(b.estoque_minimo ?? 0, "estoque_minimo"),
    };
    const existente = db.prepare("SELECT id FROM produtos WHERE sku = ?").get(dados.sku);
    if (existente) throw new ErroDeValidacao(`Já existe um produto com o SKU "${dados.sku}".`, 409);

    const id = transacao(db, () => {
      const info = db
        .prepare(
          `INSERT INTO produtos (nome, sku, categoria, preco, estoque_atual, estoque_minimo)
           VALUES (@nome, @sku, @categoria, @preco, @estoque_atual, @estoque_minimo)`
        )
        .run(dados);
      if (dados.estoque_atual > 0) {
        db.prepare(
          "INSERT INTO movimentacoes (produto_id, tipo, quantidade, observacao) VALUES (?, 'ENTRADA', ?, 'Estoque inicial')"
        ).run(info.lastInsertRowid, dados.estoque_atual);
      }
      return info.lastInsertRowid;
    });
    res.status(201).json(comAlerta(db.prepare("SELECT * FROM produtos WHERE id = ?").get(id)));
  });

  app.put("/api/produtos/:id", (req, res) => {
    const atual = db.prepare("SELECT * FROM produtos WHERE id = ?").get(req.params.id);
    if (!atual) throw new ErroDeValidacao("Produto não encontrado.", 404);
    const b = req.body || {};
    const dados = {
      id: atual.id,
      nome: texto(b.nome ?? atual.nome, "nome"),
      sku: texto(b.sku ?? atual.sku, "sku"),
      categoria: texto(b.categoria ?? atual.categoria, "categoria", { obrigatorio: false }) || "Geral",
      preco: decimal(b.preco ?? atual.preco, "preco"),
      estoque_minimo: inteiro(b.estoque_minimo ?? atual.estoque_minimo, "estoque_minimo"),
    };
    const conflito = db.prepare("SELECT id FROM produtos WHERE sku = ? AND id <> ?").get(dados.sku, atual.id);
    if (conflito) throw new ErroDeValidacao(`Já existe um produto com o SKU "${dados.sku}".`, 409);

    db.prepare(
      `UPDATE produtos SET nome=@nome, sku=@sku, categoria=@categoria, preco=@preco, estoque_minimo=@estoque_minimo
        WHERE id=@id`
    ).run(dados);
    res.json(comAlerta(db.prepare("SELECT * FROM produtos WHERE id = ?").get(atual.id)));
  });

  app.delete("/api/produtos/:id", (req, res) => {
    const info = db.prepare("DELETE FROM produtos WHERE id = ?").run(req.params.id);
    if (info.changes === 0) throw new ErroDeValidacao("Produto não encontrado.", 404);
    res.status(204).end();
  });

  // ---------- Movimentações (jornada principal da PoC) ----------
  app.post("/api/produtos/:id/movimentacoes", (req, res) => {
    const produto = db.prepare("SELECT * FROM produtos WHERE id = ?").get(req.params.id);
    if (!produto) throw new ErroDeValidacao("Produto não encontrado.", 404);

    const b = req.body || {};
    const tipo = texto(b.tipo, "tipo").toUpperCase();
    if (!["ENTRADA", "SAIDA"].includes(tipo)) {
      throw new ErroDeValidacao('O campo "tipo" deve ser ENTRADA ou SAIDA.');
    }
    const quantidade = inteiro(b.quantidade, "quantidade", { min: 1 });
    const observacao = texto(b.observacao, "observacao", { obrigatorio: false });

    if (tipo === "SAIDA" && quantidade > produto.estoque_atual) {
      throw new ErroDeValidacao(
        `Estoque insuficiente: há ${produto.estoque_atual} unidade(s) de "${produto.nome}".`,
        422
      );
    }

    transacao(db, () => {
      const delta = tipo === "ENTRADA" ? quantidade : -quantidade;
      db.prepare("UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?").run(delta, produto.id);
      db.prepare(
        "INSERT INTO movimentacoes (produto_id, tipo, quantidade, observacao) VALUES (?, ?, ?, ?)"
      ).run(produto.id, tipo, quantidade, observacao || null);
    });

    res.status(201).json(comAlerta(db.prepare("SELECT * FROM produtos WHERE id = ?").get(produto.id)));
  });

  app.get("/api/movimentacoes", (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 20, 100);
    const produtoId = req.query.produto_id ? Number(req.query.produto_id) : null;
    let sql = `SELECT m.*, p.nome AS produto_nome, p.sku AS produto_sku
                 FROM movimentacoes m JOIN produtos p ON p.id = m.produto_id`;
    const params = [];
    if (produtoId) {
      sql += " WHERE m.produto_id = ?";
      params.push(produtoId);
    }
    sql += " ORDER BY m.id DESC LIMIT ?";
    params.push(limite);
    res.json(db.prepare(sql).all(...params));
  });

  // ---------- Erros ----------
  app.use("/api", (_req, res) => res.status(404).json({ erro: "Rota não encontrada." }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ErroDeValidacao) return res.status(err.status).json({ erro: err.message });
    if (err.type === "entity.parse.failed") return res.status(400).json({ erro: "JSON inválido." });
    console.error(err);
    res.status(500).json({ erro: "Erro interno do servidor." });
  });

  return app;
}

module.exports = { criarApp };
