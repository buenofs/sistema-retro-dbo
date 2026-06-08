import { test, expect } from 'bun:test';
import sql from 'mssql';
import { mapearErroSql } from './tratadorErros';

test('mapeia RequestError para tipo sql com código e severidade', () => {
  const erro = new sql.RequestError('Invalid object name', 'EREQUEST');
  (erro as { number?: number }).number = 208;
  (erro as { class?: number }).class = 16;
  const api = mapearErroSql(erro);
  expect(api.tipo).toBe('sql');
  expect(api.codigoSql).toBe(208);
  expect(api.severidade).toBe(16);
  expect(api.detalhe).toContain('Invalid object name');
});

test('mapeia ConnectionError para tipo rede', () => {
  const erro = new sql.ConnectionError('socket hang up', 'ESOCKET');
  expect(mapearErroSql(erro).tipo).toBe('rede');
});

test('mapeia erro desconhecido para tipo interno', () => {
  const api = mapearErroSql(new Error('boom'));
  expect(api.tipo).toBe('interno');
  expect(api.detalhe).toBe('boom');
});
