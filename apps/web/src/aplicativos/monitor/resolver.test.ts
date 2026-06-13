import { test, expect } from 'vitest';
import { resolverSQL } from './resolver';

test('substitui parâmetros por literais', () => {
  const sql = 'INSERT INTO dbo.Itens (nome, paiId) VALUES (@nome, @pai)';
  expect(resolverSQL(sql, { nome: 'Docs', pai: 3 })).toBe(
    "INSERT INTO dbo.Itens (nome, paiId) VALUES ('Docs', 3)",
  );
});

test('NULL e escapa aspas', () => {
  expect(resolverSQL('SET x = @a, y = @b', { a: null, b: "O'Brien" })).toBe("SET x = NULL, y = 'O''Brien'");
});

test('mantém @param desconhecido', () => {
  expect(resolverSQL('WHERE id = @id', {})).toBe('WHERE id = @id');
});
