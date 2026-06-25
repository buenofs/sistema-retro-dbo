import type { ComponentType } from 'react';
import type { NomeIcone } from '../tema/icones/motor';

export type IdJanela = string;
export type TipoApp =
  | 'consulta'
  | 'explorador'
  | 'grade'
  | 'propriedades'
  | 'terminal'
  | 'arquivos'
  | 'bloco'
  | 'lixeira'
  | 'monitor';
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
  icone: NomeIcone;
  retangulo: Retangulo;
  zIndex: number;
  estado: EstadoVisual;
  anterior: 'normal' | 'maximizada';
  dados: unknown;
}

export interface PropsApp {
  janela: EstadoJanela;
}

export interface DefinicaoApp {
  titulo: string;
  icone: NomeIcone;
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
  mover: (id: IdJanela, eixoX: number, eixoY: number) => void;
  redimensionar: (id: IdJanela, largura: number, altura: number) => void;
  minimizar: (id: IdJanela) => void;
  maximizar: (id: IdJanela) => void;
  restaurar: (id: IdJanela) => void;
}
