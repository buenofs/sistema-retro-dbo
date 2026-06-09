import { useState } from 'react';
import type { GrafoRelacionamentos, RefRelacionamento, TipoNo } from '@dbos/shared';
import type { EstadoJanela, PropsApp } from '../../areaTrabalho/tipos';
import { useFuncionarios } from '../busca/ganchos';
import { useGrafo } from './ganchos';
import { Icone } from '../../tema/icones/Icone';
import type { NomeIcone } from '../../tema/icones/motor';
import './relacionamentos.css';

const NAVEGAVEIS: TipoNo[] = ['funcionario', 'departamento', 'projeto'];
const ICONE: Record<TipoNo, NomeIcone> = {
  funcionario: 'user',
  departamento: 'folder',
  projeto: 'report',
  folha: 'props',
};

function refInicial(janela: EstadoJanela): RefRelacionamento | null {
  const d = janela.dados as { tipo?: unknown; id?: unknown } | null | undefined;
  if (
    d &&
    (d.tipo === 'funcionario' || d.tipo === 'departamento' || d.tipo === 'projeto') &&
    typeof d.id === 'number'
  ) {
    return { tipo: d.tipo, id: d.id };
  }
  return null;
}

export function Relacionamentos({ janela }: PropsApp) {
  const [foco, setFoco] = useState<RefRelacionamento | null>(() => refInicial(janela));
  const [historico, setHistorico] = useState<RefRelacionamento[]>([]);

  if (!foco) return <Seletor aoEscolher={(r) => setFoco(r)} />;

  function navegar(r: RefRelacionamento) {
    setHistorico((h) => [...h, foco!]);
    setFoco(r);
  }
  function voltar() {
    if (historico.length === 0) return;
    const anterior = historico[historico.length - 1]!;
    setHistorico(historico.slice(0, -1));
    setFoco(anterior);
  }

  return <Grafo foco={foco} podeVoltar={historico.length > 0} aoNavegar={navegar} aoVoltar={voltar} />;
}

function Seletor({ aoEscolher }: { aoEscolher: (r: RefRelacionamento) => void }) {
  const consulta = useFuncionarios();
  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando…</p>;
  if (consulta.isError) return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;
  return (
    <div style={{ padding: 8 }}>
      <p>Escolha um funcionário:</p>
      <ul className="tree-view">
        {(consulta.data ?? []).map((f) => (
          <li key={f.id}>
            <button onClick={() => aoEscolher({ tipo: 'funcionario', id: f.id })}>
              <Icone nome="user" tamanho={16} alt="" style={{ marginRight: 4 }} />
              {f.nome}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const LARGURA = 640;
const ALTURA = 400;
const RAIO = 150;

function Grafo({
  foco,
  podeVoltar,
  aoNavegar,
  aoVoltar,
}: {
  foco: RefRelacionamento;
  podeVoltar: boolean;
  aoNavegar: (r: RefRelacionamento) => void;
  aoVoltar: () => void;
}) {
  const consulta = useGrafo(foco);
  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando grafo…</p>;
  if (consulta.isError) return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;

  const g: GrafoRelacionamentos = consulta.data;
  const cx = LARGURA / 2;
  const cy = ALTURA / 2;
  const filhos = g.nos.filter((n) => n.id !== g.centro);
  const pos = new Map<string, { x: number; y: number }>();
  pos.set(g.centro, { x: cx, y: cy });
  filhos.forEach((n, i) => {
    const ang = (2 * Math.PI * i) / Math.max(filhos.length, 1) - Math.PI / 2;
    pos.set(n.id, { x: cx + RAIO * Math.cos(ang), y: cy + RAIO * Math.sin(ang) });
  });

  return (
    <div className="rel">
      <div className="rel-barra">
        <button onClick={aoVoltar} disabled={!podeVoltar}>
          ◀ Voltar
        </button>
      </div>
      <div className="rel-canvas" style={{ width: LARGURA, height: ALTURA }}>
        <svg className="rel-linhas" width={LARGURA} height={ALTURA}>
          {g.arestas.map((a, i) => {
            const de = pos.get(a.de);
            const para = pos.get(a.para);
            if (!de || !para) return null;
            return <line key={i} x1={de.x} y1={de.y} x2={para.x} y2={para.y} stroke="var(--aresta)" />;
          })}
        </svg>
        {g.nos.map((n) => {
          const p = pos.get(n.id)!;
          const navegavel = NAVEGAVEIS.includes(n.tipo) && n.id !== g.centro;
          return (
            <button
              key={n.id}
              className={`rel-no tipo-${n.tipo} ${n.id === g.centro ? 'rel-centro' : ''}`}
              style={{ left: p.x, top: p.y }}
              disabled={!navegavel}
              onClick={() => {
                if (!navegavel) return;
                const idStr = n.id.split(':')[1] ?? '';
                aoNavegar({ tipo: n.tipo as RefRelacionamento['tipo'], id: Number(idStr) });
              }}
            >
              <Icone nome={ICONE[n.tipo]} tamanho={20} alt="" style={{ marginRight: 4 }} /> {n.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
