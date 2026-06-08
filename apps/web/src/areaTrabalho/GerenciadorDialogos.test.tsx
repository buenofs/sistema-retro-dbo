import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GerenciadorDialogos } from './GerenciadorDialogos';
import { useDialogos, estadoInicialDialogos } from './useDialogos';

beforeEach(() => useDialogos.setState(estadoInicialDialogos()));

test('não renderiza nada quando não há diálogos', () => {
  const { container } = render(<GerenciadorDialogos />);
  expect(container).toBeEmptyDOMElement();
});

test('mostra título, mensagem e detalhe de um diálogo de erro', () => {
  useDialogos.getState().abrir({
    tipo: 'erro',
    titulo: 'Erro',
    mensagem: 'Objeto inválido.',
    detalhe: 'Erro SQL 208',
  });
  render(<GerenciadorDialogos />);
  expect(screen.getByText('Objeto inválido.')).toBeInTheDocument();
  expect(screen.getByText('Erro SQL 208')).toBeInTheDocument();
});

test('OK fecha o diálogo', () => {
  useDialogos.getState().abrir({ tipo: 'erro', titulo: 'Erro', mensagem: 'x' });
  render(<GerenciadorDialogos />);
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  expect(useDialogos.getState().dialogos).toHaveLength(0);
});
