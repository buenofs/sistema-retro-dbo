import { useRef } from 'react';
import { ORDEM_APPS, registroApps } from './registroApps';
import { useLoja } from './loja';
import { useMenuContexto } from './useMenuContexto';
import { Icone } from '../tema/icones/Icone';
import { useIconesDesktop, useSelecaoIcones } from './lojaIconesDesktop';
import type { TipoApp } from './tipos';

const LIMIAR = 4;

export function IconesDesktop() {
  const abrirJanela = useLoja((loja) => loja.abrirJanela);
  const abrirMenu = useMenuContexto((loja) => loja.abrir);
  const posicoes = useIconesDesktop((loja) => loja.posicoes);
  const mover = useIconesDesktop((loja) => loja.mover);
  const selecionados = useSelecaoIcones((loja) => loja.selecionados);
  const selecionarUm = useSelecaoIcones((loja) => loja.selecionarUm);
  const alternar = useSelecaoIcones((loja) => loja.alternar);

  const arraste = useRef<{
    x0: number; y0: number; movido: boolean;
    origens: Map<string, { x: number; y: number }>;
  } | null>(null);

  function aoPressionar(evento: React.PointerEvent, tipo: TipoApp) {
    evento.stopPropagation();
    if (evento.button !== 0) return;
    const sel = useSelecaoIcones.getState().selecionados;
    if (evento.ctrlKey || evento.metaKey || evento.shiftKey) {
      alternar(tipo);
    } else if (!sel.has(tipo)) {
      selecionarUm(tipo);
    }
    const selAtual = useSelecaoIcones.getState().selecionados;
    const alvos = selAtual.has(tipo) ? [...selAtual] : [tipo];
    const pos = useIconesDesktop.getState().posicoes;
    const origens = new Map<string, { x: number; y: number }>();
    for (const tipoAlvo of alvos) origens.set(tipoAlvo, { ...(pos[tipoAlvo] ?? { x: 0, y: 0 }) });
    arraste.current = { x0: evento.clientX, y0: evento.clientY, movido: false, origens };
  }

  function aoMover(evento: React.PointerEvent) {
    const arrasteAtual = arraste.current;
    if (!arrasteAtual) return;
    const dx = evento.clientX - arrasteAtual.x0;
    const dy = evento.clientY - arrasteAtual.y0;
    if (!arrasteAtual.movido) {
      if (Math.hypot(dx, dy) < LIMIAR) return;
      arrasteAtual.movido = true;
      evento.currentTarget.setPointerCapture?.(evento.pointerId);
    }
    for (const [tipoArrastado, origem] of arrasteAtual.origens) mover(tipoArrastado as TipoApp, origem.x + dx, origem.y + dy);
  }

  function aoSoltar(evento: React.PointerEvent, tipo: TipoApp) {
    const arrasteAtual = arraste.current;
    arraste.current = null;
    if (arrasteAtual?.movido) evento.currentTarget.releasePointerCapture?.(evento.pointerId);
    else if (arrasteAtual && !(evento.ctrlKey || evento.metaKey || evento.shiftKey)) selecionarUm(tipo);
  }

  return (
    <div className="icones-area">
      {ORDEM_APPS.map((tipo) => {
        const posicao = posicoes[tipo] ?? { x: 8, y: 8 };
        const ativo = selecionados.has(tipo);
        return (
          <div
            key={tipo}
            className={`icone-atalho${ativo ? ' sel' : ''}`}
            style={{ left: posicao.x, top: posicao.y }}
            role="button"
            tabIndex={0}
            onPointerDown={(evento) => aoPressionar(evento, tipo)}
            onPointerMove={aoMover}
            onPointerUp={(evento) => aoSoltar(evento, tipo)}
            onDoubleClick={() => abrirJanela(tipo)}
            onContextMenu={(evento) => {
              evento.preventDefault();
              evento.stopPropagation();
              if (!useSelecaoIcones.getState().selecionados.has(tipo)) selecionarUm(tipo);
              abrirMenu(evento.clientX, evento.clientY, [{ rotulo: 'Abrir', aoClicar: () => abrirJanela(tipo) }]);
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
