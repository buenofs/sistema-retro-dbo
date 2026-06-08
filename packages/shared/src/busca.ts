import { z } from 'zod';
import type { Resposta } from './respostas';
import type { Funcionario } from './dominio';

export const esquemaBusca = z.object({
  nome: z.string().trim().min(1).max(100).optional(),
  departamentoId: z.coerce.number().int().positive().optional(),
  salarioOp: z.enum(['gt', 'lt', 'eq', 'entre']).optional(),
  salario: z.coerce.number().optional(),
  salario2: z.coerce.number().optional(), // limite superior quando salarioOp = 'entre'
  projetoId: z.coerce.number().int().positive().optional(),
  relacionadoA: z.coerce.number().int().positive().optional(),
});
export type FiltrosBusca = z.infer<typeof esquemaBusca>;

export type ResultadoBusca = Funcionario[];
export type RespostaBusca = Resposta<ResultadoBusca>;
