# DBOS RH — Plano 4: Relacionamentos (grafo navegável) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a janela **Relacionamentos** — um explorador de rede retrô, **navegável**: nó central (entidade em foco) + nós relacionados ligados por linhas; clicar num nó re-centraliza o grafo nele, com **pilha de "Voltar"**. Também conclui a pendência do Plano 3: o botão **"Ver relacionamentos"** na Busca (agora que o app existe).

**Architecture:** Novo app do WM `relacionamentos` (novo `tipoApp`). Recebe `janela.dados = { tipo, id }`; sem dados, mostra um seletor de funcionário (reusa `useFuncionarios` da Busca). O grafo vem de `GET /api/relacionamentos?tipo=&id=` (já existe, Plano 1) via `useGrafo`. Render: um **canvas** com os nós como caixas 98.css **absolutamente posicionadas** (layout radial calculado no cliente — centro + filhos num círculo) e uma camada **SVG** atrás desenhando as linhas. Nós de tipo `funcionario`/`departamento`/`projeto` são clicáveis e re-centralizam (push no histórico); `folha` e o nó central ficam inertes. "◀ Voltar" desempilha.

**Tech Stack:** React 18, TanStack Query, Zustand, SVG, 98.css, Vitest + RTL. Sem mudança de servidor (o endpoint é do Plano 1). pt-BR; `tsc --noEmit` limpo é gate.

**Builds on Planos 1–3 + Fases 0–7:** `GrafoRelacionamentos`/`NoGrafo`/`ArestaGrafo`/`RefRelacionamento`/`TipoNo` (shared, Plano 1); `GET /api/relacionamentos` (Plano 1); `useFuncionarios` (`aplicativos/busca/ganchos.ts`, Plano 3); WM (`registroApps`, `ORDEM_APPS`, `useLoja.abrirJanela`); padrão de app `ComponentType<PropsApp>` lendo `janela.dados`.

---

### Decisões deste plano

- **Layout radial calculado no cliente** (centro + filhos num círculo de raio fixo). jsdom não mede layout, então os testes verificam rótulos dos nós e a **navegação por estado** (clicar re-centraliza; voltar), não posições.
- **Nós navegáveis:** `funcionario`/`departamento`/`projeto` (o id do nó é `"tipo:id"`). `folha` e o nó central ficam desabilitados.
- **Sem dados → seletor** de funcionário (reusa `useFuncionarios`, Plano 3).
- **`tipoApp` `relacionamentos`** entra em `ORDEM_APPS` (posição final) → menu de contexto do desktop passa de 5 → 6 (teste do `AreaTrabalho` atualizado).
- **Busca ganha "Ver relacionamentos"** por resultado (pendência do Plano 3), abrindo `relacionamentos` com `{ tipo:'funcionario', id }`.

---

### File structure for this plan

**`apps/web/src/aplicativos/relacionamentos/`**
- Create `ganchos.ts` — `useGrafo`.
- Create `Relacionamentos.tsx` — a janela (seletor + grafo navegável).
- Create `relacionamentos.css`.
- Test `Relacionamentos.test.tsx`.

**`apps/web/src/areaTrabalho/`**
- Modify `tipos.ts` — `TipoApp` ganha `'relacionamentos'`.
- Modify `registroApps.tsx` — entrada `relacionamentos` + `ORDEM_APPS`.
- Modify `AreaTrabalho.test.tsx` — menu do desktop com 6 itens.

**`apps/web/src/aplicativos/busca/`**
- Modify `Busca.tsx` — botão "Ver relacionamentos" por resultado.
- Modify `Busca.test.tsx` — assertar a ação.

**`README.md`** — Modify.

---

### Task 0: Web — janela Relacionamentos (grafo navegável) (TDD)

**Files:**
- Create: `apps/web/src/aplicativos/relacionamentos/ganchos.ts`
- Create: `apps/web/src/aplicativos/relacionamentos/Relacionamentos.tsx`
- Create: `apps/web/src/aplicativos/relacionamentos/relacionamentos.css`
- Test: `apps/web/src/aplicativos/relacionamentos/Relacionamentos.test.tsx`

- [ ] **Step 1: Implementar `apps/web/src/aplicativos/relacionamentos/ganchos.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import type { GrafoRelacionamentos, RefRelacionamento } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

export function useGrafo(ref: RefRelacionamento) {
  return useQuery({
    queryKey: ['relacionamentos', ref.tipo, ref.id],
    queryFn: async (): Promise<GrafoRelacionamentos> => {
      const params = new URLSearchParams({ tipo: ref.tipo, id: String(ref.id) });
      const r = await requisitar<GrafoRelacionamentos>(`/api/relacionamentos?${params.toString()}`);
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
  });
}
```

- [ ] **Step 2: Escrever o teste que falha `apps/web/src/aplicativos/relacionamentos/Relacionamentos.test.tsx`**

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Relacionamentos } from './Relacionamentos';
import type { EstadoJanela } from '../../areaTrabalho/tipos';

afterEach(() => vi.unstubAllGlobals());

const GRAFO_FUNC = {
  centro: 'funcionario:1',
  nos: [
    { id: 'funcionario:1', tipo: 'funcionario', rotulo: 'Felipe Bueno' },
    { id: 'departamento:1', tipo: 'departamento', rotulo: 'Engenharia' },
    { id: 'projeto:1', tipo: 'projeto', rotulo: 'DBOS' },
  ],
  arestas: [
    { de: 'funcionario:1', para: 'departamento:1' },
    { de: 'funcionario:1', para: 'projeto:1' },
  ],
};
const GRAFO_DEP = {
  centro: 'departamento:1',
  nos: [
    { id: 'departamento:1', tipo: 'departamento', rotulo: 'Engenharia' },
    { id: 'funcionario:2', tipo: 'funcionario', rotulo: 'Ana Souza' },
  ],
  arestas: [{ de: 'departamento:1', para: 'funcionario:2' }],
};

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('/api/busca/funcionarios')) {
        return new Response(
          JSON.stringify({ ok: true, dados: [{ id: 1, nome: 'Felipe Bueno', cargo: null, salario: 0, dataAdmissao: null, departamentoId: 1 }] }),
        );
      }
      // /api/relacionamentos
      const dados = u.includes('tipo=departamento') ? GRAFO_DEP : GRAFO_FUNC;
      return new Response(JSON.stringify({ ok: true, dados }));
    }),
  );
}

function janelaFake(dados: unknown): EstadoJanela {
  return { dados } as unknown as EstadoJanela;
}

function renderizar(janela: EstadoJanela) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <Relacionamentos janela={janela} />
    </QueryClientProvider>,
  );
}

test('mostra o grafo do funcionário e navega ao clicar num nó', async () => {
  stub();
  renderizar(janelaFake({ tipo: 'funcionario', id: 1 }));
  expect(await screen.findByText(/Felipe Bueno/)).toBeInTheDocument();
  expect(screen.getByText(/Engenharia/)).toBeInTheDocument();
  expect(screen.getByText(/DBOS/)).toBeInTheDocument();

  // navega para o departamento
  fireEvent.click(screen.getByRole('button', { name: /Engenharia/ }));
  expect(await screen.findByText(/Ana Souza/)).toBeInTheDocument();

  // volta
  fireEvent.click(screen.getByRole('button', { name: /Voltar/ }));
  expect(await screen.findByText(/DBOS/)).toBeInTheDocument();
});

test('sem dados, mostra o seletor de funcionário', async () => {
  stub();
  renderizar(janelaFake(null));
  expect(await screen.findByText(/Escolha um funcionário/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Felipe Bueno/ }));
  expect(await screen.findByText(/Engenharia/)).toBeInTheDocument();
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/aplicativos/relacionamentos/Relacionamentos.test.tsx`
Expected: FAIL — `Cannot find module './Relacionamentos'`.

- [ ] **Step 4: Implementar `apps/web/src/aplicativos/relacionamentos/Relacionamentos.tsx`**

```tsx
import { useState } from 'react';
import type { GrafoRelacionamentos, RefRelacionamento, TipoNo } from '@dbos/shared';
import type { EstadoJanela, PropsApp } from '../../areaTrabalho/tipos';
import { useFuncionarios } from '../busca/ganchos';
import { useGrafo } from './ganchos';
import './relacionamentos.css';

const NAVEGAVEIS: TipoNo[] = ['funcionario', 'departamento', 'projeto'];
const ICONE: Record<TipoNo, string> = {
  funcionario: '👤',
  departamento: '🏢',
  projeto: '📁',
  folha: '🧾',
};

function refInicial(janela: EstadoJanela): RefRelacionamento | null {
  const d = janela.dados as { tipo?: unknown; id?: unknown } | null | undefined;
  if (
    d &&
    (d.tipo === 'funcionario' || d.tipo === 'departamento' || d.tipo === 'projeto') &&
    typeof d.id === 'number'
  ) {
    return { tipo: d.tipo, id: d.id };
  }
  return null;
}

export function Relacionamentos({ janela }: PropsApp) {
  const [foco, setFoco] = useState<RefRelacionamento | null>(() => refInicial(janela));
  const [historico, setHistorico] = useState<RefRelacionamento[]>([]);

  if (!foco) return <Seletor aoEscolher={(r) => setFoco(r)} />;

  function navegar(r: RefRelacionamento) {
    setHistorico((h) => [...h, foco!]);
    setFoco(r);
  }
  function voltar() {
    if (historico.length === 0) return;
    const anterior = historico[historico.length - 1]!;
    setHistorico(historico.slice(0, -1));
    setFoco(anterior);
  }

  return <Grafo foco={foco} podeVoltar={historico.length > 0} aoNavegar={navegar} aoVoltar={voltar} />;
}

function Seletor({ aoEscolher }: { aoEscolher: (r: RefRelacionamento) => void }) {
  const consulta = useFuncionarios();
  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando…</p>;
  if (consulta.isError) return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;
  return (
    <div style={{ padding: 8 }}>
      <p>Escolha um funcionário:</p>
      <ul className="tree-view">
        {(consulta.data ?? []).map((f) => (
          <li key={f.id}>
            <button onClick={() => aoEscolher({ tipo: 'funcionario', id: f.id })}>👤 {f.nome}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const LARGURA = 640;
const ALTURA = 400;
const RAIO = 150;

function Grafo({
  foco,
  podeVoltar,
  aoNavegar,
  aoVoltar,
}: {
  foco: RefRelacionamento;
  podeVoltar: boolean;
  aoNavegar: (r: RefRelacionamento) => void;
  aoVoltar: () => void;
}) {
  const consulta = useGrafo(foco);
  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando grafo…</p>;
  if (consulta.isError) return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;

  const g: GrafoRelacionamentos = consulta.data;
  const cx = LARGURA / 2;
  const cy = ALTURA / 2;
  const filhos = g.nos.filter((n) => n.id !== g.centro);
  const pos = new Map<string, { x: number; y: number }>();
  pos.set(g.centro, { x: cx, y: cy });
  filhos.forEach((n, i) => {
    const ang = (2 * Math.PI * i) / Math.max(filhos.length, 1) - Math.PI / 2;
    pos.set(n.id, { x: cx + RAIO * Math.cos(ang), y: cy + RAIO * Math.sin(ang) });
  });
  const central = g.nos.find((n) => n.id === g.centro);

  return (
    <div className="rel">
      <div className="rel-barra">
        <button onClick={aoVoltar} disabled={!podeVoltar}>
          ◀ Voltar
        </button>
        <strong>{central?.rotulo}</strong>
      </div>
      <div className="rel-canvas" style={{ width: LARGURA, height: ALTURA }}>
        <svg className="rel-linhas" width={LARGURA} height={ALTURA}>
          {g.arestas.map((a, i) => {
            const de = pos.get(a.de);
            const para = pos.get(a.para);
            if (!de || !para) return null;
            return <line key={i} x1={de.x} y1={de.y} x2={para.x} y2={para.y} stroke="#808080" />;
          })}
        </svg>
        {g.nos.map((n) => {
          const p = pos.get(n.id)!;
          const navegavel = NAVEGAVEIS.includes(n.tipo) && n.id !== g.centro;
          return (
            <button
              key={n.id}
              className={`rel-no ${n.id === g.centro ? 'rel-centro' : ''}`}
              style={{ left: p.x, top: p.y }}
              disabled={!navegavel}
              onClick={() => {
                if (!navegavel) return;
                const idStr = n.id.split(':')[1] ?? '';
                aoNavegar({ tipo: n.tipo as RefRelacionamento['tipo'], id: Number(idStr) });
              }}
            >
              <span aria-hidden="true">{ICONE[n.tipo]}</span> {n.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Criar `apps/web/src/aplicativos/relacionamentos/relacionamentos.css`**

```css
.rel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.rel-barra {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  border-bottom: 1px solid grey;
}
.rel-canvas {
  position: relative;
  flex: 1;
  overflow: auto;
  background: #fff;
}
.rel-linhas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
.rel-no {
  position: absolute;
  transform: translate(-50%, -50%);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.rel-centro {
  font-weight: bold;
  box-shadow: inset -1px -1px #fff, inset 1px 1px grey, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/relacionamentos/Relacionamentos.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/aplicativos/relacionamentos/ganchos.ts apps/web/src/aplicativos/relacionamentos/Relacionamentos.tsx apps/web/src/aplicativos/relacionamentos/relacionamentos.css apps/web/src/aplicativos/relacionamentos/Relacionamentos.test.tsx
git commit -m "feat(web): janela de Relacionamentos (grafo navegável)"
```

---

### Task 1: Registrar o app `relacionamentos` no WM

**Files:**
- Modify: `apps/web/src/areaTrabalho/tipos.ts`
- Modify: `apps/web/src/areaTrabalho/registroApps.tsx`
- Modify: `apps/web/src/areaTrabalho/AreaTrabalho.test.tsx`

- [ ] **Step 1: Adicionar `'relacionamentos'` ao `TipoApp` em `apps/web/src/areaTrabalho/tipos.ts`**

```ts
export type TipoApp =
  | 'consulta'
  | 'explorador'
  | 'grade'
  | 'propriedades'
  | 'busca'
  | 'relacionamentos';
```

- [ ] **Step 2: Registrar em `apps/web/src/areaTrabalho/registroApps.tsx`**

Import:

```tsx
import { Relacionamentos } from '../aplicativos/relacionamentos/Relacionamentos';
```

Entrada no `registroApps`:

```tsx
  relacionamentos: {
    titulo: 'Relacionamentos',
    icone: '🕸️',
    tamanhoInicial: { largura: 660, altura: 480 },
    componente: Relacionamentos,
  },
```

E em `ORDEM_APPS` (ao final):

```tsx
export const ORDEM_APPS: TipoApp[] = [
  'explorador',
  'busca',
  'consulta',
  'grade',
  'propriedades',
  'relacionamentos',
];
```

- [ ] **Step 3: Atualizar o teste do desktop em `apps/web/src/areaTrabalho/AreaTrabalho.test.tsx`**

O menu de contexto do desktop agora tem 6 itens. Troque o teste:

```tsx
test('botão direito no fundo do desktop abre menu com os 6 apps', () => {
  const { container } = renderizar();
  const desktop = container.querySelector('.area-trabalho') as HTMLElement;
  fireEvent.contextMenu(desktop);
  const rotulos = useMenuContexto.getState().itens.map((i) => i.rotulo);
  expect(rotulos).toHaveLength(6);
  expect(rotulos.some((r) => r.includes('Explorador de Objetos'))).toBe(true);
});
```

- [ ] **Step 4: Checar tipos e rodar a suíte web**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros (a entrada `relacionamentos` satisfaz o `Record<TipoApp, DefinicaoApp>`).

Run: `bun --filter @dbos/web test`
Expected: PASS — tudo, incluindo `Relacionamentos` (2) e `AreaTrabalho` (3, menu de 6).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/tipos.ts apps/web/src/areaTrabalho/registroApps.tsx apps/web/src/areaTrabalho/AreaTrabalho.test.tsx
git commit -m "feat(web): registra o app Relacionamentos no gerenciador de janelas"
```

---

### Task 2: Busca — botão "Ver relacionamentos" por resultado (pendência do Plano 3)

**Files:**
- Modify: `apps/web/src/aplicativos/busca/Busca.tsx`
- Modify: `apps/web/src/aplicativos/busca/Busca.test.tsx`

- [ ] **Step 1: Acrescentar o botão na linha de resultado em `apps/web/src/aplicativos/busca/Busca.tsx`**

Troque a célula de ações:

```tsx
                  <td>
                    <button onClick={() => abrirJanela('grade', { esquema: 'dbo', tabela: 'Funcionarios' })}>
                      Abrir na grade
                    </button>
                  </td>
```

por:

```tsx
                  <td>
                    <button
                      onClick={() => abrirJanela('relacionamentos', { tipo: 'funcionario', id: f.id })}
                    >
                      Ver relacionamentos
                    </button>{' '}
                    <button onClick={() => abrirJanela('grade', { esquema: 'dbo', tabela: 'Funcionarios' })}>
                      Abrir na grade
                    </button>
                  </td>
```

- [ ] **Step 2: Acrescentar o teste em `apps/web/src/aplicativos/busca/Busca.test.tsx`**

Adicione ao final do arquivo (o `stub`/`renderizar` já existem no arquivo):

```tsx
test('"Ver relacionamentos" abre o app de Relacionamentos do funcionário', async () => {
  stub();
  renderizar();
  fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));
  await screen.findByRole('table');
  fireEvent.click(screen.getByRole('button', { name: 'Ver relacionamentos' }));
  const janela = useLoja.getState().janelas.find((j) => j.tipoApp === 'relacionamentos');
  expect(janela).toBeDefined();
  expect(janela!.dados).toEqual({ tipo: 'funcionario', id: 1 });
});
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/aplicativos/busca/Busca.test.tsx`
Expected: PASS — 3 testes (os 2 anteriores + o novo).

- [ ] **Step 4: Checar tipos e rodar a suíte web**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros (`'relacionamentos'` é `tipoApp` válido após o Task 1).

Run: `bun --filter @dbos/web test`
Expected: PASS — tudo.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/aplicativos/busca/Busca.tsx apps/web/src/aplicativos/busca/Busca.test.tsx
git commit -m "feat(web): Busca abre Relacionamentos do funcionário (Ver relacionamentos)"
```

---

### Task 3: Verificação completa + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Checar tipos do web (garantia)**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 2: Documentar Relacionamentos no `README.md`**

Acrescente, na seção do desktop:

```markdown

O app **Relacionamentos** mostra um grafo navegável de um funcionário
(departamento, projetos, folha); clicar num nó re-centraliza o grafo nele e
"◀ Voltar" desfaz. Abre pelo atalho, pelo botão "Ver relacionamentos" na Busca,
ou (em breve) pelo Terminal.
```

- [ ] **Step 3: Rodar a suíte inteira do monorepo**

Run: `bun run test`
Expected: tudo verde — `@dbos/shared`, `@dbos/server`, `@dbos/web` (+ Relacionamentos 2; Busca 3; AreaTrabalho com menu de 6). Pré-requisito: `bun run db:setup`. Falhas SÓ por conexão SQL = ambiente.

- [ ] **Step 4: Verificar no navegador**

Em dois terminais:
```bash
bun run dev:server   # :3001
bun run dev:web      # :5173
```
Abra **Relacionamentos** (ou Busca → "Ver relacionamentos" no Felipe). Confirme:
o nó central é o funcionário, ligado a Departamento, Projetos e Folha por linhas;
clicar em "Engenharia" re-centraliza no departamento e mostra seus funcionários;
clicar num projeto mostra seus membros; "◀ Voltar" retorna; abrir sem contexto
(atalho) mostra o seletor de funcionário.

Pare ambos com Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README — app Relacionamentos (Plano 4)"
```

---

## Self-Review

**Spec coverage (Plano 4 / spec §5.2, §10.4):**
- Janela de grafo de rede retrô, nós + linhas (spec §5.2) → Task 0 (canvas + SVG). ✓
- **Navegável** (clicar re-centraliza; pilha de voltar) (spec §5.2) → Task 0 (`navegar`/`voltar`/`historico`). ✓
- Sem dados → seletor (spec §5.2) → Task 0 (`Seletor` reusa `useFuncionarios`). ✓
- App registrado como entrada genérica do WM (spec §4.2) → Task 1. ✓
- Entrada pela Busca ("Ver relacionamentos", spec §5.1) → Task 2 (pendência do Plano 3 concluída). ✓
- Reusa o endpoint `/api/relacionamentos` (Plano 1) → `useGrafo`. ✓

**Placeholder scan:** Sem TBD/TODO; código completo em cada passo.

**Type consistency:** `GrafoRelacionamentos`/`NoGrafo`/`ArestaGrafo`/`RefRelacionamento`/`TipoNo` (shared, Plano 1) usados em `useGrafo` e na janela. `Relacionamentos({ janela }: PropsApp)` lê `janela.dados` (formato `{ tipo, id }`, o mesmo que `abrirJanela('relacionamentos', …)` envia da Busca e do desktop). `TipoApp` ganha `'relacionamentos'`; `registroApps` (Record) exige/fornece a entrada; `ORDEM_APPS` inclui → menu do desktop com 6 (teste atualizado). `useFuncionarios` reusado da Busca (Plano 3). ✓

**Riscos/observações:**
- Posições dos nós são calculadas (não medidas), então os testes asseguram rótulos + navegação por estado; o visual é verificado no navegador.
- Só `funcionario`/`departamento`/`projeto` navegam; `folha` e o nó central ficam `disabled` (o id do nó `folha` é composto e o servidor não tem grafo para folha).
- Adicionar `'relacionamentos'` ao `ORDEM_APPS` muda a contagem do menu do desktop (5 → 6); o teste do `AreaTrabalho` é atualizado no mesmo passo.
- A Busca passa a ter 2 botões por linha; os nomes ("Ver relacionamentos", "Abrir na grade") seguem únicos para o `getByRole`.
- Falta só o Terminal (Plano 5) para fechar o overhaul; o `open <nome>.func` do Terminal abrirá este mesmo app.
