import { useState } from 'react';
import { useObjetos } from './ganchos';
import { useValorDebounced } from './useValorDebounced';
import { NoTabela } from './NoTabela';
import { Icone } from '../../tema/icones/Icone';
import './explorador.css';

export function ExploradorObjetos() {
  const consulta = useObjetos();
  const [filtro, setFiltro] = useState('');
  const termo = useValorDebounced(filtro, 200).trim().toLowerCase();

  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando objetos…</p>;
  if (consulta.isError) {
    return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;
  }

  const objetos = consulta.data ?? [];
  const filtrados = termo ? objetos.filter((o) => o.nome.toLowerCase().includes(termo)) : objetos;
  const tabelas = filtrados.filter((o) => o.tipo === 'tabela');
  const views = filtrados.filter((o) => o.tipo === 'view');

  return (
    <div style={{ padding: 8 }}>
      <input
        aria-label="Filtrar objetos"
        placeholder="Filtrar…"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{ width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
      />
      <ul className="tree-view">
        <li>
          <details open>
            <summary>
              <Icone nome="folder" tamanho={16} alt="" style={{ marginRight: 4 }} />
              Tabelas ({tabelas.length})
            </summary>
            <ul>
              {tabelas.map((o) => (
                <NoTabela key={`${o.esquema}.${o.nome}`} objeto={o} />
              ))}
            </ul>
          </details>
        </li>
        <li>
          <details open>
            <summary>
              <Icone nome="folder" tamanho={16} alt="" style={{ marginRight: 4 }} />
              Views ({views.length})
            </summary>
            <ul>
              {views.map((o) => (
                <NoTabela key={`${o.esquema}.${o.nome}`} objeto={o} />
              ))}
            </ul>
          </details>
        </li>
      </ul>
    </div>
  );
}
