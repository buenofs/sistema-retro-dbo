import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Relogio } from './Relogio';

test('mostra a hora no formato HH:MM', () => {
  render(<Relogio />);
  expect(screen.getByLabelText('Relógio').textContent).toMatch(/^\d{2}:\d{2}$/);
});
