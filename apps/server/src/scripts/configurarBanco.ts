import { readFileSync } from 'node:fs';
import sql from 'mssql';
import { configDoAmbiente } from '../bd/conexao';

// Executa db/dbos_rh.sql em lotes separados por 'GO'. Conecta no 'master'
// (o banco DBOS_RH pode ainda não existir) e o próprio script faz USE DBOS_RH.
const caminho = new URL('../../../../db/dbos_rh.sql', import.meta.url);
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
  console.log(`DBOS_RH configurado com sucesso (${lotes.length} lotes).`);
} finally {
  await pool.close();
}
