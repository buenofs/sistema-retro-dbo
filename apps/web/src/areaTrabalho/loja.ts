import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EstadoJanela, IdJanela, LojaAreaTrabalho, TipoApp } from './tipos';
import { registroApps } from './registroApps';

// Estado inicial isolado para reaproveitar no reset dos testes.
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
    set((estado) => {
      const def = registroApps[tipoApp];
      const id = `j${estado.proximoId}`;
      const desloc = (estado.janelas.length % 6) * 28; // cascata clássica
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
        zIndex: estado.proximoZ,
        estado: 'normal',
        anterior: 'normal',
        dados: dados ?? null,
      };
      return {
        janelas: [...estado.janelas, janela],
        idFocada: id,
        proximoZ: estado.proximoZ + 1,
        proximoId: estado.proximoId + 1,
      };
    }),

  fecharJanela: (id) =>
    set((estado) => ({
      janelas: estado.janelas.filter((janela) => janela.id !== id),
      idFocada: estado.idFocada === id ? null : estado.idFocada,
    })),

  focar: (id) =>
    set((estado) => ({
      janelas: estado.janelas.map((janela) =>
        janela.id === id ? { ...janela, zIndex: estado.proximoZ } : janela,
      ),
      idFocada: id,
      proximoZ: estado.proximoZ + 1,
    })),

  mover: (id, eixoX, eixoY) =>
    set((estado) => ({
      janelas: estado.janelas.map((janela) =>
        janela.id === id ? { ...janela, retangulo: { ...janela.retangulo, x: eixoX, y: eixoY } } : janela,
      ),
    })),

  redimensionar: (id, largura, altura) =>
    set((estado) => ({
      janelas: estado.janelas.map((janela) =>
        janela.id === id ? { ...janela, retangulo: { ...janela.retangulo, largura, altura } } : janela,
      ),
    })),

  minimizar: (id) =>
    set((estado) => ({
      janelas: estado.janelas.map((janela) =>
        janela.id === id
          ? { ...janela, estado: 'minimizada', anterior: janela.estado === 'maximizada' ? 'maximizada' : 'normal' }
          : janela,
      ),
      idFocada: estado.idFocada === id ? null : estado.idFocada,
    })),

  maximizar: (id) =>
    set((estado) => ({
      janelas: estado.janelas.map((janela) => (janela.id === id ? { ...janela, estado: 'maximizada' } : janela)),
    })),

  restaurar: (id) =>
    set((estado) => ({
      janelas: estado.janelas.map((janela) =>
        janela.id === id
          ? { ...janela, estado: janela.estado === 'minimizada' ? janela.anterior : 'normal' }
          : janela,
      ),
    })),
    }),
    {
      name: 'dbos-area-trabalho',
      // Só geometria/estado de janelas — funções não são serializadas pelo persist.
      partialize: (estado) => ({
        janelas: estado.janelas,
        idFocada: estado.idFocada,
        proximoZ: estado.proximoZ,
        proximoId: estado.proximoId,
      }),
    },
  ),
);
