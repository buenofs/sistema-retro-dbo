import { useCallback, useRef, type PointerEvent as PointerEventReact } from 'react';

export interface DeltaArrasto {
  dx: number;
  dy: number;
}

export interface OpcoesArrasto {
  aoIniciar?: () => void;
  aoMover: (delta: DeltaArrasto) => void;
  aoFinalizar?: () => void;
}

export function useArrasto({ aoIniciar, aoMover, aoFinalizar }: OpcoesArrasto) {
  const ref = useRef({ inicioX: 0, inicioY: 0, ultimoX: 0, ultimoY: 0, frame: 0, ativo: false });

  return useCallback(
    (evento: PointerEventReact) => {
      evento.preventDefault();
      evento.stopPropagation();
      const estado = ref.current;
      estado.inicioX = estado.ultimoX = evento.clientX;
      estado.inicioY = estado.ultimoY = evento.clientY;
      estado.ativo = true;
      aoIniciar?.();

      function aoMoverPonteiro(ev: PointerEvent) {
        estado.ultimoX = ev.clientX;
        estado.ultimoY = ev.clientY;
        if (estado.frame) return;
        estado.frame = requestAnimationFrame(() => {
          estado.frame = 0;
          if (!estado.ativo) return;
          aoMover({ dx: estado.ultimoX - estado.inicioX, dy: estado.ultimoY - estado.inicioY });
        });
      }

      function aoSoltar() {
        estado.ativo = false;
        if (estado.frame) {
          cancelAnimationFrame(estado.frame);
          estado.frame = 0;
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
