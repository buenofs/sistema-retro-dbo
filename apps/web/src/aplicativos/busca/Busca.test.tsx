import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Busca } from './Busca';
import { useLoja, estadoInicial } from '../../areaTrabalho/loja';

beforeEach(() => useLoja.setState(estadoInicial()));
afterEach(() => vi.unstubAllGlobals());

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('/api/dominio/departamentos')) {
        return new Response(JSON.stringify({ ok: true, dados: [{ id: 1, nome: 'Engenharia', centroCusto: 'CC-100' }] }));
      }
      if (u.includes('/api/dominio/projetos')) {
        return new Response(JSON.stringify({ ok: true, dados: [{ id: 1, nome: 'DBOS', status: 'Ativo', dataInicio: null }] }));
      }
      // /api/busca/funcionarios (com ou sem querystring)
      return new Response(
        JSON.stringify({
          ok: true,
          dados: [
            { id: 1, nome: 'Felipe Bueno', cargo: 'Dev Sr', salario: 12000, dataAdmissao: null, departamentoId: 1, departamento: 'Engenharia' },
          ],
        }),
      );
    }),
  );
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <Busca />
    </QueryClientProvider>,
  );
}

test('popula o select de departamentos', async () => {
  stub();
  renderizar();
  expect(await screen.findByText('Engenharia')).toBeInTheDocument();
});

test('pesquisar mostra resultados e "Abrir na grade" abre a Grade', async () => {
  stub();
  renderizar();
  fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));
  const tabela = await screen.findByRole('table');
  expect(within(tabela).getByText('Felipe Bueno')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir na grade' }));
  const janela = useLoja.getState().janelas.find((j) => j.tipoApp === 'grade');
  expect(janela).toBeDefined();
  expect(janela!.dados).toEqual({ esquema: 'dbo', tabela: 'Funcionarios' });
});
