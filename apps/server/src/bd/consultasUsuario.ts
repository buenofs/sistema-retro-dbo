import type { ConnectionPool } from 'mssql';
import type { ResultadoConsulta } from '@dbos/shared';
import { somar } from './banco';

// Exceção sancionada ao handle `banco`: este é o console SQL. Roda o SQL do
// usuário VERBATIM (spec §2.2) e precisa do resultado bruto (colunas, contagem),
// que o handle não expõe. A fronteira de segurança é a permissão do login + o
// requestTimeout do pool + o teto `maxLinhas`.
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
