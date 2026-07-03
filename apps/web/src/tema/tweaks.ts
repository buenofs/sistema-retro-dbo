import { definirSomHabilitado } from '../areaTrabalho/sons';

function prefereReduzirMovimento(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Tema único (aero): as variáveis vivem em tokens.css. Aqui só o que é dinâmico:
// o multiplicador de animação (respeita prefers-reduced-motion) e habilitar o som.
export function aplicarTema(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--motion', prefereReduzirMovimento() ? '0.001' : '1');
  definirSomHabilitado(true);
}
