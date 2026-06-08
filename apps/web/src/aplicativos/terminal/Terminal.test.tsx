import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Terminal } from './Terminal';

afterEach(() => vi.unstubAllGlobals());

function digitar(texto: string) {
  const input = screen.getByLabelText('Comando');
  fireEvent.change(input, { target: { value: texto } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

test('ajuda imprime os comandos', async () => {
  render(<Terminal />);
  digitar('ajuda');
  expect(await screen.findByText(/Comandos disponíveis/)).toBeInTheDocument();
});

test('limpar limpa a tela', async () => {
  render(<Terminal />);
  digitar('ajuda');
  await screen.findByText(/Comandos disponíveis/);
  digitar('limpar');
  await waitFor(() => expect(screen.queryByText(/Comandos disponíveis/)).toBeNull());
});
