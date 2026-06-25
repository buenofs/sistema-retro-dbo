import { readFileSync } from 'node:fs';
import sql from 'mssql';
import { configDoAmbiente } from '../bd/conexao';

const caminho = new URL('../../../../db/dbos_sistema.sql', import.meta.url);
const texto = readFileSync(caminho, 'utf8');
const lotes = texto
  .split(/^\s*GO\s*$/im)
  .map((l) => l.trim())
  .filter((l) => l.length > 0);

const config: sql.config = { ...configDoAmbiente(), database: 'master' };
const pool = await new sql.ConnectionPool(config).connect();
try {
  for (const lote of lotes) {
    await pool.request().batch(lote);
  }
  console.log(`DBOS_SISTEMA configurado com sucesso (${lotes.length} lotes).`);
} finally {
  await pool.close();
}
