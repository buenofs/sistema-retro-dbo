import { useState } from 'react';
import type { EstadoJanela, PropsApp } from '../../areaTrabalho/tipos';
import { useObjetos } from '../explorador/ganchos';
import { Icone } from '../../tema/icones/Icone';
import { TabelaGrade } from './TabelaGrade';
import { Estado } from '../comuns/Estado';
import './grade.css';

interface RefTabela {
  esquema: string;
  tabela: string;
}

function refInicial(janela: EstadoJanela): RefTabela | null {
  const dados = janela.dados as { esquema?: unknown; tabela?: unknown } | null | undefined;
  if (dados && typeof dados.esquema === 'string' && typeof dados.tabela === 'string') {
    return { esquema: dados.esquema, tabela: dados.tabela };
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

function SeletorTabela({ aoEscolher }: { aoEscolher: (ref: RefTabela) => void }) {
  const consulta = useObjetos();
  if (consulta.isPending) return <Estado>Carregando tabelas…</Estado>;
  if (consulta.isError) return <Estado variante="erro">{consulta.error.message}</Estado>;
  const objetos = consulta.data ?? [];
  return (
    <div className="painel">
      <p>Escolha uma tabela ou view:</p>
      <ul className="tree-view">
        {objetos.map((objeto) => (
          <li key={`${objeto.esquema}.${objeto.nome}`}>
            <button onClick={() => aoEscolher({ esquema: objeto.esquema, tabela: objeto.nome })}>
              <Icone nome={objeto.tipo === 'view' ? 'view' : 'grid'} tamanho={16} alt="" style={{ marginRight: 4 }} />
              {objeto.esquema}.{objeto.nome}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
