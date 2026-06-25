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

  useEffect(() => {
    aplicarTema(tema);
    persistirTema(tema);
  }, [tema]);

  const temaRef = useRef(tema);
  temaRef.current = tema;
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aoMudar = () => aplicarTema(temaRef.current);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  const definirPele = useCallback((pele: Pele) => setTema((temaAtual) => ({ ...temaAtual, pele })), []);
  const definirAero = useCallback(
    (parcial: Partial<TweaksAero>) => setTema((temaAtual) => ({ ...temaAtual, aero: { ...temaAtual.aero, ...parcial } })),
    [],
  );
  const definir98 = useCallback(
    (parcial: Partial<Tweaks98>) => setTema((temaAtual) => ({ ...temaAtual, n98: { ...temaAtual.n98, ...parcial } })),
    [],
  );
  const definirMotion = useCallback((valor: boolean) => setTema((temaAtual) => ({ ...temaAtual, motion: valor })), []);
  const definirSound = useCallback((valor: boolean) => setTema((temaAtual) => ({ ...temaAtual, sound: valor })), []);

  const valor = useMemo<ContextoTemaValor>(
    () => ({ tema, definirPele, definirAero, definir98, definirMotion, definirSound }),
    [tema, definirPele, definirAero, definir98, definirMotion, definirSound],
  );

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}
