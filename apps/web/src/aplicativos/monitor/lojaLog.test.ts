import { test, expect, beforeEach } from 'vitest';
import { useLojaLogSQL } from './lojaLog';
import type { ComandoSQL } from '@dbos/shared';

const cmd = (acao: string): ComandoSQL => ({
  acao,
  tipo: 'INSERT',
  texto: 'INSERT ...',
  parametros: {},
  linhasAfetadas: 1,
  em: '2026-06-13T00:00:00Z',
});

beforeEach(() => useLojaLogSQL.getState().limpar());

test('registrar acumula comandos', () => {
  useLojaLogSQL.getState().registrar([cmd('a'), cmd('b')]);
  expect(useLojaLogSQL.getState().comandos.map((c) => c.acao)).toEqual(['a', 'b']);
});

test('pausado ignora novos comandos', () => {
  useLojaLogSQL.getState().alternarPausa();
  useLojaLogSQL.getState().registrar([cmd('x')]);
  expect(useLojaLogSQL.getState().comandos).toHaveLength(0);
  useLojaLogSQL.getState().alternarPausa();
});

test('limpar zera', () => {
  useLojaLogSQL.getState().registrar([cmd('a')]);
  useLojaLogSQL.getState().limpar();
  expect(useLojaLogSQL.getState().comandos).toHaveLength(0);
});
