import sql from 'mssql';

// Monta a configuração de conexão a partir das variáveis de ambiente.
export function configDoAmbiente(): sql.config {
  return {
    server: process.env.SQL_SERVIDOR ?? 'localhost',
    port: Number(process.env.SQL_PORTA ?? 1433),
    user: process.env.SQL_USUARIO ?? 'sa',
    password: process.env.SQL_SENHA ?? '',
    database: process.env.SQL_BANCO ?? 'master',
    options: {
      // Em ambiente local o certificado é autoassinado.
      encrypt: true,
      trustServerCertificate: true,
    },
  };
}

// Abre uma conexão, roda um SELECT cru e devolve o valor — prova de vida.
export async function testarConexao(config: sql.config): Promise<number> {
  const pool = await sql.connect(config);
  try {
    const resultado = await pool.request().query<{ um: number }>('SELECT 1 AS um');
    return resultado.recordset[0]?.um ?? -1;
  } finally {
    await pool.close();
  }
}
