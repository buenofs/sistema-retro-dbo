import { test, expect } from 'vitest';
import { NOMES_ICONES } from './nomes';
import { MANIFESTO } from './manifesto';

test('todo nome tem asset na pele aero', () => {
  for (const nome of NOMES_ICONES) {
    const aAero = MANIFESTO.aero[nome];
    expect(aAero, `aero/${nome}`).toBeDefined();
    expect(aAero!.base, `aero/${nome}.base`).toBeTruthy();
  }
});

test('o manifesto não tem nome fora de NOMES_ICONES', () => {
  const validos = new Set<string>(NOMES_ICONES);
  for (const nome of Object.keys(MANIFESTO.aero))
    expect(validos.has(nome), `aero/${nome} inesperado`).toBe(true);
});
