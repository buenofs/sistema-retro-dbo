import type { ColunaBanco, ValorCelula } from '@dbos/shared';

const TIPOS_NUMERICOS = [
  'int', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'real', 'money', 'smallmoney',
];

// Converte o texto digitado para o tipo adequado da coluna. O resto vai como
// string e o SQL Server converte implicitamente (spec: parametrizado e seguro).
export function converterValor(coluna: ColunaBanco, texto: string): ValorCelula {
  if (texto === '') return coluna.anulavel ? null : '';
  const base = coluna.tipoDado.split('(')[0]!.trim().toLowerCase();
  if (base === 'bit') return texto === '1' || texto.toLowerCase() === 'true';
  if (TIPOS_NUMERICOS.includes(base)) {
    const n = Number(texto);
    return Number.isNaN(n) ? texto : n;
  }
  return texto;
}
