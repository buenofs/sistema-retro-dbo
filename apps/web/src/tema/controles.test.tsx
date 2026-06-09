import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Alternador, RadioSegmentado, Deslizador, ChipsCor } from './controles';

test('Alternador chama aoMudar com o valor invertido', () => {
  const aoMudar = vi.fn();
  render(<Alternador rotulo="Som" valor={true} aoMudar={aoMudar} />);
  fireEvent.click(screen.getByRole('switch'));
  expect(aoMudar).toHaveBeenCalledWith(false);
});

test('RadioSegmentado marca o valor ativo e troca ao clicar', () => {
  const aoMudar = vi.fn();
  render(
    <RadioSegmentado
      rotulo="Densidade"
      valor="normal"
      opcoes={[
        { valor: 'compacto', rotulo: 'Compacto' },
        { valor: 'normal', rotulo: 'Normal' },
      ]}
      aoMudar={aoMudar}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Compacto' }));
  expect(aoMudar).toHaveBeenCalledWith('compacto');
});

test('Deslizador emite número ao mover', () => {
  const aoMudar = vi.fn();
  render(<Deslizador rotulo="Matiz" valor={200} min={150} max={320} passo={2} aoMudar={aoMudar} />);
  fireEvent.change(screen.getByRole('slider'), { target: { value: '260' } });
  expect(aoMudar).toHaveBeenCalledWith(260);
});

test('ChipsCor seleciona a cor clicada', () => {
  const aoMudar = vi.fn();
  render(<ChipsCor rotulo="Acento" valor="#1084d0" opcoes={['#1084d0', '#b0228c']} aoMudar={aoMudar} />);
  fireEvent.click(screen.getByRole('button', { name: '#b0228c' }));
  expect(aoMudar).toHaveBeenCalledWith('#b0228c');
});
