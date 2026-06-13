import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Terminal } from './Terminal';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes('/api/arquivos/drives')) {
      return new Response(JSON.stringify({ ok: true, dados: { dados: [{ id: 1, letra: 'C', rotulo: 'Sistema', capacidadeBytes: 1 }], sql: [] } }), { status: 200 });
    }
    if (u.includes('/api/arquivos/listar')) {
      return new Response(JSON.stringify({ ok: true, dados: { dados: [{ id: 10, nome: 'Documentos', tipo: 'pasta', paiId: null, driveId: 1, donoId: 1, tamanhoBytes: null, criadoEm: '', modificadoEm: null }], sql: [] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, dados: { dados: {}, sql: [] } }), { status: 200 });
  }));
});

test('mostra o cabeçalho e o prompt do drive', async () => {
  render(<Terminal />);
  expect(screen.getByText(/DBOS \[Versão 2.0\]/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('C:\\>')).toBeInTheDocument());
});

test('ls lista a pasta atual', async () => {
  render(<Terminal />);
  await waitFor(() => expect(screen.getByText('C:\\>')).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Comando'), { target: { value: 'ls' } });
  fireEvent.keyDown(screen.getByLabelText('Comando'), { key: 'Enter' });
  await waitFor(() => expect(screen.getByText(/Documentos/)).toBeInTheDocument());
});
