import { test, expect } from 'bun:test';
import { citarId, nomeQualificado, mapearColunas, listaIn } from './clausulas';

test('citarId envolve em colchetes e escapa o de fechamento', () => {
  expect(citarId('Clientes')).toBe('[Clientes]');
  expect(citarId('a]b')).toBe('[a]]b]');
});

test('nomeQualificado junta esquema e tabela citados', () => {
  expect(nomeQualificado({ esquema: 'dbo', tabela: 'Itens' })).toBe('[dbo].[Itens]');
});

test('mapearColunas gera nomes, lugares, igualdades e parâmetros', () => {
  const mapa = mapearColunas({ nome: 'Ana', idade: 30 }, 'p');
  expect(mapa.nomes).toEqual(['[nome]', '[idade]']);
  expect(mapa.lugares).toEqual(['@p0', '@p1']);
  expect(mapa.igualdades).toEqual(['[nome] = @p0', '[idade] = @p1']);
  expect(mapa.parametros).toEqual({ p0: 'Ana', p1: 30 });
});

test('mapearColunas com objeto vazio devolve tudo vazio', () => {
  const mapa = mapearColunas({}, 'p');
  expect(mapa.nomes).toEqual([]);
  expect(mapa.lugares).toEqual([]);
  expect(mapa.igualdades).toEqual([]);
  expect(mapa.parametros).toEqual({});
});

test('listaIn monta os lugares e parâmetros de uma cláusula IN', () => {
  const lista = listaIn([10, 20]);
  expect(lista.lugares).toBe('@i0, @i1');
  expect(lista.parametros).toEqual({ i0: 10, i1: 20 });
});
