import type { Pele } from '../tipos';
import { NOMES_ICONES, type NomeIcone } from './nomes';

export interface TiersIcone { '16'?: string; '32'?: string; base?: string }
export type Manifesto = Record<Pele, Partial<Record<NomeIcone, TiersIcone>>>;

const url98 = import.meta.glob('./assets/98/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const urlAero = import.meta.glob('./assets/aero/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const valido = new Set<string>(NOMES_ICONES);

function montar98(): Partial<Record<NomeIcone, TiersIcone>> {
  const out: Partial<Record<NomeIcone, TiersIcone>> = {};
  for (const [caminho, url] of Object.entries(url98)) {
    const m = caminho.match(/\/([a-zA-Z]+)-(16|32)\.png$/);
    if (!m) continue;
    const nome = m[1];
    const tier = m[2];
    if (!nome || !tier || !valido.has(nome)) continue;
    (out[nome as NomeIcone] ??= {})[tier as '16' | '32'] = url;
  }
  return out;
}

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

export const MANIFESTO: Manifesto = { '98': montar98(), aero: montarAero() };
