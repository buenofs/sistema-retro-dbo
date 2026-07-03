import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Credenciais, UsuarioSessao } from '@dbos/shared';
import { requisitar } from '../api/cliente';

const CHAVE_SESSAO = ['sessao'] as const;

export function useSessao() {
  return useQuery({
    queryKey: CHAVE_SESSAO,
    queryFn: async (): Promise<UsuarioSessao | null> => {
      const resposta = await requisitar<UsuarioSessao>('/api/autenticacao/sessao');
      return resposta.ok ? resposta.dados : null;
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (credenciais: Credenciais): Promise<UsuarioSessao> => {
      const resposta = await requisitar<UsuarioSessao>('/api/autenticacao/login', {
        method: 'POST',
        body: JSON.stringify(credenciais),
      });
      if (!resposta.ok) throw new Error(resposta.erro.mensagem);
      return resposta.dados;
    },
    onSuccess: (usuario) => qc.setQueryData(CHAVE_SESSAO, usuario),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await requisitar('/api/autenticacao/logout', { method: 'POST' });
    },
    onSuccess: () => qc.setQueryData(CHAVE_SESSAO, null),
  });
}
