import { test, expect } from 'vitest';
import { converterValor, ehTipoNumerico, ehTipoMoeda, formatarMoeda } from './conversao';
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

test('ehTipoNumerico reconhece tipos numéricos do SQL Server', () => {
  expect(ehTipoNumerico('int')).toBe(true);
  expect(ehTipoNumerico('decimal(10,2)')).toBe(true);
  expect(ehTipoNumerico('money')).toBe(true);
  expect(ehTipoNumerico('varchar(50)')).toBe(false);
  expect(ehTipoNumerico('bit')).toBe(false);
});

test('ehTipoMoeda só reconhece money/smallmoney', () => {
  expect(ehTipoMoeda('money')).toBe(true);
  expect(ehTipoMoeda('smallmoney')).toBe(true);
  expect(ehTipoMoeda('int')).toBe(false);
  expect(ehTipoMoeda('decimal(10,2)')).toBe(false);
});

test('formatarMoeda formata em R$ pt-BR e tolera não-número', () => {
  expect(formatarMoeda(1234.5)).toMatch(/R\$\s?1\.234,50/);
  expect(formatarMoeda('abc')).toBe('abc');
  expect(formatarMoeda(null)).toBe('');
});
