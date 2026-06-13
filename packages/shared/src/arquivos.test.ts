import { test, expect } from 'bun:test';
import {
  esquemaCriarPasta,
  esquemaCriarArquivo,
  esquemaRenomear,
  esquemaMover,
  esquemaConteudo,
  esquemaCopiar,
} from './arquivos';

test('criarPasta exige nome e paiId nulo ou número', () => {
  expect(esquemaCriarPasta.safeParse({ nome: 'Docs', paiId: null, driveId: 1 }).success).toBe(true);
  expect(esquemaCriarPasta.safeParse({ nome: 'Docs', paiId: 3, driveId: 1 }).success).toBe(true);
  expect(esquemaCriarPasta.safeParse({ nome: '', paiId: null, driveId: 1 }).success).toBe(false);
});

test('criarArquivo aceita conteudo opcional default vazio', () => {
  const r = esquemaCriarArquivo.safeParse({ nome: 'a.txt', paiId: 4, driveId: 1 });
  expect(r.success).toBe(true);
  if (r.success) expect(r.data.conteudo).toBe('');
});

test('renomear exige novo nome', () => {
  expect(esquemaRenomear.safeParse({ nome: 'novo.txt' }).success).toBe(true);
  expect(esquemaRenomear.safeParse({ nome: '' }).success).toBe(false);
});

test('mover aceita destino nulo (raiz) ou número', () => {
  expect(esquemaMover.safeParse({ paiId: null }).success).toBe(true);
  expect(esquemaMover.safeParse({ paiId: 9 }).success).toBe(true);
});

test('conteudo aceita string', () => {
  expect(esquemaConteudo.safeParse({ conteudo: 'oi' }).success).toBe(true);
});

test('copiar exige destino', () => {
  expect(esquemaCopiar.safeParse({ paiId: null }).success).toBe(true);
  expect(esquemaCopiar.safeParse({}).success).toBe(false);
});
