import { test, expect } from 'vitest';
import { NOMES_ICONES } from './nomes';
import { MANIFESTO } from './manifesto';

test('todo nome tem assets em ambas as peles', () => {
  for (const nome of NOMES_ICONES) {
    const a98 = MANIFESTO['98'][nome];
    expect(a98, `98/${nome}`).toBeDefined();
    expect(a98!['16'], `98/${nome}-16`).toBeTruthy();
    expect(a98!['32'], `98/${nome}-32`).toBeTruthy();
    const aAero = MANIFESTO['aero'][nome];
    expect(aAero, `aero/${nome}`).toBeDefined();
    expect(aAero!.base, `aero/${nome}.base`).toBeTruthy();
  }
});

test('o manifesto não tem nome fora de NOMES_ICONES', () => {
  const validos = new Set<string>(NOMES_ICONES);
  for (const pele of ['98','aero'] as const)
    for (const nome of Object.keys(MANIFESTO[pele]))
      expect(validos.has(nome), `${pele}/${nome} inesperado`).toBe(true);
});
