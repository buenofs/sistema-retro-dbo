import { create } from 'zustand';

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
