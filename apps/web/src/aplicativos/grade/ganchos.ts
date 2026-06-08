import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ResultadoGrade, ValorCelula } from '@dbos/shared';
import { requisitar } from '../../api/cliente';
import { ErroApiError } from '../consulta/ganchos';

const chaveTabela = (esquema: string, tabela: string) => ['grade', esquema, tabela] as const;

export function useLinhas(esquema: string, tabela: string, pagina: number, tamanho: number) {
  return useQuery({
    queryKey: [...chaveTabela(esquema, tabela), pagina, tamanho],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ResultadoGrade> => {
      const params = new URLSearchParams({
        esquema,
        tabela,
        pagina: String(pagina),
        tamanho: String(tamanho),
      });
      const r = await requisitar<ResultadoGrade>(`/api/grade/linhas?${params.toString()}`);
      if (!r.ok) throw new ErroApiError(r.erro);
      return r.dados;
    },
  });
}

type Mutacao = { linhasAfetadas: number };

function usarInvalidacao(esquema: string, tabela: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: chaveTabela(esquema, tabela) });
}

export function useInserirLinha(esquema: string, tabela: string) {
  const invalidar = usarInvalidacao(esquema, tabela);
  return useMutation({
    mutationFn: async (valores: Record<string, ValorCelula>): Promise<Mutacao> => {
      const r = await requisitar<Mutacao>('/api/grade/linha', {
        method: 'POST',
        body: JSON.stringify({ esquema, tabela, valores }),
      });
      if (!r.ok) throw new ErroApiError(r.erro);
      return r.dados;
    },
    onSuccess: invalidar,
  });
}

export function useAtualizarLinha(esquema: string, tabela: string) {
  const invalidar = usarInvalidacao(esquema, tabela);
  return useMutation({
    mutationFn: async (entrada: {
      chave: Record<string, ValorCelula>;
      valores: Record<string, ValorCelula>;
    }): Promise<Mutacao> => {
      const r = await requisitar<Mutacao>('/api/grade/linha', {
        method: 'PUT',
        body: JSON.stringify({ esquema, tabela, ...entrada }),
      });
      if (!r.ok) throw new ErroApiError(r.erro);
      return r.dados;
    },
    onSuccess: invalidar,
  });
}

export function useRemoverLinha(esquema: string, tabela: string) {
  const invalidar = usarInvalidacao(esquema, tabela);
  return useMutation({
    mutationFn: async (chave: Record<string, ValorCelula>): Promise<Mutacao> => {
      const r = await requisitar<Mutacao>('/api/grade/linha', {
        method: 'DELETE',
        body: JSON.stringify({ esquema, tabela, chave }),
      });
      if (!r.ok) throw new ErroApiError(r.erro);
      return r.dados;
    },
    onSuccess: invalidar,
  });
}
