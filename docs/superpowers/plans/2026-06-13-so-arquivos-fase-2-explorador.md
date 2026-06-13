# SO de Arquivos — Fase 2: Explorador de Arquivos (GUI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a GUI amigável do sistema de arquivos — Explorador (árvore + conteúdo + ações por menu, sem pedir IDs) e Bloco de Notas — consumindo a API `/api/arquivos/*` da Fase 1.

**Architecture:** Um store global de contexto (`useContextoArquivos`) guarda o drive e o usuário atuais. Hooks React Query em `ganchos.ts` desembrulham o envelope `{ dados, sql }` da Fase 1. O Explorador navega por estado local de pasta atual; ações (criar/renomear/mover/apagar/copiar) usam mutations que invalidam `['arquivos']`. Apps novos são registrados no WM existente sem tocar no RH (removido só na Fase 4).

**Tech Stack:** React 18, TanStack Query, Zustand, Vitest + Testing Library.

**Pré-requisito:** Fase 1 concluída (API `/api/arquivos/*` no ar; envelope `{ ok, dados: { dados, sql } }`).

---

## File Structure

- Create: `apps/web/src/aplicativos/arquivos/contexto.ts` — store de drive/usuário atual.
- Create: `apps/web/src/aplicativos/arquivos/ganchos.ts` — hooks de leitura e mutação.
- Create: `apps/web/src/aplicativos/arquivos/ExploradorArquivos.tsx` — a janela principal.
- Create: `apps/web/src/aplicativos/arquivos/arquivos.css` — estilos.
- Create: `apps/web/src/aplicativos/bloco/BlocoNotas.tsx` — editor de texto.
- Modify: `apps/web/src/areaTrabalho/tipos.ts` — adiciona `'arquivos'`, `'bloco'` ao `TipoApp`.
- Modify: `apps/web/src/areaTrabalho/registroApps.tsx` — registra os dois apps + ORDEM_APPS.

---

## Task 1: Store de contexto

**Files:**
- Create: `apps/web/src/aplicativos/arquivos/contexto.ts`
- Create (test): `apps/web/src/aplicativos/arquivos/contexto.test.ts`

- [ ] **Step 1: Escrever o teste**

`apps/web/src/aplicativos/arquivos/contexto.test.ts`:

```typescript
import { test, expect } from 'vitest';
import { useContextoArquivos } from './contexto';

test('drive inicial é 1 e definirDrive troca', () => {
  expect(useContextoArquivos.getState().driveId).toBe(1);
  useContextoArquivos.getState().definirDrive(2);
  expect(useContextoArquivos.getState().driveId).toBe(2);
  useContextoArquivos.getState().definirDrive(1); // reset p/ não vazar entre testes
});
```

- [ ] **Step 2: Rodar para falhar**

Run: `cd apps/web && npx vitest run src/aplicativos/arquivos/contexto.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `contexto.ts`**

```typescript
import { create } from 'zustand';

// Onde o usuário está no SO: drive atual e usuário dono. Compartilhado entre
// Explorador e Terminal (Fase 3).
interface ContextoArquivos {
  driveId: number;
  donoId: number;
  definirDrive: (id: number) => void;
}

export const useContextoArquivos = create<ContextoArquivos>((set) => ({
  driveId: 1,
  donoId: 1,
  definirDrive: (id) => set({ driveId: id }),
}));
```

- [ ] **Step 4: Rodar para passar**

Run: `cd apps/web && npx vitest run src/aplicativos/arquivos/contexto.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/aplicativos/arquivos/contexto.ts apps/web/src/aplicativos/arquivos/contexto.test.ts
git commit -m "feat(web): store de contexto do sistema de arquivos"
```

---

## Task 2: Hooks de dados (`ganchos.ts`)

**Files:**
- Create: `apps/web/src/aplicativos/arquivos/ganchos.ts`

Sem teste unitário próprio (são wrappers finos do React Query; cobertos pelos testes de componente). Reusa `ErroApiError` de `../consulta/ganchos`.

- [ ] **Step 1: Implementar `ganchos.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComandoSQL, Drive, Item, ItemArvore, UsoDrive } from '@dbos/shared';
import { requisitar } from '../../api/cliente';
import { ErroApiError } from '../consulta/ganchos';

// Envelope da Fase 1: payload + o SQL que rodou.
export type Envelope<T> = { dados: T; sql: ComandoSQL[] };

async function pegar<T>(caminho: string): Promise<Envelope<T>> {
  const r = await requisitar<Envelope<T>>(caminho);
  if (!r.ok) throw new ErroApiError(r.erro);
  return r.dados;
}

async function mandar<T>(caminho: string, method: string, corpo?: unknown): Promise<Envelope<T>> {
  const r = await requisitar<Envelope<T>>(caminho, {
    method,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!r.ok) throw new ErroApiError(r.erro);
  return r.dados;
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
    queryFn: () => pegar<ItemArvore[]>(`/api/arquivos/arvore?driveId=${driveId}`).then((e) => e.dados),
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
```

- [ ] **Step 2: Conferir compilação**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json`
Expected: sem erros novos em `arquivos/ganchos.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/aplicativos/arquivos/ganchos.ts
git commit -m "feat(web): hooks de dados do sistema de arquivos"
```

---

## Task 3: Bloco de Notas

**Files:**
- Create: `apps/web/src/aplicativos/bloco/BlocoNotas.tsx`
- Create (test): `apps/web/src/aplicativos/bloco/BlocoNotas.test.tsx`

O Bloco recebe `janela.dados = { id, nome }`. Carrega o conteúdo via listagem da pasta? Não — busca direto pelo id. Adicione um endpoint leve? Não é preciso: o conteúdo já não vem na listagem. Para manter a Fase 2 simples, o Bloco recebe `{ id, nome, conteudo }` no `dados` (o Explorador passa o conteúdo ao abrir, obtido de um fetch pontual). Implementamos um util `lerItem` no ganchos para buscar o conteúdo.

- [ ] **Step 1: Adicionar leitura de conteúdo ao `ganchos.ts`**

No final de `apps/web/src/aplicativos/arquivos/ganchos.ts`, adicionar uma rota de leitura de um item. Como a Fase 1 não expôs GET de um item único, reaproveitamos a listagem do pai não é suficiente para conteúdo. **Adicione na Fase 1 o endpoint** `GET /api/arquivos/:id` que devolve `{ id, nome, conteudo }` — ver nota abaixo — e então:

```typescript
export function useItem(id: number) {
  return useQuery({
    queryKey: ['arquivos', 'item', id],
    queryFn: () => pegar<{ id: number; nome: string; conteudo: string }>(`/api/arquivos/${id}`).then((e) => e.dados),
  });
}
```

> **Dependência cruzada:** este endpoint pertence à Fase 1. Se ainda não existir, implemente agora em `rotas/arquivos.ts` + `consultasArquivos.ts`:
> ```typescript
> // consultasArquivos.ts
> export async function lerItem(pool: ConnectionPool, reg: RegistradorSQL, id: number) {
>   const r = await reg.executar<{ id: number; nome: string; conteudo: string | null }>(
>     pool, 'SELECT id, nome, conteudo FROM dbo.Itens WHERE id = @id', { id });
>   return (r as unknown as { id: number; nome: string; conteudo: string | null }[])[0] ?? null;
> }
> ```
> ```typescript
> // rotas/arquivos.ts
> app.get('/api/arquivos/:id', { preHandler: autenticar }, async (req, reply) => {
>   const id = Number((req.params as { id: string }).id);
>   const reg = new RegistradorSQL('Ler item');
>   const item = await lerItem(req.sessao!.pool, reg, id);
>   if (!item) return reply.status(404).send({ ok: false, erro: { tipo: 'validacao', mensagem: 'Item não encontrado.' }, sql: reg.comandos });
>   return { ok: true, dados: { dados: { ...item, conteudo: item.conteudo ?? '' }, sql: reg.comandos } };
> });
> ```
> Registre a rota `:id` (GET) sem conflitar com `:id/...`.

- [ ] **Step 2: Escrever o teste do Bloco**

`apps/web/src/aplicativos/bloco/BlocoNotas.test.tsx`:

```typescript
import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlocoNotas } from './BlocoNotas';
import type { EstadoJanela } from '../../areaTrabalho/tipos';

const janela = (dados: unknown): EstadoJanela => ({
  id: 'j1', tipoApp: 'bloco', titulo: 'Bloco', icone: 'newdoc',
  retangulo: { x: 0, y: 0, largura: 400, altura: 300 },
  zIndex: 1, estado: 'normal', anterior: 'normal', dados,
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/api/arquivos/5') && (!init || init.method === undefined)) {
      return new Response(JSON.stringify({ ok: true, dados: { dados: { id: 5, nome: 'a.txt', conteudo: 'oi' }, sql: [] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, dados: { dados: { id: 5 }, sql: [] } }), { status: 200 });
  }));
});

function montar(dados: unknown) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <BlocoNotas janela={janela(dados)} />
    </QueryClientProvider>,
  );
}

test('carrega o conteúdo do arquivo', async () => {
  montar({ id: 5, nome: 'a.txt' });
  await waitFor(() => expect((screen.getByLabelText('Conteúdo') as HTMLTextAreaElement).value).toBe('oi'));
});

test('botão Salvar dispara o PUT de conteúdo', async () => {
  montar({ id: 5, nome: 'a.txt' });
  await waitFor(() => expect((screen.getByLabelText('Conteúdo') as HTMLTextAreaElement).value).toBe('oi'));
  fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'novo' } });
  fireEvent.click(screen.getByText('Salvar'));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith('/api/arquivos/5/conteudo', expect.objectContaining({ method: 'PUT' })),
  );
});
```

- [ ] **Step 3: Rodar para falhar**

Run: `cd apps/web && npx vitest run src/aplicativos/bloco/BlocoNotas.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 4: Implementar `BlocoNotas.tsx`**

```typescript
import { useEffect, useState } from 'react';
import type { PropsApp } from '../../areaTrabalho/tipos';
import { useItem, useSalvarConteudo } from '../arquivos/ganchos';

interface DadosBloco { id: number; nome: string }

export function BlocoNotas({ janela }: PropsApp) {
  const dados = janela.dados as DadosBloco | null;
  const id = dados?.id ?? 0;
  const consulta = useItem(id);
  const salvar = useSalvarConteudo();
  const [texto, setTexto] = useState('');
  const [carregado, setCarregado] = useState(false);

  // Sincroniza o textarea quando o conteúdo chega.
  useEffect(() => {
    if (consulta.data && !carregado) {
      setTexto(consulta.data.conteudo);
      setCarregado(true);
    }
  }, [consulta.data, carregado]);

  if (!dados) return <div style={{ padding: 8 }}>Nenhum arquivo aberto.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 4, borderBottom: '1px solid var(--borda, #888)' }}>
        <strong>{dados.nome}</strong>
        <button style={{ marginLeft: 8 }} onClick={() => salvar.mutate({ id, conteudo: texto })} disabled={salvar.isPending}>
          Salvar
        </button>
        {salvar.isSuccess && <span style={{ marginLeft: 8 }}>salvo ✓</span>}
      </div>
      <textarea
        aria-label="Conteúdo"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        style={{ flex: 1, resize: 'none', border: 'none', padding: 8, fontFamily: 'monospace' }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Rodar para passar**

Run: `cd apps/web && npx vitest run src/aplicativos/bloco/BlocoNotas.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/aplicativos/bloco/BlocoNotas.tsx apps/web/src/aplicativos/bloco/BlocoNotas.test.tsx apps/web/src/aplicativos/arquivos/ganchos.ts
git commit -m "feat(web): Bloco de Notas (edita conteúdo via UPDATE)"
```

---

## Task 4: Explorador de Arquivos

**Files:**
- Create: `apps/web/src/aplicativos/arquivos/ExploradorArquivos.tsx`
- Create: `apps/web/src/aplicativos/arquivos/arquivos.css`
- Create (test): `apps/web/src/aplicativos/arquivos/ExploradorArquivos.test.tsx`

Funcionalidades: seletor de drive, navegação por pasta (duplo clique entra; "Acima" sobe), lista com pastas primeiro, toolbar (Nova Pasta, Novo Arquivo, Renomear, Apagar, Copiar, Colar), abrir arquivo no Bloco, e **mover por arrastar-soltar** sobre uma pasta. Sem pedir IDs: nomes via `prompt`, destinos via alvo de drop ou pasta atual.

- [ ] **Step 1: Escrever o teste**

`apps/web/src/aplicativos/arquivos/ExploradorArquivos.test.tsx`:

```typescript
import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExploradorArquivos } from './ExploradorArquivos';
import type { EstadoJanela } from '../../areaTrabalho/tipos';

const janela: EstadoJanela = {
  id: 'j1', tipoApp: 'arquivos', titulo: 'Arquivos', icone: 'folder',
  retangulo: { x: 0, y: 0, largura: 600, altura: 400 },
  zIndex: 1, estado: 'normal', anterior: 'normal', dados: null,
};

const conteudo = [
  { id: 10, nome: 'Documentos', tipo: 'pasta', paiId: null, driveId: 1, donoId: 1, tamanhoBytes: null, criadoEm: '', modificadoEm: null },
  { id: 11, nome: 'a.txt', tipo: 'arquivo', paiId: null, driveId: 1, donoId: 1, tamanhoBytes: 12, criadoEm: '', modificadoEm: null },
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes('/api/arquivos/drives')) {
      return new Response(JSON.stringify({ ok: true, dados: { dados: [{ id: 1, letra: 'C', rotulo: 'Sistema', capacidadeBytes: 1 }], sql: [] } }), { status: 200 });
    }
    if (u.includes('/api/arquivos/listar')) {
      return new Response(JSON.stringify({ ok: true, dados: { dados: conteudo, sql: [] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, dados: { dados: { id: 99 }, sql: [] } }), { status: 200 });
  }));
});

function montar() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <ExploradorArquivos janela={janela} />
    </QueryClientProvider>,
  );
}

test('lista pastas e arquivos da raiz', async () => {
  montar();
  expect(await screen.findByText('Documentos')).toBeInTheDocument();
  expect(screen.getByText('a.txt')).toBeInTheDocument();
});

test('Nova Pasta dispara POST /api/arquivos/pasta', async () => {
  vi.spyOn(window, 'prompt').mockReturnValue('NovaPasta');
  montar();
  await screen.findByText('Documentos');
  fireEvent.click(screen.getByText('Nova Pasta'));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith('/api/arquivos/pasta', expect.objectContaining({ method: 'POST' })),
  );
});
```

- [ ] **Step 2: Rodar para falhar**

Run: `cd apps/web && npx vitest run src/aplicativos/arquivos/ExploradorArquivos.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar `arquivos.css`**

```css
.exp { display: flex; flex-direction: column; height: 100%; font-size: 12px; }
.exp-barra { display: flex; gap: 4px; align-items: center; padding: 4px; border-bottom: 1px solid var(--borda, #888); flex-wrap: wrap; }
.exp-endereco { flex: 1; min-width: 120px; padding: 2px 4px; background: var(--campo, #fff); border: 1px solid var(--borda, #888); }
.exp-lista { flex: 1; overflow: auto; }
.exp-item { display: flex; gap: 6px; align-items: center; padding: 3px 6px; cursor: default; user-select: none; }
.exp-item:hover { background: var(--selecao-fraca, #e8eef6); }
.exp-item.sel { background: var(--selecao, #1084d0); color: #fff; }
.exp-item.alvo { outline: 1px dashed var(--primary, #1084d0); }
```

- [ ] **Step 4: Implementar `ExploradorArquivos.tsx`**

```typescript
import { useState } from 'react';
import type { Item } from '@dbos/shared';
import type { PropsApp } from '../../areaTrabalho/tipos';
import { useLoja } from '../../areaTrabalho/loja';
import { Icone } from '../../tema/icones/Icone';
import { useContextoArquivos } from './contexto';
import {
  useDrives, useConteudo, useCriarPasta, useCriarArquivo, useRenomear,
  useApagar, useMover, useCopiar,
} from './ganchos';
import './arquivos.css';

interface Nivel { id: number | null; nome: string }

export function ExploradorArquivos(_props: PropsApp) {
  const driveId = useContextoArquivos((s) => s.driveId);
  const definirDrive = useContextoArquivos((s) => s.definirDrive);
  const abrirJanela = useLoja((s) => s.abrirJanela);

  // Pilha de navegação: o topo é a pasta atual (id null = raiz do drive).
  const [pilha, setPilha] = useState<Nivel[]>([{ id: null, nome: '' }]);
  const atual = pilha[pilha.length - 1]!;
  const [sel, setSel] = useState<number | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);

  const drives = useDrives();
  const conteudo = useConteudo(driveId, atual.id);
  const criarPasta = useCriarPasta();
  const criarArquivo = useCriarArquivo();
  const renomear = useRenomear();
  const apagar = useApagar();
  const mover = useMover();
  const copiar = useCopiar();

  const letra = drives.data?.find((d) => d.id === driveId)?.letra ?? 'C';
  const caminho = `${letra}:\\` + pilha.slice(1).map((n) => n.nome).join('\\');

  function entrar(item: Item) {
    if (item.tipo === 'pasta') setPilha((p) => [...p, { id: item.id, nome: item.nome }]);
    else abrirJanela('bloco', { id: item.id, nome: item.nome });
  }
  function subir() {
    setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p));
    setSel(null);
  }

  function novaPasta() {
    const nome = window.prompt('Nome da nova pasta:');
    if (nome) criarPasta.mutate({ nome, paiId: atual.id, driveId });
  }
  function novoArquivo() {
    const nome = window.prompt('Nome do novo arquivo:');
    if (nome) criarArquivo.mutate({ nome, paiId: atual.id, driveId, conteudo: '' });
  }
  function renomearSel() {
    if (sel === null) return;
    const item = conteudo.data?.find((i) => i.id === sel);
    const nome = window.prompt('Novo nome:', item?.nome);
    if (nome) renomear.mutate({ id: sel, nome });
  }
  function apagarSel() {
    if (sel !== null) apagar.mutate(sel);
    setSel(null);
  }
  function colar() {
    if (copiado !== null) copiar.mutate({ id: copiado, paiId: atual.id });
  }

  return (
    <div className="exp">
      <div className="exp-barra">
        <select aria-label="Drive" value={driveId} onChange={(e) => { definirDrive(Number(e.target.value)); setPilha([{ id: null, nome: '' }]); }}>
          {drives.data?.map((d) => <option key={d.id} value={d.id}>{d.letra}: {d.rotulo}</option>)}
        </select>
        <button onClick={subir} disabled={pilha.length === 1}>Acima</button>
        <span className="exp-endereco">{caminho}</span>
        <button onClick={novaPasta}>Nova Pasta</button>
        <button onClick={novoArquivo}>Novo Arquivo</button>
        <button onClick={renomearSel} disabled={sel === null}>Renomear</button>
        <button onClick={() => setCopiado(sel)} disabled={sel === null}>Copiar</button>
        <button onClick={colar} disabled={copiado === null}>Colar</button>
        <button onClick={apagarSel} disabled={sel === null}>Apagar</button>
      </div>
      <div className="exp-lista">
        {conteudo.isLoading && <div style={{ padding: 8 }}>Carregando…</div>}
        {conteudo.data?.map((item) => (
          <div
            key={item.id}
            className={`exp-item${sel === item.id ? ' sel' : ''}${alvo === item.id ? ' alvo' : ''}`}
            onClick={() => setSel(item.id)}
            onDoubleClick={() => entrar(item)}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/id', String(item.id))}
            onDragOver={(e) => { if (item.tipo === 'pasta') { e.preventDefault(); setAlvo(item.id); } }}
            onDragLeave={() => setAlvo((a) => (a === item.id ? null : a))}
            onDrop={(e) => {
              e.preventDefault();
              setAlvo(null);
              const arrastado = Number(e.dataTransfer.getData('text/id'));
              if (item.tipo === 'pasta' && arrastado && arrastado !== item.id) {
                mover.mutate({ id: arrastado, paiId: item.id });
              }
            }}
          >
            <Icone nome={item.tipo === 'pasta' ? 'folder' : 'newdoc'} tamanho={16} />
            <span>{item.nome}</span>
          </div>
        ))}
        {conteudo.data?.length === 0 && <div style={{ padding: 8, opacity: 0.7 }}>(pasta vazia)</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rodar para passar**

Run: `cd apps/web && npx vitest run src/aplicativos/arquivos/ExploradorArquivos.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/aplicativos/arquivos/ExploradorArquivos.tsx apps/web/src/aplicativos/arquivos/arquivos.css apps/web/src/aplicativos/arquivos/ExploradorArquivos.test.tsx
git commit -m "feat(web): Explorador de Arquivos (navegação + CRUD + mover por DnD)"
```

---

## Task 5: Registrar os apps no WM

**Files:**
- Modify: `apps/web/src/areaTrabalho/tipos.ts`
- Modify: `apps/web/src/areaTrabalho/registroApps.tsx`

- [ ] **Step 1: Adicionar `'arquivos'` e `'bloco'` ao `TipoApp`**

Em `apps/web/src/areaTrabalho/tipos.ts`, no union `TipoApp`, adicionar as duas entradas (mantendo as RH por ora):

```typescript
export type TipoApp =
  | 'consulta'
  | 'explorador'
  | 'grade'
  | 'propriedades'
  | 'busca'
  | 'relacionamentos'
  | 'terminal'
  | 'relatorio'
  | 'arquivos'
  | 'bloco';
```

- [ ] **Step 2: Registrar os componentes em `registroApps.tsx`**

Adicionar os imports (lazy para o Bloco):

```typescript
import { ExploradorArquivos } from '../aplicativos/arquivos/ExploradorArquivos';

const BlocoNotas = lazy(() =>
  import('../aplicativos/bloco/BlocoNotas').then((m) => ({ default: m.BlocoNotas })),
);
```

Adicionar as entradas ao objeto `registroApps` (após `terminal`):

```typescript
  arquivos: {
    titulo: 'Explorador de Arquivos',
    icone: 'folder',
    tamanhoInicial: { largura: 640, altura: 420 },
    componente: ExploradorArquivos,
  },
  bloco: {
    titulo: 'Bloco de Notas',
    icone: 'newdoc',
    tamanhoInicial: { largura: 420, altura: 320 },
    componente: BlocoNotas,
  },
```

Adicionar `'arquivos'` ao início de `ORDEM_APPS` (o Bloco não vai aos atalhos — abre via duplo clique num arquivo):

```typescript
export const ORDEM_APPS: TipoApp[] = [
  'arquivos',
  'explorador',
  'busca',
  'consulta',
  'grade',
  'propriedades',
  'relacionamentos',
  'terminal',
  'relatorio',
];
```

- [ ] **Step 3: Rodar a suíte web inteira**

Run: `bun --filter @dbos/web test`
Expected: PASS (inclui os testes novos; os RH continuam passando pois mockam fetch).

- [ ] **Step 4: Verificação visual**

Run: `bun dev:web` (com `bun dev:server` no ar) → abrir o app, logar, dar duplo clique em "Explorador de Arquivos".
Expected: lista a árvore semente (Windows, Usuarios…); criar pasta/arquivo, renomear, apagar e arrastar um arquivo para uma pasta funcionam; duplo clique num `.txt` abre o Bloco e o Salvar persiste.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/tipos.ts apps/web/src/areaTrabalho/registroApps.tsx
git commit -m "feat(web): registra Explorador de Arquivos e Bloco de Notas no WM"
```

---

## Self-Review (preenchido)

- **Cobertura da spec (Seção 3 — apps novos GUI):** Explorador com árvore/navegação/toolbar/DnD (Task 4), Bloco (Task 3), contexto compartilhado (Task 1), hooks (Task 2), registro no WM (Task 5). ✔
- **Sem placeholders:** todo step com código tem código completo; o endpoint `GET /api/arquivos/:id` aparece completo na nota da Task 3. ✔
- **Consistência de tipos:** hooks desembrulham `Envelope<T> = { dados, sql }` igual ao retorno da Fase 1; `PropsApp`/`EstadoJanela` usados como no resto do WM; `useItem`/`useSalvarConteudo` casados entre Bloco e ganchos. ✔
- **Pendência consciente:** o painel de árvore lateral foi simplificado para navegação por lista + "Acima" (mesma navegação, menos código); o `sql` retornado pelos hooks já está disponível e será ligado ao Monitor na Fase 4. A Lixeira (modo) entra na Fase 3. RH permanece intacto até a Fase 4.
