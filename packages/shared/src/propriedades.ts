import type { Resposta } from './respostas';
import type { TipoObjeto } from './explorador';

export interface IndiceBanco {
  nome: string;
  tipo: string;
  unico: boolean;
  chavePrimaria: boolean;
  colunas: string[];
}

export interface PropriedadesObjeto {
  esquema: string;
  nome: string;
  tipo: TipoObjeto;
  totalColunas: number;
  totalLinhas: number;
  criadoEm: string | null;
  modificadoEm: string | null;
  indices: IndiceBanco[];
}

export type RespostaPropriedades = Resposta<PropriedadesObjeto>;
