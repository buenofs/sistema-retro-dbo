import { test, expect } from 'bun:test';
import { esquemaConsulta } from './consulta';

test('aceita um SQL não vazio', () => {
  const r = esquemaConsulta.safeParse({ sql: 'SELECT 1' });
  expect(r.success).toBe(true);
});

test('rejeita SQL vazio', () => {
  const r = esquemaConsulta.safeParse({ sql: '' });
  expect(r.success).toBe(false);
});

test('rejeita corpo sem sql', () => {
  const r = esquemaConsulta.safeParse({});
  expect(r.success).toBe(false);
});
