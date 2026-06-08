import { test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MenuContexto } from './MenuContexto';
import { useMenuContexto, estadoInicialMenuContexto } from './useMenuContexto';

beforeEach(() => useMenuContexto.setState(estadoInicialMenuContexto()));

test('não renderiza nada quando fechado', () => {
  const { container } = render(<MenuContexto />);
  expect(container).toBeEmptyDOMElement();
});

test('mostra os itens e clicar dispara a ação e fecha', () => {
  const espiao = vi.fn();
  render(<MenuContexto />);
  act(() => useMenuContexto.getState().abrir(5, 5, [{ rotulo: 'Propriedades', aoClicar: espiao }]));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Propriedades' }));
  expect(espiao).toHaveBeenCalledTimes(1);
  expect(useMenuContexto.getState().aberto).toBe(false);
});
