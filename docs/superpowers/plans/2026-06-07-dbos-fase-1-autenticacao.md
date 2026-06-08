# DBOS — Fase 1: Autenticação + Sessão + Pools — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the auth model end to end — a Win98 boot/login screen authenticates against a real SQL Server login, the backend mints an httpOnly signed session cookie and keeps that login's live `ConnectionPool` in memory (one per session), and protected routes resolve the session from the cookie.

**Architecture:** The app login **is** a SQL Server login (spec §1, §5). `POST /api/autenticacao/login` opens an `mssql` `ConnectionPool` with the supplied credentials; success means the login is valid. On success the server stores the live pool in an in-memory `gerenciadorPools` keyed by an opaque session id (spec §5.3, option A), discards the password, and sets a signed httpOnly cookie. Protected routes read the cookie, look up the pool, and proceed (spec §5.4). The web app uses TanStack Query (spec §6.2): `useSessao` (query) restores the session on load, `useLogin`/`useLogout` (mutations) drive the boot screen. Errors follow the `Resposta<T>` discriminated union (spec §6.1).

**Tech Stack:** Bun (pm + runtime + test runner), TypeScript, Fastify 4, `@fastify/cookie`, `mssql`/Tedious, zod, React 18, TanStack Query, Vite, 98.css, Vitest (web). Native SQL Server 2022 Express on `localhost:1433` (named instance `SQLEXPRESS`, mixed-mode auth, TCP/IP forced to 1433) — already installed and verified in Phase 0.

**Naming convention:** All identifiers we author are pt-BR; library/framework surface stays English. **DB access is raw SQL only** — no ORM/query builder.

**Builds on Phase 0:** `packages/shared` (`Resposta<T>`, `esquemaCredenciais`, `Credenciais`), `apps/server` (Fastify skeleton + `GET /api/saude`, `bd/conexao.ts` with `configDoAmbiente`/`testarConexao`), `apps/web` (Vite + React + 98.css with the `TelaInicial` placeholder, which this phase replaces).

---

### File structure for this phase

**`packages/shared`**
- Create `src/sessao.ts` — `UsuarioSessao` + `RespostaSessao` (the login/sessão contract).
- Modify `src/index.ts` — export the new module.

**`apps/server/src`**
- Create `bd/gerenciadorPools.ts` — `Map<idSessao, RegistroSessao>` with cap + idle-TTL eviction.
- Modify `bd/conexao.ts` — add `configParaLogin` + `abrirPool`.
- Create `plugins/tratadorErros.ts` — `mapearErroSql` + global error handler.
- Create `plugins/sessao.ts` — cookie registration, cookie read/write helpers, `criarAutenticar` preHandler.
- Create `rotas/autenticacao.ts` — `login` / `sessao` / `logout`.
- Create `tipos/fastify.d.ts` — augment Fastify with `pools` + `request.sessao`.
- Modify `app.ts` — wire plugins + routes + decorate `pools`.
- Modify `index.ts` — idle-TTL cleanup loop.

**`apps/web/src`**
- Create `api/cliente.ts` — `fetch` wrapper returning `Resposta<T>` with `credentials: 'include'`.
- Create `autenticacao/ganchos.ts` — `useSessao` / `useLogin` / `useLogout`.
- Create `autenticacao/TelaLogin.tsx` — the Win98 boot/login screen.
- Create `AreaTrabalho.tsx` — placeholder desktop (real window manager is Phase 2).
- Create `App.tsx` — switches between login and desktop based on session.
- Modify `main.tsx` — wrap in `QueryClientProvider`, render `<App />`.
- Modify `vite.config.ts` — dev proxy `/api` → `:3001`.
- Delete `TelaInicial.tsx` + `TelaInicial.test.tsx` (placeholder replaced).

---

### Task 0: `packages/shared` — session contract

**Files:**
- Create: `packages/shared/src/sessao.ts`
- Modify: `packages/shared/src/index.ts`

This is a type-only contract (no behavior), so there is no test — `tsc` via the consuming packages is the check.

- [ ] **Step 1: Create `packages/shared/src/sessao.ts`**

```ts
import type { Resposta } from './respostas';

// Usuário autenticado, exposto ao cliente. NUNCA inclui a senha.
export interface UsuarioSessao {
  login: string;
}

// Resposta do login e da checagem de sessão atual.
export type RespostaSessao = Resposta<UsuarioSessao>;
```

- [ ] **Step 2: Export it from the barrel `packages/shared/src/index.ts`**

```ts
export * from './respostas';
export * from './credenciais';
export * from './sessao';
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): contrato de sessão (UsuarioSessao, RespostaSessao)"
```

---

### Task 1: Server dependencies + environment variables

**Files:**
- Modify: `apps/server/package.json`
- Modify: `.env.example`
- Modify: `.env` (local, git-ignored — not committed)

- [ ] **Step 1: Add `@fastify/cookie` to `apps/server/package.json`**

Set the `dependencies` block to:

```json
  "dependencies": {
    "@dbos/shared": "workspace:*",
    "@fastify/cookie": "^9.4.0",
    "fastify": "^4.28.0",
    "mssql": "^11.0.1"
  }
```

- [ ] **Step 2: Install**

Run: `bun install`
Expected: `@fastify/cookie` resolves; `bun.lock` updates.

- [ ] **Step 3: Add the session variables to `.env.example`**

Append to `.env.example`:

```dotenv

# Segredo para assinar o cookie de sessão (qualquer string longa e aleatória).
# NÃO use este valor em produção — gere um próprio.
SESSAO_SEGREDO=troque-por-uma-string-longa-e-aleatoria
# Limite de sessões simultâneas mantidas em memória.
SESSAO_MAX=50
# Tempo (ms) de inatividade antes de encerrar a sessão e fechar o pool (30 min).
SESSAO_TTL_MS=1800000
```

- [ ] **Step 4: Mirror the variables into local `.env`**

The server tests load `--env-file=../../.env` (Phase 0 deviation). `construirApp` throws if `SESSAO_SEGREDO` is missing, so the existing `app.test.ts` would start failing without it. Add the same three keys to your local `.env` (git-ignored), e.g.:

```dotenv
SESSAO_SEGREDO=dev-segredo-trocar-1234567890-abcdefghij
SESSAO_MAX=50
SESSAO_TTL_MS=1800000
```

(`SQL_SENHA` must already be set from Phase 0 — required by the integration test in Task 6.)

- [ ] **Step 5: Commit**

```bash
git add apps/server/package.json .env.example bun.lock
git commit -m "chore(server): adiciona @fastify/cookie e variáveis de sessão"
```

---

### Task 2: `gerenciadorPools` — in-memory pools with cap + idle TTL (TDD)

The pool manager is pure logic decoupled from `mssql.connect` — it stores whatever pool it is given, so it is unit-testable with fake pools (no DB).

**Files:**
- Create: `apps/server/src/bd/gerenciadorPools.ts`
- Test: `apps/server/src/bd/gerenciadorPools.test.ts`

- [ ] **Step 1: Write the failing test `apps/server/src/bd/gerenciadorPools.test.ts`**

```ts
import { test, expect } from 'bun:test';
import { criarGerenciadorPools, ErroLimiteSessoes } from './gerenciadorPools';
import type { ConnectionPool } from 'mssql';

// Pool falso: o gerenciador só usa close(); o resto não importa para estes testes.
function poolFalso() {
  const estado = { fechado: false };
  const pool = { close: async () => { estado.fechado = true; } };
  return { pool: pool as unknown as ConnectionPool, estado };
}

test('cria e obtém uma sessão', () => {
  const g = criarGerenciadorPools({ maxSessoes: 2, ttlMs: 1000 });
  const { pool } = poolFalso();
  g.criar('s1', pool, 'sa', 0);
  expect(g.tamanho()).toBe(1);
  expect(g.obter('s1', 1)?.login).toBe('sa');
});

test('obter de id inexistente devolve undefined', () => {
  const g = criarGerenciadorPools({ maxSessoes: 2, ttlMs: 1000 });
  expect(g.obter('nao-existe', 0)).toBeUndefined();
});

test('aplica o limite de sessões simultâneas', () => {
  const g = criarGerenciadorPools({ maxSessoes: 1, ttlMs: 1000 });
  g.criar('s1', poolFalso().pool, 'sa', 0);
  expect(() => g.criar('s2', poolFalso().pool, 'sa', 0)).toThrow(ErroLimiteSessoes);
});

test('remover fecha o pool e some com a sessão', async () => {
  const g = criarGerenciadorPools({ maxSessoes: 2, ttlMs: 1000 });
  const { pool, estado } = poolFalso();
  g.criar('s1', pool, 'sa', 0);
  await g.remover('s1');
  expect(g.tamanho()).toBe(0);
  expect(estado.fechado).toBe(true);
});

test('limpa expiradas e mantém as ativas (TTL deslizante)', async () => {
  const g = criarGerenciadorPools({ maxSessoes: 5, ttlMs: 100 });
  const velha = poolFalso();
  const nova = poolFalso();
  g.criar('velha', velha.pool, 'sa', 0);
  g.criar('nova', nova.pool, 'sa', 0);
  g.obter('nova', 90); // renova o último acesso da 'nova'
  const removidas = await g.limparExpiradas(150); // velha: 150-0>100; nova: 150-90<100
  expect(removidas).toBe(1);
  expect(g.tamanho()).toBe(1);
  expect(velha.estado.fechado).toBe(true);
  expect(nova.estado.fechado).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test apps/server/src/bd/gerenciadorPools.test.ts`
Expected: FAIL — `Cannot find module './gerenciadorPools'`.

- [ ] **Step 3: Implement `apps/server/src/bd/gerenciadorPools.ts`**

```ts
import type { ConnectionPool } from 'mssql';

export interface RegistroSessao {
  pool: ConnectionPool;
  login: string;
  ultimoAcesso: number; // epoch ms
}

export interface OpcoesGerenciador {
  maxSessoes: number;
  ttlMs: number;
}

export interface GerenciadorPools {
  // 'agora' é injetado (epoch ms) para manter a lógica testável sem relógio real.
  criar(idSessao: string, pool: ConnectionPool, login: string, agora: number): void;
  obter(idSessao: string, agora: number): RegistroSessao | undefined;
  remover(idSessao: string): Promise<void>;
  limparExpiradas(agora: number): Promise<number>;
  tamanho(): number;
}

// Lançado quando o limite de sessões simultâneas é atingido.
export class ErroLimiteSessoes extends Error {
  constructor() {
    super('Limite de sessões simultâneas atingido.');
    this.name = 'ErroLimiteSessoes';
  }
}

// Mantém os ConnectionPools vivos em memória, um por sessão (spec §5.3, opção A).
export function criarGerenciadorPools(opcoes: OpcoesGerenciador): GerenciadorPools {
  const registros = new Map<string, RegistroSessao>();

  return {
    criar(idSessao, pool, login, agora) {
      if (registros.size >= opcoes.maxSessoes) {
        throw new ErroLimiteSessoes();
      }
      registros.set(idSessao, { pool, login, ultimoAcesso: agora });
    },

    obter(idSessao, agora) {
      const registro = registros.get(idSessao);
      if (!registro) return undefined;
      registro.ultimoAcesso = agora; // TTL deslizante
      return registro;
    },

    async remover(idSessao) {
      const registro = registros.get(idSessao);
      if (!registro) return;
      registros.delete(idSessao);
      await registro.pool.close();
    },

    async limparExpiradas(agora) {
      let removidas = 0;
      for (const [id, registro] of registros) {
        if (agora - registro.ultimoAcesso > opcoes.ttlMs) {
          registros.delete(id);
          await registro.pool.close();
          removidas += 1;
        }
      }
      return removidas;
    },

    tamanho() {
      return registros.size;
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test apps/server/src/bd/gerenciadorPools.test.ts`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/bd/gerenciadorPools.ts apps/server/src/bd/gerenciadorPools.test.ts
git commit -m "feat(server): gerenciador de pools por sessão (cap + TTL ocioso)"
```

---

### Task 3: `conexao` — open a pool for specific credentials (TDD)

**Files:**
- Modify: `apps/server/src/bd/conexao.ts`
- Test: `apps/server/src/bd/configParaLogin.test.ts`

`configParaLogin` is pure (no DB) and unit-testable. `abrirPool` is a thin wrapper exercised by the integration test in Task 6.

- [ ] **Step 1: Write the failing test `apps/server/src/bd/configParaLogin.test.ts`**

```ts
import { test, expect } from 'bun:test';
import { configParaLogin } from './conexao';

test('usa o login e a senha informados', () => {
  const cfg = configParaLogin({ login: 'maria', senha: 'segredo' });
  expect(cfg.user).toBe('maria');
  expect(cfg.password).toBe('segredo');
});

test('mantém as opções de TLS local (autoassinado)', () => {
  const cfg = configParaLogin({ login: 'maria', senha: 'segredo' });
  expect(cfg.options?.encrypt).toBe(true);
  expect(cfg.options?.trustServerCertificate).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test apps/server/src/bd/configParaLogin.test.ts`
Expected: FAIL — `configParaLogin` is not exported from `./conexao`.

- [ ] **Step 3: Extend `apps/server/src/bd/conexao.ts`**

Keep the existing `configDoAmbiente` / `testarConexao`. Add the import at the top and the two new functions at the bottom:

```ts
import sql from 'mssql';
import type { Credenciais } from '@dbos/shared';
```

(Replace the current `import sql from 'mssql';` line with the two lines above.)

Append:

```ts
// Config de conexão para um login específico: servidor/porta/banco vêm do
// ambiente; usuário e senha vêm das credenciais informadas no login.
export function configParaLogin(credenciais: Credenciais): sql.config {
  return {
    ...configDoAmbiente(),
    user: credenciais.login,
    password: credenciais.senha,
  };
}

// Abre e conecta um pool dedicado. Lança em caso de falha (ex.: ELOGIN).
export async function abrirPool(config: sql.config): Promise<sql.ConnectionPool> {
  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  return pool;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test apps/server/src/bd/configParaLogin.test.ts`
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/bd/conexao.ts apps/server/src/bd/configParaLogin.test.ts
git commit -m "feat(server): configParaLogin + abrirPool para login do usuário"
```

---

### Task 4: `tratadorErros` — map driver errors to the typed contract (TDD)

**Files:**
- Create: `apps/server/src/plugins/tratadorErros.ts`
- Test: `apps/server/src/plugins/tratadorErros.test.ts`

- [ ] **Step 1: Write the failing test `apps/server/src/plugins/tratadorErros.test.ts`**

```ts
import { test, expect } from 'bun:test';
import sql from 'mssql';
import { mapearErroSql } from './tratadorErros';

test('mapeia RequestError para tipo sql com código e severidade', () => {
  const erro = new sql.RequestError('Invalid object name', 'EREQUEST');
  (erro as { number?: number }).number = 208;
  (erro as { class?: number }).class = 16;
  const api = mapearErroSql(erro);
  expect(api.tipo).toBe('sql');
  expect(api.codigoSql).toBe(208);
  expect(api.severidade).toBe(16);
  expect(api.detalhe).toContain('Invalid object name');
});

test('mapeia ConnectionError para tipo rede', () => {
  const erro = new sql.ConnectionError('socket hang up', 'ESOCKET');
  expect(mapearErroSql(erro).tipo).toBe('rede');
});

test('mapeia erro desconhecido para tipo interno', () => {
  const api = mapearErroSql(new Error('boom'));
  expect(api.tipo).toBe('interno');
  expect(api.detalhe).toBe('boom');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test apps/server/src/plugins/tratadorErros.test.ts`
Expected: FAIL — `Cannot find module './tratadorErros'`.

- [ ] **Step 3: Implement `apps/server/src/plugins/tratadorErros.ts`**

```ts
import Fastify, { type FastifyInstance } from 'fastify';
import sql from 'mssql';
import type { ErroApi } from '@dbos/shared';

// Converte um erro do driver mssql/Tedious (ou qualquer erro) no formato padronizado.
export function mapearErroSql(erro: unknown): ErroApi {
  if (erro instanceof sql.RequestError) {
    return {
      tipo: 'sql',
      mensagem: 'O banco de dados recusou o comando.',
      detalhe: erro.message,
      codigoSql: (erro as { number?: number }).number,
      severidade: (erro as { class?: number }).class,
    };
  }
  if (erro instanceof sql.ConnectionError) {
    return {
      tipo: 'rede',
      mensagem: 'Não foi possível conectar ao banco de dados.',
      detalhe: erro.message,
    };
  }
  return {
    tipo: 'interno',
    mensagem: 'Ocorreu um erro inesperado no servidor.',
    detalhe: erro instanceof Error ? erro.message : String(erro),
  };
}

// Erros não tratados nas rotas caem aqui e viram RespostaErro com status coerente.
export function registrarTratadorErros(app: FastifyInstance): void {
  app.setErrorHandler((erro, _req, reply) => {
    const apiErro = mapearErroSql(erro);
    const status =
      apiErro.tipo === 'sql' ? 400 : apiErro.tipo === 'rede' ? 503 : 500;
    void reply.status(status).send({ ok: false, erro: apiErro });
  });
}
```

> Note: `Fastify` is imported only for the `FastifyInstance` type used in the signature. If your linter flags the value import, change it to `import type { FastifyInstance } from 'fastify';`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test apps/server/src/plugins/tratadorErros.test.ts`
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/plugins/tratadorErros.ts apps/server/src/plugins/tratadorErros.test.ts
git commit -m "feat(server): mapeamento de erros SQL para o contrato Resposta"
```

---

### Task 5: Session plugin — signed cookie + `autenticar` preHandler

**Files:**
- Create: `apps/server/src/plugins/sessao.ts`
- Create: `apps/server/src/tipos/fastify.d.ts`

This task is glue (cookie wiring + a preHandler). It is verified end-to-end by the integration test in Task 6, so it has no standalone test here.

- [ ] **Step 1: Create the Fastify type augmentation `apps/server/src/tipos/fastify.d.ts`**

```ts
import type { GerenciadorPools, RegistroSessao } from '../bd/gerenciadorPools';

declare module 'fastify' {
  interface FastifyInstance {
    pools: GerenciadorPools;
  }
  interface FastifyRequest {
    // Preenchido pelo preHandler 'autenticar' em rotas protegidas.
    sessao?: RegistroSessao & { id: string };
  }
}

export {};
```

- [ ] **Step 2: Implement `apps/server/src/plugins/sessao.ts`**

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import type { GerenciadorPools } from '../bd/gerenciadorPools';

export const NOME_COOKIE = 'dbos_sid';

// Secure só em produção: o dev roda sobre http e o cookie Secure não seria enviado.
function opcoesCookie() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    signed: true,
  };
}

// Registra o suporte a cookies assinados. Exige SESSAO_SEGREDO no ambiente.
export async function registrarSessao(app: FastifyInstance): Promise<void> {
  const segredo = process.env.SESSAO_SEGREDO;
  if (!segredo) throw new Error('SESSAO_SEGREDO não definido no ambiente.');
  await app.register(fastifyCookie, { secret: segredo });
}

// Grava o cookie de sessão assinado na resposta.
export function definirCookieSessao(reply: FastifyReply, idSessao: string): void {
  reply.setCookie(NOME_COOKIE, idSessao, opcoesCookie());
}

// Remove o cookie de sessão.
export function limparCookieSessao(reply: FastifyReply): void {
  reply.clearCookie(NOME_COOKIE, { path: '/' });
}

// Lê e valida o id de sessão do cookie assinado. null se ausente/adulterado.
export function lerIdSessao(req: FastifyRequest): string | null {
  const bruto = req.cookies[NOME_COOKIE];
  if (!bruto) return null;
  const resultado = req.unsignCookie(bruto);
  return resultado.valid ? resultado.value : null;
}

// preHandler que exige sessão válida e injeta o registro em req.sessao (spec §5.4).
export function criarAutenticar(gerenciador: GerenciadorPools) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const id = lerIdSessao(req);
    const registro = id ? gerenciador.obter(id, Date.now()) : undefined;
    if (!id || !registro) {
      await reply.status(401).send({
        ok: false,
        erro: {
          tipo: 'autenticacao',
          mensagem: 'Sessão expirada ou inexistente. Faça login novamente.',
        },
      });
      return;
    }
    req.sessao = { ...registro, id };
  };
}
```

- [ ] **Step 3: Type-check (no test yet — verified in Task 6)**

Run: `bun --filter @dbos/server exec tsc --noEmit -p tsconfig.json`
Expected: no type errors. (If `tsc` is not installed in the server package, this step is informational — the integration test in Task 6 is the real gate. Skip if it errors on a missing `tsc` binary.)

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/plugins/sessao.ts apps/server/src/tipos/fastify.d.ts
git commit -m "feat(server): plugin de sessão (cookie assinado + autenticar)"
```

---

### Task 6: Authentication routes + wire into the app (integration TDD, real SQL Server)

This is the end-to-end gate for the phase. It boots the app on an ephemeral port and drives the real HTTP routes with `fetch` (same pattern as Phase 0's `app.test.ts`, since `app.inject()` is incompatible with the Bun runtime). It requires the native SQL Server running and `.env` containing `SQL_SENHA` + `SESSAO_SEGREDO`.

**Files:**
- Create: `apps/server/src/rotas/autenticacao.ts`
- Modify: `apps/server/src/app.ts`
- Test: `apps/server/src/rotas/autenticacao.test.ts`

- [ ] **Step 1: Write the failing test `apps/server/src/rotas/autenticacao.test.ts`**

```ts
import { test, expect } from 'bun:test';
import { construirApp } from '../app';

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

function postar(base: string, caminho: string, corpo: unknown, cookie?: string) {
  return fetch(`${base}${caminho}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(corpo),
  });
}

test('login com credenciais válidas devolve cookie e usuário', async () => {
  await comServidor(async (base) => {
    const r = await postar(base, '/api/autenticacao/login', SA);
    expect(r.status).toBe(200);
    expect(r.headers.get('set-cookie')).toContain('dbos_sid');
    expect(await r.json()).toEqual({ ok: true, dados: { login: 'sa' } });
  });
});

test('login com senha errada devolve 401 de autenticação', async () => {
  await comServidor(async (base) => {
    const r = await postar(base, '/api/autenticacao/login', {
      login: 'sa',
      senha: 'senha-errada-xyz-123',
    });
    expect(r.status).toBe(401);
    const corpo = await r.json();
    expect(corpo.ok).toBe(false);
    expect(corpo.erro.tipo).toBe('autenticacao');
  });
});

test('login com corpo inválido devolve 400 de validação', async () => {
  await comServidor(async (base) => {
    const r = await postar(base, '/api/autenticacao/login', { login: '' });
    expect(r.status).toBe(400);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});

test('sessão sem cookie devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/autenticacao/sessao`);
    expect(r.status).toBe(401);
    expect((await r.json()).erro.tipo).toBe('autenticacao');
  });
});

test('fluxo completo: login → sessão → logout → 401', async () => {
  await comServidor(async (base) => {
    const login = await postar(base, '/api/autenticacao/login', SA);
    const cookie = login.headers.get('set-cookie')!.split(';')[0];

    const sessao = await fetch(`${base}/api/autenticacao/sessao`, {
      headers: { cookie },
    });
    expect(sessao.status).toBe(200);
    expect((await sessao.json()).dados.login).toBe('sa');

    const logout = await postar(base, '/api/autenticacao/logout', {}, cookie);
    expect(logout.status).toBe(200);

    const depois = await fetch(`${base}/api/autenticacao/sessao`, {
      headers: { cookie },
    });
    expect(depois.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test --env-file=.env apps/server/src/rotas/autenticacao.test.ts`
Expected: FAIL — `Cannot find module '../app'` resolves, but routes don't exist yet → 404s, so assertions fail (or a compile error on the missing route file once `app.ts` imports it in Step 4).

- [ ] **Step 3: Implement `apps/server/src/rotas/autenticacao.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import sql from 'mssql';
import { esquemaCredenciais, type RespostaSessao } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { abrirPool, configParaLogin } from '../bd/conexao';
import {
  criarAutenticar,
  definirCookieSessao,
  lerIdSessao,
  limparCookieSessao,
} from '../plugins/sessao';

export function registrarRotasAutenticacao(
  app: FastifyInstance,
  gerenciador: GerenciadorPools,
): void {
  const autenticar = criarAutenticar(gerenciador);

  // Login = abrir um ConnectionPool com as credenciais. Sucesso = login válido.
  app.post('/api/autenticacao/login', async (req, reply) => {
    const analise = esquemaCredenciais.safeParse(req.body);
    if (!analise.success) {
      return reply.status(400).send({
        ok: false,
        erro: {
          tipo: 'validacao',
          mensagem: 'Informe login e senha.',
          detalhe: analise.error.issues[0]?.message,
        },
      });
    }

    const credenciais = analise.data;
    let pool: sql.ConnectionPool;
    try {
      pool = await abrirPool(configParaLogin(credenciais));
    } catch (erro) {
      const codigo = (erro as { code?: string }).code ?? '';
      if (erro instanceof sql.ConnectionError && /ELOGIN/i.test(codigo)) {
        return reply.status(401).send({
          ok: false,
          erro: {
            tipo: 'autenticacao',
            mensagem: 'Falha no logon: login ou senha inválidos.',
          },
        });
      }
      throw erro; // rede/interno tratados pelo tratadorErros
    }

    const idSessao = crypto.randomUUID();
    try {
      gerenciador.criar(idSessao, pool, credenciais.login, Date.now());
    } catch (erro) {
      await pool.close(); // não conseguimos guardar o pool → não vaza conexão
      throw erro;
    }

    // A senha sai de escopo aqui — nunca é armazenada nem devolvida (spec §5.2).
    definirCookieSessao(reply, idSessao);
    const resposta: RespostaSessao = { ok: true, dados: { login: credenciais.login } };
    return resposta;
  });

  // Sessão atual: protegida; devolve o login guardado no registro.
  app.get(
    '/api/autenticacao/sessao',
    { preHandler: autenticar },
    async (req): Promise<RespostaSessao> => {
      return { ok: true, dados: { login: req.sessao!.login } };
    },
  );

  // Logout: fecha o pool, remove a sessão e limpa o cookie.
  app.post('/api/autenticacao/logout', async (req, reply) => {
    const id = lerIdSessao(req);
    if (id) await gerenciador.remover(id);
    limparCookieSessao(reply);
    return { ok: true, dados: { encerrada: true } };
  });
}
```

- [ ] **Step 4: Rewrite `apps/server/src/app.ts` to wire everything**

```ts
import Fastify, { type FastifyInstance } from 'fastify';
import type { Resposta } from '@dbos/shared';
import { criarGerenciadorPools, type GerenciadorPools } from './bd/gerenciadorPools';
import { registrarSessao } from './plugins/sessao';
import { registrarTratadorErros } from './plugins/tratadorErros';
import { registrarRotasAutenticacao } from './rotas/autenticacao';

export interface OpcoesApp {
  // Permite injetar um gerenciador nos testes; em produção vem do ambiente.
  gerenciador?: GerenciadorPools;
}

// Constrói a instância do Fastify com plugins e rotas registrados.
export function construirApp(opcoes: OpcoesApp = {}): FastifyInstance {
  const app = Fastify({ logger: false });

  const gerenciador =
    opcoes.gerenciador ??
    criarGerenciadorPools({
      maxSessoes: Number(process.env.SESSAO_MAX ?? 50),
      ttlMs: Number(process.env.SESSAO_TTL_MS ?? 1_800_000),
    });

  registrarTratadorErros(app);

  // Cookie + rotas autenticadas num contexto que enxerga os helpers de cookie.
  app.register(async (instancia) => {
    await registrarSessao(instancia);
    registrarRotasAutenticacao(instancia, gerenciador);
  });

  app.get('/api/saude', async (): Promise<Resposta<{ status: string }>> => {
    return { ok: true, dados: { status: 'ok' } };
  });

  // Expõe o gerenciador para o index orquestrar a limpeza por TTL.
  app.decorate('pools', gerenciador);

  return app;
}
```

- [ ] **Step 5: Run the integration test to verify it passes**

Run: `bun test --env-file=.env apps/server/src/rotas/autenticacao.test.ts`
Expected: PASS — 5 tests pass. (If login fails with `ELOGIN`/connection-refused, the SQL Server prerequisite from Phase 0 isn't satisfied — start the **SQL Server (SQLEXPRESS)** service and confirm `SQL_SENHA` in `.env`. That is an environment problem, not a code bug.)

- [ ] **Step 6: Confirm the existing server tests still pass**

Run: `bun --filter @dbos/server test`
Expected: PASS — health route, conexão smoke test, gerenciadorPools, configParaLogin, tratadorErros, autenticação.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/rotas/autenticacao.ts apps/server/src/rotas/autenticacao.test.ts apps/server/src/app.ts
git commit -m "feat(server): rotas de autenticação (login/sessão/logout) ponta a ponta"
```

---

### Task 7: Idle-TTL cleanup loop in the entry point

**Files:**
- Modify: `apps/server/src/index.ts`

The eviction logic is already unit-tested (Task 2). This wires a periodic sweep into the running server.

- [ ] **Step 1: Rewrite `apps/server/src/index.ts`**

```ts
import { construirApp } from './app';

const PORTA = Number(process.env.PORTA ?? 3001);
const INTERVALO_LIMPEZA_MS = 60_000; // varre sessões ociosas a cada minuto

const app = construirApp();

const limpeza = setInterval(() => {
  void app.pools.limparExpiradas(Date.now());
}, INTERVALO_LIMPEZA_MS);
limpeza.unref?.(); // não segura o processo vivo sozinho

app
  .listen({ port: PORTA, host: '0.0.0.0' })
  .then(() => console.log(`Servidor DBOS ouvindo na porta ${PORTA}`))
  .catch((erro) => {
    clearInterval(limpeza);
    console.error('Falha ao iniciar o servidor:', erro);
    process.exit(1);
  });
```

- [ ] **Step 2: Manually verify the server boots and authenticates**

Run: `bun --filter @dbos/server dev`
Expected: logs `Servidor DBOS ouvindo na porta 3001`. In another terminal:

```bash
curl -i -X POST http://localhost:3001/api/autenticacao/login \
  -H "content-type: application/json" \
  -d "{\"login\":\"sa\",\"senha\":\"SUA_SENHA_DO_SA\"}"
```

Expected: `200`, a `Set-Cookie: dbos_sid=...; HttpOnly; SameSite=Strict` header, and body `{"ok":true,"dados":{"login":"sa"}}`. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "feat(server): varredura periódica de sessões ociosas (TTL)"
```

---

### Task 8: Web — TanStack Query, dev proxy, provider

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Add `@tanstack/react-query` to `apps/web/package.json`**

Set the `dependencies` block to:

```json
  "dependencies": {
    "@dbos/shared": "workspace:*",
    "@tanstack/react-query": "^5.51.0",
    "98.css": "^0.1.20",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
```

- [ ] **Step 2: Install**

Run: `bun install`
Expected: `@tanstack/react-query` resolves.

- [ ] **Step 3: Add the dev proxy to `apps/web/vite.config.ts`**

Replace the `server` block (currently `server: { port: 5173 }`) so it proxies the API to the Fastify server — this keeps the session cookie first-party in dev:

```ts
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
```

(Leave the `plugins` and `test` blocks unchanged.)

- [ ] **Step 4: Rewrite `apps/web/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import '98.css';

const cliente = new QueryClient();

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado.');

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

(`App` is created in Task 11. The dev server / tests won't build until then — that's fine; commit happens after Task 11.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/vite.config.ts apps/web/src/main.tsx bun.lock
git commit -m "chore(web): TanStack Query, proxy de dev e provider"
```

---

### Task 9: Web — API client (TDD)

**Files:**
- Create: `apps/web/src/api/cliente.ts`
- Test: `apps/web/src/api/cliente.test.ts`

- [ ] **Step 1: Write the failing test `apps/web/src/api/cliente.test.ts`**

```ts
import { test, expect, vi, afterEach } from 'vitest';
import { requisitar } from './cliente';

afterEach(() => vi.unstubAllGlobals());

test('devolve os dados quando a resposta é ok', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, dados: { login: 'sa' } }), {
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
  const r = await requisitar('/api/autenticacao/sessao');
  expect(r).toEqual({ ok: true, dados: { login: 'sa' } });
});

test('mapeia falha de rede para erro tipo rede', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('offline');
  }));
  const r = await requisitar('/api/x');
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.erro.tipo).toBe('rede');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun --filter @dbos/web exec vitest run src/api/cliente.test.ts`
Expected: FAIL — `Cannot find module './cliente'`.

- [ ] **Step 3: Implement `apps/web/src/api/cliente.ts`**

```ts
import type { Resposta } from '@dbos/shared';

// Faz uma requisição à API e devolve sempre o contrato Resposta<T>.
// credentials: 'include' garante o envio do cookie de sessão.
export async function requisitar<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<Resposta<T>> {
  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      credentials: 'include',
      ...opcoes,
      headers: { 'content-type': 'application/json', ...opcoes.headers },
    });
  } catch {
    return {
      ok: false,
      erro: { tipo: 'rede', mensagem: 'Não foi possível falar com o servidor.' },
    };
  }

  try {
    return (await resposta.json()) as Resposta<T>;
  } catch {
    return {
      ok: false,
      erro: { tipo: 'interno', mensagem: 'Resposta inválida do servidor.' },
    };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun --filter @dbos/web exec vitest run src/api/cliente.test.ts`
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/cliente.ts apps/web/src/api/cliente.test.ts
git commit -m "feat(web): cliente de API tipado (Resposta<T>)"
```

---

### Task 10: Web — authentication hooks

**Files:**
- Create: `apps/web/src/autenticacao/ganchos.ts`

These hooks are thin TanStack Query wrappers exercised by the component tests in Tasks 11–12, so no standalone test here.

- [ ] **Step 1: Implement `apps/web/src/autenticacao/ganchos.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Credenciais, UsuarioSessao } from '@dbos/shared';
import { requisitar } from '../api/cliente';

const CHAVE_SESSAO = ['sessao'] as const;

// Consulta a sessão atual: devolve o usuário ou null (não autenticado).
export function useSessao() {
  return useQuery({
    queryKey: CHAVE_SESSAO,
    queryFn: async (): Promise<UsuarioSessao | null> => {
      const r = await requisitar<UsuarioSessao>('/api/autenticacao/sessao');
      return r.ok ? r.dados : null;
    },
  });
}

// Login: em caso de erro lança com a mensagem em pt-BR para a tela exibir.
export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (credenciais: Credenciais): Promise<UsuarioSessao> => {
      const r = await requisitar<UsuarioSessao>('/api/autenticacao/login', {
        method: 'POST',
        body: JSON.stringify(credenciais),
      });
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
    onSuccess: (usuario) => qc.setQueryData(CHAVE_SESSAO, usuario),
  });
}

// Logout: zera a sessão no cache ao concluir.
export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await requisitar('/api/autenticacao/logout', { method: 'POST' });
    },
    onSuccess: () => qc.setQueryData(CHAVE_SESSAO, null),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/autenticacao/ganchos.ts
git commit -m "feat(web): ganchos de autenticação (useSessao/useLogin/useLogout)"
```

---

### Task 11: Web — login screen, desktop placeholder, app shell (TDD)

**Files:**
- Create: `apps/web/src/autenticacao/TelaLogin.tsx`
- Create: `apps/web/src/AreaTrabalho.tsx`
- Create: `apps/web/src/App.tsx`
- Test: `apps/web/src/autenticacao/TelaLogin.test.tsx`
- Test: `apps/web/src/App.test.tsx`
- Delete: `apps/web/src/TelaInicial.tsx`
- Delete: `apps/web/src/TelaInicial.test.tsx`

- [ ] **Step 1: Write the failing test `apps/web/src/autenticacao/TelaLogin.test.tsx`**

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TelaLogin } from './TelaLogin';

afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <TelaLogin />
    </QueryClientProvider>,
  );
}

test('mostra mensagem de erro quando o login falha', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: false,
          erro: { tipo: 'autenticacao', mensagem: 'Falha no logon: login ou senha inválidos.' },
        }),
        { status: 401 },
      ),
    ),
  );
  renderizar();
  fireEvent.change(screen.getByLabelText('Login'), { target: { value: 'sa' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha no logon');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun --filter @dbos/web exec vitest run src/autenticacao/TelaLogin.test.tsx`
Expected: FAIL — `Cannot find module './TelaLogin'`.

- [ ] **Step 3: Implement `apps/web/src/autenticacao/TelaLogin.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useLogin } from './ganchos';

// Tela de boot/login no estilo Win98. O login mapeia direto para um login do SQL Server.
export function TelaLogin() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const entrar = useLogin();

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    entrar.mutate({ login, senha });
  }

  return (
    <div className="window" style={{ width: 320, margin: '15vh auto' }}>
      <div className="title-bar">
        <div className="title-bar-text">DBOS — Entrar</div>
      </div>
      <div className="window-body">
        <p>Database Operating System</p>
        <form onSubmit={aoEnviar}>
          <div className="field-row-stacked">
            <label htmlFor="login">Login</label>
            <input
              id="login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>
          <div className="field-row-stacked">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <div
            className="field-row"
            style={{ justifyContent: 'flex-end', marginTop: 8 }}
          >
            <button type="submit" disabled={entrar.isPending}>
              {entrar.isPending ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
          {entrar.isError && (
            <p role="alert" style={{ color: 'red', marginTop: 8 }}>
              {entrar.error.message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun --filter @dbos/web exec vitest run src/autenticacao/TelaLogin.test.tsx`
Expected: PASS — 1 test passes.

- [ ] **Step 5: Implement `apps/web/src/AreaTrabalho.tsx`**

```tsx
import type { UsuarioSessao } from '@dbos/shared';
import { useLogout } from './autenticacao/ganchos';

// Placeholder da área de trabalho. O gerenciador de janelas chega na Fase 2.
export function AreaTrabalho({ usuario }: { usuario: UsuarioSessao }) {
  const sair = useLogout();
  return (
    <div className="window" style={{ width: 360, margin: '15vh auto' }}>
      <div className="title-bar">
        <div className="title-bar-text">DBOS — Área de trabalho</div>
      </div>
      <div className="window-body">
        <p>Bem-vindo, {usuario.login}.</p>
        <p>O sistema de janelas chega na próxima fase.</p>
        <div className="field-row" style={{ justifyContent: 'flex-end' }}>
          <button onClick={() => sair.mutate()} disabled={sair.isPending}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement `apps/web/src/App.tsx`**

```tsx
import { useSessao } from './autenticacao/ganchos';
import { TelaLogin } from './autenticacao/TelaLogin';
import { AreaTrabalho } from './AreaTrabalho';

// Decide entre login e área de trabalho conforme a sessão atual.
export function App() {
  const sessao = useSessao();

  if (sessao.isLoading) {
    return (
      <div className="window" style={{ width: 320, margin: '15vh auto' }}>
        <div className="title-bar">
          <div className="title-bar-text">DBOS</div>
        </div>
        <div className="window-body">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return sessao.data ? <AreaTrabalho usuario={sessao.data} /> : <TelaLogin />;
}
```

- [ ] **Step 7: Write the failing test `apps/web/src/App.test.tsx`**

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';

afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <App />
    </QueryClientProvider>,
  );
}

test('mostra a tela de login quando não há sessão', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: false, erro: { tipo: 'autenticacao', mensagem: 'sem sessão' } }),
        { status: 401 },
      ),
    ),
  );
  renderizar();
  expect(await screen.findByLabelText('Login')).toBeInTheDocument();
});

test('mostra a área de trabalho quando há sessão', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, dados: { login: 'sa' } })),
    ),
  );
  renderizar();
  expect(await screen.findByText(/Bem-vindo, sa/)).toBeInTheDocument();
});
```

- [ ] **Step 8: Delete the Phase 0 placeholder**

```bash
git rm apps/web/src/TelaInicial.tsx apps/web/src/TelaInicial.test.tsx
```

- [ ] **Step 9: Run the full web suite to verify it passes**

Run: `bun --filter @dbos/web test`
Expected: PASS — `cliente` (2), `TelaLogin` (1), `App` (2). No reference to the deleted `TelaInicial`.

- [ ] **Step 10: Manually verify the end-to-end flow in the browser**

In two terminals:
```bash
bun --filter @dbos/server dev   # :3001
bun --filter @dbos/web dev      # :5173
```
Open `http://localhost:5173`. Expected: a gray Win98 "DBOS — Entrar" window. Enter `sa` + the SA password → the window switches to "DBOS — Área de trabalho" showing "Bem-vindo, sa." Click **Sair** → back to the login screen. Reload while logged in → stays on the desktop (session restored via cookie). Stop both with Ctrl+C.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/App.test.tsx apps/web/src/AreaTrabalho.tsx apps/web/src/autenticacao/TelaLogin.tsx apps/web/src/autenticacao/TelaLogin.test.tsx
git commit -m "feat(web): tela de login + área de trabalho placeholder + shell"
```

---

### Task 12: README + full monorepo verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the run instructions in `README.md`**

Replace the "Como rodar" section so it documents login and the new env var:

```markdown
## Como rodar
```bash
bun install
cp .env.example .env        # configure SQL_SENHA (senha do sa) e SESSAO_SEGREDO
bun run dev:server          # API em http://localhost:3001
bun run dev:web             # desktop em http://localhost:5173
```

Acesse `http://localhost:5173`, faça login com um login do SQL Server (ex.: `sa`).
A sessão vive num cookie httpOnly; o pool de conexão do login fica em memória no
servidor (um por sessão) e é encerrado no logout ou por inatividade.
```

- [ ] **Step 2: Run the entire test suite**

Run: `bun run test`
Expected: all packages pass — shared (3), server (health + conexão + gerenciadorPools (5) + configParaLogin (2) + tratadorErros (3) + autenticação (5)), web (cliente 2 + TelaLogin 1 + App 2).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README com fluxo de login e variável SESSAO_SEGREDO"
```

---

## Self-Review

**Spec coverage (Phase 1 / roadmap step 1 — "Autenticação + sessão + pools"):**
- Login = SQL Server login (spec §1, §5.2) → Task 6 `login` route opens a pool with the user's credentials ✓
- httpOnly + SameSite=Strict signed session cookie, password never returned/stored (spec §5.2) → Task 5 `opcoesCookie` + Task 6 (password stays a local var, discarded) ✓ (Secure deferred to production — dev runs over http; documented in `plugins/sessao.ts`)
- Live `ConnectionPool` in memory keyed by session id, option A (spec §5.3) → Task 2 `gerenciadorPools` ✓
- Cap concurrent sessions + idle TTL cleanup (spec §5.3) → Task 2 (`maxSessoes`, `limparExpiradas`) + Task 7 (sweep loop) ✓
- Request path: cookie → `obterPool` → 401 if missing (spec §5.4) → Task 5 `criarAutenticar` + Task 6 `sessao` route ✓
- Typed `Resposta<T>` discriminated union + error taxonomy (spec §6.1, §6.3) → Task 0 contract + Task 4 `mapearErroSql` (`validacao`/`autenticacao`/`sql`/`rede`/`interno`) ✓
- TanStack Query client data layer: `useQuery` for session, `useMutation` for login/logout (spec §6.2) → Tasks 8, 10 ✓
- Raw SQL only / no ORM → no query builder introduced; auth is pool-open only ✓
- pt-BR identifiers throughout (`gerenciadorPools`, `criarAutenticar`, `RegistroSessao`, `TelaLogin`, `AreaTrabalho`, `ganchos`) ✓

**Placeholder scan:** No TBD/TODO; every code step contains full content. The "placeholder" `AreaTrabalho` is intentional and labeled (real window manager = Phase 2). ✓

**Type consistency:** `GerenciadorPools` / `RegistroSessao` (Task 2) are imported with matching names in `conexao` usage, `sessao.ts` augmentation (Task 5), routes, and `app.ts` (Task 6). `configParaLogin`/`abrirPool` (Task 3) signatures match their call in the login route. `NOME_COOKIE` `dbos_sid` is asserted by the integration test. `UsuarioSessao`/`RespostaSessao` (Task 0) flow through server routes and web hooks/components identically. `useSessao`/`useLogin`/`useLogout` defined once (Task 10) and consumed with matching names in Task 11. The session-cookie helper set (`definirCookieSessao`, `limparCookieSessao`, `lerIdSessao`, `criarAutenticar`) is defined once in `plugins/sessao.ts` and imported by the routes. ✓

**Deliberately deferred (later phases, not gaps):**
- Rate-limit on `/login`, per-statement timeout, max-rows `OFFSET/FETCH` (spec §5.6) — these pair with the query/grid routes; scheduled with the hardening pass (Phase 7) and the apps that introduce free/paginated SQL (Phases 4–5).
- `<GerenciadorDialogos>` retro error dialogs + per-window error boundaries (spec §6.4–6.5) — depend on the window manager (Phase 2); Phase 1 surfaces login errors inline via `role="alert"`.
- Window manager, the four apps, layout persistence — Phases 2–7.

**Runtime risk noted:** `@fastify/cookie` on Bun is unverified until Task 6 runs. If it misbehaves like `light-my-request` did in Phase 0, the integration test (real `fetch`, not `inject`) will catch it; the fallback per spec §3 is running only `apps/server` on Node while keeping Bun elsewhere.
