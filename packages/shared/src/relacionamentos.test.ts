import { test, expect } from 'bun:test';
import { esquemaRefRelacionamento } from './relacionamentos';

test('aceita tipo válido + id coagido', () => {
  const r = esquemaRefRelacionamento.safeParse({ tipo: 'funcionario', id: '1' });
  expect(r.success).toBe(true);
  if (r.success) expect(r.data.id).toBe(1);
});

test('rejeita tipo inválido', () => {
  expect(esquemaRefRelacionamento.safeParse({ tipo: 'pessoa', id: 1 }).success).toBe(false);
});
