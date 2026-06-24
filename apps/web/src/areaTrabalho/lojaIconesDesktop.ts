import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TipoApp } from './tipos';
import { ORDEM_APPS } from './registroApps';

export interface Ponto { x: number; y: number }
export const LARGURA_ICONE = 80;
export const ALTURA_ICONE = 76;
const ESPACO_Y = 92;

function layoutInicial(): Record<string, Ponto> {
  const out: Record<string, Ponto> = {};
  ORDEM_APPS.forEach((tipo, i) => { out[tipo] = { x: 8, y: 8 + i * ESPACO_Y }; });
  return out;
}

interface LojaPosicoes {
  posicoes: Record<string, Ponto>;
  mover: (tipo: TipoApp, eixoX: number, eixoY: number) => void;
  garantir: (tipos: readonly TipoApp[]) => void;
}

export const useIconesDesktop = create<LojaPosicoes>()(
  persist(
    (set) => ({
      posicoes: layoutInicial(),
      mover: (tipo, eixoX, eixoY) =>
        set((estado) => ({ posicoes: { ...estado.posicoes, [tipo]: { x: Math.max(0, eixoX), y: Math.max(0, eixoY) } } })),
      garantir: (tipos) =>
        set((estado) => {
          const out = { ...estado.posicoes };
          let proximoIndice = Object.keys(out).length;
          let mudou = false;
          for (const tipo of tipos) if (!out[tipo]) { out[tipo] = { x: 8, y: 8 + proximoIndice * ESPACO_Y }; proximoIndice++; mudou = true; }
          return mudou ? { posicoes: out } : estado;
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
    set((estado) => { const novaSelecao = new Set(estado.selecionados); if (novaSelecao.has(id)) novaSelecao.delete(id); else novaSelecao.add(id); return { selecionados: novaSelecao }; }),
  selecionarUm: (id) => set({ selecionados: new Set([id]) }),
  limpar: () => set({ selecionados: new Set() }),
}));
