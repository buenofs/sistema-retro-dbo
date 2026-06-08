# DBOS — Fase 6: Propriedades de Objetos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o app Propriedades de Objetos — clicar com o **botão direito** num objeto do Explorador abre um menu de contexto; "Propriedades" abre uma janela com os metadados do objeto (tipo, contagem de colunas/linhas, datas, **índices**) lidos por **consultas de catálogo** (`sys.*` / `INFORMATION_SCHEMA`). Inclui o sistema genérico de **menu de contexto** (a "camada de portal" da spec §4.3).

**Architecture:** O menu de contexto é uma loja Zustand (`useMenuContexto`) + um portal `<MenuContexto>` montado uma vez no desktop (igual ao padrão de `useDialogos`, Fase 4). O Explorador (`NoTabela`) ganha `onContextMenu` que abre o menu com "Propriedades" e "Abrir na grade", ambos chamando `abrirJanela(tipoApp, { esquema, tabela })` do WM. O app Propriedades lê `janela.dados` e busca `GET /api/propriedades?esquema=&tabela=` (read via `useQuery`, spec §6.2). No servidor, `obterPropriedades` roda **SQL cru parametrizado** (`@esquema`/`@tabela`) contra `sys.objects`, `sys.partitions`, `sys.indexes`, `sys.index_columns` e `INFORMATION_SCHEMA.COLUMNS` (spec §2.2, §5.5) e monta o objeto de propriedades.

**Tech Stack:** Backend: Fastify 4, `mssql`/Tedious, zod, `bun:test` (integração real). Frontend: React 18, TanStack Query, Zustand, 98.css, Vitest + RTL. pt-BR no que autoramos; SQL cru, sem ORM.

**Builds on Phases 0–5:**
- `@dbos/shared`: `Resposta<T>`, `TipoObjeto`, `esquemaRefObjeto`/`RefObjeto` (`explorador.ts`).
- `apps/server`: `criarAutenticar` + `req.sessao!.pool`; `listarColunas` (catálogo); rotas no contexto do cookie em `app.ts`; harness `comServidor`.
- `apps/web`: `requisitar<T>`; WM em `areaTrabalho/` (`useLoja.abrirJanela(tipo, dados)`, `registroApps` com `propriedades` ainda em `AppPlaceholder`, `AreaTrabalho` que monta `GerenciadorDialogos`); `useObjetos` (explorador) e `NoTabela` (nó da árvore); `useDialogos` (padrão de loja+portal a espelhar).

---

### Decisões de escopo desta fase (registradas)

- **Propriedades é uma janela do WM** (tipoApp `propriedades`), não um modal — consistente com o registro e o WM. Recebe `{ esquema, tabela }` por `janela.dados`.
- **Menu de contexto genérico** (loja + portal único, spec §4.3). Nesta fase é disparado pelo botão direito nos nós de objeto do Explorador, com "Propriedades" e "Abrir na grade" (paga o "abrir na grade" adiado da Fase 5). Menu de contexto no desktop/ícones fica para o polimento (Fase 7).
- **Contagem de linhas aproximada** via `sys.partitions` (rápida, é o jeito "catálogo"); para views é 0.
- **Sem seletor próprio:** aberto sem objeto (atalho/menu Iniciar), o app mostra uma instrução para usar o botão direito no Explorador — o caminho pretendido pelo roadmap.
- **Datas** vêm de `sys.objects.create_date/modify_date` como ISO; o app formata em pt-BR.
- Após esta fase os 4 apps são reais → `AppPlaceholder` é removido do registro (e o arquivo apagado se não houver outros usos).

---

### File structure for this phase

**`packages/shared/src/`**
- Create `propriedades.ts` — `IndiceBanco`, `PropriedadesObjeto`, `RespostaPropriedades` (tipos; params reusam `esquemaRefObjeto`).
- Modify `index.ts` — exportar.

**`apps/server/src/`**
- Create `bd/consultasPropriedades.ts` — `obterPropriedades`.
- Create `rotas/propriedades.ts` — `registrarRotasPropriedades`.
- Modify `app.ts` — registrar a rota no contexto autenticado.
- Test `rotas/propriedades.test.ts` — integração real.

**`apps/web/src/areaTrabalho/`**
- Create `useMenuContexto.ts` — loja do menu de contexto.
- Create `MenuContexto.tsx` — portal do menu.
- Test `useMenuContexto.test.ts`, `MenuContexto.test.tsx`.
- Modify `areaTrabalho.css` — estilos do menu de contexto.
- Modify `AreaTrabalho.tsx` — montar `<MenuContexto />`.
- Modify `registroApps.tsx` — `propriedades` passa a usar `PropriedadesObjeto` (e remover `AppPlaceholder`).

**`apps/web/src/aplicativos/explorador/`**
- Modify `NoTabela.tsx` — `onContextMenu` abre o menu.
- Test `NoTabela.test.tsx` (novo) — botão direito popula o menu e os itens funcionam.

**`apps/web/src/aplicativos/propriedades/`**
- Create `ganchos.ts` — `usePropriedades`.
- Create `PropriedadesObjeto.tsx` — app + `DetalhePropriedades`.
- Test `PropriedadesObjeto.test.tsx`.

**`README.md`** — Modify.

---

### Task 0: `@dbos/shared` — contrato de propriedades

Type-only (params reusam `esquemaRefObjeto`); sem teste — o `tsc`/consumidores são a checagem.

**Files:**
- Create: `packages/shared/src/propriedades.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Criar `packages/shared/src/propriedades.ts`**

```ts
import type { Resposta } from './respostas';
import type { TipoObjeto } from './explorador';

export interface IndiceBanco {
  nome: string;
  tipo: string; // type_desc do SQL Server: CLUSTERED / NONCLUSTERED / ...
  unico: boolean;
  chavePrimaria: boolean;
  colunas: string[]; // colunas-chave do índice, em ordem
}

export interface PropriedadesObjeto {
  esquema: string;
  nome: string;
  tipo: TipoObjeto;
  totalColunas: number;
  totalLinhas: number; // aproximado (sys.partitions); 0 para views
  criadoEm: string | null; // ISO
  modificadoEm: string | null; // ISO
  indices: IndiceBanco[];
}

export type RespostaPropriedades = Resposta<PropriedadesObjeto>;
```

- [ ] **Step 2: Exportar no barril `packages/shared/src/index.ts`**

```ts
export * from './respostas';
export * from './credenciais';
export * from './sessao';
export * from './explorador';
export * from './consulta';
export * from './grade';
export * from './propriedades';
```

- [ ] **Step 3: Sanidade — a suíte shared segue verde**

Run: `bun --filter @dbos/shared test`
Expected: PASS — nada quebrou (módulo é só tipos).

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/propriedades.ts packages/shared/src/index.ts
git commit -m "feat(shared): contrato de propriedades (PropriedadesObjeto, IndiceBanco)"
```

---

### Task 1: Servidor — consultas de propriedades (`sys.*`)

Funções de catálogo que exigem DB → sem teste unitário; cobertas pela integração (Task 2).

**Files:**
- Create: `apps/server/src/bd/consultasPropriedades.ts`

- [ ] **Step 1: Implementar `apps/server/src/bd/consultasPropriedades.ts`**

```ts
import sql from 'mssql';
import type { ConnectionPool } from 'mssql';
import type { IndiceBanco, PropriedadesObjeto, RefObjeto, TipoObjeto } from '@dbos/shared';

// Um Request roda uma query só; cada consulta recebe um request novo já com os
// parâmetros @esquema/@tabela (cru, mas parametrizado — spec §2.2).
function comParams(pool: ConnectionPool, ref: RefObjeto) {
  return pool
    .request()
    .input('esquema', sql.NVarChar, ref.esquema)
    .input('tabela', sql.NVarChar, ref.tabela);
}

export async function obterPropriedades(
  pool: ConnectionPool,
  ref: RefObjeto,
): Promise<PropriedadesObjeto | null> {
  const info = (
    await comParams(pool, ref).query<{ tipo: string; criadoEm: Date; modificadoEm: Date }>(`
      SELECT o.type_desc AS tipo, o.create_date AS criadoEm, o.modify_date AS modificadoEm
      FROM sys.objects o
      JOIN sys.schemas s ON s.schema_id = o.schema_id
      WHERE s.name = @esquema AND o.name = @tabela AND o.type IN ('U', 'V')
    `)
  ).recordset[0];
  if (!info) return null;
  const tipo: TipoObjeto = info.tipo === 'VIEW' ? 'view' : 'tabela';

  const totalColunas =
    (
      await comParams(pool, ref).query<{ total: number }>(`
        SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @esquema AND TABLE_NAME = @tabela
      `)
    ).recordset[0]?.total ?? 0;

  let totalLinhas = 0;
  if (tipo === 'tabela') {
    const linhas =
      (
        await comParams(pool, ref).query<{ linhas: number }>(`
          SELECT CAST(ISNULL(SUM(p.rows), 0) AS BIGINT) AS linhas
          FROM sys.partitions p
          JOIN sys.objects o ON o.object_id = p.object_id
          JOIN sys.schemas s ON s.schema_id = o.schema_id
          WHERE s.name = @esquema AND o.name = @tabela AND p.index_id IN (0, 1)
        `)
      ).recordset[0]?.linhas ?? 0;
    totalLinhas = Number(linhas);
  }

  const indicesRaw = (
    await comParams(pool, ref).query<{
      nome: string | null;
      tipo: string;
      unico: boolean;
      chavePrimaria: boolean;
    }>(`
      SELECT i.name AS nome, i.type_desc AS tipo, i.is_unique AS unico, i.is_primary_key AS chavePrimaria
      FROM sys.indexes i
      JOIN sys.objects o ON o.object_id = i.object_id
      JOIN sys.schemas s ON s.schema_id = o.schema_id
      WHERE s.name = @esquema AND o.name = @tabela AND i.type > 0
      ORDER BY i.is_primary_key DESC, i.name
    `)
  ).recordset;

  const colunasRaw = (
    await comParams(pool, ref).query<{ indice: string; coluna: string }>(`
      SELECT i.name AS indice, c.name AS coluna
      FROM sys.index_columns ic
      JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      JOIN sys.objects o ON o.object_id = i.object_id
      JOIN sys.schemas s ON s.schema_id = o.schema_id
      WHERE s.name = @esquema AND o.name = @tabela AND ic.is_included_column = 0 AND i.type > 0
      ORDER BY i.name, ic.key_ordinal
    `)
  ).recordset;

  const colunasPorIndice = new Map<string, string[]>();
  for (const linha of colunasRaw) {
    const lista = colunasPorIndice.get(linha.indice) ?? [];
    lista.push(linha.coluna);
    colunasPorIndice.set(linha.indice, lista);
  }

  const indices: IndiceBanco[] = indicesRaw.map((i) => ({
    nome: i.nome ?? '(sem nome)',
    tipo: i.tipo,
    unico: i.unico,
    chavePrimaria: i.chavePrimaria,
    colunas: i.nome ? colunasPorIndice.get(i.nome) ?? [] : [],
  }));

  return {
    esquema: ref.esquema,
    nome: ref.tabela,
    tipo,
    totalColunas,
    totalLinhas,
    criadoEm: info.criadoEm ? new Date(info.criadoEm).toISOString() : null,
    modificadoEm: info.modificadoEm ? new Date(info.modificadoEm).toISOString() : null,
    indices,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/bd/consultasPropriedades.ts
git commit -m "feat(server): consultas de propriedades (sys.* / catálogo)"
```

---

### Task 2: Servidor — rota de propriedades + integração real (TDD)

**Files:**
- Create: `apps/server/src/rotas/propriedades.ts`
- Modify: `apps/server/src/app.ts`
- Test: `apps/server/src/rotas/propriedades.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/server/src/rotas/propriedades.test.ts`**

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
const TABELA = '__dbos_teste_props';
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
    `CREATE TABLE dbo.${TABELA} (id INT IDENTITY(1,1) PRIMARY KEY, nome NVARCHAR(50) NOT NULL);
     CREATE INDEX IX_props_nome ON dbo.${TABELA} (nome);
     INSERT INTO dbo.${TABELA} (nome) VALUES ('Ana'), ('Bia');`,
  );
  try {
    await fn();
  } finally {
    await pool.request().query(DROP);
    await pool.close();
  }
}

test('sem cookie, /propriedades devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/propriedades?esquema=dbo&tabela=x`);
    expect(r.status).toBe(401);
  });
});

test('propriedades de uma tabela: tipo, colunas e índices', async () => {
  await comTabelaDeTeste(async () => {
    await comServidor(async (base) => {
      const cookie = await entrar(base);
      const r = await fetch(`${base}/api/propriedades?esquema=dbo&tabela=${TABELA}`, {
        headers: { cookie },
      });
      expect(r.status).toBe(200);
      const { dados } = await r.json();
      expect(dados.tipo).toBe('tabela');
      expect(dados.totalColunas).toBe(2);
      expect(typeof dados.totalLinhas).toBe('number');

      const pk = dados.indices.find((i: { chavePrimaria: boolean }) => i.chavePrimaria);
      expect(pk).toBeDefined();
      expect(pk.colunas).toContain('id');

      const ix = dados.indices.find((i: { nome: string }) => i.nome === 'IX_props_nome');
      expect(ix).toBeDefined();
      expect(ix.unico).toBe(false);
      expect(ix.colunas).toContain('nome');
    });
  });
});

test('objeto inexistente devolve 404 de validação', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/propriedades?esquema=dbo&tabela=__nao_existe_zzz`, {
      headers: { cookie },
    });
    expect(r.status).toBe(404);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/propriedades.test.ts`
Expected: FAIL — rota inexistente (404/asserções falham, ou erro de compilação após o Step 4).

- [ ] **Step 3: Implementar `apps/server/src/rotas/propriedades.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { esquemaRefObjeto, type RespostaPropriedades } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { obterPropriedades } from '../bd/consultasPropriedades';

export function registrarRotasPropriedades(
  app: FastifyInstance,
  gerenciador: GerenciadorPools,
): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/propriedades', { preHandler: autenticar }, async (req, reply) => {
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
    const props = await obterPropriedades(req.sessao!.pool, analise.data);
    if (!props) {
      return reply
        .status(404)
        .send({ ok: false, erro: { tipo: 'validacao', mensagem: 'Objeto não encontrado.' } });
    }
    const resposta: RespostaPropriedades = { ok: true, dados: props };
    return resposta;
  });
}
```

- [ ] **Step 4: Registrar no contexto autenticado em `apps/server/src/app.ts`**

Import no topo:

```ts
import { registrarRotasPropriedades } from './rotas/propriedades';
```

Dentro do `app.register(async (instancia) => { ... })`, após `registrarRotasGrade(instancia, gerenciador);`:

```ts
    registrarRotasPropriedades(instancia, gerenciador);
```

- [ ] **Step 5: Rodar a integração e confirmar que passa**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/propriedades.test.ts`
Expected: PASS — 3 testes. (Falha por `ELOGIN`/conexão = ambiente.)

- [ ] **Step 6: Suíte inteira do servidor**

Run: `bun --filter @dbos/server test`
Expected: PASS — tudo, incluindo propriedades (3).

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/rotas/propriedades.ts apps/server/src/rotas/propriedades.test.ts apps/server/src/app.ts
git commit -m "feat(server): rota de propriedades ponta a ponta"
```

---

### Task 3: Web — menu de contexto (loja + portal) (TDD)

**Files:**
- Create: `apps/web/src/areaTrabalho/useMenuContexto.ts`
- Create: `apps/web/src/areaTrabalho/MenuContexto.tsx`
- Test: `apps/web/src/areaTrabalho/useMenuContexto.test.ts`
- Test: `apps/web/src/areaTrabalho/MenuContexto.test.tsx`
- Modify: `apps/web/src/areaTrabalho/areaTrabalho.css`
- Modify: `apps/web/src/areaTrabalho/AreaTrabalho.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/areaTrabalho/useMenuContexto.test.ts`**

```ts
import { test, expect, beforeEach } from 'vitest';
import { useMenuContexto, estadoInicialMenuContexto } from './useMenuContexto';

beforeEach(() => useMenuContexto.setState(estadoInicialMenuContexto()));

test('abrir guarda posição e itens', () => {
  useMenuContexto.getState().abrir(10, 20, [{ rotulo: 'Propriedades', aoClicar: () => {} }]);
  const s = useMenuContexto.getState();
  expect(s.aberto).toBe(true);
  expect(s.x).toBe(10);
  expect(s.y).toBe(20);
  expect(s.itens).toHaveLength(1);
});

test('fechar limpa o menu', () => {
  useMenuContexto.getState().abrir(0, 0, [{ rotulo: 'X', aoClicar: () => {} }]);
  useMenuContexto.getState().fechar();
  expect(useMenuContexto.getState().aberto).toBe(false);
  expect(useMenuContexto.getState().itens).toHaveLength(0);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/useMenuContexto.test.ts`
Expected: FAIL — `Cannot find module './useMenuContexto'`.

- [ ] **Step 3: Implementar `apps/web/src/areaTrabalho/useMenuContexto.ts`**

```ts
import { create } from 'zustand';

export interface ItemMenu {
  rotulo: string;
  aoClicar: () => void;
}

interface LojaMenuContexto {
  aberto: boolean;
  x: number;
  y: number;
  itens: ItemMenu[];
  abrir: (x: number, y: number, itens: ItemMenu[]) => void;
  fechar: () => void;
}

export function estadoInicialMenuContexto() {
  return { aberto: false, x: 0, y: 0, itens: [] as ItemMenu[] };
}

export const useMenuContexto = create<LojaMenuContexto>((set) => ({
  ...estadoInicialMenuContexto(),
  abrir: (x, y, itens) => set({ aberto: true, x, y, itens }),
  fechar: () => set({ aberto: false, itens: [] }),
}));
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/useMenuContexto.test.ts`
Expected: PASS — 2 testes.

- [ ] **Step 5: Escrever o teste que falha `apps/web/src/areaTrabalho/MenuContexto.test.tsx`**

```tsx
import { test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MenuContexto } from './MenuContexto';
import { useMenuContexto, estadoInicialMenuContexto } from './useMenuContexto';

beforeEach(() => useMenuContexto.setState(estadoInicialMenuContexto()));

test('não renderiza nada quando fechado', () => {
  const { container } = render(<MenuContexto />);
  expect(container).toBeEmptyDOMElement();
});

test('mostra os itens e clicar dispara a ação e fecha', () => {
  const espiao = vi.fn();
  render(<MenuContexto />);
  act(() => useMenuContexto.getState().abrir(5, 5, [{ rotulo: 'Propriedades', aoClicar: espiao }]));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Propriedades' }));
  expect(espiao).toHaveBeenCalledTimes(1);
  expect(useMenuContexto.getState().aberto).toBe(false);
});
```

- [ ] **Step 6: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/MenuContexto.test.tsx`
Expected: FAIL — `Cannot find module './MenuContexto'`.

- [ ] **Step 7: Implementar `apps/web/src/areaTrabalho/MenuContexto.tsx`**

```tsx
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMenuContexto } from './useMenuContexto';

// Portal único do menu de contexto (spec §4.3). Fecha ao clicar fora ou Esc.
export function MenuContexto() {
  const { aberto, x, y, itens } = useMenuContexto(
    useShallow((s) => ({ aberto: s.aberto, x: s.x, y: s.y, itens: s.itens })),
  );
  const fechar = useMenuContexto((s) => s.fechar);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = () => fechar();
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    window.addEventListener('click', aoClicarFora);
    window.addEventListener('keydown', aoTecla);
    return () => {
      window.removeEventListener('click', aoClicarFora);
      window.removeEventListener('keydown', aoTecla);
    };
  }, [aberto, fechar]);

  if (!aberto) return null;

  return (
    <div className="menu-contexto" role="menu" style={{ left: x, top: y }}>
      {itens.map((item, i) => (
        <button
          key={i}
          role="menuitem"
          onClick={() => {
            item.aoClicar();
            fechar();
          }}
        >
          {item.rotulo}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/MenuContexto.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 9: Estilos — acrescentar ao final de `apps/web/src/areaTrabalho/areaTrabalho.css`**

```css
/* Menu de contexto (botão direito) — acima das janelas, abaixo dos diálogos */
.menu-contexto {
  position: fixed;
  z-index: 15000;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  padding: 2px;
  background: #c0c0c0;
  box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf;
}
.menu-contexto button {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 4px 8px;
}
.menu-contexto button:hover {
  background: #000080;
  color: #fff;
}
```

- [ ] **Step 10: Montar o portal no desktop `apps/web/src/areaTrabalho/AreaTrabalho.tsx`**

Adicione o import:

```tsx
import { MenuContexto } from './MenuContexto';
```

E, dentro do `<div className="area-trabalho">`, logo após `<GerenciadorDialogos />`, acrescente:

```tsx
      <MenuContexto />
```

- [ ] **Step 11: Rodar a suíte web inteira**

Run: `bun --filter @dbos/web test`
Expected: PASS — tudo + `useMenuContexto` (2) + `MenuContexto` (2).

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/areaTrabalho/useMenuContexto.ts apps/web/src/areaTrabalho/useMenuContexto.test.ts apps/web/src/areaTrabalho/MenuContexto.tsx apps/web/src/areaTrabalho/MenuContexto.test.tsx apps/web/src/areaTrabalho/areaTrabalho.css apps/web/src/areaTrabalho/AreaTrabalho.tsx
git commit -m "feat(web): menu de contexto (loja + portal)"
```

---

### Task 4: Web — botão direito no Explorador (TDD)

**Files:**
- Modify: `apps/web/src/aplicativos/explorador/NoTabela.tsx`
- Test: `apps/web/src/aplicativos/explorador/NoTabela.test.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/aplicativos/explorador/NoTabela.test.tsx`**

```tsx
import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NoTabela } from './NoTabela';
import { useMenuContexto, estadoInicialMenuContexto } from '../../areaTrabalho/useMenuContexto';
import { useLoja, estadoInicial } from '../../areaTrabalho/loja';

beforeEach(() => {
  useMenuContexto.setState(estadoInicialMenuContexto());
  useLoja.setState(estadoInicial());
});

const OBJ = { esquema: 'dbo', nome: 'Clientes', tipo: 'tabela' as const };

test('botão direito abre o menu com Propriedades e Abrir na grade', () => {
  render(
    <ul>
      <NoTabela objeto={OBJ} />
    </ul>,
  );
  fireEvent.contextMenu(screen.getByText(/Clientes/));
  const rotulos = useMenuContexto.getState().itens.map((i) => i.rotulo);
  expect(rotulos).toContain('Propriedades');
  expect(rotulos).toContain('Abrir na grade');
});

test('o item "Abrir na grade" abre uma janela de grade com o objeto', () => {
  render(
    <ul>
      <NoTabela objeto={OBJ} />
    </ul>,
  );
  fireEvent.contextMenu(screen.getByText(/Clientes/));
  const item = useMenuContexto.getState().itens.find((i) => i.rotulo === 'Abrir na grade')!;
  act(() => item.aoClicar());
  const janela = useLoja.getState().janelas.find((j) => j.tipoApp === 'grade');
  expect(janela).toBeDefined();
  expect(janela!.dados).toEqual({ esquema: 'dbo', tabela: 'Clientes' });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/explorador/NoTabela.test.tsx`
Expected: FAIL — `NoTabela` ainda não dispara o menu (os itens ficam vazios).

- [ ] **Step 3: Adicionar o `onContextMenu` em `apps/web/src/aplicativos/explorador/NoTabela.tsx`**

Reescreva o arquivo inteiro:

```tsx
import { useState } from 'react';
import type { ObjetoBanco } from '@dbos/shared';
import { useMenuContexto } from '../../areaTrabalho/useMenuContexto';
import { useLoja } from '../../areaTrabalho/loja';
import { ColunasDaTabela } from './ColunasDaTabela';

// Nó expansível: ao abrir, monta <ColunasDaTabela> — é o que dispara a busca lazy.
export function NoTabela({ objeto }: { objeto: ObjetoBanco }) {
  const [aberto, setAberto] = useState(false);
  const abrirMenu = useMenuContexto((s) => s.abrir);
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const icone = objeto.tipo === 'view' ? '🔎' : '▦';

  return (
    <li>
      <details onToggle={(e) => setAberto(e.currentTarget.open)}>
        <summary
          onContextMenu={(e) => {
            e.preventDefault();
            const ref = { esquema: objeto.esquema, tabela: objeto.nome };
            abrirMenu(e.clientX, e.clientY, [
              { rotulo: 'Propriedades', aoClicar: () => abrirJanela('propriedades', ref) },
              { rotulo: 'Abrir na grade', aoClicar: () => abrirJanela('grade', ref) },
            ]);
          }}
        >
          {icone} {objeto.nome}
        </summary>
        {aberto && <ColunasDaTabela esquema={objeto.esquema} tabela={objeto.nome} />}
      </details>
    </li>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/explorador/NoTabela.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 5: Confirmar que o teste do Explorador não regrediu**

Run: `cd apps/web && bunx vitest run src/aplicativos/explorador/ExploradorObjetos.test.tsx`
Expected: PASS — os nomes de objeto seguem renderizando.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/aplicativos/explorador/NoTabela.tsx apps/web/src/aplicativos/explorador/NoTabela.test.tsx
git commit -m "feat(web): botão direito no explorador (propriedades, abrir na grade)"
```

---

### Task 5: Web — app Propriedades de Objetos (TDD) + registro

**Files:**
- Create: `apps/web/src/aplicativos/propriedades/ganchos.ts`
- Create: `apps/web/src/aplicativos/propriedades/PropriedadesObjeto.tsx`
- Test: `apps/web/src/aplicativos/propriedades/PropriedadesObjeto.test.tsx`
- Modify: `apps/web/src/areaTrabalho/registroApps.tsx`
- Delete: `apps/web/src/areaTrabalho/AppPlaceholder.tsx` (se não houver mais usos)

- [ ] **Step 1: Implementar `apps/web/src/aplicativos/propriedades/ganchos.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import type { PropriedadesObjeto } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

export function usePropriedades(esquema: string, tabela: string) {
  return useQuery({
    queryKey: ['propriedades', esquema, tabela],
    queryFn: async (): Promise<PropriedadesObjeto> => {
      const params = new URLSearchParams({ esquema, tabela });
      const r = await requisitar<PropriedadesObjeto>(`/api/propriedades?${params.toString()}`);
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}
```

- [ ] **Step 2: Escrever o teste que falha `apps/web/src/aplicativos/propriedades/PropriedadesObjeto.test.tsx`**

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropriedadesObjeto } from './PropriedadesObjeto';
import type { EstadoJanela } from '../../areaTrabalho/tipos';

afterEach(() => vi.unstubAllGlobals());

function janelaFake(dados: unknown): EstadoJanela {
  return { dados } as unknown as EstadoJanela;
}

function renderizar(janela: EstadoJanela) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <PropriedadesObjeto janela={janela} />
    </QueryClientProvider>,
  );
}

test('sem objeto em dados, mostra instrução', () => {
  renderizar(janelaFake(null));
  expect(screen.getByText(/botão direito/i)).toBeInTheDocument();
});

test('com objeto, mostra geral e índices', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dados: {
            esquema: 'dbo',
            nome: 'Clientes',
            tipo: 'tabela',
            totalColunas: 2,
            totalLinhas: 5,
            criadoEm: null,
            modificadoEm: null,
            indices: [
              { nome: 'PK_Clientes', tipo: 'CLUSTERED', unico: true, chavePrimaria: true, colunas: ['id'] },
            ],
          },
        }),
      ),
    ),
  );
  renderizar(janelaFake({ esquema: 'dbo', tabela: 'Clientes' }));
  expect(await screen.findByText(/PK_Clientes/)).toBeInTheDocument();
  expect(screen.getByText(/Tabela/)).toBeInTheDocument();
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/propriedades/PropriedadesObjeto.test.tsx`
Expected: FAIL — `Cannot find module './PropriedadesObjeto'`.

- [ ] **Step 4: Implementar `apps/web/src/aplicativos/propriedades/PropriedadesObjeto.tsx`**

```tsx
import type { EstadoJanela, PropsApp } from '../../areaTrabalho/tipos';
import { usePropriedades } from './ganchos';

interface RefObj {
  esquema: string;
  tabela: string;
}

function refDaJanela(janela: EstadoJanela): RefObj | null {
  const d = janela.dados as { esquema?: unknown; tabela?: unknown } | null | undefined;
  if (d && typeof d.esquema === 'string' && typeof d.tabela === 'string') {
    return { esquema: d.esquema, tabela: d.tabela };
  }
  return null;
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR');
}

export function PropriedadesObjeto({ janela }: PropsApp) {
  const ref = refDaJanela(janela);
  if (!ref) {
    return (
      <p style={{ padding: 8 }}>
        Clique com o botão direito num objeto no Explorador e escolha “Propriedades”.
      </p>
    );
  }
  return <DetalhePropriedades esquema={ref.esquema} tabela={ref.tabela} />;
}

function DetalhePropriedades({ esquema, tabela }: RefObj) {
  const consulta = usePropriedades(esquema, tabela);
  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando…</p>;
  if (consulta.isError) return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;
  const p = consulta.data;

  return (
    <div style={{ padding: 8 }}>
      <fieldset>
        <legend>Geral</legend>
        <p style={{ margin: '2px 0' }}>Tipo: <strong>{p.tipo === 'view' ? 'View' : 'Tabela'}</strong></p>
        <p style={{ margin: '2px 0' }}>Esquema: {p.esquema}</p>
        <p style={{ margin: '2px 0' }}>Nome: {p.nome}</p>
        <p style={{ margin: '2px 0' }}>Colunas: {p.totalColunas}</p>
        <p style={{ margin: '2px 0' }}>Linhas (aprox.): {p.totalLinhas}</p>
        <p style={{ margin: '2px 0' }}>Criado em: {formatarData(p.criadoEm)}</p>
        <p style={{ margin: '2px 0' }}>Modificado em: {formatarData(p.modificadoEm)}</p>
      </fieldset>
      <fieldset style={{ marginTop: 8 }}>
        <legend>Índices ({p.indices.length})</legend>
        {p.indices.length === 0 ? (
          <p style={{ margin: '2px 0' }}>Nenhum índice.</p>
        ) : (
          <ul className="tree-view">
            {p.indices.map((i) => (
              <li key={i.nome}>
                {(i.chavePrimaria ? '🔑 ' : '') +
                  i.nome +
                  ' — ' +
                  i.tipo +
                  (i.unico ? ', único' : '') +
                  ' (' +
                  i.colunas.join(', ') +
                  ')'}
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/propriedades/PropriedadesObjeto.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 6: Registrar o app em `apps/web/src/areaTrabalho/registroApps.tsx`**

Acrescente o import (junto aos outros de apps):

```tsx
import { PropriedadesObjeto } from '../aplicativos/propriedades/PropriedadesObjeto';
```

Troque a entrada `propriedades` para usar o componente real e remova o import agora ocioso de `AppPlaceholder` (a 1ª linha de import dele, `import { AppPlaceholder } from './AppPlaceholder';`):

```tsx
  propriedades: {
    titulo: 'Propriedades',
    icone: 'ℹ️',
    tamanhoInicial: { largura: 360, altura: 380 },
    componente: PropriedadesObjeto,
  },
```

- [ ] **Step 7: Remover o `AppPlaceholder` órfão (se não houver outros usos)**

Confirme que nada mais o referencia e remova o arquivo:

Run: `cd apps/web && grep -rl "AppPlaceholder" src` (espere: nenhum resultado após editar o registro)
Se não houver resultados:

```bash
git rm apps/web/src/areaTrabalho/AppPlaceholder.tsx
```

(Se ainda houver alguma referência, NÃO apague — apenas garanta que o registro não usa mais e siga.)

- [ ] **Step 8: Checar tipos do web**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros. (Corrija com `!` no ponto exato se algum acesso a índice nos novos arquivos for sinalizado, sem mudar comportamento.)

- [ ] **Step 9: Rodar a suíte web inteira**

Run: `bun --filter @dbos/web test`
Expected: PASS — tudo + `PropriedadesObjeto` (2); nenhuma referência ao `AppPlaceholder` removido.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/aplicativos/propriedades/ganchos.ts apps/web/src/aplicativos/propriedades/PropriedadesObjeto.tsx apps/web/src/aplicativos/propriedades/PropriedadesObjeto.test.tsx apps/web/src/areaTrabalho/registroApps.tsx
git rm apps/web/src/areaTrabalho/AppPlaceholder.tsx 2>/dev/null; git add -A
git commit -m "feat(web): app Propriedades de Objetos"
```

---

### Task 6: Verificação completa + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Checar tipos do web (garantia)**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 2: Documentar as Propriedades no `README.md`**

Acrescente, ao final do parágrafo da Grade de Dados na seção "Como rodar":

```markdown

No **Explorador**, clique com o botão direito num objeto para abrir o menu de
contexto: **Propriedades** abre uma janela com tipo, contagem de colunas/linhas,
datas e os **índices** (lidos de `sys.*`); **Abrir na grade** abre a tabela na
Grade de Dados.
```

- [ ] **Step 3: Rodar a suíte inteira do monorepo**

Run: `bun run test`
Expected: tudo verde — `@dbos/shared`, `@dbos/server` (+ propriedades 3), `@dbos/web` (+ useMenuContexto 2 + MenuContexto 2 + NoTabela 2 + PropriedadesObjeto 2). Falhas SÓ por conexão SQL = ambiente.

- [ ] **Step 4: Verificar no navegador**

Em dois terminais:
```bash
bun run dev:server   # :3001
bun run dev:web      # :5173
```
Faça login, abra o **Explorador de Objetos**, e clique com o **botão direito** numa tabela. Confirme:
- O menu de contexto aparece com "Propriedades" e "Abrir na grade"; clicar fora fecha.
- "Propriedades" abre uma janela com Geral (tipo, colunas, linhas, datas) e Índices (com 🔑 na PK e as colunas de cada índice).
- "Abrir na grade" abre a tabela na Grade.
- Abrir Propriedades pelo atalho/menu Iniciar (sem objeto) mostra a instrução de usar o botão direito.

Pare ambos com Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README descreve as Propriedades (Fase 6)"
```

---

## Self-Review

**Spec coverage (Fase 6 / roadmap passo 6 — "right-click → Properties dialogs from catalog queries"):**
- Botão direito → menu de contexto (spec §4.3 "single portal layer") → `useMenuContexto` + `<MenuContexto>` (Task 3) disparado por `NoTabela` (Task 4). ✓
- Propriedades a partir de consultas de catálogo (`sys.*`/`INFORMATION_SCHEMA`, spec §5.5) → `obterPropriedades` (Task 1) + rota (Task 2). ✓
- SQL parametrizado (spec §2.2) → `@esquema`/`@tabela` em todas as consultas de propriedades. ✓
- Caminho de dados tipado e `useQuery` para leitura (spec §6.1–6.2) → `RespostaPropriedades` + `usePropriedades` (Tasks 0, 5). ✓
- App como uma entrada no registro genérico (spec §4.2) → `propriedades` passa a usar `PropriedadesObjeto` (Task 5). ✓
- Integração com SQL Server real (spec §7) → `propriedades.test.ts`: tipo, colunas, índices/PK, 404, 401 (Task 2). ✓

**Placeholder scan:** Sem TBD/TODO; todo passo tem conteúdo completo. Com os 4 apps reais, o `AppPlaceholder` é removido (Task 5).

**Type consistency:** `PropriedadesObjeto`/`IndiceBanco`/`RespostaPropriedades` definidos uma vez (Task 0) e usados no servidor (`obterPropriedades`, rota — Tasks 1–2) e no web (`usePropriedades`, componente — Task 5). `esquemaRefObjeto`/`RefObjeto` reusados da Fase 3. `obterPropriedades(pool, ref)` (Task 1) bate com a chamada na rota (Task 2). `useMenuContexto`/`estadoInicialMenuContexto`/`ItemMenu`/`abrir`/`fechar` (Task 3) usados em `MenuContexto` (Task 3) e `NoTabela` (Task 4). `abrirJanela('propriedades'|'grade', { esquema, tabela })` (Task 4) casa com o `refDaJanela` que lê `janela.dados` no app (Task 5). `PropriedadesObjeto({ janela }: PropsApp)` é atribuível a `ComponentType<PropsApp>` no registro (Task 5). Rota no mesmo contexto do cookie em `app.ts` (Task 2). ✓

**Riscos/observações:**
- `totalLinhas` é aproximado (`sys.partitions`) — o teste de integração só afirma que é número, para não depender de estatística.
- `i.type > 0` exclui heap dos índices; a PK clustered e índices nonclustered aparecem. Nome da PK é gerado pelo SQL Server — o teste casa por `chavePrimaria`/colunas, não por nome.
- O menu de contexto fecha em qualquer clique de janela (`window` listener) e no Esc; não fecha em novo botão direito (o `abrir` simplesmente reposiciona).
- `MouseEvent` do React é inferido no handler inline de `NoTabela` (evita colisão com o `MouseEvent` do DOM).
- Remover `AppPlaceholder` é limpeza pós-4-apps; o passo confirma ausência de outras referências antes de apagar.
- Menu de contexto no desktop/ícones (spec §4.3) e extrair um seletor de objeto compartilhado ficam para o polimento (Fase 7).
