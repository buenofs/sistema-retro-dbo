# Revamp Visual — Fase 0: Costura (seam) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover a dependência `98.css` por trás de uma **costura `body[data-skin]`** — um módulo `tema/` próprio (tokens + `base.css` que reproduz fielmente o subconjunto do 98.css que o app usa + `<ProvedorTema>`) — **sem nenhuma regressão visual ou de comportamento**, deixando o terreno pronto para as peles Aero/98 das fases seguintes.

**Architecture:** Nasce `apps/web/src/tema/`: `tokens.css` (variáveis de design com os valores do Win98 como padrão), `base.css` (reimplementa, em tokens, as 9 classes do 98.css que o app consome + estilo de elementos `button/input/select/textarea/fieldset/legend/table/ul.tree-view` + glifos dos controles de janela via pseudo-elementos por `aria-label` + `@font-face` da fonte MS Sans Serif vendorizada), e `<ProvedorTema>` (contexto na raiz que escreve `document.body.dataset.skin` e persiste em `localStorage`). O `main.tsx` troca `import '98.css'` por `import './tema/tokens.css'; import './tema/base.css';` e envolve `<App>` no provedor. A pele padrão nesta fase é **`98`** (reproduz o visual atual); o padrão "Aero em máquina nova" entra na Fase 3, quando a pele Aero existir.

**Tech Stack:** React 18 + contexto, Vite (importa CSS de `src`, copia `url()` de fontes), Vitest + Testing Library (jsdom — ignora CSS, então os testes existentes não dependem de pixels), TypeScript estrito. pt-BR; `tsc --noEmit` limpo é gate.

**Builds on:** todo o app das Fases 0–7 + Reforma RH. Hoje o estilo vem **só** de `import '98.css'` no `main.tsx` (Inventário: 9 classes utilitárias — `window`, `window-body`, `title-bar`, `title-bar-text`, `title-bar-controls`, `field-row`, `field-row-stacked`, `tree-view` — mais o estilo padrão de `button/input/select/textarea/fieldset/legend/table`, e a fonte "Pixelated MS Sans Serif" empacotada). Os `.css` próprios de cada app/shell (ex.: `areaTrabalho.css`, `grade.css`) **não mudam nesta fase** — só serão tokenizados na Fase 4.

---

### Decisões desta fase

- **Pele padrão `98` por enquanto.** Reproduz o visual atual byte-a-byte; a troca do padrão para `aero` em máquina nova é da Fase 3 (quando a pele Aero existir). O `<ProvedorTema>` já lê/persiste a escolha e escreve `body[data-skin]`, então a costura está completa.
- **Fonte vendorizada, não dependência.** Copiamos os 4 arquivos `ms_sans_serif*.woff*` para `tema/fontes/` e declaramos `@font-face` próprio. Isso permite remover `98.css` do `package.json` sem perder a fonte pixelada.
- **Glifos dos controles via pseudo-elementos** (`button[aria-label="Close"]::before` etc.), adaptados das receitas do protótipo 9x — evita os data-URIs gigantes de SVG do 98.css e mantém o estilo autocontido. Os botões de controle do app têm conteúdo vazio + `aria-label` (ver `Janela.tsx:96-101`), então os pseudo-glifos encaixam.
- **`base.css` cobre só o subconjunto usado** (YAGNI): não reimplementamos o 98.css inteiro, apenas as classes/elementos que o Inventário apontou.
- **jsdom ignora CSS** → os testes existentes testam comportamento/classes (que continuam idênticas: `window`, `title-bar`…), logo **nenhum teste existente muda**. Só adicionamos testes do `<ProvedorTema>`.
- Pele Aero (`pele-aero.css`) e o objeto completo de tweaks **não** entram aqui (Fases 2–3). YAGNI.

---

### File structure for this plan

**`apps/web/src/tema`** (novo módulo)
- Create `fontes/ms_sans_serif.woff`, `.woff2`, `ms_sans_serif_bold.woff`, `.woff2` — fontes vendorizadas (cópia).
- Create `tokens.css` — `:root` com tokens de design (valores Win98 como padrão).
- Create `base.css` — `@font-face` + subconjunto do 98.css tokenizado (classes do app + elementos + glifos de controle).
- Create `tipos.ts` — tipo `Pele`, `TEMA_PADRAO`, `CHAVE_TEMA`.
- Create `ProvedorTema.tsx` — contexto: lê/persiste pele, escreve `body[data-skin]`.
- Create `ganchos.ts` — `useTema()`.
- Test `ProvedorTema.test.tsx`.

**`apps/web/src`**
- Modify `main.tsx` — troca `import '98.css'` por imports do tema + envolve `<App>` em `<ProvedorTema>`.

**`apps/web`**
- Modify `package.json` — remove a dependência `98.css`.

**`README.md`** — Modify (nota curta: estilo agora vem do módulo `tema/`).

---

### Task 1: Vendorizar a fonte + `tokens.css` + `base.css` (subconjunto fiel do 98.css)

**Files:**
- Create: `apps/web/src/tema/fontes/ms_sans_serif.woff` (+ `.woff2`, `_bold.woff`, `_bold.woff2`) — cópia
- Create: `apps/web/src/tema/tokens.css`
- Create: `apps/web/src/tema/base.css`

> Sem teste unitário (CSS puro). Verificação é build limpo + conferência visual ao fim da fase (Task 4).

- [ ] **Step 1: Copiar os 4 arquivos de fonte para `tema/fontes/`**

Run (a dependência `98.css` ainda está instalada nesta etapa):

```bash
mkdir -p apps/web/src/tema/fontes
cp apps/web/node_modules/98.css/dist/ms_sans_serif.woff      apps/web/src/tema/fontes/
cp apps/web/node_modules/98.css/dist/ms_sans_serif.woff2     apps/web/src/tema/fontes/
cp apps/web/node_modules/98.css/dist/ms_sans_serif_bold.woff apps/web/src/tema/fontes/
cp apps/web/node_modules/98.css/dist/ms_sans_serif_bold.woff2 apps/web/src/tema/fontes/
ls apps/web/src/tema/fontes/
```

Expected: lista os 4 arquivos (`ms_sans_serif.woff`, `ms_sans_serif.woff2`, `ms_sans_serif_bold.woff`, `ms_sans_serif_bold.woff2`).

- [ ] **Step 2: Criar `apps/web/src/tema/tokens.css`**

```css
/* ============================================================
   DBOS // tema — tokens de design.
   Fase 0: os valores padrão reproduzem o Windows 98 (pele "98").
   As peles (Fases 3+) sobrescrevem estes tokens via [data-skin].
   ============================================================ */
:root {
  /* superfícies */
  --face: #c0c0c0;
  --face-alta: #dfdfdf;
  --face-baixa: #808080;
  --janela-conteudo: #ffffff;

  /* níveis de relevo (paleta clássica 98) */
  --hi: #ffffff;     /* realce */
  --light: #dfdfdf;  /* realce interno */
  --sh: #808080;     /* sombra */
  --dsh: #0a0a0a;    /* sombra escura */

  /* tinta */
  --ink: #222222;
  --ink-suave: #3a3a3a;

  /* acento / barra de título (gradiente azul clássico) */
  --titulo-1: #000080;
  --titulo-2: #1084d0;
  --titulo-ink: #ffffff;
  --accent: #000080;
  --accent-ink: #ffffff;

  /* relevos compostos (box-shadow) */
  --relevo-out: inset -1px -1px var(--dsh), inset 1px 1px var(--hi),
    inset -2px -2px var(--sh), inset 2px 2px var(--light);
  --relevo-in: inset 1px 1px var(--dsh), inset -1px -1px var(--hi),
    inset 2px 2px var(--sh), inset -2px -2px var(--light);
  --relevo-out-fino: inset -1px -1px var(--sh), inset 1px 1px var(--hi);
  --relevo-in-fino: inset 1px 1px var(--sh), inset -1px -1px var(--hi);

  /* geometria (0 no 98; Aero usa px) */
  --round: 0px;
  --round-sm: 0px;
  --round-btn: 0px;

  /* fontes */
  --ui: "Pixelated MS Sans Serif", Arial, sans-serif;
  --mono: "JetBrains Mono", "Cascadia Code", Consolas, monospace;

  /* multiplicador de animação (Tweaks na Fase 2) */
  --motion: 1;
}
```

- [ ] **Step 3: Criar `apps/web/src/tema/base.css`**

```css
/* ============================================================
   DBOS // tema — base.css
   Reproduz, em tokens, o subconjunto do 98.css que o app usa:
   classes window/title-bar/tree-view + elementos de formulário +
   glifos dos controles de janela. Fiel ao Windows 98 (pele padrão).
   ============================================================ */

/* ---- fonte vendorizada (substitui a do pacote 98.css) ---- */
@font-face {
  font-family: "Pixelated MS Sans Serif";
  font-style: normal;
  font-weight: 400;
  src: url("./fontes/ms_sans_serif.woff2") format("woff2"),
       url("./fontes/ms_sans_serif.woff") format("woff");
}
@font-face {
  font-family: "Pixelated MS Sans Serif";
  font-style: normal;
  font-weight: 700;
  src: url("./fontes/ms_sans_serif_bold.woff2") format("woff2"),
       url("./fontes/ms_sans_serif_bold.woff") format("woff");
}

* { box-sizing: border-box; }

body {
  color: var(--ink);
  font-family: var(--ui);
  font-size: 11px;
  -webkit-font-smoothing: none;
}

/* o 98.css fixa font em vários seletores; replicamos para fidelidade */
.title-bar, .window, button, input, label, legend, option, select,
table, textarea, ul.tree-view {
  -webkit-font-smoothing: none;
  font-family: var(--ui);
  font-size: 11px;
}

/* ============================================================
   JANELA
   ============================================================ */
.window {
  background: var(--face);
  padding: 3px;
  box-shadow: var(--relevo-out);
  border-radius: var(--round);
}

.title-bar {
  background: linear-gradient(90deg, var(--titulo-1), var(--titulo-2));
  padding: 3px 2px 3px 3px;
  display: flex;
  align-items: center;
}
.title-bar-text {
  color: var(--titulo-ink);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0;
  margin-right: 24px;
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-bar-controls {
  display: flex;
  gap: 0;
}
.title-bar-controls button {
  display: grid;
  place-items: center;
  min-width: 16px;
  min-height: 14px;
  width: 16px;
  height: 14px;
  margin-left: 2px;
  padding: 0;
  position: relative;
}
/* glifos (pseudo-elementos) por aria-label — botões têm conteúdo vazio */
.title-bar-controls button[aria-label="Minimize"]::before {
  content: ""; width: 6px; height: 2px; background: #000;
  position: absolute; bottom: 3px; left: 4px;
}
.title-bar-controls button[aria-label="Maximize"]::before {
  content: ""; width: 9px; height: 8px; border: 1px solid #000; border-top-width: 2px;
}
.title-bar-controls button[aria-label="Restore"]::before {
  content: ""; width: 6px; height: 5px; border: 1px solid #000; border-top-width: 2px;
  position: absolute; left: 6px; top: 5px;
}
.title-bar-controls button[aria-label="Restore"]::after {
  content: ""; width: 6px; height: 5px; border: 1px solid #000; border-top-width: 2px;
  background: var(--face); position: absolute; left: 4px; top: 3px;
}
.title-bar-controls button[aria-label="Close"]::before,
.title-bar-controls button[aria-label="Close"]::after {
  content: ""; position: absolute; left: 50%; top: 50%;
  width: 9px; height: 2px; background: #000;
}
.title-bar-controls button[aria-label="Close"]::before { transform: translate(-50%, -50%) rotate(45deg); }
.title-bar-controls button[aria-label="Close"]::after  { transform: translate(-50%, -50%) rotate(-45deg); }

.window-body {
  margin: 3px 0 0;
}

/* ============================================================
   BOTÕES + CAMPOS
   ============================================================ */
button,
input[type="reset"],
input[type="submit"] {
  background: var(--face);
  border: none;
  border-radius: var(--round-btn);
  box-shadow: var(--relevo-out);
  color: var(--ink);
  min-height: 23px;
  min-width: 75px;
  padding: 0 12px;
}
button:not(:disabled):active,
input[type="reset"]:not(:disabled):active,
input[type="submit"]:not(:disabled):active {
  box-shadow: var(--relevo-in);
  padding: 1px 11px 0 13px;
}
button:focus-visible,
input[type="reset"]:focus-visible,
input[type="submit"]:focus-visible {
  outline: 1px dotted #000;
  outline-offset: -4px;
}
button:disabled { color: var(--sh); text-shadow: 1px 1px 0 var(--hi); }

input[type="text"], input[type="password"], input[type="number"],
input:not([type]), textarea, select {
  background: var(--janela-conteudo);
  border: none;
  border-radius: 0;
  box-shadow: var(--relevo-in-fino);
  color: var(--ink);
  padding: 3px 4px;
  outline: none;
}
input:focus, textarea:focus, select:focus {
  outline: 1px dotted #000;
  outline-offset: -3px;
}

/* ============================================================
   FIELDSET / LEGEND
   ============================================================ */
fieldset {
  border: none;
  box-shadow: var(--relevo-in-fino);
  padding: 10px;
  margin: 0;
}
legend {
  background: var(--face);
  padding: 0 3px;
}

/* layouts de formulário (utilitários do 98.css) */
.field-row { display: flex; align-items: center; gap: 8px; }
.field-row > * + * { margin-left: 0; }
.field-row-stacked { display: flex; flex-direction: column; gap: 4px; }
.field-row-stacked + .field-row-stacked { margin-top: 6px; }

/* ============================================================
   TABELA
   ============================================================ */
table {
  border-collapse: collapse;
  background: var(--janela-conteudo);
}
th, td {
  padding: 2px 6px;
  text-align: left;
}

/* ============================================================
   TREE-VIEW (ul.tree-view, usa <details>/<summary>)
   ============================================================ */
ul.tree-view {
  background: var(--janela-conteudo);
  box-shadow: var(--relevo-in);
  display: block;
  margin: 0;
  padding: 6px;
  list-style: none;
}
ul.tree-view li { line-height: 1.5; }
ul.tree-view ul {
  margin: 0 0 0 16px;
  padding: 0;
  list-style: none;
}
ul.tree-view ul > li { position: relative; }
ul.tree-view details > summary { list-style: none; cursor: default; }
ul.tree-view details > summary::-webkit-details-marker { display: none; }
ul.tree-view details > summary::before {
  content: "+"; display: inline-block; width: 12px;
  text-align: center; margin-right: 2px;
}
ul.tree-view details[open] > summary::before { content: "−"; }
```

- [ ] **Step 4: `tsc` limpo (sem novos erros de tipo; CSS não afeta tipos)**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: sem erros (CSS não é tipado; só garante que nada quebrou).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/tema/fontes apps/web/src/tema/tokens.css apps/web/src/tema/base.css
git commit -m "feat(tema): vendoriza fonte MS Sans + tokens + base.css (subconjunto fiel do 98.css)"
```

---

### Task 2: `<ProvedorTema>` — costura `body[data-skin]` + persistência (TDD)

**Files:**
- Create: `apps/web/src/tema/tipos.ts`, `apps/web/src/tema/ProvedorTema.tsx`, `apps/web/src/tema/ganchos.ts`
- Test: `apps/web/src/tema/ProvedorTema.test.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/tema/ProvedorTema.test.tsx`**

```tsx
import { test, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ProvedorTema } from './ProvedorTema';
import { useTema } from './ganchos';
import { CHAVE_TEMA } from './tipos';

function Sonda() {
  const { pele, definirPele } = useTema();
  return <button onClick={() => definirPele('aero')}>pele:{pele}</button>;
}

beforeEach(() => {
  localStorage.clear();
  delete document.body.dataset.skin;
});

test('aplica a pele padrão "98" no body em máquina nova', () => {
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('98');
  expect(screen.getByRole('button')).toHaveTextContent('pele:98');
});

test('definirPele troca a pele, atualiza o body e persiste', () => {
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  act(() => { screen.getByRole('button').click(); });
  expect(document.body.dataset.skin).toBe('aero');
  expect(JSON.parse(localStorage.getItem(CHAVE_TEMA)!)).toEqual({ pele: 'aero' });
});

test('restaura a pele persistida ao montar', () => {
  localStorage.setItem(CHAVE_TEMA, JSON.stringify({ pele: 'aero' }));
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('aero');
});

test('cai no padrão quando o localStorage tem lixo', () => {
  localStorage.setItem(CHAVE_TEMA, '{nao-e-json');
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('98');
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd apps/web && bunx vitest run src/tema/ProvedorTema.test.tsx`
Expected: FAIL com "Failed to resolve import './ProvedorTema'" (arquivos ainda não existem).

- [ ] **Step 3: Criar `apps/web/src/tema/tipos.ts`**

```ts
export type Pele = 'aero' | '98';

export interface EstadoTema {
  pele: Pele;
}

export const CHAVE_TEMA = 'dbos_tema';

// Fase 0: padrão "98" (reproduz o visual atual). A Fase 3 muda para "aero"
// em máquina nova, quando a pele Aero existir.
export const TEMA_PADRAO: EstadoTema = { pele: '98' };
```

- [ ] **Step 4: Criar `apps/web/src/tema/ProvedorTema.tsx`**

```tsx
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CHAVE_TEMA, TEMA_PADRAO, type Pele } from './tipos';

export interface ContextoTemaValor {
  pele: Pele;
  definirPele: (pele: Pele) => void;
}

export const ContextoTema = createContext<ContextoTemaValor | null>(null);

function lerPeleInicial(): Pele {
  try {
    const cru = localStorage.getItem(CHAVE_TEMA);
    if (cru) {
      const obj = JSON.parse(cru) as { pele?: unknown };
      if (obj.pele === 'aero' || obj.pele === '98') return obj.pele;
    }
  } catch {
    /* localStorage indisponível ou JSON inválido → padrão */
  }
  return TEMA_PADRAO.pele;
}

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [pele, setPele] = useState<Pele>(lerPeleInicial);

  useEffect(() => {
    document.body.dataset.skin = pele;
    try {
      localStorage.setItem(CHAVE_TEMA, JSON.stringify({ pele }));
    } catch {
      /* ignora — persistência é best-effort */
    }
  }, [pele]);

  const definirPele = useCallback((p: Pele) => setPele(p), []);
  const valor = useMemo<ContextoTemaValor>(() => ({ pele, definirPele }), [pele, definirPele]);

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}
```

- [ ] **Step 5: Criar `apps/web/src/tema/ganchos.ts`**

```ts
import { useContext } from 'react';
import { ContextoTema, type ContextoTemaValor } from './ProvedorTema';

export function useTema(): ContextoTemaValor {
  const ctx = useContext(ContextoTema);
  if (!ctx) throw new Error('useTema deve ser usado dentro de <ProvedorTema>.');
  return ctx;
}
```

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `cd apps/web && bunx vitest run src/tema/ProvedorTema.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/tema/tipos.ts apps/web/src/tema/ProvedorTema.tsx apps/web/src/tema/ganchos.ts apps/web/src/tema/ProvedorTema.test.tsx
git commit -m "feat(tema): ProvedorTema escreve body[data-skin] e persiste (costura)"
```

---

### Task 3: Trocar `98.css` pelo tema no `main.tsx`

**Files:**
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Editar `apps/web/src/main.tsx`**

Estado atual (referência):

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import '98.css';

const cliente = new QueryClient();

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado.');

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

Substituir por:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ProvedorTema } from './tema/ProvedorTema';
import './tema/tokens.css';
import './tema/base.css';

const cliente = new QueryClient();

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado.');

createRoot(raiz).render(
  <StrictMode>
    <ProvedorTema>
      <QueryClientProvider client={cliente}>
        <App />
      </QueryClientProvider>
    </ProvedorTema>
  </StrictMode>,
);
```

- [ ] **Step 2: Garantir que nada mais importa `98.css`**

Run: `git grep -n "98.css" apps/web/src`
Expected: **sem resultados** (o único import estava no `main.tsx`).

- [ ] **Step 3: Rodar a suíte inteira do web (nada deve quebrar)**

Run: `cd apps/web && bunx vitest run`
Expected: PASS — todos os testes existentes verdes + os 4 novos do `ProvedorTema`. (jsdom ignora CSS; os testes asseguram comportamento/classes inalterados.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/main.tsx
git commit -m "feat(tema): main.tsx usa o módulo tema/ no lugar de 98.css; envolve App em ProvedorTema"
```

---

### Task 4: Remover a dependência `98.css` + verificação visual + README

**Files:**
- Modify: `apps/web/package.json`
- Modify: `README.md`

- [ ] **Step 1: Remover `98.css` das dependências**

Editar `apps/web/package.json` e apagar a linha da dependência:

```jsonc
    "98.css": "^0.1.20",
```

(Manter o resto de `dependencies` intacto.)

- [ ] **Step 2: Reinstalar para atualizar o lockfile**

Run: `bun install`
Expected: conclui sem erro; `98.css` sai do `bun.lock`.

- [ ] **Step 3: Confirmar que o build de produção passa (resolve fontes/CSS)**

Run: `cd apps/web && bunx vite build`
Expected: build conclui; os `.woff/.woff2` de `tema/fontes/` são emitidos como assets (sem erro de `url()` não resolvida).

- [ ] **Step 4: Rodar a suíte inteira de novo (pós-remoção)**

Run: `cd apps/web && bunx vitest run`
Expected: PASS (tudo verde).

- [ ] **Step 5: Conferência visual — sem regressão**

Run: `bun run dev:web` e abrir `http://localhost:5173`.
Verificar (deve estar **idêntico** ao antes):
- Boot → logon → desktop renderizam com a fonte pixelada MS Sans Serif.
- Janelas: barra de título azul em gradiente, texto branco, **3 botões de controle com glifos** (minimizar/maximizar/fechar) — abrir uma janela (ex.: Explorador) e conferir minimizar/maximizar/restaurar/fechar.
- Botões com relevo 3D; campos de texto/seleção afundados; `fieldset`/`legend` (app Busca) com moldura; árvore do Explorador com `+/−`.
- `document.body` tem o atributo `data-skin="98"` (inspecionar no DevTools).
- Trocar `localStorage.dbos_tema` para `{"pele":"aero"}` e recarregar: `data-skin` vira `aero` (visual ainda 98, pois a pele Aero só chega na Fase 3 — confirma só a costura).

- [ ] **Step 6: Atualizar `README.md`**

Localizar a seção que menciona a estética/98.css e acrescentar (ou ajustar) uma nota curta:

```markdown
O estilo do desktop vem do módulo próprio `apps/web/src/tema/` (tokens +
`base.css`, fonte MS Sans Serif vendorizada). A dependência `98.css` foi
removida. A pele é trocável por `body[data-skin]` (`98` | `aero`); por ora só
a pele `98` está implementada (revamp visual — Fase 0/costura).
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json bun.lock README.md
git commit -m "chore(tema): remove dependência 98.css; documenta o módulo tema/"
```

---

### Self-review (preenchido)

**1. Cobertura do spec (Fase 0 = "Costura"):**
- Scaffold `tema/` (tokens, base.css, ProvedorTema) → Tasks 1–2. ✓
- Troca `98.css` no `main.tsx` → Task 3. ✓
- `body[data-skin]` + persistência ("lembrar a última") → Task 2. ✓
- Remoção de `98.css` (Abordagem 1) → Task 4. ✓
- App rodável + `bun test` verde ao fim → Tasks 3–4. ✓
- Desvio consciente: pele padrão é **`98`** nesta fase (não `aero`); a virada do padrão para Aero é da Fase 3, registrada em "Decisões" e no comentário de `tipos.ts`. As folhas `pele-aero.css`/`pele-98.css` e o objeto de tweaks ficam para as Fases 2–3 (YAGNI).

**2. Sem placeholders:** todos os passos têm conteúdo real (CSS, TSX, comandos, saída esperada). ✓

**3. Consistência de tipos/nomes:** `Pele`, `CHAVE_TEMA`, `TEMA_PADRAO`, `ContextoTema`, `ContextoTemaValor`, `ProvedorTema`, `useTema`, `definirPele` usados de forma idêntica entre `tipos.ts`, `ProvedorTema.tsx`, `ganchos.ts`, teste e `main.tsx`. Classes (`window`, `title-bar`, `title-bar-controls`, `tree-view`…) batem com o que os componentes já usam (Inventário + `Janela.tsx`). ✓
