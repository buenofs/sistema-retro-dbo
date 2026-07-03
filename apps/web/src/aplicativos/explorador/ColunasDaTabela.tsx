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
      {colunas.map((coluna) => (
        <li key={coluna.nome} className="col-linha">
          {coluna.ehChavePrimaria ? (
            <Icone nome="key" tamanho={14} alt="chave primária" />
          ) : (
            <Icone nome="column" tamanho={14} alt="" />
          )}
          <span className="col-nome">{coluna.nome}</span>
          <span className="col-meta">
            {coluna.tipoDado}
            {coluna.anulavel && <span className="nulo"> · nulo</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
