import { useContext } from 'react';
import { ContextoTema, type ContextoTemaValor } from './ProvedorTema';

export function useTema(): ContextoTemaValor {
  const ctx = useContext(ContextoTema);
  if (!ctx) throw new Error('useTema deve ser usado dentro de <ProvedorTema>.');
  return ctx;
}
