export type Pele = 'aero' | '98';

export interface EstadoTema {
  pele: Pele;
}

export const CHAVE_TEMA = 'dbos_tema';

// Fase 0: padrão "98" (reproduz o visual atual). A Fase 3 muda para "aero"
// em máquina nova, quando a pele Aero existir.
export const TEMA_PADRAO: EstadoTema = { pele: '98' };
