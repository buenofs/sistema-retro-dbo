import { test, expect } from 'vitest';
import { converterValor } from './conversao';
import type { ColunaBanco } from '@dbos/shared';

function col(p: Partial<ColunaBanco>): ColunaBanco {
  return { nome: 'c', tipoDado: 'nvarchar(50)', anulavel: true, ehChavePrimaria: false, ...p };
}

test('numérico vira número', () => {
  expect(converterValor(col({ tipoDado: 'int' }), '42')).toBe(42);
});

test('numérico inválido fica como texto', () => {
  expect(converterValor(col({ tipoDado: 'int' }), 'abc')).toBe('abc');
});

test('vazio em coluna anulável vira null', () => {
  expect(converterValor(col({ tipoDado: 'int', anulavel: true }), '')).toBeNull();
});

test('vazio em coluna não anulável fica string vazia', () => {
  expect(converterValor(col({ tipoDado: 'nvarchar(50)', anulavel: false }), '')).toBe('');
});

test('bit vira boolean', () => {
  expect(converterValor(col({ tipoDado: 'bit' }), '1')).toBe(true);
  expect(converterValor(col({ tipoDado: 'bit' }), '0')).toBe(false);
});

test('texto comum fica string', () => {
  expect(converterValor(col({ tipoDado: 'nvarchar(50)' }), 'Ana')).toBe('Ana');
});
