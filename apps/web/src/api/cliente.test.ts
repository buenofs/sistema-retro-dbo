import { test, expect, vi, afterEach } from 'vitest';
import { requisitar } from './cliente';

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
