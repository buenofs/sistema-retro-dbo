import type { ColunaBanco } from '@dbos/shared';
import { useColunas } from './ganchos';

export function ColunasDaTabela({ esquema, tabela }: { esquema: string; tabela: string }) {
  const consulta = useColunas(esquema, tabela);

  if (consulta.isPending) {
    return (
      <ul>
        <li>Carregando…</li>
      </ul>
    );
  }
  if (consulta.isError) {
    return (
      <ul>
        <li style={{ color: 'red' }}>{consulta.error.message}</li>
      </ul>
    );
  }

  const colunas: ColunaBanco[] = consulta.data ?? [];
  if (colunas.length === 0) {
    return (
      <ul>
        <li>(sem colunas)</li>
      </ul>
    );
  }

  return (
    <ul>
      {colunas.map((c) => (
        <li key={c.nome}>
          {(c.ehChavePrimaria ? '🔑 ' : '') +
            c.nome +
            ' : ' +
            c.tipoDado +
            (c.anulavel ? ' (nulo)' : '')}
        </li>
      ))}
    </ul>
  );
}
