import { create } from 'zustand';

export interface ItemMenu {
  rotulo: string;
  aoClicar: () => void;
}

interface LojaMenuContexto {
  aberto: boolean;
  x: number;
  y: number;
  itens: ItemMenu[];
  abrir: (x: number, y: number, itens: ItemMenu[]) => void;
  fechar: () => void;
}

export function estadoInicialMenuContexto() {
  return { aberto: false, x: 0, y: 0, itens: [] as ItemMenu[] };
}

export const useMenuContexto = create<LojaMenuContexto>((set) => ({
  ...estadoInicialMenuContexto(),
  abrir: (x, y, itens) => set({ aberto: true, x, y, itens }),
  fechar: () => set({ aberto: false, itens: [] }),
}));
