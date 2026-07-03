// Ícones do tema. Tema único (aero): cada nome mapeia para um PNG em
// assets/aero/<nome>.png. Vite resolve a URL final de cada asset no build.
export const NOMES_ICONES = [
  'folder',
  'folderOpen',
  'sql',
  'grid',
  'props',
  'search',
  'network',
  'terminal',
  'report',
  'database',
  'computer',
  'table',
  'view',
  'column',
  'key',
  'run',
  'save',
  'insert',
  'edit',
  'trash',
  'refresh',
  'filter',
  'newdoc',
  'stop',
  'clock',
  'speaker',
  'wifi',
  'power',
  'logoff',
  'user',
  'help',
  'star',
] as const;

export type NomeIcone = (typeof NOMES_ICONES)[number];

// PNG 1x1 transparente — devolvido quando falta o asset de um nome.
const TRANSPARENTE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAYAAACgQDFGAAAAAElFTkSuQmCC';

const urls = import.meta.glob('./assets/aero/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const MAPA = new Map<string, string>();
for (const [caminho, url] of Object.entries(urls)) {
  const nome = caminho.match(/\/([a-zA-Z]+)\.png$/)?.[1];
  if (nome) MAPA.set(nome, url);
}

export function obterIcone(nome: NomeIcone): string {
  return MAPA.get(nome) ?? TRANSPARENTE;
}
