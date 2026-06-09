import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { EstadoTema, Pele, TweaksAero, Tweaks98 } from './tipos';
import { aplicarTema, lerEstadoInicial, persistirTema } from './tweaks';

export interface ContextoTemaValor {
  tema: EstadoTema;
  definirPele: (pele: Pele) => void;
  definirAero: (parcial: Partial<TweaksAero>) => void;
  definir98: (parcial: Partial<Tweaks98>) => void;
  definirMotion: (valor: boolean) => void;
  definirSound: (valor: boolean) => void;
}

export const ContextoTema = createContext<ContextoTemaValor | null>(null);

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<EstadoTema>(lerEstadoInicial);

  // Aplica + persiste a cada mudança.
  useEffect(() => {
    aplicarTema(tema);
    persistirTema(tema);
  }, [tema]);

  // Re-aplica quando prefers-reduced-motion muda (sem perder o estado atual).
  const temaRef = useRef(tema);
  temaRef.current = tema;
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aoMudar = () => aplicarTema(temaRef.current);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  const definirPele = useCallback((pele: Pele) => setTema((t) => ({ ...t, pele })), []);
  const definirAero = useCallback(
    (p: Partial<TweaksAero>) => setTema((t) => ({ ...t, aero: { ...t.aero, ...p } })),
    [],
  );
  const definir98 = useCallback(
    (p: Partial<Tweaks98>) => setTema((t) => ({ ...t, n98: { ...t.n98, ...p } })),
    [],
  );
  const definirMotion = useCallback((valor: boolean) => setTema((t) => ({ ...t, motion: valor })), []);
  const definirSound = useCallback((valor: boolean) => setTema((t) => ({ ...t, sound: valor })), []);

  const valor = useMemo<ContextoTemaValor>(
    () => ({ tema, definirPele, definirAero, definir98, definirMotion, definirSound }),
    [tema, definirPele, definirAero, definir98, definirMotion, definirSound],
  );

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}
