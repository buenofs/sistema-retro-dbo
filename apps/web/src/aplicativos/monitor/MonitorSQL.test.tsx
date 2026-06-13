import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonitorSQL } from './MonitorSQL';
import { useLojaLogSQL } from './lojaLog';
import type { ComandoSQL } from '@dbos/shared';

const cmd = (acao: string, tipo: ComandoSQL['tipo']): ComandoSQL => ({
  acao, tipo, texto: 'INSERT INTO dbo.Itens (nome) VALUES (@nome)', parametros: { nome: 'Docs' }, linhasAfetadas: 1, em: '2026-06-13T10:00:00Z',
});

beforeEach(() => useLojaLogSQL.getState().limpar());

test('mostra a ação e a prévia resolvida', () => {
  useLojaLogSQL.getState().registrar([cmd('Criar pasta', 'INSERT')]);
  render(<MonitorSQL />);
  expect(screen.getByText('Criar pasta')).toBeInTheDocument();
  expect(screen.getByText(/VALUES \('Docs'\)/)).toBeInTheDocument();
});

test('filtro por tipo esconde os demais', () => {
  useLojaLogSQL.getState().registrar([cmd('Criar pasta', 'INSERT'), cmd('Apagar', 'DELETE')]);
  render(<MonitorSQL />);
  fireEvent.click(screen.getByLabelText('Filtrar DELETE'));
  expect(screen.queryByText('Criar pasta')).not.toBeInTheDocument();
  expect(screen.getByText('Apagar')).toBeInTheDocument();
});

test('limpar zera a lista', () => {
  useLojaLogSQL.getState().registrar([cmd('Criar pasta', 'INSERT')]);
  render(<MonitorSQL />);
  fireEvent.click(screen.getByText('Limpar'));
  expect(screen.queryByText('Criar pasta')).not.toBeInTheDocument();
});
