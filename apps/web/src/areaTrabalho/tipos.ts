import type { ComponentType } from 'react';

export type IdJanela = string;
export type TipoApp =
  | 'consulta'
  | 'explorador'
  | 'grade'
  | 'propriedades'
  | 'busca'
  | 'relacionamentos';
export type EstadoVisual = 'normal' | 'minimizada' | 'maximizada';

export interface Retangulo {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface EstadoJanela {
  id: IdJanela;
  tipoApp: TipoApp;
  titulo: string;
  icone: string;
  retangulo: Retangulo;
  zIndex: number;
  estado: EstadoVisual;
  // Para onde 'restaurar' deve voltar quando a janela está minimizada.
  anterior: 'normal' | 'maximizada';
  dados: unknown; // payload específico do app (null nos placeholders)
}

// Props que todo componente de app recebe do WM.
export interface PropsApp {
  janela: EstadoJanela;
}

// Entrada do registro: metadados + o componente React do app.
export interface DefinicaoApp {
  titulo: string;
  icone: string;
  tamanhoInicial: { largura: number; altura: number };
  componente: ComponentType<PropsApp>;
}

export interface LojaAreaTrabalho {
  janelas: EstadoJanela[];
  idFocada: IdJanela | null;
  proximoZ: number;
  proximoId: number;
  abrirJanela: (tipoApp: TipoApp, dados?: unknown) => void;
  fecharJanela: (id: IdJanela) => void;
  focar: (id: IdJanela) => void;
  mover: (id: IdJanela, x: number, y: number) => void;
  redimensionar: (id: IdJanela, largura: number, altura: number) => void;
  minimizar: (id: IdJanela) => void;
  maximizar: (id: IdJanela) => void;
  restaurar: (id: IdJanela) => void;
}
