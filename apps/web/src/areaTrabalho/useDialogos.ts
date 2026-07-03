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
    set((estado) => ({
      dialogos: [...estado.dialogos, { ...dialogo, id: estado.proximoId }],
      proximoId: estado.proximoId + 1,
    })),
  fechar: (id) => set((estado) => ({ dialogos: estado.dialogos.filter((dialogo) => dialogo.id !== id) })),
}));
