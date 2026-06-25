import { lazy } from 'react';
import type { DefinicaoApp, TipoApp } from './tipos';
import { ExploradorObjetos } from '../aplicativos/explorador/ExploradorObjetos';
import { GradeDados } from '../aplicativos/grade/GradeDados';
import { PropriedadesObjeto } from '../aplicativos/propriedades/PropriedadesObjeto';
import { Terminal } from '../aplicativos/terminal/Terminal';
import { MonitorSQL } from '../aplicativos/monitor/MonitorSQL';
import { ExploradorArquivos } from '../aplicativos/arquivos/ExploradorArquivos';
import { Lixeira } from '../aplicativos/lixeira/Lixeira';

const EditorConsultas = lazy(() =>
  import('../aplicativos/consulta/EditorConsultas').then((modulo) => ({ default: modulo.EditorConsultas })),
);

const BlocoNotas = lazy(() =>
  import('../aplicativos/bloco/BlocoNotas').then((modulo) => ({ default: modulo.BlocoNotas })),
);

export const registroApps: Record<TipoApp, DefinicaoApp> = {
  explorador: {
    titulo: 'Explorador de Objetos',
    icone: 'folder',
    tamanhoInicial: { largura: 280, altura: 360 },
    componente: ExploradorObjetos,
  },
  consulta: {
    titulo: 'Editor de Consultas',
    icone: 'sql',
    tamanhoInicial: { largura: 560, altura: 420 },
    componente: EditorConsultas,
  },
  grade: {
    titulo: 'Grade de Dados',
    icone: 'database',
    tamanhoInicial: { largura: 640, altura: 440 },
    componente: GradeDados,
  },
  propriedades: {
    titulo: 'Propriedades',
    icone: 'props',
    tamanhoInicial: { largura: 360, altura: 380 },
    componente: PropriedadesObjeto,
  },
  terminal: {
    titulo: 'Terminal',
    icone: 'terminal',
    tamanhoInicial: { largura: 600, altura: 380 },
    componente: Terminal,
  },
  monitor: {
    titulo: 'Histórico de SQL',
    icone: 'clock',
    tamanhoInicial: { largura: 620, altura: 420 },
    componente: MonitorSQL,
  },
  arquivos: {
    titulo: 'Explorador de Arquivos',
    icone: 'folder',
    tamanhoInicial: { largura: 640, altura: 420 },
    componente: ExploradorArquivos,
  },
  bloco: {
    titulo: 'Bloco de Notas',
    icone: 'newdoc',
    tamanhoInicial: { largura: 500, altura: 380 },
    componente: BlocoNotas,
  },
  lixeira: {
    titulo: 'Lixeira',
    icone: 'trash',
    tamanhoInicial: { largura: 420, altura: 320 },
    componente: Lixeira,
  },
};

export const ORDEM_APPS: TipoApp[] = [
  'arquivos',
  'explorador',
  'consulta',
  'grade',
  'propriedades',
  'terminal',
  'monitor',
  'lixeira',
];
