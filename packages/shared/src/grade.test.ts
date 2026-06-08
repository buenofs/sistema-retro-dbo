import { test, expect } from 'bun:test';
import {
  esquemaPaginaGrade,
  esquemaInsercao,
  esquemaAtualizacao,
  esquemaRemocao,
} from './grade';

test('paginaGrade aplica defaults e coage números', () => {
  const r = esquemaPaginaGrade.safeParse({ esquema: 'dbo', tabela: 'Clientes' });
  expect(r.success).toBe(true);
  if (r.success) {
    expect(r.data.pagina).toBe(0);
    expect(r.data.tamanho).toBe(100);
  }
  const r2 = esquemaPaginaGrade.safeParse({ esquema: 'dbo', tabela: 'C', pagina: '2', tamanho: '50' });
  expect(r2.success).toBe(true);
  if (r2.success) expect(r2.data.pagina).toBe(2);
});

test('insercao aceita valores e rejeita sem tabela', () => {
  expect(esquemaInsercao.safeParse({ esquema: 'dbo', tabela: 'C', valores: { nome: 'Ana', idade: 5, ativo: true, obs: null } }).success).toBe(true);
  expect(esquemaInsercao.safeParse({ esquema: 'dbo', valores: {} }).success).toBe(false);
});

test('atualizacao e remocao exigem chave', () => {
  expect(esquemaAtualizacao.safeParse({ esquema: 'dbo', tabela: 'C', chave: { id: 1 }, valores: { nome: 'X' } }).success).toBe(true);
  expect(esquemaRemocao.safeParse({ esquema: 'dbo', tabela: 'C', chave: { id: 1 } }).success).toBe(true);
  expect(esquemaRemocao.safeParse({ esquema: 'dbo', tabela: 'C' }).success).toBe(false);
});
