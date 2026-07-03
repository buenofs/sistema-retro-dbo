import type { Pele } from '../tipos';
import { MANIFESTO, type TiersIcone } from './manifesto';
import { NOMES_ICONES, temIcone, listarIcones, type NomeIcone } from './nomes';

export { NOMES_ICONES, temIcone, listarIcones };
export type { NomeIcone };

const TRANSPARENTE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAYAAACgQDFGAAAAAElFTkSuQmCC';

function tiers(nome: NomeIcone, pele: Pele): TiersIcone | undefined {
  return MANIFESTO[pele][nome];
}

/** Resolve a URL do asset para a pele/tamanho. */
export function obterIcone(nome: NomeIcone, pele: Pele, tamanho = 16): string {
  const niveis = tiers(nome, pele);
  if (!niveis) return TRANSPARENTE;
  if (pele === 'aero') return niveis.base ?? niveis['32'] ?? niveis['16'] ?? TRANSPARENTE;
  if (tamanho <= 16) return niveis['16'] ?? niveis['32'] ?? TRANSPARENTE;
  return niveis['32'] ?? niveis['16'] ?? TRANSPARENTE;
}
