import { useQuery } from '@tanstack/react-query';
import type { ColunaBanco, ObjetoBanco } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

// Lista de objetos do banco. Em erro, lança a mensagem pt-BR para a tela exibir.
export function useObjetos() {
  return useQuery({
    queryKey: ['explorador', 'objetos'],
    queryFn: async (): Promise<ObjetoBanco[]> => {
      const r = await requisitar<ObjetoBanco[]>('/api/explorador/objetos');
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}

// Colunas de um objeto. Chave estruturada (spec §6.2) → cache por objeto.
export function useColunas(esquema: string, tabela: string) {
  return useQuery({
    queryKey: ['explorador', 'colunas', esquema, tabela],
    queryFn: async (): Promise<ColunaBanco[]> => {
      const params = new URLSearchParams({ esquema, tabela });
      const r = await requisitar<ColunaBanco[]>(
        `/api/explorador/colunas?${params.toString()}`,
      );
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}
