# DBOS — Fase 3: Explorador de Objetos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o **primeiro app real** — um Explorador de Objetos read-only que mostra, numa árvore estilo Win98, as tabelas e views do banco e, ao expandir um objeto, suas colunas (tipo, nulabilidade, chave primária). Ele exercita o caminho de dados inteiro ponta a ponta com baixo risco (spec, roadmap passo 3).

**Architecture:** O caminho de dados da spec §3/§5.4: componente React → `requisitar('/api/explorador/...')` → rota Fastify protegida pelo preHandler `autenticar` → pega o `ConnectionPool` da sessão (`req.sessao!.pool`) → roda **SQL cru** contra `INFORMATION_SCHEMA` (parametrizado em `/colunas`, spec §2.2, §5.5) → devolve `Resposta<T>` tipado de `@dbos/shared` → o app renderiza numa janela do WM (Fase 2). Leituras usam **TanStack Query** (`useQuery`, spec §6.2) com chaves estruturadas; as colunas são buscadas preguiçosamente, só quando o nó da tabela é expandido. Cada app é embrulhado num **`<LimiteErroJanela>`** (error boundary, spec §6.5) para que um crash de um app não derrube o desktop.

**Tech Stack:** Backend: Fastify 4, `mssql`/Tedious, zod, `bun:test` (integração com SQL Server nativo real). Frontend: React 18, TanStack Query, 98.css (`tree-view`), Vitest + React Testing Library. pt-BR em tudo que autoramos; SQL cru, sem ORM.

**Builds on Phases 0–2:**
- `@dbos/shared`: `Resposta<T>`/`RespostaErro`/`ErroApi` (`respostas.ts`).
- `apps/server`: `construirApp` (`app.ts`) registra cookie + rotas dentro de um contexto encapsulado; `criarAutenticar(gerenciador)` (`plugins/sessao.ts`) injeta `req.sessao = { pool, login, ultimoAcesso, id }`; `tratadorErros` já mapeia `RequestError` do mssql → `RespostaErro` tipo `sql`; harness de teste `comServidor` em `rotas/autenticacao.test.ts`. Banco padrão = `master` (`.env`).
- `apps/web`: `requisitar<T>` (`api/cliente.ts`, manda cookie), `QueryClientProvider` em `main.tsx`, o WM em `areaTrabalho/` com `registroApps.tsx` (o app `explorador` ainda usa `AppPlaceholder`) e `Janela.tsx` que renderiza `registroApps[tipoApp].componente`.

---

### Decisões de escopo desta fase (registradas)

- **Árvore:** dois grupos de topo — "Tabelas" e "Views" — cada um com os objetos; expandir um objeto busca suas **colunas**. Sem índices/procedures/triggers nesta fase (índices pertencem a Propriedades, Fase 6).
- **Lazy nas colunas:** o nó só monta `<ColunasDaTabela>` quando aberto → a query de colunas (parametrizada) só dispara no expand. TanStack Query cacheia por chave, então reabrir não refaz a chamada.
- **`<LimiteErroJanela>` (spec §6.5):** incluído agora, pois esta é a primeira janela que faz trabalho real e pode quebrar.
- **Filtro com debounce (spec §2.3):** caixa de filtro client-side sobre os objetos já carregados, com `usarValorDebounced`.
- **Adiado de propósito (não são lacunas):** `React.lazy`/code-splitting por app (spec §2.3) entra na Fase 4, quando o CodeMirror justifica o split — o Explorador não tem dependência pesada. O `<GerenciadorDialogos>` de diálogos retrô (spec §6.4) entra na Fase 4 (Editor de Consultas); aqui os erros aparecem inline na própria janela.

---

### File structure for this phase

**`packages/shared/src/`**
- Create `explorador.ts` — `ObjetoBanco`, `ColunaBanco`, `TipoObjeto`, `esquemaRefObjeto`/`RefObjeto`, `RespostaObjetos`, `RespostaColunas`.
- Modify `index.ts` — exportar o novo módulo.
- Test `explorador.test.ts` — zod do `esquemaRefObjeto`.

**`apps/server/src/`**
- Create `bd/consultasSistema.ts` — `listarObjetos` + `listarColunas` (SQL cru contra `INFORMATION_SCHEMA`).
- Create `rotas/explorador.ts` — `registrarRotasExplorador` (`GET /api/explorador/objetos`, `GET /api/explorador/colunas`).
- Modify `app.ts` — registrar as rotas do explorador no contexto autenticado.
- Test `rotas/explorador.test.ts` — integração com SQL Server real (cria/limpa uma tabela de teste).

**`apps/web/src/aplicativos/explorador/`** (pasta nova; os apps vivem em `aplicativos/`, separados do WM em `areaTrabalho/`)
- Create `ganchos.ts` — `useObjetos`, `useColunas`.
- Create `usarValorDebounced.ts` — hook de debounce.
- Create `ColunasDaTabela.tsx` — colunas de um objeto (lazy).
- Create `NoTabela.tsx` — nó expansível de tabela/view.
- Create `ExploradorObjetos.tsx` — o app: filtro + árvore.
- Tests: `usarValorDebounced.test.ts`, `ColunasDaTabela.test.tsx`, `ExploradorObjetos.test.tsx`.

**`apps/web/src/areaTrabalho/`**
- Create `LimiteErroJanela.tsx` — error boundary por janela.
- Test `LimiteErroJanela.test.tsx`.
- Modify `registroApps.tsx` — `explorador` passa a usar `ExploradorObjetos`.
- Modify `Janela.tsx` — embrulhar o componente do app em `<LimiteErroJanela>`.

**`README.md`** — Modify (descrever o Explorador).

---

### Task 0: `@dbos/shared` — contrato do explorador (TDD do zod)

**Files:**
- Create: `packages/shared/src/explorador.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/explorador.test.ts`

- [ ] **Step 1: Escrever o teste que falha `packages/shared/src/explorador.test.ts`**

```ts
import { test, expect } from 'bun:test';
import { esquemaRefObjeto } from './explorador';

test('aceita esquema e tabela válidos', () => {
  const r = esquemaRefObjeto.safeParse({ esquema: 'dbo', tabela: 'Clientes' });
  expect(r.success).toBe(true);
});

test('rejeita tabela vazia', () => {
  const r = esquemaRefObjeto.safeParse({ esquema: 'dbo', tabela: '' });
  expect(r.success).toBe(false);
});

test('rejeita objeto sem esquema', () => {
  const r = esquemaRefObjeto.safeParse({ tabela: 'Clientes' });
  expect(r.success).toBe(false);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd packages/shared && bun test src/explorador.test.ts`
Expected: FAIL — `Cannot find module './explorador'`.

- [ ] **Step 3: Implementar `packages/shared/src/explorador.ts`**

```ts
import { z } from 'zod';
import type { Resposta } from './respostas';

export type TipoObjeto = 'tabela' | 'view';

// Um objeto do catálogo (tabela ou view).
export interface ObjetoBanco {
  esquema: string;
  nome: string;
  tipo: TipoObjeto;
}

// Uma coluna de um objeto.
export interface ColunaBanco {
  nome: string;
  tipoDado: string; // ex.: 'int', 'nvarchar(50)', 'decimal(18,2)'
  anulavel: boolean;
  ehChavePrimaria: boolean;
}

// Parâmetros para descrever um objeto (usado em GET /api/explorador/colunas).
export const esquemaRefObjeto = z.object({
  esquema: z.string().min(1).max(128),
  tabela: z.string().min(1).max(128),
});
export type RefObjeto = z.infer<typeof esquemaRefObjeto>;

export type RespostaObjetos = Resposta<ObjetoBanco[]>;
export type RespostaColunas = Resposta<ColunaBanco[]>;
```

- [ ] **Step 4: Exportar do barril `packages/shared/src/index.ts`**

```ts
export * from './respostas';
export * from './credenciais';
export * from './sessao';
export * from './explorador';
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd packages/shared && bun test src/explorador.test.ts`
Expected: PASS — 3 testes passam.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/explorador.ts packages/shared/src/explorador.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): contrato do explorador (ObjetoBanco, ColunaBanco, RefObjeto)"
```

---

### Task 1: Servidor — consultas de catálogo (SQL cru)

Funções puras de consulta que recebem um `ConnectionPool` e rodam SQL cru. Elas exigem banco real para rodar, então NÃO têm teste unitário próprio — são cobertas ponta a ponta pelo teste de integração da Task 2 (tier de maior valor, spec §7).

**Files:**
- Create: `apps/server/src/bd/consultasSistema.ts`

- [ ] **Step 1: Implementar `apps/server/src/bd/consultasSistema.ts`**

```ts
import sql from 'mssql';
import type { ConnectionPool } from 'mssql';
import type { ColunaBanco, ObjetoBanco, RefObjeto } from '@dbos/shared';

// Tabelas e views do banco atual (spec §5.5 — SQL cru no INFORMATION_SCHEMA).
const SQL_OBJETOS = `
  SELECT TABLE_SCHEMA AS esquema,
         TABLE_NAME   AS nome,
         CASE TABLE_TYPE WHEN 'VIEW' THEN 'view' ELSE 'tabela' END AS tipo
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
  ORDER BY TABLE_SCHEMA, TABLE_NAME
`;

export async function listarObjetos(pool: ConnectionPool): Promise<ObjetoBanco[]> {
  const resultado = await pool.request().query<ObjetoBanco>(SQL_OBJETOS);
  return resultado.recordset;
}

// Colunas de um objeto. Parametrizado (@esquema, @tabela) — cru mas seguro (spec §2.2).
// O bit do SQL Server volta como boolean no driver mssql, então anulavel/ehChavePrimaria
// já chegam como true/false ao cliente.
const SQL_COLUNAS = `
  SELECT
    c.COLUMN_NAME AS nome,
    c.DATA_TYPE +
      CASE
        WHEN c.DATA_TYPE IN ('varchar','nvarchar','char','nchar','varbinary','binary')
          THEN '(' + CASE WHEN c.CHARACTER_MAXIMUM_LENGTH = -1 THEN 'max'
                          ELSE CAST(c.CHARACTER_MAXIMUM_LENGTH AS varchar(11)) END + ')'
        WHEN c.DATA_TYPE IN ('decimal','numeric')
          THEN '(' + CAST(c.NUMERIC_PRECISION AS varchar(11)) + ',' + CAST(c.NUMERIC_SCALE AS varchar(11)) + ')'
        ELSE ''
      END AS tipoDado,
    CAST(CASE WHEN c.IS_NULLABLE = 'YES' THEN 1 ELSE 0 END AS bit) AS anulavel,
    CAST(CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS bit) AS ehChavePrimaria
  FROM INFORMATION_SCHEMA.COLUMNS c
  LEFT JOIN (
    SELECT k.TABLE_SCHEMA, k.TABLE_NAME, k.COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS t
      ON t.CONSTRAINT_NAME   = k.CONSTRAINT_NAME
     AND t.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
    WHERE t.CONSTRAINT_TYPE = 'PRIMARY KEY'
  ) pk
    ON pk.TABLE_SCHEMA = c.TABLE_SCHEMA
   AND pk.TABLE_NAME   = c.TABLE_NAME
   AND pk.COLUMN_NAME  = c.COLUMN_NAME
  WHERE c.TABLE_SCHEMA = @esquema AND c.TABLE_NAME = @tabela
  ORDER BY c.ORDINAL_POSITION
`;

export async function listarColunas(
  pool: ConnectionPool,
  ref: RefObjeto,
): Promise<ColunaBanco[]> {
  const resultado = await pool
    .request()
    .input('esquema', sql.NVarChar, ref.esquema)
    .input('tabela', sql.NVarChar, ref.tabela)
    .query<ColunaBanco>(SQL_COLUNAS);
  return resultado.recordset;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/bd/consultasSistema.ts
git commit -m "feat(server): consultas de catálogo (listarObjetos/listarColunas)"
```

---

### Task 2: Servidor — rotas do explorador + integração com SQL Server real (TDD)

Este é o portão ponta a ponta do servidor. Sobe o app numa porta efêmera (mesmo padrão da Fase 1, pois `app.inject()` não combina com o runtime Bun) e dirige as rotas HTTP reais. Exige o SQL Server nativo rodando e `.env` com `SQL_SENHA` + `SESSAO_SEGREDO`.

**Files:**
- Create: `apps/server/src/rotas/explorador.ts`
- Modify: `apps/server/src/app.ts`
- Test: `apps/server/src/rotas/explorador.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/server/src/rotas/explorador.test.ts`**

```ts
import { test, expect } from 'bun:test';
import sql from 'mssql';
import { construirApp } from '../app';
import { configParaLogin } from '../bd/conexao';

// Sobe o app numa porta efêmera e testa pela rota HTTP real.
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
const TABELA = '__dbos_teste_explorador';
const DROP = `IF OBJECT_ID('dbo.${TABELA}', 'U') IS NOT NULL DROP TABLE dbo.${TABELA};`;

async function entrar(base: string): Promise<string> {
  const r = await fetch(`${base}/api/autenticacao/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(SA),
  });
  return r.headers.get('set-cookie')!.split(';')[0];
}

// Cria uma tabela de teste conhecida, roda o corpo e remove no fim (via conexão direta).
async function comTabelaDeTeste(fn: () => Promise<void>) {
  const pool = await new sql.ConnectionPool(configParaLogin(SA)).connect();
  await pool.request().query(DROP);
  await pool
    .request()
    .query(`CREATE TABLE dbo.${TABELA} (id INT NOT NULL PRIMARY KEY, nome NVARCHAR(50) NULL);`);
  try {
    await fn();
  } finally {
    await pool.request().query(DROP);
    await pool.close();
  }
}

test('sem cookie, /objetos devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/explorador/objetos`);
    expect(r.status).toBe(401);
    expect((await r.json()).erro.tipo).toBe('autenticacao');
  });
});

test('/objetos lista a tabela de teste recém-criada', async () => {
  await comTabelaDeTeste(async () => {
    await comServidor(async (base) => {
      const cookie = await entrar(base);
      const r = await fetch(`${base}/api/explorador/objetos`, { headers: { cookie } });
      expect(r.status).toBe(200);
      const corpo = await r.json();
      expect(corpo.ok).toBe(true);
      const achou = corpo.dados.find(
        (o: { esquema: string; nome: string; tipo: string }) =>
          o.esquema === 'dbo' && o.nome === TABELA,
      );
      expect(achou).toBeDefined();
      expect(achou.tipo).toBe('tabela');
    });
  });
});

test('/colunas descreve as colunas (PK e nulabilidade)', async () => {
  await comTabelaDeTeste(async () => {
    await comServidor(async (base) => {
      const cookie = await entrar(base);
      const params = new URLSearchParams({ esquema: 'dbo', tabela: TABELA });
      const r = await fetch(`${base}/api/explorador/colunas?${params}`, { headers: { cookie } });
      expect(r.status).toBe(200);
      const { dados } = await r.json();
      const id = dados.find((c: { nome: string }) => c.nome === 'id');
      const nome = dados.find((c: { nome: string }) => c.nome === 'nome');
      expect(id.ehChavePrimaria).toBe(true);
      expect(id.anulavel).toBe(false);
      expect(nome.ehChavePrimaria).toBe(false);
      expect(nome.anulavel).toBe(true);
      expect(nome.tipoDado).toBe('nvarchar(50)');
    });
  });
});

test('/colunas sem parâmetros devolve 400 de validação', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/explorador/colunas`, { headers: { cookie } });
    expect(r.status).toBe(400);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/explorador.test.ts`
Expected: FAIL — as rotas não existem (404), então os `expect(r.status).toBe(...)` falham (ou erro de compilação quando `app.ts` passar a importar a rota no Step 4).

- [ ] **Step 3: Implementar `apps/server/src/rotas/explorador.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import {
  esquemaRefObjeto,
  type RespostaColunas,
  type RespostaObjetos,
} from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { listarColunas, listarObjetos } from '../bd/consultasSistema';

export function registrarRotasExplorador(
  app: FastifyInstance,
  gerenciador: GerenciadorPools,
): void {
  const autenticar = criarAutenticar(gerenciador);

  // Lista tabelas e views do banco da sessão.
  app.get(
    '/api/explorador/objetos',
    { preHandler: autenticar },
    async (req): Promise<RespostaObjetos> => {
      const dados = await listarObjetos(req.sessao!.pool);
      return { ok: true, dados };
    },
  );

  // Colunas de um objeto específico (esquema + tabela via query string).
  app.get('/api/explorador/colunas', { preHandler: autenticar }, async (req, reply) => {
    const analise = esquemaRefObjeto.safeParse(req.query);
    if (!analise.success) {
      return reply.status(400).send({
        ok: false,
        erro: {
          tipo: 'validacao',
          mensagem: 'Informe esquema e tabela.',
          detalhe: analise.error.issues[0]?.message,
        },
      });
    }
    const dados = await listarColunas(req.sessao!.pool, analise.data);
    const resposta: RespostaColunas = { ok: true, dados };
    return resposta;
  });
}
```

- [ ] **Step 4: Registrar as rotas no contexto autenticado em `apps/server/src/app.ts`**

As rotas do explorador usam `criarAutenticar` → `lerIdSessao` → `req.unsignCookie`, que só existe dentro do contexto onde `@fastify/cookie` foi registrado. Por isso entram no MESMO `app.register(...)` da sessão.

Adicione o import no topo:

```ts
import { registrarRotasExplorador } from './rotas/explorador';
```

E dentro do bloco `app.register(async (instancia) => { ... })`, logo após `registrarRotasAutenticacao(instancia, gerenciador);`, acrescente:

```ts
    registrarRotasExplorador(instancia, gerenciador);
```

O bloco fica assim:

```ts
  // Cookie + rotas autenticadas num contexto que enxerga os helpers de cookie.
  app.register(async (instancia) => {
    await registrarSessao(instancia);
    registrarRotasAutenticacao(instancia, gerenciador);
    registrarRotasExplorador(instancia, gerenciador);
  });
```

- [ ] **Step 5: Rodar o teste de integração e confirmar que passa**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/explorador.test.ts`
Expected: PASS — 4 testes passam. (Se falhar com `ELOGIN`/conexão recusada, é ambiente: suba o serviço do SQL Server e confira `SQL_SENHA` no `.env` — não é defeito de código.)

- [ ] **Step 6: Confirmar que toda a suíte do servidor segue verde**

Run: `bun --filter @dbos/server test`
Expected: PASS — saúde, conexão, gerenciadorPools, configParaLogin, tratadorErros, autenticação e explorador.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/rotas/explorador.ts apps/server/src/rotas/explorador.test.ts apps/server/src/app.ts
git commit -m "feat(server): rotas do explorador (objetos/colunas) ponta a ponta"
```

---

### Task 3: Web — ganchos do explorador

Wrappers finos de TanStack Query. Exercitados pelos testes de componente das Tasks 4–5, então sem teste próprio aqui.

**Files:**
- Create: `apps/web/src/aplicativos/explorador/ganchos.ts`

- [ ] **Step 1: Implementar `apps/web/src/aplicativos/explorador/ganchos.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import type { ColunaBanco, ObjetoBanco } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

// Lista de objetos do banco. Em erro, lança a mensagem pt-BR para a tela exibir.
export function useObjetos() {
  return useQuery({
    queryKey: ['explorador', 'objetos'],
    queryFn: async (): Promise<ObjetoBanco[]> => {
      const r = await requisitar<ObjetoBanco[]>('/api/explorador/objetos');
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}

// Colunas de um objeto. Chave estruturada (spec §6.2) → cache por objeto.
export function useColunas(esquema: string, tabela: string) {
  return useQuery({
    queryKey: ['explorador', 'colunas', esquema, tabela],
    queryFn: async (): Promise<ColunaBanco[]> => {
      const params = new URLSearchParams({ esquema, tabela });
      const r = await requisitar<ColunaBanco[]>(
        `/api/explorador/colunas?${params.toString()}`,
      );
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/aplicativos/explorador/ganchos.ts
git commit -m "feat(web): ganchos do explorador (useObjetos/useColunas)"
```

---

### Task 4: Web — hook `usarValorDebounced` (TDD)

**Files:**
- Create: `apps/web/src/aplicativos/explorador/usarValorDebounced.ts`
- Test: `apps/web/src/aplicativos/explorador/usarValorDebounced.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/aplicativos/explorador/usarValorDebounced.test.ts`**

```ts
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usarValorDebounced } from './usarValorDebounced';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('devolve o valor inicial imediatamente', () => {
  const { result } = renderHook(() => usarValorDebounced('a', 200));
  expect(result.current).toBe('a');
});

test('atualiza só depois do atraso', () => {
  const { result, rerender } = renderHook(
    ({ v }) => usarValorDebounced(v, 200),
    { initialProps: { v: 'a' } },
  );
  rerender({ v: 'b' });
  expect(result.current).toBe('a'); // ainda dentro do atraso
  act(() => vi.advanceTimersByTime(200));
  expect(result.current).toBe('b');
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/explorador/usarValorDebounced.test.ts`
Expected: FAIL — `Cannot find module './usarValorDebounced'`.

- [ ] **Step 3: Implementar `apps/web/src/aplicativos/explorador/usarValorDebounced.ts`**

```ts
import { useEffect, useState } from 'react';

// Devolve `valor` só depois que ele para de mudar por `atrasoMs` (spec §2.3).
export function usarValorDebounced<T>(valor: T, atrasoMs: number): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(valor), atrasoMs);
    return () => clearTimeout(t);
  }, [valor, atrasoMs]);
  return debounced;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/explorador/usarValorDebounced.test.ts`
Expected: PASS — 2 testes passam.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/aplicativos/explorador/usarValorDebounced.ts apps/web/src/aplicativos/explorador/usarValorDebounced.test.ts
git commit -m "feat(web): hook usarValorDebounced"
```

---

### Task 5: Web — o app Explorador de Objetos (TDD) + registro

**Files:**
- Create: `apps/web/src/aplicativos/explorador/ColunasDaTabela.tsx`
- Create: `apps/web/src/aplicativos/explorador/NoTabela.tsx`
- Create: `apps/web/src/aplicativos/explorador/ExploradorObjetos.tsx`
- Test: `apps/web/src/aplicativos/explorador/ColunasDaTabela.test.tsx`
- Test: `apps/web/src/aplicativos/explorador/ExploradorObjetos.test.tsx`
- Modify: `apps/web/src/areaTrabalho/registroApps.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/aplicativos/explorador/ColunasDaTabela.test.tsx`**

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ColunasDaTabela } from './ColunasDaTabela';

afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ul className="tree-view">
        <ColunasDaTabela esquema="dbo" tabela="Clientes" />
      </ul>
    </QueryClientProvider>,
  );
}

test('mostra as colunas com tipo, marca de PK e nulabilidade', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dados: [
            { nome: 'id', tipoDado: 'int', anulavel: false, ehChavePrimaria: true },
            { nome: 'nome', tipoDado: 'nvarchar(50)', anulavel: true, ehChavePrimaria: false },
          ],
        }),
      ),
    ),
  );
  renderizar();
  expect(await screen.findByText(/🔑 id : int/)).toBeInTheDocument();
  expect(screen.getByText(/nome : nvarchar\(50\) \(nulo\)/)).toBeInTheDocument();
});

test('mostra a mensagem de erro quando a consulta falha', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: false, erro: { tipo: 'sql', mensagem: 'Objeto inválido.' } }),
        { status: 400 },
      ),
    ),
  );
  renderizar();
  expect(await screen.findByText('Objeto inválido.')).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/explorador/ColunasDaTabela.test.tsx`
Expected: FAIL — `Cannot find module './ColunasDaTabela'`.

- [ ] **Step 3: Implementar `apps/web/src/aplicativos/explorador/ColunasDaTabela.tsx`**

Cada coluna é renderizada como UMA string num só nó de texto (facilita a asserção e fica legível).

```tsx
import type { ColunaBanco } from '@dbos/shared';
import { useColunas } from './ganchos';

export function ColunasDaTabela({ esquema, tabela }: { esquema: string; tabela: string }) {
  const consulta = useColunas(esquema, tabela);

  if (consulta.isPending) {
    return (
      <ul>
        <li>Carregando…</li>
      </ul>
    );
  }
  if (consulta.isError) {
    return (
      <ul>
        <li style={{ color: 'red' }}>{consulta.error.message}</li>
      </ul>
    );
  }

  const colunas: ColunaBanco[] = consulta.data ?? [];
  if (colunas.length === 0) {
    return (
      <ul>
        <li>(sem colunas)</li>
      </ul>
    );
  }

  return (
    <ul>
      {colunas.map((c) => (
        <li key={c.nome}>
          {(c.ehChavePrimaria ? '🔑 ' : '') +
            c.nome +
            ' : ' +
            c.tipoDado +
            (c.anulavel ? ' (nulo)' : '')}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/explorador/ColunasDaTabela.test.tsx`
Expected: PASS — 2 testes passam.

- [ ] **Step 5: Implementar `apps/web/src/aplicativos/explorador/NoTabela.tsx`**

```tsx
import { useState } from 'react';
import type { ObjetoBanco } from '@dbos/shared';
import { ColunasDaTabela } from './ColunasDaTabela';

// Nó expansível: ao abrir, monta <ColunasDaTabela> — é o que dispara a busca lazy.
export function NoTabela({ objeto }: { objeto: ObjetoBanco }) {
  const [aberto, setAberto] = useState(false);
  const icone = objeto.tipo === 'view' ? '🔎' : '▦';
  return (
    <li>
      <details onToggle={(e) => setAberto(e.currentTarget.open)}>
        <summary>
          {icone} {objeto.nome}
        </summary>
        {aberto && <ColunasDaTabela esquema={objeto.esquema} tabela={objeto.nome} />}
      </details>
    </li>
  );
}
```

- [ ] **Step 6: Implementar `apps/web/src/aplicativos/explorador/ExploradorObjetos.tsx`**

A função não usa `props` (apps futuros lerão `janela.dados`); sem parâmetro ela continua atribuível a `ComponentType<PropsApp>` no registro.

```tsx
import { useState } from 'react';
import { useObjetos } from './ganchos';
import { usarValorDebounced } from './usarValorDebounced';
import { NoTabela } from './NoTabela';

export function ExploradorObjetos() {
  const consulta = useObjetos();
  const [filtro, setFiltro] = useState('');
  const termo = usarValorDebounced(filtro, 200).trim().toLowerCase();

  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando objetos…</p>;
  if (consulta.isError) {
    return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;
  }

  const objetos = consulta.data ?? [];
  const filtrados = termo
    ? objetos.filter((o) => o.nome.toLowerCase().includes(termo))
    : objetos;
  const tabelas = filtrados.filter((o) => o.tipo === 'tabela');
  const views = filtrados.filter((o) => o.tipo === 'view');

  return (
    <div style={{ padding: 8 }}>
      <input
        aria-label="Filtrar objetos"
        placeholder="Filtrar…"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{ width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
      />
      <ul className="tree-view">
        <li>
          <details open>
            <summary>📁 Tabelas ({tabelas.length})</summary>
            <ul>
              {tabelas.map((o) => (
                <NoTabela key={`${o.esquema}.${o.nome}`} objeto={o} />
              ))}
            </ul>
          </details>
        </li>
        <li>
          <details open>
            <summary>📁 Views ({views.length})</summary>
            <ul>
              {views.map((o) => (
                <NoTabela key={`${o.esquema}.${o.nome}`} objeto={o} />
              ))}
            </ul>
          </details>
        </li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 7: Escrever o teste que falha `apps/web/src/aplicativos/explorador/ExploradorObjetos.test.tsx`**

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExploradorObjetos } from './ExploradorObjetos';

afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ExploradorObjetos />
    </QueryClientProvider>,
  );
}

test('agrupa objetos em Tabelas e Views com contagem', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dados: [
            { esquema: 'dbo', nome: 'Clientes', tipo: 'tabela' },
            { esquema: 'dbo', nome: 'Pedidos', tipo: 'tabela' },
            { esquema: 'dbo', nome: 'vw_Resumo', tipo: 'view' },
          ],
        }),
      ),
    ),
  );
  renderizar();
  expect(await screen.findByText(/Clientes/)).toBeInTheDocument();
  expect(screen.getByText(/vw_Resumo/)).toBeInTheDocument();
  expect(screen.getByText(/Tabelas \(2\)/)).toBeInTheDocument();
  expect(screen.getByText(/Views \(1\)/)).toBeInTheDocument();
});

test('mostra erro quando a listagem falha', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: false, erro: { tipo: 'rede', mensagem: 'Sem conexão.' } }),
        { status: 503 },
      ),
    ),
  );
  renderizar();
  expect(await screen.findByText('Sem conexão.')).toBeInTheDocument();
});
```

- [ ] **Step 8: Rodar os dois testes de componente e confirmar que passam**

Run: `cd apps/web && bunx vitest run src/aplicativos/explorador/ExploradorObjetos.test.tsx`
Expected: PASS — 2 testes passam.

- [ ] **Step 9: Registrar o app em `apps/web/src/areaTrabalho/registroApps.tsx`**

Adicione o import no topo:

```tsx
import { ExploradorObjetos } from '../aplicativos/explorador/ExploradorObjetos';
```

E na entrada `explorador`, troque `componente: AppPlaceholder` por `componente: ExploradorObjetos`:

```tsx
  explorador: {
    titulo: 'Explorador de Objetos',
    icone: '🗂️',
    tamanhoInicial: { largura: 280, altura: 360 },
    componente: ExploradorObjetos,
  },
```

(As outras três entradas continuam com `AppPlaceholder`; o import dele permanece.)

- [ ] **Step 10: Rodar a suíte web inteira**

Run: `bun --filter @dbos/web test`
Expected: PASS — toda a Fase 2 + os novos (`usarValorDebounced` 2, `ColunasDaTabela` 2, `ExploradorObjetos` 2).

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/aplicativos/explorador/ColunasDaTabela.tsx apps/web/src/aplicativos/explorador/ColunasDaTabela.test.tsx apps/web/src/aplicativos/explorador/NoTabela.tsx apps/web/src/aplicativos/explorador/ExploradorObjetos.tsx apps/web/src/aplicativos/explorador/ExploradorObjetos.test.tsx apps/web/src/areaTrabalho/registroApps.tsx
git commit -m "feat(web): app Explorador de Objetos (árvore de catálogo)"
```

---

### Task 6: Web — limite de erro por janela (`LimiteErroJanela`) (TDD)

Error boundary (spec §6.5): se um app quebrar no render, a janela mostra um painel retrô e o resto do desktop continua vivo. Error boundaries precisam ser componente de classe.

**Files:**
- Create: `apps/web/src/areaTrabalho/LimiteErroJanela.tsx`
- Test: `apps/web/src/areaTrabalho/LimiteErroJanela.test.tsx`
- Modify: `apps/web/src/areaTrabalho/Janela.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/areaTrabalho/LimiteErroJanela.test.tsx`**

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LimiteErroJanela } from './LimiteErroJanela';

function Bomba(): never {
  throw new Error('explodiu');
}

afterEach(() => vi.restoreAllMocks());

test('mostra o painel de erro quando o filho lança', () => {
  // React loga o erro capturado no console; silenciamos para não poluir a saída.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <LimiteErroJanela titulo="Teste">
      <Bomba />
    </LimiteErroJanela>,
  );
  expect(screen.getByText(/operação ilegal/i)).toBeInTheDocument();
  expect(screen.getByText(/explodiu/)).toBeInTheDocument();
});

test('renderiza os filhos quando não há erro', () => {
  render(
    <LimiteErroJanela titulo="Teste">
      <p>conteúdo ok</p>
    </LimiteErroJanela>,
  );
  expect(screen.getByText('conteúdo ok')).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/LimiteErroJanela.test.tsx`
Expected: FAIL — `Cannot find module './LimiteErroJanela'`.

- [ ] **Step 3: Implementar `apps/web/src/areaTrabalho/LimiteErroJanela.tsx`**

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  titulo: string;
  children: ReactNode;
}
interface Estado {
  erro: Error | null;
}

// Captura crashes de render do app e mostra um painel retrô, isolando a janela (spec §6.5).
export class LimiteErroJanela extends Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(_erro: Error, _info: ErrorInfo) {
    // Ponto de log futuro; por ora o painel já comunica o erro ao usuário.
  }

  render() {
    if (this.state.erro) {
      return (
        <div style={{ padding: 12 }}>
          <p>⚠️ Este programa executou uma operação ilegal e será encerrado.</p>
          <p style={{ fontSize: 11, color: '#555' }}>{this.state.erro.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/LimiteErroJanela.test.tsx`
Expected: PASS — 2 testes passam.

- [ ] **Step 5: Embrulhar o componente do app em `apps/web/src/areaTrabalho/Janela.tsx`**

Adicione o import junto aos outros imports locais (perto de `import { registroApps } from './registroApps';`):

```tsx
import { LimiteErroJanela } from './LimiteErroJanela';
```

No corpo do `window-body`, troque:

```tsx
        <Componente janela={janela} />
```

por:

```tsx
        <LimiteErroJanela titulo={janela.titulo}>
          <Componente janela={janela} />
        </LimiteErroJanela>
```

- [ ] **Step 6: Rodar a suíte web inteira (garante que o `<Janela>` não regrediu)**

Run: `bun --filter @dbos/web test`
Expected: PASS — todos os testes web, incluindo `Janela` e `LimiteErroJanela`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/areaTrabalho/LimiteErroJanela.tsx apps/web/src/areaTrabalho/LimiteErroJanela.test.tsx apps/web/src/areaTrabalho/Janela.tsx
git commit -m "feat(web): limite de erro por janela (LimiteErroJanela)"
```

---

### Task 7: Verificação completa + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Checar tipos do web (o projeto usa `noUncheckedIndexedAccess`)**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros. (Se algum acesso a índice nos novos testes/arquivos for sinalizado, corrija com asserção `!` no ponto exato, sem mudar a lógica — mesmo padrão da Fase 2.)

- [ ] **Step 2: Documentar o Explorador no `README.md`**

Acrescente, ao final do parágrafo do desktop na seção "Como rodar":

```markdown

O **Explorador de Objetos** já é funcional: abra-o pelo atalho ou pelo menu Iniciar
para ver as tabelas e views do banco numa árvore; expanda um objeto para listar
suas colunas (tipo, nulabilidade e 🔑 chave primária), via SQL cru no
`INFORMATION_SCHEMA`. Há uma caixa de filtro no topo. Os outros três apps ainda
são placeholders.
```

- [ ] **Step 3: Rodar a suíte inteira do monorepo**

Run: `bun run test`
Expected: tudo verde — `@dbos/shared` (credenciais + explorador), `@dbos/server` (saúde, conexão, gerenciadorPools, configParaLogin, tratadorErros, autenticação, explorador), `@dbos/web` (Fase 2 + explorador + LimiteErroJanela). Os testes de integração do servidor exigem o SQL Server nativo + `.env`; se falharem SÓ por conexão (ELOGIN/recusada), é ambiente, não código.

- [ ] **Step 4: Verificar no navegador**

Em dois terminais:
```bash
bun run dev:server   # :3001
bun run dev:web      # :5173
```
Faça login (`sa` + senha) e abra o **Explorador de Objetos** (atalho ou menu Iniciar). Confirme:
- A árvore mostra "Tabelas (n)" e "Views (n)" com os objetos do banco `master`.
- Expandir um objeto carrega e mostra suas colunas (com 🔑 nas chaves primárias e "(nulo)" nas anuláveis).
- Reabrir um objeto é instantâneo (cache do TanStack Query).
- A caixa de filtro reduz a lista conforme você digita.
- A janela arrasta/redimensiona/minimiza/maximiza como qualquer outra (WM da Fase 2).

Pare ambos com Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README descreve o Explorador (Fase 3)"
```

---

## Self-Review

**Spec coverage (Fase 3 / roadmap passo 3 — "Explorador de objetos: raw catalog-query tree, read-only"):**
- Primeiro app real, read-only, árvore de catálogo (roadmap) → Tasks 1, 2, 5. ✓
- SQL cru contra `INFORMATION_SCHEMA`/catálogo (spec §2.2, §5.5) → `consultasSistema.ts` (Task 1). ✓
- Parametrizado onde a entrada vem do cliente (spec §2.2) → `listarColunas` usa `request.input('esquema'/'tabela', sql.NVarChar, ...)` + `@esquema`/`@tabela` (Task 1). `listarObjetos` não tem parâmetro de cliente. ✓
- Caminho de request: cookie → pool da sessão → 401 se ausente → SQL → JSON tipado (spec §5.4) → preHandler `autenticar` + `req.sessao!.pool` nas rotas (Task 2); teste de 401 sem cookie. ✓
- Contrato tipado `Resposta<T>` ponta a ponta (spec §6.1) → `RespostaObjetos`/`RespostaColunas` (Task 0) usados no servidor e no web. ✓
- TanStack Query para leituras, chaves estruturadas (spec §6.2) → `useObjetos`/`useColunas` com `['explorador','colunas',esquema,tabela]` (Task 3). ✓
- Erros do SQL Server seguem visíveis (spec §6.3) → erro de query propaga ao `tratadorErros` (tipo `sql`, com `detalhe`/`codigoSql`) e aparece inline na janela. ✓
- Error boundary por janela (spec §6.5) → `LimiteErroJanela` embrulha o app no `<Janela>` (Task 6). ✓
- Debounce na busca de schema (spec §2.3) → `usarValorDebounced` + caixa de filtro (Tasks 4–5). ✓
- App registrado como uma entrada no registro genérico (spec §4.2) → troca de `AppPlaceholder` por `ExploradorObjetos` em `registroApps` (Task 5). ✓
- Integração com SQL Server nativo real como tier de maior valor (spec §7) → `explorador.test.ts` cria tabela, valida objetos/colunas/PK/nulabilidade, 400 e 401 (Task 2). ✓

**Placeholder scan:** Sem TBD/TODO; todo passo de código tem conteúdo completo. Os outros três apps seguem como `AppPlaceholder` de propósito (Fases 4–6).

**Type consistency:** `ObjetoBanco`/`ColunaBanco`/`RefObjeto`/`esquemaRefObjeto`/`RespostaObjetos`/`RespostaColunas` definidos uma vez em `shared/explorador.ts` (Task 0) e usados com os mesmos nomes em `consultasSistema.ts` (Task 1), `rotas/explorador.ts` (Task 2) e nos ganchos/componentes web (Tasks 3, 5). `listarObjetos(pool)` e `listarColunas(pool, ref)` (Task 1) batem com as chamadas nas rotas (Task 2). `useObjetos()`/`useColunas(esquema, tabela)` (Task 3) batem com o uso em `ExploradorObjetos`/`ColunasDaTabela` (Task 5). `ExploradorObjetos` sem parâmetro é atribuível a `ComponentType<PropsApp>` do registro (Task 5). `LimiteErroJanela` props `{ titulo, children }` (Task 6) batem com o uso em `Janela.tsx`. Rotas registradas dentro do mesmo contexto de `registrarSessao` (precisam de `@fastify/cookie` para `unsignCookie`). ✓

**Riscos/observações:**
- O teste de integração cria/derruba `dbo.__dbos_teste_explorador` no banco `master` via conexão direta (sa), com limpeza em `finally`. É um SQL Server de desenvolvimento; o nome é improvável de colidir.
- `CAST(... AS bit)` faz o driver mssql devolver `boolean` em `anulavel`/`ehChavePrimaria` — sem mapeamento manual no servidor.
- Em jsdom o toggle de `<details>` pode ser inconsistente, então os testes de componente verificam a listagem de objetos e as colunas (renderizando `<ColunasDaTabela>` direto); a expansão por clique é verificada no navegador (Task 7, Step 4).
- `React.lazy`/code-splitting e o `<GerenciadorDialogos>` ficam para a Fase 4 (ver "Decisões de escopo").
