# DBOS RH — Plano 5: Terminal DOS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o overhaul com a janela **Terminal** — prompt DOS (fundo preto, texto verde, cursor, `C:\DBOS>`), histórico (↑/↓) e scrollback. Comandos pt-BR de domínio que **reusam** os endpoints existentes: `ajuda`, `limpar`, `listar <tabela>`, `buscar <campo> <op> <valor>`, `mostrar <view>`, `abrir <nome>.func` (→ Relacionamentos), `sql` (→ Editor de Consultas).

**Architecture:** O coração é um **parser puro** `executarComando(linha, ctx)` com efeitos injetados (`ContextoTerminal`: `consultar`/`buscar`/`abrirApp`/`limpar`) — testável sem DOM nem fetch. O componente `Terminal` liga esse `ctx` ao `requisitar` (`/api/consulta` pass-through da Fase 4 para `listar`/`mostrar` via `SELECT` montado de um **mapa de aliases whitelisted**; `/api/busca` para `buscar`/`abrir`) e ao `useLoja.abrirJanela` (`abrir`→`relacionamentos`, `sql`→`consulta`). Novo app do WM `terminal` (novo `tipoApp`).

**Tech Stack:** React 18, Zustand, 98.css + CSS próprio (tema DOS), Vitest + RTL. Sem mudança de servidor (reusa `/api/consulta` da Fase 4 e `/api/busca` do Plano 1). pt-BR; `tsc --noEmit` limpo é gate.

**Builds on Planos 1–4 + Fases 0–7:** `/api/consulta` (Fase 4, pass-through com teto de linhas), `/api/busca/funcionarios` (Plano 1); `ResultadoConsulta`/`Funcionario`/`FiltrosBusca` (shared); `requisitar<T>`; `useLoja.abrirJanela`; apps `consulta`/`relacionamentos` já registrados (Fase 4 / Plano 4); WM (`registroApps`/`ORDEM_APPS`).

---

### Decisões deste plano

- **Comandos e aliases em pt-BR** (conforme spec atualizada): `listar`/`buscar`/`mostrar`/`abrir`/`ajuda`/`limpar`/`sql`; aliases `funcionarios`/`departamentos`/`projetos`/`folha`/`anomalias_folha`/`folha_resumo`. Extensão `.func`.
- **Sem injeção:** `listar`/`mostrar` montam `SELECT * FROM dbo.<Nome>` a partir de um **mapa fixo** (whitelist) — nenhum texto livre do usuário entra no SQL. O único ponto de SQL livre segue sendo o Editor (`sql`).
- **Parser puro + efeitos injetados** → unit test forte sem DOM/fetch; o componente recebe um teste leve (ajuda/limpar).
- **`tipoApp` `terminal`** entra em `ORDEM_APPS` → menu do desktop 6 → 7 (teste do `AreaTrabalho` atualizado).

---

### File structure for this plan

**`apps/web/src/aplicativos/terminal/`**
- Create `comandos.ts` — `executarComando` + `ContextoTerminal`.
- Test `comandos.test.ts`.
- Create `Terminal.tsx` — a janela.
- Create `terminal.css`.
- Test `Terminal.test.tsx`.

**`apps/web/src/areaTrabalho/`**
- Modify `tipos.ts` — `TipoApp` ganha `'terminal'`.
- Modify `registroApps.tsx` — entrada `terminal` + `ORDEM_APPS`.
- Modify `AreaTrabalho.test.tsx` — menu do desktop com 7 itens.

**`README.md`** — Modify.

---

### Task 0: Parser de comandos (puro, TDD)

**Files:**
- Create: `apps/web/src/aplicativos/terminal/comandos.ts`
- Test: `apps/web/src/aplicativos/terminal/comandos.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/aplicativos/terminal/comandos.test.ts`**

```ts
import { test, expect, vi } from 'vitest';
import { executarComando, type ContextoTerminal } from './comandos';

function ctxFake(over: Partial<ContextoTerminal> = {}): ContextoTerminal {
  return {
    consultar: vi.fn(async () => ({
      colunas: ['id'],
      linhas: [[1]],
      linhasAfetadas: 0,
      truncado: false,
      totalLinhas: 1,
    })),
    buscar: vi.fn(async () => [
      { id: 1, nome: 'Felipe Bueno', cargo: 'Dev', salario: 12000, dataAdmissao: null, departamentoId: 1, departamento: 'Engenharia' },
    ]),
    abrirApp: vi.fn(),
    limpar: vi.fn(),
    ...over,
  };
}

test('ajuda lista os comandos', async () => {
  const linhas = await executarComando('ajuda', ctxFake());
  expect(linhas[0]).toContain('Comandos');
});

test('limpar chama ctx.limpar', async () => {
  const ctx = ctxFake();
  await executarComando('limpar', ctx);
  expect(ctx.limpar).toHaveBeenCalled();
});

test('listar funcionarios consulta a tabela whitelisted', async () => {
  const ctx = ctxFake();
  await executarComando('listar funcionarios', ctx);
  expect(ctx.consultar).toHaveBeenCalledWith('SELECT * FROM dbo.Funcionarios');
});

test('listar desconhecido avisa', async () => {
  const linhas = await executarComando('listar xpto', ctxFake());
  expect(linhas[0]).toContain('desconhecida');
});

test('mostrar anomalias_folha consulta a view', async () => {
  const ctx = ctxFake();
  await executarComando('mostrar anomalias_folha', ctx);
  expect(ctx.consultar).toHaveBeenCalledWith('SELECT * FROM dbo.vw_AnomaliasFolha');
});

test('buscar salario > 10000 vira filtro gt', async () => {
  const ctx = ctxFake();
  await executarComando('buscar salario > 10000', ctx);
  expect(ctx.buscar).toHaveBeenCalledWith({ salarioOp: 'gt', salario: 10000 });
});

test('abrir Felipe.func abre os relacionamentos', async () => {
  const ctx = ctxFake();
  const linhas = await executarComando('abrir Felipe.func', ctx);
  expect(ctx.buscar).toHaveBeenCalledWith({ nome: 'Felipe' });
  expect(ctx.abrirApp).toHaveBeenCalledWith('relacionamentos', { tipo: 'funcionario', id: 1 });
  expect(linhas[0]).toContain('Felipe Bueno');
});

test('sql abre o Editor de Consultas', async () => {
  const ctx = ctxFake();
  await executarComando('sql', ctx);
  expect(ctx.abrirApp).toHaveBeenCalledWith('consulta');
});

test('comando inválido avisa', async () => {
  const linhas = await executarComando('xyz', ctxFake());
  expect(linhas[0]!.toLowerCase()).toContain('inv');
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/terminal/comandos.test.ts`
Expected: FAIL — `Cannot find module './comandos'`.

- [ ] **Step 3: Implementar `apps/web/src/aplicativos/terminal/comandos.ts`**

```ts
import type { FiltrosBusca, Funcionario, ResultadoConsulta } from '@dbos/shared';

export interface ContextoTerminal {
  consultar: (sql: string) => Promise<ResultadoConsulta>;
  buscar: (filtros: FiltrosBusca) => Promise<Funcionario[]>;
  abrirApp: (tipo: 'relacionamentos' | 'consulta', dados?: unknown) => void;
  limpar: () => void;
}

// Aliases pt-BR → objetos reais (whitelist; nenhum texto livre entra no SQL).
const TABELAS: Record<string, string> = {
  funcionarios: 'Funcionarios',
  departamentos: 'Departamentos',
  projetos: 'Projetos',
  folha: 'FolhaPagamento',
};
const VIEWS: Record<string, string> = {
  anomalias_folha: 'vw_AnomaliasFolha',
  folha_resumo: 'vw_FolhaResumo',
};
const OPERADORES: Record<string, FiltrosBusca['salarioOp']> = { '>': 'gt', '<': 'lt', '=': 'eq' };

const AJUDA = [
  'Comandos disponíveis:',
  '  ajuda                        mostra esta ajuda',
  '  limpar                       limpa a tela',
  '  listar <tabela>              funcionarios | departamentos | projetos | folha',
  '  buscar <campo> <op> <valor>  ex.: buscar salario > 10000',
  '  mostrar <view>               anomalias_folha | folha_resumo',
  '  abrir <nome>.func            abre os relacionamentos do funcionario',
  '  sql                          abre o Editor de Consultas',
];

function tabelaTexto(r: ResultadoConsulta): string[] {
  if (r.colunas.length === 0) return [`(${r.linhasAfetadas} linha(s) afetada(s))`];
  const linhas = [r.colunas.join(' | ')];
  for (const linha of r.linhas) {
    linhas.push(linha.map((v) => (v === null || v === undefined ? 'NULL' : String(v))).join(' | '));
  }
  if (r.truncado) linhas.push(`... (${r.totalLinhas} linhas no total)`);
  return linhas;
}

function funcionariosTexto(fs: Funcionario[]): string[] {
  if (fs.length === 0) return ['(nenhum funcionario encontrado)'];
  return fs.map((f) => `${f.id}  ${f.nome}  ${f.cargo ?? ''}  ${f.salario}  ${f.departamento ?? ''}`);
}

export async function executarComando(linha: string, ctx: ContextoTerminal): Promise<string[]> {
  const partes = linha.trim().split(/\s+/);
  const cmd = (partes[0] ?? '').toLowerCase();
  if (cmd === '') return [];

  if (cmd === 'ajuda') return AJUDA;
  if (cmd === 'limpar') {
    ctx.limpar();
    return [];
  }
  if (cmd === 'sql') {
    ctx.abrirApp('consulta');
    return ['Abrindo o Editor de Consultas...'];
  }

  if (cmd === 'listar') {
    const alvo = (partes[1] ?? '').toLowerCase();
    const tabela = TABELAS[alvo];
    if (!tabela) return [`Tabela desconhecida: ${alvo || '(vazio)'}. Tente: ${Object.keys(TABELAS).join(', ')}.`];
    return tabelaTexto(await ctx.consultar(`SELECT * FROM dbo.${tabela}`));
  }

  if (cmd === 'mostrar') {
    const alvo = (partes[1] ?? '').toLowerCase();
    const view = VIEWS[alvo];
    if (!view) return [`View desconhecida: ${alvo || '(vazio)'}. Tente: ${Object.keys(VIEWS).join(', ')}.`];
    return tabelaTexto(await ctx.consultar(`SELECT * FROM dbo.${view}`));
  }

  if (cmd === 'buscar') {
    const campo = (partes[1] ?? '').toLowerCase();
    const op = partes[2] ?? '';
    const valor = partes.slice(3).join(' ');
    const filtros: FiltrosBusca = {};
    if (campo === 'salario' && OPERADORES[op] && valor) {
      filtros.salarioOp = OPERADORES[op];
      filtros.salario = Number(valor);
    } else if (campo === 'nome' && op === '=' && valor) {
      filtros.nome = valor;
    } else {
      return ['Uso: buscar salario > 10000   |   buscar nome = Maria'];
    }
    return funcionariosTexto(await ctx.buscar(filtros));
  }

  if (cmd === 'abrir') {
    const nome = (partes[1] ?? '').replace(/\.func$/i, '');
    if (!nome) return ['Uso: abrir <nome>.func'];
    const achados = await ctx.buscar({ nome });
    const f = achados[0];
    if (!f) return [`Funcionario nao encontrado: ${nome}`];
    ctx.abrirApp('relacionamentos', { tipo: 'funcionario', id: f.id });
    return [`Abrindo relacionamentos de ${f.nome}...`];
  }

  return [`Comando ou nome invalido: ${cmd}. Digite "ajuda".`];
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/terminal/comandos.test.ts`
Expected: PASS — 9 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/aplicativos/terminal/comandos.ts apps/web/src/aplicativos/terminal/comandos.test.ts
git commit -m "feat(web): parser de comandos do Terminal (pt-BR, aliases whitelisted)"
```

---

### Task 1: Janela Terminal (TDD)

**Files:**
- Create: `apps/web/src/aplicativos/terminal/Terminal.tsx`
- Create: `apps/web/src/aplicativos/terminal/terminal.css`
- Test: `apps/web/src/aplicativos/terminal/Terminal.test.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/aplicativos/terminal/Terminal.test.tsx`**

Cobre os comandos locais (sem fetch): `ajuda` imprime, `limpar` limpa.

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Terminal } from './Terminal';

afterEach(() => vi.unstubAllGlobals());

function digitar(texto: string) {
  const input = screen.getByLabelText('Comando');
  fireEvent.change(input, { target: { value: texto } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

test('ajuda imprime os comandos', async () => {
  render(<Terminal />);
  digitar('ajuda');
  expect(await screen.findByText(/Comandos disponíveis/)).toBeInTheDocument();
});

test('limpar limpa a tela', async () => {
  render(<Terminal />);
  digitar('ajuda');
  await screen.findByText(/Comandos disponíveis/);
  digitar('limpar');
  await waitFor(() => expect(screen.queryByText(/Comandos disponíveis/)).toBeNull());
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/terminal/Terminal.test.tsx`
Expected: FAIL — `Cannot find module './Terminal'`.

- [ ] **Step 3: Implementar `apps/web/src/aplicativos/terminal/Terminal.tsx`**

```tsx
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { FiltrosBusca, Funcionario, ResultadoConsulta } from '@dbos/shared';
import { useLoja } from '../../areaTrabalho/loja';
import { requisitar } from '../../api/cliente';
import { executarComando, type ContextoTerminal } from './comandos';
import './terminal.css';

const PROMPT = 'C:\\DBOS>';

export function Terminal() {
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const [linhas, setLinhas] = useState<string[]>([
    'DBOS [Versão 1.0]',
    'Digite "ajuda" para ver os comandos.',
    '',
  ]);
  const [entrada, setEntrada] = useState('');
  const [historico, setHistorico] = useState<string[]>([]);
  const [indice, setIndice] = useState(-1);
  const fimRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLInputElement>(null);

  // Foca o input ao abrir o terminal.
  useEffect(() => {
    entradaRef.current?.focus();
  }, []);

  // Clicar em qualquer lugar do terminal foca o input (a não ser que haja
  // texto selecionado — para permitir copiar a saída).
  function focarEntrada() {
    if (window.getSelection()?.toString()) return;
    entradaRef.current?.focus();
  }

  const ctx: ContextoTerminal = {
    consultar: async (sql) => {
      const r = await requisitar<ResultadoConsulta>('/api/consulta', {
        method: 'POST',
        body: JSON.stringify({ sql }),
      });
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
    buscar: async (filtros: FiltrosBusca) => {
      const params = new URLSearchParams();
      for (const [chave, valor] of Object.entries(filtros)) {
        if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor));
      }
      const r = await requisitar<Funcionario[]>(`/api/busca/funcionarios?${params.toString()}`);
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
    abrirApp: (tipo, dados) => abrirJanela(tipo, dados),
    limpar: () => setLinhas([]),
  };

  async function submeter() {
    const texto = entrada;
    setLinhas((l) => [...l, `${PROMPT} ${texto}`]);
    setEntrada('');
    if (texto.trim()) setHistorico((h) => [...h, texto]);
    setIndice(-1);
    try {
      const saida = await executarComando(texto, ctx);
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
          <div key={i} className="terminal-linha">
            {l}
          </div>
        ))}
        <div className="terminal-prompt">
          <span className="terminal-ps">{PROMPT}</span>
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

- [ ] **Step 4: Criar `apps/web/src/aplicativos/terminal/terminal.css`**

```css
.terminal {
  height: 100%;
  background: #000;
  color: #33ff66;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  overflow: auto;
  padding: 6px;
}
.terminal-saida {
  white-space: pre-wrap;
  word-break: break-word;
}
.terminal-linha {
  min-height: 1em;
}
.terminal-prompt {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.terminal-ps {
  color: #33ff66;
  flex-shrink: 0;
}
.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #33ff66;
  caret-color: #33ff66;
  font-family: inherit;
  font-size: inherit;
}
/* Cursor piscando (caret nativo verde + bloco de acento opcional) */
@keyframes terminal-piscar {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
.terminal-ps::after {
  content: '_';
  animation: terminal-piscar 1s steps(1) infinite;
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/terminal/Terminal.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/aplicativos/terminal/Terminal.tsx apps/web/src/aplicativos/terminal/terminal.css apps/web/src/aplicativos/terminal/Terminal.test.tsx
git commit -m "feat(web): janela Terminal DOS (prompt + histórico + scrollback)"
```

---

### Task 2: Registrar o app `terminal` no WM

**Files:**
- Modify: `apps/web/src/areaTrabalho/tipos.ts`
- Modify: `apps/web/src/areaTrabalho/registroApps.tsx`
- Modify: `apps/web/src/areaTrabalho/AreaTrabalho.test.tsx`

- [ ] **Step 1: Adicionar `'terminal'` ao `TipoApp` em `apps/web/src/areaTrabalho/tipos.ts`**

```ts
export type TipoApp =
  | 'consulta'
  | 'explorador'
  | 'grade'
  | 'propriedades'
  | 'busca'
  | 'relacionamentos'
  | 'terminal';
```

- [ ] **Step 2: Registrar em `apps/web/src/areaTrabalho/registroApps.tsx`**

Import:

```tsx
import { Terminal } from '../aplicativos/terminal/Terminal';
```

Entrada no `registroApps`:

```tsx
  terminal: {
    titulo: 'Terminal',
    icone: '🖥️',
    tamanhoInicial: { largura: 600, altura: 380 },
    componente: Terminal,
  },
```

E em `ORDEM_APPS` (ao final):

```tsx
export const ORDEM_APPS: TipoApp[] = [
  'explorador',
  'busca',
  'consulta',
  'grade',
  'propriedades',
  'relacionamentos',
  'terminal',
];
```

- [ ] **Step 3: Atualizar o teste do desktop em `apps/web/src/areaTrabalho/AreaTrabalho.test.tsx`**

O menu de contexto do desktop agora tem 7 itens. Troque o teste:

```tsx
test('botão direito no fundo do desktop abre menu com os 7 apps', () => {
  const { container } = renderizar();
  const desktop = container.querySelector('.area-trabalho') as HTMLElement;
  fireEvent.contextMenu(desktop);
  const rotulos = useMenuContexto.getState().itens.map((i) => i.rotulo);
  expect(rotulos).toHaveLength(7);
  expect(rotulos.some((r) => r.includes('Explorador de Objetos'))).toBe(true);
});
```

- [ ] **Step 4: Checar tipos e rodar a suíte web**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros (a entrada `terminal` satisfaz o `Record<TipoApp, DefinicaoApp>`).

Run: `bun --filter @dbos/web test`
Expected: PASS — tudo, incluindo `comandos` (9), `Terminal` (2), `AreaTrabalho` (3, menu de 7).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/tipos.ts apps/web/src/areaTrabalho/registroApps.tsx apps/web/src/areaTrabalho/AreaTrabalho.test.tsx
git commit -m "feat(web): registra o app Terminal no gerenciador de janelas"
```

---

### Task 3: Verificação completa + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Checar tipos do web (garantia)**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 2: Documentar o Terminal no `README.md`**

Acrescente, na seção do desktop:

```markdown

O app **Terminal** é um prompt DOS (`C:\DBOS>`): `ajuda`, `limpar`,
`listar funcionarios`, `buscar salario > 10000`, `mostrar anomalias_folha`,
`abrir Felipe.func` (abre os Relacionamentos) e `sql` (abre o Editor). Histórico
com ↑/↓. `listar`/`mostrar` usam um mapa de aliases fixo (sem SQL livre).
```

- [ ] **Step 3: Rodar a suíte inteira do monorepo**

Run: `bun run test`
Expected: tudo verde — `@dbos/shared`, `@dbos/server`, `@dbos/web` (+ comandos 9 + Terminal 2; AreaTrabalho com menu de 7). Pré-requisito: `bun run db:setup`. Falhas SÓ por conexão SQL = ambiente.

- [ ] **Step 4: Verificar no navegador**

Em dois terminais:
```bash
bun run dev:server   # :3001
bun run dev:web      # :5173
```
Abra o **Terminal**. Confirme: `ajuda` lista os comandos; `listar funcionarios` imprime as linhas; `buscar salario > 10000` traz Felipe e cia.; `mostrar anomalias_folha` mostra a linha anômala; `abrir Felipe.func` abre a janela de Relacionamentos do Felipe; `sql` abre o Editor de Consultas; ↑/↓ navegam o histórico; `limpar` zera a tela.

Pare ambos com Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README — app Terminal (Plano 5)"
```

---

## Self-Review

**Spec coverage (Plano 5 / spec §5.3, §10.5):**
- Prompt DOS (preto/verde/cursor/`C:\DBOS>`), histórico, scrollback (spec §5.3) → Tasks 0–1. ✓
- Comandos pt-BR `ajuda`/`limpar`/`listar`/`buscar`/`mostrar`/`abrir`/`sql` (spec §5.3) → Task 0 (`executarComando`). ✓
- `listar`/`mostrar` via `/api/consulta` com mapa de aliases whitelisted, sem injeção (spec §5.3, decisões) → Task 0/1. ✓
- `buscar` via `/api/busca` (Plano 1); `abrir` → Relacionamentos (Plano 4); `sql` → Editor (Fase 4) → Task 0/1. ✓
- App registrado como entrada genérica do WM (spec §4.2) → Task 2. ✓
- Reuso de endpoints existentes, sem backend novo (spec §3, §5.3) → confirma. ✓

**Placeholder scan:** Sem TBD/TODO; código completo em cada passo.

**Type consistency:** `ContextoTerminal`/`executarComando` (Task 0) consumidos pelo `Terminal` (Task 1) com o `ctx` real (requisitar + `abrirJanela`). `ResultadoConsulta`/`Funcionario`/`FiltrosBusca` (shared) usados no parser e no componente. `abrirApp('relacionamentos'|'consulta', dados?)` cai em `abrirJanela(tipoApp, dados)` — ambos válidos. `TipoApp` ganha `'terminal'`; `registroApps` (Record) exige/fornece a entrada; `ORDEM_APPS` inclui → menu do desktop com 7 (teste atualizado). ✓

**Riscos/observações:**
- `executarComando` é puro com efeitos injetados → 9 testes sem DOM/fetch; o componente tem teste leve (ajuda/limpar) e os comandos de API são verificados no navegador (Task 3) e cobertos pela lógica do parser.
- `scrollIntoView` é chamado com `?.()` (jsdom pode não implementá-lo) para não quebrar testes.
- `listar`/`mostrar` constroem o `SELECT` só de nomes do mapa fixo → sem injeção; o teto de linhas do `/api/consulta` (Fase 4) limita a saída e `truncado` é indicado.
- Adicionar `'terminal'` ao `ORDEM_APPS` muda a contagem do menu do desktop (6 → 7); o teste do `AreaTrabalho` é atualizado no mesmo passo.
- **Fim do overhaul:** com este plano, todos os apps da spec (§5) estão entregues e o checklist acadêmico (§8) coberto.
