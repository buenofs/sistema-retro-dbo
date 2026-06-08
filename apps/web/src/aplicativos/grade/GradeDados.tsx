import { useState } from 'react';
import type { EstadoJanela, PropsApp } from '../../areaTrabalho/tipos';
import { useObjetos } from '../explorador/ganchos';
import { TabelaGrade } from './TabelaGrade';
import './grade.css';

interface RefTabela {
  esquema: string;
  tabela: string;
}

function refInicial(janela: EstadoJanela): RefTabela | null {
  const d = janela.dados as { esquema?: unknown; tabela?: unknown } | null | undefined;
  if (d && typeof d.esquema === 'string' && typeof d.tabela === 'string') {
    return { esquema: d.esquema, tabela: d.tabela };
  }
  return null;
}

export function GradeDados({ janela }: PropsApp) {
  const [ref, setRef] = useState<RefTabela | null>(() => refInicial(janela));

  if (!ref) return <SeletorTabela aoEscolher={setRef} />;

  return (
    <div className="grade-container">
      <div className="grade-cabecalho-tabela">
        <strong>
          {ref.esquema}.{ref.tabela}
        </strong>
        <button onClick={() => setRef(null)}>Trocar tabela</button>
      </div>
      <TabelaGrade esquema={ref.esquema} tabela={ref.tabela} />
    </div>
  );
}

function SeletorTabela({ aoEscolher }: { aoEscolher: (r: RefTabela) => void }) {
  const consulta = useObjetos();
  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando tabelas…</p>;
  if (consulta.isError) return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;
  const tabelas = (consulta.data ?? []).filter((o) => o.tipo === 'tabela');
  return (
    <div style={{ padding: 8 }}>
      <p>Escolha uma tabela:</p>
      <ul className="tree-view">
        {tabelas.map((o) => (
          <li key={`${o.esquema}.${o.nome}`}>
            <button onClick={() => aoEscolher({ esquema: o.esquema, tabela: o.nome })}>
              ▦ {o.esquema}.{o.nome}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
