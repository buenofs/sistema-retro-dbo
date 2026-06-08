import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NoTabela } from './NoTabela';
import { useMenuContexto, estadoInicialMenuContexto } from '../../areaTrabalho/useMenuContexto';
import { useLoja, estadoInicial } from '../../areaTrabalho/loja';

beforeEach(() => {
  useMenuContexto.setState(estadoInicialMenuContexto());
  useLoja.setState(estadoInicial());
});

const OBJ = { esquema: 'dbo', nome: 'Clientes', tipo: 'tabela' as const };

test('botão direito abre o menu com Propriedades e Abrir na grade', () => {
  render(
    <ul>
      <NoTabela objeto={OBJ} />
    </ul>,
  );
  fireEvent.contextMenu(screen.getByText(/Clientes/));
  const rotulos = useMenuContexto.getState().itens.map((i) => i.rotulo);
  expect(rotulos).toContain('Propriedades');
  expect(rotulos).toContain('Abrir na grade');
});

test('o item "Abrir na grade" abre uma janela de grade com o objeto', () => {
  render(
    <ul>
      <NoTabela objeto={OBJ} />
    </ul>,
  );
  fireEvent.contextMenu(screen.getByText(/Clientes/));
  const item = useMenuContexto.getState().itens.find((i) => i.rotulo === 'Abrir na grade')!;
  act(() => item.aoClicar());
  const janela = useLoja.getState().janelas.find((j) => j.tipoApp === 'grade');
  expect(janela).toBeDefined();
  expect(janela!.dados).toEqual({ esquema: 'dbo', tabela: 'Clientes' });
});
