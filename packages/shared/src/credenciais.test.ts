import { test, expect } from 'bun:test';
import { esquemaCredenciais } from './credenciais';

test('aceita credenciais válidas', () => {
  const r = esquemaCredenciais.safeParse({ login: 'sa', senha: 'segredo' });
  expect(r.success).toBe(true);
});

test('rejeita login vazio', () => {
  const r = esquemaCredenciais.safeParse({ login: '', senha: 'segredo' });
  expect(r.success).toBe(false);
});

test('rejeita objeto sem senha', () => {
  const r = esquemaCredenciais.safeParse({ login: 'sa' });
  expect(r.success).toBe(false);
});
