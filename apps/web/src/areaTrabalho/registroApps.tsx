import { lazy } from 'react';
import type { DefinicaoApp, TipoApp } from './tipos';
import { ExploradorObjetos } from '../aplicativos/explorador/ExploradorObjetos';
import { GradeDados } from '../aplicativos/grade/GradeDados';
import { PropriedadesObjeto } from '../aplicativos/propriedades/PropriedadesObjeto';
import { Busca } from '../aplicativos/busca/Busca';
import { Relacionamentos } from '../aplicativos/relacionamentos/Relacionamentos';
import { Terminal } from '../aplicativos/terminal/Terminal';
import { ExploradorArquivos } from '../aplicativos/arquivos/ExploradorArquivos';

const EditorConsultas = lazy(() =>
  import('../aplicativos/consulta/EditorConsultas').then((m) => ({ default: m.EditorConsultas })),
);

const RelatorioFolha = lazy(() =>
  import('../aplicativos/folha/RelatorioFolha').then((m) => ({ default: m.RelatorioFolha })),
);

const BlocoNotas = lazy(() =>
  import('../aplicativos/bloco/BlocoNotas').then((m) => ({ default: m.BlocoNotas })),
);

// O WM é genérico: cada tipoApp mapeia para metadados + um componente.
// Adicionar um app futuro = registrar o componente real aqui.
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
    icone: 'grid',
    tamanhoInicial: { largura: 640, altura: 440 },
    componente: GradeDados,
  },
  propriedades: {
    titulo: 'Propriedades',
    icone: 'props',
    tamanhoInicial: { largura: 360, altura: 380 },
    componente: PropriedadesObjeto,
  },
  busca: {
    titulo: 'Buscar',
    icone: 'search',
    tamanhoInicial: { largura: 600, altura: 440 },
    componente: Busca,
  },
  relacionamentos: {
    titulo: 'Relacionamentos',
    icone: 'network',
    tamanhoInicial: { largura: 660, altura: 480 },
    componente: Relacionamentos,
  },
  terminal: {
    titulo: 'Terminal',
    icone: 'terminal',
    tamanhoInicial: { largura: 600, altura: 380 },
    componente: Terminal,
  },
  relatorio: {
    titulo: 'Relatório (Folha)',
    icone: 'report',
    tamanhoInicial: { largura: 600, altura: 480 },
    componente: RelatorioFolha,
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
};

// Ordem fixa em que os apps aparecem nos atalhos e no menu Iniciar.
export const ORDEM_APPS: TipoApp[] = [
  'arquivos',
  'explorador',
  'busca',
  'consulta',
  'grade',
  'propriedades',
  'relacionamentos',
  'terminal',
  'relatorio',
];
