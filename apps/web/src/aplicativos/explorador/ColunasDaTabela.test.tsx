import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ColunasDaTabela } from './ColunasDaTabela';

afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ul className="tree-view">
        <ColunasDaTabela esquema="dbo" tabela="Clientes" />
      </ul>
    </QueryClientProvider>,
  );
}

test('mostra as colunas com tipo, marca de PK e nulabilidade', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dados: [
            { nome: 'id', tipoDado: 'int', anulavel: false, ehChavePrimaria: true },
            { nome: 'nome', tipoDado: 'nvarchar(50)', anulavel: true, ehChavePrimaria: false },
          ],
        }),
      ),
    ),
  );
  renderizar();
  expect(await screen.findByText(/🔑 id : int/)).toBeInTheDocument();
  expect(screen.getByText(/nome : nvarchar\(50\) \(nulo\)/)).toBeInTheDocument();
});

test('mostra a mensagem de erro quando a consulta falha', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: false, erro: { tipo: 'sql', mensagem: 'Objeto inválido.' } }),
        { status: 400 },
      ),
    ),
  );
  renderizar();
  expect(await screen.findByText('Objeto inválido.')).toBeInTheDocument();
});
