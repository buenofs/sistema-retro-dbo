import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Credenciais, UsuarioSessao } from '@dbos/shared';
import { requisitar } from '../api/cliente';

const CHAVE_SESSAO = ['sessao'] as const;

export function useSessao() {
  return useQuery({
    queryKey: CHAVE_SESSAO,
    queryFn: async (): Promise<UsuarioSessao | null> => {
      const r = await requisitar<UsuarioSessao>('/api/autenticacao/sessao');
      return r.ok ? r.dados : null;
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (credenciais: Credenciais): Promise<UsuarioSessao> => {
      const r = await requisitar<UsuarioSessao>('/api/autenticacao/login', {
        method: 'POST',
        body: JSON.stringify(credenciais),
      });
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
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
