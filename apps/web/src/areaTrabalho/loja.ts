import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EstadoJanela, IdJanela, LojaAreaTrabalho, TipoApp } from './tipos';
import { registroApps } from './registroApps';

export function estadoInicial() {
  return {
    janelas: [] as EstadoJanela[],
    idFocada: null as IdJanela | null,
    proximoZ: 1,
    proximoId: 1,
  };
}

export const useLoja = create<LojaAreaTrabalho>()(
  persist(
    (set) => ({
      ...estadoInicial(),

      abrirJanela: (tipoApp: TipoApp, dados?: unknown) =>
        set((s) => {
          const def = registroApps[tipoApp];
          const id = `j${s.proximoId}`;
          const desloc = (s.janelas.length % 6) * 28;
          const janela: EstadoJanela = {
            id,
            tipoApp,
            titulo: def.titulo,
            icone: def.icone,
            retangulo: {
              x: 48 + desloc,
              y: 48 + desloc,
              largura: def.tamanhoInicial.largura,
              altura: def.tamanhoInicial.altura,
            },
            zIndex: s.proximoZ,
            estado: 'normal',
            anterior: 'normal',
            dados: dados ?? null,
          };
          return {
            janelas: [...s.janelas, janela],
            idFocada: id,
            proximoZ: s.proximoZ + 1,
            proximoId: s.proximoId + 1,
          };
        }),

      fecharJanela: (id) =>
        set((s) => ({
          janelas: s.janelas.filter((j) => j.id !== id),
          idFocada: s.idFocada === id ? null : s.idFocada,
        })),

      focar: (id) =>
        set((s) => ({
          janelas: s.janelas.map((j) => (j.id === id ? { ...j, zIndex: s.proximoZ } : j)),
          idFocada: id,
          proximoZ: s.proximoZ + 1,
        })),

      mover: (id, x, y) =>
        set((s) => ({
          janelas: s.janelas.map((j) =>
            j.id === id ? { ...j, retangulo: { ...j.retangulo, x, y } } : j,
          ),
        })),

      redimensionar: (id, largura, altura) =>
        set((s) => ({
          janelas: s.janelas.map((j) =>
            j.id === id ? { ...j, retangulo: { ...j.retangulo, largura, altura } } : j,
          ),
        })),

      minimizar: (id) =>
        set((s) => ({
          janelas: s.janelas.map((j) =>
            j.id === id
              ? {
                  ...j,
                  estado: 'minimizada',
                  anterior: j.estado === 'maximizada' ? 'maximizada' : 'normal',
                }
              : j,
          ),
          idFocada: s.idFocada === id ? null : s.idFocada,
        })),

      maximizar: (id) =>
        set((s) => ({
          janelas: s.janelas.map((j) => (j.id === id ? { ...j, estado: 'maximizada' } : j)),
        })),

      restaurar: (id) =>
        set((s) => ({
          janelas: s.janelas.map((j) =>
            j.id === id ? { ...j, estado: j.estado === 'minimizada' ? j.anterior : 'normal' } : j,
          ),
        })),
    }),
    {
      name: 'dbos-area-trabalho',
      partialize: (s) => ({
        janelas: s.janelas,
        idFocada: s.idFocada,
        proximoZ: s.proximoZ,
        proximoId: s.proximoId,
      }),
    },
  ),
);
