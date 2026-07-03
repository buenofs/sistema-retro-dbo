import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExploradorObjetos } from './ExploradorObjetos';

afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ExploradorObjetos />
    </QueryClientProvider>,
  );
}

test('agrupa objetos em Tabelas e Views com contagem', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            dados: [
              { esquema: 'dbo', nome: 'Clientes', tipo: 'tabela' },
              { esquema: 'dbo', nome: 'Pedidos', tipo: 'tabela' },
              { esquema: 'dbo', nome: 'vw_Resumo', tipo: 'view' },
            ],
          }),
        ),
    ),
  );
  renderizar();
  expect(await screen.findByText(/Clientes/)).toBeInTheDocument();
  expect(screen.getByText(/vw_Resumo/)).toBeInTheDocument();
  expect(screen.getByText(/Tabelas \(2\)/)).toBeInTheDocument();
  expect(screen.getByText(/Views \(1\)/)).toBeInTheDocument();
});

test('mostra erro quando a listagem falha', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ok: false, erro: { tipo: 'rede', mensagem: 'Sem conexão.' } }),
          { status: 503 },
        ),
    ),
  );
  renderizar();
  expect(await screen.findByText('Sem conexão.')).toBeInTheDocument();
});
