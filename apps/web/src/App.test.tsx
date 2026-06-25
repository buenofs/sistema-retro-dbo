import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ProvedorTema } from './tema/ProvedorTema';
import { useLoja, estadoInicial } from './areaTrabalho/loja';
import { useBoot } from './boot';

vi.mock('./TelaBoot', async () => {
  const { useEffect } = await import('react');
  return {
    TelaBoot: ({ onConcluir }: { onConcluir: () => void }) => {
      useEffect(() => onConcluir(), [onConcluir]);
      return null;
    },
  };
});

beforeEach(() => {
  useLoja.setState(estadoInicial());
  useBoot.setState({ concluido: false });
});
afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ProvedorTema>
      <QueryClientProvider client={cliente}>
        <App />
      </QueryClientProvider>
    </ProvedorTema>,
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
      new Response(JSON.stringify({ ok: true, dados: { login: 'sa', banco: 'DBOS' } })),
    ),
  );
  renderizar();
  expect(await screen.findByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
});
