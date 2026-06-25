import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProvedorTema } from './ProvedorTema';
import { PainelTweaks } from './PainelTweaks';
import { usePainelTweaks } from './painel';
import { useBoot } from '../boot';
import { TEMA_PADRAO, CHAVE_TEMA } from './tipos';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(CHAVE_TEMA, JSON.stringify({ ...TEMA_PADRAO, pele: '98' }));
  delete document.body.dataset.skin;
  document.documentElement.removeAttribute('style');
  usePainelTweaks.setState({ aberto: true });
  useBoot.setState({ concluido: true });
});

function montar() {
  return render(
    <ProvedorTema>
      <PainelTweaks />
    </ProvedorTema>,
  );
}

test('não renderiza quando fechado', () => {
  usePainelTweaks.setState({ aberto: false });
  const { container } = montar();
  expect(container.querySelector('.painel-tweaks')).toBeNull();
});

test('na pele 98 mostra controles de 98 (densidade, CRT) e não os de Aero', () => {
  montar(); // pele padrão = 98
  expect(screen.getByText('Densidade')).toBeInTheDocument();
  expect(screen.getByText(/Monitor CRT/)).toBeInTheDocument();
  expect(screen.queryByText(/Vidro/)).toBeNull();
});

test('trocar a pele para Aero revela os controles de Aero', () => {
  montar();
  fireEvent.click(screen.getByRole('button', { name: 'Aero' }));
  expect(document.body.dataset.skin).toBe('aero');
  expect(screen.getByText(/Vidro/)).toBeInTheDocument();
  expect(screen.getByText(/Wallpaper/)).toBeInTheDocument();
});

test('ligar/desligar Animações escreve --motion', () => {
  montar();
  const alt = screen.getByRole('switch', { name: /Animações/ });
  fireEvent.click(alt);
  expect(document.documentElement.style.getPropertyValue('--motion')).toBe('0.001');
});

test('"Reiniciar sessão" reexecuta o boot e fecha o painel', () => {
  montar();
  fireEvent.click(screen.getByRole('button', { name: /Reiniciar sessão/ }));
  expect(useBoot.getState().concluido).toBe(false);
  expect(usePainelTweaks.getState().aberto).toBe(false);
});
