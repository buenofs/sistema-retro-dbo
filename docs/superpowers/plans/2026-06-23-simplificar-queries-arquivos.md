# Simplificar queries do sistema de arquivos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir as CTEs recursivas do sistema de arquivos por laços em TypeScript, deixando todo o SQL no caminho da demonstração em nível iniciante e nomeado.

**Architecture:** Uma nova unidade pura `arvore.ts` percorre a árvore de itens em memória (sem SQL). As funções de banco em `consultasArquivos.ts` passam a ler os itens com um `SELECT` simples e delegar a lógica de subárvore/ciclo a essa unidade. As views recursivas e o código morto da árvore são removidos.

**Tech Stack:** TypeScript, Bun (`bun:test`), Fastify, mssql, SQL Server.

**Spec:** `docs/superpowers/specs/2026-06-23-simplificar-queries-arquivos-design.md`

---

## Estrutura de arquivos

- **Criar:** `apps/server/src/bd/arvore.ts` — lógica pura de árvore (`subarvore`, `criaCiclo`).
- **Criar:** `apps/server/src/bd/arvore.test.ts` — testes unitários da lógica pura.
- **Modificar:** `apps/server/src/bd/consultasArquivos.ts` — usar a lógica pura + SQL de um nível; remover `arvoreDoDrive`.
- **Modificar:** `apps/server/src/rotas/arquivos.ts` — remover rota e import mortos.
- **Modificar:** `apps/web/src/aplicativos/arquivos/ganchos.ts` — remover hook `useArvore`.
- **Modificar:** `packages/shared/src/arquivos.ts` — remover tipo `ItemArvore`.
- **Modificar:** `db/dbos_sistema.sql` — remover a view recursiva `vw_ArvoreItens`.
- **Remover:** `apps/server/src/bd/copiaArvore.ts` e `apps/server/src/bd/copiaArvore.test.ts` — substituídos por `arvore.ts`.

---

## Task 1: Lógica pura de árvore (`arvore.ts`)

**Files:**
- Create: `apps/server/src/bd/arvore.ts`
- Test: `apps/server/src/bd/arvore.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/server/src/bd/arvore.test.ts`:

```ts
import { test, expect } from 'bun:test';
import { subarvore, criaCiclo, type NoArvore } from './arvore';

const itens: NoArvore[] = [
  { id: 1, paiId: null }, // raiz A
  { id: 2, paiId: 1 },    // filho de 1
  { id: 3, paiId: 2 },    // neto (filho de 2)
  { id: 4, paiId: 1 },    // filho de 1
  { id: 5, paiId: null }, // raiz B (não relacionada)
];

test('subarvore inclui a raiz e todos os descendentes', () => {
  expect(subarvore(itens, 1).map((n) => n.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
});

test('subarvore retorna pais antes dos filhos (ordem de largura)', () => {
  const ids = subarvore(itens, 1).map((n) => n.id);
  expect(ids.indexOf(1)).toBeLessThan(ids.indexOf(2));
  expect(ids.indexOf(2)).toBeLessThan(ids.indexOf(3));
});

test('subarvore de folha é só ela mesma', () => {
  expect(subarvore(itens, 3).map((n) => n.id)).toEqual([3]);
});

test('subarvore de id inexistente é vazia', () => {
  expect(subarvore(itens, 99)).toEqual([]);
});

test('criaCiclo: destino null nunca cria ciclo', () => {
  expect(criaCiclo(itens, 1, null)).toBe(false);
});

test('criaCiclo: mover para dentro de si mesmo', () => {
  expect(criaCiclo(itens, 1, 1)).toBe(true);
});

test('criaCiclo: mover para dentro de um descendente', () => {
  expect(criaCiclo(itens, 1, 3)).toBe(true);
});

test('criaCiclo: mover para um ramo não relacionado é permitido', () => {
  expect(criaCiclo(itens, 2, 5)).toBe(false);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `bun test apps/server/src/bd/arvore.test.ts`
Expected: FAIL — `Cannot find module './arvore'`.

- [ ] **Step 3: Implementar a lógica pura**

Criar `apps/server/src/bd/arvore.ts`:

```ts
// Lógica de árvore em memória — sem SQL. Percorre itens pela ligação paiId.
export interface NoArvore {
  id: number;
  paiId: number | null;
}

// Subárvore de `raizId`, incluindo a própria raiz, em ordem de largura
// (pais sempre antes dos filhos — útil para reinserir ao copiar).
export function subarvore<T extends NoArvore>(itens: T[], raizId: number): T[] {
  const filhosPorPai = new Map<number, T[]>();
  for (const it of itens) {
    if (it.paiId === null) continue;
    const lista = filhosPorPai.get(it.paiId) ?? [];
    lista.push(it);
    filhosPorPai.set(it.paiId, lista);
  }
  const raiz = itens.find((i) => i.id === raizId);
  if (!raiz) return [];
  const resultado: T[] = [raiz];
  const fila: T[] = [raiz];
  while (fila.length > 0) {
    const atual = fila.shift()!;
    for (const filho of filhosPorPai.get(atual.id) ?? []) {
      resultado.push(filho);
      fila.push(filho);
    }
  }
  return resultado;
}

// Mover/copiar `id` para dentro de `destino` cria ciclo?
// Sim se o destino é o próprio item ou um descendente dele.
export function criaCiclo(itens: NoArvore[], id: number, destino: number | null): boolean {
  if (destino === null) return false;
  if (destino === id) return true;
  return subarvore(itens, id).some((no) => no.id === destino);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `bun test apps/server/src/bd/arvore.test.ts`
Expected: PASS — 8 testes verdes.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/bd/arvore.ts apps/server/src/bd/arvore.test.ts
git commit -m "feat(server): logica pura de arvore (subarvore + ciclo) sem SQL recursivo"
```

---

## Task 2: Reescrever `consultasArquivos.ts` usando a lógica pura

**Files:**
- Modify: `apps/server/src/bd/consultasArquivos.ts`
- Modify: `apps/server/src/rotas/arquivos.ts`

Substitui as 3 CTEs recursivas (`criaCiclo`, `marcarLixeira`, `copiar`) por `SELECT` de um nível + a lógica pura da Task 1, e remove `arvoreDoDrive` **junto com seu único consumidor** (a rota `/arvore`), para o servidor seguir compilando.

- [ ] **Step 1: Trocar os imports do topo**

Em `apps/server/src/bd/consultasArquivos.ts`, trocar a linha:

```ts
import { ordemDeInsercao, type NoCopia } from './copiaArvore';
```

por:

```ts
import { subarvore, criaCiclo } from './arvore';
```

E remover `ItemArvore` do import de tipos (linha 2). O import passa a ser:

```ts
import type { Drive, Item, UsoDrive } from '@dbos/shared';
```

- [ ] **Step 2: Remover a função morta `arvoreDoDrive`**

Apagar o bloco inteiro (atual linhas 37-44):

```ts
export async function arvoreDoDrive(pool: ConnectionPool, reg: RegistradorSQL, driveId: number): Promise<ItemArvore[]> {
  const r = await reg.executar<ItemArvore>(
    pool,
    'SELECT id, nome, tipo, paiId, driveId, caminho, profundidade FROM dbo.vw_ArvoreItens WHERE driveId = @drive AND naLixeira = 0 ORDER BY caminho',
    { drive: driveId },
  );
  return r as unknown as ItemArvore[];
}
```

- [ ] **Step 3: Adicionar o helper de leitura da árvore**

Logo acima da função `criaCiclo` atual, adicionar:

```ts
// Lê (id, paiId) de todos os itens — base para percorrer a árvore em memória.
async function lerArvore(pool: ConnectionPool, reg: RegistradorSQL): Promise<{ id: number; paiId: number | null }[]> {
  const r = await reg.executar<{ id: number; paiId: number | null }>(pool, 'SELECT id, paiId FROM dbo.Itens');
  return r as unknown as { id: number; paiId: number | null }[];
}
```

- [ ] **Step 4: Remover a `criaCiclo` recursiva local**

Apagar o bloco inteiro (atual linhas 97-107), incluindo o comentário acima dele:

```ts
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
```

(A `criaCiclo` agora vem do import — pura, sobre os itens já carregados.)

- [ ] **Step 5: Reescrever `mover`**

Substituir a função `mover` por:

```ts
export async function mover(pool: ConnectionPool, reg: RegistradorSQL, id: number, paiId: number | null): Promise<void> {
  const itens = await lerArvore(pool, reg);
  if (criaCiclo(itens, id, paiId)) throw new Error('MovimentoCiclico');
  await validarPai(pool, reg, paiId);
  await reg.executar(pool, 'UPDATE dbo.Itens SET paiId = @pai, modificadoEm = SYSDATETIME() WHERE id = @id', { pai: paiId, id });
}
```

- [ ] **Step 6: Reescrever `marcarLixeira`**

Substituir a função `marcarLixeira` (e manter o comentário explicativo acima dela) por:

```ts
// Soft-delete (=1) ou restauração (=0) da subárvore inteira. A subárvore é
// coletada em memória (subarvore) e marcada com um único UPDATE ... WHERE id IN (...).
async function marcarLixeira(pool: ConnectionPool, reg: RegistradorSQL, id: number, valor: 0 | 1): Promise<void> {
  const itens = await lerArvore(pool, reg);
  const ids = subarvore(itens, id).map((n) => n.id);
  if (ids.length === 0) return;
  const lugares = ids.map((_, k) => `@i${k}`).join(', ');
  const params: Record<string, unknown> = { valor };
  ids.forEach((v, k) => { params[`i${k}`] = v; });
  await reg.executar(pool, `UPDATE dbo.Itens SET naLixeira = @valor WHERE id IN (${lugares})`, params);
}
```

- [ ] **Step 7: Reescrever `copiar`**

Substituir a função `copiar` por (sem CTE; usa `subarvore` para ordenar pais antes dos filhos):

```ts
// Copia um item (e a subárvore, se pasta) para dentro de `destino`.
export async function copiar(pool: ConnectionPool, reg: RegistradorSQL, id: number, destino: number | null, donoId: number): Promise<void> {
  const itens = await lerArvore(pool, reg);
  if (criaCiclo(itens, id, destino)) throw new Error('MovimentoCiclico');
  await validarPai(pool, reg, destino);

  // Ids da subárvore, já em ordem de pais-antes-dos-filhos.
  const idsSub = subarvore(itens, id).map((n) => n.id);
  const lugares = idsSub.map((_, k) => `@i${k}`).join(', ');
  const paramsSub: Record<string, unknown> = {};
  idsSub.forEach((v, k) => { paramsSub[`i${k}`] = v; });

  const linhas = (await reg.executar<{ id: number; paiId: number | null; nome: string; tipo: 'pasta' | 'arquivo'; conteudo: string | null; driveId: number }>(
    pool,
    `SELECT id, paiId, nome, tipo, conteudo, driveId FROM dbo.Itens WHERE id IN (${lugares})`,
    paramsSub,
  )) as unknown as { id: number; paiId: number | null; nome: string; tipo: 'pasta' | 'arquivo'; conteudo: string | null; driveId: number }[];

  // Reordena os dados completos conforme a ordem da subárvore.
  const porId = new Map(linhas.map((l) => [l.id, l]));
  const nos = idsSub.map((i) => porId.get(i)!);

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

- [ ] **Step 8: Remover a rota `/arvore` e seu import (mesmo commit)**

Em `apps/server/src/rotas/arquivos.ts`, remover `arvoreDoDrive` da lista de imports (linha 10). O import passa a ser:

```ts
import {
  listarDrives, usoPorDrive, listarConteudo, listarLixeira, lerItem,
  criarItem, renomear, salvarConteudo, mover, enviarParaLixeira, restaurar,
  esvaziarLixeira, copiar,
} from '../bd/consultasArquivos';
```

E apagar o handler da rota inteiro (atual linhas 69-75):

```ts
  app.get('/api/arquivos/arvore', { preHandler: autenticar }, async (req, reply) => {
    const driveId = Number((req.query as { driveId?: string }).driveId);
    if (!Number.isInteger(driveId) || driveId <= 0) return erroValidacao(reply, 'driveId inválido.');
    const reg = new RegistradorSQL('Árvore do drive');
    const dados = await arvoreDoDrive(req.sessao!.pool, reg, driveId);
    return { ok: true, dados: { dados, sql: reg.comandos } };
  });
```

- [ ] **Step 9: Checar tipos do servidor**

Run: `bunx tsc --noEmit -p apps/server/tsconfig.json`
Expected: sem erros. (O web segue compilando: `useArvore`/`ItemArvore` ainda existem — saem na Task 3.)

- [ ] **Step 10: Commit**

```bash
git add apps/server/src/bd/consultasArquivos.ts apps/server/src/rotas/arquivos.ts
git commit -m "refactor(server): arvore via TypeScript no lugar de CTE recursiva"
```

---

## Task 3: Remover código morto da árvore

**Files:**
- Modify: `apps/web/src/aplicativos/arquivos/ganchos.ts`
- Modify: `packages/shared/src/arquivos.ts`
- Remove: `apps/server/src/bd/copiaArvore.ts`
- Remove: `apps/server/src/bd/copiaArvore.test.ts`

(A rota `/arvore` e seu import já saíram na Task 2.)

- [ ] **Step 1: Remover o hook `useArvore`**

Em `apps/web/src/aplicativos/arquivos/ganchos.ts`, apagar o bloco (atual linhas 40-45):

```ts
export function useArvore(driveId: number) {
  return useQuery({
    queryKey: ['arquivos', 'arvore', driveId],
    queryFn: () => pegar<ItemArvore[]>(`/api/arquivos/arvore?driveId=${driveId}`).then((e) => e.dados),
  });
}
```

E remover `ItemArvore` do import de tipos (linha 2). Passa a ser:

```ts
import type { ComandoSQL, Drive, Item, UsoDrive } from '@dbos/shared';
```

- [ ] **Step 2: Remover o tipo `ItemArvore`**

Em `packages/shared/src/arquivos.ts`, apagar a interface (atual linhas 26-34):

```ts
export interface ItemArvore {
  id: number;
  nome: string;
  tipo: TipoItem;
  paiId: number | null;
  driveId: number;
  caminho: string;
  profundidade: number;
}
```

- [ ] **Step 3: Apagar os arquivos `copiaArvore`**

```bash
git rm apps/server/src/bd/copiaArvore.ts apps/server/src/bd/copiaArvore.test.ts
```

- [ ] **Step 4: Checar tipos (server e web)**

Run:
```bash
bunx tsc --noEmit -p apps/server/tsconfig.json
bunx tsc --noEmit -p apps/web/tsconfig.json
```
Expected: sem erros em ambos (nenhuma referência a `arvoreDoDrive`, `useArvore`, `ItemArvore` ou `copiaArvore` resta).

- [ ] **Step 5: Rodar a suíte de testes do servidor (lógica pura)**

Run: `bun test apps/server/src/bd/arvore.test.ts`
Expected: PASS — 8 testes. (O `copiaArvore.test.ts` removido não aparece mais.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remover codigo morto da arvore (rota, hook, tipo, copiaArvore)"
```

---

## Task 4: Remover a view recursiva do schema

**Files:**
- Modify: `db/dbos_sistema.sql`

- [ ] **Step 1: Remover o `CREATE VIEW dbo.vw_ArvoreItens`**

Apagar o bloco da view recursiva (atual linhas 56-74), do comentário até o `GO`:

```sql
-- Caminho completo + profundidade via CTE recursiva.
CREATE VIEW dbo.vw_ArvoreItens AS
WITH arvore AS (
  SELECT i.id, i.nome, i.tipo, i.paiId, i.driveId, i.donoId, i.naLixeira,
         CAST(d.letra + ':\' + i.nome AS NVARCHAR(4000)) AS caminho,
         0 AS profundidade
  FROM dbo.Itens i
  JOIN dbo.Drives d ON d.id = i.driveId
  WHERE i.paiId IS NULL AND i.naLixeira = 0
  UNION ALL
  SELECT f.id, f.nome, f.tipo, f.paiId, f.driveId, f.donoId, f.naLixeira,
         CAST(a.caminho + '\' + f.nome AS NVARCHAR(4000)),
         a.profundidade + 1
  FROM dbo.Itens f
  JOIN arvore a ON f.paiId = a.id WHERE f.naLixeira = 0
)
SELECT id, nome, tipo, paiId, driveId, donoId, naLixeira, caminho, profundidade
FROM arvore;
GO
```

**Manter** a linha 11 (o `DROP VIEW dbo.vw_ArvoreItens`): ela garante que um banco já existente perca a view antiga ao re-rodar o script.

- [ ] **Step 2: Recriar o banco e conferir**

Run: `bun run db:setup`
Expected: `DBOS_SISTEMA configurado com sucesso (N lotes).` — sem erro de "view depende de objeto" e sem a `vw_ArvoreItens` recriada. As views simples (`vw_Lixeira`, `vw_UsoPorDrive`, `vw_UsoPorUsuario`) continuam existindo.

- [ ] **Step 3: Commit**

```bash
git add db/dbos_sistema.sql
git commit -m "chore(db): remover view recursiva vw_ArvoreItens"
```

---

## Task 5: Verificação ponta a ponta

**Files:** nenhum (verificação).

- [ ] **Step 1: Rodar toda a suíte de testes**

Run: `bun run test`
Expected: todos os pacotes verdes. (Os testes de banco exigem o SQL Server no ar via `.env`.)

- [ ] **Step 2: Verificação manual no app (roteiro de banca)**

Subir `bun run dev:server` e `bun run dev:web`, abrir o Explorador de Arquivos e, com o Monitor de SQL aberto, confirmar que cada ação gera SQL chapada e explicável:

1. **Criar 3 itens** (pasta + 2 arquivos) → 3× `INSERT INTO dbo.Itens (...)`.
2. **Renomear 1 item** → `UPDATE dbo.Itens SET nome=@nome ... WHERE id=@id`.
3. **Mover uma pasta para dentro de outra** → `SELECT id, paiId FROM dbo.Itens` + `UPDATE ... SET paiId=@pai ...` (sem `WITH`).
4. **Copiar/colar uma pasta com filhos** → `SELECT id, paiId ...` + `SELECT ... WHERE id IN (...)` + `INSERT`s nível a nível.
5. **Tentar mover uma pasta para dentro de si mesma** → mensagem "Não é possível mover/copiar uma pasta para dentro dela mesma." (ciclo detectado no TS).
6. **Apagar (lixeira) e esvaziar** → `UPDATE ... SET naLixeira=1 WHERE id IN (...)` e depois `DELETE FROM dbo.Itens WHERE naLixeira = 1`.
7. **Exibir via view** → abrir a Lixeira (`vw_Lixeira`) ou o uso por drive (`vw_UsoPorDrive`).

Confirmar que **nenhum** comando no Monitor contém `WITH ... UNION ALL` (CTE recursiva).

- [ ] **Step 3: Commit (se houver ajuste)**

Se algum ajuste foi necessário na verificação, commitar; caso contrário, nada a fazer.

---

## Notas

- **`tipoDoTexto` em `registradorSQL.ts`** continua tratando `WITH` (e seus testes seguem válidos) — não geramos mais esse SQL, mas a função permanece robusta. Sem mudança.
- **Fora do escopo (intocado):** coluna computada `tamanhoBytes`, índice filtrado `UQ_Itens_local`, grade genérica (`citarId`), Propriedades (`sys.*`) e paginação `OFFSET/FETCH`.
