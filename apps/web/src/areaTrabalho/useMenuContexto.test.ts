import { test, expect, beforeEach } from 'vitest';
import { useMenuContexto, estadoInicialMenuContexto } from './useMenuContexto';

beforeEach(() => useMenuContexto.setState(estadoInicialMenuContexto()));

test('abrir guarda posição e itens', () => {
  useMenuContexto.getState().abrir(10, 20, [{ rotulo: 'Propriedades', aoClicar: () => {} }]);
  const s = useMenuContexto.getState();
  expect(s.aberto).toBe(true);
  expect(s.x).toBe(10);
  expect(s.y).toBe(20);
  expect(s.itens).toHaveLength(1);
});

test('fechar limpa o menu', () => {
  useMenuContexto.getState().abrir(0, 0, [{ rotulo: 'X', aoClicar: () => {} }]);
  useMenuContexto.getState().fechar();
  expect(useMenuContexto.getState().aberto).toBe(false);
  expect(useMenuContexto.getState().itens).toHaveLength(0);
});
