import sql from 'mssql';
import type { Credenciais } from '@dbos/shared';

export function configDoAmbiente(): sql.config {
  return {
    server: process.env.SQL_SERVIDOR ?? 'localhost',
    port: Number(process.env.SQL_PORTA ?? 1433),
    user: process.env.SQL_USUARIO ?? 'sa',
    password: process.env.SQL_SENHA ?? '',
    database: process.env.SQL_BANCO ?? 'master',
    requestTimeout: Number(process.env.SQL_TIMEOUT_MS ?? 30_000),
    options: {
      // Em ambiente local o certificado é autoassinado.
      encrypt: true,
      trustServerCertificate: true,
    },
  };
}

export async function testarConexao(config: sql.config): Promise<number> {
  const pool = await sql.connect(config);
  try {
    const resultado = await pool.request().query<{ um: number }>('SELECT 1 AS um');
    return resultado.recordset[0]?.um ?? -1;
  } finally {
    await pool.close();
  }
}

export function configParaLogin(credenciais: Credenciais): sql.config {
  return {
    ...configDoAmbiente(),
    user: credenciais.login,
    password: credenciais.senha,
  };
}

export async function abrirPool(config: sql.config): Promise<sql.ConnectionPool> {
  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  return pool;
}
