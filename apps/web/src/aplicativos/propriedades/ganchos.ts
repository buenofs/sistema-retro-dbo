import { useQuery } from '@tanstack/react-query';
import type { PropriedadesObjeto } from '@dbos/shared';
import { pegar } from '../../api/cliente';

export function usePropriedades(esquema: string, tabela: string) {
  return useQuery({
    queryKey: ['propriedades', esquema, tabela],
    queryFn: () => {
      const params = new URLSearchParams({ esquema, tabela });
      return pegar<PropriedadesObjeto>(`/api/propriedades?${params.toString()}`);
    },
  });
}
