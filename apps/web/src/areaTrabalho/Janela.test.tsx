import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Janela } from './Janela';
import { useLoja, estadoInicial } from './loja';

beforeEach(() => useLoja.setState(estadoInicial()));

function abrirERenderizar() {
  useLoja.getState().abrirJanela('consulta');
  const id = useLoja.getState().janelas[0]!.id;
  render(<Janela id={id} />);
  return id;
}

test('mostra título e ícone do app', () => {
  abrirERenderizar();
  const tb = screen.getByText('Editor de Consultas', { selector: '.title-bar-text' });
  expect(tb).toBeInTheDocument();
  expect(tb.querySelector('img')).toBeInTheDocument();
});

test('o botão Close fecha a janela na loja', () => {
  abrirERenderizar();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(useLoja.getState().janelas).toHaveLength(0);
});

test('o botão Minimize muda o estado para minimizada', () => {
  const id = abrirERenderizar();
  fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));
  expect(useLoja.getState().janelas.find((j) => j.id === id)!.estado).toBe('minimizada');
});

test('o botão Maximize maximiza e depois vira Restore', () => {
  const id = abrirERenderizar();
  fireEvent.click(screen.getByRole('button', { name: 'Maximize' }));
  expect(useLoja.getState().janelas.find((j) => j.id === id)!.estado).toBe('maximizada');
  fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
  expect(useLoja.getState().janelas.find((j) => j.id === id)!.estado).toBe('normal');
});
