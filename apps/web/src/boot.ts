import { create } from 'zustand';

interface LojaBoot {
  concluido: boolean;
  concluir: () => void;
  reiniciar: () => void;
}

export const useBoot = create<LojaBoot>((set) => ({
  concluido: false,
  concluir: () => set({ concluido: true }),
  reiniciar: () => set({ concluido: false }),
}));
