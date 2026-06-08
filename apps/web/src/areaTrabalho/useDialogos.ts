import { create } from 'zustand';

export type TipoDialogo = 'erro' | 'aviso' | 'info';

export interface Dialogo {
  id: number;
  tipo: TipoDialogo;
  titulo: string;
  mensagem: string;
  detalhe?: string;
}

interface LojaDialogos {
  dialogos: Dialogo[];
  proximoId: number;
  abrir: (dialogo: Omit<Dialogo, 'id'>) => void;
  fechar: (id: number) => void;
}

export function estadoInicialDialogos() {
  return { dialogos: [] as Dialogo[], proximoId: 1 };
}

export const useDialogos = create<LojaDialogos>((set) => ({
  ...estadoInicialDialogos(),
  abrir: (dialogo) =>
    set((s) => ({
      dialogos: [...s.dialogos, { ...dialogo, id: s.proximoId }],
      proximoId: s.proximoId + 1,
    })),
  fechar: (id) => set((s) => ({ dialogos: s.dialogos.filter((d) => d.id !== id) })),
}));
