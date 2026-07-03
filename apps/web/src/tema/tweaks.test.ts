import { test, expect, beforeEach } from 'vitest';
import { aplicarTema, lerEstadoInicial } from './tweaks';
import { TEMA_PADRAO, CHAVE_TEMA, type EstadoTema } from './tipos';
import { somHabilitado } from '../areaTrabalho/sons';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
  delete document.body.dataset.skin;
  delete document.body.dataset.corners;
  delete document.body.dataset.wp;
  delete document.body.dataset.pat;
});

function tema(parcial: Partial<EstadoTema>): EstadoTema {
  return { ...TEMA_PADRAO, ...parcial };
}

test('aplicarTema na pele 98 escreve acento, crt, padrão, densidade e nada de aero', () => {
  aplicarTema(
    tema({ pele: '98', n98: { accent: '#b0228c', pattern: 'grid', density: 'compacto', crt: true } }),
  );
  const raiz = document.documentElement.style;
  expect(document.body.dataset.skin).toBe('98');
  expect(raiz.getPropertyValue('--accent')).toBe('#b0228c');
  expect(raiz.getPropertyValue('--crt')).toBe('0.5');
  expect(document.body.dataset.pat).toBe('grid');
  expect(document.body.style.fontSize).toBe('11px');
  expect(raiz.getPropertyValue('--glass-blur')).toBe('');
  expect(document.body.dataset.wp).toBeUndefined();
});

test('aplicarTema na pele aero escreve matiz, cantos, vidro, wallpaper e nada de 98', () => {
  aplicarTema(
    tema({ pele: 'aero', aero: { accentHue: 280, glass: false, corners: 'reto', wallpaper: 'noite' } }),
  );
  const raiz = document.documentElement.style;
  expect(document.body.dataset.skin).toBe('aero');
  expect(raiz.getPropertyValue('--accent-h')).toBe('280');
  expect(raiz.getPropertyValue('--glass-blur')).toBe('0px');
  expect(raiz.getPropertyValue('--round')).toBe('0px');
  expect(document.body.dataset.corners).toBe('reto');
  expect(document.body.dataset.wp).toBe('noite');
  expect(document.body.dataset.pat).toBeUndefined();
});

test('motion=false reduz --motion', () => {
  aplicarTema(tema({ motion: false }));
  expect(document.documentElement.style.getPropertyValue('--motion')).toBe('0.001');
});

test('aplicarTema repercute o som no sistema de sons', () => {
  aplicarTema(tema({ sound: false }));
  expect(somHabilitado()).toBe(false);
  aplicarTema(tema({ sound: true }));
  expect(somHabilitado()).toBe(true);
});

test('lerEstadoInicial faz merge por chave com dados antigos', () => {
  localStorage.setItem(CHAVE_TEMA, JSON.stringify({ pele: 'aero' }));
  const e = lerEstadoInicial();
  expect(e.pele).toBe('aero');
  expect(e.aero).toEqual(TEMA_PADRAO.aero);
  expect(e.sound).toBe(true);
});

test('lerEstadoInicial cai no padrão com lixo', () => {
  localStorage.setItem(CHAVE_TEMA, '{nao-e-json');
  expect(lerEstadoInicial()).toEqual(TEMA_PADRAO);
});
