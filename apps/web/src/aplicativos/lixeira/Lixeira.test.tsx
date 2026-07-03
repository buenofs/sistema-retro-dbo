import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Lixeira } from './Lixeira';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('/api/arquivos/lixeira')) {
        return new Response(
          JSON.stringify({
            ok: true,
            dados: {
              dados: [
                {
                  id: 7,
                  nome: 'velho.txt',
                  tipo: 'arquivo',
                  paiId: null,
                  driveId: 1,
                  donoId: 1,
                  tamanhoBytes: 5,
                  modificadoEm: null,
                },
              ],
              sql: [],
            },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ ok: true, dados: { dados: { id: 7 }, sql: [] } }), {
        status: 200,
      });
    }),
  );
});

function montar() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <Lixeira />
    </QueryClientProvider>,
  );
}

test('lista itens da lixeira', async () => {
  montar();
  expect(await screen.findByText('velho.txt')).toBeInTheDocument();
});

test('Restaurar dispara PUT', async () => {
  montar();
  await screen.findByText('velho.txt');
  fireEvent.click(screen.getByText('Restaurar'));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/arquivos/7/restaurar',
      expect.objectContaining({ method: 'PUT' }),
    ),
  );
});
