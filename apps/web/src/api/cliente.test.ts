import { test, expect, vi, afterEach } from 'vitest';
import { requisitar } from './cliente';
import { useLojaLogSQL } from '../aplicativos/monitor/lojaLog';

afterEach(() => vi.unstubAllGlobals());

test('devolve os dados quando a resposta é ok', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true, dados: { login: 'sa' } }), {
          headers: { 'content-type': 'application/json' },
        }),
    ),
  );
  const r = await requisitar('/api/autenticacao/sessao');
  expect(r).toEqual({ ok: true, dados: { login: 'sa' } });
});

test('mapeia falha de rede para erro tipo rede', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('offline');
    }),
  );
  const r = await requisitar('/api/x');
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.erro.tipo).toBe('rede');
});

test('requisitar empurra dados.sql para o Monitor', async () => {
  useLojaLogSQL.getState().limpar();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            dados: {
              dados: { id: 1 },
              sql: [
                {
                  acao: 'Criar pasta',
                  tipo: 'INSERT',
                  texto: 'INSERT ...',
                  parametros: {},
                  linhasAfetadas: 1,
                  em: 'x',
                },
              ],
            },
          }),
          { status: 200 },
        ),
    ),
  );
  await requisitar('/api/arquivos/pasta', { method: 'POST', body: '{}' });
  expect(useLojaLogSQL.getState().comandos).toHaveLength(1);
  expect(useLojaLogSQL.getState().comandos[0]!.acao).toBe('Criar pasta');
});
