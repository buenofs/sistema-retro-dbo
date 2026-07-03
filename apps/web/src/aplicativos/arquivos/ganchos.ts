import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComandoSQL, Drive, Item, ItemArvore, UsoDrive } from '@dbos/shared';
import { requisitar } from '../../api/cliente';
import { ErroApiError } from '../consulta/ganchos';

export type Envelope<T> = { dados: T; sql: ComandoSQL[] };

async function pegar<T>(caminho: string): Promise<Envelope<T>> {
  const resposta = await requisitar<Envelope<T>>(caminho);
  if (!resposta.ok) throw new ErroApiError(resposta.erro);
  return resposta.dados;
}

async function mandar<T>(caminho: string, method: string, corpo?: unknown): Promise<Envelope<T>> {
  const resposta = await requisitar<Envelope<T>>(caminho, {
    method,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new ErroApiError(resposta.erro);
  return resposta.dados;
}

export function useDrives() {
  return useQuery({
    queryKey: ['arquivos', 'drives'],
    queryFn: () => pegar<Drive[]>('/api/arquivos/drives').then((e) => e.dados),
  });
}

export function useConteudo(driveId: number, paiId: number | null) {
  const q = new URLSearchParams({ driveId: String(driveId) });
  if (paiId !== null) q.set('paiId', String(paiId));
  return useQuery({
    queryKey: ['arquivos', 'conteudo', driveId, paiId],
    queryFn: () => pegar<Item[]>(`/api/arquivos/listar?${q.toString()}`).then((e) => e.dados),
  });
}

export function useArvore(driveId: number) {
  return useQuery({
    queryKey: ['arquivos', 'arvore', driveId],
    queryFn: () =>
      pegar<ItemArvore[]>(`/api/arquivos/arvore?driveId=${driveId}`).then((e) => e.dados),
  });
}

export function useLixeira() {
  return useQuery({
    queryKey: ['arquivos', 'lixeira'],
    queryFn: () => pegar<Item[]>('/api/arquivos/lixeira').then((e) => e.dados),
  });
}

export function useUso() {
  return useQuery({
    queryKey: ['arquivos', 'uso'],
    queryFn: () => pegar<UsoDrive[]>('/api/arquivos/uso').then((e) => e.dados),
  });
}

export function useItem(id: number) {
  return useQuery({
    queryKey: ['arquivos', 'item', id],
    queryFn: () =>
      pegar<{ id: number; nome: string; conteudo: string }>(`/api/arquivos/${id}`).then(
        (e) => e.dados,
      ),
    enabled: id > 0,
  });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['arquivos'] });
}

export function useCriarPasta() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (v: { nome: string; paiId: number | null; driveId: number }) =>
      mandar<{ id: number }>('/api/arquivos/pasta', 'POST', v),
    onSuccess: inv,
  });
}

export function useCriarArquivo() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (v: { nome: string; paiId: number | null; driveId: number; conteudo?: string }) =>
      mandar<{ id: number }>('/api/arquivos/arquivo', 'POST', v),
    onSuccess: inv,
  });
}

export function useRenomear() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (v: { id: number; nome: string }) =>
      mandar<{ id: number }>(`/api/arquivos/${v.id}/renomear`, 'PUT', { nome: v.nome }),
    onSuccess: inv,
  });
}

export function useMover() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (v: { id: number; paiId: number | null }) =>
      mandar<{ id: number }>(`/api/arquivos/${v.id}/mover`, 'PUT', { paiId: v.paiId }),
    onSuccess: inv,
  });
}

export function useCopiar() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (v: { id: number; paiId: number | null }) =>
      mandar<{ id: number }>(`/api/arquivos/${v.id}/copiar`, 'POST', { paiId: v.paiId }),
    onSuccess: inv,
  });
}

export function useApagar() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (id: number) => mandar<{ id: number }>(`/api/arquivos/${id}`, 'DELETE'),
    onSuccess: inv,
  });
}

export function useRestaurar() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (id: number) => mandar<{ id: number }>(`/api/arquivos/${id}/restaurar`, 'PUT'),
    onSuccess: inv,
  });
}

export function useEsvaziarLixeira() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: () => mandar<Record<string, never>>('/api/arquivos/lixeira', 'DELETE'),
    onSuccess: inv,
  });
}

export function useSalvarConteudo() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (v: { id: number; conteudo: string }) =>
      mandar<{ id: number }>(`/api/arquivos/${v.id}/conteudo`, 'PUT', { conteudo: v.conteudo }),
    onSuccess: inv,
  });
}
