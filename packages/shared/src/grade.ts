import { z } from 'zod';
import type { Resposta } from './respostas';
import type { ColunaBanco } from './explorador';

// Valor de uma célula trafegado entre web e server.
export type ValorCelula = string | number | boolean | null;

export interface ResultadoGrade {
  colunas: ColunaBanco[];
  chavePrimaria: string[]; // nomes das colunas PK
  linhas: Record<string, unknown>[]; // cada linha é um objeto coluna->valor
  total: number; // total de linhas na tabela (COUNT)
  pagina: number; // base 0
  tamanho: number;
}

export type RespostaGrade = Resposta<ResultadoGrade>;
export type RespostaMutacaoGrade = Resposta<{ linhasAfetadas: number }>;

const valorCelula = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const esquemaPaginaGrade = z.object({
  esquema: z.string().min(1).max(128),
  tabela: z.string().min(1).max(128),
  pagina: z.coerce.number().int().min(0).default(0),
  tamanho: z.coerce.number().int().min(1).max(500).default(100),
});
export type PaginaGrade = z.infer<typeof esquemaPaginaGrade>;

export const esquemaInsercao = z.object({
  esquema: z.string().min(1).max(128),
  tabela: z.string().min(1).max(128),
  valores: z.record(valorCelula),
});
export type Insercao = z.infer<typeof esquemaInsercao>;

export const esquemaAtualizacao = z.object({
  esquema: z.string().min(1).max(128),
  tabela: z.string().min(1).max(128),
  chave: z.record(valorCelula),
  valores: z.record(valorCelula),
});
export type Atualizacao = z.infer<typeof esquemaAtualizacao>;

export const esquemaRemocao = z.object({
  esquema: z.string().min(1).max(128),
  tabela: z.string().min(1).max(128),
  chave: z.record(valorCelula),
});
export type Remocao = z.infer<typeof esquemaRemocao>;
