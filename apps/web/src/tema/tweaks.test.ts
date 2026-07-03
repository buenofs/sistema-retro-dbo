import { test, expect, beforeEach } from 'vitest';
import { aplicarTema } from './tweaks';
import { somHabilitado } from '../areaTrabalho/sons';

beforeEach(() => {
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
  delete document.body.dataset.skin;
  delete document.body.dataset.corners;
  delete document.body.dataset.wp;
});

test('aplicarTema escreve skin aero e variáveis CSS corretas', () => {
  aplicarTema();
  const raiz = document.documentElement.style;
  expect(document.body.dataset.skin).toBe('aero');
  expect(raiz.getPropertyValue('--accent-h')).toBe('200');
  expect(raiz.getPropertyValue('--glass-blur')).toBe('14px');
  expect(raiz.getPropertyValue('--round')).toBe('8px');
  expect(document.body.dataset.corners).toBe('aero');
  expect(document.body.dataset.wp).toBe('aqua');
});

test('aplicarTema habilita o som', () => {
  aplicarTema();
  expect(somHabilitado()).toBe(true);
});
