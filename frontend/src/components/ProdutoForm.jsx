import { useState } from "react";

export default function ProdutoForm({ produto, onSalvar, onCancelar }) {
  const editando = Boolean(produto);
  const [f, setF] = useState({
    nome: produto?.nome ?? "",
    sku: produto?.sku ?? "",
    categoria: produto?.categoria ?? "",
    preco: produto?.preco ?? "",
    estoque_atual: produto?.estoque_atual ?? 0,
    estoque_minimo: produto?.estoque_minimo ?? 0,
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await onSalvar({
        ...f,
        preco: Number(f.preco || 0),
        estoque_atual: Number(f.estoque_atual),
        estoque_minimo: Number(f.estoque_minimo),
      });
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="form">
      <label>
        Nome do produto
        <input value={f.nome} onChange={mudar("nome")} required autoFocus placeholder="Ex.: Arroz 5kg" />
      </label>
      <div className="linha">
        <label>
          SKU / Código
          <input value={f.sku} onChange={mudar("sku")} required placeholder="Ex.: ARZ-005" />
        </label>
        <label>
          Categoria
          <input value={f.categoria} onChange={mudar("categoria")} placeholder="Ex.: Mercearia" />
        </label>
      </div>
      <div className="linha">
        <label>
          Preço (R$)
          <input type="number" min="0" step="0.01" value={f.preco} onChange={mudar("preco")} />
        </label>
        <label>
          Estoque mínimo
          <input type="number" min="0" step="1" value={f.estoque_minimo} onChange={mudar("estoque_minimo")} />
        </label>
      </div>
      {!editando && (
        <label>
          Estoque inicial
          <input type="number" min="0" step="1" value={f.estoque_atual} onChange={mudar("estoque_atual")} />
        </label>
      )}
      {editando && (
        <p className="dica">O estoque atual só muda por entradas e saídas, para manter o histórico correto.</p>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button type="button" className="btn btn-sec" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn" disabled={salvando}>
          {editando ? "Salvar alterações" : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}
