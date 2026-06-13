# Revamp Visual — Fase 5: Relatório (Folha) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o **único feature real** do revamp: um app **Relatório (Folha)** — gráfico de barras horizontais do líquido por departamento (sobre `dbo.vw_FolhaResumo`) com lista de anomalias (sobre `dbo.vw_AnomaliasFolha`). Inclui backend (uma rota Fastify autenticada que agrega as views), tipos compartilhados, hook de cliente, componente novo, registro no shell (ícone/atalho/Iniciar) e testes (rota + componente).

**Architecture:** O `vw_FolhaResumo` é por funcionário; a rota `GET /api/folha/relatorio` **agrega por departamento** (`GROUP BY departamento`), soma o total geral, e anexa as anomalias de `vw_AnomaliasFolha` — devolvendo um `RelatorioFolha` único (`{ departamentos, totalGeral, anomalias }`) no envelope `{ ok, dados }` padrão. O front tem `useRelatorioFolha()` (TanStack Query) e um componente `RelatorioFolha` que desenha barras (largura = líquido/maior) + uma lista de anomalias. O app entra no `registroApps`/`ORDEM_APPS` (ícone `report`), e o atalho dedicado "Relatório (Folha)" da área de trabalho passa a abrir o novo app (em vez de abrir a grade na view).

**Tech Stack:** Fastify + mssql (rota autenticada, query parametrizada não é necessária — sem entrada do usuário), Zod não necessário (sem body), `@dbos/shared` (tipos), React 18 + TanStack Query, Vitest (front, fetch mockado) e `bun:test` (rota, servidor real). pt-BR; `tsc --noEmit` (server e web) + `vite build` + suítes verdes são o gate.

**Builds on Fase 4:** todo o restyle e os tokens existem; este app já nasce tematizado (barras usam `--accent`, painel usa tokens). Reusa `formatarMoeda` de `grade/conversao.ts` (Fase 4) e o padrão de rota/host/hook das fases de backend anteriores.

---

### Decisões desta fase

- **Uma rota, um payload.** `GET /api/folha/relatorio` devolve `{ departamentos, totalGeral, anomalias }`. Evita dois fetches/duas queries no cliente.
- **Agregação no backend.** `SELECT departamento, COUNT(*) AS funcionarios, SUM(ISNULL(ultimoLiquido,0)) AS totalLiquido FROM dbo.vw_FolhaResumo GROUP BY departamento ORDER BY totalLiquido DESC`. Números vêm do driver possivelmente como string → `Number(...)` no map.
- **App no registro.** `relatorio` entra em `TipoApp`/`registroApps`/`ORDEM_APPS` (ícone `report`, título "Relatório (Folha)"). O **atalho bespoke** atual (que abre `grade` na view) é **removido** — o loop genérico de `ORDEM_APPS` já renderiza o atalho, o item de Iniciar e o de menu de contexto. Atualizar `AreaTrabalho.test` (a contagem de itens "Abrir …" sobe de 7 para 8).
- **Sem `dados` de janela.** O componente busca tudo pela rota; ignora `janela.dados`.
- **Teste de rota usa o banco real** (como `consulta.test.ts`/`propriedades.test.ts`): exige SQL Server no ar com o seed `db/dbos_rh.sql` (as views existem lá). Se o ambiente não tiver o banco, o teste falha por conexão (igual aos demais testes de servidor) — isso é ambiental, não defeito de código; confirme que a rota compila (`tsc`) e que o teste é estruturalmente correto.

### Colunas das views (de `db/dbos_rh.sql`)

`vw_FolhaResumo`: `funcionarioId, funcionario, cargo, departamento, salario, ultimaCompetencia, ultimoLiquido`.
`vw_AnomaliasFolha`: `id, funcionario, competencia, salarioBase, bonus, descontos, salarioLiquido, liquidoEsperado`.

### File structure for this plan

**`packages/shared/src`**
- Create `folha.ts` — tipos + `RespostaRelatorioFolha`.
- Modify `index.ts` — `export * from './folha';`.

**`apps/server/src`**
- Create `bd/consultasFolha.ts` — `obterRelatorioFolha(pool)`.
- Create `rotas/folha.ts` — `registrarRotasFolha`.
- Modify `app.ts` — registra a rota.
- Test `rotas/folha.test.ts`.

**`apps/web/src`**
- Create `aplicativos/folha/ganchos.ts` — `useRelatorioFolha`.
- Create `aplicativos/folha/RelatorioFolha.tsx`, `folha.css`.
- Test `aplicativos/folha/RelatorioFolha.test.tsx`.
- Modify `areaTrabalho/tipos.ts` (`TipoApp`), `registroApps.tsx` (entrada + ordem), `AreaTrabalho.tsx` (remove atalho bespoke), `AreaTrabalho.test.tsx` (contagem).

---

### Task 1: Tipos compartilhados (`@dbos/shared`)

**Files:**
- Create: `packages/shared/src/folha.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Criar `packages/shared/src/folha.ts`**

```ts
import type { Resposta } from './respostas';

// Linha agregada por departamento (de vw_FolhaResumo).
export interface FolhaResumoDepartamento {
  departamento: string;
  funcionarios: number;
  totalLiquido: number;
}

// Anomalia de folha (de vw_AnomaliasFolha): líquido pago ≠ base + bônus − descontos.
export interface AnomaliaFolha {
  id: number;
  funcionario: string;
  competencia: string; // 'AAAA-MM'
  salarioBase: number;
  bonus: number;
  descontos: number;
  salarioLiquido: number;
  liquidoEsperado: number;
}

export interface RelatorioFolha {
  departamentos: FolhaResumoDepartamento[];
  totalGeral: number;
  anomalias: AnomaliaFolha[];
}

export type RespostaRelatorioFolha = Resposta<RelatorioFolha>;
```

- [ ] **Step 2: Exportar no barrel `packages/shared/src/index.ts`**

Acrescentar ao fim: `export * from './folha';`

- [ ] **Step 3: tsc do pacote shared**

Run: `cd packages/shared; bunx tsc --noEmit` (ou o comando de typecheck do pacote, se houver `package.json` script; senão use o tsc da raiz/web que resolve `@dbos/shared`).
Expected: limpo.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/folha.ts packages/shared/src/index.ts
git commit -m "feat(shared): tipos do Relatório de Folha (resumo por departamento + anomalias)"
```

---

### Task 2: Backend — query + rota + teste

**Files:**
- Create: `apps/server/src/bd/consultasFolha.ts`, `apps/server/src/rotas/folha.ts`
- Modify: `apps/server/src/app.ts`
- Test: `apps/server/src/rotas/folha.test.ts`

- [ ] **Step 1: Criar `apps/server/src/bd/consultasFolha.ts`**

```ts
import type { ConnectionPool } from 'mssql';
import type { AnomaliaFolha, FolhaResumoDepartamento, RelatorioFolha } from '@dbos/shared';

export async function obterRelatorioFolha(pool: ConnectionPool): Promise<RelatorioFolha> {
  const dep = await pool.request().query<{
    departamento: string;
    funcionarios: number;
    totalLiquido: number | string;
  }>(`
    SELECT departamento,
           COUNT(*) AS funcionarios,
           SUM(ISNULL(ultimoLiquido, 0)) AS totalLiquido
    FROM dbo.vw_FolhaResumo
    GROUP BY departamento
    ORDER BY totalLiquido DESC
  `);

  const departamentos: FolhaResumoDepartamento[] = dep.recordset.map((r) => ({
    departamento: r.departamento,
    funcionarios: Number(r.funcionarios),
    totalLiquido: Number(r.totalLiquido),
  }));
  const totalGeral = departamentos.reduce((s, d) => s + d.totalLiquido, 0);

  const anom = await pool.request().query<AnomaliaFolha>(`
    SELECT id, funcionario, competencia, salarioBase, bonus, descontos,
           salarioLiquido, liquidoEsperado
    FROM dbo.vw_AnomaliasFolha
    ORDER BY funcionario, competencia DESC
  `);
  const anomalias: AnomaliaFolha[] = anom.recordset.map((a) => ({
    id: Number(a.id),
    funcionario: a.funcionario,
    competencia: a.competencia,
    salarioBase: Number(a.salarioBase),
    bonus: Number(a.bonus),
    descontos: Number(a.descontos),
    salarioLiquido: Number(a.salarioLiquido),
    liquidoEsperado: Number(a.liquidoEsperado),
  }));

  return { departamentos, totalGeral, anomalias };
}
```

- [ ] **Step 2: Criar `apps/server/src/rotas/folha.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import type { RespostaRelatorioFolha } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { obterRelatorioFolha } from '../bd/consultasFolha';

export function registrarRotasFolha(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/folha/relatorio', { preHandler: autenticar }, async (req) => {
    const dados = await obterRelatorioFolha(req.sessao!.pool);
    const resposta: RespostaRelatorioFolha = { ok: true, dados };
    return resposta;
  });
}
```

- [ ] **Step 3: Registrar em `apps/server/src/app.ts`**

Importar e registrar junto às demais rotas (dentro do `app.register(async (instancia) => { … })`):

```ts
import { registrarRotasFolha } from './rotas/folha';
// …
registrarRotasFolha(instancia, gerenciador);
```

(Adicione o `import` no topo com os outros `registrarRotas*` e a chamada após `registrarRotasRelacionamentos(instancia, gerenciador);`.)

- [ ] **Step 4: Criar `apps/server/src/rotas/folha.test.ts`**

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

test('sem cookie, /folha/relatorio devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/folha/relatorio`);
    expect(r.status).toBe(401);
    expect((await r.json()).erro.tipo).toBe('autenticacao');
  });
});

test('com sessão, devolve departamentos, total e anomalias', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/folha/relatorio`, { headers: { cookie } });
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    expect(Array.isArray(dados.departamentos)).toBe(true);
    expect(typeof dados.totalGeral).toBe('number');
    expect(Array.isArray(dados.anomalias)).toBe(true);
    if (dados.departamentos.length > 0) {
      const d = dados.departamentos[0];
      expect(typeof d.departamento).toBe('string');
      expect(typeof d.funcionarios).toBe('number');
      expect(typeof d.totalLiquido).toBe('number');
    }
  });
});
```

- [ ] **Step 5: Rodar o teste de rota + tsc do servidor**

Run: `cd apps/server; bun test src/rotas/folha.test.ts; bunx tsc --noEmit`
Expected: testes passam (com SQL Server no ar e seed aplicado) + tsc limpo. **Se** falhar por conexão (`ECONNREFUSED`/`ELOGIN`/timeout), é ambiental (igual aos outros testes de servidor) — confirme que `tsc` está limpo e que o teste do 401 (que não toca o banco a fundo) é coerente; registre a pendência de rodar com o banco no ar.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/bd/consultasFolha.ts apps/server/src/rotas/folha.ts apps/server/src/app.ts apps/server/src/rotas/folha.test.ts
git commit -m "feat(server): rota GET /api/folha/relatorio (resumo por departamento + anomalias)"
```

---

### Task 3: Front — hook, componente, registro e atalho

**Files:**
- Create: `apps/web/src/aplicativos/folha/ganchos.ts`, `RelatorioFolha.tsx`, `folha.css`
- Test: `apps/web/src/aplicativos/folha/RelatorioFolha.test.tsx`
- Modify: `apps/web/src/areaTrabalho/tipos.ts`, `registroApps.tsx`, `AreaTrabalho.tsx`, `AreaTrabalho.test.tsx`

- [ ] **Step 1: Criar `apps/web/src/aplicativos/folha/ganchos.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import type { RelatorioFolha } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

export function useRelatorioFolha() {
  return useQuery({
    queryKey: ['folha', 'relatorio'],
    queryFn: async (): Promise<RelatorioFolha> => {
      const r = await requisitar<RelatorioFolha>('/api/folha/relatorio');
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}
```

- [ ] **Step 2: Criar `apps/web/src/aplicativos/folha/folha.css`**

```css
.folha {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.folha-barra {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-bottom: 1px solid var(--borda-painel);
}
.folha-corpo {
  flex: 1;
  overflow: auto;
  padding: 12px;
  background: var(--janela-conteudo);
}
.folha-titulo {
  font-weight: 700;
  font-size: 15px;
}
.folha-subtitulo {
  color: var(--ink-suave);
  margin-bottom: 12px;
}
.folha-linha {
  margin-bottom: 10px;
}
.folha-linha-cab {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 3px;
}
.folha-linha-cab .num {
  font-variant-numeric: tabular-nums;
}
.folha-trilho {
  height: 16px;
  background: var(--face-baixa);
  border-radius: var(--round-sm);
  box-shadow: inset 1px 1px 0 rgba(0, 0, 0, 0.12);
  overflow: hidden;
}
.folha-preenche {
  height: 100%;
  border-radius: var(--round-sm);
  background: var(--accent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.folha-anomalias {
  margin-top: 16px;
}
.folha-anomalias-titulo {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  color: var(--erro-ink);
  margin-bottom: 6px;
}
.folha-tabela {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}
.folha-tabela th,
.folha-tabela td {
  border: 1px solid var(--borda-celula);
  padding: 2px 6px;
  text-align: left;
  white-space: nowrap;
}
.folha-tabela td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.folha-statusbar {
  display: flex;
  gap: 12px;
  padding: 3px 8px;
  font-size: 11px;
  border-top: 1px solid var(--borda-painel);
  background: var(--face);
}

/* Pele Aero: barra com gradiente glossy */
body[data-skin="aero"] .folha-preenche {
  background: linear-gradient(180deg, color-mix(in oklab, var(--accent), white 30%), var(--accent) 55%, var(--accent-d, var(--accent)));
}
body[data-skin="aero"] .folha-trilho {
  background: #eef3f8;
}
```

- [ ] **Step 3: Criar `apps/web/src/aplicativos/folha/RelatorioFolha.tsx`**

```tsx
import { Icone } from '../../tema/icones/Icone';
import { formatarMoeda } from '../grade/conversao';
import { useRelatorioFolha } from './ganchos';
import './folha.css';

export function RelatorioFolha() {
  const consulta = useRelatorioFolha();

  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando…</p>;
  if (consulta.isError) {
    return <p style={{ padding: 8, color: 'var(--erro-ink)' }}>{consulta.error.message}</p>;
  }

  const { departamentos, totalGeral, anomalias } = consulta.data;
  const maior = departamentos.reduce((m, d) => Math.max(m, d.totalLiquido), 0) || 1;

  return (
    <div className="folha">
      <div className="folha-barra">
        <Icone nome="report" tamanho={16} alt="" />
        <strong>Folha de Pagamento — Resumo</strong>
        <button style={{ marginLeft: 'auto' }} onClick={() => consulta.refetch()}>
          <Icone nome="refresh" tamanho={14} alt="" style={{ marginRight: 4 }} /> Atualizar
        </button>
      </div>

      <div className="folha-corpo">
        <div className="folha-titulo">Líquido por departamento</div>
        <div className="folha-subtitulo">
          Líquido total <strong>{formatarMoeda(totalGeral)}</strong>
        </div>

        {departamentos.map((d) => (
          <div key={d.departamento} className="folha-linha">
            <div className="folha-linha-cab">
              <span>
                <strong>{d.departamento}</strong>{' '}
                <span style={{ color: 'var(--ink-suave)' }}>· {d.funcionarios} func.</span>
              </span>
              <span className="num">{formatarMoeda(d.totalLiquido)}</span>
            </div>
            <div className="folha-trilho">
              <div
                className="folha-preenche"
                style={{ width: `${(d.totalLiquido / maior) * 100}%` }}
              />
            </div>
          </div>
        ))}

        {anomalias.length > 0 && (
          <div className="folha-anomalias">
            <div className="folha-anomalias-titulo">
              <Icone nome="stop" tamanho={14} alt="" />
              Anomalias ({anomalias.length})
            </div>
            <table className="folha-tabela">
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Competência</th>
                  <th>Líquido pago</th>
                  <th>Esperado</th>
                </tr>
              </thead>
              <tbody>
                {anomalias.map((a) => (
                  <tr key={a.id}>
                    <td>{a.funcionario}</td>
                    <td>{a.competencia}</td>
                    <td className="num">{formatarMoeda(a.salarioLiquido)}</td>
                    <td className="num">{formatarMoeda(a.liquidoEsperado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="folha-statusbar">
        <span>{departamentos.length} departamento(s)</span>
        <span style={{ marginLeft: 'auto' }}>view · somente leitura</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Registrar o app — `tipos.ts` + `registroApps.tsx`**

a) `apps/web/src/areaTrabalho/tipos.ts` — acrescentar `| 'relatorio'` ao `TipoApp`:

```ts
export type TipoApp =
  | 'consulta'
  | 'explorador'
  | 'grade'
  | 'propriedades'
  | 'busca'
  | 'relacionamentos'
  | 'terminal'
  | 'relatorio';
```

b) `apps/web/src/areaTrabalho/registroApps.tsx` — adicionar o lazy import e a entrada, e incluir em `ORDEM_APPS`:

```tsx
const RelatorioFolha = lazy(() =>
  import('../aplicativos/folha/RelatorioFolha').then((m) => ({ default: m.RelatorioFolha })),
);
```
(siga o mesmo padrão de lazy dos outros apps do arquivo — confira como `EditorConsultas` é importado e replique.)

Entrada no `registroApps`:

```tsx
  relatorio: {
    titulo: 'Relatório (Folha)',
    icone: 'report',
    tamanhoInicial: { largura: 600, altura: 480 },
    componente: RelatorioFolha,
  },
```

E em `ORDEM_APPS`, adicionar `'relatorio'` ao final:

```tsx
export const ORDEM_APPS: TipoApp[] = [
  'explorador',
  'busca',
  'consulta',
  'grade',
  'propriedades',
  'relacionamentos',
  'terminal',
  'relatorio',
];
```

> Nota: se `RelatorioFolha` for um app simples (não-lazy como outros), pode importá-lo direto; mas siga o padrão do arquivo (a maioria usa import direto exceto `EditorConsultas`). Verifique e seja consistente — o importante é que `componente: RelatorioFolha` resolva.

- [ ] **Step 5: Remover o atalho bespoke em `AreaTrabalho.tsx`**

Remover a constante `const RELATORIO = { esquema: 'dbo', tabela: 'vw_FolhaResumo' };` e o `<button className="icone-atalho">…Relatório (Folha)…</button>` dedicado (o bloco inteiro que chamava `abrirJanela('grade', RELATORIO)`). O loop genérico de `ORDEM_APPS` agora renderiza o atalho "Relatório (Folha)" automaticamente. Conferir que nenhum outro uso de `RELATORIO` permanece.

- [ ] **Step 6: Criar `apps/web/src/aplicativos/folha/RelatorioFolha.test.tsx`**

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RelatorioFolha } from './RelatorioFolha';

afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <RelatorioFolha />
    </QueryClientProvider>,
  );
}

test('mostra barras por departamento, total e anomalias', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dados: {
            departamentos: [
              { departamento: 'Engenharia', funcionarios: 3, totalLiquido: 30000 },
              { departamento: 'RH', funcionarios: 2, totalLiquido: 12000 },
            ],
            totalGeral: 42000,
            anomalias: [
              {
                id: 1,
                funcionario: 'Maria',
                competencia: '2026-05',
                salarioBase: 5000,
                bonus: 0,
                descontos: 0,
                salarioLiquido: 4000,
                liquidoEsperado: 5000,
              },
            ],
          },
        }),
      ),
    ),
  );
  renderizar();
  expect(await screen.findByText('Engenharia')).toBeInTheDocument();
  expect(screen.getByText('RH')).toBeInTheDocument();
  expect(screen.getByText(/Anomalias \(1\)/)).toBeInTheDocument();
  expect(screen.getByText('Maria')).toBeInTheDocument();
});

test('mostra mensagem de erro quando a rota falha', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, erro: { tipo: 'interno', mensagem: 'falhou' } }), {
        status: 500,
      }),
    ),
  );
  renderizar();
  expect(await screen.findByText('falhou')).toBeInTheDocument();
});
```

- [ ] **Step 7: Atualizar `apps/web/src/areaTrabalho/AreaTrabalho.test.tsx`**

A área de trabalho agora tem 8 apps em `ORDEM_APPS` (era 7) e o atalho bespoke saiu. Ajustar a asserção do menu de contexto da área de trabalho: a contagem de itens "Abrir …" sobe de 7 para 8 (e segue havendo o item "Propriedades"). Localizar a asserção de contagem/`itens` e atualizá-la (ex.: `7` → `8` itens "Abrir "). Se o teste verificava a existência do atalho "Relatório (Folha)" como botão específico, ele continua válido (o loop agora o cria). Rodar e ajustar conforme a mensagem de falha.

- [ ] **Step 8: Suíte web + tsc + build**

Run: `cd apps/web; bunx vitest run; bunx tsc --noEmit; bunx vite build`
Expected: tudo verde; tsc limpo; build OK. Ajustar qualquer outro teste que fixe a lista de apps (ex.: algum teste de `registroApps`/`loja` que conte 7 apps → 8).

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/aplicativos/folha/ganchos.ts apps/web/src/aplicativos/folha/RelatorioFolha.tsx apps/web/src/aplicativos/folha/folha.css apps/web/src/aplicativos/folha/RelatorioFolha.test.tsx apps/web/src/areaTrabalho/tipos.ts apps/web/src/areaTrabalho/registroApps.tsx apps/web/src/areaTrabalho/AreaTrabalho.tsx apps/web/src/areaTrabalho/AreaTrabalho.test.tsx
git commit -m "feat(apps): app Relatório (Folha) — barras por departamento + anomalias, no registro/atalho"
```

---

### Task 4: Verificação final da fase + do revamp

- [ ] **Step 1: Suíte web inteira + tsc + build**

Run: `cd apps/web; bunx vitest run; bunx tsc --noEmit; bunx vite build`
Expected: tudo verde; tsc limpo; build OK.

- [ ] **Step 2: Servidor — tsc + testes (com banco, se disponível)**

Run: `cd apps/server; bunx tsc --noEmit; bun test`
Expected: tsc limpo; testes verdes **se** o SQL Server estiver no ar com o seed. Se falharem só por conexão, registrar como ambiental (rodar com o banco no ar antes do ship).

- [ ] **Step 3: Conferência visual (manual, pós-execução)**

`bun run dev:web` (+ servidor). Abrir "Relatório (Folha)" pelo atalho da área de trabalho e pelo Iniciar; confirmar barras por departamento (largura proporcional), total geral, lista de anomalias quando houver, statusbar; trocar de pele e ver as barras seguirem o acento (gloss no Aero, chapado no 98). Registrar pendência humana.

- [ ] **Step 4: Fechamento do revamp**

Confirmar que as 6 fases (0–5) estão verdes e commitadas. Esta é a última fase do design `2026-06-08-revamp-tema-dois-peles-design.md`. Seguir o handoff de finalização (skill de finishing-a-development-branch, se disponível): revisar o diff do branch, e apresentar opções de merge/PR ao usuário.

---

### Self-review (preenchido)

**1. Cobertura do spec (Fase 5 = Relatório/Folha, único build novo):** backend — rota `/api/folha/relatorio` agregando `vw_FolhaResumo` + `vw_AnomaliasFolha` (Task 2) ✓; tipos compartilhados (`FolhaResumoDepartamento`/`AnomaliaFolha`/`RelatorioFolha`) (Task 1) ✓; componente de barras horizontais por departamento + lista de anomalias (Task 3) ✓; registro/ícones de área de trabalho e Iniciar (`relatorio` em `TipoApp`/`registroApps`/`ORDEM_APPS`, atalho repontado) (Task 3) ✓; testes de rota + de componente (Tasks 2,3) ✓. É o único item não-restyle, com backend — confirmado.

**2. Sem placeholders:** todas as queries, rota, hook, componente, CSS e testes têm código concreto; o único ponto "verifique o padrão" (lazy vs import direto no `registroApps`) tem instrução explícita de espelhar o arquivo.

**3. Consistência de tipos/nomes:** `RelatorioFolha`/`FolhaResumoDepartamento`/`AnomaliaFolha`/`RespostaRelatorioFolha` idênticos entre `shared/folha.ts`, `consultasFolha.ts`, `rotas/folha.ts`, `ganchos.ts` e `RelatorioFolha.tsx`; rota `/api/folha/relatorio` igual no servidor e no hook; `obterRelatorioFolha`/`registrarRotasFolha`/`useRelatorioFolha` coerentes; `relatorio` em `TipoApp` casa com a entrada de `registroApps` e `ORDEM_APPS`; reuso de `formatarMoeda` (Fase 4). ✓
</content>
</invoke>
