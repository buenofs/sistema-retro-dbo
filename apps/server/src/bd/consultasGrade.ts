import type { ColunaBanco, RefObjeto, ResultadoGrade, ValorCelula } from '@dbos/shared';
import type { Banco } from './banco';
import { citarId, nomeQualificado, mapearColunas } from './clausulas';
import { listarColunas } from './consultasSistema';

export interface MetadadosTabela {
  colunas: ColunaBanco[];
  chavePrimaria: string[];
}

export async function obterMetadados(banco: Banco, ref: RefObjeto): Promise<MetadadosTabela> {
  const colunas = await listarColunas(banco, ref);
  const chavePrimaria = colunas.filter((coluna) => coluna.ehChavePrimaria).map((coluna) => coluna.nome);
  return { colunas, chavePrimaria };
}

/** Lista uma página de linhas via OFFSET/FETCH; ordena pela PK ou pela primeira coluna. */
export async function listarLinhas(
  banco: Banco,
  ref: RefObjeto,
  meta: MetadadosTabela,
  pagina: number,
  tamanho: number,
): Promise<ResultadoGrade> {
  const alvo = nomeQualificado(ref);
  const ordem = (meta.chavePrimaria.length ? meta.chavePrimaria : [meta.colunas[0]!.nome])
    .map(citarId)
    .join(', ');

  const totais = await banco.consultar<{ total: number }>(`SELECT COUNT(*) AS total FROM ${alvo}`);
  const total = totais[0]?.total ?? 0;

  const linhas = await banco.consultar<Record<string, unknown>>(
    `SELECT * FROM ${alvo} ORDER BY ${ordem} OFFSET @offset ROWS FETCH NEXT @tamanho ROWS ONLY`,
    { offset: pagina * tamanho, tamanho },
  );

  return { colunas: meta.colunas, chavePrimaria: meta.chavePrimaria, linhas, total, pagina, tamanho };
}

export function inserirLinha(banco: Banco, ref: RefObjeto, valores: Record<string, ValorCelula>): Promise<number> {
  const alvo = nomeQualificado(ref);
  const colunas = mapearColunas(valores, 'p');
  const texto = colunas.nomes.length
    ? `INSERT INTO ${alvo} (${colunas.nomes.join(', ')}) VALUES (${colunas.lugares.join(', ')})`
    : `INSERT INTO ${alvo} DEFAULT VALUES`;
  return banco.executar(texto, colunas.parametros);
}

export function atualizarLinha(
  banco: Banco,
  ref: RefObjeto,
  chave: Record<string, ValorCelula>,
  valores: Record<string, ValorCelula>,
): Promise<number> {
  const alvo = nomeQualificado(ref);
  const sets = mapearColunas(valores, 'v');
  const filtro = mapearColunas(chave, 'k');
  const texto = `UPDATE ${alvo} SET ${sets.igualdades.join(', ')} WHERE ${filtro.igualdades.join(' AND ')}`;
  return banco.executar(texto, { ...sets.parametros, ...filtro.parametros });
}

export function removerLinha(banco: Banco, ref: RefObjeto, chave: Record<string, ValorCelula>): Promise<number> {
  const alvo = nomeQualificado(ref);
  const filtro = mapearColunas(chave, 'k');
  const texto = `DELETE FROM ${alvo} WHERE ${filtro.igualdades.join(' AND ')}`;
  return banco.executar(texto, filtro.parametros);
}
