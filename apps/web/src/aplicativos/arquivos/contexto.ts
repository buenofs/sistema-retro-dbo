import { create } from 'zustand';

// Onde o usuário está no SO: drive atual e usuário dono. Compartilhado entre
// Explorador e Terminal (Fase 3).
interface ContextoArquivos {
  driveId: number;
  donoId: number;
  definirDrive: (id: number) => void;
}

export const useContextoArquivos = create<ContextoArquivos>((set) => ({
  driveId: 1,
  donoId: 1,
  definirDrive: (id) => set({ driveId: id }),
}));
