import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TipoApp } from './tipos';
import { ORDEM_APPS } from './registroApps';

export interface Ponto {
  x: number;
  y: number;
}
export const LARGURA_ICONE = 80;
export const ALTURA_ICONE = 76;
const ESPACO_Y = 92;

function layoutInicial(): Record<string, Ponto> {
  const out: Record<string, Ponto> = {};
  ORDEM_APPS.forEach((tipo, i) => {
    out[tipo] = { x: 8, y: 8 + i * ESPACO_Y };
  });
  return out;
}

interface LojaPosicoes {
  posicoes: Record<string, Ponto>;
  mover: (tipo: TipoApp, x: number, y: number) => void;
  garantir: (tipos: readonly TipoApp[]) => void;
}

export const useIconesDesktop = create<LojaPosicoes>()(
  persist(
    (set) => ({
      posicoes: layoutInicial(),
      mover: (tipo, x, y) =>
        set((s) => ({
          posicoes: { ...s.posicoes, [tipo]: { x: Math.max(0, x), y: Math.max(0, y) } },
        })),
      garantir: (tipos) =>
        set((s) => {
          const out = { ...s.posicoes };
          let i = Object.keys(out).length;
          let mudou = false;
          for (const t of tipos)
            if (!out[t]) {
              out[t] = { x: 8, y: 8 + i * ESPACO_Y };
              i++;
              mudou = true;
            }
          return mudou ? { posicoes: out } : s;
        }),
    }),
    { name: 'dbos-icones-desktop' },
  ),
);

interface LojaSelecao {
  selecionados: Set<string>;
  definir: (ids: string[]) => void;
  alternar: (id: string) => void;
  selecionarUm: (id: string) => void;
  limpar: () => void;
}
export const useSelecaoIcones = create<LojaSelecao>((set) => ({
  selecionados: new Set(),
  definir: (ids) => set({ selecionados: new Set(ids) }),
  alternar: (id) =>
    set((s) => {
      const n = new Set(s.selecionados);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return { selecionados: n };
    }),
  selecionarUm: (id) => set({ selecionados: new Set([id]) }),
  limpar: () => set({ selecionados: new Set() }),
}));
