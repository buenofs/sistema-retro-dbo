import { lazy } from 'react';
import type { DefinicaoApp, TipoApp } from './tipos';
import { ExploradorObjetos } from '../aplicativos/explorador/ExploradorObjetos';
import { GradeDados } from '../aplicativos/grade/GradeDados';
import { PropriedadesObjeto } from '../aplicativos/propriedades/PropriedadesObjeto';
import { Busca } from '../aplicativos/busca/Busca';
import { Relacionamentos } from '../aplicativos/relacionamentos/Relacionamentos';

const EditorConsultas = lazy(() =>
  import('../aplicativos/consulta/EditorConsultas').then((m) => ({ default: m.EditorConsultas })),
);

// O WM é genérico: cada tipoApp mapeia para metadados + um componente.
// Adicionar um app futuro = registrar o componente real aqui.
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
    tamanhoInicial: { largura: 640, altura: 440 },
    componente: GradeDados,
  },
  propriedades: {
    titulo: 'Propriedades',
    icone: 'ℹ️',
    tamanhoInicial: { largura: 360, altura: 380 },
    componente: PropriedadesObjeto,
  },
  busca: {
    titulo: 'Buscar',
    icone: '🔎',
    tamanhoInicial: { largura: 600, altura: 440 },
    componente: Busca,
  },
  relacionamentos: {
    titulo: 'Relacionamentos',
    icone: '🕸️',
    tamanhoInicial: { largura: 660, altura: 480 },
    componente: Relacionamentos,
  },
};

// Ordem fixa em que os apps aparecem nos atalhos e no menu Iniciar.
export const ORDEM_APPS: TipoApp[] = [
  'explorador',
  'busca',
  'consulta',
  'grade',
  'propriedades',
  'relacionamentos',
];
