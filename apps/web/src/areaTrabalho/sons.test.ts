import { test, expect } from 'vitest';
import { tocarSom } from './sons';

// No jsdom não há AudioContext: tocarSom deve sair graciosamente, sem lançar.
test('tocarSom é seguro sem áudio (jsdom) para todos os tipos', () => {
  expect(() => {
    tocarSom('abrir');
    tocarSom('fechar');
    tocarSom('erro');
    tocarSom('iniciar');
  }).not.toThrow();
});
