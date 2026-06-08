import type { Resposta } from './respostas';

// Usuário autenticado, exposto ao cliente. NUNCA inclui a senha.
export interface UsuarioSessao {
  login: string;
}

// Resposta do login e da checagem de sessão atual.
export type RespostaSessao = Resposta<UsuarioSessao>;
