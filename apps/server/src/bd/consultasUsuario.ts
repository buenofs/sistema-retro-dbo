import type { ConnectionPool } from 'mssql';
import type { ResultadoConsulta } from '@dbos/shared';

// Roda o SQL do usuário VERBATIM. A fronteira de segurança é a permissão do
// login + o requestTimeout do pool + o teto aqui.
export async function executarConsulta(
  pool: ConnectionPool,
  sqlTexto: string,
  maxLinhas: number,
): Promise<ResultadoConsulta> {
  const resultado = await pool.request().query(sqlTexto);

  const linhasAfetadas = (resultado.rowsAffected ?? []).reduce((a, b) => a + b, 0);

  const recordset = resultado.recordset;
  if (!recordset) {
    return { colunas: [], linhas: [], linhasAfetadas, truncado: false, totalLinhas: 0 };
  }

  const colunas = recordset.columns ? Object.keys(recordset.columns) : [];
  const totalLinhas = recordset.length;
  const truncado = totalLinhas > maxLinhas;
  const cortadas = truncado ? recordset.slice(0, maxLinhas) : recordset;
  const linhas = cortadas.map((linha) =>
    colunas.map((c) => {
      const valor = (linha as Record<string, unknown>)[c];
      return valor === undefined ? null : valor;
    }),
  );

  return { colunas, linhas, linhasAfetadas, truncado, totalLinhas };
}
