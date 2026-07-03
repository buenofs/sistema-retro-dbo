import { z } from 'zod';
import type { Resposta } from './respostas';

export type TipoObjeto = 'tabela' | 'view';

export interface ObjetoBanco {
  esquema: string;
  nome: string;
  tipo: TipoObjeto;
}

export interface ColunaBanco {
  nome: string;
  tipoDado: string; // ex.: 'int', 'nvarchar(50)', 'decimal(18,2)'
  anulavel: boolean;
  ehChavePrimaria: boolean;
}

export const esquemaRefObjeto = z.object({
  esquema: z.string().min(1).max(128),
  tabela: z.string().min(1).max(128),
});
export type RefObjeto = z.infer<typeof esquemaRefObjeto>;

export type RespostaObjetos = Resposta<ObjetoBanco[]>;
export type RespostaColunas = Resposta<ColunaBanco[]>;
