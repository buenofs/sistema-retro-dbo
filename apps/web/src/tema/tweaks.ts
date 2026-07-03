import { definirSomHabilitado } from '../areaTrabalho/sons';

function prefereReduzirMovimento(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function aplicarTema(): void {
  if (typeof document === 'undefined') return;
  const r = document.documentElement.style;
  const corpo = document.body;

  corpo.dataset.skin = 'aero';
  r.setProperty('--motion', prefereReduzirMovimento() ? '0.001' : '1');
  definirSomHabilitado(true);

  r.setProperty('--accent-h', '200');
  r.setProperty('--round', '8px');
  r.setProperty('--round-sm', '4px');
  r.setProperty('--round-btn', '6px');
  r.setProperty('--glass-blur', '14px');
  corpo.dataset.corners = 'aero';
  corpo.dataset.wp = 'aqua';
}
