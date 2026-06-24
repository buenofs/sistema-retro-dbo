import { create } from 'zustand';
import type { ComandoSQL } from '@dbos/shared';

const MAX = 200;

interface LojaLogSQL {
  comandos: ComandoSQL[];
  ultimoLote: ComandoSQL[];
  pausado: boolean;
  registrar: (cmds: ComandoSQL[]) => void;
  limpar: () => void;
  alternarPausa: () => void;
}

export const useLojaLogSQL = create<LojaLogSQL>((set) => ({
  comandos: [],
  ultimoLote: [],
  pausado: false,
  registrar: (cmds) =>
    set((estado) => {
      if (cmds.length === 0) return estado;
      if (estado.pausado) return { ...estado, ultimoLote: cmds };
      return { comandos: [...estado.comandos, ...cmds].slice(-MAX), ultimoLote: cmds };
    }),
  limpar: () => set({ comandos: [] }),
  alternarPausa: () => set((estado) => ({ pausado: !estado.pausado })),
}));
