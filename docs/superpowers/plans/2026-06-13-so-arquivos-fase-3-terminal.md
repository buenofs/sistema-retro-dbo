# SO de Arquivos — Fase 3: Terminal de SO + Lixeira Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever o Terminal como um shell de SO (cd/ls/mkdir/touch/ren/mv/cp/rm/cat/echo/lixeira/restaurar/empty) que resolve nomes→ids na pasta atual e bate nas rotas `/api/arquivos/*`, e adicionar a Lixeira como app/ícone com Restaurar e Esvaziar.

**Architecture:** `criarShell(ctx)` encapsula o diretório atual (pilha) e traduz cada comando numa chamada do `ContextoTerminal` (interface desacoplada do React, 100% testável com um ctx fake). O `Terminal.tsx` constrói o ctx real chamando `requisitar`. A Lixeira reusa os hooks `useLixeira/useRestaurar/useEsvaziarLixeira` da Fase 2.

**Tech Stack:** React 18, Vitest + Testing Library.

**Pré-requisito:** Fases 1 e 2 concluídas.

---

## File Structure

- Rewrite: `apps/web/src/aplicativos/terminal/comandos.ts` — shell do SO (substitui o parser RH).
- Rewrite (test): `apps/web/src/aplicativos/terminal/comandos.test.ts`.
- Rewrite: `apps/web/src/aplicativos/terminal/Terminal.tsx` — monta o ctx real.
- Update (test): `apps/web/src/aplicativos/terminal/Terminal.test.tsx` (ajustar ao novo prompt/ctx).
- Create: `apps/web/src/aplicativos/lixeira/Lixeira.tsx` — app da Lixeira.
- Create (test): `apps/web/src/aplicativos/lixeira/Lixeira.test.tsx`.
- Modify: `apps/web/src/areaTrabalho/tipos.ts` — adiciona `'lixeira'`.
- Modify: `apps/web/src/areaTrabalho/registroApps.tsx` — registra Lixeira + ORDEM_APPS.

---

## Task 1: Shell do terminal (`comandos.ts`)

**Files:**
- Rewrite: `apps/web/src/aplicativos/terminal/comandos.ts`
- Rewrite: `apps/web/src/aplicativos/terminal/comandos.test.ts`

- [ ] **Step 1: Reescrever o teste (`comandos.test.ts`)**

```typescript
import { test, expect, vi } from 'vitest';
import { criarShell, type ContextoTerminal, type ItemTerminal } from './comandos';

const raiz: ItemTerminal[] = [
  { id: 10, nome: 'Documentos', tipo: 'pasta' },
  { id: 11, nome: 'a.txt', tipo: 'arquivo' },
];

function ctxFake(over: Partial<ContextoTerminal> = {}): ContextoTerminal {
  return {
    letra: 'C',
    listar: vi.fn(async (paiId) => (paiId === null ? raiz : [])),
    criarPasta: vi.fn(async () => {}),
    criarArquivo: vi.fn(async () => {}),
    renomear: vi.fn(async () => {}),
    mover: vi.fn(async () => {}),
    copiar: vi.fn(async () => {}),
    apagar: vi.fn(async () => {}),
    restaurar: vi.fn(async () => {}),
    esvaziar: vi.fn(async () => {}),
    lerConteudo: vi.fn(async () => 'linha1\nlinha2'),
    salvarConteudo: vi.fn(async () => {}),
    listarLixeira: vi.fn(async () => [{ id: 99, nome: 'velho.txt', tipo: 'arquivo' as const }]),
    limpar: vi.fn(),
    ...over,
  };
}

test('prompt inicial é C:\\>', () => {
  const sh = criarShell(ctxFake());
  expect(sh.prompt()).toBe('C:\\>');
});

test('ls lista pastas e arquivos', async () => {
  const linhas = await criarShell(ctxFake()).executar('ls');
  expect(linhas.join('\n')).toContain('Documentos');
  expect(linhas.join('\n')).toContain('a.txt');
});

test('mkdir cria na pasta atual (raiz = null)', async () => {
  const ctx = ctxFake();
  await criarShell(ctx).executar('mkdir Projetos');
  expect(ctx.criarPasta).toHaveBeenCalledWith('Projetos', null);
});

test('cd entra na pasta e muda o prompt', async () => {
  const sh = criarShell(ctxFake());
  await sh.executar('cd Documentos');
  expect(sh.prompt()).toBe('C:\\Documentos>');
});

test('cd .. volta para a raiz', async () => {
  const sh = criarShell(ctxFake());
  await sh.executar('cd Documentos');
  await sh.executar('cd ..');
  expect(sh.prompt()).toBe('C:\\>');
});

test('rm resolve nome->id e apaga', async () => {
  const ctx = ctxFake();
  await criarShell(ctx).executar('rm a.txt');
  expect(ctx.apagar).toHaveBeenCalledWith(11);
});

test('echo texto > arquivo grava conteúdo', async () => {
  const ctx = ctxFake();
  await criarShell(ctx).executar('echo ola mundo > a.txt');
  expect(ctx.salvarConteudo).toHaveBeenCalledWith(11, 'ola mundo');
});

test('cat mostra o conteúdo em linhas', async () => {
  const linhas = await criarShell(ctxFake()).executar('cat a.txt');
  expect(linhas).toEqual(['linha1', 'linha2']);
});

test('empty esvazia a lixeira', async () => {
  const ctx = ctxFake();
  await criarShell(ctx).executar('empty');
  expect(ctx.esvaziar).toHaveBeenCalled();
});

test('comando inválido avisa', async () => {
  const linhas = await criarShell(ctxFake()).executar('xyz');
  expect(linhas[0]!.toLowerCase()).toContain('inválido');
});
```

- [ ] **Step 2: Rodar para falhar**

Run: `cd apps/web && npx vitest run src/aplicativos/terminal/comandos.test.ts`
Expected: FAIL (assinatura nova não existe).

- [ ] **Step 3: Reescrever `comandos.ts`**

```typescript
export interface ItemTerminal {
  id: number;
  nome: string;
  tipo: 'pasta' | 'arquivo';
}

// Interface desacoplada do React — o Terminal injeta a implementação real.
export interface ContextoTerminal {
  letra: string;
  listar: (paiId: number | null) => Promise<ItemTerminal[]>;
  criarPasta: (nome: string, paiId: number | null) => Promise<void>;
  criarArquivo: (nome: string, paiId: number | null, conteudo: string) => Promise<void>;
  renomear: (id: number, nome: string) => Promise<void>;
  mover: (id: number, paiId: number | null) => Promise<void>;
  copiar: (id: number, paiId: number | null) => Promise<void>;
  apagar: (id: number) => Promise<void>;
  restaurar: (id: number) => Promise<void>;
  esvaziar: () => Promise<void>;
  lerConteudo: (id: number) => Promise<string>;
  salvarConteudo: (id: number, conteudo: string) => Promise<void>;
  listarLixeira: () => Promise<ItemTerminal[]>;
  limpar: () => void;
}

interface Nivel {
  id: number | null;
  nome: string;
}

const AJUDA = [
  'Comandos disponíveis:',
  '  ajuda | help               mostra esta ajuda',
  '  limpar | cls               limpa a tela',
  '  ls | dir                   lista a pasta atual',
  '  cd <pasta> | cd ..         navega entre pastas',
  '  mkdir <nome>               cria pasta',
  '  touch <nome>               cria arquivo vazio',
  '  ren <nome> <novo>          renomeia',
  '  mv <nome> <pasta>          move (use .. para subir)',
  '  cp <nome> <pasta>          copia',
  '  rm <nome>                  manda para a Lixeira',
  '  cat <arquivo>              mostra o conteúdo',
  '  echo <texto> > <arquivo>   grava conteúdo',
  '  lixeira                    lista a Lixeira',
  '  restaurar <id>             restaura item da Lixeira',
  '  empty                      esvazia a Lixeira',
];

export function criarShell(ctx: ContextoTerminal) {
  const pilha: Nivel[] = [{ id: null, nome: '' }];
  const atual = () => pilha[pilha.length - 1]!;

  function prompt(): string {
    return `${ctx.letra}:\\` + pilha.slice(1).map((n) => n.nome).join('\\') + '>';
  }

  async function acharNaPasta(nome: string): Promise<ItemTerminal | undefined> {
    const itens = await ctx.listar(atual().id);
    return itens.find((i) => i.nome.toLowerCase() === nome.toLowerCase());
  }

  async function executar(linha: string): Promise<string[]> {
    const partes = linha.trim().split(/\s+/);
    const cmd = (partes[0] ?? '').toLowerCase();
    if (cmd === '') return [];

    switch (cmd) {
      case 'ajuda':
      case 'help':
        return AJUDA;

      case 'limpar':
      case 'cls':
        ctx.limpar();
        return [];

      case 'ls':
      case 'dir': {
        const itens = await ctx.listar(atual().id);
        if (!itens.length) return ['(pasta vazia)'];
        return itens.map((i) => `${i.tipo === 'pasta' ? '<DIR>' : '     '}  ${i.nome}`);
      }

      case 'cd': {
        const alvo = partes[1] ?? '';
        if (alvo === '..') {
          if (pilha.length > 1) pilha.pop();
          return [];
        }
        if (alvo === '\\' || alvo === '/') {
          pilha.splice(1);
          return [];
        }
        if (!alvo) return [];
        const it = await acharNaPasta(alvo);
        if (!it || it.tipo !== 'pasta') return [`Pasta não encontrada: ${alvo}`];
        pilha.push({ id: it.id, nome: it.nome });
        return [];
      }

      case 'mkdir':
      case 'md': {
        const nome = partes.slice(1).join(' ');
        if (!nome) return ['Uso: mkdir <nome>'];
        await ctx.criarPasta(nome, atual().id);
        return [`Pasta criada: ${nome}`];
      }

      case 'touch': {
        const nome = partes.slice(1).join(' ');
        if (!nome) return ['Uso: touch <nome>'];
        await ctx.criarArquivo(nome, atual().id, '');
        return [`Arquivo criado: ${nome}`];
      }

      case 'ren': {
        const origem = partes[1];
        const novo = partes.slice(2).join(' ');
        if (!origem || !novo) return ['Uso: ren <nome> <novo>'];
        const it = await acharNaPasta(origem);
        if (!it) return [`Não encontrado: ${origem}`];
        await ctx.renomear(it.id, novo);
        return [`Renomeado para ${novo}`];
      }

      case 'rm':
      case 'del': {
        const nome = partes.slice(1).join(' ');
        if (!nome) return ['Uso: rm <nome>'];
        const it = await acharNaPasta(nome);
        if (!it) return [`Não encontrado: ${nome}`];
        await ctx.apagar(it.id);
        return [`Movido para a Lixeira: ${nome}`];
      }

      case 'mv':
      case 'cp': {
        const origem = partes[1];
        const destino = partes[2];
        if (!origem || !destino) return [`Uso: ${cmd} <nome> <pasta>`];
        const it = await acharNaPasta(origem);
        if (!it) return [`Não encontrado: ${origem}`];
        let destId: number | null;
        if (destino === '..') {
          destId = pilha.length > 1 ? pilha[pilha.length - 2]!.id : null;
        } else {
          const dpasta = await acharNaPasta(destino);
          if (!dpasta || dpasta.tipo !== 'pasta') return [`Pasta destino inválida: ${destino}`];
          destId = dpasta.id;
        }
        if (cmd === 'mv') await ctx.mover(it.id, destId);
        else await ctx.copiar(it.id, destId);
        return [`${cmd === 'mv' ? 'Movido' : 'Copiado'}: ${origem} -> ${destino}`];
      }

      case 'cat': {
        const nome = partes.slice(1).join(' ');
        const it = await acharNaPasta(nome);
        if (!it || it.tipo !== 'arquivo') return [`Arquivo não encontrado: ${nome}`];
        return (await ctx.lerConteudo(it.id)).split('\n');
      }

      case 'echo': {
        const m = linha.match(/^echo\s+(.*?)\s*>\s*(\S+)\s*$/i);
        if (!m) return ['Uso: echo <texto> > <arquivo>'];
        const texto = m[1] ?? '';
        const nome = m[2]!;
        const it = await acharNaPasta(nome);
        if (it) await ctx.salvarConteudo(it.id, texto);
        else await ctx.criarArquivo(nome, atual().id, texto);
        return [`Gravado em ${nome}`];
      }

      case 'lixeira': {
        const itens = await ctx.listarLixeira();
        if (!itens.length) return ['(lixeira vazia)'];
        return itens.map((i) => `${i.id}  ${i.nome}`);
      }

      case 'restaurar': {
        const id = Number(partes[1]);
        if (!id) return ['Uso: restaurar <id>  (veja "lixeira")'];
        await ctx.restaurar(id);
        return [`Restaurado: ${id}`];
      }

      case 'empty': {
        await ctx.esvaziar();
        return ['Lixeira esvaziada.'];
      }

      default:
        return [`Comando inválido: ${cmd}. Digite "ajuda".`];
    }
  }

  return { executar, prompt };
}
```

- [ ] **Step 4: Rodar para passar**

Run: `cd apps/web && npx vitest run src/aplicativos/terminal/comandos.test.ts`
Expected: PASS (todos os testes).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/aplicativos/terminal/comandos.ts apps/web/src/aplicativos/terminal/comandos.test.ts
git commit -m "feat(web): terminal vira shell de SO (cd/ls/mkdir/mv/rm/echo...)"
```

---

## Task 2: Terminal.tsx (ctx real)

**Files:**
- Rewrite: `apps/web/src/aplicativos/terminal/Terminal.tsx`
- Update: `apps/web/src/aplicativos/terminal/Terminal.test.tsx`

- [ ] **Step 1: Reescrever `Terminal.tsx`**

```typescript
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ComandoSQL, Drive, Item } from '@dbos/shared';
import { requisitar } from '../../api/cliente';
import { useContextoArquivos } from '../arquivos/contexto';
import { criarShell, type ContextoTerminal, type ItemTerminal } from './comandos';
import './terminal.css';

type Env<T> = { dados: T; sql: ComandoSQL[] };

async function api<T>(caminho: string, method?: string, corpo?: unknown): Promise<Env<T>> {
  const r = await requisitar<Env<T>>(
    caminho,
    method ? { method, body: corpo === undefined ? undefined : JSON.stringify(corpo) } : {},
  );
  if (!r.ok) throw new Error(r.erro.mensagem);
  return r.dados;
}

export function Terminal() {
  const driveId = useContextoArquivos((s) => s.driveId);
  const [letra, setLetra] = useState('C');
  const [linhas, setLinhas] = useState<string[]>([
    'DBOS [Versão 2.0]',
    'Digite "ajuda" para ver os comandos.',
    '',
  ]);
  const [entrada, setEntrada] = useState('');
  const [historico, setHistorico] = useState<string[]>([]);
  const [indice, setIndice] = useState(-1);
  const fimRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLInputElement>(null);

  // Descobre a letra do drive atual (para o prompt).
  useEffect(() => {
    let vivo = true;
    api<Drive[]>('/api/arquivos/drives').then((e) => {
      const d = e.dados.find((x) => x.id === driveId);
      if (vivo && d) setLetra(d.letra);
    }).catch(() => {});
    return () => { vivo = false; };
  }, [driveId]);

  const ctx: ContextoTerminal = useMemo(() => ({
    letra,
    listar: async (paiId) => {
      const q = new URLSearchParams({ driveId: String(driveId) });
      if (paiId !== null) q.set('paiId', String(paiId));
      const e = await api<Item[]>(`/api/arquivos/listar?${q.toString()}`);
      return e.dados.map((i): ItemTerminal => ({ id: i.id, nome: i.nome, tipo: i.tipo }));
    },
    criarPasta: async (nome, paiId) => { await api('/api/arquivos/pasta', 'POST', { nome, paiId, driveId }); },
    criarArquivo: async (nome, paiId, conteudo) => { await api('/api/arquivos/arquivo', 'POST', { nome, paiId, driveId, conteudo }); },
    renomear: async (id, nome) => { await api(`/api/arquivos/${id}/renomear`, 'PUT', { nome }); },
    mover: async (id, paiId) => { await api(`/api/arquivos/${id}/mover`, 'PUT', { paiId }); },
    copiar: async (id, paiId) => { await api(`/api/arquivos/${id}/copiar`, 'POST', { paiId }); },
    apagar: async (id) => { await api(`/api/arquivos/${id}`, 'DELETE'); },
    restaurar: async (id) => { await api(`/api/arquivos/${id}/restaurar`, 'PUT'); },
    esvaziar: async () => { await api('/api/arquivos/lixeira', 'DELETE'); },
    lerConteudo: async (id) => (await api<{ conteudo: string }>(`/api/arquivos/${id}`)).dados.conteudo,
    salvarConteudo: async (id, conteudo) => { await api(`/api/arquivos/${id}/conteudo`, 'PUT', { conteudo }); },
    listarLixeira: async () => {
      const e = await api<Item[]>('/api/arquivos/lixeira');
      return e.dados.map((i): ItemTerminal => ({ id: i.id, nome: i.nome, tipo: i.tipo }));
    },
    limpar: () => setLinhas([]),
  }), [letra, driveId]);

  // Shell estável por (driveId, letra): preserva o diretório atual entre comandos.
  const shellRef = useRef(criarShell(ctx));
  useEffect(() => { shellRef.current = criarShell(ctx); }, [ctx]);

  useEffect(() => { entradaRef.current?.focus(); }, []);

  function focarEntrada() {
    if (window.getSelection()?.toString()) return;
    entradaRef.current?.focus();
  }

  async function submeter() {
    const texto = entrada;
    const prompt = shellRef.current.prompt();
    setLinhas((l) => [...l, `${prompt} ${texto}`]);
    setEntrada('');
    if (texto.trim()) setHistorico((h) => [...h, texto]);
    setIndice(-1);
    try {
      const saida = await shellRef.current.executar(texto);
      if (saida.length) setLinhas((l) => [...l, ...saida, '']);
    } catch (e) {
      setLinhas((l) => [...l, `Erro: ${e instanceof Error ? e.message : String(e)}`, '']);
    }
    fimRef.current?.scrollIntoView?.();
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submeter();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historico.length === 0) return;
      const i = indice < 0 ? historico.length - 1 : Math.max(0, indice - 1);
      setIndice(i);
      setEntrada(historico[i] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (indice < 0) return;
      const i = indice + 1;
      if (i >= historico.length) {
        setIndice(-1);
        setEntrada('');
      } else {
        setIndice(i);
        setEntrada(historico[i] ?? '');
      }
    }
  }

  return (
    <div className="terminal" onClick={focarEntrada}>
      <div className="terminal-saida">
        {linhas.map((l, i) => (
          <div key={i} className="terminal-linha">{l}</div>
        ))}
        <div className="terminal-prompt">
          <span className="terminal-ps">{shellRef.current.prompt()}</span>
          <input
            ref={entradaRef}
            className="terminal-input"
            aria-label="Comando"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={aoTeclar}
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div ref={fimRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Atualizar `Terminal.test.tsx`**

Substituir o conteúdo por um teste que mocka `fetch` e confere o prompt e um `ls`:

```typescript
import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Terminal } from './Terminal';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes('/api/arquivos/drives')) {
      return new Response(JSON.stringify({ ok: true, dados: { dados: [{ id: 1, letra: 'C', rotulo: 'Sistema', capacidadeBytes: 1 }], sql: [] } }), { status: 200 });
    }
    if (u.includes('/api/arquivos/listar')) {
      return new Response(JSON.stringify({ ok: true, dados: { dados: [{ id: 10, nome: 'Documentos', tipo: 'pasta', paiId: null, driveId: 1, donoId: 1, tamanhoBytes: null, criadoEm: '', modificadoEm: null }], sql: [] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, dados: { dados: {}, sql: [] } }), { status: 200 });
  }));
});

test('mostra o cabeçalho e o prompt do drive', async () => {
  render(<Terminal />);
  expect(screen.getByText(/DBOS \[Versão 2.0\]/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('C:\\>')).toBeInTheDocument());
});

test('ls lista a pasta atual', async () => {
  render(<Terminal />);
  await waitFor(() => expect(screen.getByText('C:\\>')).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Comando'), { target: { value: 'ls' } });
  fireEvent.keyDown(screen.getByLabelText('Comando'), { key: 'Enter' });
  await waitFor(() => expect(screen.getByText(/Documentos/)).toBeInTheDocument());
});
```

- [ ] **Step 3: Rodar os testes do terminal**

Run: `cd apps/web && npx vitest run src/aplicativos/terminal`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/aplicativos/terminal/Terminal.tsx apps/web/src/aplicativos/terminal/Terminal.test.tsx
git commit -m "feat(web): Terminal monta ctx real do sistema de arquivos"
```

---

## Task 3: App Lixeira

**Files:**
- Create: `apps/web/src/aplicativos/lixeira/Lixeira.tsx`
- Create (test): `apps/web/src/aplicativos/lixeira/Lixeira.test.tsx`
- Modify: `apps/web/src/areaTrabalho/tipos.ts`, `registroApps.tsx`

- [ ] **Step 1: Escrever o teste**

`apps/web/src/aplicativos/lixeira/Lixeira.test.tsx`:

```typescript
import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Lixeira } from './Lixeira';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes('/api/arquivos/lixeira')) {
      return new Response(JSON.stringify({ ok: true, dados: { dados: [{ id: 7, nome: 'velho.txt', tipo: 'arquivo', paiId: null, driveId: 1, donoId: 1, tamanhoBytes: 5, modificadoEm: null }], sql: [] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, dados: { dados: { id: 7 }, sql: [] } }), { status: 200 });
  }));
});

function montar() {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}><Lixeira /></QueryClientProvider>);
}

test('lista itens da lixeira', async () => {
  montar();
  expect(await screen.findByText('velho.txt')).toBeInTheDocument();
});

test('Restaurar dispara PUT', async () => {
  montar();
  await screen.findByText('velho.txt');
  fireEvent.click(screen.getByText('Restaurar'));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith('/api/arquivos/7/restaurar', expect.objectContaining({ method: 'PUT' })),
  );
});
```

- [ ] **Step 2: Rodar para falhar**

Run: `cd apps/web && npx vitest run src/aplicativos/lixeira/Lixeira.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar `Lixeira.tsx`**

```typescript
import { Icone } from '../../tema/icones/Icone';
import { useLixeira, useRestaurar, useEsvaziarLixeira } from '../arquivos/ganchos';

export function Lixeira() {
  const lix = useLixeira();
  const restaurar = useRestaurar();
  const esvaziar = useEsvaziarLixeira();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: 12 }}>
      <div style={{ padding: 4, borderBottom: '1px solid var(--borda, #888)' }}>
        <button onClick={() => esvaziar.mutate()} disabled={esvaziar.isPending || (lix.data?.length ?? 0) === 0}>
          Esvaziar Lixeira
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {lix.isLoading && <div style={{ padding: 8 }}>Carregando…</div>}
        {lix.data?.map((item) => (
          <div key={item.id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '3px 6px' }}>
            <Icone nome={item.tipo === 'pasta' ? 'folder' : 'newdoc'} tamanho={16} />
            <span style={{ flex: 1 }}>{item.nome}</span>
            <button onClick={() => restaurar.mutate(item.id)} disabled={restaurar.isPending}>Restaurar</button>
          </div>
        ))}
        {lix.data?.length === 0 && <div style={{ padding: 8, opacity: 0.7 }}>(lixeira vazia)</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar para passar**

Run: `cd apps/web && npx vitest run src/aplicativos/lixeira/Lixeira.test.tsx`
Expected: PASS.

- [ ] **Step 5: Registrar a Lixeira no WM**

Em `tipos.ts`, adicionar `'lixeira'` ao `TipoApp`:

```typescript
  | 'arquivos'
  | 'bloco'
  | 'lixeira';
```

Em `registroApps.tsx`, importar e registrar:

```typescript
import { Lixeira } from '../aplicativos/lixeira/Lixeira';
```

```typescript
  lixeira: {
    titulo: 'Lixeira',
    icone: 'trash',
    tamanhoInicial: { largura: 420, altura: 320 },
    componente: Lixeira,
  },
```

E adicionar `'lixeira'` ao fim de `ORDEM_APPS` (vira ícone na área de trabalho):

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
  'lixeira',
];
```

- [ ] **Step 6: Rodar a suíte web e verificação manual**

Run: `bun --filter @dbos/web test`
Expected: PASS.

Manual: no app, `rm` um arquivo no Terminal ou Del no Explorador → abrir Lixeira → ver o item → Restaurar (volta à pasta) e Esvaziar (some de vez).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/aplicativos/lixeira/ apps/web/src/areaTrabalho/tipos.ts apps/web/src/areaTrabalho/registroApps.tsx
git commit -m "feat(web): app Lixeira (restaurar/esvaziar) + ícone na área de trabalho"
```

---

## Self-Review (preenchido)

- **Cobertura da spec (Seção 3 — Terminal e Lixeira; Seção 2 — comandos→SQL):** shell com cd/ls/mkdir/touch/ren/mv/cp/rm/cat/echo/lixeira/restaurar/empty resolvendo nome→id (Task 1–2); Lixeira com Restaurar/Esvaziar e ícone (Task 3). ✔
- **Sem placeholders:** todo step com código tem código completo. ✔
- **Consistência de tipos:** `ContextoTerminal`/`ItemTerminal` definidos em `comandos.ts` e implementados em `Terminal.tsx`; envelope `{ dados, sql }` idêntico ao das outras fases; hooks da Lixeira são os mesmos da Fase 2. ✔
- **Nota de decisão:** a Lixeira ficou como app leve próprio (com ícone na área de trabalho) em vez de um "modo" interno do Explorador — menos acoplamento e testável isolado; o efeito para o usuário (ícone + Restaurar/Esvaziar) é o que a spec pediu. RH ainda intacto (removido na Fase 4).
