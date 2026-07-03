import { useQuery } from '@tanstack/react-query';
import type { ColunaBanco, ObjetoBanco } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

export function useObjetos() {
  return useQuery({
    queryKey: ['explorador', 'objetos'],
    queryFn: async (): Promise<ObjetoBanco[]> => {
      const resposta = await requisitar<ObjetoBanco[]>('/api/explorador/objetos');
      if (!resposta.ok) throw new Error(resposta.erro.mensagem);
      return resposta.dados;
    },
  });
}

export function useColunas(esquema: string, tabela: string) {
  return useQuery({
    queryKey: ['explorador', 'colunas', esquema, tabela],
    queryFn: async (): Promise<ColunaBanco[]> => {
      const params = new URLSearchParams({ esquema, tabela });
      const resposta = await requisitar<ColunaBanco[]>(
        `/api/explorador/colunas?${params.toString()}`,
      );
      if (!resposta.ok) throw new Error(resposta.erro.mensagem);
      return resposta.dados;
    },
  });
}
