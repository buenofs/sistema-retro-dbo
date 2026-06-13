import { test, expect } from 'bun:test';
import { ordemDeInsercao, type NoCopia } from './copiaArvore';

test('ordena pais antes dos filhos (profundidade asc)', () => {
  const nos: NoCopia[] = [
    { id: 5, paiId: 4, profundidade: 2 },
    { id: 1, paiId: null, profundidade: 0 },
    { id: 4, paiId: 1, profundidade: 1 },
  ];
  expect(ordemDeInsercao(nos).map((n) => n.id)).toEqual([1, 4, 5]);
});

test('é estável para mesma profundidade', () => {
  const nos: NoCopia[] = [
    { id: 2, paiId: 1, profundidade: 1 },
    { id: 3, paiId: 1, profundidade: 1 },
  ];
  expect(ordemDeInsercao(nos).map((n) => n.id)).toEqual([2, 3]);
});
