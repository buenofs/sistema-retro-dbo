import { test, expect } from 'bun:test';
import { esquemaRefObjeto } from './explorador';

test('aceita esquema e tabela válidos', () => {
  const r = esquemaRefObjeto.safeParse({ esquema: 'dbo', tabela: 'Clientes' });
  expect(r.success).toBe(true);
});

test('rejeita tabela vazia', () => {
  const r = esquemaRefObjeto.safeParse({ esquema: 'dbo', tabela: '' });
  expect(r.success).toBe(false);
});

test('rejeita objeto sem esquema', () => {
  const r = esquemaRefObjeto.safeParse({ tabela: 'Clientes' });
  expect(r.success).toBe(false);
});
