import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExploradorArquivos } from './ExploradorArquivos';
import type { EstadoJanela } from '../../areaTrabalho/tipos';

const janela: EstadoJanela = {
  id: 'j1', tipoApp: 'arquivos', titulo: 'Arquivos', icone: 'folder',
  retangulo: { x: 0, y: 0, largura: 600, altura: 400 },
  zIndex: 1, estado: 'normal', anterior: 'normal', dados: null,
};

const conteudo = [
  { id: 10, nome: 'Documentos', tipo: 'pasta', paiId: null, driveId: 1, donoId: 1, tamanhoBytes: null, criadoEm: '', modificadoEm: null },
  { id: 11, nome: 'a.txt', tipo: 'arquivo', paiId: null, driveId: 1, donoId: 1, tamanhoBytes: 12, criadoEm: '', modificadoEm: null },
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes('/api/arquivos/drives')) {
      return new Response(JSON.stringify({ ok: true, dados: { dados: [{ id: 1, letra: 'C', rotulo: 'Sistema', capacidadeBytes: 1 }], sql: [] } }), { status: 200 });
    }
    if (u.includes('/api/arquivos/listar')) {
      return new Response(JSON.stringify({ ok: true, dados: { dados: conteudo, sql: [] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, dados: { dados: { id: 99 }, sql: [] } }), { status: 200 });
  }));
});

function montar() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <ExploradorArquivos janela={janela} />
    </QueryClientProvider>,
  );
}

test('lista pastas e arquivos da raiz', async () => {
  montar();
  expect(await screen.findByText('Documentos')).toBeInTheDocument();
  expect(screen.getByText('a.txt')).toBeInTheDocument();
});

test('Nova Pasta dispara POST /api/arquivos/pasta', async () => {
  montar();
  await screen.findByText('Documentos');
  fireEvent.click(screen.getByText('Nova Pasta'));
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'NovaPasta' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith('/api/arquivos/pasta', expect.objectContaining({ method: 'POST' })),
  );
});
