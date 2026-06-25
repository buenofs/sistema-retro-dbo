import { z } from 'zod';
import type { Resposta } from './respostas';

export interface ResultadoConsulta {
  colunas: string[];
  linhas: unknown[][];
  linhasAfetadas: number;
  truncado: boolean;
  totalLinhas: number;
}

export type RespostaConsulta = Resposta<ResultadoConsulta>;

/** Corpo de POST /api/consulta; max 100 000 chars para barrar payloads absurdos. */
export const esquemaConsulta = z.object({
  sql: z.string().min(1, 'Informe o SQL.').max(100_000),
});
export type Consulta = z.infer<typeof esquemaConsulta>;
