import { useState } from 'react';
import type { TipoComando } from '@dbos/shared';
import { useLojaLogSQL } from './lojaLog';
import { resolverSQL } from './resolver';
import './monitor.css';

const TIPOS: TipoComando[] = ['INSERT', 'UPDATE', 'DELETE', 'SELECT'];

export function MonitorSQL() {
  const comandos = useLojaLogSQL((s) => s.comandos);
  const pausado = useLojaLogSQL((s) => s.pausado);
  const limpar = useLojaLogSQL((s) => s.limpar);
  const alternarPausa = useLojaLogSQL((s) => s.alternarPausa);
  const [ocultos, setOcultos] = useState<Set<TipoComando>>(new Set());

  function alternarTipo(t: TipoComando) {
    setOcultos((s) => {
      const n = new Set(s);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  }

  const visiveis = comandos.filter((c) => !ocultos.has(c.tipo));

  return (
    <div className="mon">
      <div className="mon-barra">
        {TIPOS.map((t) => (
          <label key={t} aria-label={`Filtrar ${t}`}>
            <input type="checkbox" checked={!ocultos.has(t)} onChange={() => alternarTipo(t)} /> {t}
          </label>
        ))}
        <button onClick={alternarPausa}>{pausado ? 'Retomar' : 'Pausar'}</button>
        <button onClick={limpar}>Limpar</button>
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>{visiveis.length} comando(s)</span>
      </div>
      <div className="mon-lista">
        {visiveis.map((c, i) => (
          <div key={i} className="mon-linha">
            <div className="mon-cab">
              <span className={`mon-badge mon-${c.tipo}`}>{c.tipo}</span>
              <strong>{c.acao}</strong>
              <span style={{ opacity: 0.6 }}>{c.em.slice(11, 19)}</span>
              {c.erro ? <span className="mon-erro">erro: {c.erro}</span> : <span style={{ opacity: 0.6 }}>{c.linhasAfetadas} linha(s)</span>}
              <button
                style={{ marginLeft: 'auto' }}
                onClick={() => void navigator.clipboard?.writeText(resolverSQL(c.texto, c.parametros))}
              >
                Copiar SQL
              </button>
            </div>
            <div className="mon-sql">{resolverSQL(c.texto, c.parametros)}</div>
          </div>
        ))}
        {visiveis.length === 0 && <div style={{ padding: 8, opacity: 0.7 }}>(sem comandos — faça uma ação no SO)</div>}
      </div>
    </div>
  );
}
