import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { useLoja, estadoInicial } from './areaTrabalho/loja';

beforeEach(() => useLoja.setState(estadoInicial()));
afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <App />
    </QueryClientProvider>,
  );
}

test('mostra a tela de login quando não há sessão', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: false, erro: { tipo: 'autenticacao', mensagem: 'sem sessão' } }),
        { status: 401 },
      ),
    ),
  );
  renderizar();
  expect(await screen.findByLabelText('Login')).toBeInTheDocument();
});

test('mostra a área de trabalho quando há sessão', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, dados: { login: 'sa' } })),
    ),
  );
  renderizar();
  expect(await screen.findByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
});
