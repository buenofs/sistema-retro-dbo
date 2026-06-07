# DBOS (Database Operating System) — Design Spec

**Date:** 2026-06-06
**Status:** Approved (pending final user review)

## 1. Overview

DBOS is a SQL database management experience disguised as a retro desktop
operating system inspired by Windows 95/98 and early-2000s desktop
environments. The user should feel like they are using an operating system
that happens to manage a SQL database — draggable/resizable windows, a Start
menu, a taskbar, desktop shortcuts, context menus, and a file-explorer
metaphor — not a modern SaaS dashboard.

**Hard "no" list (visual):** no glassmorphism, no neumorphism, no modern
rounded cards, no modern sidebars, no SaaS-dashboard appearance. Authentic
Win98: gray OS panels, blue title bars, 3D beveled buttons, pixel-perfect
retro icons.

### Key decisions (locked)

| Area | Decision |
|------|----------|
| Data layer | Real **Microsoft SQL Server**, one owned database/instance |
| Connection model | One owned database (no arbitrary remote connections) |
| Auth | App login **is** a SQL Server login; permissions enforced by the DB |
| v1 apps | Query Editor, Object Explorer, Data Grid editor, Schema Properties |
| Retro UI | **98.css** for components + **custom React window manager** |
| Language | **TypeScript** everywhere |
| DB access | **Raw SQL only** — no ORM / query builder |
| Runtime/tooling | **Bun** (package manager + runtime), with an early SQL Server smoke test |

## 2. Conventions (project-wide)

These apply to every section below.

### 2.1 Naming — Portuguese (pt-BR)

ALL identifiers we author — variables, functions, types, components, comments,
and file names where reasonable — are named in **pt-BR**. English is used only
where unavoidable: language keywords, third-party library APIs/props (React
`props`, `useState`, CSS `zIndex`, etc.), and standard protocol terms.

Example: `EstadoJanela`, `abrirJanela`, `idFocada`, `gerenciadorPools`.

### 2.2 Database access — raw SQL only

No ORM, no query builder (Kysely/Drizzle/Prisma excluded). All DB access is
hand-authored SQL through the `mssql`/Tedious driver, because the teacher
evaluates raw queries.

**Raw ≠ string-concatenated.** Two classes of SQL:

- **Parameterized** (explorer, grid, properties): use
  `request.input('nome', sql.NVarChar, valor)` + `@nome`. Still raw, but safe.
- **Pass-through** (Query Editor only): the user's SQL runs verbatim — that is
  the intended behavior. The security boundary is the login's own DB
  permissions, plus a statement timeout and a row cap.

### 2.3 Performance practices (called out where they apply)

- **Memoization** — `React.memo` on `<Janela>` chrome and each app component so
  dragging one window doesn't re-render the others; `useCallback` for action
  handlers; **Zustand selective selectors** so a window re-renders only when its
  own slice changes. Biggest perf lever for a multi-window desktop.
- **Lazy loading / code-splitting** — `React.lazy` + `<Suspense>` per app in the
  registry (e.g. CodeMirror loads only when the Query Editor opens).
- **List virtualization** — the Data Grid virtualizes rows
  (`@tanstack/react-virtual`); result sets can be thousands of rows.
- **Server-side pagination** — raw `OFFSET/FETCH`, never ship whole tables.
- **rAF-batched drag/resize** — pointer-move handlers batch via
  `requestAnimationFrame` to avoid layout thrash.
- **Debounce** — schema-search and filter inputs debounced before hitting the API.

## 3. Architecture & project structure

A Bun **monorepo** with three workspaces:

```
dbos/
├─ apps/
│  ├─ web/                 # Vite + React + TS — the retro desktop SPA
│  └─ server/              # Fastify + TS — API, sessions, SQL Server pools
├─ packages/
│  └─ shared/             # TS types + zod schemas shared by web & server
├─ package.json           # workspaces
└─ tsconfig.base.json
```

- **`apps/web`** — the entire OS shell. No SSR. Talks to the server only via
  `fetch` to `/api/*`. Owns all desktop/window state.
- **`apps/server`** — Fastify HTTP API. Validates logins against SQL Server,
  manages httpOnly session cookies, holds per-session connection pools, exposes
  endpoints for the four apps. All SQL lives here as raw strings.
- **`packages/shared`** — request/response types + zod validators
  (`QueryRequest`, `TableInfo`, `RowEditPayload`, `Resposta<T>`…). Imported by
  both sides for an end-to-end typed contract without an ORM.

**Data flow (one line):** React app → `fetch('/api/...')` → Fastify route →
zod-validates input → grabs the session's pool → runs raw (mostly
parameterized) SQL → returns typed JSON → React renders it in a window.

**Runtime note:** Bun is the package manager + toolchain everywhere, and the
backend runtime. Because the stack hinges on `mssql`/Tedious (a Node-specific
TDS implementation over `node:net`/`node:tls`), the **first** implementation
step is a real SQL Server connection smoke test on Bun. If tedious misbehaves,
the fallback is to run only `apps/server` on Node while keeping Bun everywhere
else — no other design change.

## 4. Window manager (the "OS feel")

Pure frontend state; the server knows nothing about windows.

### 4.1 Single source of truth (Zustand)

```ts
type IdJanela = string;

interface EstadoJanela {
  id: IdJanela;
  tipoApp: 'consulta' | 'explorador' | 'grade' | 'propriedades';
  titulo: string;
  icone: string;
  retangulo: { x: number; y: number; largura: number; altura: number };
  zIndex: number;
  estado: 'normal' | 'minimizada' | 'maximizada';
  dados: unknown;            // payload específico do app
}

interface LojaAreaTrabalho {
  janelas: EstadoJanela[];
  idFocada: IdJanela | null;
  proximoZ: number;
  abrirJanela: (app: EstadoJanela['tipoApp'], dados?: unknown) => void;
  fecharJanela: (id: IdJanela) => void;
  focar: (id: IdJanela) => void;
  mover: (id: IdJanela, x: number, y: number) => void;
  redimensionar: (id: IdJanela, largura: number, altura: number) => void;
  minimizar: (id: IdJanela) => void;
  maximizar: (id: IdJanela) => void;
  restaurar: (id: IdJanela) => void;
}
```

### 4.2 App registry

Each of the four apps is a plain React component registered against its
`tipoApp`. The WM is generic — it renders the registered component for each
window and passes it `dados`. Adding a future app = register one entry. The WM
↔ apps boundary is **only** `dados` + store actions.

### 4.3 Rendering layers (z-stacked)

- **Desktop** — wallpaper + double-clickable shortcut icons.
- **Windows layer** — absolutely-positioned `<Janela>` chrome (98.css title bar,
  min/max/close, beveled border) wrapping the app component. Drag = pointer
  events on the title bar updating `retangulo`; resize = corner/edge handles.
  Clicking a window calls `focar()` → bumps `zIndex` to `proximoZ++`.
- **Taskbar** — Start button, one button per open window (focus/restore /
  minimize), and a clock.
- **Start menu / context menus** — a single portal layer; right-click on desktop
  or icons opens a 98-style menu.

### 4.4 Illusion details

Focused title bar in classic active-blue, others greyed; maximize snaps to fill
above the taskbar; minimize animates to its taskbar button; windows clamp within
the viewport.

### 4.5 Drag/resize

Hand-rolled with pointer events (no `react-rnd`) — ~150 lines, full control over
the retro feel and snapping, rAF-batched (see §2.3).

### 4.6 Persistence (optional, v1 nice-to-have)

Desktop layout serialized to `localStorage` so windows reopen where they were
left.

## 5. Backend, sessions & per-login connection pooling

Because the app login **is** a SQL Server login, the backend runs each user's
queries **as that login**, so SQL Server itself enforces permissions (a
read-only login physically cannot `DROP TABLE`, even via the Query Editor).

### 5.1 Server layout (`apps/server/src`)

```
src/
├─ index.ts                 # bootstrap do Fastify
├─ plugins/
│  ├─ sessao.ts             # cookie de sessão (httpOnly)
│  └─ tratadorErros.ts      # erros SQL → JSON padronizado
├─ rotas/
│  ├─ autenticacao.ts       # login / logout / sessaoAtual
│  ├─ consulta.ts           # Query Editor (SQL livre)
│  ├─ explorador.ts         # árvore de objetos
│  ├─ grade.ts              # CRUD de linhas
│  └─ propriedades.ts       # metadados de objetos
├─ bd/
│  ├─ gerenciadorPools.ts   # Map<idSessao, ConnectionPool>
│  └─ consultasSistema.ts   # SQL cru contra sys.* / INFORMATION_SCHEMA
```

### 5.2 Login flow

`POST /api/autenticacao/login` receives `{ login, senha }` → backend opens an
`mssql` `ConnectionPool` with those credentials. Success = valid login; failure
= retro "Logon failed" error. On success, mint an opaque, signed **session id**
in an **httpOnly, SameSite=Strict, Secure** cookie. The password is never
returned to the client and never stored in the cookie.

### 5.3 Pool lifecycle (decision: option A)

Keep the **live `ConnectionPool` in server memory**, keyed by session id in
`gerenciadorPools`. The password opens the pool once, then is discarded from the
heap — **no credential storage at all**. If the pool drops or the session idles
out, the user re-logs in. Cap concurrent sessions and set an idle TTL to clean
up abandoned pools.

(Rejected option B: store the password encrypted in memory to allow lazy pool
reopen — over-engineered for this project and means holding credentials.)

### 5.4 Request path

Every protected route: read session cookie →
`gerenciadorPools.obterPool(idSessao)` (missing → 401, boot to login) →
zod-validate body → run raw SQL → return typed JSON from `packages/shared`.

### 5.5 Schema introspection

The explorer tree and properties run hand-written SQL against
`INFORMATION_SCHEMA.TABLES`, `sys.columns`, `sys.indexes`, etc. — exactly the
raw SQL the teacher wants to see.

### 5.6 Hardening

Per-request statement timeout; max rows per response (`OFFSET/FETCH`);
rate-limit on `/login`; SQL errors mapped to a clean error shape (§6).

## 6. Data flow & error handling

### 6.1 Typed contract (discriminated union, `packages/shared`)

```ts
interface RespostaErro {
  ok: false;
  erro: {
    tipo: 'autenticacao' | 'validacao' | 'sql' | 'tempoEsgotado' | 'rede' | 'interno';
    mensagem: string;     // legível, em pt-BR
    detalhe?: string;     // mensagem crua do SQL Server
    codigoSql?: number;   // número do erro do SQL Server (ex.: 208 = objeto inválido)
    severidade?: number;
  };
}
type Resposta<T> = { ok: true; dados: T } | RespostaErro;
```

### 6.2 Client data layer — TanStack Query

Reads (explorer tree, grid rows, properties) are `useQuery`; writes (run SQL,
edit/insert/delete rows) are `useMutation`. Structured query keys
(`['grade', tabela, pagina]`) so a row edit invalidates just that table's grid.

### 6.3 Error taxonomy → producer

- `validacao` — zod rejects the body (400).
- `autenticacao` — no/expired session or bad login (401) → boot to login screen.
- `sql` — SQL Server raised an error; backend captures number, severity, and
  message into `detalhe`/`codigoSql`. Real DB errors stay visible.
- `tempoEsgotado` — statement timeout (§5.6).
- `rede` / `interno` — fetch failed / unexpected server error.

### 6.4 SQL errors → retro dialog boxes

A single `<GerenciadorDialogos>` portal (driven by a small Zustand store,
`useDialogos`) renders 98.css-styled modal dialogs. An error opens a classic
gray dialog: title bar "Erro", red-X icon, the pt-BR `mensagem`, an expandable
"Detalhes" revealing the raw SQL Server text + `codigoSql`, an **OK** button,
and a Web-Audio system beep on open. Warnings/confirmations reuse the same
component with a different `tipo`/icon.

### 6.5 Isolation — per-window error boundaries

Each app component is wrapped in `<LimiteErroJanela>` (a React error boundary).
If one app throws, that window shows a retro error panel ("This program has
performed an illegal operation") while the rest of the desktop keeps running.

## 7. Testing strategy

- **`packages/shared`** — unit-test zod schemas (valid/invalid payloads).
- **`apps/server`**:
  - *Unit* (`bun test`): `gerenciadorPools` eviction/cap, SQL-error → `RespostaErro`
    mapping, session signing.
  - *Integration*: a **native SQL Server instance** (Developer/Express on Windows,
    no Docker) running on `localhost:1433`; run the actual raw queries — login,
    catalog introspection, paginated reads, parameterized CRUD. Highest-value
    tier since raw SQL is the graded core.
- **`apps/web`** — Vitest + React Testing Library on the WM store (pure logic:
  `abrirJanela`, z-order on `focar`, `maximizar`/`restaurar`, clamping) and key
  components (dialog manager, error boundary).
- **End-to-end** — Playwright for 2–3 illusion-critical flows: boot → login → run
  query → see grid; drag + resize a window; bad SQL → retro error dialog.
- **Manual smoke (step 0)** — tedious ↔ SQL Server on Bun, before feature work.

## 8. Implementation roadmap (phased, each phase demoable)

0. **Fundação** — Bun monorepo + workspaces, `tsconfig.base`, 98.css wired in,
   Fastify + Vite skeletons, `shared` package. **Smoke-test tedious↔SQL Server
   on Bun** (go/no-go on the runtime).
1. **Autenticação + sessão + pools** — login/boot screen → SQL Server login →
   session cookie → `gerenciadorPools`. Proves the auth model end to end.
2. **Gerenciador de janelas** — store, `<Janela>` chrome, drag/resize/z-order,
   taskbar, Start menu, desktop, app registry (placeholder apps).
3. **Explorador de objetos** — first real app: raw catalog-query tree.
   Read-only, exercises the full data path at low risk.
4. **Editor de consultas** — CodeMirror, SQL pass-through, virtualized result
   grid, error dialogs. (Lazy-loaded per §2.3.)
5. **Grade de dados** — paginated reads + parameterized CRUD mutations with
   TanStack Query invalidation.
6. **Propriedades de objetos** — right-click → Properties dialogs from catalog
   queries.
7. **Polimento** — layout persistence (localStorage), system sounds, context
   menus, perf pass (verify memo/lazy/virtualization), basic a11y.

Ordering rationale: the data layer is proven early (phases 1 + 3) before the
heavier UI apps, and each phase produces something demoable on its own.
```
