import type { Resposta } from './respostas';
import type { TipoObjeto } from './explorador';

export interface IndiceBanco {
  nome: string;
  tipo: string; // type_desc do SQL Server: CLUSTERED / NONCLUSTERED / ...
  unico: boolean;
  chavePrimaria: boolean;
  colunas: string[]; // colunas-chave do índice, em ordem
}

export interface PropriedadesObjeto {
  esquema: string;
  nome: string;
  tipo: TipoObjeto;
  totalColunas: number;
  totalLinhas: number; // aproximado (sys.partitions); 0 para views
  criadoEm: string | null; // ISO
  modificadoEm: string | null; // ISO
  indices: IndiceBanco[];
}

export type RespostaPropriedades = Resposta<PropriedadesObjeto>;
