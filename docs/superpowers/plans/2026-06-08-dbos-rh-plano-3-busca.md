# DBOS RH — Plano 3: Busca (Search Companion) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a janela **Busca** (estilo Win98 Search Companion): painel de critérios à esquerda (Nome, Departamento, Salário, Projeto, Relacionado a) e painel de resultados à direita com funcionários e ações. O backend de busca já existe (Plano 1, `GET /api/busca/funcionarios`); este plano entrega o frontend + dois pequenos endpoints de domínio (listas para os selects).

**Architecture:** Novo app do WM `busca` (novo `tipoApp`, registrado em `registroApps` → atalho/menu Iniciar automáticos). O formulário monta `FiltrosBusca` e dispara `useBusca` (TanStack Query, habilitada após "Pesquisar"). Os selects de Departamento/Projeto vêm de dois endpoints novos `/api/dominio/departamentos` e `/api/dominio/projetos`; o select "Relacionado a" reusa `/api/busca/funcionarios` (lista completa). Cada resultado oferece **"Abrir na grade"** (`abrirJanela('grade', { esquema:'dbo', tabela:'Funcionarios' })`).

**Tech Stack:** React 18, TanStack Query, Zustand, 98.css, Vitest + RTL; servidor Fastify (2 endpoints de listagem). pt-BR; `tsc --noEmit` limpo é gate.

**Builds on Planos 1–2 + Fases 0–7:** `FiltrosBusca`/`esquemaBusca`/`Funcionario`/`Departamento`/`Projeto` (shared, Plano 1); `GET /api/busca/funcionarios` (Plano 1); `requisitar<T>`; WM (`registroApps`, `ORDEM_APPS`, `useLoja.abrirJanela`); padrão de app `ComponentType<PropsApp>`.

---

### Decisões deste plano

- **Ação "Ver relacionamentos" adiada para o Plano 4.** Ela abre o app `relacionamentos`, que ainda não existe; abri-lo agora quebraria (`registroApps['relacionamentos']` indefinido). O Plano 4 cria o app de Relacionamentos **e** adiciona esse botão à Busca. Nesta entrega cada resultado tem **"Abrir na grade"** (que já funciona). *(O filtro "Relacionado a" — critério de busca — entra normalmente: ele usa o endpoint de busca do Plano 1, independente do app de Relacionamentos.)*
- **Dois endpoints de domínio** (`/api/dominio/departamentos`, `/api/dominio/projetos`) para popular os selects; o select "Relacionado a" reusa a busca de funcionários sem filtros.
- **Novo `tipoApp` `busca`** entra em `ORDEM_APPS` (posição 2). Isso faz o menu de contexto do desktop passar de 4 → 5 itens (o teste do `AreaTrabalho` é atualizado).

---

### File structure for this plan

**`packages/shared/src`**
- Modify `dominio.ts` — `RespostaDepartamentos`, `RespostaProjetos`.

**`apps/server/src`**
- Create `bd/consultasDominio.ts` — `listarDepartamentos`, `listarProjetos`.
- Create `rotas/dominio.ts` — `registrarRotasDominio`.
- Modify `app.ts` — registrar a rota no contexto autenticado.
- Test `rotas/dominio.test.ts` — integração contra o seed.

**`apps/web/src/aplicativos/busca/`**
- Create `ganchos.ts` — `useDepartamentos`, `useProjetos`, `useFuncionarios`, `useBusca`.
- Create `Busca.tsx` — a janela.
- Create `busca.css`.
- Test `Busca.test.tsx`.

**`apps/web/src/areaTrabalho/`**
- Modify `tipos.ts` — `TipoApp` ganha `'busca'`.
- Modify `registroApps.tsx` — entrada `busca` + `ORDEM_APPS`.
- Modify `AreaTrabalho.test.tsx` — menu do desktop agora com 5 itens.

**`README.md`** — Modify.

---

### Task 0: Servidor — endpoints de domínio (departamentos/projetos) + integração (TDD)

**Files:**
- Modify: `packages/shared/src/dominio.ts`
- Create: `apps/server/src/bd/consultasDominio.ts`
- Create: `apps/server/src/rotas/dominio.ts`
- Modify: `apps/server/src/app.ts`
- Test: `apps/server/src/rotas/dominio.test.ts`

- [ ] **Step 1: Acrescentar tipos de resposta em `packages/shared/src/dominio.ts`**

Adicione o import no topo e os dois aliases ao final:

```ts
import type { Resposta } from './respostas';
```

```ts
export type RespostaDepartamentos = Resposta<Departamento[]>;
export type RespostaProjetos = Resposta<Projeto[]>;
```

- [ ] **Step 2: Escrever o teste que falha `apps/server/src/rotas/dominio.test.ts`**

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
    const r = await fetch(`${base}/api/dominio/departamentos`);
    expect(r.status).toBe(401);
  });
});

test('lista os 3 departamentos do seed', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/dominio/departamentos`, { headers: { cookie } });
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    const nomes = dados.map((d: { nome: string }) => d.nome);
    expect(dados.length).toBe(3);
    expect(nomes).toContain('Engenharia');
  });
});

test('lista os 3 projetos do seed', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/dominio/projetos`, { headers: { cookie } });
    const { dados } = await r.json();
    expect(dados.length).toBe(3);
    expect(dados.map((p: { nome: string }) => p.nome)).toContain('DBOS');
  });
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/dominio.test.ts`
Expected: FAIL — rota inexistente (404) / compilação após o Step 6.

- [ ] **Step 4: Implementar `apps/server/src/bd/consultasDominio.ts`**

```ts
import type { ConnectionPool } from 'mssql';
import type { Departamento, Projeto } from '@dbos/shared';

export async function listarDepartamentos(pool: ConnectionPool): Promise<Departamento[]> {
  const r = await pool
    .request()
    .query<Departamento>(`SELECT id, nome, centroCusto FROM dbo.Departamentos ORDER BY nome`);
  return r.recordset;
}

export async function listarProjetos(pool: ConnectionPool): Promise<Projeto[]> {
  const r = await pool
    .request()
    .query<Projeto>(`SELECT id, nome, status, dataInicio FROM dbo.Projetos ORDER BY nome`);
  return r.recordset;
}
```

- [ ] **Step 5: Implementar `apps/server/src/rotas/dominio.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import type { RespostaDepartamentos, RespostaProjetos } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { listarDepartamentos, listarProjetos } from '../bd/consultasDominio';

export function registrarRotasDominio(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get(
    '/api/dominio/departamentos',
    { preHandler: autenticar },
    async (req): Promise<RespostaDepartamentos> => {
      return { ok: true, dados: await listarDepartamentos(req.sessao!.pool) };
    },
  );

  app.get(
    '/api/dominio/projetos',
    { preHandler: autenticar },
    async (req): Promise<RespostaProjetos> => {
      return { ok: true, dados: await listarProjetos(req.sessao!.pool) };
    },
  );
}
```

- [ ] **Step 6: Registrar no contexto autenticado em `apps/server/src/app.ts`**

Import no topo:

```ts
import { registrarRotasDominio } from './rotas/dominio';
```

Dentro do `app.register(async (instancia) => { ... })`, após `registrarRotasRelacionamentos(instancia, gerenciador);`:

```ts
    registrarRotasDominio(instancia, gerenciador);
```

- [ ] **Step 7: Rodar a integração e a suíte do servidor**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/dominio.test.ts`
Expected: PASS — 3 testes.

Run: `bun --filter @dbos/server test`
Expected: PASS — tudo.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/dominio.ts apps/server/src/bd/consultasDominio.ts apps/server/src/rotas/dominio.ts apps/server/src/rotas/dominio.test.ts apps/server/src/app.ts
git commit -m "feat(server): endpoints de domínio (departamentos/projetos)"
```

---

### Task 1: Web — ganchos + janela Busca (TDD)

**Files:**
- Create: `apps/web/src/aplicativos/busca/ganchos.ts`
- Create: `apps/web/src/aplicativos/busca/Busca.tsx`
- Create: `apps/web/src/aplicativos/busca/busca.css`
- Test: `apps/web/src/aplicativos/busca/Busca.test.tsx`

- [ ] **Step 1: Implementar `apps/web/src/aplicativos/busca/ganchos.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import type { Departamento, FiltrosBusca, Funcionario, Projeto } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

export function useDepartamentos() {
  return useQuery({
    queryKey: ['dominio', 'departamentos'],
    queryFn: async (): Promise<Departamento[]> => {
      const r = await requisitar<Departamento[]>('/api/dominio/departamentos');
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}

export function useProjetos() {
  return useQuery({
    queryKey: ['dominio', 'projetos'],
    queryFn: async (): Promise<Projeto[]> => {
      const r = await requisitar<Projeto[]>('/api/dominio/projetos');
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}

// Lista completa de funcionários (para o select "Relacionado a").
export function useFuncionarios() {
  return useQuery({
    queryKey: ['busca', 'todos'],
    queryFn: async (): Promise<Funcionario[]> => {
      const r = await requisitar<Funcionario[]>('/api/busca/funcionarios');
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}

export function useBusca(filtros: FiltrosBusca, habilitado: boolean) {
  return useQuery({
    queryKey: ['busca', 'resultado', filtros],
    enabled: habilitado,
    queryFn: async (): Promise<Funcionario[]> => {
      const params = new URLSearchParams();
      for (const [chave, valor] of Object.entries(filtros)) {
        if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor));
      }
      const r = await requisitar<Funcionario[]>(`/api/busca/funcionarios?${params.toString()}`);
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}
```

- [ ] **Step 2: Escrever o teste que falha `apps/web/src/aplicativos/busca/Busca.test.tsx`**

```tsx
import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Busca } from './Busca';
import { useLoja, estadoInicial } from '../../areaTrabalho/loja';

beforeEach(() => useLoja.setState(estadoInicial()));
afterEach(() => vi.unstubAllGlobals());

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('/api/dominio/departamentos')) {
        return new Response(JSON.stringify({ ok: true, dados: [{ id: 1, nome: 'Engenharia', centroCusto: 'CC-100' }] }));
      }
      if (u.includes('/api/dominio/projetos')) {
        return new Response(JSON.stringify({ ok: true, dados: [{ id: 1, nome: 'DBOS', status: 'Ativo', dataInicio: null }] }));
      }
      // /api/busca/funcionarios (com ou sem querystring)
      return new Response(
        JSON.stringify({
          ok: true,
          dados: [
            { id: 1, nome: 'Felipe Bueno', cargo: 'Dev Sr', salario: 12000, dataAdmissao: null, departamentoId: 1, departamento: 'Engenharia' },
          ],
        }),
      );
    }),
  );
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <Busca />
    </QueryClientProvider>,
  );
}

test('popula o select de departamentos', async () => {
  stub();
  renderizar();
  expect(await screen.findByText('Engenharia')).toBeInTheDocument();
});

test('pesquisar mostra resultados e "Abrir na grade" abre a Grade', async () => {
  stub();
  renderizar();
  fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));
  // "Felipe Bueno" também aparece como <option> no select "Relacionado a";
  // restringimos a asserção à tabela de resultados.
  const tabela = await screen.findByRole('table');
  expect(within(tabela).getByText('Felipe Bueno')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir na grade' }));
  const janela = useLoja.getState().janelas.find((j) => j.tipoApp === 'grade');
  expect(janela).toBeDefined();
  expect(janela!.dados).toEqual({ esquema: 'dbo', tabela: 'Funcionarios' });
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/busca/Busca.test.tsx`
Expected: FAIL — `Cannot find module './Busca'`.

- [ ] **Step 4: Implementar `apps/web/src/aplicativos/busca/Busca.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import type { FiltrosBusca } from '@dbos/shared';
import { useLoja } from '../../areaTrabalho/loja';
import { useBusca, useDepartamentos, useFuncionarios, useProjetos } from './ganchos';
import './busca.css';

export function Busca() {
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const departamentos = useDepartamentos();
  const projetos = useProjetos();
  const funcionarios = useFuncionarios();

  const [nome, setNome] = useState('');
  const [departamentoId, setDepartamentoId] = useState('');
  const [salarioOp, setSalarioOp] = useState('');
  const [salario, setSalario] = useState('');
  const [projetoId, setProjetoId] = useState('');
  const [relacionadoA, setRelacionadoA] = useState('');

  const [filtros, setFiltros] = useState<FiltrosBusca>({});
  const [pesquisou, setPesquisou] = useState(false);
  const consulta = useBusca(filtros, pesquisou);

  function pesquisar(evento: FormEvent) {
    evento.preventDefault();
    const f: FiltrosBusca = {};
    if (nome) f.nome = nome;
    if (departamentoId) f.departamentoId = Number(departamentoId);
    if (salarioOp && salario) {
      f.salarioOp = salarioOp as FiltrosBusca['salarioOp'];
      f.salario = Number(salario);
    }
    if (projetoId) f.projetoId = Number(projetoId);
    if (relacionadoA) f.relacionadoA = Number(relacionadoA);
    setFiltros(f);
    setPesquisou(true);
  }

  return (
    <div className="busca">
      <form className="busca-criterios" onSubmit={pesquisar}>
        <fieldset>
          <legend>Pesquisar funcionários</legend>
          <div className="field-row-stacked">
            <label htmlFor="b-nome">Nome contém</label>
            <input id="b-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field-row-stacked">
            <label htmlFor="b-dep">Departamento</label>
            <select id="b-dep" value={departamentoId} onChange={(e) => setDepartamentoId(e.target.value)}>
              <option value="">(qualquer)</option>
              {(departamentos.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
          <div className="field-row-stacked">
            <label htmlFor="b-salop">Salário</label>
            <div className="field-row">
              <select id="b-salop" value={salarioOp} onChange={(e) => setSalarioOp(e.target.value)}>
                <option value="">(ignorar)</option>
                <option value="gt">&gt;</option>
                <option value="lt">&lt;</option>
                <option value="eq">=</option>
              </select>
              <input
                aria-label="Valor do salário"
                type="number"
                value={salario}
                onChange={(e) => setSalario(e.target.value)}
              />
            </div>
          </div>
          <div className="field-row-stacked">
            <label htmlFor="b-proj">Projeto</label>
            <select id="b-proj" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
              <option value="">(qualquer)</option>
              {(projetos.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="field-row-stacked">
            <label htmlFor="b-rel">Relacionado a</label>
            <select id="b-rel" value={relacionadoA} onChange={(e) => setRelacionadoA(e.target.value)}>
              <option value="">(ninguém)</option>
              {(funcionarios.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>
          <div className="field-row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="submit">Pesquisar</button>
          </div>
        </fieldset>
      </form>

      <div className="busca-resultados">
        {!pesquisou ? (
          <p style={{ padding: 8 }}>Defina os critérios e clique em Pesquisar.</p>
        ) : consulta.isPending ? (
          <p style={{ padding: 8 }}>Pesquisando…</p>
        ) : consulta.isError ? (
          <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>
        ) : (consulta.data ?? []).length === 0 ? (
          <p style={{ padding: 8 }}>Nenhum funcionário encontrado.</p>
        ) : (
          <table className="busca-tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Departamento</th>
                <th>Salário</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(consulta.data ?? []).map((f) => (
                <tr key={f.id}>
                  <td>{f.nome}</td>
                  <td>{f.cargo}</td>
                  <td>{f.departamento}</td>
                  <td>{f.salario}</td>
                  <td>
                    <button onClick={() => abrirJanela('grade', { esquema: 'dbo', tabela: 'Funcionarios' })}>
                      Abrir na grade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Criar `apps/web/src/aplicativos/busca/busca.css`**

```css
.busca {
  display: flex;
  height: 100%;
}
.busca-criterios {
  width: 220px;
  flex-shrink: 0;
  padding: 8px;
  overflow: auto;
  border-right: 1px solid grey;
}
.busca-criterios select,
.busca-criterios input {
  width: 100%;
  box-sizing: border-box;
}
.busca-resultados {
  flex: 1;
  overflow: auto;
  background: #fff;
}
.busca-tabela {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}
.busca-tabela th,
.busca-tabela td {
  border: 1px solid #c0c0c0;
  padding: 2px 6px;
  text-align: left;
  white-space: nowrap;
}
.busca-tabela thead th {
  position: sticky;
  top: 0;
  background: #c0c0c0;
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/busca/Busca.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/aplicativos/busca/ganchos.ts apps/web/src/aplicativos/busca/Busca.tsx apps/web/src/aplicativos/busca/busca.css apps/web/src/aplicativos/busca/Busca.test.tsx
git commit -m "feat(web): janela de Busca (Search Companion) + ganchos"
```

---

### Task 2: Registrar o app `busca` no WM

**Files:**
- Modify: `apps/web/src/areaTrabalho/tipos.ts`
- Modify: `apps/web/src/areaTrabalho/registroApps.tsx`
- Modify: `apps/web/src/areaTrabalho/AreaTrabalho.test.tsx`

- [ ] **Step 1: Adicionar `'busca'` ao `TipoApp` em `apps/web/src/areaTrabalho/tipos.ts`**

```ts
export type TipoApp = 'consulta' | 'explorador' | 'grade' | 'propriedades' | 'busca';
```

- [ ] **Step 2: Registrar o app em `apps/web/src/areaTrabalho/registroApps.tsx`**

Acrescente o import:

```tsx
import { Busca } from '../aplicativos/busca/Busca';
```

Adicione a entrada `busca` ao `registroApps` (o `Record<TipoApp, ...>` exige todas as chaves):

```tsx
  busca: {
    titulo: 'Buscar',
    icone: '🔎',
    tamanhoInicial: { largura: 600, altura: 440 },
    componente: Busca,
  },
```

E inclua em `ORDEM_APPS` (posição 2):

```tsx
export const ORDEM_APPS: TipoApp[] = ['explorador', 'busca', 'consulta', 'grade', 'propriedades'];
```

- [ ] **Step 3: Atualizar o teste do desktop em `apps/web/src/areaTrabalho/AreaTrabalho.test.tsx`**

O menu de contexto do desktop agora tem 5 itens. Troque o teste:

```tsx
test('botão direito no fundo do desktop abre menu com os 5 apps', () => {
  const { container } = renderizar();
  const desktop = container.querySelector('.area-trabalho') as HTMLElement;
  fireEvent.contextMenu(desktop);
  const rotulos = useMenuContexto.getState().itens.map((i) => i.rotulo);
  expect(rotulos).toHaveLength(5);
  expect(rotulos.some((r) => r.includes('Explorador de Objetos'))).toBe(true);
});
```

- [ ] **Step 4: Checar tipos e rodar a suíte web**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros (a entrada `busca` satisfaz o `Record<TipoApp, DefinicaoApp>`).

Run: `bun --filter @dbos/web test`
Expected: PASS — tudo, incluindo `Busca` (2) e `AreaTrabalho` (3, com o menu de 5).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/tipos.ts apps/web/src/areaTrabalho/registroApps.tsx apps/web/src/areaTrabalho/AreaTrabalho.test.tsx
git commit -m "feat(web): registra o app Busca no gerenciador de janelas"
```

---

### Task 3: Verificação completa + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Checar tipos do web (garantia)**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 2: Documentar a Busca no `README.md`**

Acrescente, na seção do desktop, uma linha:

```markdown

O app **Buscar** (estilo Search Companion) pesquisa funcionários por nome,
departamento, salário, projeto e por relacionamento (colegas de depto/projeto);
cada resultado tem **Abrir na grade**.
```

- [ ] **Step 3: Rodar a suíte inteira do monorepo**

Run: `bun run test`
Expected: tudo verde — `@dbos/shared`, `@dbos/server` (+ dominio 3), `@dbos/web` (+ Busca 2; AreaTrabalho com menu de 5). Pré-requisito: `bun run db:setup`. Falhas SÓ por conexão SQL = ambiente.

- [ ] **Step 4: Verificar no navegador**

Em dois terminais:
```bash
bun run dev:server   # :3001
bun run dev:web      # :5173
```
Abra **Buscar** (atalho/menu Iniciar). Confirme: os selects de Departamento/Projeto/"Relacionado a" carregam; pesquisar por `salário > 10000` traz Felipe e os demais acima de 10000; filtrar por departamento ou projeto funciona; "Relacionado a Felipe" traz colegas; "Abrir na grade" abre a Grade em Funcionarios.

Pare ambos com Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README — app Busca (Plano 3)"
```

---

## Self-Review

**Spec coverage (Plano 3 / spec §5.1, §10.3):**
- Janela Busca estilo Search Companion, dois painéis (spec §5.1) → Task 1. ✓
- Critérios Nome / Departamento / Salário / Projeto / Relacionado a (spec §5.1) → Task 1 (form) + Plano 1 (`/api/busca` já suporta os filtros, incl. `relacionadoA`). ✓
- Resultado com "Abrir na grade" (spec §5.1) → Task 1. ✓ ("Ver relacionamentos" entra no Plano 4 — ver Decisões.)
- App registrado como entrada genérica do WM (spec §4.2) → Task 2. ✓
- Endpoints de domínio para os selects → Task 0. ✓
- Integração determinística contra o seed (spec §9) → `dominio.test.ts` (3 deptos, 3 projetos). ✓

**Placeholder scan:** Sem TBD/TODO; código completo em cada passo.

**Type consistency:** `RespostaDepartamentos`/`RespostaProjetos` (Task 0) usados em `rotas/dominio`. `FiltrosBusca`/`Funcionario`/`Departamento`/`Projeto` (shared, Plano 1) usados em ganchos e na janela. `Busca` sem parâmetro é atribuível a `ComponentType<PropsApp>`. `TipoApp` ganha `'busca'`; `registroApps` (Record) exige e fornece a entrada; `ORDEM_APPS` inclui `'busca'` → menu do desktop com 5 (teste atualizado). `abrirJanela('grade', { esquema, tabela })` é o formato que `GradeDados.refInicial` lê. ✓

**Riscos/observações:**
- A ação **"Ver relacionamentos"** fica para o Plano 4 (o app `relacionamentos` ainda não existe); o filtro **"Relacionado a"** entra agora (é critério de busca, atendido pelo `/api/busca` do Plano 1).
- Adicionar `'busca'` ao `ORDEM_APPS` muda a contagem do menu de contexto do desktop (4 → 5); o teste do `AreaTrabalho` é atualizado no mesmo passo.
- `useFuncionarios` reusa `/api/busca/funcionarios` sem filtros para popular o select "Relacionado a" — sem endpoint novo para isso.
- Datas (`Projeto.dataInicio`) vêm como ISO via JSON (mesmo padrão das fases anteriores).
