import { test, expect } from 'bun:test';
import { criarBanco, tipoDoTexto, somar } from './banco';

function poolFalso(resultado: { recordset?: unknown[]; rowsAffected?: number[]; erro?: Error }) {
  const inputs: Record<string, unknown> = {};
  return {
    inputs,
    request() {
      return {
        input(nome: string, valor: unknown) { inputs[nome] = valor; return this; },
        async query() {
          if (resultado.erro) throw resultado.erro;
          return { recordset: resultado.recordset ?? [], rowsAffected: resultado.rowsAffected ?? [] };
        },
      };
    },
  } as never;
}

test('tipoDoTexto classifica pela primeira palavra-chave (ignora WITH)', () => {
  expect(tipoDoTexto('  INSERT INTO x ...')).toBe('INSERT');
  expect(tipoDoTexto('UPDATE dbo.Itens SET ...')).toBe('UPDATE');
  expect(tipoDoTexto('DELETE FROM dbo.Itens ...')).toBe('DELETE');
  expect(tipoDoTexto('WITH sub AS (...) SELECT ...')).toBe('SELECT');
  expect(tipoDoTexto('WITH sub AS (...) UPDATE dbo.Itens ...')).toBe('UPDATE');
  expect(tipoDoTexto('SELECT * FROM x')).toBe('SELECT');
});

test('somar totaliza um array (e tolera vazio/undefined)', () => {
  expect(somar([1, 2, 3])).toBe(6);
  expect(somar([])).toBe(0);
  expect(somar()).toBe(0);
});

test('consultar devolve as linhas tipadas e passa os parâmetros', async () => {
  const pool = poolFalso({ recordset: [{ id: 1 }, { id: 2 }] });
  const banco = criarBanco(pool, 'Teste');
  const linhas = await banco.consultar<{ id: number }>('SELECT id FROM x WHERE a=@a', { a: 9 });
  expect(linhas).toEqual([{ id: 1 }, { id: 2 }]);
  expect((pool as unknown as { inputs: Record<string, unknown> }).inputs.a).toBe(9);
});

test('executar devolve a soma das linhas afetadas', async () => {
  const banco = criarBanco(poolFalso({ rowsAffected: [2, 3] }), 'Teste');
  expect(await banco.executar('DELETE FROM x')).toBe(5);
});

test('com acao registra o comando no Monitor', async () => {
  const banco = criarBanco(poolFalso({ rowsAffected: [1] }), 'Apagar');
  await banco.executar('DELETE FROM x WHERE id=@id', { id: 7 });
  expect(banco.comandos).toHaveLength(1);
  expect(banco.comandos[0]!.acao).toBe('Apagar');
  expect(banco.comandos[0]!.tipo).toBe('DELETE');
  expect(banco.comandos[0]!.linhasAfetadas).toBe(1);
});

test('sem acao não registra nada (catálogo silencioso)', async () => {
  const banco = criarBanco(poolFalso({ recordset: [] }));
  await banco.consultar('SELECT 1');
  expect(banco.comandos).toHaveLength(0);
});

test('erro é registrado (se houver acao) e propagado', async () => {
  const banco = criarBanco(poolFalso({ erro: new Error('boom') }), 'Falha');
  await expect(banco.executar('UPDATE x SET y=1')).rejects.toThrow('boom');
  expect(banco.comandos[0]!.erro).toBe('boom');
});
