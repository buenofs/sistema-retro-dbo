import type { Resposta } from './respostas';

/** Usuário autenticado exposto ao cliente; nunca inclui a senha. */
export interface UsuarioSessao {
  login: string;
  banco: string;
}

export type RespostaSessao = Resposta<UsuarioSessao>;
