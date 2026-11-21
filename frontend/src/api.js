// Camada de acesso à API REST. Todas as chamadas passam por aqui.
async function chamar(metodo, caminho, corpo) {
  const resposta = await fetch(`/api${caminho}`, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || "Erro ao comunicar com o servidor.");
  return dados;
}

export const api = {
  resumo: () => chamar("GET", "/resumo"),
  listarProdutos: ({ busca = "", baixo = false } = {}) => {
    const q = new URLSearchParams();
    if (busca) q.set("busca", busca);
    if (baixo) q.set("baixo", "1");
    const qs = q.toString();
    return chamar("GET", `/produtos${qs ? `?${qs}` : ""}`);
  },
  criarProduto: (dados) => chamar("POST", "/produtos", dados),
  editarProduto: (id, dados) => chamar("PUT", `/produtos/${id}`, dados),
  excluirProduto: (id) => chamar("DELETE", `/produtos/${id}`),
  movimentar: (id, dados) => chamar("POST", `/produtos/${id}/movimentacoes`, dados),
  historico: (limite = 10) => chamar("GET", `/movimentacoes?limite=${limite}`),
};

export const moeda = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataHora = (iso) =>
  new Date(iso.replace(" ", "T") + "Z").toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
