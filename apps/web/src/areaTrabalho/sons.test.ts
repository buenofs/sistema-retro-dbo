import { test, expect } from 'vitest';
import { tocarSom, definirSomHabilitado, somHabilitado } from './sons';

test('tocarSom é seguro sem áudio (jsdom) para todos os tipos', () => {
  expect(() => {
    tocarSom('abrir');
    tocarSom('fechar');
    tocarSom('erro');
    tocarSom('iniciar');
  }).not.toThrow();
});

test('definirSomHabilitado alterna o flag consultável', () => {
  definirSomHabilitado(false);
  expect(somHabilitado()).toBe(false);
  definirSomHabilitado(true);
  expect(somHabilitado()).toBe(true);
});

test('tocarSom é seguro com o som desligado', () => {
  definirSomHabilitado(false);
  expect(() => tocarSom('abrir')).not.toThrow();
  definirSomHabilitado(true);
});
