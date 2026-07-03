import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditorConsultas } from './EditorConsultas';
import { ProvedorTema } from '../../tema/ProvedorTema';
import { useDialogos, estadoInicialDialogos } from '../../areaTrabalho/useDialogos';

vi.mock('@uiw/react-codemirror', async (importarReal) => ({
  ...(await importarReal<typeof import('@uiw/react-codemirror')>()),
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="SQL" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

beforeEach(() => useDialogos.setState(estadoInicialDialogos()));
afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <ProvedorTema>
        <EditorConsultas />
      </ProvedorTema>
    </QueryClientProvider>,
  );
}

test('executar com sucesso mostra a grade de resultado', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            dados: {
              colunas: ['um'],
              linhas: [[1]],
              linhasAfetadas: 0,
              truncado: false,
              totalLinhas: 1,
            },
          }),
        ),
    ),
  );
  renderizar();
  fireEvent.click(screen.getByRole('button', { name: /Executar/ }));
  expect(await screen.findByText('um')).toBeInTheDocument(); // cabeçalho da coluna
});

test('executar com erro abre um diálogo de erro', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: false,
            erro: {
              tipo: 'sql',
              mensagem: 'Objeto inválido.',
              detalhe: 'Invalid object name',
              codigoSql: 208,
            },
          }),
          { status: 400 },
        ),
    ),
  );
  renderizar();
  fireEvent.click(screen.getByRole('button', { name: /Executar/ }));
  await vi.waitFor(() => {
    const { dialogos } = useDialogos.getState();
    expect(dialogos).toHaveLength(1);
    expect(dialogos[0]!.tipo).toBe('erro');
    expect(dialogos[0]!.mensagem).toBe('Objeto inválido.');
  });
});
