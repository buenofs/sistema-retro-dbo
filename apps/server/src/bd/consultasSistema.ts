import sql from 'mssql';
import type { ConnectionPool } from 'mssql';
import type { ColunaBanco, ObjetoBanco, RefObjeto } from '@dbos/shared';

const SQL_OBJETOS = `
  SELECT TABLE_SCHEMA AS esquema,
         TABLE_NAME   AS nome,
         CASE TABLE_TYPE WHEN 'VIEW' THEN 'view' ELSE 'tabela' END AS tipo
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
  ORDER BY TABLE_SCHEMA, TABLE_NAME
`;

export async function listarObjetos(pool: ConnectionPool): Promise<ObjetoBanco[]> {
  const resultado = await pool.request().query<ObjetoBanco>(SQL_OBJETOS);
  return resultado.recordset;
}

// O bit do SQL Server volta como boolean no driver mssql, então anulavel/ehChavePrimaria
// já chegam como true/false ao cliente.
const SQL_COLUNAS = `
  SELECT
    c.COLUMN_NAME AS nome,
    c.DATA_TYPE +
      CASE
        WHEN c.DATA_TYPE IN ('varchar','nvarchar','char','nchar','varbinary','binary')
          THEN '(' + CASE WHEN c.CHARACTER_MAXIMUM_LENGTH = -1 THEN 'max'
                          ELSE CAST(c.CHARACTER_MAXIMUM_LENGTH AS varchar(11)) END + ')'
        WHEN c.DATA_TYPE IN ('decimal','numeric')
          THEN '(' + CAST(c.NUMERIC_PRECISION AS varchar(11)) + ',' + CAST(c.NUMERIC_SCALE AS varchar(11)) + ')'
        ELSE ''
      END AS tipoDado,
    CAST(CASE WHEN c.IS_NULLABLE = 'YES' THEN 1 ELSE 0 END AS bit) AS anulavel,
    CAST(CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS bit) AS ehChavePrimaria
  FROM INFORMATION_SCHEMA.COLUMNS c
  LEFT JOIN (
    SELECT k.TABLE_SCHEMA, k.TABLE_NAME, k.COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS t
      ON t.CONSTRAINT_NAME   = k.CONSTRAINT_NAME
     AND t.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
    WHERE t.CONSTRAINT_TYPE = 'PRIMARY KEY'
  ) pk
    ON pk.TABLE_SCHEMA = c.TABLE_SCHEMA
   AND pk.TABLE_NAME   = c.TABLE_NAME
   AND pk.COLUMN_NAME  = c.COLUMN_NAME
  WHERE c.TABLE_SCHEMA = @esquema AND c.TABLE_NAME = @tabela
  ORDER BY c.ORDINAL_POSITION
`;

export async function listarColunas(
  pool: ConnectionPool,
  ref: RefObjeto,
): Promise<ColunaBanco[]> {
  const resultado = await pool
    .request()
    .input('esquema', sql.NVarChar, ref.esquema)
    .input('tabela', sql.NVarChar, ref.tabela)
    .query<ColunaBanco>(SQL_COLUNAS);
  return resultado.recordset;
}
