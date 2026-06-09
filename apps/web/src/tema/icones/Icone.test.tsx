import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icone } from './Icone';
import { ProvedorTema } from '../ProvedorTema';

test('renderiza um <img> pixelado com o alt informado', () => {
  render(<Icone nome="folder" tamanho={16} alt="Pasta" />);
  const img = screen.getByAltText('Pasta');
  expect(img.tagName).toBe('IMG');
  expect(img).toHaveAttribute('width', '16');
  expect(img.getAttribute('src')).toMatch(/^data:image\//);
  expect(img).toHaveStyle({ imageRendering: 'pixelated' });
});

test('funciona sem ProvedorTema (alt vazio por padrão)', () => {
  const { container } = render(<Icone nome="grid" />);
  const img = container.querySelector('img')!;
  expect(img).toBeInTheDocument();
  expect(img).toHaveAttribute('alt', '');
});

test('dentro do ProvedorTema também renderiza um <img>', () => {
  render(
    <ProvedorTema>
      <Icone nome="sql" alt="SQL" />
    </ProvedorTema>,
  );
  expect(screen.getByAltText('SQL').tagName).toBe('IMG');
});
