# DBOS RH — Plano 1: Fundação (banco + contratos + busca/relacionamentos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estabelecer a base da reforma RH: o banco dedicado **`DBOS_RH`** (schema + FKs + 2 views + seed determinístico) criado por script idempotente + `bun run db:setup`, com `SQL_BANCO=DBOS_RH`; os **contratos compartilhados** de domínio/busca/relacionamentos; e os **módulos/rotas de servidor** de Busca e Relacionamentos com testes de integração contra o seed. As janelas-feature (Busca, Relacionamentos, Terminal) e o boot/polimento vêm nos planos seguintes.

**Architecture:** Mesmos padrões das Fases 0–7 (spec §1). SQL cru parametrizado (`request.input` + `@nome`); rotas protegidas pelo preHandler `autenticar` usando `req.sessao!.pool`, registradas no contexto do cookie em `app.ts`; respostas `Resposta<T>` tipadas. O `db:setup` roda o `.sql` (idempotente: dropa e recria objetos + reseed) conectando como `sa` ao `master` e fazendo `USE DBOS_RH`. IDs do seed são fixados (IDENTITY_INSERT) para os testes assertarem valores exatos (Felipe = id 1).

**Tech Stack:** Bun, TypeScript estrito (`noUncheckedIndexedAccess`), Fastify 4, `mssql`/Tedious, zod, `bun:test` (integração com SQL Server real). Sem mudança de frontend neste plano.

**Builds on Phases 0–7:** `conexao.ts` (`configDoAmbiente`/`configParaLogin`/`abrirPool`); `criarAutenticar` + `req.sessao!.pool`; `app.ts` registra rotas no contexto do cookie; harness `comServidor` em `rotas/*.test.ts`; `@dbos/shared` (`Resposta<T>`, `ErroApi`). Hoje `SQL_BANCO=master` e o `.env` é git-ignored (já tem `SQL_SENHA`/`SESSAO_SEGREDO`).

---

### Decisões deste plano

- **Banco dedicado `DBOS_RH`** criado via `db/dbos_rh.sql` + task `db:setup`. `SQL_BANCO` passa a `DBOS_RH`.
- **Seed determinístico com IDs fixos** (IDENTITY_INSERT) — Felipe = `Funcionarios.id = 1`, em Engenharia (`Departamentos.id = 1`), nos projetos DBOS (`id 1`) e Intranet (`id 3`); ≥1 funcionário com salário > 10000; ≥1 linha de folha **anômala**.
- **FKs dos dependentes com `ON DELETE CASCADE`** (FuncionariosProjetos, FolhaPagamento) para a exclusão de funcionário pela Grade funcionar.
- **Pré-requisito de toda a suíte a partir daqui:** `bun run db:setup` (o `DBOS_RH` precisa existir e estar semeado).

---

### File structure for this plan

**Raiz**
- Create `db/dbos_rh.sql` — script idempotente (CREATE DATABASE, tabelas, FKs, índices, views, seed).
- Modify `package.json` — script `db:setup`.
- Modify `.env.example` — `SQL_BANCO=DBOS_RH`.
- Modify `.env` (local, git-ignored) — `SQL_BANCO=DBOS_RH`.

**`apps/server/src`**
- Create `scripts/configurarBanco.ts` — executa o `.sql` em lotes (split por `GO`).
- Create `bd/consultasBusca.ts` — `buscarFuncionarios`.
- Create `rotas/busca.ts` — `registrarRotasBusca`.
- Create `bd/consultasRelacionamentos.ts` — `montarGrafo`.
- Create `rotas/relacionamentos.ts` — `registrarRotasRelacionamentos`.
- Modify `app.ts` — registrar as duas rotas no contexto autenticado.
- Test `rotas/busca.test.ts`, `rotas/relacionamentos.test.ts` — integração contra o seed.

**`packages/shared/src`**
- Create `dominio.ts` — `Funcionario`, `Departamento`, `Projeto`.
- Create `busca.ts` — `FiltrosBusca`, `esquemaBusca`, `ResultadoBusca`, `RespostaBusca`.
- Create `relacionamentos.ts` — `NoGrafo`, `ArestaGrafo`, `GrafoRelacionamentos`, `esquemaRefRelacionamento`, `RespostaRelacionamentos`.
- Modify `index.ts` — exportar os três.
- Test `busca.test.ts`, `relacionamentos.test.ts` — zod.

---

### Task 0: Banco `DBOS_RH` — script idempotente + `db:setup`

**Files:**
- Create: `db/dbos_rh.sql`
- Create: `apps/server/src/scripts/configurarBanco.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.env` (local, não commitado)

- [ ] **Step 1: Criar `db/dbos_rh.sql`**

```sql
-- DBOS_RH — schema RH idempotente (dropa e recria objetos + reseed).
IF DB_ID('DBOS_RH') IS NULL CREATE DATABASE DBOS_RH;
GO
USE DBOS_RH;
GO

-- Dropar na ordem de dependência (idempotência)
IF OBJECT_ID('dbo.vw_AnomaliasFolha', 'V') IS NOT NULL DROP VIEW dbo.vw_AnomaliasFolha;
IF OBJECT_ID('dbo.vw_FolhaResumo', 'V') IS NOT NULL DROP VIEW dbo.vw_FolhaResumo;
IF OBJECT_ID('dbo.FolhaPagamento', 'U') IS NOT NULL DROP TABLE dbo.FolhaPagamento;
IF OBJECT_ID('dbo.FuncionariosProjetos', 'U') IS NOT NULL DROP TABLE dbo.FuncionariosProjetos;
IF OBJECT_ID('dbo.Funcionarios', 'U') IS NOT NULL DROP TABLE dbo.Funcionarios;
IF OBJECT_ID('dbo.Projetos', 'U') IS NOT NULL DROP TABLE dbo.Projetos;
IF OBJECT_ID('dbo.Departamentos', 'U') IS NOT NULL DROP TABLE dbo.Departamentos;
GO

CREATE TABLE dbo.Departamentos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nome NVARCHAR(80) NOT NULL,
  centroCusto VARCHAR(20) NULL
);
CREATE TABLE dbo.Projetos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nome NVARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL,
  dataInicio DATE NULL
);
CREATE TABLE dbo.Funcionarios (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nome NVARCHAR(100) NOT NULL,
  cargo NVARCHAR(60) NULL,
  salario DECIMAL(10,2) NOT NULL DEFAULT 0,
  dataAdmissao DATE NULL,
  departamentoId INT NOT NULL
    CONSTRAINT FK_Funcionarios_Departamento REFERENCES dbo.Departamentos(id)
);
CREATE TABLE dbo.FuncionariosProjetos (
  funcionarioId INT NOT NULL
    CONSTRAINT FK_FP_Funcionario REFERENCES dbo.Funcionarios(id) ON DELETE CASCADE,
  projetoId INT NOT NULL
    CONSTRAINT FK_FP_Projeto REFERENCES dbo.Projetos(id) ON DELETE CASCADE,
  papel NVARCHAR(40) NULL,
  CONSTRAINT PK_FuncionariosProjetos PRIMARY KEY (funcionarioId, projetoId)
);
CREATE TABLE dbo.FolhaPagamento (
  id INT IDENTITY(1,1) PRIMARY KEY,
  funcionarioId INT NOT NULL
    CONSTRAINT FK_Folha_Funcionario REFERENCES dbo.Funcionarios(id) ON DELETE CASCADE,
  competencia CHAR(7) NOT NULL, -- 'AAAA-MM'
  salarioBase DECIMAL(10,2) NOT NULL,
  bonus DECIMAL(10,2) NOT NULL DEFAULT 0,
  descontos DECIMAL(10,2) NOT NULL DEFAULT 0,
  salarioLiquido DECIMAL(10,2) NOT NULL
);
GO

CREATE INDEX IX_Funcionarios_departamentoId ON dbo.Funcionarios(departamentoId);
CREATE INDEX IX_Folha_funcionarioId ON dbo.FolhaPagamento(funcionarioId);
CREATE INDEX IX_FP_projetoId ON dbo.FuncionariosProjetos(projetoId);
GO

-- Seed com IDs fixos (determinístico para os testes)
SET IDENTITY_INSERT dbo.Departamentos ON;
INSERT INTO dbo.Departamentos (id, nome, centroCusto) VALUES
  (1, 'Engenharia', 'CC-100'),
  (2, 'Financeiro', 'CC-200'),
  (3, 'Recursos Humanos', 'CC-300');
SET IDENTITY_INSERT dbo.Departamentos OFF;

SET IDENTITY_INSERT dbo.Projetos ON;
INSERT INTO dbo.Projetos (id, nome, status, dataInicio) VALUES
  (1, 'DBOS', 'Ativo', '2026-01-10'),
  (2, 'Folha2026', 'Ativo', '2026-02-01'),
  (3, 'Intranet', 'Planejado', '2026-03-15');
SET IDENTITY_INSERT dbo.Projetos OFF;

SET IDENTITY_INSERT dbo.Funcionarios ON;
INSERT INTO dbo.Funcionarios (id, nome, cargo, salario, dataAdmissao, departamentoId) VALUES
  (1, 'Felipe Bueno',   'Desenvolvedor Sr', 12000.00, '2025-06-01', 1),
  (2, 'Ana Souza',      'Desenvolvedora',    9000.00, '2025-08-12', 1),
  (3, 'Bruno Lima',     'Tech Lead',        15000.00, '2024-03-20', 1),
  (4, 'Carla Dias',     'Analista Fin.',     8000.00, '2025-01-05', 2),
  (5, 'Diego Alves',    'Contador',         11000.00, '2023-11-30', 2),
  (6, 'Elaine Rocha',   'Analista RH',       7000.00, '2025-09-01', 3),
  (7, 'Fabio Nunes',    'Gerente RH',       13000.00, '2022-07-15', 3),
  (8, 'Gabi Martins',   'Estagiária',        2500.00, '2026-02-01', 1);
SET IDENTITY_INSERT dbo.Funcionarios OFF;

INSERT INTO dbo.FuncionariosProjetos (funcionarioId, projetoId, papel) VALUES
  (1, 1, 'Backend'),   -- Felipe em DBOS
  (1, 3, 'Backend'),   -- Felipe em Intranet
  (2, 1, 'Frontend'),
  (3, 1, 'Líder'),
  (5, 2, 'Financeiro'),
  (6, 3, 'RH');

-- Folha: várias competências; a última do Felipe é ANÔMALA (liquido != base+bonus-descontos)
INSERT INTO dbo.FolhaPagamento (funcionarioId, competencia, salarioBase, bonus, descontos, salarioLiquido) VALUES
  (1, '2026-04', 12000.00, 1000.00, 2000.00, 11000.00),  -- ok
  (1, '2026-05', 12000.00, 1000.00, 2000.00,  9000.00),  -- ANÔMALA (deveria ser 11000)
  (2, '2026-05',  9000.00,  500.00, 1500.00,  8000.00),  -- ok
  (3, '2026-05', 15000.00, 2000.00, 3000.00, 14000.00);  -- ok
GO

CREATE VIEW dbo.vw_FolhaResumo AS
  SELECT f.id AS funcionarioId,
         f.nome AS funcionario,
         f.cargo,
         d.nome AS departamento,
         f.salario,
         fp.competencia AS ultimaCompetencia,
         fp.salarioLiquido AS ultimoLiquido
  FROM dbo.Funcionarios f
  JOIN dbo.Departamentos d ON d.id = f.departamentoId
  OUTER APPLY (
    SELECT TOP 1 competencia, salarioLiquido
    FROM dbo.FolhaPagamento fpx
    WHERE fpx.funcionarioId = f.id
    ORDER BY competencia DESC
  ) fp;
GO

CREATE VIEW dbo.vw_AnomaliasFolha AS
  SELECT fp.id,
         f.nome AS funcionario,
         fp.competencia,
         fp.salarioBase, fp.bonus, fp.descontos, fp.salarioLiquido,
         (fp.salarioBase + fp.bonus - fp.descontos) AS liquidoEsperado
  FROM dbo.FolhaPagamento fp
  JOIN dbo.Funcionarios f ON f.id = fp.funcionarioId
  WHERE fp.salarioLiquido <> fp.salarioBase + fp.bonus - fp.descontos;
GO
```

- [ ] **Step 2: Criar o executor `apps/server/src/scripts/configurarBanco.ts`**

```ts
import { readFileSync } from 'node:fs';
import sql from 'mssql';
import { configDoAmbiente } from '../bd/conexao';

// Executa db/dbos_rh.sql em lotes separados por 'GO'. Conecta no 'master'
// (o banco DBOS_RH pode ainda não existir) e o próprio script faz USE DBOS_RH.
const caminho = new URL('../../../../db/dbos_rh.sql', import.meta.url);
const texto = readFileSync(caminho, 'utf8');
const lotes = texto
  .split(/^\s*GO\s*$/im)
  .map((l) => l.trim())
  .filter((l) => l.length > 0);

const config: sql.config = { ...configDoAmbiente(), database: 'master' };
const pool = await new sql.ConnectionPool(config).connect();
try {
  for (const lote of lotes) {
    await pool.request().batch(lote);
  }
  console.log(`DBOS_RH configurado com sucesso (${lotes.length} lotes).`);
} finally {
  await pool.close();
}
```

> Nota de caminho: `apps/server/src/scripts/configurarBanco.ts` → `../../../../db/dbos_rh.sql` sobe `scripts`→`src`→`server`→`apps`→raiz e entra em `db/`. Se o executor reclamar do caminho, ajuste a contagem de `../` para chegar à raiz do repo.

- [ ] **Step 3: Adicionar o script `db:setup` em `package.json`**

No bloco `scripts`, acrescente (mantendo os demais):

```json
    "db:setup": "bun --env-file=.env apps/server/src/scripts/configurarBanco.ts"
```

- [ ] **Step 4: Apontar para `DBOS_RH` em `.env.example` e no `.env` local**

Em `.env.example`, troque a linha `SQL_BANCO=master` por:

```dotenv
SQL_BANCO=DBOS_RH
```

E faça a mesma troca no `.env` local (git-ignored) — necessário para o servidor e os testes conectarem em `DBOS_RH`.

- [ ] **Step 5: Rodar o setup e verificar**

Run: `bun run db:setup`
Expected: imprime `DBOS_RH configurado com sucesso (N lotes).` sem erro. (Falha por `ELOGIN`/conexão = ambiente: confira o serviço do SQL Server e `SQL_SENHA`.)

Verificação rápida (opcional), via sqlcmd ou SSMS:
`SELECT COUNT(*) FROM DBOS_RH.dbo.Funcionarios;` → 8;
`SELECT * FROM DBOS_RH.dbo.vw_AnomaliasFolha;` → 1 linha (Felipe, 2026-05).

- [ ] **Step 6: Commit**

```bash
git add db/dbos_rh.sql apps/server/src/scripts/configurarBanco.ts package.json .env.example
git commit -m "feat(db): banco DBOS_RH (schema + views + seed) e bun run db:setup"
```

---

### Task 1: `@dbos/shared` — contratos de domínio, busca e relacionamentos (TDD do zod)

**Files:**
- Create: `packages/shared/src/dominio.ts`
- Create: `packages/shared/src/busca.ts`
- Create: `packages/shared/src/relacionamentos.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/busca.test.ts`
- Test: `packages/shared/src/relacionamentos.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`packages/shared/src/busca.test.ts`:

```ts
import { test, expect } from 'bun:test';
import { esquemaBusca } from './busca';

test('aceita filtros parciais', () => {
  expect(esquemaBusca.safeParse({ nome: 'Fel' }).success).toBe(true);
  expect(esquemaBusca.safeParse({}).success).toBe(true);
});

test('coage ids/salário e valida operador', () => {
  const r = esquemaBusca.safeParse({ departamentoId: '1', salarioOp: 'gt', salario: '10000' });
  expect(r.success).toBe(true);
  if (r.success) {
    expect(r.data.departamentoId).toBe(1);
    expect(r.data.salario).toBe(10000);
  }
  expect(esquemaBusca.safeParse({ salarioOp: 'maior' }).success).toBe(false);
});
```

`packages/shared/src/relacionamentos.test.ts`:

```ts
import { test, expect } from 'bun:test';
import { esquemaRefRelacionamento } from './relacionamentos';

test('aceita tipo válido + id coagido', () => {
  const r = esquemaRefRelacionamento.safeParse({ tipo: 'funcionario', id: '1' });
  expect(r.success).toBe(true);
  if (r.success) expect(r.data.id).toBe(1);
});

test('rejeita tipo inválido', () => {
  expect(esquemaRefRelacionamento.safeParse({ tipo: 'pessoa', id: 1 }).success).toBe(false);
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `cd packages/shared && bun test src/busca.test.ts src/relacionamentos.test.ts`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Criar `packages/shared/src/dominio.ts`**

```ts
export interface Departamento {
  id: number;
  nome: string;
  centroCusto: string | null;
}

export interface Projeto {
  id: number;
  nome: string;
  status: string;
  dataInicio: string | null;
}

export interface Funcionario {
  id: number;
  nome: string;
  cargo: string | null;
  salario: number;
  dataAdmissao: string | null;
  departamentoId: number;
  departamento?: string; // nome do departamento, quando a consulta faz join
}
```

- [ ] **Step 4: Criar `packages/shared/src/busca.ts`**

```ts
import { z } from 'zod';
import type { Resposta } from './respostas';
import type { Funcionario } from './dominio';

export const esquemaBusca = z.object({
  nome: z.string().trim().min(1).max(100).optional(),
  departamentoId: z.coerce.number().int().positive().optional(),
  salarioOp: z.enum(['gt', 'lt', 'eq', 'entre']).optional(),
  salario: z.coerce.number().optional(),
  salario2: z.coerce.number().optional(), // limite superior quando salarioOp = 'entre'
  projetoId: z.coerce.number().int().positive().optional(),
  relacionadoA: z.coerce.number().int().positive().optional(),
});
export type FiltrosBusca = z.infer<typeof esquemaBusca>;

export type ResultadoBusca = Funcionario[];
export type RespostaBusca = Resposta<ResultadoBusca>;
```

- [ ] **Step 5: Criar `packages/shared/src/relacionamentos.ts`**

```ts
import { z } from 'zod';
import type { Resposta } from './respostas';

export type TipoNo = 'funcionario' | 'departamento' | 'projeto' | 'folha';

export interface NoGrafo {
  id: string; // ex.: 'funcionario:1', 'departamento:1'
  tipo: TipoNo;
  rotulo: string;
}

export interface ArestaGrafo {
  de: string;
  para: string;
  rotulo?: string;
}

export interface GrafoRelacionamentos {
  centro: string; // id do nó em foco
  nos: NoGrafo[];
  arestas: ArestaGrafo[];
}

export const esquemaRefRelacionamento = z.object({
  tipo: z.enum(['funcionario', 'departamento', 'projeto']),
  id: z.coerce.number().int().positive(),
});
export type RefRelacionamento = z.infer<typeof esquemaRefRelacionamento>;

export type RespostaRelacionamentos = Resposta<GrafoRelacionamentos>;
```

- [ ] **Step 6: Exportar no barril `packages/shared/src/index.ts`**

```ts
export * from './respostas';
export * from './credenciais';
export * from './sessao';
export * from './explorador';
export * from './consulta';
export * from './grade';
export * from './propriedades';
export * from './dominio';
export * from './busca';
export * from './relacionamentos';
```

- [ ] **Step 7: Rodar e confirmar que passam**

Run: `cd packages/shared && bun test src/busca.test.ts src/relacionamentos.test.ts`
Expected: PASS — 4 testes.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/dominio.ts packages/shared/src/busca.ts packages/shared/src/busca.test.ts packages/shared/src/relacionamentos.ts packages/shared/src/relacionamentos.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): contratos de domínio, busca e relacionamentos"
```

---

### Task 2: Servidor — busca de funcionários + integração real (TDD)

**Files:**
- Create: `apps/server/src/bd/consultasBusca.ts`
- Create: `apps/server/src/rotas/busca.ts`
- Modify: `apps/server/src/app.ts`
- Test: `apps/server/src/rotas/busca.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/server/src/rotas/busca.test.ts`**

```ts
import { test, expect } from 'bun:test';
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

function buscar(base: string, cookie: string, qs: string) {
  return fetch(`${base}/api/busca/funcionarios?${qs}`, { headers: { cookie } });
}

test('sem cookie devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/busca/funcionarios`);
    expect(r.status).toBe(401);
  });
});

test('filtra por salário (gt) — Felipe entra, estagiária não', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await buscar(base, cookie, 'salarioOp=gt&salario=10000');
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    const nomes = dados.map((f: { nome: string }) => f.nome);
    expect(nomes).toContain('Felipe Bueno');
    expect(nomes).not.toContain('Gabi Martins');
  });
});

test('filtra por departamento (Engenharia = 1) e traz o nome do depto', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await buscar(base, cookie, 'departamentoId=1');
    const { dados } = await r.json();
    expect(dados.length).toBeGreaterThanOrEqual(3);
    expect(dados.every((f: { departamento: string }) => f.departamento === 'Engenharia')).toBe(true);
  });
});

test('relacionadoA Felipe (1) traz colegas de depto/projeto e exclui o próprio', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await buscar(base, cookie, 'relacionadoA=1');
    const { dados } = await r.json();
    const ids = dados.map((f: { id: number }) => f.id);
    expect(ids).not.toContain(1); // não inclui o próprio Felipe
    expect(ids).toContain(2); // Ana: mesmo depto + projeto DBOS
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/busca.test.ts`
Expected: FAIL — rota inexistente (404), ou erro de compilação após o Step 4.

- [ ] **Step 3: Implementar `apps/server/src/bd/consultasBusca.ts`**

```ts
import sql from 'mssql';
import type { ConnectionPool } from 'mssql';
import type { FiltrosBusca, Funcionario } from '@dbos/shared';

// Busca funcionários com filtros opcionais. Tudo parametrizado (@p) — cru e seguro.
export async function buscarFuncionarios(
  pool: ConnectionPool,
  filtros: FiltrosBusca,
): Promise<Funcionario[]> {
  const req = pool.request();
  const condicoes: string[] = [];

  if (filtros.nome) {
    req.input('nome', sql.NVarChar, `%${filtros.nome}%`);
    condicoes.push('f.nome LIKE @nome');
  }
  if (filtros.departamentoId !== undefined) {
    req.input('dep', sql.Int, filtros.departamentoId);
    condicoes.push('f.departamentoId = @dep');
  }
  if (filtros.salarioOp && filtros.salario !== undefined) {
    req.input('sal', sql.Decimal(10, 2), filtros.salario);
    if (filtros.salarioOp === 'gt') condicoes.push('f.salario > @sal');
    else if (filtros.salarioOp === 'lt') condicoes.push('f.salario < @sal');
    else if (filtros.salarioOp === 'eq') condicoes.push('f.salario = @sal');
    else if (filtros.salarioOp === 'entre' && filtros.salario2 !== undefined) {
      req.input('sal2', sql.Decimal(10, 2), filtros.salario2);
      condicoes.push('f.salario BETWEEN @sal AND @sal2');
    }
  }
  if (filtros.projetoId !== undefined) {
    req.input('proj', sql.Int, filtros.projetoId);
    condicoes.push(
      'EXISTS (SELECT 1 FROM dbo.FuncionariosProjetos fp WHERE fp.funcionarioId = f.id AND fp.projetoId = @proj)',
    );
  }
  if (filtros.relacionadoA !== undefined) {
    req.input('rel', sql.Int, filtros.relacionadoA);
    condicoes.push(`f.id <> @rel AND (
      f.departamentoId = (SELECT departamentoId FROM dbo.Funcionarios WHERE id = @rel)
      OR EXISTS (
        SELECT 1 FROM dbo.FuncionariosProjetos a
        JOIN dbo.FuncionariosProjetos b ON b.projetoId = a.projetoId
        WHERE a.funcionarioId = @rel AND b.funcionarioId = f.id
      )
    )`);
  }

  const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const resultado = await req.query<Funcionario>(`
    SELECT f.id, f.nome, f.cargo, f.salario, f.dataAdmissao, f.departamentoId,
           d.nome AS departamento
    FROM dbo.Funcionarios f
    JOIN dbo.Departamentos d ON d.id = f.departamentoId
    ${onde}
    ORDER BY f.nome
  `);
  return resultado.recordset;
}
```

- [ ] **Step 4: Implementar `apps/server/src/rotas/busca.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { esquemaBusca, type RespostaBusca } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { buscarFuncionarios } from '../bd/consultasBusca';

export function registrarRotasBusca(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/busca/funcionarios', { preHandler: autenticar }, async (req, reply) => {
    const analise = esquemaBusca.safeParse(req.query);
    if (!analise.success) {
      return reply.status(400).send({
        ok: false,
        erro: { tipo: 'validacao', mensagem: 'Filtros inválidos.', detalhe: analise.error.issues[0]?.message },
      });
    }
    const dados = await buscarFuncionarios(req.sessao!.pool, analise.data);
    const resposta: RespostaBusca = { ok: true, dados };
    return resposta;
  });
}
```

- [ ] **Step 5: Registrar no contexto autenticado em `apps/server/src/app.ts`**

Import no topo:

```ts
import { registrarRotasBusca } from './rotas/busca';
```

Dentro do `app.register(async (instancia) => { ... })`, após `registrarRotasPropriedades(instancia, gerenciador);`:

```ts
    registrarRotasBusca(instancia, gerenciador);
```

- [ ] **Step 6: Rodar a integração e confirmar que passa**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/busca.test.ts`
Expected: PASS — 4 testes. (Requer `bun run db:setup` já executado.)

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/bd/consultasBusca.ts apps/server/src/rotas/busca.ts apps/server/src/rotas/busca.test.ts apps/server/src/app.ts
git commit -m "feat(server): busca de funcionários (filtros parametrizados) ponta a ponta"
```

---

### Task 3: Servidor — grafo de relacionamentos + integração real (TDD)

**Files:**
- Create: `apps/server/src/bd/consultasRelacionamentos.ts`
- Create: `apps/server/src/rotas/relacionamentos.ts`
- Modify: `apps/server/src/app.ts`
- Test: `apps/server/src/rotas/relacionamentos.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/server/src/rotas/relacionamentos.test.ts`**

```ts
import { test, expect } from 'bun:test';
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

test('sem cookie devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/relacionamentos?tipo=funcionario&id=1`);
    expect(r.status).toBe(401);
  });
});

test('grafo do Felipe (1): centro + departamento + projetos + folha', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/relacionamentos?tipo=funcionario&id=1`, { headers: { cookie } });
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    expect(dados.centro).toBe('funcionario:1');
    const tipos = dados.nos.map((n: { tipo: string }) => n.tipo);
    expect(tipos).toContain('departamento');
    expect(tipos).toContain('projeto');
    // Felipe está em 2 projetos (DBOS, Intranet)
    const projetos = dados.nos.filter((n: { tipo: string }) => n.tipo === 'projeto');
    expect(projetos.length).toBe(2);
    // toda aresta parte do centro
    expect(dados.arestas.every((a: { de: string }) => a.de === 'funcionario:1')).toBe(true);
  });
});

test('parâmetros inválidos devolvem 400', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/relacionamentos?tipo=pessoa&id=1`, { headers: { cookie } });
    expect(r.status).toBe(400);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/relacionamentos.test.ts`
Expected: FAIL — rota inexistente / compilação após o Step 4.

- [ ] **Step 3: Implementar `apps/server/src/bd/consultasRelacionamentos.ts`**

```ts
import sql from 'mssql';
import type { ConnectionPool } from 'mssql';
import type { GrafoRelacionamentos, NoGrafo, ArestaGrafo, RefRelacionamento } from '@dbos/shared';

function comId(pool: ConnectionPool, id: number) {
  return pool.request().input('id', sql.Int, id);
}

// Monta o grafo de uma entidade: nó central + nós relacionados + arestas a partir do centro.
export async function montarGrafo(
  pool: ConnectionPool,
  ref: RefRelacionamento,
): Promise<GrafoRelacionamentos | null> {
  const centro = `${ref.tipo}:${ref.id}`;
  const nos: NoGrafo[] = [];
  const arestas: ArestaGrafo[] = [];
  const ligar = (no: NoGrafo, rotulo?: string) => {
    nos.push(no);
    arestas.push({ de: centro, para: no.id, rotulo });
  };

  if (ref.tipo === 'funcionario') {
    const f = (await comId(pool, ref.id).query<{ nome: string; departamentoId: number; departamento: string }>(`
      SELECT f.nome, f.departamentoId, d.nome AS departamento
      FROM dbo.Funcionarios f JOIN dbo.Departamentos d ON d.id = f.departamentoId
      WHERE f.id = @id
    `)).recordset[0];
    if (!f) return null;
    nos.push({ id: centro, tipo: 'funcionario', rotulo: f.nome });
    ligar({ id: `departamento:${f.departamentoId}`, tipo: 'departamento', rotulo: f.departamento }, 'departamento');

    const projetos = (await comId(pool, ref.id).query<{ id: number; nome: string }>(`
      SELECT p.id, p.nome FROM dbo.Projetos p
      JOIN dbo.FuncionariosProjetos fp ON fp.projetoId = p.id
      WHERE fp.funcionarioId = @id ORDER BY p.nome
    `)).recordset;
    for (const p of projetos) ligar({ id: `projeto:${p.id}`, tipo: 'projeto', rotulo: p.nome }, 'projeto');

    const folha = (await comId(pool, ref.id).query<{ competencia: string }>(`
      SELECT competencia FROM dbo.FolhaPagamento WHERE funcionarioId = @id ORDER BY competencia DESC
    `)).recordset;
    for (const fp of folha) {
      ligar({ id: `folha:${ref.id}:${fp.competencia}`, tipo: 'folha', rotulo: `Folha ${fp.competencia}` }, 'folha');
    }
  } else if (ref.tipo === 'departamento') {
    const d = (await comId(pool, ref.id).query<{ nome: string }>(
      `SELECT nome FROM dbo.Departamentos WHERE id = @id`,
    )).recordset[0];
    if (!d) return null;
    nos.push({ id: centro, tipo: 'departamento', rotulo: d.nome });
    const funcs = (await comId(pool, ref.id).query<{ id: number; nome: string }>(
      `SELECT id, nome FROM dbo.Funcionarios WHERE departamentoId = @id ORDER BY nome`,
    )).recordset;
    for (const f of funcs) ligar({ id: `funcionario:${f.id}`, tipo: 'funcionario', rotulo: f.nome });
  } else {
    // projeto
    const p = (await comId(pool, ref.id).query<{ nome: string }>(
      `SELECT nome FROM dbo.Projetos WHERE id = @id`,
    )).recordset[0];
    if (!p) return null;
    nos.push({ id: centro, tipo: 'projeto', rotulo: p.nome });
    const membros = (await comId(pool, ref.id).query<{ id: number; nome: string; papel: string | null }>(`
      SELECT f.id, f.nome, fp.papel FROM dbo.Funcionarios f
      JOIN dbo.FuncionariosProjetos fp ON fp.funcionarioId = f.id
      WHERE fp.projetoId = @id ORDER BY f.nome
    `)).recordset;
    for (const m of membros) ligar({ id: `funcionario:${m.id}`, tipo: 'funcionario', rotulo: m.nome }, m.papel ?? undefined);
  }

  return { centro, nos, arestas };
}
```

- [ ] **Step 4: Implementar `apps/server/src/rotas/relacionamentos.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { esquemaRefRelacionamento, type RespostaRelacionamentos } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { montarGrafo } from '../bd/consultasRelacionamentos';

export function registrarRotasRelacionamentos(
  app: FastifyInstance,
  gerenciador: GerenciadorPools,
): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/relacionamentos', { preHandler: autenticar }, async (req, reply) => {
    const analise = esquemaRefRelacionamento.safeParse(req.query);
    if (!analise.success) {
      return reply.status(400).send({
        ok: false,
        erro: { tipo: 'validacao', mensagem: 'Informe tipo e id válidos.', detalhe: analise.error.issues[0]?.message },
      });
    }
    const grafo = await montarGrafo(req.sessao!.pool, analise.data);
    if (!grafo) {
      return reply.status(404).send({ ok: false, erro: { tipo: 'validacao', mensagem: 'Objeto não encontrado.' } });
    }
    const resposta: RespostaRelacionamentos = { ok: true, dados: grafo };
    return resposta;
  });
}
```

- [ ] **Step 5: Registrar no contexto autenticado em `apps/server/src/app.ts`**

Import no topo:

```ts
import { registrarRotasRelacionamentos } from './rotas/relacionamentos';
```

Dentro do `app.register(...)`, após `registrarRotasBusca(instancia, gerenciador);`:

```ts
    registrarRotasRelacionamentos(instancia, gerenciador);
```

- [ ] **Step 6: Rodar a integração e confirmar que passa**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/relacionamentos.test.ts`
Expected: PASS — 3 testes.

- [ ] **Step 7: Confirmar a suíte inteira do servidor**

Run: `bun --filter @dbos/server test`
Expected: PASS — tudo (fases anteriores rodando contra `DBOS_RH`, que existe) + busca (4) + relacionamentos (3).

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/bd/consultasRelacionamentos.ts apps/server/src/rotas/relacionamentos.ts apps/server/src/rotas/relacionamentos.test.ts apps/server/src/app.ts
git commit -m "feat(server): grafo de relacionamentos ponta a ponta"
```

---

### Task 4: Verificação completa + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Documentar a fundação RH no `README.md`**

Na seção de requisitos/como rodar, acrescente a configuração do banco logo após `cp .env.example .env`:

```markdown
bun run db:setup            # cria e semeia o banco DBOS_RH no SQL Server
```

E uma linha explicando: o sistema agora opera sobre o banco **DBOS_RH** (RH/folha):
Departamentos, Funcionarios, Projetos, FolhaPagamento + as views `vw_FolhaResumo`
e `vw_AnomaliasFolha`. Configure `SQL_BANCO=DBOS_RH` no `.env`.

- [ ] **Step 2: Rodar a suíte inteira do monorepo**

Run: `bun run test`
Expected: tudo verde — `@dbos/shared` (+ busca/relacionamentos zod), `@dbos/server` (+ busca 4 + relacionamentos 3), `@dbos/web` (inalterado). Pré-requisito: `bun run db:setup` já executado. Falhas SÓ por conexão SQL = ambiente.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README — fundação RH (DBOS_RH + db:setup)"
```

---

## Self-Review

**Spec coverage (Plano 1 / spec §2–4, §10.1):**
- Banco `DBOS_RH` dedicado, idempotente, com 5 tabelas + N:N + 2 views + seed determinístico (spec §2) → Task 0. ✓
- `bun run db:setup` + `SQL_BANCO=DBOS_RH` (spec §2) → Task 0. ✓
- FKs com `ON DELETE CASCADE` nos dependentes (spec §2.1, §12) → Task 0 (`FuncionariosProjetos`, `FolhaPagamento`). ✓
- Contratos `Funcionario`/`FiltrosBusca`/`GrafoRelacionamentos` (spec §4) → Task 1. ✓
- Rotas Busca e Relacionamentos parametrizadas (spec §3) → Tasks 2–3. ✓
- Testes determinísticos sobre o seed (spec §9) → busca (salário/depto/relacionadoA), relacionamentos (grafo do Felipe). ✓

**Placeholder scan:** Sem TBD/TODO; todo passo tem conteúdo completo.

**Type consistency:** `FiltrosBusca`/`esquemaBusca`/`ResultadoBusca` (Task 1) usados em `consultasBusca`/`rotas/busca` (Task 2). `RefRelacionamento`/`GrafoRelacionamentos`/`NoGrafo`/`ArestaGrafo` (Task 1) usados em `consultasRelacionamentos`/`rotas/relacionamentos` (Task 3). `Funcionario` (dominio) devolvido por `buscarFuncionarios` e usado pela Busca no Plano 3. Ambas as rotas no contexto do cookie em `app.ts`. ✓

**Riscos/observações:**
- Toda a suíte passa a exigir `bun run db:setup` (o `DBOS_RH` precisa existir). Os testes das Fases 1–6 criam/derrubam tabelas temporárias no banco conectado (`DBOS_RH`) e seguem passando.
- O seed usa IDENTITY_INSERT para fixar IDs (Felipe = 1) → asserções determinísticas; rodar `db:setup` de novo recria tudo (idempotente).
- `montarGrafo` devolve `null` para id inexistente → rota responde 404 `validacao`.
- O caminho relativo do `.sql` em `configurarBanco.ts` deve resolver para a raiz do repo; o passo orienta ajustar `../` se necessário.
- O nó `folha` usa id composto (`folha:<func>:<competencia>`) para ser único por competência.
