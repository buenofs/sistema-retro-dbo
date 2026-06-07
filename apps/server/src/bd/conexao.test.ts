import { test, expect } from 'bun:test';
import { configDoAmbiente, testarConexao } from './conexao';

// Teste de integração: requer um SQL Server nativo em execução em localhost:1433,
// com Mixed Mode auth e TCP/IP habilitados (ver pré-requisito da Task 3).
// É o portão go/no-go do runtime Bun para o driver mssql/Tedious.
test('conecta no SQL Server e executa SELECT cru', async () => {
  const resultado = await testarConexao(configDoAmbiente());
  expect(resultado).toBe(1);
});
