import { useQuery } from '@tanstack/react-query';
import type { Departamento, FiltrosBusca, Funcionario, Projeto } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

export function useDepartamentos() {
  return useQuery({
    queryKey: ['dominio', 'departamentos'],
    queryFn: async (): Promise<Departamento[]> => {
      const r = await requisitar<Departamento[]>('/api/dominio/departamentos');
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}

export function useProjetos() {
  return useQuery({
    queryKey: ['dominio', 'projetos'],
    queryFn: async (): Promise<Projeto[]> => {
      const r = await requisitar<Projeto[]>('/api/dominio/projetos');
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}

// Lista completa de funcionários (para o select "Relacionado a").
export function useFuncionarios() {
  return useQuery({
    queryKey: ['busca', 'todos'],
    queryFn: async (): Promise<Funcionario[]> => {
      const r = await requisitar<Funcionario[]>('/api/busca/funcionarios');
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}

export function useBusca(filtros: FiltrosBusca, habilitado: boolean) {
  return useQuery({
    queryKey: ['busca', 'resultado', filtros],
    enabled: habilitado,
    queryFn: async (): Promise<Funcionario[]> => {
      const params = new URLSearchParams();
      for (const [chave, valor] of Object.entries(filtros)) {
        if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor));
      }
      const r = await requisitar<Funcionario[]>(`/api/busca/funcionarios?${params.toString()}`);
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}
