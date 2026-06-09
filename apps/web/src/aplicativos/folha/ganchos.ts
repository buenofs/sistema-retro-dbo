import { useQuery } from '@tanstack/react-query';
import type { RelatorioFolha } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

export function useRelatorioFolha() {
  return useQuery({
    queryKey: ['folha', 'relatorio'],
    queryFn: async (): Promise<RelatorioFolha> => {
      const r = await requisitar<RelatorioFolha>('/api/folha/relatorio');
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}
