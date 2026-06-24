import { useQuery } from '@tanstack/react-query';
import type { ColunaBanco, ObjetoBanco } from '@dbos/shared';
import { pegar } from '../../api/cliente';

// Lista de objetos do banco. Em erro, ErroApiError leva a mensagem pt-BR à tela.
export function useObjetos() {
  return useQuery({
    queryKey: ['explorador', 'objetos'],
    queryFn: () => pegar<ObjetoBanco[]>('/api/explorador/objetos'),
  });
}

// Colunas de um objeto. Chave estruturada (spec §6.2) → cache por objeto.
export function useColunas(esquema: string, tabela: string) {
  return useQuery({
    queryKey: ['explorador', 'colunas', esquema, tabela],
    queryFn: () => {
      const params = new URLSearchParams({ esquema, tabela });
      return pegar<ColunaBanco[]>(`/api/explorador/colunas?${params.toString()}`);
    },
  });
}
