import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlocoNotas } from './BlocoNotas';
import type { EstadoJanela } from '../../areaTrabalho/tipos';

const janela = (dados: unknown): EstadoJanela => ({
  id: 'j1',
  tipoApp: 'bloco',
  titulo: 'Bloco',
  icone: 'newdoc',
  retangulo: { x: 0, y: 0, largura: 400, altura: 300 },
  zIndex: 1,
  estado: 'normal',
  anterior: 'normal',
  dados,
});

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/api/arquivos/5') && (!init || init.method === undefined)) {
        return new Response(
          JSON.stringify({
            ok: true,
            dados: { dados: { id: 5, nome: 'a.txt', conteudo: 'oi' }, sql: [] },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ ok: true, dados: { dados: { id: 5 }, sql: [] } }), {
        status: 200,
      });
    }),
  );
});

function montar(dados: unknown) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <BlocoNotas janela={janela(dados)} />
    </QueryClientProvider>,
  );
}

test('carrega o conteúdo do arquivo', async () => {
  montar({ id: 5, nome: 'a.txt' });
  await waitFor(() =>
    expect((screen.getByLabelText('Conteúdo') as HTMLTextAreaElement).value).toBe('oi'),
  );
});

test('botão Salvar dispara o PUT de conteúdo', async () => {
  montar({ id: 5, nome: 'a.txt' });
  await waitFor(() =>
    expect((screen.getByLabelText('Conteúdo') as HTMLTextAreaElement).value).toBe('oi'),
  );
  fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'novo' } });
  fireEvent.click(screen.getByText('Salvar'));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/arquivos/5/conteudo',
      expect.objectContaining({ method: 'PUT' }),
    ),
  );
});
