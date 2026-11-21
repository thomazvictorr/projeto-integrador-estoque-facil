import { useEffect } from "react";

export default function Modal({ titulo, onFechar, children }) {
  useEffect(() => {
    const aoTeclar = (e) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-topo">
          <h2>{titulo}</h2>
          <button className="btn-icone" onClick={onFechar} aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
