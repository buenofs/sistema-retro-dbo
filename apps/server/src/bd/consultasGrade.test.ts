import { test, expect } from 'bun:test';
import { citarId } from './consultasGrade';

test('cita identificador com colchetes', () => {
  expect(citarId('Clientes')).toBe('[Clientes]');
});

test('escapa o colchete de fechamento (defesa contra injeção)', () => {
  expect(citarId('a]b')).toBe('[a]]b]');
});
