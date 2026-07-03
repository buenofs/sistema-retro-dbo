import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropriedadesObjeto } from './PropriedadesObjeto';
import type { EstadoJanela } from '../../areaTrabalho/tipos';

afterEach(() => vi.unstubAllGlobals());

function janelaFake(dados: unknown): EstadoJanela {
  return { dados } as unknown as EstadoJanela;
}

function renderizar(janela: EstadoJanela) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <PropriedadesObjeto janela={janela} />
    </QueryClientProvider>,
  );
}

test('sem objeto em dados, mostra instrução', () => {
  renderizar(janelaFake(null));
  expect(screen.getByText(/botão direito/i)).toBeInTheDocument();
});

test('com objeto, mostra geral e índices', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            dados: {
              esquema: 'dbo',
              nome: 'Clientes',
              tipo: 'tabela',
              totalColunas: 2,
              totalLinhas: 5,
              criadoEm: null,
              modificadoEm: null,
              indices: [
                {
                  nome: 'PK_Clientes',
                  tipo: 'CLUSTERED',
                  unico: true,
                  chavePrimaria: true,
                  colunas: ['id'],
                },
              ],
            },
          }),
        ),
    ),
  );
  renderizar(janelaFake({ esquema: 'dbo', tabela: 'Clientes' }));
  expect(await screen.findByText(/PK_Clientes/)).toBeInTheDocument();
  expect(screen.getByText(/Tabela/)).toBeInTheDocument();
});
