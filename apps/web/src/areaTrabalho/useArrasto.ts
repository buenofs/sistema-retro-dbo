import { useCallback, useRef, type PointerEvent as PointerEventReact } from 'react';

export interface DeltaArrasto {
  dx: number;
  dy: number;
}

export interface OpcoesArrasto {
  aoIniciar?: () => void;
  // dx/dy são o deslocamento TOTAL desde o pointerdown (evita acúmulo de erro).
  aoMover: (delta: DeltaArrasto) => void;
  aoFinalizar?: () => void;
}

// Devolve um handler de onPointerDown. Enquanto o ponteiro se move, chama
// aoMover no máximo uma vez por frame (rAF) com o deslocamento total.
export function useArrasto({ aoIniciar, aoMover, aoFinalizar }: OpcoesArrasto) {
  const ref = useRef({ inicioX: 0, inicioY: 0, ultimoX: 0, ultimoY: 0, frame: 0, ativo: false });

  return useCallback(
    (evento: PointerEventReact) => {
      evento.preventDefault();
      evento.stopPropagation();
      const e = ref.current;
      e.inicioX = e.ultimoX = evento.clientX;
      e.inicioY = e.ultimoY = evento.clientY;
      e.ativo = true;
      aoIniciar?.();

      function aoMoverPonteiro(ev: PointerEvent) {
        e.ultimoX = ev.clientX;
        e.ultimoY = ev.clientY;
        if (e.frame) return; // já há um frame agendado
        e.frame = requestAnimationFrame(() => {
          e.frame = 0;
          if (!e.ativo) return;
          aoMover({ dx: e.ultimoX - e.inicioX, dy: e.ultimoY - e.inicioY });
        });
      }

      function aoSoltar() {
        e.ativo = false;
        if (e.frame) {
          cancelAnimationFrame(e.frame);
          e.frame = 0;
        }
        window.removeEventListener('pointermove', aoMoverPonteiro);
        window.removeEventListener('pointerup', aoSoltar);
        aoFinalizar?.();
      }

      window.addEventListener('pointermove', aoMoverPonteiro);
      window.addEventListener('pointerup', aoSoltar);
    },
    [aoIniciar, aoMover, aoFinalizar],
  );
}
