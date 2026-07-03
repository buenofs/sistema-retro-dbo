import { useState } from 'react';
import { useObjetos } from './ganchos';
import { useValorDebounced } from './useValorDebounced';
import { NoTabela } from './NoTabela';
import { Icone } from '../../tema/icones/Icone';
import { Estado } from '../comuns/Estado';
import './explorador.css';

export function ExploradorObjetos() {
  const consulta = useObjetos();
  const [filtro, setFiltro] = useState('');
  const termo = useValorDebounced(filtro, 200).trim().toLowerCase();

  if (consulta.isPending) return <Estado>Carregando objetos…</Estado>;
  if (consulta.isError) {
    return <Estado variante="erro">{consulta.error.message}</Estado>;
  }

  const objetos = consulta.data ?? [];
  const filtrados = termo
    ? objetos.filter((objeto) => objeto.nome.toLowerCase().includes(termo))
    : objetos;
  const tabelas = filtrados.filter((objeto) => objeto.tipo === 'tabela');
  const views = filtrados.filter((objeto) => objeto.tipo === 'view');

  return (
    <div className="painel">
      <input
        aria-label="Filtrar objetos"
        placeholder="Filtrar…"
        value={filtro}
        onChange={(evento) => setFiltro(evento.target.value)}
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
              {tabelas.map((objeto) => (
                <NoTabela key={`${objeto.esquema}.${objeto.nome}`} objeto={objeto} />
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
              {views.map((objeto) => (
                <NoTabela key={`${objeto.esquema}.${objeto.nome}`} objeto={objeto} />
              ))}
            </ul>
          </details>
        </li>
      </ul>
    </div>
  );
}
