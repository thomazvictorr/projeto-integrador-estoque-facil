/**
 * Carga inicial de dados de exemplo (mercadinho de bairro).
 * Uso: npm run seed   (apaga os dados atuais e recria os exemplos)
 */
const { abrirBanco, transacao } = require("./db");

const db = abrirBanco();

const produtos = [
  ["Arroz 5kg", "ARZ-005", "Mercearia", 27.9, 40, 10],
  ["Feijão carioca 1kg", "FEJ-001", "Mercearia", 8.5, 8, 12],
  ["Óleo de soja 900ml", "OLE-900", "Mercearia", 7.2, 25, 10],
  ["Refrigerante 2L", "REF-002", "Bebidas", 9.9, 30, 12],
  ["Água mineral 500ml", "AGU-500", "Bebidas", 2.5, 60, 24],
  ["Caderno 96 folhas", "CAD-096", "Papelaria", 14.9, 5, 8],
  ["Caneta azul", "CAN-AZL", "Papelaria", 2.0, 100, 30],
  ["Salgado assado", "SAL-ASS", "Lanchonete", 6.5, 4, 10],
];

transacao(db, () => {
  db.exec("DELETE FROM movimentacoes; DELETE FROM produtos; DELETE FROM sqlite_sequence;");
  const ins = db.prepare(
    "INSERT INTO produtos (nome, sku, categoria, preco, estoque_atual, estoque_minimo) VALUES (?,?,?,?,?,?)"
  );
  const mov = db.prepare(
    "INSERT INTO movimentacoes (produto_id, tipo, quantidade, observacao) VALUES (?, 'ENTRADA', ?, 'Estoque inicial')"
  );
  for (const p of produtos) {
    const info = ins.run(...p);
    if (p[4] > 0) mov.run(info.lastInsertRowid, p[4]);
  }
});

console.log(`Seed concluído: ${produtos.length} produtos criados.`);
