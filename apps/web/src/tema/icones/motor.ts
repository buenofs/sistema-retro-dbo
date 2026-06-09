import type { Pele } from '../tipos';
import { MANIFESTO, type TiersIcone } from './manifesto';
import { NOMES_ICONES, temIcone, listarIcones, type NomeIcone } from './nomes';

export { NOMES_ICONES, temIcone, listarIcones };
export type { NomeIcone };

// PNG 1×1 transparente — só como rede de segurança se faltar um asset.
const TRANSPARENTE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAYAAACgQDFGAAAAAElFTkSuQmCC';

function tiers(nome: NomeIcone, pele: Pele): TiersIcone | undefined {
  return MANIFESTO[pele][nome];
}

/** Resolve a URL do asset para a pele/tamanho. */
export function obterIcone(nome: NomeIcone, pele: Pele, tamanho = 16): string {
  const t = tiers(nome, pele);
  if (!t) return TRANSPARENTE;
  if (pele === 'aero') return t.base ?? t['32'] ?? t['16'] ?? TRANSPARENTE;
  // 98: tier nativo por tamanho, com fallback ao outro tier
  if (tamanho <= 16) return t['16'] ?? t['32'] ?? TRANSPARENTE;
  return t['32'] ?? t['16'] ?? TRANSPARENTE;
}
