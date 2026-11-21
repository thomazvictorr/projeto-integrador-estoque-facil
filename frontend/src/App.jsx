import { useCallback, useEffect, useState } from "react";
import { api, moeda, dataHora } from "./api.js";
import Modal from "./components/Modal.jsx";
import ProdutoForm from "./components/ProdutoForm.jsx";
import MovimentacaoForm from "./components/MovimentacaoForm.jsx";

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [busca, setBusca] = useState("");
  const [somenteBaixo, setSomenteBaixo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modal, setModal] = useState(null); // {tipo: 'produto'|'mov', produto?, mov?}
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    try {
      const [lista, r, h] = await Promise.all([
        api.listarProdutos({ busca, baixo: somenteBaixo }),
        api.resumo(),
        api.historico(8),
      ]);
      setProdutos(lista);
      setResumo(r);
      setHistorico(h);
      setErro("");
    } catch {
      setErro("Não foi possível conectar à API. Verifique se o backend está rodando na porta 3001.");
    } finally {
      setCarregando(false);
    }
  }, [busca, somenteBaixo]);

  useEffect(() => {
    const t = setTimeout(carregar, 200); // pequeno atraso para não buscar a cada tecla
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const fechar = () => setModal(null);

  async function salvarProduto(dados) {
    if (modal.produto) {
      await api.editarProduto(modal.produto.id, dados);
      setAviso("Produto atualizado.");
    } else {
      await api.criarProduto(dados);
      setAviso("Produto cadastrado.");
    }
    fechar();
    carregar();
  }

  async function registrarMov(dados) {
    const atualizado = await api.movimentar(modal.produto.id, dados);
    setAviso(
      atualizado.estoque_baixo
        ? `Atenção: "${atualizado.nome}" está com estoque baixo (${atualizado.estoque_atual}).`
        : `${dados.tipo === "ENTRADA" ? "Entrada" : "Saída"} registrada.`
    );
    fechar();
    carregar();
  }

  async function excluir(p) {
    if (!window.confirm(`Excluir "${p.nome}" e todo o seu histórico?`)) return;
    await api.excluirProduto(p.id);
    setAviso("Produto excluído.");
    carregar();
  }

  const emAlerta = resumo?.produtos_em_alerta ?? 0;

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1>Estoque Fácil</h1>
          <p>Controle de estoque para pequenos comércios</p>
        </div>
        <button className="btn" onClick={() => setModal({ tipo: "produto" })}>
          + Novo produto
        </button>
      </header>

      <main>
        {erro && <div className="faixa faixa-erro">{erro}</div>}

        {resumo && (
          <section className="cards" aria-label="Resumo do estoque">
            <div className="card">
              <span>Produtos</span>
              <strong>{resumo.total_produtos}</strong>
            </div>
            <div className="card">
              <span>Unidades em estoque</span>
              <strong>{resumo.total_unidades}</strong>
            </div>
            <div className="card">
              <span>Valor em estoque</span>
              <strong>{moeda(resumo.valor_em_estoque)}</strong>
            </div>
            <div className={`card ${emAlerta ? "card-alerta" : ""}`}>
              <span>Em alerta</span>
              <strong>{emAlerta}</strong>
            </div>
          </section>
        )}

        {emAlerta > 0 && (
          <div className="faixa faixa-alerta">
            <span>
              {emAlerta === 1 ? "1 produto está" : `${emAlerta} produtos estão`} com estoque igual ou abaixo do mínimo.
            </span>
            {!somenteBaixo && (
              <button className="link" onClick={() => setSomenteBaixo(true)}>
                Ver apenas os alertas
              </button>
            )}
          </div>
        )}

        <section className="barra">
          <input
            type="search"
            placeholder="Buscar por nome, SKU ou categoria"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar produtos"
          />
          <label className="check">
            <input type="checkbox" checked={somenteBaixo} onChange={(e) => setSomenteBaixo(e.target.checked)} />
            Só estoque baixo
          </label>
        </section>

        <section aria-label="Lista de produtos">
          {carregando ? (
            <p className="vazio">Carregando...</p>
          ) : produtos.length === 0 ? (
            <p className="vazio">
              {busca || somenteBaixo ? "Nenhum produto encontrado com esse filtro." : "Nenhum produto cadastrado ainda."}
            </p>
          ) : (
            <ul className="lista">
              {produtos.map((p) => (
                <li key={p.id} className={`item ${p.estoque_baixo ? "item-alerta" : ""}`}>
                  <div className="item-info">
                    <strong>{p.nome}</strong>
                    <span className="sku">
                      {p.sku} | {p.categoria} | {moeda(p.preco)}
                    </span>
                  </div>
                  <div className="item-estoque">
                    <span className={`selo ${p.estoque_baixo ? "selo-alerta" : "selo-ok"}`}>
                      {p.estoque_baixo ? "Estoque baixo" : "Em dia"}
                    </span>
                    <strong className="qtd">{p.estoque_atual}</strong>
                    <span className="min">mín. {p.estoque_minimo}</span>
                  </div>
                  <div className="item-acoes">
                    <button className="btn btn-ok btn-peq" onClick={() => setModal({ tipo: "mov", produto: p, mov: "ENTRADA" })}>
                      Entrada
                    </button>
                    <button className="btn btn-saida btn-peq" onClick={() => setModal({ tipo: "mov", produto: p, mov: "SAIDA" })}>
                      Saída
                    </button>
                    <button className="btn btn-sec btn-peq" onClick={() => setModal({ tipo: "produto", produto: p })}>
                      Editar
                    </button>
                    <button className="btn btn-sec btn-peq" onClick={() => excluir(p)} aria-label={`Excluir ${p.nome}`}>
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="historico" aria-label="Últimas movimentações">
          <h2>Últimas movimentações</h2>
          {historico.length === 0 ? (
            <p className="vazio">Sem movimentações ainda.</p>
          ) : (
            <ul>
              {historico.map((m) => (
                <li key={m.id}>
                  <span className={`tag ${m.tipo === "ENTRADA" ? "tag-ok" : "tag-saida"}`}>
                    {m.tipo === "ENTRADA" ? "+" : "-"}
                    {m.quantidade}
                  </span>
                  <span className="hist-nome">{m.produto_nome}</span>
                  <span className="hist-obs">{m.observacao || ""}</span>
                  <time>{dataHora(m.criado_em)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {modal?.tipo === "produto" && (
        <Modal titulo={modal.produto ? "Editar produto" : "Novo produto"} onFechar={fechar}>
          <ProdutoForm produto={modal.produto} onSalvar={salvarProduto} onCancelar={fechar} />
        </Modal>
      )}
      {modal?.tipo === "mov" && (
        <Modal titulo={modal.mov === "ENTRADA" ? "Registrar entrada" : "Registrar saída"} onFechar={fechar}>
          <MovimentacaoForm produto={modal.produto} tipo={modal.mov} onSalvar={registrarMov} onCancelar={fechar} />
        </Modal>
      )}

      {aviso && (
        <div className="toast" role="status">
          {aviso}
        </div>
      )}
    </div>
  );
}
