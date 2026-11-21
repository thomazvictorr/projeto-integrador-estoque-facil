const test = require("node:test");
const assert = require("node:assert/strict");
const { abrirBanco } = require("../src/db");
const { criarApp } = require("../src/app");

let servidor;
let base;

test.before(async () => {
  const app = criarApp(abrirBanco(":memory:"));
  await new Promise((ok) => {
    servidor = app.listen(0, ok);
  });
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

test.after(() => servidor.close());

const req = async (metodo, caminho, corpo) => {
  const r = await fetch(base + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  return { status: r.status, corpo: texto ? JSON.parse(texto) : null };
};

test("jornada completa: cadastrar, dar entrada, dar saída e disparar alerta", async () => {
  // cadastra com estoque 10 e mínimo 5 (sem alerta)
  let r = await req("POST", "/produtos", { nome: "Arroz 5kg", sku: "ARZ-005", preco: 27.9, estoque_atual: 10, estoque_minimo: 5 });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.estoque_baixo, false);
  const id = r.corpo.id;

  // entrada de 5 -> 15
  r = await req("POST", `/produtos/${id}/movimentacoes`, { tipo: "ENTRADA", quantidade: 5 });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.estoque_atual, 15);

  // saída de 11 -> 4 (abaixo do mínimo) => alerta
  r = await req("POST", `/produtos/${id}/movimentacoes`, { tipo: "SAIDA", quantidade: 11, observacao: "Venda" });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.estoque_atual, 4);
  assert.equal(r.corpo.estoque_baixo, true);

  // filtro de alertas e resumo
  r = await req("GET", "/produtos?baixo=1");
  assert.equal(r.corpo.length, 1);
  r = await req("GET", "/resumo");
  assert.equal(r.corpo.produtos_em_alerta, 1);
  assert.equal(r.corpo.total_unidades, 4);

  // histórico: estoque inicial + entrada + saída
  r = await req("GET", `/movimentacoes?produto_id=${id}`);
  assert.equal(r.corpo.length, 3);
});

test("não permite saída maior que o estoque", async () => {
  let r = await req("POST", "/produtos", { nome: "Caneta", sku: "CAN-1", estoque_atual: 2 });
  const id = r.corpo.id;
  r = await req("POST", `/produtos/${id}/movimentacoes`, { tipo: "SAIDA", quantidade: 3 });
  assert.equal(r.status, 422);
  r = await req("GET", `/produtos/${id}`);
  assert.equal(r.corpo.estoque_atual, 2);
});

test("valida campos obrigatórios, SKU duplicado e quantidade inválida", async () => {
  let r = await req("POST", "/produtos", { sku: "X" });
  assert.equal(r.status, 400);

  await req("POST", "/produtos", { nome: "Item", sku: "DUP-1" });
  r = await req("POST", "/produtos", { nome: "Outro", sku: "DUP-1" });
  assert.equal(r.status, 409);

  r = await req("POST", "/produtos", { nome: "Q", sku: "Q-1" });
  r = await req("POST", `/produtos/${r.corpo.id}/movimentacoes`, { tipo: "ENTRADA", quantidade: 0 });
  assert.equal(r.status, 400);
});

test("edita e exclui produto", async () => {
  let r = await req("POST", "/produtos", { nome: "Editar", sku: "ED-1", preco: 1 });
  const id = r.corpo.id;
  r = await req("PUT", `/produtos/${id}`, { nome: "Editado", preco: 3.5, estoque_minimo: 2 });
  assert.equal(r.corpo.nome, "Editado");
  assert.equal(r.corpo.estoque_minimo, 2);
  r = await req("DELETE", `/produtos/${id}`);
  assert.equal(r.status, 204);
  r = await req("GET", `/produtos/${id}`);
  assert.equal(r.status, 404);
});
