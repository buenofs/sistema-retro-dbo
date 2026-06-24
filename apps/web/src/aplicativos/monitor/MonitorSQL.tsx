import { useState } from 'react';
import type { TipoComando } from '@dbos/shared';
import { useLojaLogSQL } from './lojaLog';
import { resolverSQL } from './resolver';
import { Estado } from '../comuns/Estado';
import './monitor.css';

const TIPOS: TipoComando[] = ['INSERT', 'UPDATE', 'DELETE', 'SELECT'];

export function MonitorSQL() {
  const comandos = useLojaLogSQL((loja) => loja.comandos);
  const pausado = useLojaLogSQL((loja) => loja.pausado);
  const limpar = useLojaLogSQL((loja) => loja.limpar);
  const alternarPausa = useLojaLogSQL((loja) => loja.alternarPausa);
  const [ocultos, setOcultos] = useState<Set<TipoComando>>(new Set());

  function alternarTipo(tipo: TipoComando) {
    setOcultos((anterior) => {
      const novos = new Set(anterior);
      novos.has(tipo) ? novos.delete(tipo) : novos.add(tipo);
      return novos;
    });
  }

  const visiveis = comandos.filter((comando) => !ocultos.has(comando.tipo));

  return (
    <div className="mon">
      <div className="mon-barra">
        {TIPOS.map((tipo) => (
          <label key={tipo} aria-label={`Filtrar ${tipo}`}>
            <input type="checkbox" checked={!ocultos.has(tipo)} onChange={() => alternarTipo(tipo)} /> {tipo}
          </label>
        ))}
        <button onClick={alternarPausa}>{pausado ? 'Retomar' : 'Pausar'}</button>
        <button onClick={limpar}>Limpar</button>
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>{visiveis.length} comando(s)</span>
      </div>
      <div className="mon-lista">
        {visiveis.map((comando, i) => (
          <div key={i} className="mon-linha">
            <div className="mon-cab">
              <span className={`mon-badge mon-${comando.tipo}`}>{comando.tipo}</span>
              <strong>{comando.acao}</strong>
              <span style={{ opacity: 0.6 }}>{comando.em.slice(11, 19)}</span>
              {comando.erro ? <span className="mon-erro">erro: {comando.erro}</span> : <span style={{ opacity: 0.6 }}>{comando.linhasAfetadas} linha(s)</span>}
              <button
                style={{ marginLeft: 'auto' }}
                onClick={() => void navigator.clipboard?.writeText(resolverSQL(comando.texto, comando.parametros))}
              >
                Copiar SQL
              </button>
            </div>
            <div className="mon-sql">{resolverSQL(comando.texto, comando.parametros)}</div>
          </div>
        ))}
        {visiveis.length === 0 && <Estado variante="vazio">(sem comandos — faça uma ação no SO)</Estado>}
      </div>
    </div>
  );
}
