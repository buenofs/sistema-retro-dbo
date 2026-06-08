import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usarValorDebounced } from './usarValorDebounced';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('devolve o valor inicial imediatamente', () => {
  const { result } = renderHook(() => usarValorDebounced('a', 200));
  expect(result.current).toBe('a');
});

test('atualiza só depois do atraso', () => {
  const { result, rerender } = renderHook(
    ({ v }) => usarValorDebounced(v, 200),
    { initialProps: { v: 'a' } },
  );
  rerender({ v: 'b' });
  expect(result.current).toBe('a'); // ainda dentro do atraso
  act(() => vi.advanceTimersByTime(200));
  expect(result.current).toBe('b');
});
