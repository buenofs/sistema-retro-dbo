import { test, expect, vi } from 'vitest';
import { executarComando, type ContextoTerminal } from './comandos';

function ctxFake(over: Partial<ContextoTerminal> = {}): ContextoTerminal {
  return {
    consultar: vi.fn(async () => ({
      colunas: ['id'],
      linhas: [[1]],
      linhasAfetadas: 0,
      truncado: false,
      totalLinhas: 1,
    })),
    buscar: vi.fn(async () => [
      { id: 1, nome: 'Felipe Bueno', cargo: 'Dev', salario: 12000, dataAdmissao: null, departamentoId: 1, departamento: 'Engenharia' },
    ]),
    abrirApp: vi.fn(),
    limpar: vi.fn(),
    ...over,
  };
}

test('ajuda lista os comandos', async () => {
  const linhas = await executarComando('ajuda', ctxFake());
  expect(linhas[0]).toContain('Comandos');
});

test('limpar chama ctx.limpar', async () => {
  const ctx = ctxFake();
  await executarComando('limpar', ctx);
  expect(ctx.limpar).toHaveBeenCalled();
});

test('listar funcionarios consulta a tabela whitelisted', async () => {
  const ctx = ctxFake();
  await executarComando('listar funcionarios', ctx);
  expect(ctx.consultar).toHaveBeenCalledWith('SELECT * FROM dbo.Funcionarios');
});

test('listar desconhecido avisa', async () => {
  const linhas = await executarComando('listar xpto', ctxFake());
  expect(linhas[0]).toContain('desconhecida');
});

test('mostrar anomalias_folha consulta a view', async () => {
  const ctx = ctxFake();
  await executarComando('mostrar anomalias_folha', ctx);
  expect(ctx.consultar).toHaveBeenCalledWith('SELECT * FROM dbo.vw_AnomaliasFolha');
});

test('buscar salario > 10000 vira filtro gt', async () => {
  const ctx = ctxFake();
  await executarComando('buscar salario > 10000', ctx);
  expect(ctx.buscar).toHaveBeenCalledWith({ salarioOp: 'gt', salario: 10000 });
});

test('abrir Felipe.func abre os relacionamentos', async () => {
  const ctx = ctxFake();
  const linhas = await executarComando('abrir Felipe.func', ctx);
  expect(ctx.buscar).toHaveBeenCalledWith({ nome: 'Felipe' });
  expect(ctx.abrirApp).toHaveBeenCalledWith('relacionamentos', { tipo: 'funcionario', id: 1 });
  expect(linhas[0]).toContain('Felipe Bueno');
});

test('sql abre o Editor de Consultas', async () => {
  const ctx = ctxFake();
  await executarComando('sql', ctx);
  expect(ctx.abrirApp).toHaveBeenCalledWith('consulta');
});

test('comando inválido avisa', async () => {
  const linhas = await executarComando('xyz', ctxFake());
  expect(linhas[0].toLowerCase()).toContain('inv');
});
