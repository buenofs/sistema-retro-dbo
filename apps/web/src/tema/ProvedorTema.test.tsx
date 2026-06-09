import { test, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ProvedorTema } from './ProvedorTema';
import { useTema } from './ganchos';
import { CHAVE_TEMA } from './tipos';

function Sonda() {
  const { pele, definirPele } = useTema();
  return <button onClick={() => definirPele('aero')}>pele:{pele}</button>;
}

beforeEach(() => {
  localStorage.clear();
  delete document.body.dataset.skin;
});

test('aplica a pele padrão "98" no body em máquina nova', () => {
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('98');
  expect(screen.getByRole('button')).toHaveTextContent('pele:98');
});

test('definirPele troca a pele, atualiza o body e persiste', () => {
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  act(() => { screen.getByRole('button').click(); });
  expect(document.body.dataset.skin).toBe('aero');
  expect(JSON.parse(localStorage.getItem(CHAVE_TEMA)!)).toEqual({ pele: 'aero' });
});

test('restaura a pele persistida ao montar', () => {
  localStorage.setItem(CHAVE_TEMA, JSON.stringify({ pele: 'aero' }));
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('aero');
});

test('cai no padrão quando o localStorage tem lixo', () => {
  localStorage.setItem(CHAVE_TEMA, '{nao-e-json');
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('98');
});
