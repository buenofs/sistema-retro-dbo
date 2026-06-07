# DBOS — Fase 0: Fundação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Bun monorepo skeleton (web + server + shared), wire 98.css, and prove the highest-risk dependency — `mssql`/Tedious talking to a real SQL Server — works on the Bun runtime.

**Architecture:** A Bun workspaces monorepo with three packages: `apps/web` (Vite + React SPA), `apps/server` (Fastify API), and `packages/shared` (TypeScript types + zod, imported by both). Phase 0 produces runnable-but-empty skeletons plus a passing integration test against a natively-installed SQL Server. This is the go/no-go gate for using Bun as the backend runtime.

**Tech Stack:** Bun (package manager + runtime + test runner), TypeScript, Fastify, `mssql` (Tedious), zod, Vite, React 18, 98.css, Vitest (web), native SQL Server 2022 (Developer/Express edition on Windows — **no Docker**).

**Naming convention:** All identifiers we author are in Portuguese (pt-BR); library/framework surface stays English. **DB access is raw SQL only** — no ORM/query builder.

---

### Task 0: Initialize git + repo root

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Initialize git**

This folder is not yet a git repository. The plan relies on frequent commits.

Run:
```bash
git init
git branch -M main
```
Expected: `Initialized empty Git repository ...`

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
dist/
*.log
.env
.env.local
bun.lockb
.DS_Store
```

- [ ] **Step 3: Create root `package.json` (Bun workspaces)**

```json
{
  "name": "dbos",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:server": "bun --filter @dbos/server dev",
    "dev:web": "bun --filter @dbos/web dev",
    "test": "bun --filter '*' test"
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json tsconfig.base.json
git commit -m "chore: inicia monorepo Bun (raiz, gitignore, tsconfig base)"
```

---

### Task 1: `packages/shared` — typed contract + first zod schema (TDD)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/respostas.ts`
- Create: `packages/shared/src/credenciais.ts`
- Test: `packages/shared/src/credenciais.test.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@dbos/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "bun test" },
  "dependencies": { "zod": "^3.23.8" }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 3: Create the response contract `packages/shared/src/respostas.ts`**

```ts
// Contrato de resposta padronizado entre web e server.
export interface ErroApi {
  tipo:
    | 'autenticacao'
    | 'validacao'
    | 'sql'
    | 'tempoEsgotado'
    | 'rede'
    | 'interno';
  mensagem: string; // legível, em pt-BR
  detalhe?: string; // mensagem crua do SQL Server
  codigoSql?: number; // número do erro do SQL Server (ex.: 208)
  severidade?: number;
}

export interface RespostaErro {
  ok: false;
  erro: ErroApi;
}

export interface RespostaSucesso<T> {
  ok: true;
  dados: T;
}

export type Resposta<T> = RespostaSucesso<T> | RespostaErro;
```

- [ ] **Step 4: Write the failing test `packages/shared/src/credenciais.test.ts`**

```ts
import { test, expect } from 'bun:test';
import { esquemaCredenciais } from './credenciais';

test('aceita credenciais válidas', () => {
  const r = esquemaCredenciais.safeParse({ login: 'sa', senha: 'segredo' });
  expect(r.success).toBe(true);
});

test('rejeita login vazio', () => {
  const r = esquemaCredenciais.safeParse({ login: '', senha: 'segredo' });
  expect(r.success).toBe(false);
});

test('rejeita objeto sem senha', () => {
  const r = esquemaCredenciais.safeParse({ login: 'sa' });
  expect(r.success).toBe(false);
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `bun install && bun test packages/shared/src/credenciais.test.ts`
Expected: FAIL — `Cannot find module './credenciais'`.

- [ ] **Step 6: Implement `packages/shared/src/credenciais.ts`**

```ts
import { z } from 'zod';

// Credenciais de login que mapeiam diretamente para um login do SQL Server.
export const esquemaCredenciais = z.object({
  login: z.string().min(1, 'Informe o login.'),
  senha: z.string().min(1, 'Informe a senha.'),
});

export type Credenciais = z.infer<typeof esquemaCredenciais>;
```

- [ ] **Step 7: Create the barrel `packages/shared/src/index.ts`**

```ts
export * from './respostas';
export * from './credenciais';
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `bun test packages/shared/src/credenciais.test.ts`
Expected: PASS — 3 tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): contrato de respostas e esquema de credenciais"
```

---

### Task 2: `apps/server` — Fastify skeleton with health route (TDD)

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/index.ts`
- Test: `apps/server/src/app.test.ts`

- [ ] **Step 1: Create `apps/server/package.json`**

```json
{
  "name": "@dbos/server",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "test": "bun test"
  },
  "dependencies": {
    "@dbos/shared": "workspace:*",
    "fastify": "^4.28.0",
    "mssql": "^11.0.1"
  }
}
```

- [ ] **Step 2: Create `apps/server/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 3: Write the failing test `apps/server/src/app.test.ts`**

> **Desvio do plano (2026-06-07):** `app.inject()` (helper `light-my-request` do Fastify) é incompatível com o runtime do Bun — lança `ERR_HTTP_HEADERS_SENT`. O servidor HTTP real funciona normalmente no Bun (comprovado com `curl` → `200`). Por isso o teste sobe o app numa porta efêmera e testa via `fetch()` real, em vez de `inject()`.

```ts
import { test, expect } from 'bun:test';
import { construirApp } from './app';

// Sobe o app numa porta efêmera e testa pela rota HTTP real.
// Nota: não usamos app.inject() porque o light-my-request (helper do Fastify)
// é incompatível com o runtime do Bun. O servidor HTTP real funciona normalmente.
test('GET /api/saude responde ok', async () => {
  const app = construirApp();
  await app.listen({ port: 0, host: '127.0.0.1' });

  try {
    const { port } = app.server.address() as { port: number };
    const resposta = await fetch(`http://127.0.0.1:${port}/api/saude`);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ ok: true, dados: { status: 'ok' } });
  } finally {
    await app.close();
  }
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `bun install && bun test apps/server/src/app.test.ts`
Expected: FAIL — `Cannot find module './app'`.

- [ ] **Step 5: Implement `apps/server/src/app.ts`**

```ts
import Fastify, { type FastifyInstance } from 'fastify';
import type { Resposta } from '@dbos/shared';

// Constrói a instância do Fastify com as rotas registradas.
// Separado de index.ts para permitir testes via inject().
export function construirApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/api/saude', async (): Promise<Resposta<{ status: string }>> => {
    return { ok: true, dados: { status: 'ok' } };
  });

  return app;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `bun test apps/server/src/app.test.ts`
Expected: PASS — 1 test passes.

- [ ] **Step 7: Implement `apps/server/src/index.ts` (entry point)**

```ts
import { construirApp } from './app';

const PORTA = Number(process.env.PORTA ?? 3001);

const app = construirApp();

app
  .listen({ port: PORTA, host: '0.0.0.0' })
  .then(() => console.log(`Servidor DBOS ouvindo na porta ${PORTA}`))
  .catch((erro) => {
    console.error('Falha ao iniciar o servidor:', erro);
    process.exit(1);
  });
```

- [ ] **Step 8: Manually verify the server boots**

Run: `bun --filter @dbos/server dev`
Expected: logs `Servidor DBOS ouvindo na porta 3001`. In another terminal:
`curl http://localhost:3001/api/saude` → `{"ok":true,"dados":{"status":"ok"}}`. Stop with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add apps/server
git commit -m "feat(server): esqueleto Fastify com rota de saúde"
```

---

### Task 3: SQL Server connection + the Bun↔Tedious smoke test (TDD, go/no-go gate)

**Files:**
- Create: `.env.example`
- Create: `apps/server/src/bd/conexao.ts`
- Test: `apps/server/src/bd/conexao.test.ts`

**Prerequisite — native SQL Server install (one-time, manual, Windows): ✅ COMPLETED 2026-06-07**

> **Status on this machine — DONE.** A real **SQL Server 2022 Express** instance is running. Key detail: it is a **named instance — `SQLEXPRESS`** (`MSSQL16.SQLEXPRESS`), not the default `MSSQLSERVER`.
> - ✅ Database Engine only, native (no Docker, no LocalDB).
> - ✅ **Mixed Mode** authentication enabled (`LoginMode=2`); `sa` login enabled with a password.
> - ✅ **TCP/IP** enabled and forced to **static port 1433**. Named instances default to a *dynamic* port, so we set `IPAll → TcpPort=1433` and cleared `TcpDynamicPorts`; this makes `localhost,1433` work without the SQL Browser service.
> - ✅ Verified: connected as `sa` over `localhost,1433` and ran `SELECT 1`.
>
> _Original setup steps, kept for reference / reproducing on another machine:_
>
> 1. **Install SQL Server 2022 Developer Edition** (free, full-featured) or Express. During setup choose the **Database Engine** feature. Do **not** use SQL Server Express *LocalDB* — Tedious is TCP-only and LocalDB targets named pipes/shared memory.
> 2. **Enable Mixed Mode authentication.** In the setup wizard's *Database Engine Configuration* → *Authentication Mode*, pick **"SQL Server and Windows Authentication mode"** and set the `sa` password.
>    - If already Windows-auth-only: **SSMS** → server *Properties* → *Security* → select *SQL Server and Windows Authentication mode* → restart the service. Then enable the `sa` login and set its password. **Note:** on this machine the service is **"SQL Server (SQLEXPRESS)"**, not "(MSSQLSERVER)".
> 3. **Enable TCP/IP on port 1433.** **SQL Server Configuration Manager** → *Protocols for **SQLEXPRESS*** → set **TCP/IP** to *Enabled* → TCP/IP *Properties* → *IP Addresses* → *IPAll* → **TCP Port = 1433** and clear **TCP Dynamic Ports** → restart **SQL Server (SQLEXPRESS)**.
> 4. **(Optional) Verify with SSMS or DBeaver** that you can connect to `localhost,1433` with the `sa` login.

- [ ] **Step 1: Create `.env.example`**

```dotenv
# Arquivo de exemplo — versionado no git. NÃO coloque a senha real aqui.
# Copie para .env (ignorado pelo git) e preencha SQL_SENHA com a senha do sa.
PORTA=3001
SQL_SERVIDOR=localhost
SQL_PORTA=1433
SQL_USUARIO=sa
SQL_SENHA=troque-pela-senha-do-sa
SQL_BANCO=master
```

- [ ] **Step 2: Copy env and fill in the SA password**

Run:
```bash
cp .env.example .env
```
Then edit `.env` and set `SQL_SENHA` to the `sa` password set during the native install (SENHA_REMOVIDA). Confirm the **SQL Server (SQLEXPRESS)** service is running (Configuration Manager → SQL Server Services, or `services.msc` → `MSSQL$SQLEXPRESS`).

- [ ] **Step 3: Write the failing smoke test `apps/server/src/bd/conexao.test.ts`**

```ts
import { test, expect } from 'bun:test';
import { configDoAmbiente, testarConexao } from './conexao';

// Teste de integração: requer um SQL Server nativo em execução em localhost:1433,
// com Mixed Mode auth e TCP/IP habilitados (ver pré-requisito da Task 3).
// É o portão go/no-go do runtime Bun para o driver mssql/Tedious.
test('conecta no SQL Server e executa SELECT cru', async () => {
  const resultado = await testarConexao(configDoAmbiente());
  expect(resultado).toBe(1);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `bun test apps/server/src/bd/conexao.test.ts`
Expected: FAIL — `Cannot find module './conexao'`.

- [ ] **Step 5: Implement `apps/server/src/bd/conexao.ts`**

```ts
import sql from 'mssql';

// Monta a configuração de conexão a partir das variáveis de ambiente.
export function configDoAmbiente(): sql.config {
  return {
    server: process.env.SQL_SERVIDOR ?? 'localhost',
    port: Number(process.env.SQL_PORTA ?? 1433),
    user: process.env.SQL_USUARIO ?? 'sa',
    password: process.env.SQL_SENHA ?? '',
    database: process.env.SQL_BANCO ?? 'master',
    options: {
      // Em ambiente local o certificado é autoassinado.
      encrypt: true,
      trustServerCertificate: true,
    },
  };
}

// Abre uma conexão, roda um SELECT cru e devolve o valor — prova de vida.
export async function testarConexao(config: sql.config): Promise<number> {
  const pool = await sql.connect(config);
  try {
    const resultado = await pool.request().query<{ um: number }>('SELECT 1 AS um');
    return resultado.recordset[0]?.um ?? -1;
  } finally {
    await pool.close();
  }
}
```

- [ ] **Step 6: Run the smoke test to verify it passes**

Run: `bun test apps/server/src/bd/conexao.test.ts`
Expected: PASS — confirms `mssql`/Tedious works on Bun against the native SQL Server.

**GO/NO-GO:** If this fails with a TLS/socket error specific to Bun (not a wrong-password/login-failed/connection-refused error), record it. Fallback per spec §3: run only `apps/server` on Node (`node --experimental-strip-types` or `tsx`) while keeping Bun elsewhere. Re-run the same test under Node to confirm before proceeding. (Connection-refused/login-failed errors mean the native install prerequisite isn't satisfied — fix the service/TCP/auth, not the runtime.)

- [ ] **Step 7: Commit**

```bash
git add .env.example apps/server/src/bd
git commit -m "feat(server): conexão SQL Server nativo + smoke test Bun/Tedious"
```

---

### Task 4: `apps/web` — Vite + React + 98.css boot screen (TDD)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/TelaInicial.tsx`
- Test: `apps/web/src/TelaInicial.test.tsx`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@dbos/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@dbos/shared": "workspace:*",
    "98.css": "^0.1.20",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.5.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `apps/web/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/configTeste.ts'],
  },
});
```

- [ ] **Step 4: Create the test setup `apps/web/src/configTeste.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Write the failing test `apps/web/src/TelaInicial.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { TelaInicial } from './TelaInicial';

test('exibe o nome do sistema na tela inicial', () => {
  render(<TelaInicial />);
  expect(screen.getByText('DBOS')).toBeInTheDocument();
  expect(
    screen.getByText('Database Operating System'),
  ).toBeInTheDocument();
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `bun install && bun --filter @dbos/web test`
Expected: FAIL — `Cannot find module './TelaInicial'`.

- [ ] **Step 7: Implement `apps/web/src/TelaInicial.tsx`**

```tsx
import '98.css';

// Placeholder da tela de boot. A autenticação real chega na Fase 1.
export function TelaInicial() {
  return (
    <div className="window" style={{ width: 320, margin: '15vh auto' }}>
      <div className="title-bar">
        <div className="title-bar-text">DBOS</div>
      </div>
      <div className="window-body">
        <p>Database Operating System</p>
        <p>Iniciando o sistema...</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `bun --filter @dbos/web test`
Expected: PASS — 1 test passes.

- [ ] **Step 9: Create `apps/web/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DBOS</title>
  </head>
  <body>
    <div id="raiz"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Create `apps/web/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TelaInicial } from './TelaInicial';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado.');

createRoot(raiz).render(
  <StrictMode>
    <TelaInicial />
  </StrictMode>,
);
```

- [ ] **Step 11: Manually verify the dev server**

Run: `bun --filter @dbos/web dev`
Expected: Vite serves at `http://localhost:5173` showing a gray Win98 window titled "DBOS". Stop with Ctrl+C.

- [ ] **Step 12: Commit**

```bash
git add apps/web
git commit -m "feat(web): esqueleto Vite+React com tela inicial em 98.css"
```

---

### Task 5: Root README + verify the whole monorepo runs

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# DBOS — Database Operating System

SQL database management disguised as a retro Win98 desktop OS.

## Requisitos
- Bun
- SQL Server 2022 nativo (Developer/Express) instalado no Windows, com
  Mixed Mode auth e TCP/IP (porta 1433) habilitados. Sem Docker.
  (Opcional: SSMS ou DBeaver como cliente para inspecionar o banco.)

## Como rodar
```bash
bun install
cp .env.example .env        # configure SQL_SENHA com a senha do sa
bun run dev:server          # API em http://localhost:3001
bun run dev:web             # desktop em http://localhost:5173
```

## Testes
```bash
bun run test                # todos os pacotes
```

> Acesso ao banco é feito com SQL cru (sem ORM). Identificadores em pt-BR.
```

- [ ] **Step 2: Run the full test suite**

Run: `bun run test`
Expected: all packages pass — shared (3), server (app + conexão), web (1).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README com instruções de execução do monorepo"
```

---

## Self-Review

**Spec coverage (Phase 0 / roadmap step 0):**
- Bun monorepo + workspaces → Task 0 ✓
- `tsconfig.base` → Task 0 ✓
- 98.css wired in → Task 4 ✓
- Fastify + Vite skeletons → Tasks 2, 4 ✓
- `shared` package → Task 1 ✓
- Bun↔SQL Server smoke test (go/no-go) → Task 3 ✓
- Conventions: pt-BR identifiers throughout, raw SQL (`SELECT 1 AS um`), no ORM ✓

**Placeholder scan:** No TBD/TODO; every code step contains full content. ✓

**Type consistency:** `Resposta<T>`/`RespostaSucesso<T>` from `@dbos/shared` are used consistently in the server health route; `construirApp`, `configDoAmbiente`, `testarConexao`, `esquemaCredenciais`, `TelaInicial` are each defined once and referenced with matching names/signatures. ✓

**Out of scope (correctly deferred to later phase plans):** auth/session/pools (Phase 1), window manager (Phase 2), the four apps (Phases 3–6), polish (Phase 7).
