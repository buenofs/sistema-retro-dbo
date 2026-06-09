# Revamp Visual — Fase 4: Restyle dos apps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restilizar os 7 apps existentes (explorador, consulta, grade, propriedades, relacionamentos, busca, terminal) para consumir os tokens de pele (funcionam nas duas peles), trocar afordâncias de texto/emoji internas por `<Icone>`, e aplicar os upgrades de visualização do spec §6: grade zebrada com alinhamento numérico/R$ e selos de PK/somente-leitura; editor de consulta com tema ciente de pele e statusbar rica; cards na busca; cores de nó por tipo nos relacionamentos; terminal com CRT/fósforo; painel de propriedades com cabeçalho-ícone + painel chave-valor + tabela de índices.

**Architecture:** Cada app tem (ou ganha) seu CSS escopado; os hardcodes (`grey`/`#c0c0c0`/`#fff`/`#dfdfdf`) migram para tokens compartilhados (defaults 98) de modo que a pele Aero (Fase 3) já os reskinna. Onde o spec pede tratamento específico de pele (zebra, cabeçalho de vidro, fósforo do terminal, fundo do grafo), o CSS do app ganha um bloco `body[data-skin="aero"] …`. Formatação de moeda/número vive em `grade/conversao.ts` (reuso). Nenhuma lógica de dados/backend muda — é restyle + ícones + um pouco de apresentação derivada (ms/usuário/banco já disponíveis).

**Tech Stack:** React 18, CSS tokens + `[data-skin]`, CodeMirror (tema próprio por pele), Vitest + RTL, TypeScript estrito. pt-BR; `tsc --noEmit` + `vite build` + suíte verde são o gate automático; sign-off visual é manual.

**Builds on Fase 3:** as duas peles do shell existem e os tokens (`--face`, `--janela-conteudo`, `--accent`, `--relevo-*`, `--crt`, etc.) estão prontos. Esta fase só toca `aplicativos/*` (+ `tokens.css` para tokens de app). O motor de ícones e `<Icone>` (Fase 1) e o sistema de tweaks (Fase 2) são reusados.

---

### Decisões desta fase

- **Setas de paginação `◀ ▶` e `＋`** permanecem como **texto** onde não há ícone pixelado adequado (não há glifo de seta no motor). O `＋ Nova linha` vira `<Icone nome="insert">`; `🔑` vira `<Icone nome="key">`; `🔎`/`▦` do seletor viram `<Icone nome="view"/"grid">`.
- **Moeda/numérico:** `grade/conversao.ts` ganha `ehTipoNumerico`, `ehTipoMoeda` e `formatarMoeda` (pt-BR, `Intl.NumberFormat`). Colunas numéricas alinham à direita; colunas de tipo money formatam como R$. A busca usa `formatarMoeda` no salário.
- **Statusbar da consulta:** `linhas · ms · usuário/banco`. `ms` é medido no cliente (em torno da mutation); usuário/banco vêm de `useSessao`. Sem mudança de backend.
- **CodeMirror:** adiciona um tema por pele (claro para Aero; clássico para 98) via extensão `EditorView.theme`, escolhido por `useTema().pele`. Mantém `sql()` (decisão do spec — sem overlay regex).
- **Relacionamentos** continua com nós-`<button>` (navegação intocada); ganham **cor por tipo** (`funcionario`=acento, `departamento`=`#f6c945`, `projeto`=`#2bc28d`, `folha`=cinza) e o canvas é tematizado.
- **Tokens de app** novos vivem em `tokens.css` com defaults 98; overrides Aero ficam no CSS de cada app.

### Tokens de app a adicionar (em `tokens.css`, defaults 98)

```css
  /* === Fase 4: tokens de app (defaults = 98) === */
  --borda-painel: var(--sh);          /* divisórias 1px "grey" */
  --borda-celula: #c0c0c0;            /* bordas de célula de tabela */
  --cabecalho-tabela-bg: var(--face); /* fundo do cabeçalho de tabela */
  --zebra: transparent;              /* linhas zebra (Aero liga) */
  --aviso-bg: #ffffe1;               /* fundo de aviso (truncado) */
  --erro-ink: #a00000;               /* texto de erro/alerta */
  --term-bg: #000000;                /* terminal: fundo */
  --term-fg: #33ff66;                /* terminal: fósforo */
  --term-prompt: #33ff66;            /* terminal: prompt */
  --no-funcionario: var(--accent);    /* grafo: cor por tipo */
  --no-departamento: #f6c945;
  --no-projeto: #2bc28d;
  --no-folha: var(--sh);
  --grafo-bg: var(--janela-conteudo); /* grafo: fundo do canvas */
  --aresta: #808080;                 /* grafo: cor de aresta */
```

### File structure for this plan

- Modify `apps/web/src/tema/tokens.css` — tokens de app.
- Modify `apps/web/src/aplicativos/grade/conversao.ts` (+ test) — formatadores.
- Modify por app: `grade/`, `consulta/`, `explorador/`, `propriedades/`, `relacionamentos/`, `busca/`, `terminal/` — CSS + componentes + ícones; ajustar testes que fixavam emoji/texto.

---

### Task 1: Tokens de app + formatadores de moeda (TDD)

**Files:**
- Modify: `apps/web/src/tema/tokens.css`
- Modify: `apps/web/src/aplicativos/grade/conversao.ts`
- Test: `apps/web/src/aplicativos/grade/conversao.test.ts` (criar se não existir)

- [ ] **Step 1: Adicionar os tokens de app ao `tokens.css`**

Acrescentar, antes do fechamento do `:root` (depois do bloco da Fase 3), o bloco "Tokens de app" mostrado na seção acima ("Tokens de app a adicionar").

- [ ] **Step 2: Escrever o teste `apps/web/src/aplicativos/grade/conversao.test.ts`**

```ts
import { test, expect } from 'vitest';
import { ehTipoNumerico, ehTipoMoeda, formatarMoeda } from './conversao';

test('ehTipoNumerico reconhece tipos numéricos do SQL Server', () => {
  expect(ehTipoNumerico('int')).toBe(true);
  expect(ehTipoNumerico('decimal(10,2)')).toBe(true);
  expect(ehTipoNumerico('money')).toBe(true);
  expect(ehTipoNumerico('varchar(50)')).toBe(false);
  expect(ehTipoNumerico('bit')).toBe(false);
});

test('ehTipoMoeda só reconhece money/smallmoney', () => {
  expect(ehTipoMoeda('money')).toBe(true);
  expect(ehTipoMoeda('smallmoney')).toBe(true);
  expect(ehTipoMoeda('int')).toBe(false);
  expect(ehTipoMoeda('decimal(10,2)')).toBe(false);
});

test('formatarMoeda formata em R$ pt-BR e tolera não-número', () => {
  expect(formatarMoeda(1234.5)).toMatch(/R\$\s?1\.234,50/);
  expect(formatarMoeda('abc')).toBe('abc');
  expect(formatarMoeda(null)).toBe('');
});
```

- [ ] **Step 3: Estender `apps/web/src/aplicativos/grade/conversao.ts`**

Manter o `converterValor` existente e o array `TIPOS_NUMERICOS`. Acrescentar:

```ts
const TIPOS_MOEDA = ['money', 'smallmoney'];

function baseTipo(tipoDado: string): string {
  return tipoDado.split('(')[0]!.trim().toLowerCase();
}

export function ehTipoNumerico(tipoDado: string): boolean {
  return TIPOS_NUMERICOS.includes(baseTipo(tipoDado));
}

export function ehTipoMoeda(tipoDado: string): boolean {
  return TIPOS_MOEDA.includes(baseTipo(tipoDado));
}

const FMT_MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (Number.isNaN(n)) return String(valor);
  return FMT_MOEDA.format(n);
}
```

> Se `TIPOS_NUMERICOS` não estiver acessível no escopo do módulo (está — é `const` de topo), reutilize-o em `ehTipoNumerico`.

- [ ] **Step 4: Rodar e ver passar + tsc**

Run: `cd apps/web; bunx vitest run src/aplicativos/grade/conversao.test.ts; bunx tsc --noEmit`
Expected: PASS (3 testes) + tsc limpo.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/tema/tokens.css apps/web/src/aplicativos/grade/conversao.ts apps/web/src/aplicativos/grade/conversao.test.ts
git commit -m "feat(apps): tokens de app + formatadores de moeda/numérico"
```

---

### Task 2: Grade — tokens, zebra, numérico/R$, selos e ícones

**Files:**
- Modify: `apps/web/src/aplicativos/grade/grade.css`, `GradeDados.tsx`, `TabelaGrade.tsx`
- Modify (test): qualquer `grade/*.test.tsx` que fixe emoji `🔑`/`🔎`/`▦`/`＋`.

- [ ] **Step 1: Migrar `grade.css` para tokens + zebra + numérico**

Trocar os hardcodes e acrescentar regras:
- `.grade-cabecalho-tabela` e `.grade-barra`: `border-bottom: 1px solid grey;` → `border-bottom: 1px solid var(--borda-painel);`
- `.grade-aviso-pk`: `color: #a00;` → `color: var(--erro-ink);`
- `.grade-rolagem`: `background: #fff;` → `background: var(--janela-conteudo);`
- `.grade-tabela th, .grade-tabela td`: `border: 1px solid #c0c0c0;` → `border: 1px solid var(--borda-celula);`
- `.grade-tabela thead th`: `background: #c0c0c0;` → `background: var(--cabecalho-tabela-bg);`

Acrescentar ao fim do arquivo:

```css
/* alinhamento numérico à direita */
.grade-tabela td.num,
.grade-tabela th.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
/* zebra (a pele decide via --zebra; Aero liga) */
.grade-tabela tbody tr:nth-child(even) td {
  background: var(--zebra);
}
/* selo de PK no cabeçalho */
.grade-th-pk {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

/* --- Pele Aero: zebra + cabeçalho de vidro --- */
body[data-skin="aero"] .grade-tabela {
  --zebra: #f3f8fc;
}
body[data-skin="aero"] .grade-tabela thead th {
  background: linear-gradient(180deg, #f6f9fc, #d9e3ec);
  box-shadow: inset 0 1px 0 #fff;
}
body[data-skin="aero"] .grade-tabela tbody tr:hover td {
  background: var(--accent-l, #e8f3ff);
}
```

- [ ] **Step 2: `GradeDados.tsx` — seletor com ícones**

No `SeletorTabela`, onde renderiza `{o.tipo === 'view' ? '🔎' : '▦'} {o.esquema}.{o.nome}`, importar `Icone` e trocar por:

```tsx
<Icone nome={o.tipo === 'view' ? 'view' : 'grid'} tamanho={16} alt="" style={{ marginRight: 4 }} />
{o.esquema}.{o.nome}
```

- [ ] **Step 3: `TabelaGrade.tsx` — ícones, PK no cabeçalho, numérico/R$, somente-leitura**

Importar:

```tsx
import { Icone } from '../../tema/icones/Icone';
import { ehTipoNumerico, ehTipoMoeda, formatarMoeda } from './conversao';
```

a) Botão "Nova linha" (`＋ Nova linha`) → ícone:

```tsx
<button onClick={() => setInserindo((v) => !v)}>
  <Icone nome="insert" tamanho={14} alt="" style={{ marginRight: 4 }} /> Nova linha
</button>
```

b) Cabeçalho de coluna com PK (hoje `{(c.ehChavePrimaria ? '🔑 ' : '') + c.nome}`):

```tsx
<th key={c.nome} className={ehTipoNumerico(c.tipoDado) ? 'num' : undefined}>
  {c.ehChavePrimaria ? (
    <span className="grade-th-pk">
      <Icone nome="key" tamanho={12} alt="chave primária" />
      {c.nome}
    </span>
  ) : (
    c.nome
  )}
</th>
```

c) Selo somente-leitura (hoje texto puro) — acrescentar ícone:

```tsx
{!editavel && (
  <span className="grade-aviso-pk">
    <Icone nome="stop" tamanho={12} alt="" style={{ marginRight: 3 }} />
    Sem chave primária — somente leitura.
  </span>
)}
```

d) Célula de dado: alinhamento + R$. Localizar onde renderiza `formatar(linha[c.nome])` (na célula não-editável) e trocar a `<td>` por:

```tsx
<td key={c.nome} className={ehTipoNumerico(c.tipoDado) ? 'num' : undefined}>
  {emEdicao && !c.ehChavePrimaria ? (
    <input
      aria-label={`editar ${c.nome}`}
      value={rascunho[c.nome] ?? ''}
      onChange={(e) => setRascunho((r) => ({ ...r, [c.nome]: e.target.value }))}
    />
  ) : ehTipoMoeda(c.tipoDado) ? (
    formatarMoeda(linha[c.nome])
  ) : (
    formatar(linha[c.nome])
  )}
</td>
```

(Manter a função `formatar` existente para os demais tipos.)

- [ ] **Step 4: Atualizar testes da grade que fixavam emoji**

Rodar `cd apps/web; bunx vitest run src/aplicativos/grade` e, para cada asserção que casava `🔑`/`🔎`/`▦`/`＋`, trocar por asserção sem emoji (texto da coluna/objeto presente + `img` quando fizer sentido). Ex.: `getByText('🔑 id')` → `getByText('id')` e, se quiser, conferir `container.querySelector('img')`.

- [ ] **Step 5: Suíte da grade + tsc**

Run: `cd apps/web; bunx vitest run src/aplicativos/grade; bunx tsc --noEmit`
Expected: PASS + limpo.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/aplicativos/grade/grade.css apps/web/src/aplicativos/grade/GradeDados.tsx apps/web/src/aplicativos/grade/TabelaGrade.tsx apps/web/src/aplicativos/grade/*.test.tsx
git commit -m "feat(apps): grade — tokens, zebra, numérico/R\$, selos de PK/somente-leitura e ícones"
```

---

### Task 3: Consulta — toolbar com ícone, tema CM por pele, statusbar rica

**Files:**
- Modify: `apps/web/src/aplicativos/consulta/consulta.css`, `EditorConsultas.tsx`, `GradeResultado.tsx`
- Create: `apps/web/src/aplicativos/consulta/temaCodeMirror.ts`

- [ ] **Step 1: Migrar `consulta.css` para tokens**

Trocar todos os `grey` → `var(--borda-painel)`; `#c0c0c0` (`.grade-cabecalho`) → `var(--cabecalho-tabela-bg)`; `#fff` (`.grade-corpo`) → `var(--janela-conteudo)`; `#dfdfdf` (`.grade-celula` border-right) → `var(--borda-celula)`; `#ffffe1` (`.grade-aviso`) → `var(--aviso-bg)`.

Acrescentar:

```css
.editor-statusbar {
  display: flex;
  gap: 12px;
  padding: 3px 8px;
  font-size: 11px;
  border-top: 1px solid var(--borda-painel);
  background: var(--face);
}
.editor-estado {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.editor-estado.erro {
  color: var(--erro-ink);
}
```

- [ ] **Step 2: Criar `apps/web/src/aplicativos/consulta/temaCodeMirror.ts`**

```ts
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { Pele } from '../../tema/tipos';

// Tema mínimo por pele: Aero = claro/arejado; 98 = clássico chapado.
const aero = EditorView.theme({
  '&': { backgroundColor: 'rgba(255,255,255,0.92)', color: '#0e2a14' },
  '.cm-content': { fontFamily: 'var(--mono)' },
  '.cm-gutters': { backgroundColor: '#eef3f9', color: '#5c6b78', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'rgba(120,200,255,0.10)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(120,200,255,0.35)',
  },
});

const win98 = EditorView.theme({
  '&': { backgroundColor: '#ffffff', color: '#101010' },
  '.cm-content': { fontFamily: 'var(--mono)' },
  '.cm-gutters': { backgroundColor: '#c0c0c0', color: '#222', border: 'none' },
  '.cm-activeLine': { backgroundColor: '#eef3fb' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: '#b8d0ff',
  },
});

export function temaCodeMirror(pele: Pele): Extension {
  return pele === 'aero' ? aero : win98;
}
```

- [ ] **Step 3: `EditorConsultas.tsx` — ícone, tema por pele, ms + statusbar**

Importar:

```tsx
import { Icone } from '../../tema/icones/Icone';
import { useTema } from '../../tema/ganchos';
import { useSessao } from '../../autenticacao/ganchos';
import { temaCodeMirror } from './temaCodeMirror';
```

a) Tema do CodeMirror e sessão:

```tsx
const { pele } = useTema();
const sessao = useSessao();
```

b) Medir ms: ao chamar `rodar()`, marcar o tempo. Substituir o handler `rodar` por uma versão que cronometra e guarda em estado:

```tsx
const [ms, setMs] = useState<number | null>(null);
function rodar() {
  const inicio = performance.now();
  setMs(null);
  executar.mutate(texto, {
    onSettled: () => setMs(Math.round(performance.now() - inicio)),
  });
}
```

c) Botão com ícone (trocar `'▶ Executar (F5)'`):

```tsx
<button onClick={rodar} disabled={executar.isPending}>
  <Icone nome="run" tamanho={14} alt="" style={{ marginRight: 4 }} />
  {executar.isPending ? 'Executando…' : 'Executar (F5)'}
</button>
```

d) CodeMirror com tema:

```tsx
<CodeMirror
  value={texto}
  height="160px"
  extensions={[sql(), temaCodeMirror(pele)]}
  onChange={setTexto}
/>
```

e) Statusbar — acrescentar **após** o `<div className="editor-resultado">…</div>`, dentro do container raiz:

```tsx
<div className="editor-statusbar">
  {executar.isPending ? (
    <span className="editor-estado">
      <Icone nome="run" tamanho={12} alt="" /> Executando…
    </span>
  ) : executar.isError ? (
    <span className="editor-estado erro">
      <Icone nome="stop" tamanho={12} alt="" /> Erro
    </span>
  ) : executar.data ? (
    <span className="editor-estado">
      <Icone nome="grid" tamanho={12} alt="" />
      {executar.data.colunas.length > 0
        ? `${executar.data.linhas.length} linha(s)`
        : `${executar.data.linhasAfetadas} afetada(s)`}
    </span>
  ) : (
    <span className="editor-estado">Pronto</span>
  )}
  {ms !== null && <span>{ms} ms</span>}
  {sessao.data && (
    <span style={{ marginLeft: 'auto' }}>
      {sessao.data.login} · {sessao.data.banco}
    </span>
  )}
</div>
```

- [ ] **Step 4: Suíte da consulta + tsc**

Run: `cd apps/web; bunx vitest run src/aplicativos/consulta; bunx tsc --noEmit`
Expected: PASS + limpo. Ajustar asserções que casavam `▶` (texto vira "Executar (F5)" + `img`). Se algum teste renderiza `EditorConsultas` sem `ProvedorTema`, envolver no provedor (como nos testes do shell) — `useTema` exige o provedor.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/aplicativos/consulta/consulta.css apps/web/src/aplicativos/consulta/EditorConsultas.tsx apps/web/src/aplicativos/consulta/GradeResultado.tsx apps/web/src/aplicativos/consulta/temaCodeMirror.ts apps/web/src/aplicativos/consulta/*.test.tsx
git commit -m "feat(apps): consulta — toolbar com ícone, tema CodeMirror por pele e statusbar rica"
```

---

### Task 4: Explorador — twisties, col-meta à direita

**Files:**
- Modify: `apps/web/src/aplicativos/explorador/ColunasDaTabela.tsx`
- Create: `apps/web/src/aplicativos/explorador/explorador.css`
- Modify: `apps/web/src/aplicativos/explorador/ExploradorObjetos.tsx` (importar o css)

- [ ] **Step 1: Criar `apps/web/src/aplicativos/explorador/explorador.css`**

```css
/* metadados de coluna à direita (tipo · nulabilidade) */
.col-linha {
  display: flex;
  align-items: center;
  gap: 4px;
}
.col-nome {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.col-meta {
  color: var(--ink-suave);
  font-size: 10px;
  white-space: nowrap;
}
.col-meta .nulo {
  opacity: 0.7;
  font-style: italic;
}
```

- [ ] **Step 2: `ExploradorObjetos.tsx` — importar o css**

No topo, acrescentar `import './explorador.css';`.

- [ ] **Step 3: `ColunasDaTabela.tsx` — estruturar a linha (ícone · nome · meta)**

Localizar a `<li>` que hoje renderiza ícone + `c.nome + ' : ' + c.tipoDado + (c.anulavel ? ' (nulo)' : '')` e trocar por:

```tsx
<li key={c.nome} className="col-linha">
  {c.ehChavePrimaria ? (
    <Icone nome="key" tamanho={14} alt="chave primária" />
  ) : (
    <Icone nome="column" tamanho={14} alt="" />
  )}
  <span className="col-nome">{c.nome}</span>
  <span className="col-meta">
    {c.tipoDado}
    {c.anulavel && <span className="nulo"> · nulo</span>}
  </span>
</li>
```

- [ ] **Step 4: Suíte do explorador + tsc**

Run: `cd apps/web; bunx vitest run src/aplicativos/explorador; bunx tsc --noEmit`
Expected: PASS + limpo. O teste de PK (`/id : int/`) provavelmente precisa virar `getByText('id')` + checagem do tipo via `col-meta` (ex.: `getByText('int')`). Ajustar conforme.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/aplicativos/explorador/explorador.css apps/web/src/aplicativos/explorador/ExploradorObjetos.tsx apps/web/src/aplicativos/explorador/ColunasDaTabela.tsx apps/web/src/aplicativos/explorador/*.test.tsx
git commit -m "feat(apps): explorador — metadados de coluna à direita (tipo · nulabilidade)"
```

---

### Task 5: Propriedades — cabeçalho-ícone, painel chave-valor, índices

**Files:**
- Modify: `apps/web/src/aplicativos/propriedades/PropriedadesObjeto.tsx`
- Create: `apps/web/src/aplicativos/propriedades/propriedades.css`

- [ ] **Step 1: Criar `apps/web/src/aplicativos/propriedades/propriedades.css`**

```css
.prop-cabecalho {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.prop-titulo {
  font-weight: 700;
  font-size: 14px;
}
.prop-subtitulo {
  color: var(--ink-suave);
  font-size: 11px;
}
.prop-kv {
  box-shadow: var(--relevo-out-fino);
  background: var(--face);
  padding: 8px 10px;
  margin-bottom: 10px;
}
.prop-linha {
  display: flex;
  padding: 2px 0;
}
.prop-chave {
  width: 130px;
  color: var(--ink-suave);
}
.prop-indice {
  display: flex;
  align-items: center;
  gap: 4px;
}
```

- [ ] **Step 2: `PropriedadesObjeto.tsx` — reestruturar**

Importar `import { Icone } from '../../tema/icones/Icone';` e `import './propriedades.css';`.

Substituir o `<fieldset><legend>Geral</legend>…</fieldset>` por um cabeçalho-ícone + painel chave-valor:

```tsx
<div style={{ padding: 8 }}>
  <div className="prop-cabecalho">
    <Icone nome={p.tipo === 'view' ? 'view' : 'table'} tamanho={32} alt="" />
    <div>
      <div className="prop-titulo">{p.nome}</div>
      <div className="prop-subtitulo">
        {p.tipo === 'view' ? 'View' : 'Tabela'} · {p.esquema}
      </div>
    </div>
  </div>

  <div className="prop-kv">
    <div className="prop-linha"><span className="prop-chave">Colunas</span><strong>{p.totalColunas}</strong></div>
    <div className="prop-linha"><span className="prop-chave">Linhas (aprox.)</span><strong>{p.totalLinhas}</strong></div>
    <div className="prop-linha"><span className="prop-chave">Criado em</span><strong>{formatarData(p.criadoEm)}</strong></div>
    <div className="prop-linha"><span className="prop-chave">Modificado em</span><strong>{formatarData(p.modificadoEm)}</strong></div>
  </div>

  <fieldset>
    <legend>Índices ({p.indices.length})</legend>
    {p.indices.length === 0 ? (
      <p style={{ margin: '2px 0' }}>Nenhum índice.</p>
    ) : (
      <ul className="tree-view">
        {p.indices.map((i) => (
          <li key={i.nome} className="prop-indice">
            {i.chavePrimaria && <Icone nome="key" tamanho={12} alt="chave primária" />}
            <span>
              {i.nome} — {i.tipo}
              {i.unico ? ', único' : ''} ({i.colunas.join(', ')})
            </span>
          </li>
        ))}
      </ul>
    )}
  </fieldset>
</div>
```

(Manter `formatarData` e o guard de entrada/erro existentes.)

- [ ] **Step 3: Suíte de propriedades + tsc**

Run: `cd apps/web; bunx vitest run src/aplicativos/propriedades; bunx tsc --noEmit`
Expected: PASS + limpo. Ajustar testes que casavam `🔑` (índice) ou o texto "Tipo:/Esquema:/Nome:" do layout antigo — o novo expõe `p.nome` no título e o tipo no subtítulo; consulte por esses textos.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/aplicativos/propriedades/propriedades.css apps/web/src/aplicativos/propriedades/PropriedadesObjeto.tsx apps/web/src/aplicativos/propriedades/*.test.tsx
git commit -m "feat(apps): propriedades — cabeçalho-ícone, painel chave-valor e índices com ícone"
```

---

### Task 6: Relacionamentos — cores de nó por tipo + canvas tematizado

**Files:**
- Modify: `apps/web/src/aplicativos/relacionamentos/relacionamentos.css`, `Relacionamentos.tsx`

- [ ] **Step 1: Migrar `relacionamentos.css` + cor por tipo**

Trocar:
- `.rel-barra` `border-bottom: 1px solid grey;` → `var(--borda-painel)`
- `.rel-canvas` `background: #fff;` → `var(--grafo-bg)`
- `.rel-centro` box-shadow hardcoded → `box-shadow: var(--relevo-out);`

Acrescentar:

```css
.rel-no {
  background: var(--face);
  box-shadow: var(--relevo-out-fino);
  border-left: 4px solid var(--cor-no, var(--sh));
}
.rel-no.tipo-funcionario { --cor-no: var(--no-funcionario); }
.rel-no.tipo-departamento { --cor-no: var(--no-departamento); }
.rel-no.tipo-projeto { --cor-no: var(--no-projeto); }
.rel-no.tipo-folha { --cor-no: var(--no-folha); }

/* --- Pele Aero: canvas com leve gradiente aqua --- */
body[data-skin="aero"] .rel-canvas {
  background: radial-gradient(120% 120% at 50% 30%, #eef7ff, #d7e8f6);
}
```

- [ ] **Step 2: `Relacionamentos.tsx` — classe por tipo + aresta tematizada**

a) No nó-`<button>`, acrescentar a classe de tipo:

```tsx
<button
  key={n.id}
  className={`rel-no tipo-${n.tipo} ${n.id === g.centro ? 'rel-centro' : ''}`}
  style={{ left: p.x, top: p.y }}
  disabled={!navegavel}
  onClick={() => { /* inalterado */ }}
>
  <Icone nome={ICONE[n.tipo]} tamanho={20} alt="" style={{ marginRight: 4 }} /> {n.rotulo}
</button>
```

b) A aresta `<line … stroke="#808080" />` → usar o token:

```tsx
<line key={i} x1={de.x} y1={de.y} x2={para.x} y2={para.y} stroke="var(--aresta)" />
```

- [ ] **Step 3: Suíte de relacionamentos + tsc**

Run: `cd apps/web; bunx vitest run src/aplicativos/relacionamentos; bunx tsc --noEmit`
Expected: PASS + limpo.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/aplicativos/relacionamentos/relacionamentos.css apps/web/src/aplicativos/relacionamentos/Relacionamentos.tsx
git commit -m "feat(apps): relacionamentos — cores de nó por tipo e canvas tematizado"
```

---

### Task 7: Terminal — fósforo/CRT por pele

**Files:**
- Modify: `apps/web/src/aplicativos/terminal/terminal.css`

- [ ] **Step 1: Migrar `terminal.css` para tokens + scanlines + Aero**

Trocar:
- `.terminal` `background: #000;` → `background: var(--term-bg);` ; `color: #33ff66;` → `color: var(--term-fg);`
- `.terminal-ps` `color: #33ff66;` → `var(--term-prompt)`
- `.terminal-input` `color: #33ff66;` e `caret-color: #33ff66;` → `var(--term-fg)`

Acrescentar (scanlines dirigidas por `--crt`, fósforo Aero):

```css
.terminal {
  position: relative;
}
.terminal::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--crt, 0);
  background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0 1px, transparent 1px 3px);
}

/* --- Pele Aero: fósforo com brilho e fundo verde-escuro --- */
body[data-skin="aero"] .terminal {
  --term-bg: transparent;
  --term-fg: #79f2ad;
  --term-prompt: #ffe07a;
  background: radial-gradient(120% 120% at 50% 0%, #0c3a26, #061b12);
  border-radius: var(--round-sm);
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.7), inset 0 0 6px rgba(120, 255, 180, 0.2);
  text-shadow: 0 0 6px rgba(90, 242, 160, 0.6);
}
body[data-skin="aero"] .terminal::after {
  background: repeating-linear-gradient(180deg, rgba(0, 0, 0, 0) 0 2px, rgba(0, 0, 0, 0.22) 2px 3px);
  opacity: 1; /* o brilho/scanline do Aero é sempre leve */
}
```

> Observação: na pele Aero o terminal sempre tem um leve scanline (estética). Na pele 98 o scanline segue o tweak `--crt` (0 por padrão). `comandos.ts` permanece intocado.

- [ ] **Step 2: Suíte do terminal + tsc + build**

Run: `cd apps/web; bunx vitest run src/aplicativos/terminal; bunx tsc --noEmit; bunx vite build`
Expected: PASS + limpo + build OK.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/aplicativos/terminal/terminal.css
git commit -m "feat(apps): terminal — fósforo/CRT tematizado por pele"
```

---

### Task 8: Busca — resultados em cards + sidebar com selo de contagem

**Files:**
- Modify: `apps/web/src/aplicativos/busca/busca.css`, `Busca.tsx`

- [ ] **Step 1: Migrar `busca.css` + estilos de card**

Trocar `grey` → `var(--borda-painel)`; `#fff` → `var(--janela-conteudo)`; `#c0c0c0` (bordas/cabeçalho da tabela) → `var(--borda-celula)`/`var(--cabecalho-tabela-bg)`.

Acrescentar:

```css
.busca-contagem {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  background: var(--accent);
  color: var(--accent-ink);
  border-radius: 8px;
  font-size: 10px;
}
.busca-cards {
  display: flex;
  flex-direction: column;
}
.busca-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--borda-celula);
}
.busca-card-corpo {
  flex: 1;
  min-width: 0;
}
.busca-card-nome {
  font-weight: 700;
}
.busca-card-sub {
  color: var(--ink-suave);
  font-size: 11px;
}
.busca-card-acoes {
  display: flex;
  gap: 4px;
}
.busca-botao-icone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
```

- [ ] **Step 2: `Busca.tsx` — cards + selo de contagem**

Importar:

```tsx
import { Icone } from '../../tema/icones/Icone';
import { formatarMoeda } from '../grade/conversao';
```

a) Selo de contagem na legenda (quando houver resultados). Onde está `<legend>Pesquisar funcionários</legend>`, deixar como está, e no cabeçalho da área de resultados adicionar a contagem — ou, mais simples, inserir o selo ao lado do título dos resultados. Concretamente, **substituir a `<table className="busca-tabela">…</table>`** (todo o bloco de tabela de resultados) por cards:

```tsx
<div className="busca-cards">
  {(consulta.data ?? []).map((f) => (
    <div key={f.id} className="busca-card">
      <Icone nome="user" tamanho={28} alt="" />
      <div className="busca-card-corpo">
        <div className="busca-card-nome">{f.nome}</div>
        <div className="busca-card-sub">
          {f.cargo} · {f.departamento} · {formatarMoeda(f.salario)}
        </div>
      </div>
      <div className="busca-card-acoes">
        <button
          className="busca-botao-icone"
          onClick={() => abrirJanela('grade', { esquema: 'dbo', tabela: 'Funcionarios' })}
        >
          <Icone nome="grid" tamanho={16} alt="" /> Grade
        </button>
        <button
          className="busca-botao-icone"
          onClick={() => abrirJanela('relacionamentos', { tipo: 'funcionario', id: f.id })}
        >
          <Icone nome="network" tamanho={16} alt="" /> Relações
        </button>
      </div>
    </div>
  ))}
</div>
```

b) Selo de contagem: logo acima de `<div className="busca-cards">`, adicionar:

```tsx
<p style={{ margin: 0, padding: '4px 8px' }}>
  Resultados
  <span className="busca-contagem">{(consulta.data ?? []).length}</span>
</p>
```

(Manter os estados `!pesquisou`/`isPending`/`isError`/vazio como estão.)

- [ ] **Step 3: Suíte da busca + tsc**

Run: `cd apps/web; bunx vitest run src/aplicativos/busca; bunx tsc --noEmit`
Expected: PASS + limpo. Ajustar testes que esperavam a `<table>`/cabeçalhos "Nome/Cargo/…" ou os botões "Ver relacionamentos"/"Abrir na grade" — agora os botões são "Relações"/"Grade" e os dados estão em cards. Atualizar as asserções para o novo texto/estrutura (ex.: `getByText(f.nome)`, `getByRole('button', { name: /Relações/ })`).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/aplicativos/busca/busca.css apps/web/src/aplicativos/busca/Busca.tsx apps/web/src/aplicativos/busca/*.test.tsx
git commit -m "feat(apps): busca — resultados em cards e selo de contagem"
```

---

### Task 9: Verificação final da fase

- [ ] **Step 1: Suíte inteira + tsc + build**

Run: `cd apps/web; bunx vitest run; bunx tsc --noEmit; bunx vite build`
Expected: tudo verde; tsc limpo; build OK.

- [ ] **Step 2: Varredura de emojis remanescentes nos apps**

Run: `git grep -nP "[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}]" apps/web/src/aplicativos`
Expected: apenas setas `◀▶＋`/operadores que decidimos manter como texto; sem `🔑`/`🔎`/`▦`/`🕸️` etc. remanescentes.

- [ ] **Step 3: Conferência visual (manual, pós-execução)**

`bun run dev:web`. Em cada app, nas **duas peles**: grade zebrada (Aero) com numéricos à direita, R$ em colunas money, selo de PK e somente-leitura; consulta com botão Executar (ícone), tema do CodeMirror coerente com a pele e statusbar (linhas · ms · usuário/banco); explorador com metadados à direita; propriedades com cabeçalho-ícone + painel chave-valor + índices; relacionamentos com nós coloridos por tipo e canvas tematizado; terminal em fósforo (verde DOS no 98, brilho no Aero) com scanlines; busca em cards com selo de contagem. Registrar pendência humana.

---

### Self-review (preenchido)

**1. Cobertura do spec (Fase 4 = restyle por app §6):** Explorador (metadados à direita, ícones) — Task 4 ✓; Consulta (CodeMirror tema por pele, toolbar ícone, estados de resultado, statusbar rica) — Task 3 ✓; Grade (zebra, numérico à direita, R$ via conversao, selo PK, selo somente-leitura, ícones) — Tasks 1–2 ✓; Propriedades (ícone no cabeçalho, painel chave-valor raised, tabela de índices) — Task 5 ✓; Relacionamentos (ícones já na Fase 1, cores por tipo, canvas tematizado) — Task 6 ✓; Busca (sidebar com selo de contagem, cards user + subtítulo Cargo·Depto·R$ + botões-ícone Grade/Relações) — Task 8 ✓; Terminal (pele CRT `.term`, fósforo, scanlines `--crt`) — Task 7 ✓. Input de filtro com ícone na grade: a grade atual não tem filtro próprio; **não** inventado nesta fase (fora do que existe; registrado). Setas `◀▶＋` mantidas como texto (sem glifo no motor) — decisão registrada.

**2. Sem placeholders:** cada task tem CSS/JSX concretos; formatadores com código real; blocos Aero verbatim dos protótipos.

**3. Consistência de tipos/nomes:** tokens de app (`--borda-painel`, `--borda-celula`, `--cabecalho-tabela-bg`, `--zebra`, `--aviso-bg`, `--erro-ink`, `--term-*`, `--no-*`, `--grafo-bg`, `--aresta`) usados igualmente entre `tokens.css` e os CSS de app; `ehTipoNumerico`/`ehTipoMoeda`/`formatarMoeda` de `conversao.ts` usados em grade e busca; `temaCodeMirror(pele)` e `useTema`/`useSessao` na consulta; classes `tipo-${n.tipo}` casadas entre `Relacionamentos.tsx` e o css. ✓
</content>
</invoke>
