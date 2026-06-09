import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icone } from './Icone';
import { ProvedorTema } from '../ProvedorTema';

test('renderiza um <img> com o alt informado', () => {
  render(<Icone nome="folder" tamanho={16} alt="Pasta" />);
  const img = screen.getByAltText('Pasta');
  expect(img.tagName).toBe('IMG');
  expect(img).toHaveAttribute('width', '16');
  expect(img.getAttribute('src')).toBeTruthy();
});

test('sem ProvedorTema: assume pele 98 (image-rendering pixelated)', () => {
  const { container } = render(<Icone nome="grid" />);
  const img = container.querySelector('img')!;
  expect(img).toBeInTheDocument();
  expect(img).toHaveAttribute('alt', '');
  expect(img).toHaveStyle({ imageRendering: 'pixelated' });
});

test('dentro do ProvedorTema (pele padrão) renderiza um <img>', () => {
  render(
    <ProvedorTema>
      <Icone nome="sql" alt="SQL" />
    </ProvedorTema>,
  );
  expect(screen.getByAltText('SQL').tagName).toBe('IMG');
});
