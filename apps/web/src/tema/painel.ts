import { create } from 'zustand';

interface LojaPainel {
  aberto: boolean;
  abrir: () => void;
  fechar: () => void;
  alternar: () => void;
}

export const usePainelTweaks = create<LojaPainel>((set) => ({
  aberto: false,
  abrir: () => set({ aberto: true }),
  fechar: () => set({ aberto: false }),
  alternar: () => set((s) => ({ aberto: !s.aberto })),
}));
