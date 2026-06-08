import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BarraTarefas } from './BarraTarefas';
import { useLoja, estadoInicial } from './loja';

beforeEach(() => useLoja.setState(estadoInicial()));

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <BarraTarefas login="sa" />
    </QueryClientProvider>,
  );
}

test('mostra um botão por janela aberta', () => {
  useLoja.getState().abrirJanela('consulta');
  useLoja.getState().abrirJanela('grade');
  renderizar();
  expect(screen.getByRole('button', { name: /Editor de Consultas/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Grade de Dados/ })).toBeInTheDocument();
});

test('clicar no botão da janela focada a minimiza', () => {
  useLoja.getState().abrirJanela('consulta'); // fica focada
  const id = useLoja.getState().janelas[0]!.id;
  renderizar();
  fireEvent.click(screen.getByRole('button', { name: /Editor de Consultas/ }));
  expect(useLoja.getState().janelas.find((j) => j.id === id)!.estado).toBe('minimizada');
});

test('clicar no botão Iniciar abre o menu', () => {
  renderizar();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }));
  expect(screen.getByRole('menu')).toBeInTheDocument();
});
