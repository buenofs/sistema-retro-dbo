import { test, expect } from 'bun:test';
import { subarvore, criaCiclo, type NoArvore } from './arvore';

const itens: NoArvore[] = [
  { id: 1, paiId: null },
  { id: 2, paiId: 1 },
  { id: 3, paiId: 2 },
  { id: 4, paiId: 1 },
  { id: 5, paiId: null },
];

test('subarvore inclui a raiz e todos os descendentes', () => {
  expect(subarvore(itens, 1).map((n) => n.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
});

test('subarvore retorna pais antes dos filhos (ordem de largura)', () => {
  const ids = subarvore(itens, 1).map((n) => n.id);
  expect(ids.indexOf(1)).toBeLessThan(ids.indexOf(2));
  expect(ids.indexOf(2)).toBeLessThan(ids.indexOf(3));
});

test('subarvore de folha é só ela mesma', () => {
  expect(subarvore(itens, 3).map((n) => n.id)).toEqual([3]);
});

test('subarvore de id inexistente é vazia', () => {
  expect(subarvore(itens, 99)).toEqual([]);
});

test('criaCiclo: destino null nunca cria ciclo', () => {
  expect(criaCiclo(itens, 1, null)).toBe(false);
});

test('criaCiclo: mover para dentro de si mesmo', () => {
  expect(criaCiclo(itens, 1, 1)).toBe(true);
});

test('criaCiclo: mover para dentro de um descendente', () => {
  expect(criaCiclo(itens, 1, 3)).toBe(true);
});

test('criaCiclo: mover para um ramo não relacionado é permitido', () => {
  expect(criaCiclo(itens, 2, 5)).toBe(false);
});
