import { useRef, useState } from 'react';
import { useTweaks } from './ganchos';
import { usePainelTweaks } from './painel';
import { useBoot } from '../boot';
import { WALLPAPERS, PADROES, ACENTOS_98 } from './tipos';
import {
  SecaoTweaks,
  Alternador,
  RadioSegmentado,
  Selecao,
  Deslizador,
  ChipsCor,
  Botao,
} from './controles';
import './PainelTweaks.css';

export function PainelTweaks() {
  const { tema, definirPele, definirAero, definir98, definirMotion, definirSound } = useTweaks();
  const aberto = usePainelTweaks((loja) => loja.aberto);
  const fechar = usePainelTweaks((loja) => loja.fechar);
  const reiniciarBoot = useBoot((loja) => loja.reiniciar);

  // arrasto simples pelo cabeçalho
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const arrasto = useRef<{ dx: number; dy: number } | null>(null);

  if (!aberto) return null;

  function aoPressionarCabecalho(evento: React.PointerEvent) {
    const alvo = evento.currentTarget as HTMLElement;
    const cx = pos?.x ?? alvo.parentElement!.getBoundingClientRect().left;
    const cy = pos?.y ?? alvo.parentElement!.getBoundingClientRect().top;
    arrasto.current = { dx: evento.clientX - cx, dy: evento.clientY - cy };
    if (typeof alvo.setPointerCapture === 'function') alvo.setPointerCapture(evento.pointerId);
  }
  function aoMover(evento: React.PointerEvent) {
    if (!arrasto.current) return;
    setPos({ x: evento.clientX - arrasto.current.dx, y: evento.clientY - arrasto.current.dy });
  }
  function aoSoltar(evento: React.PointerEvent) {
    arrasto.current = null;
    const alvo = evento.currentTarget as HTMLElement;
    if (typeof alvo.releasePointerCapture === 'function') alvo.releasePointerCapture(evento.pointerId);
  }

  const estilo = pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined;

  return (
    <div className="painel-tweaks" style={estilo} role="dialog" aria-label="Tweaks">
      <div
        className="painel-tweaks-cabecalho"
        onPointerDown={aoPressionarCabecalho}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
      >
        <span>Tweaks</span>
        <button type="button" className="painel-tweaks-fechar" aria-label="Fechar" onPointerDown={(evento) => evento.stopPropagation()} onClick={fechar}>
          ×
        </button>
      </div>

      <div className="painel-tweaks-corpo">
        <SecaoTweaks rotulo="Aparência">
          <RadioSegmentado
            rotulo="Pele"
            valor={tema.pele}
            opcoes={[
              { valor: 'aero', rotulo: 'Aero' },
              { valor: '98', rotulo: '98' },
            ]}
            aoMudar={definirPele}
          />
          <Alternador rotulo="Animações" valor={tema.motion} aoMudar={definirMotion} />
          <Alternador rotulo="Som" valor={tema.sound} aoMudar={definirSound} />
        </SecaoTweaks>

        {tema.pele === 'aero' ? (
          <SecaoTweaks rotulo="Aero">
            <Deslizador
              rotulo="Matiz do acento"
              valor={tema.aero.accentHue}
              min={150}
              max={320}
              passo={2}
              unidade="°"
              aoMudar={(valor) => definirAero({ accentHue: valor })}
            />
            <Alternador
              rotulo="Vidro fosco"
              valor={tema.aero.glass}
              aoMudar={(valor) => definirAero({ glass: valor })}
            />
            <RadioSegmentado
              rotulo="Cantos"
              valor={tema.aero.corners}
              opcoes={[
                { valor: 'aero', rotulo: 'Aero' },
                { valor: 'reto', rotulo: 'Reto (98)' },
              ]}
              aoMudar={(valor) => definirAero({ corners: valor })}
            />
            <Selecao
              rotulo="Wallpaper"
              valor={tema.aero.wallpaper}
              opcoes={WALLPAPERS}
              aoMudar={(valor) => definirAero({ wallpaper: valor })}
            />
          </SecaoTweaks>
        ) : (
          <SecaoTweaks rotulo="98">
            <ChipsCor
              rotulo="Acento"
              valor={tema.n98.accent}
              opcoes={ACENTOS_98}
              aoMudar={(valor) => definir98({ accent: valor })}
            />
            <Selecao
              rotulo="Padrão da área"
              valor={tema.n98.pattern}
              opcoes={PADROES}
              aoMudar={(valor) => definir98({ pattern: valor })}
            />
            <RadioSegmentado
              rotulo="Densidade"
              valor={tema.n98.density}
              opcoes={[
                { valor: 'compacto', rotulo: 'Compacto' },
                { valor: 'normal', rotulo: 'Normal' },
              ]}
              aoMudar={(valor) => definir98({ density: valor })}
            />
            <Alternador
              rotulo="Monitor CRT (scanlines)"
              valor={tema.n98.crt}
              aoMudar={(valor) => definir98({ crt: valor })}
            />
          </SecaoTweaks>
        )}

        <SecaoTweaks rotulo="Sessão">
          <Botao
            rotulo="Reiniciar sessão"
            secundario
            aoClicar={() => {
              reiniciarBoot();
              fechar();
            }}
          />
        </SecaoTweaks>
      </div>
    </div>
  );
}
