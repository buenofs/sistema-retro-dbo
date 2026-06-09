import { test, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ProvedorTema } from './ProvedorTema';
import { useTema, useTweaks } from './ganchos';
import { CHAVE_TEMA, TEMA_PADRAO } from './tipos';

function Sonda() {
  const { pele, definirPele } = useTema();
  const { definir98, definirSound } = useTweaks();
  return (
    <>
      <button onClick={() => definirPele('aero')}>pele:{pele}</button>
      <button onClick={() => definir98({ accent: '#b0228c' })}>acento98</button>
      <button onClick={() => definirSound(false)}>mudo</button>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  delete document.body.dataset.skin;
  document.documentElement.removeAttribute('style');
});

test('aplica a pele padrão "aero" no body em máquina nova', () => {
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('aero');
  expect(screen.getByText(/pele:/)).toHaveTextContent('pele:aero');
});

test('definirPele troca a pele, atualiza o body e persiste o estado completo', () => {
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  act(() => { screen.getByText(/pele:/).click(); });
  expect(document.body.dataset.skin).toBe('aero');
  const persistido = JSON.parse(localStorage.getItem(CHAVE_TEMA)!);
  expect(persistido.pele).toBe('aero');
  expect(persistido.aero).toEqual(TEMA_PADRAO.aero);
});

test('definir98 atualiza a var de acento e persiste (na pele 98)', () => {
  localStorage.setItem(CHAVE_TEMA, JSON.stringify({ ...TEMA_PADRAO, pele: '98' }));
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  act(() => { screen.getByText('acento98').click(); });
  expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#b0228c');
  expect(JSON.parse(localStorage.getItem(CHAVE_TEMA)!).n98.accent).toBe('#b0228c');
});

test('restaura o estado persistido ao montar', () => {
  localStorage.setItem(CHAVE_TEMA, JSON.stringify({ ...TEMA_PADRAO, pele: 'aero' }));
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('aero');
});

test('cai no padrão quando o localStorage tem lixo', () => {
  localStorage.setItem(CHAVE_TEMA, '{nao-e-json');
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('aero');
});
