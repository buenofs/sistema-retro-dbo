import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MenuIniciar } from './MenuIniciar';
import { useLoja, estadoInicial } from './loja';

beforeEach(() => useLoja.setState(estadoInicial()));

function renderizar(aoFechar = () => {}) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MenuIniciar login="sa" aoFechar={aoFechar} />
    </QueryClientProvider>,
  );
}

test('clicar num app abre a janela e fecha o menu', () => {
  let fechou = false;
  renderizar(() => {
    fechou = true;
  });
  fireEvent.click(screen.getByRole('menuitem', { name: /Editor de Consultas/ }));
  expect(useLoja.getState().janelas).toHaveLength(1);
  expect(useLoja.getState().janelas[0]!.tipoApp).toBe('consulta');
  expect(fechou).toBe(true);
});

test('mostra a opção de encerrar sessão com o login', () => {
  renderizar();
  expect(screen.getByRole('menuitem', { name: /Encerrar sessão \(sa\)/ })).toBeInTheDocument();
});
