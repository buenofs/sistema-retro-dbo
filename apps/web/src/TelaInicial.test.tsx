import { render, screen } from '@testing-library/react';
import { TelaInicial } from './TelaInicial';

test('exibe o nome do sistema na tela inicial', () => {
  render(<TelaInicial />);
  expect(screen.getByText('DBOS')).toBeInTheDocument();
  expect(
    screen.getByText('Database Operating System'),
  ).toBeInTheDocument();
});
