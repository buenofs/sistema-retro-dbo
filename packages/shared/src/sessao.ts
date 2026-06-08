import type { Resposta } from './respostas';

// Usuário autenticado, exposto ao cliente. NUNCA inclui a senha.
export interface UsuarioSessao {
  login: string;
  banco: string; // nome do banco conectado (SQL_BANCO)
}

// Resposta do login e da checagem de sessão atual.
export type RespostaSessao = Resposta<UsuarioSessao>;
