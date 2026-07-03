import { useRef } from 'react';
import { ORDEM_APPS, registroApps } from './registroApps';
import { useLoja } from './loja';
import { useMenuContexto } from './useMenuContexto';
import { Icone } from '../tema/icones/Icone';
import { useIconesDesktop, useSelecaoIcones } from './lojaIconesDesktop';
import type { TipoApp } from './tipos';

const LIMIAR = 4;

export function IconesDesktop() {
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const abrirMenu = useMenuContexto((s) => s.abrir);
  const posicoes = useIconesDesktop((s) => s.posicoes);
  const mover = useIconesDesktop((s) => s.mover);
  const selecionados = useSelecaoIcones((s) => s.selecionados);
  const selecionarUm = useSelecaoIcones((s) => s.selecionarUm);
  const alternar = useSelecaoIcones((s) => s.alternar);

  const arraste = useRef<{
    x0: number;
    y0: number;
    movido: boolean;
    origens: Map<string, { x: number; y: number }>;
  } | null>(null);

  function aoPressionar(e: React.PointerEvent, tipo: TipoApp) {
    e.stopPropagation(); // impede o marquee do desktop
    if (e.button !== 0) return;
    const sel = useSelecaoIcones.getState().selecionados;
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      alternar(tipo);
    } else if (!sel.has(tipo)) {
      selecionarUm(tipo);
    }
    const selAtual = useSelecaoIcones.getState().selecionados;
    const alvos = selAtual.has(tipo) ? [...selAtual] : [tipo];
    const pos = useIconesDesktop.getState().posicoes;
    const origens = new Map<string, { x: number; y: number }>();
    for (const t of alvos) origens.set(t, { ...(pos[t] ?? { x: 0, y: 0 }) });
    arraste.current = { x0: e.clientX, y0: e.clientY, movido: false, origens };
  }

  function aoMover(e: React.PointerEvent) {
    const a = arraste.current;
    if (!a) return;
    const dx = e.clientX - a.x0;
    const dy = e.clientY - a.y0;
    if (!a.movido) {
      if (Math.hypot(dx, dy) < LIMIAR) return;
      a.movido = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    for (const [t, o] of a.origens) mover(t as TipoApp, o.x + dx, o.y + dy);
  }

  function aoSoltar(e: React.PointerEvent, tipo: TipoApp) {
    const a = arraste.current;
    arraste.current = null;
    if (a?.movido) e.currentTarget.releasePointerCapture?.(e.pointerId);
    else if (a && !(e.ctrlKey || e.metaKey || e.shiftKey)) selecionarUm(tipo);
  }

  return (
    <div className="icones-area">
      {ORDEM_APPS.map((tipo) => {
        const p = posicoes[tipo] ?? { x: 8, y: 8 };
        const ativo = selecionados.has(tipo);
        return (
          <div
            key={tipo}
            className={`icone-atalho${ativo ? ' sel' : ''}`}
            style={{ left: p.x, top: p.y }}
            role="button"
            tabIndex={0}
            onPointerDown={(e) => aoPressionar(e, tipo)}
            onPointerMove={aoMover}
            onPointerUp={(e) => aoSoltar(e, tipo)}
            onDoubleClick={() => abrirJanela(tipo)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!useSelecaoIcones.getState().selecionados.has(tipo)) selecionarUm(tipo);
              abrirMenu(e.clientX, e.clientY, [
                { rotulo: 'Abrir', aoClicar: () => abrirJanela(tipo) },
              ]);
            }}
          >
            <span className="icone-atalho-glifo" aria-hidden="true">
              <Icone nome={registroApps[tipo].icone} tamanho={32} alt="" />
            </span>
            <span className="icone-atalho-rotulo">{registroApps[tipo].titulo}</span>
          </div>
        );
      })}
    </div>
  );
}
