import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Credenciais, UsuarioSessao } from '@dbos/shared';
import { requisitar, mandar } from '../api/cliente';

const CHAVE_SESSAO = ['sessao'] as const;

// Consulta a sessão atual: devolve o usuário ou null (não autenticado).
// Usa `requisitar` cru de propósito — precisa do ramo ok/null, sem lançar.
export function useSessao() {
  return useQuery({
    queryKey: CHAVE_SESSAO,
    queryFn: async (): Promise<UsuarioSessao | null> => {
      const resposta = await requisitar<UsuarioSessao>('/api/autenticacao/sessao');
      return resposta.ok ? resposta.dados : null;
    },
  });
}

// Login: em erro, ErroApiError leva a mensagem pt-BR à tela.
export function useLogin() {
  const clienteQuery = useQueryClient();
  return useMutation({
    mutationFn: (credenciais: Credenciais) =>
      mandar<UsuarioSessao>('/api/autenticacao/login', 'POST', credenciais),
    onSuccess: (usuario) => clienteQuery.setQueryData(CHAVE_SESSAO, usuario),
  });
}

// Logout fire-and-forget: zera a sessão no cache ao concluir.
// Mantém `requisitar` cru porque não deve lançar em falha.
export function useLogout() {
  const clienteQuery = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await requisitar('/api/autenticacao/logout', { method: 'POST' });
    },
    onSuccess: () => clienteQuery.setQueryData(CHAVE_SESSAO, null),
  });
}
