import { test, expect } from 'vitest';
import { obterIcone, temIcone, listarIcones } from './motor';
import { NOMES_ICONES } from './nomes';

test('listarIcones e temIcone refletem NOMES_ICONES', () => {
  expect(new Set(listarIcones())).toEqual(new Set(NOMES_ICONES));
  expect(temIcone('folder')).toBe(true);
  expect(temIcone('nao-existe')).toBe(false);
});

test('aero: usa o asset base do ícone', () => {
  const url = obterIcone('folder');
  expect(url).toBeTruthy();
  expect(typeof url).toBe('string');
});

test('obterIcone devolve string para todos os nomes', () => {
  for (const nome of NOMES_ICONES) {
    expect(typeof obterIcone(nome)).toBe('string');
  }
});
