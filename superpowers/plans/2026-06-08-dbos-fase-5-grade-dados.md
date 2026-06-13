# DBOS — Fase 5: Grade de Dados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a Grade de Dados — um app que lê as linhas de uma tabela **paginadas no servidor** (`OFFSET/FETCH`) e permite **CRUD parametrizado** (inserir, editar e excluir linhas), com **invalidação do TanStack Query** após cada escrita (spec §6.2, roadmap passo 5).

**Architecture:** Leituras via `useQuery` com chave estruturada `['grade', esquema, tabela, pagina, tamanho]`; escritas via `useMutation` que invalidam `['grade', esquema, tabela]` (todas as páginas). No servidor, `GET /api/grade/linhas` pagina com `OFFSET/FETCH ROWS`; `POST/PUT/DELETE /api/grade/linha` fazem o CRUD. **Identificadores** (esquema/tabela/coluna) são **citados com colchetes e validados contra o catálogo** (defesa contra injeção); **valores** são sempre **parâmetros** (`request.input` + `@p`) — é o "parametrizado, ainda cru, mas seguro" da spec §2.2. Escritas exigem **chave primária**: as colunas PK aparecem read-only e formam o `WHERE`; tabelas sem PK ficam somente-leitura. Erros de leitura aparecem inline; erros de escrita abrem o diálogo retrô (`useDialogos`, Fase 4).

**Tech Stack:** Backend: Fastify 4, `mssql`/Tedious, zod, `bun:test` (integração real). Frontend: React 18, TanStack Query (`useQuery`/`useMutation`/`keepPreviousData`), 98.css, Vitest + RTL. pt-BR em tudo que autoramos; SQL cru, sem ORM.

**Builds on Phases 0–4:**
- `@dbos/shared`: `Resposta<T>`, `ErroApi`, `RefObjeto`/`ColunaBanco` (`explorador.ts`).
- `apps/server`: `criarAutenticar` + `req.sessao!.pool`; `listarColunas(pool, ref)` (catálogo, Fase 3 — devolve `nome`/`tipoDado`/`anulavel`/`ehChavePrimaria`); `tratadorErros` (SQL→`RespostaErro`); harness `comServidor`; rotas no contexto do cookie em `app.ts`.
- `apps/web`: `requisitar<T>`; `useObjetos` (`aplicativos/explorador/ganchos.ts`); `ErroApiError` (`aplicativos/consulta/ganchos.ts`); `useDialogos` (`areaTrabalho/useDialogos.ts`); WM com `registroApps.tsx` (`grade` ainda usa `AppPlaceholder`).

---

### Decisões de escopo desta fase (registradas)

- **Segurança do SQL:** identificadores citados com `[...]` (escape de `]`) **e** validados contra as colunas reais da tabela; valores sempre parametrizados. Nunca concatenamos valor do usuário no texto SQL (spec §2.2).
- **Escrita exige PK:** colunas PK são read-only e formam o `WHERE` de UPDATE/DELETE; sem PK a grade é somente-leitura. Isso evita o erro comum de UPDATE em coluna identity (que costuma ser a PK) e garante alvo único.
- **Paginação no servidor:** `OFFSET/FETCH` com `ORDER BY` pela PK (ou 1ª coluna). Tamanho de página fixo (100). Como a página é limitada, a grade editável renderiza a página direto — **sem virtualização** aqui; a grade virtualizada para resultados ilimitados já existe no Editor (Fase 4, spec §2.3).
- **Conversão de valores:** inputs são texto; convertemos por tipo da coluna (numérico→número, `bit`→boolean, vazio+anulável→`null`), e o resto vai como string (o SQL Server converte implicitamente). Tipos exóticos (binário, geography…) não são editáveis no v1.
- **Inserção:** campos em branco são **omitidos** (deixa identity/DEFAULT agir). **Exclusão:** confirmação inline ("Sim/Não") na própria linha — não estende o sistema de diálogos.
- **Reuso:** o seletor de tabela usa `useObjetos` (Fase 3) e os erros de escrita usam `ErroApiError` (Fase 4) — imports entre apps, reuso deliberado.
- **Adiado:** filtro/ordenação por coluna na grade (debounce, spec §2.3) e "abrir na grade" a partir do Explorador — nice-to-have de fases futuras.

---

### File structure for this phase

**`packages/shared/src/`**
- Create `grade.ts` — `ResultadoGrade`, `RespostaGrade`, `RespostaMutacaoGrade`, `ValorCelula`, `esquemaPaginaGrade`, `esquemaInsercao`, `esquemaAtualizacao`, `esquemaRemocao` (+ tipos).
- Modify `index.ts` — exportar.
- Test `grade.test.ts` — zod.

**`apps/server/src/`**
- Create `bd/consultasGrade.ts` — `citarId`, `obterMetadados`, `listarLinhas`, `inserirLinha`, `atualizarLinha`, `removerLinha`.
- Test `bd/consultasGrade.test.ts` — `citarId` (puro).
- Create `rotas/grade.ts` — `registrarRotasGrade`.
- Modify `app.ts` — registrar a rota no contexto autenticado.
- Test `rotas/grade.test.ts` — integração real (CRUD).

**`apps/web/src/aplicativos/grade/`**
- Create `conversao.ts` — `converterValor`.
- Test `conversao.test.ts`.
- Create `ganchos.ts` — `useLinhas` + `useInserirLinha`/`useAtualizarLinha`/`useRemoverLinha`.
- Create `TabelaGrade.tsx` — grade editável + paginação.
- Test `TabelaGrade.test.tsx`.
- Create `GradeDados.tsx` — seletor de tabela + wiring.
- Test `GradeDados.test.tsx`.
- Create `grade.css` — estilos.

**`apps/web/src/areaTrabalho/`**
- Modify `registroApps.tsx` — `grade` passa a usar `GradeDados`.

**`README.md`** — Modify.

---

### Task 0: `@dbos/shared` — contrato da grade (TDD do zod)

**Files:**
- Create: `packages/shared/src/grade.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/grade.test.ts`

- [ ] **Step 1: Escrever o teste que falha `packages/shared/src/grade.test.ts`**

```ts
import { test, expect } from 'bun:test';
import {
  esquemaPaginaGrade,
  esquemaInsercao,
  esquemaAtualizacao,
  esquemaRemocao,
} from './grade';

test('paginaGrade aplica defaults e coage números', () => {
  const r = esquemaPaginaGrade.safeParse({ esquema: 'dbo', tabela: 'Clientes' });
  expect(r.success).toBe(true);
  if (r.success) {
    expect(r.data.pagina).toBe(0);
    expect(r.data.tamanho).toBe(100);
  }
  const r2 = esquemaPaginaGrade.safeParse({ esquema: 'dbo', tabela: 'C', pagina: '2', tamanho: '50' });
  expect(r2.success).toBe(true);
  if (r2.success) expect(r2.data.pagina).toBe(2);
});

test('insercao aceita valores e rejeita sem tabela', () => {
  expect(esquemaInsercao.safeParse({ esquema: 'dbo', tabela: 'C', valores: { nome: 'Ana', idade: 5, ativo: true, obs: null } }).success).toBe(true);
  expect(esquemaInsercao.safeParse({ esquema: 'dbo', valores: {} }).success).toBe(false);
});

test('atualizacao e remocao exigem chave', () => {
  expect(esquemaAtualizacao.safeParse({ esquema: 'dbo', tabela: 'C', chave: { id: 1 }, valores: { nome: 'X' } }).success).toBe(true);
  expect(esquemaRemocao.safeParse({ esquema: 'dbo', tabela: 'C', chave: { id: 1 } }).success).toBe(true);
  expect(esquemaRemocao.safeParse({ esquema: 'dbo', tabela: 'C' }).success).toBe(false);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd packages/shared && bun test src/grade.test.ts`
Expected: FAIL — `Cannot find module './grade'`.

- [ ] **Step 3: Implementar `packages/shared/src/grade.ts`**

```ts
import { z } from 'zod';
import type { Resposta } from './respostas';
import type { ColunaBanco } from './explorador';

// Valor de uma célula trafegado entre web e server.
export type ValorCelula = string | number | boolean | null;

export interface ResultadoGrade {
  colunas: ColunaBanco[];
  chavePrimaria: string[]; // nomes das colunas PK
  linhas: Record<string, unknown>[]; // cada linha é um objeto coluna->valor
  total: number; // total de linhas na tabela (COUNT)
  pagina: number; // base 0
  tamanho: number;
}

export type RespostaGrade = Resposta<ResultadoGrade>;
export type RespostaMutacaoGrade = Resposta<{ linhasAfetadas: number }>;

const valorCelula = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const esquemaPaginaGrade = z.object({
  esquema: z.string().min(1).max(128),
  tabela: z.string().min(1).max(128),
  pagina: z.coerce.number().int().min(0).default(0),
  tamanho: z.coerce.number().int().min(1).max(500).default(100),
});
export type PaginaGrade = z.infer<typeof esquemaPaginaGrade>;

export const esquemaInsercao = z.object({
  esquema: z.string().min(1).max(128),
  tabela: z.string().min(1).max(128),
  valores: z.record(valorCelula),
});
export type Insercao = z.infer<typeof esquemaInsercao>;

export const esquemaAtualizacao = z.object({
  esquema: z.string().min(1).max(128),
  tabela: z.string().min(1).max(128),
  chave: z.record(valorCelula),
  valores: z.record(valorCelula),
});
export type Atualizacao = z.infer<typeof esquemaAtualizacao>;

export const esquemaRemocao = z.object({
  esquema: z.string().min(1).max(128),
  tabela: z.string().min(1).max(128),
  chave: z.record(valorCelula),
});
export type Remocao = z.infer<typeof esquemaRemocao>;
```

- [ ] **Step 4: Exportar no barril `packages/shared/src/index.ts`**

```ts
export * from './respostas';
export * from './credenciais';
export * from './sessao';
export * from './explorador';
export * from './consulta';
export * from './grade';
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd packages/shared && bun test src/grade.test.ts`
Expected: PASS — 3 testes.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/grade.ts packages/shared/src/grade.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): contrato da grade (ResultadoGrade, esquemas de CRUD)"
```

---

### Task 1: Servidor — consultas da grade + `citarId` (TDD do helper puro)

`citarId` é puro e tem teste unitário; as funções de DB são cobertas pela integração (Task 2).

**Files:**
- Create: `apps/server/src/bd/consultasGrade.ts`
- Test: `apps/server/src/bd/consultasGrade.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/server/src/bd/consultasGrade.test.ts`**

```ts
import { test, expect } from 'bun:test';
import { citarId } from './consultasGrade';

test('cita identificador com colchetes', () => {
  expect(citarId('Clientes')).toBe('[Clientes]');
});

test('escapa o colchete de fechamento (defesa contra injeção)', () => {
  expect(citarId('a]b')).toBe('[a]]b]');
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/server && bun test --env-file=../../.env src/bd/consultasGrade.test.ts`
Expected: FAIL — `Cannot find module './consultasGrade'`.

- [ ] **Step 3: Implementar `apps/server/src/bd/consultasGrade.ts`**

```ts
import sql from 'mssql';
import type { ConnectionPool } from 'mssql';
import type { ColunaBanco, RefObjeto, ResultadoGrade, ValorCelula } from '@dbos/shared';
import { listarColunas } from './consultasSistema';

// Cita um identificador SQL com colchetes, escapando ']'. Como o conteúdo vira
// um nome literal entre [], não há como "escapar" para SQL executável.
export function citarId(id: string): string {
  return `[${id.replace(/]/g, ']]')}]`;
}

export interface MetadadosTabela {
  colunas: ColunaBanco[];
  chavePrimaria: string[];
}

// Colunas + PK da tabela (reusa a consulta de catálogo da Fase 3).
export async function obterMetadados(pool: ConnectionPool, ref: RefObjeto): Promise<MetadadosTabela> {
  const colunas = await listarColunas(pool, ref);
  const chavePrimaria = colunas.filter((c) => c.ehChavePrimaria).map((c) => c.nome);
  return { colunas, chavePrimaria };
}

function somaAfetadas(r: { rowsAffected?: number[] }): number {
  return (r.rowsAffected ?? []).reduce((a, b) => a + b, 0);
}

// Página de linhas via OFFSET/FETCH. Ordena pela PK (ou 1ª coluna).
export async function listarLinhas(
  pool: ConnectionPool,
  ref: RefObjeto,
  meta: MetadadosTabela,
  pagina: number,
  tamanho: number,
): Promise<ResultadoGrade> {
  const alvo = `${citarId(ref.esquema)}.${citarId(ref.tabela)}`;
  const ordem = (meta.chavePrimaria.length ? meta.chavePrimaria : [meta.colunas[0]!.nome])
    .map(citarId)
    .join(', ');

  const contagem = await pool.request().query<{ total: number }>(`SELECT COUNT(*) AS total FROM ${alvo}`);
  const total = contagem.recordset[0]?.total ?? 0;

  const dados = await pool
    .request()
    .input('offset', sql.Int, pagina * tamanho)
    .input('tamanho', sql.Int, tamanho)
    .query<Record<string, unknown>>(
      `SELECT * FROM ${alvo} ORDER BY ${ordem} OFFSET @offset ROWS FETCH NEXT @tamanho ROWS ONLY`,
    );

  return {
    colunas: meta.colunas,
    chavePrimaria: meta.chavePrimaria,
    linhas: dados.recordset,
    total,
    pagina,
    tamanho,
  };
}

export async function inserirLinha(
  pool: ConnectionPool,
  ref: RefObjeto,
  valores: Record<string, ValorCelula>,
): Promise<number> {
  const alvo = `${citarId(ref.esquema)}.${citarId(ref.tabela)}`;
  const nomes = Object.keys(valores);
  const req = pool.request();
  nomes.forEach((n, i) => req.input(`p${i}`, valores[n]));
  const texto = nomes.length
    ? `INSERT INTO ${alvo} (${nomes.map(citarId).join(', ')}) VALUES (${nomes.map((_, i) => `@p${i}`).join(', ')})`
    : `INSERT INTO ${alvo} DEFAULT VALUES`;
  return somaAfetadas(await req.query(texto));
}

export async function atualizarLinha(
  pool: ConnectionPool,
  ref: RefObjeto,
  chave: Record<string, ValorCelula>,
  valores: Record<string, ValorCelula>,
): Promise<number> {
  const alvo = `${citarId(ref.esquema)}.${citarId(ref.tabela)}`;
  const req = pool.request();
  const sets = Object.keys(valores).map((n, i) => {
    req.input(`v${i}`, valores[n]);
    return `${citarId(n)} = @v${i}`;
  });
  const wheres = Object.keys(chave).map((n, i) => {
    req.input(`k${i}`, chave[n]);
    return `${citarId(n)} = @k${i}`;
  });
  const texto = `UPDATE ${alvo} SET ${sets.join(', ')} WHERE ${wheres.join(' AND ')}`;
  return somaAfetadas(await req.query(texto));
}

export async function removerLinha(
  pool: ConnectionPool,
  ref: RefObjeto,
  chave: Record<string, ValorCelula>,
): Promise<number> {
  const alvo = `${citarId(ref.esquema)}.${citarId(ref.tabela)}`;
  const req = pool.request();
  const wheres = Object.keys(chave).map((n, i) => {
    req.input(`k${i}`, chave[n]);
    return `${citarId(n)} = @k${i}`;
  });
  const texto = `DELETE FROM ${alvo} WHERE ${wheres.join(' AND ')}`;
  return somaAfetadas(await req.query(texto));
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/server && bun test --env-file=../../.env src/bd/consultasGrade.test.ts`
Expected: PASS — 2 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/bd/consultasGrade.ts apps/server/src/bd/consultasGrade.test.ts
git commit -m "feat(server): consultas da grade (listar/inserir/atualizar/remover)"
```

---

### Task 2: Servidor — rotas da grade + integração real (TDD)

Portão ponta a ponta do servidor: cria uma tabela de teste com PK e exercita o CRUD completo.

**Files:**
- Create: `apps/server/src/rotas/grade.ts`
- Modify: `apps/server/src/app.ts`
- Test: `apps/server/src/rotas/grade.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/server/src/rotas/grade.test.ts`**

```ts
import { test, expect } from 'bun:test';
import sql from 'mssql';
import { construirApp } from '../app';
import { configParaLogin } from '../bd/conexao';

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
const TABELA = '__dbos_teste_grade';
const DROP = `IF OBJECT_ID('dbo.${TABELA}', 'U') IS NOT NULL DROP TABLE dbo.${TABELA};`;

async function entrar(base: string): Promise<string> {
  const r = await fetch(`${base}/api/autenticacao/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(SA),
  });
  return r.headers.get('set-cookie')!.split(';')[0];
}

async function comTabelaDeTeste(fn: () => Promise<void>) {
  const pool = await new sql.ConnectionPool(configParaLogin(SA)).connect();
  await pool.request().query(DROP);
  await pool.request().query(
    `CREATE TABLE dbo.${TABELA} (id INT IDENTITY(1,1) PRIMARY KEY, nome NVARCHAR(50) NOT NULL, valor INT NULL);
     INSERT INTO dbo.${TABELA} (nome, valor) VALUES ('Ana', 10), ('Bia', 20);`,
  );
  try {
    await fn();
  } finally {
    await pool.request().query(DROP);
    await pool.close();
  }
}

function req(base: string, metodo: string, caminho: string, cookie: string, corpo?: unknown) {
  return fetch(`${base}${caminho}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', cookie },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

test('sem cookie, /grade/linhas devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/grade/linhas?esquema=dbo&tabela=x`);
    expect(r.status).toBe(401);
  });
});

test('CRUD completo paginado', async () => {
  await comTabelaDeTeste(async () => {
    await comServidor(async (base) => {
      const cookie = await entrar(base);

      // READ
      let r = await req(base, 'GET', `/api/grade/linhas?esquema=dbo&tabela=${TABELA}&pagina=0&tamanho=100`, cookie);
      expect(r.status).toBe(200);
      let dados = (await r.json()).dados;
      expect(dados.chavePrimaria).toEqual(['id']);
      expect(dados.total).toBe(2);
      expect(dados.linhas.length).toBe(2);

      // INSERT
      r = await req(base, 'POST', '/api/grade/linha', cookie, { esquema: 'dbo', tabela: TABELA, valores: { nome: 'Caio', valor: 30 } });
      expect(r.status).toBe(200);
      expect((await r.json()).dados.linhasAfetadas).toBe(1);

      // confirma e pega o id do Caio
      r = await req(base, 'GET', `/api/grade/linhas?esquema=dbo&tabela=${TABELA}`, cookie);
      dados = (await r.json()).dados;
      expect(dados.total).toBe(3);
      const caio = dados.linhas.find((l: { nome: string }) => l.nome === 'Caio');
      expect(caio).toBeDefined();

      // UPDATE
      r = await req(base, 'PUT', '/api/grade/linha', cookie, { esquema: 'dbo', tabela: TABELA, chave: { id: caio.id }, valores: { nome: 'Caio Editado' } });
      expect(r.status).toBe(200);
      expect((await r.json()).dados.linhasAfetadas).toBe(1);

      // DELETE
      r = await req(base, 'DELETE', '/api/grade/linha', cookie, { esquema: 'dbo', tabela: TABELA, chave: { id: caio.id } });
      expect(r.status).toBe(200);
      expect((await r.json()).dados.linhasAfetadas).toBe(1);

      r = await req(base, 'GET', `/api/grade/linhas?esquema=dbo&tabela=${TABELA}`, cookie);
      expect((await r.json()).dados.total).toBe(2);
    });
  });
});

test('insert com coluna inexistente devolve 400 de validação', async () => {
  await comTabelaDeTeste(async () => {
    await comServidor(async (base) => {
      const cookie = await entrar(base);
      const r = await req(base, 'POST', '/api/grade/linha', cookie, { esquema: 'dbo', tabela: TABELA, valores: { naoexiste: 1 } });
      expect(r.status).toBe(400);
      expect((await r.json()).erro.tipo).toBe('validacao');
    });
  });
});

test('tabela inexistente devolve 404 de validação', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await req(base, 'GET', '/api/grade/linhas?esquema=dbo&tabela=__nao_existe_zzz', cookie);
    expect(r.status).toBe(404);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/grade.test.ts`
Expected: FAIL — rota inexistente (404 em tudo / falha de compilação após o Step 4).

- [ ] **Step 3: Implementar `apps/server/src/rotas/grade.ts`**

```ts
import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  esquemaPaginaGrade,
  esquemaInsercao,
  esquemaAtualizacao,
  esquemaRemocao,
  type RespostaGrade,
  type RespostaMutacaoGrade,
} from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import {
  obterMetadados,
  listarLinhas,
  inserirLinha,
  atualizarLinha,
  removerLinha,
  type MetadadosTabela,
} from '../bd/consultasGrade';

function erroValidacao(reply: FastifyReply, mensagem: string, status = 400) {
  return reply.status(status).send({ ok: false, erro: { tipo: 'validacao', mensagem } });
}

// Devolve o nome da primeira coluna inválida, ou null se todas existem.
function colunaInvalida(meta: MetadadosTabela, nomes: string[]): string | null {
  const validas = new Set(meta.colunas.map((c) => c.nome));
  for (const n of nomes) if (!validas.has(n)) return n;
  return null;
}

export function registrarRotasGrade(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/grade/linhas', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaPaginaGrade.safeParse(req.query);
    if (!a.success) return erroValidacao(reply, a.error.issues[0]?.message ?? 'Parâmetros inválidos.');
    const ref = { esquema: a.data.esquema, tabela: a.data.tabela };
    const meta = await obterMetadados(req.sessao!.pool, ref);
    if (meta.colunas.length === 0) return erroValidacao(reply, 'Tabela não encontrada.', 404);
    const dados = await listarLinhas(req.sessao!.pool, ref, meta, a.data.pagina, a.data.tamanho);
    const resposta: RespostaGrade = { ok: true, dados };
    return resposta;
  });

  app.post('/api/grade/linha', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaInsercao.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados de inserção inválidos.');
    const ref = { esquema: a.data.esquema, tabela: a.data.tabela };
    const meta = await obterMetadados(req.sessao!.pool, ref);
    if (meta.colunas.length === 0) return erroValidacao(reply, 'Tabela não encontrada.', 404);
    const ruim = colunaInvalida(meta, Object.keys(a.data.valores));
    if (ruim) return erroValidacao(reply, `Coluna inexistente: ${ruim}`);
    const linhasAfetadas = await inserirLinha(req.sessao!.pool, ref, a.data.valores);
    const resposta: RespostaMutacaoGrade = { ok: true, dados: { linhasAfetadas } };
    return resposta;
  });

  app.put('/api/grade/linha', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaAtualizacao.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados de atualização inválidos.');
    if (Object.keys(a.data.valores).length === 0) return erroValidacao(reply, 'Nada para atualizar.');
    if (Object.keys(a.data.chave).length === 0) return erroValidacao(reply, 'Chave ausente.');
    const ref = { esquema: a.data.esquema, tabela: a.data.tabela };
    const meta = await obterMetadados(req.sessao!.pool, ref);
    if (meta.colunas.length === 0) return erroValidacao(reply, 'Tabela não encontrada.', 404);
    const ruim = colunaInvalida(meta, [...Object.keys(a.data.valores), ...Object.keys(a.data.chave)]);
    if (ruim) return erroValidacao(reply, `Coluna inexistente: ${ruim}`);
    const linhasAfetadas = await atualizarLinha(req.sessao!.pool, ref, a.data.chave, a.data.valores);
    const resposta: RespostaMutacaoGrade = { ok: true, dados: { linhasAfetadas } };
    return resposta;
  });

  app.delete('/api/grade/linha', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaRemocao.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados de remoção inválidos.');
    if (Object.keys(a.data.chave).length === 0) return erroValidacao(reply, 'Chave ausente.');
    const ref = { esquema: a.data.esquema, tabela: a.data.tabela };
    const meta = await obterMetadados(req.sessao!.pool, ref);
    if (meta.colunas.length === 0) return erroValidacao(reply, 'Tabela não encontrada.', 404);
    const ruim = colunaInvalida(meta, Object.keys(a.data.chave));
    if (ruim) return erroValidacao(reply, `Coluna inexistente: ${ruim}`);
    const linhasAfetadas = await removerLinha(req.sessao!.pool, ref, a.data.chave);
    const resposta: RespostaMutacaoGrade = { ok: true, dados: { linhasAfetadas } };
    return resposta;
  });
}
```

- [ ] **Step 4: Registrar no contexto autenticado em `apps/server/src/app.ts`**

Import no topo:

```ts
import { registrarRotasGrade } from './rotas/grade';
```

Dentro do `app.register(async (instancia) => { ... })`, após `registrarRotasConsulta(instancia, gerenciador);`:

```ts
    registrarRotasGrade(instancia, gerenciador);
```

- [ ] **Step 5: Rodar a integração e confirmar que passa**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/grade.test.ts`
Expected: PASS — 4 testes. (Falha por `ELOGIN`/conexão = ambiente.)

- [ ] **Step 6: Suíte inteira do servidor**

Run: `bun --filter @dbos/server test`
Expected: PASS — tudo, incluindo consultasGrade (2) e grade (4).

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/rotas/grade.ts apps/server/src/rotas/grade.test.ts apps/server/src/app.ts
git commit -m "feat(server): rotas da grade (CRUD paginado) ponta a ponta"
```

---

### Task 3: Web — conversão de valores de célula (TDD)

**Files:**
- Create: `apps/web/src/aplicativos/grade/conversao.ts`
- Test: `apps/web/src/aplicativos/grade/conversao.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/aplicativos/grade/conversao.test.ts`**

```ts
import { test, expect } from 'vitest';
import { converterValor } from './conversao';
import type { ColunaBanco } from '@dbos/shared';

function col(p: Partial<ColunaBanco>): ColunaBanco {
  return { nome: 'c', tipoDado: 'nvarchar(50)', anulavel: true, ehChavePrimaria: false, ...p };
}

test('numérico vira número', () => {
  expect(converterValor(col({ tipoDado: 'int' }), '42')).toBe(42);
});

test('numérico inválido fica como texto', () => {
  expect(converterValor(col({ tipoDado: 'int' }), 'abc')).toBe('abc');
});

test('vazio em coluna anulável vira null', () => {
  expect(converterValor(col({ tipoDado: 'int', anulavel: true }), '')).toBeNull();
});

test('vazio em coluna não anulável fica string vazia', () => {
  expect(converterValor(col({ tipoDado: 'nvarchar(50)', anulavel: false }), '')).toBe('');
});

test('bit vira boolean', () => {
  expect(converterValor(col({ tipoDado: 'bit' }), '1')).toBe(true);
  expect(converterValor(col({ tipoDado: 'bit' }), '0')).toBe(false);
});

test('texto comum fica string', () => {
  expect(converterValor(col({ tipoDado: 'nvarchar(50)' }), 'Ana')).toBe('Ana');
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/grade/conversao.test.ts`
Expected: FAIL — `Cannot find module './conversao'`.

- [ ] **Step 3: Implementar `apps/web/src/aplicativos/grade/conversao.ts`**

```ts
import type { ColunaBanco, ValorCelula } from '@dbos/shared';

const TIPOS_NUMERICOS = [
  'int', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'real', 'money', 'smallmoney',
];

// Converte o texto digitado para o tipo adequado da coluna. O resto vai como
// string e o SQL Server converte implicitamente (spec: parametrizado e seguro).
export function converterValor(coluna: ColunaBanco, texto: string): ValorCelula {
  if (texto === '') return coluna.anulavel ? null : '';
  const base = coluna.tipoDado.split('(')[0]!.trim().toLowerCase();
  if (base === 'bit') return texto === '1' || texto.toLowerCase() === 'true';
  if (TIPOS_NUMERICOS.includes(base)) {
    const n = Number(texto);
    return Number.isNaN(n) ? texto : n;
  }
  return texto;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/grade/conversao.test.ts`
Expected: PASS — 6 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/aplicativos/grade/conversao.ts apps/web/src/aplicativos/grade/conversao.test.ts
git commit -m "feat(web): conversão de valores de célula"
```

---

### Task 4: Web — ganchos da grade

Query paginada + 3 mutações com invalidação. Exercitados pelo teste da `TabelaGrade` (Task 5); sem teste próprio.

**Files:**
- Create: `apps/web/src/aplicativos/grade/ganchos.ts`

- [ ] **Step 1: Implementar `apps/web/src/aplicativos/grade/ganchos.ts`**

```ts
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ResultadoGrade, ValorCelula } from '@dbos/shared';
import { requisitar } from '../../api/cliente';
import { ErroApiError } from '../consulta/ganchos';

const chaveTabela = (esquema: string, tabela: string) => ['grade', esquema, tabela] as const;

export function useLinhas(esquema: string, tabela: string, pagina: number, tamanho: number) {
  return useQuery({
    queryKey: [...chaveTabela(esquema, tabela), pagina, tamanho],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ResultadoGrade> => {
      const params = new URLSearchParams({
        esquema,
        tabela,
        pagina: String(pagina),
        tamanho: String(tamanho),
      });
      const r = await requisitar<ResultadoGrade>(`/api/grade/linhas?${params.toString()}`);
      if (!r.ok) throw new ErroApiError(r.erro);
      return r.dados;
    },
  });
}

type Mutacao = { linhasAfetadas: number };

function usarInvalidacao(esquema: string, tabela: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: chaveTabela(esquema, tabela) });
}

export function useInserirLinha(esquema: string, tabela: string) {
  const invalidar = usarInvalidacao(esquema, tabela);
  return useMutation({
    mutationFn: async (valores: Record<string, ValorCelula>): Promise<Mutacao> => {
      const r = await requisitar<Mutacao>('/api/grade/linha', {
        method: 'POST',
        body: JSON.stringify({ esquema, tabela, valores }),
      });
      if (!r.ok) throw new ErroApiError(r.erro);
      return r.dados;
    },
    onSuccess: invalidar,
  });
}

export function useAtualizarLinha(esquema: string, tabela: string) {
  const invalidar = usarInvalidacao(esquema, tabela);
  return useMutation({
    mutationFn: async (entrada: {
      chave: Record<string, ValorCelula>;
      valores: Record<string, ValorCelula>;
    }): Promise<Mutacao> => {
      const r = await requisitar<Mutacao>('/api/grade/linha', {
        method: 'PUT',
        body: JSON.stringify({ esquema, tabela, ...entrada }),
      });
      if (!r.ok) throw new ErroApiError(r.erro);
      return r.dados;
    },
    onSuccess: invalidar,
  });
}

export function useRemoverLinha(esquema: string, tabela: string) {
  const invalidar = usarInvalidacao(esquema, tabela);
  return useMutation({
    mutationFn: async (chave: Record<string, ValorCelula>): Promise<Mutacao> => {
      const r = await requisitar<Mutacao>('/api/grade/linha', {
        method: 'DELETE',
        body: JSON.stringify({ esquema, tabela, chave }),
      });
      if (!r.ok) throw new ErroApiError(r.erro);
      return r.dados;
    },
    onSuccess: invalidar,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/aplicativos/grade/ganchos.ts
git commit -m "feat(web): ganchos da grade (useLinhas + mutações)"
```

---

### Task 5: Web — tabela editável da grade (TDD)

**Files:**
- Create: `apps/web/src/aplicativos/grade/TabelaGrade.tsx`
- Test: `apps/web/src/aplicativos/grade/TabelaGrade.test.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/aplicativos/grade/TabelaGrade.test.tsx`**

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TabelaGrade } from './TabelaGrade';

afterEach(() => vi.unstubAllGlobals());

const RESULTADO = {
  ok: true,
  dados: {
    colunas: [
      { nome: 'id', tipoDado: 'int', anulavel: false, ehChavePrimaria: true },
      { nome: 'nome', tipoDado: 'nvarchar(50)', anulavel: false, ehChavePrimaria: false },
    ],
    chavePrimaria: ['id'],
    linhas: [
      { id: 1, nome: 'Ana' },
      { id: 2, nome: 'Bia' },
    ],
    total: 2,
    pagina: 0,
    tamanho: 100,
  },
};

function stubFetch(onMutacao?: (metodo: string) => void) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      const metodo = init?.method ?? 'GET';
      if (metodo === 'GET') return new Response(JSON.stringify(RESULTADO));
      onMutacao?.(metodo);
      return new Response(JSON.stringify({ ok: true, dados: { linhasAfetadas: 1 } }));
    }),
  );
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <TabelaGrade esquema="dbo" tabela="Clientes" />
    </QueryClientProvider>,
  );
}

test('mostra cabeçalhos, linhas e paginação', async () => {
  stubFetch();
  renderizar();
  expect(await screen.findByText('Ana')).toBeInTheDocument();
  expect(screen.getByText('Bia')).toBeInTheDocument();
  expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument();
});

test('editar uma linha dispara um PUT', async () => {
  const metodos: string[] = [];
  stubFetch((m) => metodos.push(m));
  renderizar();
  await screen.findByText('Ana');
  fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]!);
  const input = screen.getByLabelText('editar nome');
  fireEvent.change(input, { target: { value: 'Ana Maria' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(metodos).toContain('PUT'));
});

test('excluir pede confirmação e dispara um DELETE', async () => {
  const metodos: string[] = [];
  stubFetch((m) => metodos.push(m));
  renderizar();
  await screen.findByText('Ana');
  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]!);
  fireEvent.click(screen.getByRole('button', { name: 'Sim' }));
  await waitFor(() => expect(metodos).toContain('DELETE'));
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/grade/TabelaGrade.test.tsx`
Expected: FAIL — `Cannot find module './TabelaGrade'`.

- [ ] **Step 3: Implementar `apps/web/src/aplicativos/grade/TabelaGrade.tsx`**

```tsx
import { useState } from 'react';
import type { ValorCelula } from '@dbos/shared';
import { useDialogos } from '../../areaTrabalho/useDialogos';
import { ErroApiError } from '../consulta/ganchos';
import { converterValor } from './conversao';
import { useAtualizarLinha, useInserirLinha, useLinhas, useRemoverLinha } from './ganchos';

const TAMANHO_PAGINA = 100;

function formatar(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function TabelaGrade({ esquema, tabela }: { esquema: string; tabela: string }) {
  const [pagina, setPagina] = useState(0);
  const consulta = useLinhas(esquema, tabela, pagina, TAMANHO_PAGINA);
  const abrirDialogo = useDialogos((s) => s.abrir);
  const inserir = useInserirLinha(esquema, tabela);
  const atualizar = useAtualizarLinha(esquema, tabela);
  const remover = useRemoverLinha(esquema, tabela);

  const [editando, setEditando] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [inserindo, setInserindo] = useState(false);
  const [rascunhoNovo, setRascunhoNovo] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState<number | null>(null);

  function mostrarErro(e: unknown) {
    const erro = e instanceof ErroApiError ? e.erro : undefined;
    const detalhe = [erro?.detalhe, erro?.codigoSql ? `Erro SQL ${erro.codigoSql}` : undefined]
      .filter(Boolean)
      .join('\n');
    abrirDialogo({
      tipo: 'erro',
      titulo: 'Erro',
      mensagem: erro?.mensagem ?? 'A operação falhou.',
      detalhe: detalhe || undefined,
    });
  }

  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando linhas…</p>;
  if (consulta.isError) return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;

  const dados = consulta.data;
  const editavel = dados.chavePrimaria.length > 0;
  const totalPaginas = Math.max(1, Math.ceil(dados.total / dados.tamanho));

  function chaveDaLinha(linha: Record<string, unknown>): Record<string, ValorCelula> {
    const chave: Record<string, ValorCelula> = {};
    for (const k of dados.chavePrimaria) chave[k] = linha[k] as ValorCelula;
    return chave;
  }

  function iniciarEdicao(indice: number) {
    const linha = dados.linhas[indice]!;
    const r: Record<string, string> = {};
    for (const c of dados.colunas) {
      if (!c.ehChavePrimaria) r[c.nome] = linha[c.nome] == null ? '' : String(linha[c.nome]);
    }
    setRascunho(r);
    setEditando(indice);
  }

  function salvarEdicao(indice: number) {
    const linha = dados.linhas[indice]!;
    const valores: Record<string, ValorCelula> = {};
    for (const c of dados.colunas) {
      if (!c.ehChavePrimaria) valores[c.nome] = converterValor(c, rascunho[c.nome] ?? '');
    }
    atualizar.mutate(
      { chave: chaveDaLinha(linha), valores },
      { onSuccess: () => setEditando(null), onError: mostrarErro },
    );
  }

  function salvarInsercao() {
    const valores: Record<string, ValorCelula> = {};
    for (const c of dados.colunas) {
      const texto = rascunhoNovo[c.nome];
      if (texto !== undefined && texto !== '') valores[c.nome] = converterValor(c, texto);
    }
    inserir.mutate(valores, {
      onSuccess: () => {
        setInserindo(false);
        setRascunhoNovo({});
      },
      onError: mostrarErro,
    });
  }

  function excluir(indice: number) {
    const linha = dados.linhas[indice]!;
    remover.mutate(chaveDaLinha(linha), {
      onSuccess: () => setConfirmando(null),
      onError: mostrarErro,
    });
  }

  return (
    <div className="grade-dados">
      <div className="grade-barra">
        {editavel && (
          <button onClick={() => setInserindo((v) => !v)}>＋ Nova linha</button>
        )}
        <span className="grade-paginacao">
          <button disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} aria-label="Anterior">
            ◀
          </button>
          Página {pagina + 1} de {totalPaginas} ({dados.total} linhas)
          <button
            disabled={pagina + 1 >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
            aria-label="Próxima"
          >
            ▶
          </button>
        </span>
        {!editavel && <span className="grade-aviso-pk">Sem chave primária — somente leitura.</span>}
      </div>
      <div className="grade-rolagem">
        <table className="grade-tabela">
          <thead>
            <tr>
              {editavel && <th>Ações</th>}
              {dados.colunas.map((c) => (
                <th key={c.nome}>
                  {(c.ehChavePrimaria ? '🔑 ' : '') + c.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inserindo && (
              <tr>
                <td className="grade-acoes">
                  <button onClick={salvarInsercao} disabled={inserir.isPending}>
                    Inserir
                  </button>
                  <button onClick={() => setInserindo(false)}>Cancelar</button>
                </td>
                {dados.colunas.map((c) => (
                  <td key={c.nome}>
                    <input
                      aria-label={`novo ${c.nome}`}
                      value={rascunhoNovo[c.nome] ?? ''}
                      onChange={(e) =>
                        setRascunhoNovo((r) => ({ ...r, [c.nome]: e.target.value }))
                      }
                    />
                  </td>
                ))}
              </tr>
            )}
            {dados.linhas.map((linha, indice) => {
              const emEdicao = editando === indice;
              return (
                <tr key={indice}>
                  {editavel && (
                    <td className="grade-acoes">
                      {emEdicao ? (
                        <>
                          <button onClick={() => salvarEdicao(indice)} disabled={atualizar.isPending}>
                            Salvar
                          </button>
                          <button onClick={() => setEditando(null)}>Cancelar</button>
                        </>
                      ) : confirmando === indice ? (
                        <>
                          Excluir?
                          <button onClick={() => excluir(indice)} disabled={remover.isPending}>
                            Sim
                          </button>
                          <button onClick={() => setConfirmando(null)}>Não</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => iniciarEdicao(indice)}>Editar</button>
                          <button onClick={() => setConfirmando(indice)}>Excluir</button>
                        </>
                      )}
                    </td>
                  )}
                  {dados.colunas.map((c) => (
                    <td key={c.nome}>
                      {emEdicao && !c.ehChavePrimaria ? (
                        <input
                          aria-label={`editar ${c.nome}`}
                          value={rascunho[c.nome] ?? ''}
                          onChange={(e) =>
                            setRascunho((r) => ({ ...r, [c.nome]: e.target.value }))
                          }
                        />
                      ) : (
                        formatar(linha[c.nome])
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/grade/TabelaGrade.test.tsx`
Expected: PASS — 3 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/aplicativos/grade/TabelaGrade.tsx apps/web/src/aplicativos/grade/TabelaGrade.test.tsx
git commit -m "feat(web): tabela editável da grade"
```

---

### Task 6: Web — app Grade de Dados (seletor + registro) (TDD)

**Files:**
- Create: `apps/web/src/aplicativos/grade/GradeDados.tsx`
- Create: `apps/web/src/aplicativos/grade/grade.css`
- Test: `apps/web/src/aplicativos/grade/GradeDados.test.tsx`
- Modify: `apps/web/src/areaTrabalho/registroApps.tsx`

- [ ] **Step 1: Criar os estilos `apps/web/src/aplicativos/grade/grade.css`**

```css
.grade-dados,
.grade-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.grade-cabecalho-tabela {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px;
  border-bottom: 1px solid grey;
}
.grade-barra {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px;
  border-bottom: 1px solid grey;
}
.grade-paginacao {
  display: flex;
  align-items: center;
  gap: 6px;
}
.grade-aviso-pk {
  color: #a00;
  font-size: 11px;
}
.grade-rolagem {
  flex: 1;
  overflow: auto;
  background: #fff;
}
.grade-tabela {
  border-collapse: collapse;
  font-size: 12px;
}
.grade-tabela th,
.grade-tabela td {
  border: 1px solid #c0c0c0;
  padding: 2px 6px;
  white-space: nowrap;
  text-align: left;
}
.grade-tabela thead th {
  position: sticky;
  top: 0;
  background: #c0c0c0;
}
.grade-tabela input {
  width: 100%;
  box-sizing: border-box;
}
.grade-acoes {
  display: flex;
  gap: 4px;
  align-items: center;
}
```

- [ ] **Step 2: Escrever o teste que falha `apps/web/src/aplicativos/grade/GradeDados.test.tsx`**

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GradeDados } from './GradeDados';
import type { EstadoJanela } from '../../areaTrabalho/tipos';

afterEach(() => vi.unstubAllGlobals());

function janelaFake(dados: unknown): EstadoJanela {
  return { dados } as unknown as EstadoJanela;
}

function renderizar(janela: EstadoJanela) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <GradeDados janela={janela} />
    </QueryClientProvider>,
  );
}

test('sem tabela pré-selecionada, mostra o seletor com as tabelas', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: true, dados: [{ esquema: 'dbo', nome: 'Clientes', tipo: 'tabela' }] }),
      ),
    ),
  );
  renderizar(janelaFake(null));
  expect(await screen.findByText(/dbo\.Clientes/)).toBeInTheDocument();
});

test('com tabela em dados, abre a grade direto', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dados: {
            colunas: [{ nome: 'id', tipoDado: 'int', anulavel: false, ehChavePrimaria: true }],
            chavePrimaria: ['id'],
            linhas: [{ id: 1 }],
            total: 1,
            pagina: 0,
            tamanho: 100,
          },
        }),
      ),
    ),
  );
  renderizar(janelaFake({ esquema: 'dbo', tabela: 'Clientes' }));
  expect(await screen.findByText(/dbo\.Clientes/)).toBeInTheDocument();
  expect(await screen.findByText(/Página 1 de 1/)).toBeInTheDocument();
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/grade/GradeDados.test.tsx`
Expected: FAIL — `Cannot find module './GradeDados'`.

- [ ] **Step 4: Implementar `apps/web/src/aplicativos/grade/GradeDados.tsx`**

```tsx
import { useState } from 'react';
import type { EstadoJanela, PropsApp } from '../../areaTrabalho/tipos';
import { useObjetos } from '../explorador/ganchos';
import { TabelaGrade } from './TabelaGrade';
import './grade.css';

interface RefTabela {
  esquema: string;
  tabela: string;
}

function refInicial(janela: EstadoJanela): RefTabela | null {
  const d = janela.dados as { esquema?: unknown; tabela?: unknown } | null | undefined;
  if (d && typeof d.esquema === 'string' && typeof d.tabela === 'string') {
    return { esquema: d.esquema, tabela: d.tabela };
  }
  return null;
}

export function GradeDados({ janela }: PropsApp) {
  const [ref, setRef] = useState<RefTabela | null>(() => refInicial(janela));

  if (!ref) return <SeletorTabela aoEscolher={setRef} />;

  return (
    <div className="grade-container">
      <div className="grade-cabecalho-tabela">
        <strong>
          {ref.esquema}.{ref.tabela}
        </strong>
        <button onClick={() => setRef(null)}>Trocar tabela</button>
      </div>
      <TabelaGrade esquema={ref.esquema} tabela={ref.tabela} />
    </div>
  );
}

function SeletorTabela({ aoEscolher }: { aoEscolher: (r: RefTabela) => void }) {
  const consulta = useObjetos();
  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando tabelas…</p>;
  if (consulta.isError) return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;
  const tabelas = (consulta.data ?? []).filter((o) => o.tipo === 'tabela');
  return (
    <div style={{ padding: 8 }}>
      <p>Escolha uma tabela:</p>
      <ul className="tree-view">
        {tabelas.map((o) => (
          <li key={`${o.esquema}.${o.nome}`}>
            <button onClick={() => aoEscolher({ esquema: o.esquema, tabela: o.nome })}>
              ▦ {o.esquema}.{o.nome}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/grade/GradeDados.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 6: Registrar o app em `apps/web/src/areaTrabalho/registroApps.tsx`**

Import no topo:

```tsx
import { GradeDados } from '../aplicativos/grade/GradeDados';
```

Na entrada `grade`, troque `componente: AppPlaceholder` por `componente: GradeDados` e aumente o tamanho:

```tsx
  grade: {
    titulo: 'Grade de Dados',
    icone: '▦',
    tamanhoInicial: { largura: 640, altura: 440 },
    componente: GradeDados,
  },
```

(`propriedades` segue com `AppPlaceholder`.)

> Nota: o teste `loja.test.ts` (Fase 2) afirma a largura inicial de uma janela `consulta` (560), não da `grade`, então não é afetado. Se algum teste afirmar a largura da `grade`, ajuste para 640.

- [ ] **Step 7: Checar tipos do web**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros. (Corrija com `!` no ponto exato se algum acesso a índice nos novos arquivos for sinalizado, sem mudar comportamento.)

- [ ] **Step 8: Rodar a suíte web inteira**

Run: `bun --filter @dbos/web test`
Expected: PASS — tudo + conversao (6) + TabelaGrade (3) + GradeDados (2).

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/aplicativos/grade/GradeDados.tsx apps/web/src/aplicativos/grade/GradeDados.test.tsx apps/web/src/aplicativos/grade/grade.css apps/web/src/areaTrabalho/registroApps.tsx
git commit -m "feat(web): app Grade de Dados (seletor + registro)"
```

---

### Task 7: Verificação completa + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Checar tipos do web (garantia)**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 2: Documentar a Grade no `README.md`**

Acrescente, ao final do parágrafo do Editor de Consultas na seção "Como rodar":

```markdown

A **Grade de Dados** lê uma tabela paginada (escolha-a no seletor do app) e
permite editar, inserir e excluir linhas. Edição/exclusão usam a chave primária
(tabelas sem PK ficam somente-leitura); identificadores são citados e validados,
e valores vão sempre parametrizados. Erros de escrita aparecem no diálogo retrô.
```

- [ ] **Step 3: Rodar a suíte inteira do monorepo**

Run: `bun run test`
Expected: tudo verde — `@dbos/shared` (+ grade), `@dbos/server` (+ consultasGrade 2 + grade 4), `@dbos/web` (+ conversao 6 + TabelaGrade 3 + GradeDados 2). Falhas SÓ por conexão SQL = ambiente.

- [ ] **Step 4: Verificar no navegador**

Em dois terminais:
```bash
bun run dev:server   # :3001
bun run dev:web      # :5173
```
Faça login e abra a **Grade de Dados**. Confirme:
- O seletor lista as tabelas; escolher uma abre a grade paginada (use uma tabela com dados; se o banco estiver vazio, crie uma no Editor de Consultas: `CREATE TABLE dbo.Teste (id INT IDENTITY PRIMARY KEY, nome NVARCHAR(50))` e alguns INSERTs).
- "＋ Nova linha" insere; "Editar"/"Salvar" atualiza; "Excluir"→"Sim" remove — a grade recarrega sozinha (invalidação).
- A coluna PK aparece com 🔑 e read-only na edição; ◀/▶ paginam.
- Uma escrita inválida (ex.: nome NULL numa coluna NOT NULL) abre o diálogo de erro retrô.
- Uma tabela sem PK aparece como "somente leitura".

Pare ambos com Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README descreve a Grade de Dados (Fase 5)"
```

---

## Self-Review

**Spec coverage (Fase 5 / roadmap passo 5 — "paginated reads + parameterized CRUD mutations with TanStack Query invalidation"):**
- Leituras paginadas no servidor com `OFFSET/FETCH` (spec §2.3) → `listarLinhas` + `GET /api/grade/linhas` (Tasks 1–2). ✓
- CRUD parametrizado (spec §2.2) → `inserir/atualizar/removerLinha` com `request.input` + `@p`; identificadores citados e validados contra o catálogo (Tasks 1–2). ✓
- `useQuery` para ler, `useMutation` para escrever, chaves estruturadas `['grade', tabela, pagina]`, invalidação por tabela (spec §6.2) → ganchos da grade (Task 4). ✓
- Diálogos de erro nas escritas (spec §6.4) → `mostrarErro` via `useDialogos` na `TabelaGrade` (Task 5). ✓
- App como uma entrada no registro genérico (spec §4.2) → `grade` passa a usar `GradeDados` (Task 6). ✓
- Integração com SQL Server real como tier de maior valor (spec §7) → `grade.test.ts`: CRUD completo, validação de coluna, 404, 401 (Task 2). ✓

**Placeholder scan:** Sem TBD/TODO; todo passo tem conteúdo completo. `propriedades` segue `AppPlaceholder` de propósito (Fase 6).

**Type consistency:** `ResultadoGrade`/`ValorCelula`/os 4 esquemas zod definidos uma vez (Task 0) e usados no servidor (`consultasGrade`, rotas — Tasks 1–2) e no web (ganchos, conversão, componentes — Tasks 3–6). `RefObjeto` reusado da Fase 3. `obterMetadados`/`listarLinhas(pool, ref, meta, pagina, tamanho)`/`inserir/atualizar/removerLinha` (Task 1) batem com as chamadas nas rotas (Task 2). `useLinhas`/`useInserirLinha`/`useAtualizarLinha`/`useRemoverLinha` (Task 4) batem com o uso na `TabelaGrade` (Task 5); `useAtualizarLinha` recebe `{ chave, valores }`. `converterValor(coluna, texto)` (Task 3) usado na `TabelaGrade`. `GradeDados({ janela }: PropsApp)` é atribuível a `ComponentType<PropsApp>` no registro (Task 6). `ErroApiError` (Fase 4) e `useObjetos` (Fase 3) reusados. Rota no mesmo contexto do cookie em `app.ts` (Task 2). ✓

**Riscos/observações:**
- Identity/computed em coluna não-PK: editar erra no DB e abre o diálogo (raro; PK identity é o caso comum e é tratado deixando a PK read-only).
- Inserir omite campos em branco (deixa DEFAULT/identity agir); NULL explícito em coluna não-PK anulável é possível via edição (vazio→null), mas no insert o vazio é omitido — limitação documentada.
- Sem virtualização na grade editável (a página é limitada); a grade virtualizada para resultados ilimitados é a do Editor (Fase 4).
- O `COUNT(*)` por página é simples (recontado a cada leitura) — suficiente para v1.
- Reuso entre apps (`useObjetos`, `ErroApiError`) é proposital; se incomodar no futuro, mover para um módulo web compartilhado.
- Filtro/ordenação por coluna e "abrir na grade" pelo Explorador ficam para depois.
