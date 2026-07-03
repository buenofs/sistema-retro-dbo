import { useEffect, type ReactNode } from 'react';
import { aplicarTema } from './tweaks';

export function ProvedorTema({ children }: { children: ReactNode }) {
  useEffect(() => {
    aplicarTema();
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', aplicarTema);
    return () => mq.removeEventListener('change', aplicarTema);
  }, []);
  return <>{children}</>;
}
