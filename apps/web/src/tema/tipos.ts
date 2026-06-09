export type Pele = 'aero' | '98';

export type Cantos = 'aero' | 'reto';
export type Wallpaper = 'aqua' | 'sunset' | 'verde' | 'noite';
export type Padrao98 = 'dither' | 'solid' | 'brand' | 'grid';
export type Densidade = 'compacto' | 'normal';

export interface TweaksAero {
  accentHue: number; // 150–320
  glass: boolean;
  corners: Cantos;
  wallpaper: Wallpaper;
}

export interface Tweaks98 {
  accent: string; // hex curado
  pattern: Padrao98;
  density: Densidade;
  crt: boolean;
}

export interface EstadoTema {
  pele: Pele;
  aero: TweaksAero;
  n98: Tweaks98;
  motion: boolean;
  sound: boolean;
}

export const CHAVE_TEMA = 'dbos_tema';

// Fase 2: padrão "98" (reproduz o visual atual). A Fase 3 muda para "aero"
// em máquina nova, quando a folha pele-aero existir.
export const TEMA_PADRAO: EstadoTema = {
  pele: '98',
  aero: { accentHue: 200, glass: true, corners: 'aero', wallpaper: 'aqua' },
  n98: { accent: '#1084d0', pattern: 'dither', density: 'normal', crt: false },
  motion: true,
  sound: true,
};

// Listas de opção (verbatim dos protótipos) — usadas pelo painel e pela validação.
export const WALLPAPERS: ReadonlyArray<{ valor: Wallpaper; rotulo: string }> = [
  { valor: 'aqua', rotulo: 'Aqua' },
  { valor: 'sunset', rotulo: 'Pôr do sol' },
  { valor: 'verde', rotulo: 'Verde' },
  { valor: 'noite', rotulo: 'Noite' },
];
export const PADROES: ReadonlyArray<{ valor: Padrao98; rotulo: string }> = [
  { valor: 'dither', rotulo: 'Pontilhado' },
  { valor: 'solid', rotulo: 'Sólido' },
  { valor: 'brand', rotulo: 'Marca' },
  { valor: 'grid', rotulo: 'Grade' },
];
export const ACENTOS_98: readonly string[] = [
  '#1084d0',
  '#11807e',
  '#b0228c',
  '#2f8f3a',
  '#5a3fd0',
];
