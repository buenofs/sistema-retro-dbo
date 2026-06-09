import {
  CHAVE_TEMA,
  TEMA_PADRAO,
  type EstadoTema,
  type Pele,
  type TweaksAero,
  type Tweaks98,
} from './tipos';
import { definirSomHabilitado } from '../areaTrabalho/sons';

const VARS_PELE = [
  '--accent',
  '--accent-h',
  '--glass-blur',
  '--crt',
  '--round',
  '--round-sm',
  '--round-btn',
];

function prefereReduzirMovimento(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function motionValor(motion: boolean): string {
  return motion && !prefereReduzirMovimento() ? '1' : '0.001';
}

// Escreve o tema inteiro no documento. Pura (sem React); idempotente.
export function aplicarTema(estado: EstadoTema): void {
  if (typeof document === 'undefined') return;
  const r = document.documentElement.style;
  const corpo = document.body;

  corpo.dataset.skin = estado.pele;
  r.setProperty('--motion', motionValor(estado.motion));
  definirSomHabilitado(estado.sound);

  // Limpa overrides específicos de pele → voltam ao token de tokens.css.
  for (const v of VARS_PELE) r.removeProperty(v);
  delete corpo.dataset.corners;
  delete corpo.dataset.wp;
  delete corpo.dataset.pat;
  corpo.style.removeProperty('font-size');

  if (estado.pele === 'aero') {
    const a: TweaksAero = estado.aero;
    r.setProperty('--accent-h', String(a.accentHue));
    const reto = a.corners === 'reto';
    r.setProperty('--round', reto ? '0px' : '8px');
    r.setProperty('--round-sm', reto ? '0px' : '4px');
    r.setProperty('--round-btn', reto ? '0px' : '6px');
    r.setProperty('--glass-blur', a.glass ? '14px' : '0px');
    corpo.dataset.corners = reto ? 'reto' : 'aero';
    corpo.dataset.wp = a.wallpaper;
  } else {
    const n: Tweaks98 = estado.n98;
    r.setProperty('--accent', n.accent);
    r.setProperty('--crt', n.crt ? '0.5' : '0');
    corpo.dataset.pat = n.pattern;
    corpo.style.fontSize = n.density === 'compacto' ? '11px' : '12px';
  }
}

function ehPele(v: unknown): v is Pele {
  return v === 'aero' || v === '98';
}

// Merge por chave: campos ausentes/ inválidos caem no padrão.
export function lerEstadoInicial(): EstadoTema {
  try {
    const cru = localStorage.getItem(CHAVE_TEMA);
    if (!cru) return TEMA_PADRAO;
    const o = JSON.parse(cru) as Partial<EstadoTema>;
    return {
      pele: ehPele(o.pele) ? o.pele : TEMA_PADRAO.pele,
      aero: { ...TEMA_PADRAO.aero, ...(o.aero ?? {}) },
      n98: { ...TEMA_PADRAO.n98, ...(o.n98 ?? {}) },
      motion: typeof o.motion === 'boolean' ? o.motion : TEMA_PADRAO.motion,
      sound: typeof o.sound === 'boolean' ? o.sound : TEMA_PADRAO.sound,
    };
  } catch {
    return TEMA_PADRAO;
  }
}

export function persistirTema(estado: EstadoTema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, JSON.stringify(estado));
  } catch {
    /* best-effort */
  }
}
