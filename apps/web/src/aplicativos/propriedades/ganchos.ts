import { useQuery } from '@tanstack/react-query';
import type { PropriedadesObjeto } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

export function usePropriedades(esquema: string, tabela: string) {
  return useQuery({
    queryKey: ['propriedades', esquema, tabela],
    queryFn: async (): Promise<PropriedadesObjeto> => {
      const params = new URLSearchParams({ esquema, tabela });
      const resposta = await requisitar<PropriedadesObjeto>(
        `/api/propriedades?${params.toString()}`,
      );
      if (!resposta.ok) throw new Error(resposta.erro.mensagem);
      return resposta.dados;
    },
  });
}
