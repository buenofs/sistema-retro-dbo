import type { ColunaBanco } from '@dbos/shared';
import { useColunas } from './ganchos';
import { Icone } from '../../tema/icones/Icone';

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
          {c.ehChavePrimaria ? (
            <Icone nome="key" tamanho={14} alt="chave primária" style={{ marginRight: 3 }} />
          ) : (
            <Icone nome="column" tamanho={14} alt="" style={{ marginRight: 3 }} />
          )}
          {c.nome + ' : ' + c.tipoDado + (c.anulavel ? ' (nulo)' : '')}
        </li>
      ))}
    </ul>
  );
}
