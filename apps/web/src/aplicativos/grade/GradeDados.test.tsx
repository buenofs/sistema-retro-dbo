import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GradeDados } from './GradeDados';
import type { EstadoJanela } from '../../areaTrabalho/tipos';

afterEach(() => vi.unstubAllGlobals());

function janelaFake(dados: unknown): EstadoJanela {
  return { dados } as unknown as EstadoJanela;
}

function renderizar(janela: EstadoJanela) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <GradeDados janela={janela} />
    </QueryClientProvider>,
  );
}

test('sem tabela pré-selecionada, mostra o seletor com as tabelas', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dados: [
            { esquema: 'dbo', nome: 'Clientes', tipo: 'tabela' },
            { esquema: 'dbo', nome: 'vw_FolhaResumo', tipo: 'view' },
          ],
        }),
      ),
    ),
  );
  renderizar(janelaFake(null));
  expect(await screen.findByText(/dbo\.Clientes/)).toBeInTheDocument();
  expect(await screen.findByText(/vw_FolhaResumo/)).toBeInTheDocument();
});

test('com tabela em dados, abre a grade direto', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dados: {
            colunas: [{ nome: 'id', tipoDado: 'int', anulavel: false, ehChavePrimaria: true }],
            chavePrimaria: ['id'],
            linhas: [{ id: 1 }],
            total: 1,
            pagina: 0,
            tamanho: 100,
          },
        }),
      ),
    ),
  );
  renderizar(janelaFake({ esquema: 'dbo', tabela: 'Clientes' }));
  expect(await screen.findByText(/dbo\.Clientes/)).toBeInTheDocument();
  expect(await screen.findByText(/Página 1 de 1/)).toBeInTheDocument();
});
