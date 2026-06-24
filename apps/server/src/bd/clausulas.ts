import type { RefObjeto, ValorCelula } from '@dbos/shared';

// Cita um identificador SQL com colchetes, escapando ']'. Como o conteúdo vira
// nome literal entre [], não há como "escapar" para SQL executável.
export function citarId(id: string): string {
  return `[${id.replace(/]/g, ']]')}]`;
}

// '[esquema].[tabela]' — o alvo qualificado de uma operação.
export function nomeQualificado(ref: RefObjeto): string {
  return `${citarId(ref.esquema)}.${citarId(ref.tabela)}`;
}

export interface ColunasMapeadas {
  nomes: string[]; // ['[nome]', '[idade]']
  lugares: string[]; // ['@p0', '@p1']
  igualdades: string[]; // ['[nome] = @p0', '[idade] = @p1']
  parametros: Record<string, ValorCelula>;
}

// Transforma {coluna: valor} em pedaços reutilizáveis de SQL parametrizado.
// O prefixo evita colisão quando há mais de um conjunto na mesma query (SET vs WHERE).
export function mapearColunas(valores: Record<string, ValorCelula>, prefixo: string): ColunasMapeadas {
  const entradas = Object.entries(valores);
  const lugares = entradas.map((_, indice) => `@${prefixo}${indice}`);
  return {
    nomes: entradas.map(([nome]) => citarId(nome)),
    lugares,
    igualdades: entradas.map(([nome], indice) => `${citarId(nome)} = ${lugares[indice]}`),
    parametros: Object.fromEntries(
      entradas.map(([, valor], indice): [string, ValorCelula] => [`${prefixo}${indice}`, valor]),
    ),
  };
}

// Monta os lugares e parâmetros de uma cláusula IN (@i0, @i1, ...) a partir de ids.
// O prefixo 'i' é fixo de propósito: uma query tem no máximo uma cláusula IN montada
// assim, então não há risco de colisão com outro conjunto de parâmetros.
export function listaIn(ids: number[]): { lugares: string; parametros: Record<string, number> } {
  return {
    lugares: ids.map((_, indice) => `@i${indice}`).join(', '),
    parametros: Object.fromEntries(ids.map((valor, indice) => [`i${indice}`, valor])),
  };
}
