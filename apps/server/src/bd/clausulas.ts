import type { RefObjeto, ValorCelula } from '@dbos/shared';

/** Cita um identificador entre colchetes; o conteúdo vira nome literal, sem como "escapar" para SQL executável. */
export function citarId(id: string): string {
  return `[${id.replace(/]/g, ']]')}]`;
}

export function nomeQualificado(ref: RefObjeto): string {
  return `${citarId(ref.esquema)}.${citarId(ref.tabela)}`;
}

export interface ColunasMapeadas {
  nomes: string[];
  lugares: string[];
  igualdades: string[];
  parametros: Record<string, ValorCelula>;
}

/** Quebra {coluna: valor} em pedaços de SQL parametrizado; o prefixo evita colisão entre conjuntos (SET vs WHERE). */
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

export function listaIn(ids: number[]): { lugares: string; parametros: Record<string, number> } {
  return {
    lugares: ids.map((_, indice) => `@i${indice}`).join(', '),
    parametros: Object.fromEntries(ids.map((valor, indice) => [`i${indice}`, valor])),
  };
}
