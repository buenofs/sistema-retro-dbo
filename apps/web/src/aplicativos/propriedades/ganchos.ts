import { useQuery } from '@tanstack/react-query';
import type { PropriedadesObjeto } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

export function usePropriedades(esquema: string, tabela: string) {
  return useQuery({
    queryKey: ['propriedades', esquema, tabela],
    queryFn: async (): Promise<PropriedadesObjeto> => {
      const params = new URLSearchParams({ esquema, tabela });
      const r = await requisitar<PropriedadesObjeto>(`/api/propriedades?${params.toString()}`);
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}
