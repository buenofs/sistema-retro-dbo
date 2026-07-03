import type { Pele } from '../tipos';
import { NOMES_ICONES, type NomeIcone } from './nomes';

export interface TiersIcone {
  base?: string;
}
export type Manifesto = Record<Pele, Partial<Record<NomeIcone, TiersIcone>>>;

const urlAero = import.meta.glob('./assets/aero/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const valido = new Set<string>(NOMES_ICONES);

function montarAero(): Partial<Record<NomeIcone, TiersIcone>> {
  const out: Partial<Record<NomeIcone, TiersIcone>> = {};
  for (const [caminho, url] of Object.entries(urlAero)) {
    const m = caminho.match(/\/([a-zA-Z]+)\.png$/);
    if (!m) continue;
    const nome = m[1];
    if (!nome || !valido.has(nome)) continue;
    (out[nome as NomeIcone] ??= {}).base = url;
  }
  return out;
}

export const MANIFESTO: Manifesto = { aero: montarAero() };
