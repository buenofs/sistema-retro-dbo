import { z } from 'zod';
import type { Resposta } from './respostas';

// Resultado de uma execução de SQL pass-through.
export interface ResultadoConsulta {
  colunas: string[]; // nomes das colunas, em ordem
  linhas: unknown[][]; // cada linha é um array na ordem de `colunas`
  linhasAfetadas: number; // soma de rowsAffected (INSERT/UPDATE/DELETE)
  truncado: boolean; // true se o teto de linhas foi atingido
  totalLinhas: number; // total retornado antes do corte
}

export type RespostaConsulta = Resposta<ResultadoConsulta>;

// Corpo de POST /api/consulta. Limite generoso só pra barrar payload absurdo.
export const esquemaConsulta = z.object({
  sql: z.string().min(1, 'Informe o SQL.').max(100_000),
});
export type Consulta = z.infer<typeof esquemaConsulta>;
