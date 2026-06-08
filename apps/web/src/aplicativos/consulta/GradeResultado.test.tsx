import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GradeResultado } from './GradeResultado';
import type { ResultadoConsulta } from '@dbos/shared';

function resultado(p: Partial<ResultadoConsulta>): ResultadoConsulta {
  return { colunas: [], linhas: [], linhasAfetadas: 0, truncado: false, totalLinhas: 0, ...p };
}

test('mostra os cabeçalhos de coluna', () => {
  render(<GradeResultado resultado={resultado({ colunas: ['id', 'nome'], linhas: [[1, 'Ana']], totalLinhas: 1 })} />);
  expect(screen.getByText('id')).toBeInTheDocument();
  expect(screen.getByText('nome')).toBeInTheDocument();
});

test('sem colunas, mostra as linhas afetadas', () => {
  render(<GradeResultado resultado={resultado({ linhasAfetadas: 3 })} />);
  expect(screen.getByText(/Linhas afetadas: 3/)).toBeInTheDocument();
});

test('mostra aviso quando truncado', () => {
  render(
    <GradeResultado
      resultado={resultado({ colunas: ['n'], linhas: [[1]], truncado: true, totalLinhas: 5000 })}
    />,
  );
  expect(screen.getByText(/5000/)).toBeInTheDocument();
});
