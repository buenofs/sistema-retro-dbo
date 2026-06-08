import type { ConnectionPool } from 'mssql';
import type { Departamento, Projeto } from '@dbos/shared';

export async function listarDepartamentos(pool: ConnectionPool): Promise<Departamento[]> {
  const r = await pool
    .request()
    .query<Departamento>(`SELECT id, nome, centroCusto FROM dbo.Departamentos ORDER BY nome`);
  return r.recordset;
}

export async function listarProjetos(pool: ConnectionPool): Promise<Projeto[]> {
  const r = await pool
    .request()
    .query<Projeto>(`SELECT id, nome, status, dataInicio FROM dbo.Projetos ORDER BY nome`);
  return r.recordset;
}
