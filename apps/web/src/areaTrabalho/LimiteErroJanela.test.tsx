import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LimiteErroJanela } from './LimiteErroJanela';

function Bomba(): never {
  throw new Error('explodiu');
}

afterEach(() => vi.restoreAllMocks());

test('mostra o painel de erro quando o filho lança', () => {
  // React loga o erro capturado no console; silenciamos para não poluir a saída.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <LimiteErroJanela titulo="Teste">
      <Bomba />
    </LimiteErroJanela>,
  );
  expect(screen.getByText(/operação ilegal/i)).toBeInTheDocument();
  expect(screen.getByText(/explodiu/)).toBeInTheDocument();
});

test('renderiza os filhos quando não há erro', () => {
  render(
    <LimiteErroJanela titulo="Teste">
      <p>conteúdo ok</p>
    </LimiteErroJanela>,
  );
  expect(screen.getByText('conteúdo ok')).toBeInTheDocument();
});
