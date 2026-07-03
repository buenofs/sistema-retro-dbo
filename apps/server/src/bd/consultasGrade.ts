import sql from 'mssql';
import type { ConnectionPool } from 'mssql';
import type { ColunaBanco, RefObjeto, ResultadoGrade, ValorCelula } from '@dbos/shared';
import { listarColunas } from './consultasSistema';

// Cita um identificador SQL com colchetes, escapando ']'. Como o conteúdo vira
// um nome literal entre [], não há como "escapar" para SQL executável.
export function citarId(id: string): string {
  return `[${id.replace(/]/g, ']]')}]`;
}

export interface MetadadosTabela {
  colunas: ColunaBanco[];
  chavePrimaria: string[];
}

export async function obterMetadados(
  pool: ConnectionPool,
  ref: RefObjeto,
): Promise<MetadadosTabela> {
  const colunas = await listarColunas(pool, ref);
  const chavePrimaria = colunas.filter((c) => c.ehChavePrimaria).map((c) => c.nome);
  return { colunas, chavePrimaria };
}

function somaAfetadas(r: { rowsAffected?: number[] }): number {
  return (r.rowsAffected ?? []).reduce((a, b) => a + b, 0);
}

export async function listarLinhas(
  pool: ConnectionPool,
  ref: RefObjeto,
  meta: MetadadosTabela,
  pagina: number,
  tamanho: number,
): Promise<ResultadoGrade> {
  const alvo = `${citarId(ref.esquema)}.${citarId(ref.tabela)}`;
  const ordem = (meta.chavePrimaria.length ? meta.chavePrimaria : [meta.colunas[0]!.nome])
    .map(citarId)
    .join(', ');

  const contagem = await pool
    .request()
    .query<{ total: number }>(`SELECT COUNT(*) AS total FROM ${alvo}`);
  const total = contagem.recordset[0]?.total ?? 0;

  const dados = await pool
    .request()
    .input('offset', sql.Int, pagina * tamanho)
    .input('tamanho', sql.Int, tamanho)
    .query<Record<string, unknown>>(
      `SELECT * FROM ${alvo} ORDER BY ${ordem} OFFSET @offset ROWS FETCH NEXT @tamanho ROWS ONLY`,
    );

  return {
    colunas: meta.colunas,
    chavePrimaria: meta.chavePrimaria,
    linhas: dados.recordset,
    total,
    pagina,
    tamanho,
  };
}

export async function inserirLinha(
  pool: ConnectionPool,
  ref: RefObjeto,
  valores: Record<string, ValorCelula>,
): Promise<number> {
  const alvo = `${citarId(ref.esquema)}.${citarId(ref.tabela)}`;
  const nomes = Object.keys(valores);
  const req = pool.request();
  nomes.forEach((n, i) => req.input(`p${i}`, valores[n]));
  const texto = nomes.length
    ? `INSERT INTO ${alvo} (${nomes.map(citarId).join(', ')}) VALUES (${nomes.map((_, i) => `@p${i}`).join(', ')})`
    : `INSERT INTO ${alvo} DEFAULT VALUES`;
  return somaAfetadas(await req.query(texto));
}

export async function atualizarLinha(
  pool: ConnectionPool,
  ref: RefObjeto,
  chave: Record<string, ValorCelula>,
  valores: Record<string, ValorCelula>,
): Promise<number> {
  const alvo = `${citarId(ref.esquema)}.${citarId(ref.tabela)}`;
  const req = pool.request();
  const sets = Object.keys(valores).map((n, i) => {
    req.input(`v${i}`, valores[n]);
    return `${citarId(n)} = @v${i}`;
  });
  const wheres = Object.keys(chave).map((n, i) => {
    req.input(`k${i}`, chave[n]);
    return `${citarId(n)} = @k${i}`;
  });
  const texto = `UPDATE ${alvo} SET ${sets.join(', ')} WHERE ${wheres.join(' AND ')}`;
  return somaAfetadas(await req.query(texto));
}

export async function removerLinha(
  pool: ConnectionPool,
  ref: RefObjeto,
  chave: Record<string, ValorCelula>,
): Promise<number> {
  const alvo = `${citarId(ref.esquema)}.${citarId(ref.tabela)}`;
  const req = pool.request();
  const wheres = Object.keys(chave).map((n, i) => {
    req.input(`k${i}`, chave[n]);
    return `${citarId(n)} = @k${i}`;
  });
  const texto = `DELETE FROM ${alvo} WHERE ${wheres.join(' AND ')}`;
  return somaAfetadas(await req.query(texto));
}
