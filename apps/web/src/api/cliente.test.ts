import { test, expect, vi, afterEach } from 'vitest';
import { requisitar, pegar, mandar, ErroApiError } from './cliente';
import { useLojaLogSQL } from '../aplicativos/monitor/lojaLog';

afterEach(() => vi.unstubAllGlobals());

test('devolve os dados quando a resposta é ok', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, dados: { login: 'sa' } }), {
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
  const r = await requisitar('/api/autenticacao/sessao');
  expect(r).toEqual({ ok: true, dados: { login: 'sa' } });
});

test('mapeia falha de rede para erro tipo rede', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('offline');
  }));
  const r = await requisitar('/api/x');
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.erro.tipo).toBe('rede');
});

test('requisitar empurra dados.sql para o Monitor', async () => {
  useLojaLogSQL.getState().limpar();
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify({ ok: true, dados: { dados: { id: 1 }, sql: [{ acao: 'Criar pasta', tipo: 'INSERT', texto: 'INSERT ...', parametros: {}, linhasAfetadas: 1, em: 'x' }] } }), { status: 200 }),
  ));
  await requisitar('/api/arquivos/pasta', { method: 'POST', body: '{}' });
  expect(useLojaLogSQL.getState().comandos).toHaveLength(1);
  expect(useLojaLogSQL.getState().comandos[0]!.acao).toBe('Criar pasta');
});

test('pegar desembrulha os dados quando ok', async () => {
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify({ ok: true, dados: { valor: 42 } }), { status: 200 }),
  ));
  await expect(pegar<{ valor: number }>('/x')).resolves.toEqual({ valor: 42 });
});

test('mandar lança ErroApiError quando ok=false', async () => {
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify({ ok: false, erro: { tipo: 'validacao', mensagem: 'não' } }), { status: 400 }),
  ));
  await expect(mandar('/x', 'POST', { a: 1 })).rejects.toBeInstanceOf(ErroApiError);
});

function espiarFetch() {
  const espia = vi.fn((_caminho: string, _opcoes?: RequestInit) =>
    Promise.resolve(new Response(JSON.stringify({ ok: true, dados: { id: 1 } }), { status: 200 })),
  );
  vi.stubGlobal('fetch', espia);
  return espia;
}

test('requisição sem corpo não envia content-type (DELETE/PUT/GET)', async () => {
  const espia = espiarFetch();
  await mandar('/api/arquivos/9', 'DELETE');
  const cabecalhos = espia.mock.calls[0]![1]!.headers as Record<string, string>;
  expect(cabecalhos['content-type']).toBeUndefined();
});

test('requisição com corpo envia content-type application/json', async () => {
  const espia = espiarFetch();
  await mandar('/api/arquivos/pasta', 'POST', { nome: 'X' });
  const cabecalhos = espia.mock.calls[0]![1]!.headers as Record<string, string>;
  expect(cabecalhos['content-type']).toBe('application/json');
});
