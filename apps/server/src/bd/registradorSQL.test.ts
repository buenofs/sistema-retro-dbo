import { test, expect } from 'bun:test';
import { tipoDoTexto } from './registradorSQL';

test('classifica o comando pela primeira palavra-chave', () => {
  expect(tipoDoTexto('  INSERT INTO x ...')).toBe('INSERT');
  expect(tipoDoTexto('UPDATE dbo.Itens SET ...')).toBe('UPDATE');
  expect(tipoDoTexto('DELETE FROM dbo.Itens ...')).toBe('DELETE');
  expect(tipoDoTexto('WITH sub AS (...) SELECT ...')).toBe('SELECT');
  expect(tipoDoTexto('WITH sub AS (...) UPDATE dbo.Itens ...')).toBe('UPDATE');
  expect(tipoDoTexto('SELECT * FROM x')).toBe('SELECT');
});
