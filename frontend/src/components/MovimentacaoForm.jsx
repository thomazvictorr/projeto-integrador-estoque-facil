import { useState } from "react";

export default function MovimentacaoForm({ produto, tipo, onSalvar, onCancelar }) {
  const entrada = tipo === "ENTRADA";
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const novoSaldo = entrada ? produto.estoque_atual + Number(quantidade || 0) : produto.estoque_atual - Number(quantidade || 0);

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await onSalvar({ tipo, quantidade: Number(quantidade), observacao });
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="form">
      <p>
        <strong>{produto.nome}</strong> <span className="sku">({produto.sku})</span>
        <br />
        Estoque atual: <strong>{produto.estoque_atual}</strong> | Mínimo: {produto.estoque_minimo}
      </p>
      <label>
        Quantidade
        <input
          type="number"
          min="1"
          step="1"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          required
          autoFocus
        />
      </label>
      <label>
        Observação (opcional)
        <input
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder={entrada ? "Ex.: Compra do fornecedor" : "Ex.: Venda no balcão"}
        />
      </label>
      <p className={`previa ${novoSaldo <= produto.estoque_minimo ? "previa-alerta" : ""}`}>
        Saldo após a {entrada ? "entrada" : "saída"}: <strong>{Number.isNaN(novoSaldo) ? "-" : novoSaldo}</strong>
        {novoSaldo <= produto.estoque_minimo && novoSaldo >= 0 && " (abaixo ou igual ao mínimo)"}
      </p>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button type="button" className="btn btn-sec" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className={`btn ${entrada ? "btn-ok" : "btn-saida"}`} disabled={salvando}>
          Registrar {entrada ? "entrada" : "saída"}
        </button>
      </div>
    </form>
  );
}
