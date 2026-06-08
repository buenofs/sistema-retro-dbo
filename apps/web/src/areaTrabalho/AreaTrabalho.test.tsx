import { test, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AreaTrabalho } from './AreaTrabalho';
import { useLoja, estadoInicial } from './loja';
import { useMenuContexto, estadoInicialMenuContexto } from './useMenuContexto';

vi.mock('./sons', () => ({ tocarSom: vi.fn() }));

beforeEach(() => {
  useLoja.setState(estadoInicial());
  useMenuContexto.setState(estadoInicialMenuContexto());
});

function renderizar() {
  return render(<AreaTrabalho usuario={{ login: 'sa' }} />);
}

test('botão direito no fundo do desktop abre menu com os 4 apps', () => {
  const { container } = renderizar();
  const desktop = container.querySelector('.area-trabalho') as HTMLElement;
  fireEvent.contextMenu(desktop);
  const rotulos = useMenuContexto.getState().itens.map((i) => i.rotulo);
  expect(rotulos).toHaveLength(4);
  expect(rotulos.some((r) => r.includes('Explorador de Objetos'))).toBe(true);
});

test('botão direito num ícone abre menu "Abrir"', () => {
  const { getAllByText } = renderizar();
  const botaoIcone = getAllByText('Explorador de Objetos')[0]!.closest('button') as HTMLElement;
  fireEvent.contextMenu(botaoIcone);
  expect(useMenuContexto.getState().itens.map((i) => i.rotulo)).toEqual(['Abrir']);
});
