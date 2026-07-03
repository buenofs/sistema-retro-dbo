import { z } from 'zod';
import type { Resposta } from './respostas';

export interface ResultadoConsulta {
  colunas: string[]; // nomes das colunas, em ordem
  linhas: unknown[][]; // cada linha é um array na ordem de `colunas`
  linhasAfetadas: number; // soma de rowsAffected (INSERT/UPDATE/DELETE)
  truncado: boolean; // true se o teto de linhas foi atingido
  totalLinhas: number; // total retornado antes do corte
}

export type RespostaConsulta = Resposta<ResultadoConsulta>;

export const esquemaConsulta = z.object({
  sql: z.string().min(1, 'Informe o SQL.').max(100_000),
});
export type Consulta = z.infer<typeof esquemaConsulta>;
