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

export function temIcone(nome: string): nome is NomeIcone {
  return (NOMES_ICONES as readonly string[]).includes(nome);
}

export function listarIcones(): NomeIcone[] {
  return [...NOMES_ICONES];
}
