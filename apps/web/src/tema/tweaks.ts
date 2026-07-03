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

export function aplicarTema(estado: EstadoTema): void {
  if (typeof document === 'undefined') return;
  const estilo = document.documentElement.style;
  const corpo = document.body;

  corpo.dataset.skin = estado.pele;
  estilo.setProperty('--motion', motionValor(estado.motion));
  definirSomHabilitado(estado.sound);

  for (const nomeVar of VARS_PELE) estilo.removeProperty(nomeVar);
  delete corpo.dataset.corners;
  delete corpo.dataset.wp;
  delete corpo.dataset.pat;
  corpo.style.removeProperty('font-size');

  if (estado.pele === 'aero') {
    const aero: TweaksAero = estado.aero;
    estilo.setProperty('--accent-h', String(aero.accentHue));
    const reto = aero.corners === 'reto';
    estilo.setProperty('--round', reto ? '0px' : '8px');
    estilo.setProperty('--round-sm', reto ? '0px' : '4px');
    estilo.setProperty('--round-btn', reto ? '0px' : '6px');
    estilo.setProperty('--glass-blur', aero.glass ? '14px' : '0px');
    corpo.dataset.corners = reto ? 'reto' : 'aero';
    corpo.dataset.wp = aero.wallpaper;
  } else {
    const n98: Tweaks98 = estado.n98;
    estilo.setProperty('--accent', n98.accent);
    estilo.setProperty('--crt', n98.crt ? '0.5' : '0');
    corpo.dataset.pat = n98.pattern;
    corpo.style.fontSize = n98.density === 'compacto' ? '11px' : '12px';
  }
}

function ehPele(valor: unknown): valor is Pele {
  return valor === 'aero' || valor === '98';
}

export function lerEstadoInicial(): EstadoTema {
  try {
    const cru = localStorage.getItem(CHAVE_TEMA);
    if (!cru) return TEMA_PADRAO;
    const bruto = JSON.parse(cru) as Partial<EstadoTema>;
    return {
      pele: ehPele(bruto.pele) ? bruto.pele : TEMA_PADRAO.pele,
      aero: { ...TEMA_PADRAO.aero, ...(bruto.aero ?? {}) },
      n98: { ...TEMA_PADRAO.n98, ...(bruto.n98 ?? {}) },
      motion: typeof bruto.motion === 'boolean' ? bruto.motion : TEMA_PADRAO.motion,
      sound: typeof bruto.sound === 'boolean' ? bruto.sound : TEMA_PADRAO.sound,
    };
  } catch {
    return TEMA_PADRAO;
  }
}

export function persistirTema(estado: EstadoTema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, JSON.stringify(estado));
  } catch {
  }
}
