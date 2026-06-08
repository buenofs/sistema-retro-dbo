import { useQuery } from '@tanstack/react-query';
import type { GrafoRelacionamentos, RefRelacionamento } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

export function useGrafo(ref: RefRelacionamento) {
  return useQuery({
    queryKey: ['relacionamentos', ref.tipo, ref.id],
    queryFn: async (): Promise<GrafoRelacionamentos> => {
      const params = new URLSearchParams({ tipo: ref.tipo, id: String(ref.id) });
      const r = await requisitar<GrafoRelacionamentos>(`/api/relacionamentos?${params.toString()}`);
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}
