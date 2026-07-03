import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Drive, Item, UsoDrive } from '@dbos/shared';
import { pegar, mandar, type Envelope } from '../../api/cliente';

export function useDrives() {
  return useQuery({
    queryKey: ['arquivos', 'drives'],
    queryFn: () => pegar<Envelope<Drive[]>>('/api/arquivos/drives').then((envelope) => envelope.dados),
  });
}

export function useConteudo(driveId: number, paiId: number | null) {
  const params = new URLSearchParams({ driveId: String(driveId) });
  if (paiId !== null) params.set('paiId', String(paiId));
  return useQuery({
    queryKey: ['arquivos', 'conteudo', driveId, paiId],
    queryFn: () => pegar<Envelope<Item[]>>(`/api/arquivos/listar?${params.toString()}`).then((envelope) => envelope.dados),
  });
}

export function useLixeira() {
  return useQuery({
    queryKey: ['arquivos', 'lixeira'],
    queryFn: () => pegar<Envelope<Item[]>>('/api/arquivos/lixeira').then((envelope) => envelope.dados),
  });
}

export function useUso() {
  return useQuery({
    queryKey: ['arquivos', 'uso'],
    queryFn: () => pegar<Envelope<UsoDrive[]>>('/api/arquivos/uso').then((envelope) => envelope.dados),
  });
}

export function useItem(id: number) {
  return useQuery({
    queryKey: ['arquivos', 'item', id],
    queryFn: () => pegar<Envelope<{ id: number; nome: string; conteudo: string }>>(`/api/arquivos/${id}`).then((envelope) => envelope.dados),
    enabled: id > 0,
  });
}

function useInvalidar() {
  const clienteQuery = useQueryClient();
  return () => clienteQuery.invalidateQueries({ queryKey: ['arquivos'] });
}

export function useCriarPasta() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (valores: { nome: string; paiId: number | null; driveId: number }) =>
      mandar<Envelope<{ id: number }>>('/api/arquivos/pasta', 'POST', valores),
    onSuccess: invalidar,
  });
}

export function useCriarArquivo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (valores: { nome: string; paiId: number | null; driveId: number; conteudo?: string }) =>
      mandar<Envelope<{ id: number }>>('/api/arquivos/arquivo', 'POST', valores),
    onSuccess: invalidar,
  });
}

export function useRenomear() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (valores: { id: number; nome: string }) =>
      mandar<Envelope<{ id: number }>>(`/api/arquivos/${valores.id}/renomear`, 'PUT', { nome: valores.nome }),
    onSuccess: invalidar,
  });
}

export function useMover() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (valores: { id: number; paiId: number | null }) =>
      mandar<Envelope<{ id: number }>>(`/api/arquivos/${valores.id}/mover`, 'PUT', { paiId: valores.paiId }),
    onSuccess: invalidar,
  });
}

export function useCopiar() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (valores: { id: number; paiId: number | null }) =>
      mandar<Envelope<{ id: number }>>(`/api/arquivos/${valores.id}/copiar`, 'POST', { paiId: valores.paiId }),
    onSuccess: invalidar,
  });
}

export function useApagar() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: number) => mandar<Envelope<{ id: number }>>(`/api/arquivos/${id}`, 'DELETE'),
    onSuccess: invalidar,
  });
}

export function useRestaurar() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: number) => mandar<Envelope<{ id: number }>>(`/api/arquivos/${id}/restaurar`, 'PUT'),
    onSuccess: invalidar,
  });
}

export function useEsvaziarLixeira() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: () => mandar<Envelope<Record<string, never>>>('/api/arquivos/lixeira', 'DELETE'),
    onSuccess: invalidar,
  });
}

export function useSalvarConteudo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (valores: { id: number; conteudo: string }) =>
      mandar<Envelope<{ id: number }>>(`/api/arquivos/${valores.id}/conteudo`, 'PUT', { conteudo: valores.conteudo }),
    onSuccess: invalidar,
  });
}
