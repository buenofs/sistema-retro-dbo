import { useRef, useState } from 'react';
import type { UsuarioSessao } from '@dbos/shared';
import { ORDEM_APPS, registroApps } from './registroApps';
import { useLoja } from './loja';
import { type ItemMenu, useMenuContexto } from './useMenuContexto';
import { useSonsJanelas } from './useSonsJanelas';
import { CamadaJanelas } from './CamadaJanelas';
import { BarraTarefas } from './BarraTarefas';
import { GerenciadorDialogos } from './GerenciadorDialogos';
import { MenuContexto } from './MenuContexto';
import { IconesDesktop } from './IconesDesktop';
import {
  useIconesDesktop,
  useSelecaoIcones,
  LARGURA_ICONE,
  ALTURA_ICONE,
} from './lojaIconesDesktop';
import './areaTrabalho.css';

export function AreaTrabalho({ usuario }: { usuario: UsuarioSessao }) {
  useSonsJanelas();
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const abrirMenu = useMenuContexto((s) => s.abrir);
  const limparSelecao = useSelecaoIcones((s) => s.limpar);
  const definirSelecao = useSelecaoIcones((s) => s.definir);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );
  const marqueeRef = useRef<{ x0: number; y0: number } | null>(null);

  function ehFundo(e: React.PointerEvent) {
    const alvo = e.target as HTMLElement;
    return (
      alvo === e.currentTarget ||
      alvo.classList.contains('camada-bolhas') ||
      alvo.classList.contains('bolha') ||
      alvo.classList.contains('icones-area')
    );
  }
  function aoPressionarFundo(e: React.PointerEvent) {
    if (e.button !== 0 || !ehFundo(e)) return;
    if (!(e.ctrlKey || e.metaKey || e.shiftKey)) limparSelecao();
    marqueeRef.current = { x0: e.clientX, y0: e.clientY };
    setMarquee({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function aoMoverFundo(e: React.PointerEvent) {
    const m = marqueeRef.current;
    if (!m) return;
    setMarquee({ x0: m.x0, y0: m.y0, x1: e.clientX, y1: e.clientY });
    const minX = Math.min(m.x0, e.clientX),
      maxX = Math.max(m.x0, e.clientX);
    const minY = Math.min(m.y0, e.clientY),
      maxY = Math.max(m.y0, e.clientY);
    const pos = useIconesDesktop.getState().posicoes;
    const dentro: string[] = [];
    for (const tipo of ORDEM_APPS) {
      const p = pos[tipo];
      if (!p) continue;
      if (p.x < maxX && p.x + LARGURA_ICONE > minX && p.y < maxY && p.y + ALTURA_ICONE > minY)
        dentro.push(tipo);
    }
    definirSelecao(dentro);
  }
  function aoSoltarFundo(e: React.PointerEvent) {
    marqueeRef.current = null;
    setMarquee(null);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  return (
    <div
      className="area-trabalho"
      onPointerDown={aoPressionarFundo}
      onPointerMove={aoMoverFundo}
      onPointerUp={aoSoltarFundo}
      onContextMenu={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        const itens: ItemMenu[] = ORDEM_APPS.map((tipo) => ({
          rotulo: `Abrir ${registroApps[tipo].titulo}`,
          aoClicar: () => abrirJanela(tipo),
        }));
        abrirMenu(e.clientX, e.clientY, itens);
      }}
    >
      <div className="camada-bolhas" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`bolha bolha-${i + 1}`} />
        ))}
      </div>
      <IconesDesktop />
      {marquee && (
        <div
          className="marquee"
          style={{
            left: Math.min(marquee.x0, marquee.x1),
            top: Math.min(marquee.y0, marquee.y1),
            width: Math.abs(marquee.x1 - marquee.x0),
            height: Math.abs(marquee.y1 - marquee.y0),
          }}
        />
      )}
      <CamadaJanelas />
      <div className="rotulo-banco" aria-hidden="true">
        {usuario.banco}
      </div>
      <BarraTarefas login={usuario.login} />
      <GerenciadorDialogos />
      <MenuContexto />
    </div>
  );
}
