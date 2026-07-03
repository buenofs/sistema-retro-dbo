import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ResultadoGrade, ValorCelula } from '@dbos/shared';
import { pegar, mandar } from '../../api/cliente';

const chaveTabela = (esquema: string, tabela: string) => ['grade', esquema, tabela] as const;

export function useLinhas(esquema: string, tabela: string, pagina: number, tamanho: number) {
  return useQuery({
    queryKey: [...chaveTabela(esquema, tabela), pagina, tamanho],
    placeholderData: keepPreviousData,
    queryFn: () => {
      const params = new URLSearchParams({ esquema, tabela, pagina: String(pagina), tamanho: String(tamanho) });
      return pegar<ResultadoGrade>(`/api/grade/linhas?${params.toString()}`);
    },
  });
}

type Mutacao = { linhasAfetadas: number };

function useInvalidar(esquema: string, tabela: string) {
  const clienteQuery = useQueryClient();
  return () => clienteQuery.invalidateQueries({ queryKey: chaveTabela(esquema, tabela) });
}

export function useInserirLinha(esquema: string, tabela: string) {
  const invalidar = useInvalidar(esquema, tabela);
  return useMutation({
    mutationFn: (valores: Record<string, ValorCelula>) =>
      mandar<Mutacao>('/api/grade/linha', 'POST', { esquema, tabela, valores }),
    onSuccess: invalidar,
  });
}

export function useAtualizarLinha(esquema: string, tabela: string) {
  const invalidar = useInvalidar(esquema, tabela);
  return useMutation({
    mutationFn: (entrada: { chave: Record<string, ValorCelula>; valores: Record<string, ValorCelula> }) =>
      mandar<Mutacao>('/api/grade/linha', 'PUT', { esquema, tabela, ...entrada }),
    onSuccess: invalidar,
  });
}

export function useRemoverLinha(esquema: string, tabela: string) {
  const invalidar = useInvalidar(esquema, tabela);
  return useMutation({
    mutationFn: (chave: Record<string, ValorCelula>) =>
      mandar<Mutacao>('/api/grade/linha', 'DELETE', { esquema, tabela, chave }),
    onSuccess: invalidar,
  });
}
