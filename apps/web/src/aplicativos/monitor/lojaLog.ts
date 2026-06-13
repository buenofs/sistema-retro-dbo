import { create } from 'zustand';
import type { ComandoSQL } from '@dbos/shared';

const MAX = 200;

interface LojaLogSQL {
  comandos: ComandoSQL[];
  pausado: boolean;
  registrar: (cmds: ComandoSQL[]) => void;
  limpar: () => void;
  alternarPausa: () => void;
}

export const useLojaLogSQL = create<LojaLogSQL>((set) => ({
  comandos: [],
  pausado: false,
  registrar: (cmds) =>
    set((s) => (s.pausado || cmds.length === 0 ? s : { comandos: [...s.comandos, ...cmds].slice(-MAX) })),
  limpar: () => set({ comandos: [] }),
  alternarPausa: () => set((s) => ({ pausado: !s.pausado })),
}));
