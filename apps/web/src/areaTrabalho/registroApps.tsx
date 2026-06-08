import { lazy } from 'react';
import type { DefinicaoApp, TipoApp } from './tipos';
import { AppPlaceholder } from './AppPlaceholder';
import { ExploradorObjetos } from '../aplicativos/explorador/ExploradorObjetos';

const EditorConsultas = lazy(() =>
  import('../aplicativos/consulta/EditorConsultas').then((m) => ({ default: m.EditorConsultas })),
);

// O WM é genérico: cada tipoApp mapeia para metadados + um componente.
// Adicionar um app futuro = trocar AppPlaceholder pelo componente real aqui.
export const registroApps: Record<TipoApp, DefinicaoApp> = {
  explorador: {
    titulo: 'Explorador de Objetos',
    icone: '🗂️',
    tamanhoInicial: { largura: 280, altura: 360 },
    componente: ExploradorObjetos,
  },
  consulta: {
    titulo: 'Editor de Consultas',
    icone: '📝',
    tamanhoInicial: { largura: 560, altura: 420 },
    componente: EditorConsultas,
  },
  grade: {
    titulo: 'Grade de Dados',
    icone: '▦',
    tamanhoInicial: { largura: 520, altura: 360 },
    componente: AppPlaceholder,
  },
  propriedades: {
    titulo: 'Propriedades',
    icone: 'ℹ️',
    tamanhoInicial: { largura: 320, altura: 300 },
    componente: AppPlaceholder,
  },
};

// Ordem fixa em que os apps aparecem nos atalhos e no menu Iniciar.
export const ORDEM_APPS: TipoApp[] = ['explorador', 'consulta', 'grade', 'propriedades'];
