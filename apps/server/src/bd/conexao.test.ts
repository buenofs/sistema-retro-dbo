import { test, expect } from 'bun:test';
import { configDoAmbiente, testarConexao } from './conexao';

test('conecta no SQL Server e executa SELECT cru', async () => {
  const resultado = await testarConexao(configDoAmbiente());
  expect(resultado).toBe(1);
});
