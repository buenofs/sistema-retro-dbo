import { useContext } from 'react';
import { ContextoTema, type ContextoTemaValor } from './ProvedorTema';
import type { Pele } from './tipos';

export function useTema(): { pele: Pele; definirPele: (pele: Pele) => void } {
  const ctx = useContext(ContextoTema);
  if (!ctx) throw new Error('useTema deve ser usado dentro de <ProvedorTema>.');
  return { pele: ctx.tema.pele, definirPele: ctx.definirPele };
}

export function useTweaks(): ContextoTemaValor {
  const ctx = useContext(ContextoTema);
  if (!ctx) throw new Error('useTweaks deve ser usado dentro de <ProvedorTema>.');
  return ctx;
}
