import { z } from 'zod';
import type { Resposta } from './respostas';

export type TipoItem = 'pasta' | 'arquivo';

export interface Item {
  id: number;
  nome: string;
  tipo: TipoItem;
  paiId: number | null;
  driveId: number;
  donoId: number;
  tamanhoBytes: number | null;
  criadoEm: string;
  modificadoEm: string | null;
}

export interface Drive {
  id: number;
  letra: string;
  rotulo: string;
  capacidadeBytes: number;
}

export interface UsoDrive {
  driveId: number;
  letra: string;
  rotulo: string;
  capacidadeBytes: number;
  usadoBytes: number;
  livreBytes: number;
}

export type TipoComando = 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';

export interface ComandoSQL {
  acao: string;
  tipo: TipoComando;
  texto: string;
  parametros: Record<string, unknown>;
  linhasAfetadas: number;
  erro?: string;
  em: string; // ISO
}

export type RespostaArquivos<T> = Resposta<{ dados: T; sql: ComandoSQL[] }>;

const nome = z.string().min(1).max(255);
const paiOpcional = z.number().int().positive().nullable();

export const esquemaCriarPasta = z.object({
  nome,
  paiId: paiOpcional,
  driveId: z.number().int().positive(),
});
export type CriarPasta = z.infer<typeof esquemaCriarPasta>;

export const esquemaCriarArquivo = z.object({
  nome,
  paiId: paiOpcional,
  driveId: z.number().int().positive(),
  conteudo: z.string().default(''),
});
export type CriarArquivo = z.infer<typeof esquemaCriarArquivo>;

export const esquemaRenomear = z.object({ nome });
export type Renomear = z.infer<typeof esquemaRenomear>;

export const esquemaMover = z.object({ paiId: paiOpcional });
export type Mover = z.infer<typeof esquemaMover>;

export const esquemaConteudo = z.object({ conteudo: z.string() });
export type Conteudo = z.infer<typeof esquemaConteudo>;

export const esquemaCopiar = z.object({ paiId: paiOpcional });
export type Copiar = z.infer<typeof esquemaCopiar>;

export const esquemaListar = z.object({
  driveId: z.coerce.number().int().positive(),
  paiId: z.coerce.number().int().positive().optional(), // ausente = raiz do drive
});
export type Listar = z.infer<typeof esquemaListar>;
