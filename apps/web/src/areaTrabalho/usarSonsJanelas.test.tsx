import { test, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useLoja, estadoInicial } from './loja';

vi.mock('./sons', () => ({ tocarSom: vi.fn() }));
import { tocarSom } from './sons';
import { usarSonsJanelas } from './usarSonsJanelas';

beforeEach(() => {
  useLoja.setState(estadoInicial());
  vi.clearAllMocks();
});

function Harness() {
  usarSonsJanelas();
  return null;
}

test('toca "abrir" ao abrir e "fechar" ao fechar', () => {
  render(<Harness />);
  act(() => useLoja.getState().abrirJanela('explorador'));
  expect(tocarSom).toHaveBeenCalledWith('abrir');

  const id = useLoja.getState().janelas[0]!.id;
  act(() => useLoja.getState().fecharJanela(id));
  expect(tocarSom).toHaveBeenCalledWith('fechar');
});
