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
import { PainelTweaks } from '../tema/PainelTweaks';
import { usePainelTweaks } from '../tema/painel';
import { IconesDesktop } from './IconesDesktop';
import { useIconesDesktop, useSelecaoIcones, LARGURA_ICONE, ALTURA_ICONE } from './lojaIconesDesktop';
import './areaTrabalho.css';

export function AreaTrabalho({ usuario }: { usuario: UsuarioSessao }) {
  useSonsJanelas();
  const abrirJanela = useLoja((loja) => loja.abrirJanela);
  const abrirMenu = useMenuContexto((loja) => loja.abrir);
  const abrirPainel = usePainelTweaks((loja) => loja.abrir);
  const limparSelecao = useSelecaoIcones((loja) => loja.limpar);
  const definirSelecao = useSelecaoIcones((loja) => loja.definir);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const marqueeRef = useRef<{ x0: number; y0: number } | null>(null);

  function ehFundo(evento: React.PointerEvent) {
    const alvo = evento.target as HTMLElement;
    return (
      alvo === evento.currentTarget ||
      alvo.classList.contains('camada-bolhas') ||
      alvo.classList.contains('bolha') ||
      alvo.classList.contains('icones-area')
    );
  }
  function aoPressionarFundo(evento: React.PointerEvent) {
    if (evento.button !== 0 || !ehFundo(evento)) return;
    if (!(evento.ctrlKey || evento.metaKey || evento.shiftKey)) limparSelecao();
    marqueeRef.current = { x0: evento.clientX, y0: evento.clientY };
    setMarquee({ x0: evento.clientX, y0: evento.clientY, x1: evento.clientX, y1: evento.clientY });
    (evento.currentTarget as HTMLElement).setPointerCapture?.(evento.pointerId);
  }
  function aoMoverFundo(evento: React.PointerEvent) {
    const marqueeInicio = marqueeRef.current;
    if (!marqueeInicio) return;
    setMarquee({ x0: marqueeInicio.x0, y0: marqueeInicio.y0, x1: evento.clientX, y1: evento.clientY });
    const minX = Math.min(marqueeInicio.x0, evento.clientX), maxX = Math.max(marqueeInicio.x0, evento.clientX);
    const minY = Math.min(marqueeInicio.y0, evento.clientY), maxY = Math.max(marqueeInicio.y0, evento.clientY);
    const pos = useIconesDesktop.getState().posicoes;
    const dentro: string[] = [];
    for (const tipo of ORDEM_APPS) {
      const posicao = pos[tipo];
      if (!posicao) continue;
      if (posicao.x < maxX && posicao.x + LARGURA_ICONE > minX && posicao.y < maxY && posicao.y + ALTURA_ICONE > minY) dentro.push(tipo);
    }
    definirSelecao(dentro);
  }
  function aoSoltarFundo(evento: React.PointerEvent) {
    marqueeRef.current = null;
    setMarquee(null);
    (evento.currentTarget as HTMLElement).releasePointerCapture?.(evento.pointerId);
  }

  return (
    <div
      className="area-trabalho"
      onPointerDown={aoPressionarFundo}
      onPointerMove={aoMoverFundo}
      onPointerUp={aoSoltarFundo}
      onContextMenu={(evento) => {
        if (evento.target !== evento.currentTarget) return;
        evento.preventDefault();
        const itens: ItemMenu[] = ORDEM_APPS.map((tipo) => ({
          rotulo: `Abrir ${registroApps[tipo].titulo}`,
          aoClicar: () => abrirJanela(tipo),
        }));
        itens.push({ rotulo: 'Propriedades', aoClicar: () => abrirPainel() });
        abrirMenu(evento.clientX, evento.clientY, itens);
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
      <PainelTweaks />
    </div>
  );
}
