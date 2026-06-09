import { test, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AreaTrabalho } from './AreaTrabalho';
import { useLoja, estadoInicial } from './loja';
import { useMenuContexto, estadoInicialMenuContexto } from './useMenuContexto';
import { ProvedorTema } from '../tema/ProvedorTema';

vi.mock('./sons', () => ({ tocarSom: vi.fn(), definirSomHabilitado: vi.fn(), somHabilitado: () => true }));

beforeEach(() => {
  useLoja.setState(estadoInicial());
  useMenuContexto.setState(estadoInicialMenuContexto());
});

function renderizar() {
  return render(
    <ProvedorTema>
      <AreaTrabalho usuario={{ login: 'sa', banco: 'DBOS_RH' }} />
    </ProvedorTema>,
  );
}

test('botão direito no fundo do desktop abre menu com os 8 apps', () => {
  const { container } = renderizar();
  const desktop = container.querySelector('.area-trabalho') as HTMLElement;
  fireEvent.contextMenu(desktop);
  const rotulos = useMenuContexto.getState().itens.map((i) => i.rotulo);
  expect(rotulos.filter((r) => r.startsWith('Abrir '))).toHaveLength(8);
  expect(rotulos.some((r) => r.includes('Explorador de Objetos'))).toBe(true);
  expect(rotulos).toContain('Propriedades');
});

test('botão direito num ícone abre menu "Abrir"', () => {
  const { getAllByText } = renderizar();
  const botaoIcone = getAllByText('Explorador de Objetos')[0]!.closest('button') as HTMLElement;
  fireEvent.contextMenu(botaoIcone);
  expect(useMenuContexto.getState().itens.map((i) => i.rotulo)).toEqual(['Abrir']);
});

test('mostra o nome do banco conectado e o atalho de Relatório', () => {
  const { getByText } = renderizar();
  expect(getByText('DBOS_RH')).toBeInTheDocument();
  expect(getByText('Relatório (Folha)')).toBeInTheDocument();
});
