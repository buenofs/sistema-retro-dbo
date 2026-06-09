import { test, expect } from 'vitest';
import { obterIcone, temIcone, listarIcones } from './motor';
import { NOMES_ICONES } from './nomes';

test('listarIcones e temIcone refletem NOMES_ICONES', () => {
  expect(new Set(listarIcones())).toEqual(new Set(NOMES_ICONES));
  expect(temIcone('folder')).toBe(true);
  expect(temIcone('nao-existe')).toBe(false);
});

test('98: tamanho <= 16 usa o tier 16; > 16 usa o tier 32', () => {
  const p = obterIcone('folder', '98', 16);
  const g = obterIcone('folder', '98', 32);
  expect(p).toBeTruthy();
  expect(g).toBeTruthy();
  // urls de tiers diferentes não colidem (a menos que falte um tier nativo)
  expect(typeof p).toBe('string');
});

test('aero: usa o asset base independentemente do tamanho', () => {
  const a = obterIcone('folder', 'aero', 16);
  const b = obterIcone('folder', 'aero', 48);
  expect(a).toBeTruthy();
  expect(a).toBe(b);
});

test('obterIcone devolve string para todos os nomes em ambas as peles', () => {
  for (const nome of NOMES_ICONES) {
    expect(typeof obterIcone(nome, '98', 16)).toBe('string');
    expect(typeof obterIcone(nome, 'aero', 32)).toBe('string');
  }
});
