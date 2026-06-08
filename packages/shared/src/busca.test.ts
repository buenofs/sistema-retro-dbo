import { test, expect } from 'bun:test';
import { esquemaBusca } from './busca';

test('aceita filtros parciais', () => {
  expect(esquemaBusca.safeParse({ nome: 'Fel' }).success).toBe(true);
  expect(esquemaBusca.safeParse({}).success).toBe(true);
});

test('coage ids/salário e valida operador', () => {
  const r = esquemaBusca.safeParse({ departamentoId: '1', salarioOp: 'gt', salario: '10000' });
  expect(r.success).toBe(true);
  if (r.success) {
    expect(r.data.departamentoId).toBe(1);
    expect(r.data.salario).toBe(10000);
  }
  expect(esquemaBusca.safeParse({ salarioOp: 'maior' }).success).toBe(false);
});
