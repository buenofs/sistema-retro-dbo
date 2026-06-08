import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Relacionamentos } from './Relacionamentos';
import type { EstadoJanela } from '../../areaTrabalho/tipos';

afterEach(() => vi.unstubAllGlobals());

const GRAFO_FUNC = {
  centro: 'funcionario:1',
  nos: [
    { id: 'funcionario:1', tipo: 'funcionario', rotulo: 'Felipe Bueno' },
    { id: 'departamento:1', tipo: 'departamento', rotulo: 'Engenharia' },
    { id: 'projeto:1', tipo: 'projeto', rotulo: 'DBOS' },
  ],
  arestas: [
    { de: 'funcionario:1', para: 'departamento:1' },
    { de: 'funcionario:1', para: 'projeto:1' },
  ],
};
const GRAFO_DEP = {
  centro: 'departamento:1',
  nos: [
    { id: 'departamento:1', tipo: 'departamento', rotulo: 'Engenharia' },
    { id: 'funcionario:2', tipo: 'funcionario', rotulo: 'Ana Souza' },
  ],
  arestas: [{ de: 'departamento:1', para: 'funcionario:2' }],
};

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('/api/busca/funcionarios')) {
        return new Response(
          JSON.stringify({ ok: true, dados: [{ id: 1, nome: 'Felipe Bueno', cargo: null, salario: 0, dataAdmissao: null, departamentoId: 1 }] }),
        );
      }
      // /api/relacionamentos
      const dados = u.includes('tipo=departamento') ? GRAFO_DEP : GRAFO_FUNC;
      return new Response(JSON.stringify({ ok: true, dados }));
    }),
  );
}

function janelaFake(dados: unknown): EstadoJanela {
  return { dados } as unknown as EstadoJanela;
}

function renderizar(janela: EstadoJanela) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <Relacionamentos janela={janela} />
    </QueryClientProvider>,
  );
}

test('mostra o grafo do funcionário e navega ao clicar num nó', async () => {
  stub();
  renderizar(janelaFake({ tipo: 'funcionario', id: 1 }));
  expect(await screen.findByText(/Felipe Bueno/)).toBeInTheDocument();
  expect(screen.getByText(/Engenharia/)).toBeInTheDocument();
  expect(screen.getByText(/DBOS/)).toBeInTheDocument();

  // navega para o departamento
  fireEvent.click(screen.getByRole('button', { name: /Engenharia/ }));
  expect(await screen.findByText(/Ana Souza/)).toBeInTheDocument();

  // volta
  fireEvent.click(screen.getByRole('button', { name: /Voltar/ }));
  expect(await screen.findByText(/DBOS/)).toBeInTheDocument();
});

test('sem dados, mostra o seletor de funcionário', async () => {
  stub();
  renderizar(janelaFake(null));
  expect(await screen.findByText(/Escolha um funcionário/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Felipe Bueno/ }));
  expect(await screen.findByText(/Engenharia/)).toBeInTheDocument();
});
