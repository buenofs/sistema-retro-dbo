# DBOS — Fase 4: Editor de Consultas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o Editor de Consultas — um app com editor SQL (CodeMirror), execução de **SQL livre (pass-through)** contra o login da sessão, com **timeout de statement** e **teto de linhas** (hardening), uma **grade de resultado virtualizada**, e **diálogos de erro retrô** (o `<GerenciadorDialogos>` da spec §6.4). O CodeMirror entra **lazy-loaded** (spec §2.3).

**Architecture:** Pass-through é o único ponto onde o SQL do usuário roda verbatim; a fronteira de segurança é a permissão do próprio login no banco + timeout + teto de linhas (spec §2.2, §5.6). `POST /api/consulta` valida o corpo (zod), pega o `ConnectionPool` da sessão e roda o SQL cru; o resultado é moldado em `{ colunas, linhas, linhasAfetadas, truncado, totalLinhas }`. Erros do driver sobem ao `tratadorErros` já existente, agora também distinguindo **timeout** (`tempoEsgotado`). No web, `useExecutarConsulta` é uma `useMutation` (spec §6.2); falhas abrem um diálogo modal 98.css dirigido por uma loja Zustand `useDialogos` (spec §6.4), montado uma vez no desktop. A grade usa **`@tanstack/react-virtual`** (spec §2.3). O app é registrado via **`React.lazy`** e o `<Janela>` passa a envolver o app num `<Suspense>` — a infra de code-splitting que faltava (spec §2.3, §4.2).

**Tech Stack:** Backend: Fastify 4, `mssql`/Tedious, zod, `bun:test` (integração real). Frontend: React 18, TanStack Query, **Zustand** (diálogos), **`@uiw/react-codemirror` + `@codemirror/lang-sql`**, **`@tanstack/react-virtual`**, 98.css, Web Audio (bipe), Vitest + RTL. pt-BR em tudo que autoramos; SQL cru, sem ORM.

**Builds on Phases 0–3:**
- `@dbos/shared`: `Resposta<T>`, `ErroApi`.
- `apps/server`: `criarAutenticar` + `req.sessao!.pool`; `tratadorErros.ts` (`mapearErroSql` + handler global, status `sql`→400/`rede`→503/resto→500); `conexao.ts` (`configDoAmbiente`/`configParaLogin`); harness `comServidor`; rotas registradas dentro do contexto do cookie em `app.ts`.
- `apps/web`: `requisitar<T>`; `QueryClientProvider` em `main.tsx`; WM em `areaTrabalho/` — `registroApps.tsx` (`consulta` ainda usa `AppPlaceholder`), `Janela.tsx` (renderiza `<Componente>` dentro de `<LimiteErroJanela>`), `AreaTrabalho.tsx` (desktop); apps reais em `aplicativos/`.

---

### Decisões de escopo desta fase (registradas)

- **Pass-through 1 recordset:** `executarConsulta` devolve o **primeiro** recordset (caso SELECT) e a soma de `rowsAffected` (INSERT/UPDATE/DELETE). Scripts com múltiplos SELECTs mostram o primeiro — múltiplas grades ficam para depois.
- **Teto de linhas no servidor:** corta o recordset em `SQL_MAX_LINHAS` (padrão 1000) antes de serializar e marca `truncado`/`totalLinhas`. Não dá para injetar `TOP/OFFSET` em SQL arbitrário; o corte limita o payload (spec §2.3 "max rows per response"). O DB ainda executa por inteiro — tradeoff aceito para v1.
- **Timeout de statement:** `requestTimeout` no config do pool (`SQL_TIMEOUT_MS`, padrão 30000). Timeout do driver vira `tempoEsgotado` (status 504) no `tratadorErros` (spec §5.6, §6.3).
- **Diálogos (spec §6.4):** loja `useDialogos` + `<GerenciadorDialogos>` modal com título, ícone, mensagem pt-BR, "Detalhes" expansível (SQL cru + `codigoSql`), OK e **bipe** Web-Audio. Tipos `erro`/`aviso`/`info` (o editor só usa `erro` nesta fase).
- **Lazy + Suspense:** introduzidos agora (CodeMirror justifica). `<Janela>` envolve o app em `<Suspense>`; isso é inócuo para os apps não-lazy.
- **Rate-limit no /login (spec §5.6):** adiado para o polimento (Fase 7) — não é do Editor.

---

### File structure for this phase

**`packages/shared/src/`**
- Create `consulta.ts` — `ResultadoConsulta`, `RespostaConsulta`, `esquemaConsulta`/`Consulta`.
- Modify `index.ts` — exportar.
- Test `consulta.test.ts` — zod.

**`apps/server/src/`**
- Modify `plugins/tratadorErros.ts` — detectar `ETIMEOUT` → `tempoEsgotado`; status 504.
- Modify `plugins/tratadorErros.test.ts` — caso de timeout.
- Modify `bd/conexao.ts` — `requestTimeout` no `configDoAmbiente`.
- Modify `.env.example` — `SQL_TIMEOUT_MS`, `SQL_MAX_LINHAS`.
- Create `bd/consultasUsuario.ts` — `executarConsulta`.
- Create `rotas/consulta.ts` — `registrarRotasConsulta`.
- Modify `app.ts` — registrar a rota no contexto autenticado.
- Test `rotas/consulta.test.ts` — integração real.

**`apps/web/src/areaTrabalho/`**
- Create `useDialogos.ts` — loja Zustand de diálogos.
- Create `tocarBipe.ts` — bipe Web-Audio.
- Create `GerenciadorDialogos.tsx` — portal modal 98.css.
- Modify `areaTrabalho.css` — estilos dos diálogos.
- Modify `AreaTrabalho.tsx` — montar `<GerenciadorDialogos />`.
- Modify `Janela.tsx` — envolver o app em `<Suspense>`.
- Modify `registroApps.tsx` — `consulta` vira `React.lazy(EditorConsultas)`.
- Tests: `useDialogos.test.ts`, `GerenciadorDialogos.test.tsx`.

**`apps/web/src/aplicativos/consulta/`**
- Create `ganchos.ts` — `useExecutarConsulta` + `ErroApiError`.
- Create `GradeResultado.tsx` — grade virtualizada.
- Create `EditorConsultas.tsx` — editor + execução + grade + diálogo.
- Create `consulta.css` — estilos do editor/grade.
- Tests: `GradeResultado.test.tsx`, `EditorConsultas.test.tsx`.

**`apps/web/package.json`** — Modify (deps CodeMirror + react-virtual).
**`README.md`** — Modify.

---

### Task 0: `@dbos/shared` — contrato de consulta (TDD do zod)

**Files:**
- Create: `packages/shared/src/consulta.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/consulta.test.ts`

- [ ] **Step 1: Escrever o teste que falha `packages/shared/src/consulta.test.ts`**

```ts
import { test, expect } from 'bun:test';
import { esquemaConsulta } from './consulta';

test('aceita um SQL não vazio', () => {
  const r = esquemaConsulta.safeParse({ sql: 'SELECT 1' });
  expect(r.success).toBe(true);
});

test('rejeita SQL vazio', () => {
  const r = esquemaConsulta.safeParse({ sql: '' });
  expect(r.success).toBe(false);
});

test('rejeita corpo sem sql', () => {
  const r = esquemaConsulta.safeParse({});
  expect(r.success).toBe(false);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd packages/shared && bun test src/consulta.test.ts`
Expected: FAIL — `Cannot find module './consulta'`.

- [ ] **Step 3: Implementar `packages/shared/src/consulta.ts`**

```ts
import { z } from 'zod';
import type { Resposta } from './respostas';

// Resultado de uma execução de SQL pass-through.
export interface ResultadoConsulta {
  colunas: string[]; // nomes das colunas, em ordem
  linhas: unknown[][]; // cada linha é um array na ordem de `colunas`
  linhasAfetadas: number; // soma de rowsAffected (INSERT/UPDATE/DELETE)
  truncado: boolean; // true se o teto de linhas foi atingido
  totalLinhas: number; // total retornado antes do corte
}

export type RespostaConsulta = Resposta<ResultadoConsulta>;

// Corpo de POST /api/consulta. Limite generoso só pra barrar payload absurdo.
export const esquemaConsulta = z.object({
  sql: z.string().min(1, 'Informe o SQL.').max(100_000),
});
export type Consulta = z.infer<typeof esquemaConsulta>;
```

- [ ] **Step 4: Exportar do barril `packages/shared/src/index.ts`**

```ts
export * from './respostas';
export * from './credenciais';
export * from './sessao';
export * from './explorador';
export * from './consulta';
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd packages/shared && bun test src/consulta.test.ts`
Expected: PASS — 3 testes.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/consulta.ts packages/shared/src/consulta.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): contrato de consulta (ResultadoConsulta, esquemaConsulta)"
```

---

### Task 1: Servidor — timeout de statement + mapeamento `tempoEsgotado` (TDD)

**Files:**
- Modify: `apps/server/src/plugins/tratadorErros.ts`
- Modify: `apps/server/src/plugins/tratadorErros.test.ts`
- Modify: `apps/server/src/bd/conexao.ts`
- Modify: `.env.example`

- [ ] **Step 1: Acrescentar o teste de timeout em `apps/server/src/plugins/tratadorErros.test.ts`**

Adicione este teste ao final do arquivo (mantenha os três existentes):

```ts
test('mapeia timeout do driver (ETIMEOUT) para tempoEsgotado', () => {
  const erro = new sql.RequestError('Timeout: Request failed to complete', 'ETIMEOUT');
  const api = mapearErroSql(erro);
  expect(api.tipo).toBe('tempoEsgotado');
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd apps/server && bun test --env-file=../../.env src/plugins/tratadorErros.test.ts`
Expected: FAIL — hoje um `RequestError` vira `sql`, então `tipo` é `'sql'`, não `'tempoEsgotado'`.

- [ ] **Step 3: Distinguir o timeout em `apps/server/src/plugins/tratadorErros.ts`**

No `mapearErroSql`, troque o bloco do `RequestError` para detectar o código `ETIMEOUT` antes de cair no caso genérico `sql`:

```ts
  if (erro instanceof sql.RequestError) {
    if ((erro as { code?: string }).code === 'ETIMEOUT') {
      return {
        tipo: 'tempoEsgotado',
        mensagem: 'A consulta excedeu o tempo limite e foi cancelada.',
        detalhe: erro.message,
      };
    }
    return {
      tipo: 'sql',
      mensagem: 'O banco de dados recusou o comando.',
      detalhe: erro.message,
      codigoSql: (erro as { number?: number }).number,
      severidade: (erro as { class?: number }).class,
    };
  }
```

E no `registrarTratadorErros`, inclua o status 504 para `tempoEsgotado`:

```ts
    const status =
      apiErro.tipo === 'sql'
        ? 400
        : apiErro.tipo === 'tempoEsgotado'
          ? 504
          : apiErro.tipo === 'rede'
            ? 503
            : 500;
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd apps/server && bun test --env-file=../../.env src/plugins/tratadorErros.test.ts`
Expected: PASS — 4 testes (os 3 antigos + o de timeout).

- [ ] **Step 5: Adicionar `requestTimeout` ao pool em `apps/server/src/bd/conexao.ts`**

No `configDoAmbiente`, acrescente o campo `requestTimeout` (top-level do config mssql) lendo de `SQL_TIMEOUT_MS`. O objeto retornado fica:

```ts
  return {
    server: process.env.SQL_SERVIDOR ?? 'localhost',
    port: Number(process.env.SQL_PORTA ?? 1433),
    user: process.env.SQL_USUARIO ?? 'sa',
    password: process.env.SQL_SENHA ?? '',
    database: process.env.SQL_BANCO ?? 'master',
    requestTimeout: Number(process.env.SQL_TIMEOUT_MS ?? 30_000),
    options: {
      // Em ambiente local o certificado é autoassinado.
      encrypt: true,
      trustServerCertificate: true,
    },
  };
```

(O `configParaLogin` espalha `...configDoAmbiente()`, então herda o timeout automaticamente.)

- [ ] **Step 6: Documentar as variáveis em `.env.example`**

Acrescente ao final do `.env.example`:

```dotenv
# Tempo limite (ms) por statement SQL (Editor de Consultas e demais).
SQL_TIMEOUT_MS=30000
# Teto de linhas devolvidas por consulta (corte do payload).
SQL_MAX_LINHAS=1000
```

- [ ] **Step 7: Confirmar que a suíte do servidor segue verde**

Run: `bun --filter @dbos/server test`
Expected: PASS — tudo, incluindo tratadorErros (4).

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/plugins/tratadorErros.ts apps/server/src/plugins/tratadorErros.test.ts apps/server/src/bd/conexao.ts .env.example
git commit -m "feat(server): timeout de statement + mapeamento tempoEsgotado"
```

---

### Task 2: Servidor — execução de SQL pass-through

Função pura que recebe o pool e o SQL, roda verbatim e molda o resultado. Exige DB real → sem teste unitário; coberta ponta a ponta pela Task 3.

**Files:**
- Create: `apps/server/src/bd/consultasUsuario.ts`

- [ ] **Step 1: Implementar `apps/server/src/bd/consultasUsuario.ts`**

```ts
import type { ConnectionPool } from 'mssql';
import type { ResultadoConsulta } from '@dbos/shared';

// Roda o SQL do usuário VERBATIM (pass-through, spec §2.2). A fronteira de
// segurança é a permissão do login + o requestTimeout do pool + o teto aqui.
export async function executarConsulta(
  pool: ConnectionPool,
  sqlTexto: string,
  maxLinhas: number,
): Promise<ResultadoConsulta> {
  const resultado = await pool.request().query(sqlTexto);

  // rowsAffected: um número por statement; somamos para o total.
  const linhasAfetadas = (resultado.rowsAffected ?? []).reduce((a, b) => a + b, 0);

  // Sem recordset (INSERT/UPDATE/DELETE): só linhas afetadas.
  const recordset = resultado.recordset;
  if (!recordset) {
    return { colunas: [], linhas: [], linhasAfetadas, truncado: false, totalLinhas: 0 };
  }

  // columns preserva a ordem de declaração das colunas.
  const colunas = recordset.columns ? Object.keys(recordset.columns) : [];
  const totalLinhas = recordset.length;
  const truncado = totalLinhas > maxLinhas;
  const cortadas = truncado ? recordset.slice(0, maxLinhas) : recordset;
  const linhas = cortadas.map((linha) =>
    colunas.map((c) => {
      const valor = (linha as Record<string, unknown>)[c];
      return valor === undefined ? null : valor;
    }),
  );

  return { colunas, linhas, linhasAfetadas, truncado, totalLinhas };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/bd/consultasUsuario.ts
git commit -m "feat(server): execução de SQL pass-through (executarConsulta)"
```

---

### Task 3: Servidor — rota de consulta + integração com SQL Server real (TDD)

Portão ponta a ponta do servidor.

**Files:**
- Create: `apps/server/src/rotas/consulta.ts`
- Modify: `apps/server/src/app.ts`
- Test: `apps/server/src/rotas/consulta.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/server/src/rotas/consulta.test.ts`**

```ts
import { test, expect, afterEach } from 'bun:test';
import { construirApp } from '../app';

async function comServidor(fn: (base: string) => Promise<void>) {
  const app = construirApp();
  await app.listen({ port: 0, host: '127.0.0.1' });
  try {
    const { port } = app.server.address() as { port: number };
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await app.close();
  }
}

const SA = { login: 'sa', senha: process.env.SQL_SENHA ?? '' };

async function entrar(base: string): Promise<string> {
  const r = await fetch(`${base}/api/autenticacao/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(SA),
  });
  return r.headers.get('set-cookie')!.split(';')[0];
}

function consultar(base: string, cookie: string, sql: string) {
  return fetch(`${base}/api/consulta`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ sql }),
  });
}

afterEach(() => {
  delete process.env.SQL_MAX_LINHAS;
});

test('sem cookie, /consulta devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/consulta`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sql: 'SELECT 1' }),
    });
    expect(r.status).toBe(401);
    expect((await r.json()).erro.tipo).toBe('autenticacao');
  });
});

test('SELECT simples devolve colunas e linhas', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await consultar(base, cookie, 'SELECT 1 AS um, 2 AS dois');
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    expect(dados.colunas).toEqual(['um', 'dois']);
    expect(dados.linhas).toEqual([[1, 2]]);
    expect(dados.truncado).toBe(false);
  });
});

test('SQL inválido devolve erro tipo sql com codigoSql 208', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await consultar(base, cookie, 'SELECT * FROM tabela_inexistente_xyz_123');
    expect(r.status).toBe(400);
    const { erro } = await r.json();
    expect(erro.tipo).toBe('sql');
    expect(erro.codigoSql).toBe(208); // Invalid object name
  });
});

test('corpo sem sql devolve 400 de validação', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/consulta`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ sql: '' }),
    });
    expect(r.status).toBe(400);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});

test('teto de linhas marca truncado e corta as linhas', async () => {
  process.env.SQL_MAX_LINHAS = '2'; // lido por construirApp dentro de comServidor
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await consultar(
      base,
      cookie,
      'SELECT n FROM (VALUES (1),(2),(3)) AS t(n)',
    );
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    expect(dados.totalLinhas).toBe(3);
    expect(dados.truncado).toBe(true);
    expect(dados.linhas.length).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/consulta.test.ts`
Expected: FAIL — a rota não existe (404), as asserções falham (ou erro de compilação quando `app.ts` importar a rota no Step 4).

- [ ] **Step 3: Implementar `apps/server/src/rotas/consulta.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { esquemaConsulta, type RespostaConsulta } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { executarConsulta } from '../bd/consultasUsuario';

export function registrarRotasConsulta(
  app: FastifyInstance,
  gerenciador: GerenciadorPools,
): void {
  const autenticar = criarAutenticar(gerenciador);

  app.post('/api/consulta', { preHandler: autenticar }, async (req, reply) => {
    const analise = esquemaConsulta.safeParse(req.body);
    if (!analise.success) {
      return reply.status(400).send({
        ok: false,
        erro: {
          tipo: 'validacao',
          mensagem: 'Informe o SQL a executar.',
          detalhe: analise.error.issues[0]?.message,
        },
      });
    }
    // Lido a cada request para os testes poderem sobrescrever o teto.
    const maxLinhas = Number(process.env.SQL_MAX_LINHAS ?? 1000);
    const dados = await executarConsulta(req.sessao!.pool, analise.data.sql, maxLinhas);
    const resposta: RespostaConsulta = { ok: true, dados };
    return resposta;
  });
}
```

- [ ] **Step 4: Registrar a rota no contexto autenticado em `apps/server/src/app.ts`**

Adicione o import no topo:

```ts
import { registrarRotasConsulta } from './rotas/consulta';
```

E dentro do bloco `app.register(async (instancia) => { ... })`, após `registrarRotasExplorador(instancia, gerenciador);`, acrescente:

```ts
    registrarRotasConsulta(instancia, gerenciador);
```

- [ ] **Step 5: Rodar o teste de integração e confirmar que passa**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/consulta.test.ts`
Expected: PASS — 5 testes. (Falha por `ELOGIN`/conexão recusada = ambiente, não código.)

- [ ] **Step 6: Confirmar a suíte inteira do servidor**

Run: `bun --filter @dbos/server test`
Expected: PASS — saúde, conexão, gerenciadorPools, configParaLogin, tratadorErros (4), autenticação, explorador, consulta (5).

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/rotas/consulta.ts apps/server/src/rotas/consulta.test.ts apps/server/src/app.ts
git commit -m "feat(server): rota de consulta (SQL livre) ponta a ponta"
```

---

### Task 4: Web — loja de diálogos `useDialogos` (TDD)

**Files:**
- Create: `apps/web/src/areaTrabalho/useDialogos.ts`
- Test: `apps/web/src/areaTrabalho/useDialogos.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/areaTrabalho/useDialogos.test.ts`**

```ts
import { test, expect, beforeEach } from 'vitest';
import { useDialogos, estadoInicialDialogos } from './useDialogos';

beforeEach(() => useDialogos.setState(estadoInicialDialogos()));

test('abrir adiciona um diálogo com id', () => {
  useDialogos.getState().abrir({ tipo: 'erro', titulo: 'Erro', mensagem: 'falhou' });
  const { dialogos } = useDialogos.getState();
  expect(dialogos).toHaveLength(1);
  expect(dialogos[0]!.id).toBeGreaterThan(0);
  expect(dialogos[0]!.tipo).toBe('erro');
});

test('fechar remove pelo id', () => {
  useDialogos.getState().abrir({ tipo: 'info', titulo: 'Oi', mensagem: 'tudo bem' });
  const id = useDialogos.getState().dialogos[0]!.id;
  useDialogos.getState().fechar(id);
  expect(useDialogos.getState().dialogos).toHaveLength(0);
});

test('ids são únicos entre diálogos', () => {
  const loja = useDialogos.getState();
  loja.abrir({ tipo: 'erro', titulo: 'A', mensagem: '1' });
  loja.abrir({ tipo: 'erro', titulo: 'B', mensagem: '2' });
  const ids = useDialogos.getState().dialogos.map((d) => d.id);
  expect(new Set(ids).size).toBe(2);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/useDialogos.test.ts`
Expected: FAIL — `Cannot find module './useDialogos'`.

- [ ] **Step 3: Implementar `apps/web/src/areaTrabalho/useDialogos.ts`**

```ts
import { create } from 'zustand';

export type TipoDialogo = 'erro' | 'aviso' | 'info';

export interface Dialogo {
  id: number;
  tipo: TipoDialogo;
  titulo: string;
  mensagem: string;
  detalhe?: string;
}

interface LojaDialogos {
  dialogos: Dialogo[];
  proximoId: number;
  abrir: (dialogo: Omit<Dialogo, 'id'>) => void;
  fechar: (id: number) => void;
}

export function estadoInicialDialogos() {
  return { dialogos: [] as Dialogo[], proximoId: 1 };
}

export const useDialogos = create<LojaDialogos>((set) => ({
  ...estadoInicialDialogos(),
  abrir: (dialogo) =>
    set((s) => ({
      dialogos: [...s.dialogos, { ...dialogo, id: s.proximoId }],
      proximoId: s.proximoId + 1,
    })),
  fechar: (id) => set((s) => ({ dialogos: s.dialogos.filter((d) => d.id !== id) })),
}));
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/useDialogos.test.ts`
Expected: PASS — 3 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/useDialogos.ts apps/web/src/areaTrabalho/useDialogos.test.ts
git commit -m "feat(web): loja de diálogos (useDialogos)"
```

---

### Task 5: Web — `<GerenciadorDialogos>` + bipe + montagem (TDD)

**Files:**
- Create: `apps/web/src/areaTrabalho/tocarBipe.ts`
- Create: `apps/web/src/areaTrabalho/GerenciadorDialogos.tsx`
- Test: `apps/web/src/areaTrabalho/GerenciadorDialogos.test.tsx`
- Modify: `apps/web/src/areaTrabalho/areaTrabalho.css`
- Modify: `apps/web/src/areaTrabalho/AreaTrabalho.tsx`

- [ ] **Step 1: Implementar `apps/web/src/areaTrabalho/tocarBipe.ts`**

```ts
// Bipe curto estilo "system beep" via Web Audio. Silencioso onde não há áudio
// (ex.: jsdom não tem AudioContext) — falha graciosamente.
export function tocarBipe(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 480;
    ganho.gain.value = 0.05;
    osc.connect(ganho);
    ganho.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => void ctx.close();
  } catch {
    // sem áudio disponível — ignore
  }
}
```

- [ ] **Step 2: Escrever o teste que falha `apps/web/src/areaTrabalho/GerenciadorDialogos.test.tsx`**

```tsx
import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GerenciadorDialogos } from './GerenciadorDialogos';
import { useDialogos, estadoInicialDialogos } from './useDialogos';

beforeEach(() => useDialogos.setState(estadoInicialDialogos()));

test('não renderiza nada quando não há diálogos', () => {
  const { container } = render(<GerenciadorDialogos />);
  expect(container).toBeEmptyDOMElement();
});

test('mostra título, mensagem e detalhe de um diálogo de erro', () => {
  useDialogos.getState().abrir({
    tipo: 'erro',
    titulo: 'Erro',
    mensagem: 'Objeto inválido.',
    detalhe: 'Erro SQL 208',
  });
  render(<GerenciadorDialogos />);
  expect(screen.getByText('Objeto inválido.')).toBeInTheDocument();
  expect(screen.getByText('Erro SQL 208')).toBeInTheDocument();
});

test('OK fecha o diálogo', () => {
  useDialogos.getState().abrir({ tipo: 'erro', titulo: 'Erro', mensagem: 'x' });
  render(<GerenciadorDialogos />);
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  expect(useDialogos.getState().dialogos).toHaveLength(0);
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/GerenciadorDialogos.test.tsx`
Expected: FAIL — `Cannot find module './GerenciadorDialogos'`.

- [ ] **Step 4: Implementar `apps/web/src/areaTrabalho/GerenciadorDialogos.tsx`**

```tsx
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { type Dialogo, useDialogos } from './useDialogos';
import { tocarBipe } from './tocarBipe';

const ICONE: Record<Dialogo['tipo'], string> = {
  erro: '❌',
  aviso: '⚠️',
  info: 'ℹ️',
};

// Portal único de diálogos modais 98.css (spec §6.4). Montado uma vez no desktop.
export function GerenciadorDialogos() {
  const dialogos = useDialogos(useShallow((s) => s.dialogos));
  const fechar = useDialogos((s) => s.fechar);
  if (dialogos.length === 0) return null;
  return (
    <div className="camada-dialogos">
      {dialogos.map((d) => (
        <CaixaDialogo key={d.id} dialogo={d} aoFechar={() => fechar(d.id)} />
      ))}
    </div>
  );
}

function CaixaDialogo({ dialogo, aoFechar }: { dialogo: Dialogo; aoFechar: () => void }) {
  // Bipe ao abrir (spec §6.4).
  useEffect(() => {
    tocarBipe();
  }, []);

  return (
    <div className="dialogo-fundo" role="dialog" aria-modal="true" aria-label={dialogo.titulo}>
      <div className="window dialogo-janela">
        <div className="title-bar">
          <div className="title-bar-text">{dialogo.titulo}</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={aoFechar} />
          </div>
        </div>
        <div className="window-body">
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 24, lineHeight: 1 }} aria-hidden="true">
              {ICONE[dialogo.tipo]}
            </span>
            <p style={{ margin: 0 }}>{dialogo.mensagem}</p>
          </div>
          {dialogo.detalhe && (
            <details style={{ marginTop: 8 }}>
              <summary>Detalhes</summary>
              <pre>{dialogo.detalhe}</pre>
            </details>
          )}
          <div className="field-row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={aoFechar}>OK</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/GerenciadorDialogos.test.tsx`
Expected: PASS — 3 testes.

- [ ] **Step 6: Estilos dos diálogos — acrescentar ao final de `apps/web/src/areaTrabalho/areaTrabalho.css`**

```css
/* Diálogos modais (spec §6.4) — acima de tudo, inclusive a barra de tarefas */
.camada-dialogos {
  position: fixed;
  inset: 0;
  z-index: 20000;
}
.dialogo-fundo {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialogo-janela {
  min-width: 300px;
  max-width: 460px;
}
.dialogo-janela pre {
  margin: 4px 0 0;
  max-height: 160px;
  overflow: auto;
  background: #fff;
  border: 1px solid grey;
  padding: 4px;
  white-space: pre-wrap;
  font-size: 11px;
}
```

- [ ] **Step 7: Montar o gerenciador no desktop `apps/web/src/areaTrabalho/AreaTrabalho.tsx`**

Adicione o import:

```tsx
import { GerenciadorDialogos } from './GerenciadorDialogos';
```

E, dentro do `<div className="area-trabalho">`, logo após `<BarraTarefas login={usuario.login} />`, acrescente:

```tsx
      <GerenciadorDialogos />
```

- [ ] **Step 8: Rodar a suíte web inteira**

Run: `bun --filter @dbos/web test`
Expected: PASS — tudo + `useDialogos` (3) + `GerenciadorDialogos` (3).

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/areaTrabalho/tocarBipe.ts apps/web/src/areaTrabalho/GerenciadorDialogos.tsx apps/web/src/areaTrabalho/GerenciadorDialogos.test.tsx apps/web/src/areaTrabalho/areaTrabalho.css apps/web/src/areaTrabalho/AreaTrabalho.tsx
git commit -m "feat(web): gerenciador de diálogos retrô + bipe"
```

---

### Task 6: Web — gancho de execução de consulta

Mutation fina + erro tipado que carrega o `ErroApi` (pro diálogo mostrar detalhe/código). Exercitado pelo teste do editor (Task 8); sem teste próprio.

**Files:**
- Create: `apps/web/src/aplicativos/consulta/ganchos.ts`

- [ ] **Step 1: Implementar `apps/web/src/aplicativos/consulta/ganchos.ts`**

```ts
import { useMutation } from '@tanstack/react-query';
import type { ErroApi, ResultadoConsulta } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

// Erro que preserva o ErroApi inteiro (mensagem + detalhe + codigoSql) para o diálogo.
export class ErroApiError extends Error {
  constructor(public readonly erro: ErroApi) {
    super(erro.mensagem);
    this.name = 'ErroApiError';
  }
}

export function useExecutarConsulta() {
  return useMutation({
    mutationFn: async (sqlTexto: string): Promise<ResultadoConsulta> => {
      const r = await requisitar<ResultadoConsulta>('/api/consulta', {
        method: 'POST',
        body: JSON.stringify({ sql: sqlTexto }),
      });
      if (!r.ok) throw new ErroApiError(r.erro);
      return r.dados;
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/aplicativos/consulta/ganchos.ts
git commit -m "feat(web): gancho de execução de consulta (useExecutarConsulta)"
```

---

### Task 7: Web — grade de resultado virtualizada (TDD)

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/aplicativos/consulta/GradeResultado.tsx`
- Test: `apps/web/src/aplicativos/consulta/GradeResultado.test.tsx`

- [ ] **Step 1: Adicionar `@tanstack/react-virtual` em `apps/web/package.json`**

No bloco `dependencies`, acrescente (mantendo as demais em ordem alfabética):

```json
    "@tanstack/react-virtual": "^3.10.8",
```

- [ ] **Step 2: Instalar**

Run: `bun install`
Expected: `@tanstack/react-virtual` resolve; `bun.lock` atualiza.

- [ ] **Step 3: Escrever o teste que falha `apps/web/src/aplicativos/consulta/GradeResultado.test.tsx`**

A virtualização não mede layout no jsdom de forma confiável, então o teste cobre as partes sempre renderizadas (cabeçalhos, estado de "linhas afetadas", aviso de truncamento). O conteúdo das linhas é verificado no navegador (Task 9).

```tsx
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GradeResultado } from './GradeResultado';
import type { ResultadoConsulta } from '@dbos/shared';

function resultado(p: Partial<ResultadoConsulta>): ResultadoConsulta {
  return { colunas: [], linhas: [], linhasAfetadas: 0, truncado: false, totalLinhas: 0, ...p };
}

test('mostra os cabeçalhos de coluna', () => {
  render(<GradeResultado resultado={resultado({ colunas: ['id', 'nome'], linhas: [[1, 'Ana']], totalLinhas: 1 })} />);
  expect(screen.getByText('id')).toBeInTheDocument();
  expect(screen.getByText('nome')).toBeInTheDocument();
});

test('sem colunas, mostra as linhas afetadas', () => {
  render(<GradeResultado resultado={resultado({ linhasAfetadas: 3 })} />);
  expect(screen.getByText(/Linhas afetadas: 3/)).toBeInTheDocument();
});

test('mostra aviso quando truncado', () => {
  render(
    <GradeResultado
      resultado={resultado({ colunas: ['n'], linhas: [[1]], truncado: true, totalLinhas: 5000 })}
    />,
  );
  expect(screen.getByText(/5000/)).toBeInTheDocument();
});
```

- [ ] **Step 4: Rodar o teste e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/consulta/GradeResultado.test.tsx`
Expected: FAIL — `Cannot find module './GradeResultado'`.

- [ ] **Step 5: Implementar `apps/web/src/aplicativos/consulta/GradeResultado.tsx`**

```tsx
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ResultadoConsulta } from '@dbos/shared';

const ALTURA_LINHA = 22;

function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function GradeResultado({ resultado }: { resultado: ResultadoConsulta }) {
  const corpoRef = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({
    count: resultado.linhas.length,
    getScrollElement: () => corpoRef.current,
    estimateSize: () => ALTURA_LINHA,
    overscan: 12,
  });

  // Comando sem recordset (INSERT/UPDATE/DELETE).
  if (resultado.colunas.length === 0) {
    return (
      <p style={{ padding: 8 }}>Comando executado. Linhas afetadas: {resultado.linhasAfetadas}.</p>
    );
  }

  const colunas = `repeat(${resultado.colunas.length}, minmax(120px, 1fr))`;

  return (
    <div className="grade-resultado">
      <div className="grade-cabecalho" style={{ gridTemplateColumns: colunas }}>
        {resultado.colunas.map((c) => (
          <div key={c} className="grade-celula grade-th">
            {c}
          </div>
        ))}
      </div>
      <div ref={corpoRef} className="grade-corpo">
        <div style={{ height: virtual.getTotalSize(), position: 'relative' }}>
          {virtual.getVirtualItems().map((item) => {
            const linha = resultado.linhas[item.index]!;
            return (
              <div
                key={item.key}
                className="grade-linha"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: ALTURA_LINHA,
                  transform: `translateY(${item.start}px)`,
                  display: 'grid',
                  gridTemplateColumns: colunas,
                }}
              >
                {linha.map((valor, i) => (
                  <div key={i} className="grade-celula">
                    {formatarValor(valor)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {resultado.truncado && (
        <p className="grade-aviso">
          Mostrando as primeiras {resultado.linhas.length} de {resultado.totalLinhas} linhas.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/consulta/GradeResultado.test.tsx`
Expected: PASS — 3 testes.

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json bun.lock apps/web/src/aplicativos/consulta/GradeResultado.tsx apps/web/src/aplicativos/consulta/GradeResultado.test.tsx
git commit -m "feat(web): grade de resultado virtualizada"
```

---

### Task 8: Web — Editor de Consultas (CodeMirror, lazy) + diálogo de erro (TDD)

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/aplicativos/consulta/EditorConsultas.tsx`
- Create: `apps/web/src/aplicativos/consulta/consulta.css`
- Test: `apps/web/src/aplicativos/consulta/EditorConsultas.test.tsx`
- Modify: `apps/web/src/areaTrabalho/Janela.tsx`
- Modify: `apps/web/src/areaTrabalho/registroApps.tsx`

- [ ] **Step 1: Adicionar as dependências do CodeMirror em `apps/web/package.json`**

No bloco `dependencies`, acrescente:

```json
    "@codemirror/lang-sql": "^6.8.0",
    "@uiw/react-codemirror": "^4.23.6",
```

(Coloque `@codemirror/lang-sql` e `@uiw/react-codemirror` na ordem alfabética junto às outras `@`-deps.)

- [ ] **Step 2: Instalar**

Run: `bun install`
Expected: resolvem as duas (e os pacotes `@codemirror/*` transitivos); `bun.lock` atualiza.

- [ ] **Step 3: Criar os estilos `apps/web/src/aplicativos/consulta/consulta.css`**

```css
.editor-consultas {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.editor-barra {
  padding: 4px;
  border-bottom: 1px solid grey;
}
.editor-codigo {
  border-bottom: 1px solid grey;
}
.editor-codigo .cm-editor {
  height: 160px;
}
.editor-resultado {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.grade-resultado {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.grade-cabecalho {
  display: grid;
  font-weight: bold;
  background: #c0c0c0;
  border-bottom: 1px solid grey;
}
.grade-corpo {
  flex: 1;
  overflow: auto;
  background: #fff;
}
.grade-celula {
  padding: 2px 6px;
  border-right: 1px solid #dfdfdf;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.grade-th {
  border-bottom: 1px solid grey;
}
.grade-aviso {
  margin: 0;
  padding: 4px 6px;
  background: #ffffe1;
  border-top: 1px solid grey;
  font-size: 11px;
}
```

- [ ] **Step 4: Escrever o teste que falha `apps/web/src/aplicativos/consulta/EditorConsultas.test.tsx`**

CodeMirror é pesado e instável no jsdom, então é **mockado** por um `<textarea>`. O teste cobre o fluxo: executar com sucesso mostra a grade; executar com erro abre um diálogo na loja `useDialogos`.

```tsx
import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditorConsultas } from './EditorConsultas';
import { useDialogos, estadoInicialDialogos } from '../../areaTrabalho/useDialogos';

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="SQL" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

beforeEach(() => useDialogos.setState(estadoInicialDialogos()));
afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <EditorConsultas />
    </QueryClientProvider>,
  );
}

test('executar com sucesso mostra a grade de resultado', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dados: { colunas: ['um'], linhas: [[1]], linhasAfetadas: 0, truncado: false, totalLinhas: 1 },
        }),
      ),
    ),
  );
  renderizar();
  fireEvent.click(screen.getByRole('button', { name: /Executar/ }));
  expect(await screen.findByText('um')).toBeInTheDocument(); // cabeçalho da coluna
});

test('executar com erro abre um diálogo de erro', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: false,
          erro: { tipo: 'sql', mensagem: 'Objeto inválido.', detalhe: 'Invalid object name', codigoSql: 208 },
        }),
        { status: 400 },
      ),
    ),
  );
  renderizar();
  fireEvent.click(screen.getByRole('button', { name: /Executar/ }));
  await vi.waitFor(() => {
    const { dialogos } = useDialogos.getState();
    expect(dialogos).toHaveLength(1);
    expect(dialogos[0]!.tipo).toBe('erro');
    expect(dialogos[0]!.mensagem).toBe('Objeto inválido.');
  });
});
```

- [ ] **Step 5: Rodar o teste e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/consulta/EditorConsultas.test.tsx`
Expected: FAIL — `Cannot find module './EditorConsultas'`.

- [ ] **Step 6: Implementar `apps/web/src/aplicativos/consulta/EditorConsultas.tsx`**

```tsx
import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { ErroApiError, useExecutarConsulta } from './ganchos';
import { GradeResultado } from './GradeResultado';
import { useDialogos } from '../../areaTrabalho/useDialogos';
import './consulta.css';

const SQL_INICIAL = 'SELECT TOP 100 * FROM INFORMATION_SCHEMA.TABLES;';

export function EditorConsultas() {
  const [texto, setTexto] = useState(SQL_INICIAL);
  const executar = useExecutarConsulta();
  const abrirDialogo = useDialogos((s) => s.abrir);

  function rodar() {
    executar.mutate(texto, {
      onError: (e) => {
        const erro = e instanceof ErroApiError ? e.erro : undefined;
        const detalhe = [erro?.detalhe, erro?.codigoSql ? `Erro SQL ${erro.codigoSql}` : undefined]
          .filter(Boolean)
          .join('\n');
        abrirDialogo({
          tipo: 'erro',
          titulo: 'Erro',
          mensagem: erro?.mensagem ?? 'Falha ao executar a consulta.',
          detalhe: detalhe || undefined,
        });
      },
    });
  }

  return (
    <div className="editor-consultas">
      <div className="editor-barra">
        <button onClick={rodar} disabled={executar.isPending}>
          {executar.isPending ? 'Executando…' : '▶ Executar (F5)'}
        </button>
      </div>
      <div
        className="editor-codigo"
        onKeyDown={(e) => {
          if (e.key === 'F5') {
            e.preventDefault();
            rodar();
          }
        }}
      >
        <CodeMirror value={texto} height="160px" extensions={[sql()]} onChange={setTexto} />
      </div>
      <div className="editor-resultado">
        {executar.data ? (
          <GradeResultado resultado={executar.data} />
        ) : (
          <p style={{ padding: 8 }}>Execute uma consulta para ver o resultado.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Rodar o teste e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/consulta/EditorConsultas.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 8: Envolver o app em `<Suspense>` em `apps/web/src/areaTrabalho/Janela.tsx`**

Na primeira linha, acrescente `Suspense` ao import do React:

```tsx
import { memo, Suspense, useCallback, useRef, type CSSProperties } from 'react';
```

E no `window-body`, troque o bloco:

```tsx
        <LimiteErroJanela titulo={janela.titulo}>
          <Componente janela={janela} />
        </LimiteErroJanela>
```

por:

```tsx
        <LimiteErroJanela titulo={janela.titulo}>
          <Suspense fallback={<p style={{ padding: 8 }}>Carregando…</p>}>
            <Componente janela={janela} />
          </Suspense>
        </LimiteErroJanela>
```

- [ ] **Step 9: Registrar o editor (lazy) em `apps/web/src/areaTrabalho/registroApps.tsx`**

Acrescente `lazy` ao import do React no topo (criando a linha de import do react):

```tsx
import { lazy } from 'react';
```

E, depois dos imports existentes, defina o componente lazy (mantém export nomeado via `.then`):

```tsx
const EditorConsultas = lazy(() =>
  import('../aplicativos/consulta/EditorConsultas').then((m) => ({ default: m.EditorConsultas })),
);
```

Na entrada `consulta`, troque `componente: AppPlaceholder` por `componente: EditorConsultas` e aumente o tamanho inicial:

```tsx
  consulta: {
    titulo: 'Editor de Consultas',
    icone: '📝',
    tamanhoInicial: { largura: 560, altura: 420 },
    componente: EditorConsultas,
  },
```

(As entradas `grade` e `propriedades` seguem com `AppPlaceholder`.)

> Nota de tipo: se o `tsc` reclamar que `LazyExoticComponent<...>` não é atribuível a `componente: ComponentType<PropsApp>`, alargue o tipo do campo em `areaTrabalho/tipos.ts`:
> `componente: ComponentType<PropsApp> | import('react').LazyExoticComponent<ComponentType<PropsApp>>;`

- [ ] **Step 10: Checar tipos do web**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros. (Se houver acesso a índice sinalizado nos novos arquivos, corrija com `!` no ponto exato; se for o caso do `lazy`, aplique a nota de tipo do Step 9.)

- [ ] **Step 11: Rodar a suíte web inteira**

Run: `bun --filter @dbos/web test`
Expected: PASS — tudo + `GradeResultado` (3) + `EditorConsultas` (2).

- [ ] **Step 12: Commit**

```bash
git add apps/web/package.json bun.lock apps/web/src/aplicativos/consulta/EditorConsultas.tsx apps/web/src/aplicativos/consulta/EditorConsultas.test.tsx apps/web/src/aplicativos/consulta/consulta.css apps/web/src/areaTrabalho/Janela.tsx apps/web/src/areaTrabalho/registroApps.tsx
git commit -m "feat(web): editor de consultas (CodeMirror, lazy) + diálogo de erro"
```

---

### Task 9: Verificação completa + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Checar tipos do web de novo (garantia)**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 2: Documentar o Editor no `README.md`**

Acrescente, ao final do parágrafo do Explorador na seção "Como rodar":

```markdown

O **Editor de Consultas** roda SQL livre contra o login da sessão: digite no
editor (CodeMirror) e execute com o botão ou F5. O resultado aparece numa grade
virtualizada; comandos sem retorno mostram as linhas afetadas. Há teto de linhas
e timeout de statement (`SQL_MAX_LINHAS`/`SQL_TIMEOUT_MS`), e erros do SQL Server
abrem um diálogo retrô com a mensagem e os detalhes (código do erro).
```

- [ ] **Step 3: Rodar a suíte inteira do monorepo**

Run: `bun run test`
Expected: tudo verde — `@dbos/shared` (credenciais + explorador + consulta), `@dbos/server` (+ tratadorErros 4 + consulta 5), `@dbos/web` (+ useDialogos 3 + GerenciadorDialogos 3 + GradeResultado 3 + EditorConsultas 2). Falhas SÓ por conexão SQL = ambiente.

- [ ] **Step 4: Verificar no navegador**

Em dois terminais:
```bash
bun run dev:server   # :3001
bun run dev:web      # :5173
```
Faça login e abra o **Editor de Consultas** (atalho ou menu Iniciar — repare no "Carregando…" do Suspense enquanto o CodeMirror baixa). Confirme:
- Editar SQL com realce; `SELECT name FROM sys.objects` + **Executar** (ou F5) mostra a grade rolável.
- Uma consulta que devolve muitas linhas mostra o aviso de truncamento (ajuste `SQL_MAX_LINHAS` se quiser ver com poucos dados).
- Um `UPDATE`/`INSERT` mostra "Linhas afetadas: N".
- SQL inválido (ex.: `SELECT * FROM nao_existe`) abre o **diálogo de erro** retrô (com bipe), com "Detalhes" expansível mostrando o código 208.
- A janela arrasta/redimensiona/minimiza como qualquer outra; o diálogo fica modal por cima de tudo.

Pare ambos com Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README descreve o Editor de Consultas (Fase 4)"
```

---

## Self-Review

**Spec coverage (Fase 4 / roadmap passo 4 — "Editor de consultas: CodeMirror, SQL pass-through, virtualized result grid, error dialogs, lazy-loaded"):**
- SQL pass-through, roda verbatim (spec §2.2) → `executarConsulta` (Task 2) + rota `/api/consulta` (Task 3). ✓
- Fronteira de segurança = permissão do login + timeout + teto (spec §2.2, §5.6) → roda no pool da sessão (login real); `requestTimeout` (Task 1); teto `SQL_MAX_LINHAS` com `truncado` (Tasks 2–3). ✓
- CodeMirror (spec roadmap) → `@uiw/react-codemirror` + `@codemirror/lang-sql` no `EditorConsultas` (Task 8). ✓
- Lazy-loaded por app (spec §2.3, §4.2) → `React.lazy` no registro + `<Suspense>` no `<Janela>` (Task 8). ✓
- Grade virtualizada (spec §2.3) → `@tanstack/react-virtual` em `GradeResultado` (Task 7). ✓
- Paginação/teto no servidor (spec §2.3) → teto de linhas com aviso (Tasks 2–3, 7). ✓
- Diálogos de erro retrô (spec §6.4) → `useDialogos` + `<GerenciadorDialogos>` (título "Erro", ícone, mensagem pt-BR, "Detalhes" com SQL cru + `codigoSql`, OK, bipe Web-Audio) (Tasks 4–5); o editor abre o diálogo no `onError` carregando o `ErroApi` via `ErroApiError` (Tasks 6, 8). ✓
- Taxonomia de erro, incl. `tempoEsgotado` (spec §6.3) → `mapearErroSql` detecta `ETIMEOUT` → 504 (Task 1). ✓
- Escritas via `useMutation` (spec §6.2) → `useExecutarConsulta` (Task 6). ✓
- App como uma entrada no registro genérico (spec §4.2) → troca de `AppPlaceholder` por `EditorConsultas` lazy (Task 8). ✓
- Integração com SQL Server real como tier de maior valor (spec §7) → `consulta.test.ts`: SELECT, SQL inválido (208), validação, 401, truncamento (Task 3). ✓

**Placeholder scan:** Sem TBD/TODO; todo passo tem conteúdo completo. `grade` e `propriedades` seguem `AppPlaceholder` de propósito (Fases 5–6).

**Type consistency:** `ResultadoConsulta`/`RespostaConsulta`/`esquemaConsulta` definidos uma vez (Task 0) e usados no servidor (`executarConsulta`, rota — Tasks 2–3) e no web (gancho, grade, editor — Tasks 6–8). `executarConsulta(pool, sqlTexto, maxLinhas)` (Task 2) bate com a chamada na rota (Task 3). `useExecutarConsulta()` devolve `ResultadoConsulta` e lança `ErroApiError` (Task 6), consumido no `EditorConsultas.onError` (Task 8). `useDialogos`/`estadoInicialDialogos`/`Dialogo`/`abrir`/`fechar` (Task 4) usados em `GerenciadorDialogos` (Task 5) e no editor (Task 8) com os mesmos nomes. `GradeResultado` recebe `{ resultado: ResultadoConsulta }` (Task 7), passado pelo editor (Task 8). A rota entra no mesmo contexto do cookie em `app.ts` (Task 3). ✓

**Riscos/observações:**
- A virtualização não é asserida em jsdom (sem layout); o teste cobre cabeçalhos/estados e o navegador valida as linhas (Task 9).
- CodeMirror é mockado no teste do editor (pesado/instável no jsdom); o editor real é validado no navegador.
- `React.lazy` exige `default export`; usamos `.then((m) => ({ default: m.EditorConsultas }))` para manter export nomeado. Se o `tsc` reclamar da atribuição ao campo `componente`, alargar o tipo em `tipos.ts` (nota no Task 8, Step 9).
- O teto corta o payload mas o DB ainda executa o comando inteiro — limitação aceita do pass-through (não dá pra injetar `TOP` em SQL arbitrário).
- Rate-limit no `/login` (spec §5.6) e múltiplos recordsets ficam para fases posteriores.
