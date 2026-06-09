import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RelatorioFolha } from './RelatorioFolha';

afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <RelatorioFolha />
    </QueryClientProvider>,
  );
}

test('mostra barras por departamento, total e anomalias', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dados: {
            departamentos: [
              { departamento: 'Engenharia', funcionarios: 3, totalLiquido: 30000 },
              { departamento: 'RH', funcionarios: 2, totalLiquido: 12000 },
            ],
            totalGeral: 42000,
            anomalias: [
              {
                id: 1,
                funcionario: 'Maria',
                competencia: '2026-05',
                salarioBase: 5000,
                bonus: 0,
                descontos: 0,
                salarioLiquido: 4000,
                liquidoEsperado: 5000,
              },
            ],
          },
        }),
      ),
    ),
  );
  renderizar();
  expect(await screen.findByText('Engenharia')).toBeInTheDocument();
  expect(screen.getByText('RH')).toBeInTheDocument();
  expect(screen.getByText(/Anomalias \(1\)/)).toBeInTheDocument();
  expect(screen.getByText('Maria')).toBeInTheDocument();
});

test('mostra mensagem de erro quando a rota falha', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, erro: { tipo: 'interno', mensagem: 'falhou' } }), {
        status: 500,
      }),
    ),
  );
  renderizar();
  expect(await screen.findByText('falhou')).toBeInTheDocument();
});
