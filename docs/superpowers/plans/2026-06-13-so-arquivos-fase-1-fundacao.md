# SO de Arquivos — Fase 1: Fundação (schema + backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o domínio RH por um sistema de arquivos modelado em SQL (tabelas `Drives`/`Usuarios`/`Itens` + 4 views) e expor uma API `/api/arquivos/*` que mapeia ações de SO para INSERT/UPDATE/DELETE/SELECT, capturando o SQL executado para o futuro Monitor.

**Architecture:** Lista de adjacência: `Itens` com auto-FK `paiId`. As funções em `consultasArquivos.ts` recebem um `RegistradorSQL` que executa as queries parametrizadas e grava o texto/params/linhas de cada comando; a rota devolve esse log no campo `sql` do envelope `Resposta`. Segue os padrões existentes (rotas Fastify com `preHandler: autenticar`, módulos `consultas*.ts`, contratos Zod em `@dbos/shared`).

**Tech Stack:** Bun, Fastify, mssql (SQL Server), Zod, `bun:test`.

---

## File Structure

- Create: `db/dbos_sistema.sql` — schema + views + seed (substitui `dbos_rh.sql`).
- Modify: `apps/server/src/scripts/configurarBanco.ts` — aponta para o novo arquivo.
- Create: `packages/shared/src/arquivos.ts` — tipos + schemas Zod + `ComandoSQL`.
- Modify: `packages/shared/src/index.ts` — exporta `arquivos`, remove módulos RH.
- Create: `apps/server/src/bd/registradorSQL.ts` — captura de SQL.
- Create: `apps/server/src/bd/copiaArvore.ts` — helper puro de ordenação p/ cópia.
- Create: `apps/server/src/bd/consultasArquivos.ts` — as queries do filesystem.
- Create: `apps/server/src/rotas/arquivos.ts` — rotas Fastify.
- Modify: `apps/server/src/app.ts` — registra `arquivos` (mantém as rotas RH por ora).

> **Ordem de dependências:** a remoção do domínio RH (backend, shared e web) é **adiada para a Fase 4**, quando nada mais o referencia. Nesta fase apenas *adicionamos* a fundação de arquivos; tudo continua compilando. O banco já passa a ser `DBOS_SISTEMA` (as rotas RH ficam no código mas apontam para tabelas que não existem mais — não são chamadas pelo fluxo novo).

---

## Task 1: Branch da fase

**Files:** nenhum (git).

- [ ] **Step 1: Criar a branch**

```bash
git checkout -b feat/so-arquivos
```

- [ ] **Step 2: Confirmar a branch**

Run: `git branch --show-current`
Expected: `feat/so-arquivos`

---

## Task 2: Schema novo do banco

**Files:**
- Create: `db/dbos_sistema.sql`
- Modify: `apps/server/src/scripts/configurarBanco.ts`

- [ ] **Step 1: Escrever `db/dbos_sistema.sql`**

```sql
-- DBOS_SISTEMA — sistema de arquivos sobre banco. Idempotente (dropa e recria).
IF DB_ID('DBOS_SISTEMA') IS NULL CREATE DATABASE DBOS_SISTEMA;
GO
USE DBOS_SISTEMA;
GO

-- Dropar na ordem de dependência (idempotência).
IF OBJECT_ID('dbo.vw_Lixeira','V') IS NOT NULL DROP VIEW dbo.vw_Lixeira;
IF OBJECT_ID('dbo.vw_UsoPorDrive','V') IS NOT NULL DROP VIEW dbo.vw_UsoPorDrive;
IF OBJECT_ID('dbo.vw_UsoPorUsuario','V') IS NOT NULL DROP VIEW dbo.vw_UsoPorUsuario;
IF OBJECT_ID('dbo.vw_ArvoreItens','V') IS NOT NULL DROP VIEW dbo.vw_ArvoreItens;
IF OBJECT_ID('dbo.Itens','U') IS NOT NULL DROP TABLE dbo.Itens;
IF OBJECT_ID('dbo.Usuarios','U') IS NOT NULL DROP TABLE dbo.Usuarios;
IF OBJECT_ID('dbo.Drives','U') IS NOT NULL DROP TABLE dbo.Drives;
GO

CREATE TABLE dbo.Drives (
  id INT IDENTITY(1,1) PRIMARY KEY,
  letra CHAR(1) NOT NULL CONSTRAINT UQ_Drives_letra UNIQUE,
  rotulo NVARCHAR(50) NOT NULL,
  capacidadeBytes BIGINT NOT NULL
);

CREATE TABLE dbo.Usuarios (
  id INT IDENTITY(1,1) PRIMARY KEY,
  login NVARCHAR(50) NOT NULL CONSTRAINT UQ_Usuarios_login UNIQUE,
  nome NVARCHAR(100) NOT NULL
);

CREATE TABLE dbo.Itens (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nome NVARCHAR(255) NOT NULL,
  tipo VARCHAR(10) NOT NULL
    CONSTRAINT CK_Itens_tipo CHECK (tipo IN ('pasta','arquivo')),
  paiId INT NULL
    CONSTRAINT FK_Itens_pai REFERENCES dbo.Itens(id),
  driveId INT NOT NULL
    CONSTRAINT FK_Itens_drive REFERENCES dbo.Drives(id),
  donoId INT NOT NULL
    CONSTRAINT FK_Itens_dono REFERENCES dbo.Usuarios(id),
  conteudo NVARCHAR(MAX) NULL,
  tamanhoBytes AS (DATALENGTH(conteudo)),
  criadoEm DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  modificadoEm DATETIME2 NULL,
  naLixeira BIT NOT NULL DEFAULT 0
);
GO

-- Nome único dentro da mesma pasta, só entre itens vivos (índice filtrado).
-- driveId entra na chave para distinguir raízes (paiId NULL) de drives diferentes.
CREATE UNIQUE INDEX UQ_Itens_local ON dbo.Itens(driveId, paiId, nome) WHERE naLixeira = 0;
CREATE INDEX IX_Itens_paiId ON dbo.Itens(paiId);
CREATE INDEX IX_Itens_driveId ON dbo.Itens(driveId);
GO

-- Caminho completo + profundidade via CTE recursiva.
CREATE VIEW dbo.vw_ArvoreItens AS
WITH arvore AS (
  SELECT i.id, i.nome, i.tipo, i.paiId, i.driveId, i.donoId, i.naLixeira,
         CAST(d.letra + ':\' + i.nome AS NVARCHAR(4000)) AS caminho,
         0 AS profundidade
  FROM dbo.Itens i
  JOIN dbo.Drives d ON d.id = i.driveId
  WHERE i.paiId IS NULL
  UNION ALL
  SELECT f.id, f.nome, f.tipo, f.paiId, f.driveId, f.donoId, f.naLixeira,
         CAST(a.caminho + '\' + f.nome AS NVARCHAR(4000)),
         a.profundidade + 1
  FROM dbo.Itens f
  JOIN arvore a ON f.paiId = a.id
)
SELECT id, nome, tipo, paiId, driveId, donoId, naLixeira, caminho, profundidade
FROM arvore;
GO

CREATE VIEW dbo.vw_UsoPorUsuario AS
  SELECT u.id AS usuarioId, u.nome AS usuario,
         COUNT(i.id) AS itens,
         ISNULL(SUM(CAST(i.tamanhoBytes AS BIGINT)), 0) AS bytes
  FROM dbo.Usuarios u
  LEFT JOIN dbo.Itens i ON i.donoId = u.id AND i.naLixeira = 0
  GROUP BY u.id, u.nome;
GO

CREATE VIEW dbo.vw_UsoPorDrive AS
  SELECT d.id AS driveId, d.letra, d.rotulo, d.capacidadeBytes,
         ISNULL(SUM(CAST(i.tamanhoBytes AS BIGINT)), 0) AS usadoBytes,
         d.capacidadeBytes - ISNULL(SUM(CAST(i.tamanhoBytes AS BIGINT)), 0) AS livreBytes
  FROM dbo.Drives d
  LEFT JOIN dbo.Itens i ON i.driveId = d.id AND i.naLixeira = 0
  GROUP BY d.id, d.letra, d.rotulo, d.capacidadeBytes;
GO

CREATE VIEW dbo.vw_Lixeira AS
  SELECT i.id, i.nome, i.tipo, i.paiId, i.driveId, i.donoId,
         CAST(i.tamanhoBytes AS BIGINT) AS tamanhoBytes, i.modificadoEm
  FROM dbo.Itens i
  WHERE i.naLixeira = 1;
GO

-- Seed determinístico.
SET IDENTITY_INSERT dbo.Drives ON;
INSERT INTO dbo.Drives (id, letra, rotulo, capacidadeBytes) VALUES
  (1, 'C', 'Sistema', 549755813888),
  (2, 'D', 'Dados',  1099511627776);
SET IDENTITY_INSERT dbo.Drives OFF;

SET IDENTITY_INSERT dbo.Usuarios ON;
INSERT INTO dbo.Usuarios (id, login, nome) VALUES
  (1, 'felipe',  'Felipe Bueno'),
  (2, 'ana',     'Ana Souza'),
  (3, 'sistema', 'Sistema');
SET IDENTITY_INSERT dbo.Usuarios OFF;

SET IDENTITY_INSERT dbo.Itens ON;
INSERT INTO dbo.Itens (id, nome, tipo, paiId, driveId, donoId, conteudo) VALUES
  (1, 'Windows',     'pasta',   NULL, 1, 3, NULL),
  (2, 'Usuarios',    'pasta',   NULL, 1, 3, NULL),
  (3, 'Felipe',      'pasta',   2,    1, 1, NULL),
  (4, 'Documentos',  'pasta',   3,    1, 1, NULL),
  (5, 'leiame.txt',  'arquivo', 4,    1, 1, N'Bem-vindo ao DBOS.'),
  (6, 'notas.txt',   'arquivo', 4,    1, 1, N'Comprar pao.'),
  (7, 'System32',    'pasta',   1,    1, 3, NULL),
  (8, 'config.sys',  'arquivo', 1,    1, 3, N'REM config'),
  (9, 'Backup',      'pasta',   NULL, 2, 1, NULL);
SET IDENTITY_INSERT dbo.Itens OFF;
GO
```

- [ ] **Step 2: Apontar o script de setup para o novo arquivo**

Em `apps/server/src/scripts/configurarBanco.ts`, trocar o caminho e a mensagem:

```typescript
// Executa db/dbos_sistema.sql em lotes separados por 'GO'. Conecta no 'master'
// (o banco DBOS_SISTEMA pode ainda não existir) e o próprio script faz USE.
const caminho = new URL('../../../../db/dbos_sistema.sql', import.meta.url);
```

e a linha do console:

```typescript
  console.log(`DBOS_SISTEMA configurado com sucesso (${lotes.length} lotes).`);
```

- [ ] **Step 3: Atualizar `.env`**

No arquivo `.env` da raiz, garantir `SQL_BANCO=DBOS_SISTEMA` (a sessão dos usuários conecta nesse banco). Se a variável não existir, adicioná-la.

- [ ] **Step 4: Rodar o setup contra o SQL Server local**

Run: `bun db:setup`
Expected: `DBOS_SISTEMA configurado com sucesso (N lotes).`

- [ ] **Step 5: Verificar a árvore via view**

Run (no seu cliente SQL, ou `bun db:setup` já validou a criação):
```sql
SELECT caminho, tipo, profundidade FROM DBOS_SISTEMA.dbo.vw_ArvoreItens ORDER BY caminho;
```
Expected: linhas como `C:\Usuarios\Felipe\Documentos\leiame.txt`, profundidade crescente.

- [ ] **Step 6: Commit**

```bash
git add db/dbos_sistema.sql apps/server/src/scripts/configurarBanco.ts
git commit -m "feat(db): schema do sistema de arquivos (Itens/Usuarios/Drives + 4 views)"
```

---

## Task 3: Contratos compartilhados (`arquivos.ts`)

**Files:**
- Create: `packages/shared/src/arquivos.ts`
- Create (test): `packages/shared/src/arquivos.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Escrever o teste dos schemas Zod**

`packages/shared/src/arquivos.test.ts`:

```typescript
import { test, expect } from 'bun:test';
import {
  esquemaCriarPasta,
  esquemaCriarArquivo,
  esquemaRenomear,
  esquemaMover,
  esquemaConteudo,
  esquemaCopiar,
} from './arquivos';

test('criarPasta exige nome e paiId nulo ou número', () => {
  expect(esquemaCriarPasta.safeParse({ nome: 'Docs', paiId: null, driveId: 1 }).success).toBe(true);
  expect(esquemaCriarPasta.safeParse({ nome: 'Docs', paiId: 3, driveId: 1 }).success).toBe(true);
  expect(esquemaCriarPasta.safeParse({ nome: '', paiId: null, driveId: 1 }).success).toBe(false);
});

test('criarArquivo aceita conteudo opcional default vazio', () => {
  const r = esquemaCriarArquivo.safeParse({ nome: 'a.txt', paiId: 4, driveId: 1 });
  expect(r.success).toBe(true);
  if (r.success) expect(r.data.conteudo).toBe('');
});

test('renomear exige novo nome', () => {
  expect(esquemaRenomear.safeParse({ nome: 'novo.txt' }).success).toBe(true);
  expect(esquemaRenomear.safeParse({ nome: '' }).success).toBe(false);
});

test('mover aceita destino nulo (raiz) ou número', () => {
  expect(esquemaMover.safeParse({ paiId: null }).success).toBe(true);
  expect(esquemaMover.safeParse({ paiId: 9 }).success).toBe(true);
});

test('conteudo aceita string', () => {
  expect(esquemaConteudo.safeParse({ conteudo: 'oi' }).success).toBe(true);
});

test('copiar exige destino', () => {
  expect(esquemaCopiar.safeParse({ paiId: null }).success).toBe(true);
  expect(esquemaCopiar.safeParse({}).success).toBe(false);
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `bun --filter @dbos/shared test`
Expected: FAIL (módulo `./arquivos` não existe).

- [ ] **Step 3: Escrever `packages/shared/src/arquivos.ts`**

```typescript
import { z } from 'zod';
import type { Resposta } from './respostas';

// ---- Modelos de leitura ----
export type TipoItem = 'pasta' | 'arquivo';

export interface Item {
  id: number;
  nome: string;
  tipo: TipoItem;
  paiId: number | null;
  driveId: number;
  donoId: number;
  tamanhoBytes: number | null;
  criadoEm: string;
  modificadoEm: string | null;
}

export interface Drive {
  id: number;
  letra: string;
  rotulo: string;
  capacidadeBytes: number;
}

export interface ItemArvore {
  id: number;
  nome: string;
  tipo: TipoItem;
  paiId: number | null;
  driveId: number;
  caminho: string;
  profundidade: number;
}

export interface UsoDrive {
  driveId: number;
  letra: string;
  rotulo: string;
  capacidadeBytes: number;
  usadoBytes: number;
  livreBytes: number;
}

// ---- Log de SQL (compartilhado com o Monitor da Fase 4) ----
export type TipoComando = 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';

export interface ComandoSQL {
  acao: string;
  tipo: TipoComando;
  texto: string;
  parametros: Record<string, unknown>;
  linhasAfetadas: number;
  erro?: string;
  em: string; // ISO
}

// Envelope de mutação: dados + o SQL que rodou.
export type RespostaArquivos<T> = Resposta<{ dados: T; sql: ComandoSQL[] }>;

// ---- Schemas de entrada (Zod) ----
const nome = z.string().min(1).max(255);
const paiOpcional = z.number().int().positive().nullable();

export const esquemaCriarPasta = z.object({
  nome,
  paiId: paiOpcional,
  driveId: z.number().int().positive(),
});
export type CriarPasta = z.infer<typeof esquemaCriarPasta>;

export const esquemaCriarArquivo = z.object({
  nome,
  paiId: paiOpcional,
  driveId: z.number().int().positive(),
  conteudo: z.string().default(''),
});
export type CriarArquivo = z.infer<typeof esquemaCriarArquivo>;

export const esquemaRenomear = z.object({ nome });
export type Renomear = z.infer<typeof esquemaRenomear>;

export const esquemaMover = z.object({ paiId: paiOpcional });
export type Mover = z.infer<typeof esquemaMover>;

export const esquemaConteudo = z.object({ conteudo: z.string() });
export type Conteudo = z.infer<typeof esquemaConteudo>;

export const esquemaCopiar = z.object({ paiId: paiOpcional });
export type Copiar = z.infer<typeof esquemaCopiar>;

export const esquemaListar = z.object({
  driveId: z.coerce.number().int().positive(),
  paiId: z.coerce.number().int().positive().optional(), // ausente = raiz do drive
});
export type Listar = z.infer<typeof esquemaListar>;
```

- [ ] **Step 4: Exportar `arquivos` em `index.ts` (mantendo os módulos RH)**

Adicionar a linha de export ao final de `packages/shared/src/index.ts`, sem remover nada (a remoção do RH é da Fase 4):

```typescript
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
export * from './folha';
export * from './arquivos';
```

- [ ] **Step 5: Rodar os testes do shared**

Run: `bun --filter @dbos/shared test`
Expected: PASS (novos testes de `arquivos` + os testes RH existentes continuam passando).

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/arquivos.ts packages/shared/src/arquivos.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): contratos do sistema de arquivos + ComandoSQL"
```

---

## Task 4: RegistradorSQL

**Files:**
- Create: `apps/server/src/bd/registradorSQL.ts`
- Create (test): `apps/server/src/bd/registradorSQL.test.ts`

- [ ] **Step 1: Escrever o teste da função pura `tipoDoTexto`**

`apps/server/src/bd/registradorSQL.test.ts`:

```typescript
import { test, expect } from 'bun:test';
import { tipoDoTexto } from './registradorSQL';

test('classifica o comando pela primeira palavra-chave', () => {
  expect(tipoDoTexto('  INSERT INTO x ...')).toBe('INSERT');
  expect(tipoDoTexto('UPDATE dbo.Itens SET ...')).toBe('UPDATE');
  expect(tipoDoTexto('DELETE FROM dbo.Itens ...')).toBe('DELETE');
  expect(tipoDoTexto('WITH sub AS (...) SELECT ...')).toBe('SELECT');
  expect(tipoDoTexto('WITH sub AS (...) UPDATE dbo.Itens ...')).toBe('UPDATE');
  expect(tipoDoTexto('SELECT * FROM x')).toBe('SELECT');
});
```

- [ ] **Step 2: Rodar para falhar**

Run: `bun --filter @dbos/server test`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `registradorSQL.ts`**

```typescript
import type { ConnectionPool, IRecordSet } from 'mssql';
import type { ComandoSQL, TipoComando } from '@dbos/shared';

// Classifica o SQL pela primeira palavra-chave de comando (ignora CTE `WITH`).
export function tipoDoTexto(texto: string): TipoComando {
  const t = texto.trim().toUpperCase();
  const corpo = t.startsWith('WITH') ? t.slice(t.indexOf(')') + 1) : t;
  if (/\bINSERT\b/.test(corpo)) return 'INSERT';
  if (/\bUPDATE\b/.test(corpo)) return 'UPDATE';
  if (/\bDELETE\b/.test(corpo)) return 'DELETE';
  return 'SELECT';
}

// Executa queries parametrizadas e registra cada comando (texto, params, linhas).
// A rota devolve `comandos` no campo `sql` da resposta — alimenta o Monitor.
export class RegistradorSQL {
  readonly comandos: ComandoSQL[] = [];
  constructor(private readonly acao: string) {}

  async executar<T = Record<string, unknown>>(
    pool: ConnectionPool,
    texto: string,
    parametros: Record<string, unknown> = {},
  ): Promise<IRecordSet<T>> {
    const req = pool.request();
    for (const [k, v] of Object.entries(parametros)) req.input(k, v);
    const em = new Date().toISOString();
    try {
      const r = await req.query<T>(texto);
      const linhasAfetadas = (r.rowsAffected ?? []).reduce((a, b) => a + b, 0);
      this.comandos.push({ acao: this.acao, tipo: tipoDoTexto(texto), texto, parametros, linhasAfetadas, em });
      return r.recordset;
    } catch (e) {
      this.comandos.push({
        acao: this.acao,
        tipo: tipoDoTexto(texto),
        texto,
        parametros,
        linhasAfetadas: 0,
        erro: e instanceof Error ? e.message : String(e),
        em,
      });
      throw e;
    }
  }
}
```

- [ ] **Step 4: Rodar para passar**

Run: `bun --filter @dbos/server test`
Expected: PASS no `registradorSQL.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/bd/registradorSQL.ts apps/server/src/bd/registradorSQL.test.ts
git commit -m "feat(server): RegistradorSQL captura comandos para o Monitor"
```

---

## Task 5: Helper puro de cópia de subárvore

**Files:**
- Create: `apps/server/src/bd/copiaArvore.ts`
- Create (test): `apps/server/src/bd/copiaArvore.test.ts`

- [ ] **Step 1: Escrever o teste**

`apps/server/src/bd/copiaArvore.test.ts`:

```typescript
import { test, expect } from 'bun:test';
import { ordemDeInsercao, type NoCopia } from './copiaArvore';

test('ordena pais antes dos filhos (profundidade asc)', () => {
  const nos: NoCopia[] = [
    { id: 5, paiId: 4, profundidade: 2 },
    { id: 1, paiId: null, profundidade: 0 },
    { id: 4, paiId: 1, profundidade: 1 },
  ];
  expect(ordemDeInsercao(nos).map((n) => n.id)).toEqual([1, 4, 5]);
});

test('é estável para mesma profundidade', () => {
  const nos: NoCopia[] = [
    { id: 2, paiId: 1, profundidade: 1 },
    { id: 3, paiId: 1, profundidade: 1 },
  ];
  expect(ordemDeInsercao(nos).map((n) => n.id)).toEqual([2, 3]);
});
```

- [ ] **Step 2: Rodar para falhar**

Run: `bun --filter @dbos/server test`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `copiaArvore.ts`**

```typescript
// Nós de uma subárvore a copiar. A ordenação garante que o pai já foi inserido
// (e teve seu novo id mapeado) antes de cada filho.
export interface NoCopia {
  id: number;
  paiId: number | null;
  profundidade: number;
}

export function ordemDeInsercao<T extends NoCopia>(nos: T[]): T[] {
  return [...nos].sort((a, b) => a.profundidade - b.profundidade);
}
```

- [ ] **Step 4: Rodar para passar**

Run: `bun --filter @dbos/server test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/bd/copiaArvore.ts apps/server/src/bd/copiaArvore.test.ts
git commit -m "feat(server): helper de ordenação para cópia de subárvore"
```

---

## Task 6: Camada de queries (`consultasArquivos.ts`)

**Files:**
- Create: `apps/server/src/bd/consultasArquivos.ts`

Sem testes unitários (toca o banco; validado no roteiro manual da Task 9). Mantém todo SQL parametrizado e nomes de objeto fixos.

- [ ] **Step 1: Implementar `consultasArquivos.ts`**

```typescript
import type { ConnectionPool } from 'mssql';
import type { Drive, Item, ItemArvore, UsoDrive } from '@dbos/shared';
import { RegistradorSQL } from './registradorSQL';
import { ordemDeInsercao, type NoCopia } from './copiaArvore';

const SEL_ITEM =
  'id, nome, tipo, paiId, driveId, donoId, CAST(tamanhoBytes AS BIGINT) AS tamanhoBytes, ' +
  "CONVERT(varchar(33), criadoEm, 126) AS criadoEm, CONVERT(varchar(33), modificadoEm, 126) AS modificadoEm";

export async function listarDrives(pool: ConnectionPool, reg: RegistradorSQL): Promise<Drive[]> {
  const r = await reg.executar<Drive>(pool, 'SELECT id, letra, rotulo, capacidadeBytes FROM dbo.Drives ORDER BY letra');
  return r as unknown as Drive[];
}

export async function usoPorDrive(pool: ConnectionPool, reg: RegistradorSQL): Promise<UsoDrive[]> {
  const r = await reg.executar<UsoDrive>(pool, 'SELECT driveId, letra, rotulo, capacidadeBytes, usadoBytes, livreBytes FROM dbo.vw_UsoPorDrive ORDER BY letra');
  return r as unknown as UsoDrive[];
}

export async function listarConteudo(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  driveId: number,
  paiId: number | null,
): Promise<Item[]> {
  const filtroPai = paiId === null ? 'paiId IS NULL' : 'paiId = @pai';
  const params: Record<string, unknown> = { drive: driveId };
  if (paiId !== null) params.pai = paiId;
  const r = await reg.executar<Item>(
    pool,
    `SELECT ${SEL_ITEM} FROM dbo.Itens WHERE driveId = @drive AND ${filtroPai} AND naLixeira = 0 ORDER BY CASE tipo WHEN 'pasta' THEN 0 ELSE 1 END, nome`,
    params,
  );
  return r as unknown as Item[];
}

export async function arvoreDoDrive(pool: ConnectionPool, reg: RegistradorSQL, driveId: number): Promise<ItemArvore[]> {
  const r = await reg.executar<ItemArvore>(
    pool,
    'SELECT id, nome, tipo, paiId, driveId, caminho, profundidade FROM dbo.vw_ArvoreItens WHERE driveId = @drive AND naLixeira = 0 ORDER BY caminho',
    { drive: driveId },
  );
  return r as unknown as ItemArvore[];
}

export async function listarLixeira(pool: ConnectionPool, reg: RegistradorSQL): Promise<Item[]> {
  const r = await reg.executar<Item>(
    pool,
    'SELECT id, nome, tipo, paiId, driveId, donoId, tamanhoBytes, NULL AS criadoEm, CONVERT(varchar(33), modificadoEm, 126) AS modificadoEm FROM dbo.vw_Lixeira ORDER BY nome',
  );
  return r as unknown as Item[];
}

// Lança Error('PaiInvalido') se paiId não existir ou não for pasta.
async function validarPai(pool: ConnectionPool, reg: RegistradorSQL, paiId: number | null): Promise<void> {
  if (paiId === null) return;
  const r = await reg.executar<{ tipo: string }>(pool, 'SELECT tipo FROM dbo.Itens WHERE id = @pai', { pai: paiId });
  const tipo = (r as unknown as { tipo: string }[])[0]?.tipo;
  if (tipo !== 'pasta') throw new Error('PaiInvalido');
}

export async function criarItem(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  entrada: { nome: string; tipo: 'pasta' | 'arquivo'; paiId: number | null; driveId: number; donoId: number; conteudo: string | null },
): Promise<number> {
  await validarPai(pool, reg, entrada.paiId);
  const r = await reg.executar<{ id: number }>(
    pool,
    'INSERT INTO dbo.Itens (nome, tipo, paiId, driveId, donoId, conteudo) OUTPUT INSERTED.id VALUES (@nome, @tipo, @pai, @drive, @dono, @conteudo)',
    { nome: entrada.nome, tipo: entrada.tipo, pai: entrada.paiId, drive: entrada.driveId, dono: entrada.donoId, conteudo: entrada.conteudo },
  );
  return (r as unknown as { id: number }[])[0]!.id;
}

export async function renomear(pool: ConnectionPool, reg: RegistradorSQL, id: number, nome: string): Promise<void> {
  await reg.executar(pool, 'UPDATE dbo.Itens SET nome = @nome, modificadoEm = SYSDATETIME() WHERE id = @id', { nome, id });
}

export async function salvarConteudo(pool: ConnectionPool, reg: RegistradorSQL, id: number, conteudo: string): Promise<void> {
  await reg.executar(pool, 'UPDATE dbo.Itens SET conteudo = @conteudo, modificadoEm = SYSDATETIME() WHERE id = @id', { conteudo, id });
}

// Retorna true se `destino` está dentro da subárvore de `id` (ou é o próprio id).
async function criaCiclo(pool: ConnectionPool, reg: RegistradorSQL, id: number, destino: number | null): Promise<boolean> {
  if (destino === null) return false;
  if (destino === id) return true;
  const r = await reg.executar<{ ciclo: number }>(
    pool,
    'WITH sub AS (SELECT id FROM dbo.Itens WHERE id = @id UNION ALL SELECT i.id FROM dbo.Itens i JOIN sub ON i.paiId = sub.id) SELECT CASE WHEN @destino IN (SELECT id FROM sub) THEN 1 ELSE 0 END AS ciclo',
    { id, destino },
  );
  return (r as unknown as { ciclo: number }[])[0]?.ciclo === 1;
}

export async function mover(pool: ConnectionPool, reg: RegistradorSQL, id: number, paiId: number | null): Promise<void> {
  if (await criaCiclo(pool, reg, id, paiId)) throw new Error('MovimentoCiclico');
  await validarPai(pool, reg, paiId);
  await reg.executar(pool, 'UPDATE dbo.Itens SET paiId = @pai, modificadoEm = SYSDATETIME() WHERE id = @id', { pai: paiId, id });
}

// Soft-delete (=1) ou restauração (=0) da subárvore inteira.
async function marcarLixeira(pool: ConnectionPool, reg: RegistradorSQL, id: number, valor: 0 | 1): Promise<void> {
  await reg.executar(
    pool,
    'WITH sub AS (SELECT id FROM dbo.Itens WHERE id = @id UNION ALL SELECT i.id FROM dbo.Itens i JOIN sub ON i.paiId = sub.id) UPDATE dbo.Itens SET naLixeira = @valor WHERE id IN (SELECT id FROM sub)',
    { id, valor },
  );
}

export const enviarParaLixeira = (pool: ConnectionPool, reg: RegistradorSQL, id: number) => marcarLixeira(pool, reg, id, 1);
export const restaurar = (pool: ConnectionPool, reg: RegistradorSQL, id: number) => marcarLixeira(pool, reg, id, 0);

export async function esvaziarLixeira(pool: ConnectionPool, reg: RegistradorSQL): Promise<void> {
  await reg.executar(pool, 'DELETE FROM dbo.Itens WHERE naLixeira = 1', {});
}

// Copia um item (e a subárvore, se pasta) para dentro de `destino`.
export async function copiar(pool: ConnectionPool, reg: RegistradorSQL, id: number, destino: number | null, donoId: number): Promise<void> {
  if (await criaCiclo(pool, reg, id, destino)) throw new Error('MovimentoCiclico');
  await validarPai(pool, reg, destino);

  const subR = await reg.executar<NoCopia & { nome: string; tipo: 'pasta' | 'arquivo'; conteudo: string | null; driveId: number }>(
    pool,
    'WITH sub AS (SELECT id, paiId, 0 AS profundidade FROM dbo.Itens WHERE id = @id UNION ALL SELECT i.id, i.paiId, s.profundidade + 1 FROM dbo.Itens i JOIN sub s ON i.paiId = s.id) ' +
      'SELECT i.id, i.paiId, s.profundidade, i.nome, i.tipo, i.conteudo, i.driveId FROM dbo.Itens i JOIN sub s ON s.id = i.id',
    { id },
  );
  const nos = ordemDeInsercao(subR as unknown as (NoCopia & { nome: string; tipo: 'pasta' | 'arquivo'; conteudo: string | null; driveId: number })[]);
  const driveDestino = destino === null
    ? nos[0]!.driveId
    : ((await reg.executar<{ driveId: number }>(pool, 'SELECT driveId FROM dbo.Itens WHERE id = @d', { d: destino })) as unknown as { driveId: number }[])[0]!.driveId;

  const mapa = new Map<number, number>(); // idAntigo -> idNovo
  for (const no of nos) {
    const ehRaiz = no.id === id;
    const novoPai = ehRaiz ? destino : mapa.get(no.paiId!)!;
    const r = await reg.executar<{ id: number }>(
      pool,
      'INSERT INTO dbo.Itens (nome, tipo, paiId, driveId, donoId, conteudo) OUTPUT INSERTED.id VALUES (@nome, @tipo, @pai, @drive, @dono, @conteudo)',
      { nome: no.nome, tipo: no.tipo, pai: novoPai, drive: driveDestino, dono: donoId, conteudo: no.conteudo },
    );
    mapa.set(no.id, (r as unknown as { id: number }[])[0]!.id);
  }
}
```

- [ ] **Step 2: Conferir a compilação**

Run: `bun --filter @dbos/server test`
Expected: PASS (sem testes novos aqui, mas o arquivo precisa compilar para os demais testes rodarem).

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/bd/consultasArquivos.ts
git commit -m "feat(server): queries do sistema de arquivos (CRUD + recursivas)"
```

---

## Task 7: Rotas `/api/arquivos` + registro no `app.ts`

**Files:**
- Create: `apps/server/src/rotas/arquivos.ts`
- Modify: `apps/server/src/app.ts`

(As rotas RH permanecem registradas; sua remoção é da Fase 4.)

- [ ] **Step 1: Implementar `rotas/arquivos.ts`**

```typescript
import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  esquemaCriarPasta, esquemaCriarArquivo, esquemaRenomear, esquemaMover,
  esquemaConteudo, esquemaCopiar, esquemaListar,
} from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { RegistradorSQL } from '../bd/registradorSQL';
import {
  listarDrives, usoPorDrive, listarConteudo, arvoreDoDrive, listarLixeira,
  criarItem, renomear, salvarConteudo, mover, enviarParaLixeira, restaurar,
  esvaziarLixeira, copiar,
} from '../bd/consultasArquivos';

// Dono padrão: 1 (felipe). Numa evolução, viria do mapa login->usuario.
const DONO_PADRAO = 1;

function erroValidacao(reply: FastifyReply, mensagem: string, status = 400) {
  return reply.status(status).send({ ok: false, erro: { tipo: 'validacao', mensagem } });
}

// Traduz erros de domínio e violações de constraint em mensagens amigáveis.
function tratar(reply: FastifyReply, e: unknown, reg: RegistradorSQL) {
  const msg = e instanceof Error ? e.message : String(e);
  const mapa: Record<string, string> = {
    PaiInvalido: 'A pasta de destino não existe ou não é uma pasta.',
    MovimentoCiclico: 'Não é possível mover/copiar uma pasta para dentro dela mesma.',
  };
  if (mapa[msg]) return reply.status(400).send({ ok: false, erro: { tipo: 'validacao', mensagem: mapa[msg] }, sql: reg.comandos });
  if (/UQ_Itens_local|duplicate key/i.test(msg)) {
    return reply.status(400).send({ ok: false, erro: { tipo: 'validacao', mensagem: 'Já existe um item com esse nome nesta pasta.' }, sql: reg.comandos });
  }
  return reply.status(400).send({ ok: false, erro: { tipo: 'sql', mensagem: 'O banco recusou o comando.', detalhe: msg }, sql: reg.comandos });
}

export function registrarRotasArquivos(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/arquivos/drives', { preHandler: autenticar }, async (req) => {
    const reg = new RegistradorSQL('Listar drives');
    const dados = await listarDrives(req.sessao!.pool, reg);
    return { ok: true, dados: { dados, sql: reg.comandos } };
  });

  app.get('/api/arquivos/uso', { preHandler: autenticar }, async (req) => {
    const reg = new RegistradorSQL('Uso por drive');
    const dados = await usoPorDrive(req.sessao!.pool, reg);
    return { ok: true, dados: { dados, sql: reg.comandos } };
  });

  app.get('/api/arquivos/listar', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaListar.safeParse(req.query);
    if (!a.success) return erroValidacao(reply, 'Parâmetros inválidos.');
    const reg = new RegistradorSQL('Listar pasta');
    const dados = await listarConteudo(req.sessao!.pool, reg, a.data.driveId, a.data.paiId ?? null);
    return { ok: true, dados: { dados, sql: reg.comandos } };
  });

  app.get('/api/arquivos/arvore', { preHandler: autenticar }, async (req, reply) => {
    const driveId = Number((req.query as { driveId?: string }).driveId);
    if (!Number.isInteger(driveId) || driveId <= 0) return erroValidacao(reply, 'driveId inválido.');
    const reg = new RegistradorSQL('Árvore do drive');
    const dados = await arvoreDoDrive(req.sessao!.pool, reg, driveId);
    return { ok: true, dados: { dados, sql: reg.comandos } };
  });

  app.get('/api/arquivos/lixeira', { preHandler: autenticar }, async (req) => {
    const reg = new RegistradorSQL('Listar lixeira');
    const dados = await listarLixeira(req.sessao!.pool, reg);
    return { ok: true, dados: { dados, sql: reg.comandos } };
  });

  app.post('/api/arquivos/pasta', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaCriarPasta.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados inválidos.');
    const reg = new RegistradorSQL('Criar pasta');
    try {
      const id = await criarItem(req.sessao!.pool, reg, { ...a.data, tipo: 'pasta', donoId: DONO_PADRAO, conteudo: null });
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.post('/api/arquivos/arquivo', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaCriarArquivo.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados inválidos.');
    const reg = new RegistradorSQL('Criar arquivo');
    try {
      const id = await criarItem(req.sessao!.pool, reg, { nome: a.data.nome, paiId: a.data.paiId, driveId: a.data.driveId, tipo: 'arquivo', donoId: DONO_PADRAO, conteudo: a.data.conteudo });
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.put('/api/arquivos/:id/renomear', { preHandler: autenticar }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const a = esquemaRenomear.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Nome inválido.');
    const reg = new RegistradorSQL('Renomear');
    try {
      await renomear(req.sessao!.pool, reg, id, a.data.nome);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.put('/api/arquivos/:id/mover', { preHandler: autenticar }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const a = esquemaMover.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Destino inválido.');
    const reg = new RegistradorSQL('Mover');
    try {
      await mover(req.sessao!.pool, reg, id, a.data.paiId);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.put('/api/arquivos/:id/conteudo', { preHandler: autenticar }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const a = esquemaConteudo.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Conteúdo inválido.');
    const reg = new RegistradorSQL('Salvar conteúdo');
    try {
      await salvarConteudo(req.sessao!.pool, reg, id, a.data.conteudo);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.post('/api/arquivos/:id/copiar', { preHandler: autenticar }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const a = esquemaCopiar.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Destino inválido.');
    const reg = new RegistradorSQL('Copiar');
    try {
      await copiar(req.sessao!.pool, reg, id, a.data.paiId, DONO_PADRAO);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.delete('/api/arquivos/:id', { preHandler: autenticar }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const reg = new RegistradorSQL('Apagar (lixeira)');
    try {
      await enviarParaLixeira(req.sessao!.pool, reg, id);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.put('/api/arquivos/:id/restaurar', { preHandler: autenticar }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const reg = new RegistradorSQL('Restaurar');
    try {
      await restaurar(req.sessao!.pool, reg, id);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.delete('/api/arquivos/lixeira', { preHandler: autenticar }, async (req, reply) => {
    const reg = new RegistradorSQL('Esvaziar lixeira');
    try {
      await esvaziarLixeira(req.sessao!.pool, reg);
      return { ok: true, dados: { dados: {}, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });
}
```

Nota de rota: registrar `DELETE /api/arquivos/lixeira` **antes** de `DELETE /api/arquivos/:id` não é necessário no Fastify (o roteiro de rota estática tem prioridade sobre a paramétrica), mas mantê-las distintas evita ambiguidade.

- [ ] **Step 2: Registrar no `app.ts` (mantendo as rotas RH)**

Em `apps/server/src/app.ts`, adicionar o import de `registrarRotasArquivos` e a chamada dentro do `app.register`, **sem remover** as demais. Import:

```typescript
import { registrarRotasArquivos } from './rotas/arquivos';
```

Adicionar ao bloco de registro (após `registrarRotasDominio`):

```typescript
    registrarRotasArquivos(instancia, gerenciador);
```

- [ ] **Step 3: Rodar os testes de shared e server**

Run: `bun --filter @dbos/shared test && bun --filter @dbos/server test`
Expected: PASS.

- [ ] **Step 4: Subir o servidor e fumaça manual**

Run: `bun dev:server` (em outro terminal) e então:
```bash
curl -i -c /tmp/c.txt -X POST localhost:3001/api/auth/login -H 'content-type: application/json' -d '{"login":"sa","senha":"<SUA_SENHA>"}'
curl -s -b /tmp/c.txt 'localhost:3001/api/arquivos/listar?driveId=1' | head -c 400
```
Expected: JSON `{"ok":true,"dados":{"dados":[...],"sql":[{"acao":"Listar pasta","tipo":"SELECT",...}]}}`.

(O caminho de login real pode ser `/api/autenticacao/...`; ajuste conforme `rotas/autenticacao.ts`.)

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/rotas/arquivos.ts apps/server/src/app.ts
git commit -m "feat(server): rotas /api/arquivos com captura de SQL"
```

---

## Task 8: Verificação fim-a-fim (roteiro manual) e fechamento da fase

**Files:** nenhum (validação).

- [ ] **Step 1: Roteiro de SQL via API (com o servidor no ar e cookie em `/tmp/c.txt`)**

```bash
# Criar pasta na raiz do C:
curl -s -b /tmp/c.txt -X POST localhost:3001/api/arquivos/pasta -H 'content-type: application/json' -d '{"nome":"Projetos","paiId":null,"driveId":1}'
# Criar arquivo dentro dela (use o id retornado acima como paiId)
curl -s -b /tmp/c.txt -X POST localhost:3001/api/arquivos/arquivo -H 'content-type: application/json' -d '{"nome":"plano.txt","paiId":<ID>,"driveId":1,"conteudo":"linha 1"}'
# Renomear, mover para a lixeira, restaurar, esvaziar — repetir o padrão.
```
Expected: cada resposta traz `sql` com o comando correto (INSERT/UPDATE/DELETE) e `linhasAfetadas >= 1`.

- [ ] **Step 2: Provar a constraint (nome duplicado)**

Repetir o INSERT de `Projetos` na raiz do C:.
Expected: `{"ok":false,"erro":{"tipo":"validacao","mensagem":"Já existe um item com esse nome nesta pasta."}}` e `sql` com o comando marcado com `erro`.

- [ ] **Step 3: Atualizar o índice de planos**

Confirmar que este arquivo está em `docs/superpowers/plans/` e seguir para a Fase 2.

- [ ] **Step 4: Commit final da fase (se houver ajustes)**

```bash
git add -A && git commit -m "chore: fecha Fase 1 (fundação do SO de arquivos)" || echo "nada a commitar"
```

---

## Self-Review (preenchido)

- **Cobertura da spec (Seções 1 e 4):** schema (Task 2), contratos (Task 3), registrador (Task 4), queries incl. recursivas/cópia (Tasks 5–6), rotas + erros amigáveis (Task 7), validação manual (Task 8). A remoção do RH é da Fase 4 (ordem de dependências). ✔
- **Sem placeholders:** todo step com código traz o código completo. ✔
- **Consistência de tipos:** `ComandoSQL`/`RespostaArquivos` definidos em `arquivos.ts` e usados por `registradorSQL.ts` e rotas; `RegistradorSQL.executar` é a única porta de execução. As rotas devolvem `{ ok, dados: { dados, sql } }` de forma uniforme. ✔
- **Pendência consciente:** o front (Fases 2–4) consumirá `resposta.dados.dados` + `resposta.dados.sql`; manter esse formato ao escrever os ganchos.
