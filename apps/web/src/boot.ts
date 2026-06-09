import { create } from 'zustand';

interface LojaBoot {
  concluido: boolean;
  concluir: () => void;
  reiniciar: () => void;
}

// Controla a exibição da TelaBoot. "Reiniciar sessão" só reexecuta o boot;
// não invalida a sessão SQL (react-query) nem a loja de janelas.
export const useBoot = create<LojaBoot>((set) => ({
  concluido: false,
  concluir: () => set({ concluido: true }),
  reiniciar: () => set({ concluido: false }),
}));
