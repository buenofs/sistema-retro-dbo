import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TelaBoot, DURACAO_BOOT_MS } from './TelaBoot';

vi.mock('./areaTrabalho/sons', () => ({ tocarSom: vi.fn() }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('chama onConcluir após a duração do boot', () => {
  const espiao = vi.fn();
  render(<TelaBoot onConcluir={espiao} />);
  expect(espiao).not.toHaveBeenCalled();
  vi.advanceTimersByTime(DURACAO_BOOT_MS);
  expect(espiao).toHaveBeenCalledTimes(1);
});

test('mostra a marca DBOS', () => {
  render(<TelaBoot onConcluir={() => {}} />);
  expect(screen.getByText('DBOS')).toBeInTheDocument();
});
