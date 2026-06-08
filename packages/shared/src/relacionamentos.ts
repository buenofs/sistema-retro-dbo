import { z } from 'zod';
import type { Resposta } from './respostas';

export type TipoNo = 'funcionario' | 'departamento' | 'projeto' | 'folha';

export interface NoGrafo {
  id: string; // ex.: 'funcionario:1', 'departamento:1'
  tipo: TipoNo;
  rotulo: string;
}

export interface ArestaGrafo {
  de: string;
  para: string;
  rotulo?: string;
}

export interface GrafoRelacionamentos {
  centro: string; // id do nó em foco
  nos: NoGrafo[];
  arestas: ArestaGrafo[];
}

export const esquemaRefRelacionamento = z.object({
  tipo: z.enum(['funcionario', 'departamento', 'projeto']),
  id: z.coerce.number().int().positive(),
});
export type RefRelacionamento = z.infer<typeof esquemaRefRelacionamento>;

export type RespostaRelacionamentos = Resposta<GrafoRelacionamentos>;
