import type { ConnectionPool } from 'mssql';
import type { ResultadoConsulta } from '@dbos/shared';
import { somar } from './banco';

/** Console SQL: roda o SQL do usuário verbatim; exceção sancionada ao handle banco (precisa do resultado bruto). Fronteira de segurança: permissão do login + timeout + maxLinhas. */
export async function executarConsulta(
  pool: ConnectionPool,
  sqlTexto: string,
  maxLinhas: number,
): Promise<ResultadoConsulta> {
  const resultado = await pool.request().query(sqlTexto);
  const linhasAfetadas = somar(resultado.rowsAffected);

  const recordset = resultado.recordset;
  if (!recordset) {
    return { colunas: [], linhas: [], linhasAfetadas, truncado: false, totalLinhas: 0 };
  }

  const colunas = recordset.columns ? Object.keys(recordset.columns) : [];
  const totalLinhas = recordset.length;
  const truncado = totalLinhas > maxLinhas;
  const cortadas = truncado ? recordset.slice(0, maxLinhas) : recordset;
  const linhas = cortadas.map((linha) =>
    colunas.map((coluna) => {
      const valor = (linha as Record<string, unknown>)[coluna];
      return valor === undefined ? null : valor;
    }),
  );

  return { colunas, linhas, linhasAfetadas, truncado, totalLinhas };
}
