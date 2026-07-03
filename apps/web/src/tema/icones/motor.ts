import { MANIFESTO } from './manifesto';
import { NOMES_ICONES, temIcone, listarIcones, type NomeIcone } from './nomes';

export { NOMES_ICONES, temIcone, listarIcones };
export type { NomeIcone };

const TRANSPARENTE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAYAAACgQDFGAAAAAElFTkSuQmCC';

export function obterIcone(nome: NomeIcone): string {
  return MANIFESTO.aero[nome]?.base ?? TRANSPARENTE;
}
