import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TabelaGrade } from './TabelaGrade';

afterEach(() => vi.unstubAllGlobals());

const RESULTADO = {
  ok: true,
  dados: {
    colunas: [
      { nome: 'id', tipoDado: 'int', anulavel: false, ehChavePrimaria: true },
      { nome: 'nome', tipoDado: 'nvarchar(50)', anulavel: false, ehChavePrimaria: false },
    ],
    chavePrimaria: ['id'],
    linhas: [
      { id: 1, nome: 'Ana' },
      { id: 2, nome: 'Bia' },
    ],
    total: 2,
    pagina: 0,
    tamanho: 100,
  },
};

function stubFetch(onMutacao?: (metodo: string) => void) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      const metodo = init?.method ?? 'GET';
      if (metodo === 'GET') return new Response(JSON.stringify(RESULTADO));
      onMutacao?.(metodo);
      return new Response(JSON.stringify({ ok: true, dados: { linhasAfetadas: 1 } }));
    }),
  );
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <TabelaGrade esquema="dbo" tabela="Clientes" />
    </QueryClientProvider>,
  );
}

test('mostra cabeçalhos, linhas e paginação', async () => {
  stubFetch();
  renderizar();
  expect(await screen.findByText('Ana')).toBeInTheDocument();
  expect(screen.getByText('Bia')).toBeInTheDocument();
  expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument();
});

test('editar uma linha dispara um PUT', async () => {
  const metodos: string[] = [];
  stubFetch((m) => metodos.push(m));
  renderizar();
  await screen.findByText('Ana');
  fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]!);
  const input = screen.getByLabelText('editar nome');
  fireEvent.change(input, { target: { value: 'Ana Maria' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(metodos).toContain('PUT'));
});

test('excluir pede confirmação e dispara um DELETE', async () => {
  const metodos: string[] = [];
  stubFetch((m) => metodos.push(m));
  renderizar();
  await screen.findByText('Ana');
  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]!);
  fireEvent.click(screen.getByRole('button', { name: 'Sim' }));
  await waitFor(() => expect(metodos).toContain('DELETE'));
});
