import { test, expect, beforeEach } from 'vitest';
import { aplicarTema } from './tweaks';
import { somHabilitado } from '../areaTrabalho/sons';

beforeEach(() => {
  document.documentElement.removeAttribute('style');
});

test('aplicarTema define o multiplicador de animação', () => {
  aplicarTema();
  expect(document.documentElement.style.getPropertyValue('--motion')).toBe('1');
});

test('aplicarTema habilita o som', () => {
  aplicarTema();
  expect(somHabilitado()).toBe(true);
});
