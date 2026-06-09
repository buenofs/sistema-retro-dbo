# Revamp Visual — Fase 1: Motor de ícones pixelados + ícones no shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar o motor de ícones pixelados do protótipo para `tema/icones/` (tipado, com `NomeIcone`, render em canvas com fallback para jsdom, cache), um componente `<Icone>` que escolhe o brilho pela pele ativa, e **substituir os emojis por ícones reais** no shell (barra de título, barra de tarefas, menu Iniciar, atalhos da área de trabalho, bandeja), nos diálogos, na árvore do Explorador, nos nós de Relacionamentos e no logon.

**Architecture:** `tema/icones/bitmaps.ts` carrega a paleta + os 52 bitmaps 16×16 (copiados verbatim do protótipo) e deriva o tipo `NomeIcone = keyof typeof MAPAS`. `motor.ts` desenha (canvas, nearest-neighbor, gloss opcional, cache; em jsdom sem canvas devolve um PNG 1×1 transparente). `<Icone nome tamanho gloss alt>` lê a pele via `useContext(ContextoTema)` (com fallback seguro sem provedor) para decidir o brilho padrão (Aero = com brilho, 98 = chapado). O campo `icone` de `DefinicaoApp`/`EstadoJanela` muda de emoji `string` para `NomeIcone` (segurança em tempo de compilação); os pontos de render passam a usar `<Icone>`.

**Tech Stack:** React 18 + contexto, canvas 2D, Vitest + RTL (jsdom — `getContext('2d')` retorna `null`, então o motor cai no fallback nos testes), TypeScript estrito. pt-BR; `tsc --noEmit` limpo é gate.

**Builds on Fase 0:** o módulo `tema/` já existe (`ProvedorTema`, `ContextoTema`, `useTema`, `Pele`). Esta fase adiciona `tema/icones/`. As peles Aero/98 (Fase 2) e o restyle dos apps (Fase 4) não entram aqui — só a troca de afordâncias por ícones.

---

### Decisões desta fase

- **Dado verbatim do protótipo.** `PALETA` e `MAPAS` são copiados de `C:\dev\dbos-design-revamp\aeroIdea\DBOS\pixel-icons.js` (`PAL` e `ICONS`). As poucas linhas com `'...'.slice(0,16)` (em `terminal`, `wifi`, `logoff`) são **resolvidas para a string de 16 chars resultante** ao copiar.
- **`<Icone>` funciona sem `<ProvedorTema>`.** Usa `useContext(ContextoTema)` direto; se `null`, assume `gloss=false`. Assim os testes existentes que renderizam componentes com `<Icone>` **não precisam** envolver tudo no provedor.
- **jsdom-safe.** Sem contexto de canvas (`getContext` → `null`), `obterIcone` devolve um PNG 1×1 transparente. Nenhuma dependência `canvas` é adicionada.
- **`icone` vira `NomeIcone`** em `DefinicaoApp` e `EstadoJanela`. `loja.ts` continua copiando o campo (só o tipo flui).
- **Escopo = shell + árvore + diálogos + nós de Relacionamentos + logon.** Ícones de toolbar/grade internos de cada app (run, insert, trash, filtro, PK em grade/propriedades) ficam para a **Fase 4** (restyle dos apps). A **exceção** é a PK na árvore do Explorador (`ColunasDaTabela`) e os ícones de tabela/view do Explorador, que entram aqui por serem parte da árvore.
- **Setas `◀ ▶ ＋`** de paginação/execução **permanecem como texto** nesta fase (restyle na Fase 4).

### Mapeamento app → ícone (registro)

| tipoApp | NomeIcone |
|---|---|
| explorador | `folder` |
| consulta | `sql` |
| grade | `grid` |
| propriedades | `props` |
| busca | `search` |
| relacionamentos | `network` |
| terminal | `terminal` |

Outros: atalho "Relatório (Folha)" → `report`; diálogos `erro→stop`, `aviso→help`, `info→props`; bandeja `database`/`wifi`/`speaker`; avatar do Iniciar → `user`; "Encerrar sessão" → `logoff`; logon → `key`; boundary de erro → `stop`. Nós de Relacionamentos: `funcionario→user`, `departamento→folder`, `projeto→report`, `folha→props`. Árvore do Explorador: grupos `folder`, tabela `table`, view `view`, coluna `column`, PK `key`.

---

### File structure for this plan

**`apps/web/src/tema/icones`** (novo)
- Create `bitmaps.ts` — `PALETA`, `MAPAS` (52 ícones, verbatim do protótipo), `type NomeIcone`.
- Create `motor.ts` — `obterIcone`, `temIcone`, `listarIcones`, `NOMES_ICONES`, reexporta `NomeIcone`.
- Create `Icone.tsx` — componente `<Icone>`.
- Test `motor.test.ts`, `Icone.test.tsx`.

**`apps/web/src/areaTrabalho`**
- Modify `tipos.ts` — `icone: NomeIcone` em `DefinicaoApp` e `EstadoJanela`.
- Modify `registroApps.tsx` — emojis → `NomeIcone`.
- Modify `Janela.tsx`, `BarraTarefas.tsx`, `MenuIniciar.tsx`, `AreaTrabalho.tsx` — render `<Icone>`.
- Modify `GerenciadorDialogos.tsx` — ícones de diálogo via `<Icone>`.
- Modify `LimiteErroJanela.tsx` — `⚠️` → `<Icone nome="stop">`.
- Modify `Janela.test.tsx` — assert título sem emoji + `<img>`.

**`apps/web/src/aplicativos`**
- Modify `explorador/ExploradorObjetos.tsx`, `explorador/NoTabela.tsx`, `explorador/ColunasDaTabela.tsx` — ícones de árvore.
- Modify `explorador/ColunasDaTabela.test.tsx` — assert PK sem emoji.
- Modify `relacionamentos/Relacionamentos.tsx` — `ICONE` map → `<Icone>` + `👤` do seletor.

**`apps/web/src/autenticacao`**
- Modify `TelaLogin.tsx` — `🔑` → `<Icone nome="key">`.

---

### Task 1: Motor de ícones — `bitmaps.ts` + `motor.ts` (TDD)

**Files:**
- Create: `apps/web/src/tema/icones/bitmaps.ts`, `apps/web/src/tema/icones/motor.ts`
- Test: `apps/web/src/tema/icones/motor.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/tema/icones/motor.test.ts`**

```ts
import { test, expect } from 'vitest';
import { MAPAS, PALETA, type NomeIcone } from './bitmaps';
import { obterIcone, temIcone, listarIcones, NOMES_ICONES } from './motor';

test('a paleta tem o transparente e cores válidas', () => {
  expect(PALETA['.']).toBeNull();
  for (const [ch, cor] of Object.entries(PALETA)) {
    if (ch === '.') continue;
    expect(cor).toMatch(/^#[0-9a-f]{6}$/i);
  }
});

test('todo ícone tem 16 linhas e nenhuma linha excede 16 colunas', () => {
  for (const [nome, mapa] of Object.entries(MAPAS)) {
    expect(mapa.length, `${nome}: nº de linhas`).toBe(16);
    for (const linha of mapa) {
      expect(linha.length, `${nome}: largura da linha`).toBeLessThanOrEqual(16);
    }
  }
});

test('todo caractere usado nos bitmaps existe na paleta', () => {
  for (const [nome, mapa] of Object.entries(MAPAS)) {
    for (const linha of mapa) {
      for (const ch of linha) {
        expect(PALETA, `${nome}: caractere "${ch}"`).toHaveProperty(ch);
      }
    }
  }
});

test('listarIcones e NOMES_ICONES batem com as chaves de MAPAS', () => {
  expect(new Set(listarIcones())).toEqual(new Set(Object.keys(MAPAS)));
  expect(NOMES_ICONES.length).toBe(Object.keys(MAPAS).length);
});

test('temIcone é um type-guard correto', () => {
  expect(temIcone('folder')).toBe(true);
  expect(temIcone('nao-existe')).toBe(false);
});

test('obterIcone devolve uma data URL (fallback em jsdom) e usa cache', () => {
  const nome = 'folder' as NomeIcone;
  const a = obterIcone(nome, 16);
  expect(typeof a).toBe('string');
  expect(a.startsWith('data:image/')).toBe(true);
  // segunda chamada (mesma chave) vem do cache — mesma referência de string
  expect(obterIcone(nome, 16)).toBe(a);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/web && bunx vitest run src/tema/icones/motor.test.ts`
Expected: FAIL ("Failed to resolve import './bitmaps'").

- [ ] **Step 3: Criar `apps/web/src/tema/icones/bitmaps.ts`**

Copiar **verbatim** `PAL` (como `PALETA`) e `ICONS` (como `MAPAS`) de `C:\dev\dbos-design-revamp\aeroIdea\DBOS\pixel-icons.js` (linhas ~9–625), convertendo para TS:

```ts
// Paleta + bitmaps 16×16 copiados de pixel-icons.js (protótipo Aero).
// '.' = transparente. NÃO alterar os desenhos.
export const PALETA: Record<string, string | null> = {
  '.': null,
  k: '#16242f', K: '#2c4254', w: '#ffffff', W: '#e8f2fb',
  g: '#aebccb', G: '#6c7e8e', x: '#43586a', s: '#cfdae6',
  b: '#3b93ef', B: '#1d63bf', L: '#bfe2ff', c: '#36c8e6', C: '#1597b8',
  n: '#8ad24e', N: '#4f9e2c', m: '#2bc28d', y: '#f6c945', Y: '#cf9a1f',
  o: '#f59331', r: '#e8553d', R: '#b32f1f', p: '#9a6bf2', P: '#6f3fd0',
  d: '#0e1a22', t: '#173a2a', e: '#5cf2a0', f: '#f4a7b9',
};

export const MAPAS = {
  // ... copiar TODAS as 52 entradas de ICONS aqui, verbatim ...
  // IMPORTANTE: nas linhas escritas como '...'.slice(0,16) no protótipo
  // (em `terminal`, `wifi`, `logoff`), substituir pela string de 16
  // caracteres resultante (os 16 primeiros chars do literal).
} as const;

export type NomeIcone = keyof typeof MAPAS;
```

Regras ao copiar:
- Manter cada ícone como `nome: [ 'linha0', ... 'linha15' ]`.
- Resolver os `.slice(0,16)`: pegue os 16 primeiros caracteres do literal e escreva a string final (ex.: `'kdeeddddddddddddk'.slice(0,16)` → `'kdeedddddddddddd'`). Garanta que **toda** linha final tenha no máximo 16 chars (o teste do Step 1 valida).
- `as const` é obrigatório (deriva `NomeIcone`).

- [ ] **Step 4: Criar `apps/web/src/tema/icones/motor.ts`**

```ts
import { MAPAS, PALETA, type NomeIcone } from './bitmaps';

export type { NomeIcone };

export const NOMES_ICONES = Object.keys(MAPAS) as NomeIcone[];

export function temIcone(nome: string): nome is NomeIcone {
  return Object.prototype.hasOwnProperty.call(MAPAS, nome);
}

export function listarIcones(): NomeIcone[] {
  return [...NOMES_ICONES];
}

// PNG 1×1 transparente — fallback quando não há canvas (jsdom).
const TRANSPARENTE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAYAAACgQDFGAAAAAElFTkSuQmCC';

const cache = new Map<string, string>();

function desenhar(mapa: readonly string[], tamanho: number, gloss: boolean): string {
  if (typeof document === 'undefined') return TRANSPARENTE;
  const linhas = mapa.length;
  const colunas = Math.max(...mapa.map((l) => l.length));

  const off = document.createElement('canvas');
  off.width = colunas;
  off.height = linhas;
  const o = off.getContext('2d');
  if (!o) return TRANSPARENTE; // jsdom sem canvas
  for (let y = 0; y < linhas; y++) {
    const linha = mapa[y]!;
    for (let x = 0; x < linha.length; x++) {
      const cor = PALETA[linha[x]!];
      if (cor) {
        o.fillStyle = cor;
        o.fillRect(x, y, 1, 1);
      }
    }
  }

  const cv = document.createElement('canvas');
  cv.width = tamanho;
  cv.height = tamanho;
  const ctx = cv.getContext('2d');
  if (!ctx) return TRANSPARENTE;
  ctx.imageSmoothingEnabled = false;
  const escala = Math.floor(tamanho / Math.max(linhas, colunas)) || 1;
  const dw = colunas * escala;
  const dh = linhas * escala;
  const dx = Math.floor((tamanho - dw) / 2);
  const dy = Math.floor((tamanho - dh) / 2);
  ctx.drawImage(off, 0, 0, colunas, linhas, dx, dy, dw, dh);

  if (gloss) {
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, 0, 0, tamanho);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tamanho, tamanho);
    ctx.globalCompositeOperation = 'source-over';
  }

  try {
    return cv.toDataURL('image/png');
  } catch {
    return TRANSPARENTE; // jsdom: toDataURL não implementado
  }
}

export function obterIcone(nome: NomeIcone, tamanho = 16, gloss = false): string {
  const chave = `${nome}@${tamanho}${gloss ? 'g' : ''}`;
  const emCache = cache.get(chave);
  if (emCache !== undefined) return emCache;
  const url = desenhar(MAPAS[nome], tamanho, gloss);
  cache.set(chave, url);
  return url;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd apps/web && bunx vitest run src/tema/icones/motor.test.ts`
Expected: PASS (6 testes). Se "todo ícone tem 16 linhas" falhar, corrigir a entrada apontada em `bitmaps.ts` (provável `.slice` não resolvido).

- [ ] **Step 6: `tsc` limpo**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/tema/icones/bitmaps.ts apps/web/src/tema/icones/motor.ts apps/web/src/tema/icones/motor.test.ts
git commit -m "feat(tema): motor de ícones pixelados portado (bitmaps + render + cache)"
```

---

### Task 2: Componente `<Icone>` (TDD)

**Files:**
- Create: `apps/web/src/tema/icones/Icone.tsx`
- Test: `apps/web/src/tema/icones/Icone.test.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/tema/icones/Icone.test.tsx`**

```tsx
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icone } from './Icone';
import { ProvedorTema } from '../ProvedorTema';

test('renderiza um <img> pixelado com o alt informado', () => {
  render(<Icone nome="folder" tamanho={16} alt="Pasta" />);
  const img = screen.getByAltText('Pasta');
  expect(img.tagName).toBe('IMG');
  expect(img).toHaveAttribute('width', '16');
  expect(img.getAttribute('src')).toMatch(/^data:image\//);
  expect(img).toHaveStyle({ imageRendering: 'pixelated' });
});

test('funciona sem ProvedorTema (alt vazio por padrão)', () => {
  const { container } = render(<Icone nome="grid" />);
  const img = container.querySelector('img')!;
  expect(img).toBeInTheDocument();
  expect(img).toHaveAttribute('alt', '');
});

test('dentro do ProvedorTema também renderiza um <img>', () => {
  render(
    <ProvedorTema>
      <Icone nome="sql" alt="SQL" />
    </ProvedorTema>,
  );
  expect(screen.getByAltText('SQL').tagName).toBe('IMG');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/web && bunx vitest run src/tema/icones/Icone.test.tsx`
Expected: FAIL ("Failed to resolve import './Icone'").

- [ ] **Step 3: Criar `apps/web/src/tema/icones/Icone.tsx`**

```tsx
import { memo, useContext, type CSSProperties } from 'react';
import { ContextoTema } from '../ProvedorTema';
import { obterIcone, type NomeIcone } from './motor';

export interface PropsIcone {
  nome: NomeIcone;
  tamanho?: number;
  /** Força o brilho; por padrão segue a pele (Aero = com brilho). */
  gloss?: boolean;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

export const Icone = memo(function Icone({
  nome,
  tamanho = 16,
  gloss,
  alt,
  className,
  style,
}: PropsIcone) {
  const ctx = useContext(ContextoTema);
  const comGloss = gloss ?? ctx?.pele === 'aero';
  return (
    <img
      src={obterIcone(nome, tamanho, comGloss)}
      width={tamanho}
      height={tamanho}
      alt={alt ?? ''}
      className={className}
      draggable={false}
      style={{ imageRendering: 'pixelated', verticalAlign: 'middle', ...style }}
    />
  );
});
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/web && bunx vitest run src/tema/icones/Icone.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/tema/icones/Icone.tsx apps/web/src/tema/icones/Icone.test.tsx
git commit -m "feat(tema): componente <Icone> (brilho segue a pele, seguro sem provedor)"
```

---

### Task 3: Tipar `icone` como `NomeIcone` + ícones no shell

**Files:**
- Modify: `apps/web/src/areaTrabalho/tipos.ts`, `registroApps.tsx`, `Janela.tsx`, `BarraTarefas.tsx`, `MenuIniciar.tsx`, `AreaTrabalho.tsx`
- Modify (test): `apps/web/src/areaTrabalho/Janela.test.tsx`

- [ ] **Step 1: `tipos.ts` — trocar o tipo de `icone`**

Adicionar o import e trocar `icone: string` por `icone: NomeIcone` em **`DefinicaoApp`** e **`EstadoJanela`**:

```ts
import type { ComponentType } from 'react';
import type { NomeIcone } from '../tema/icones/motor';
```
(em `EstadoJanela`) `icone: NomeIcone;`
(em `DefinicaoApp`) `icone: NomeIcone;`

- [ ] **Step 2: `registroApps.tsx` — emojis → nomes de ícone**

Trocar cada `icone`:
```
explorador  '🗂️' → 'folder'
consulta    '📝' → 'sql'
grade       '▦'  → 'grid'
propriedades 'ℹ️' → 'props'
busca       '🔎' → 'search'
relacionamentos '🕸️' → 'network'
terminal    '🖥️' → 'terminal'
```

- [ ] **Step 3: `Janela.tsx` — ícone na barra de título**

Importar `import { Icone } from '../tema/icones/Icone';` e trocar (linha ~92-94):
```tsx
<div className="title-bar-text">
  <Icone nome={janela.icone} tamanho={16} alt="" style={{ marginRight: 4 }} />
  {janela.titulo}
</div>
```

- [ ] **Step 4: `BarraTarefas.tsx` — ícone no botão de tarefa**

Importar `Icone` e trocar `{j.icone}` (linha ~52) por:
```tsx
<Icone nome={j.icone} tamanho={16} alt="" style={{ marginRight: 4 }} />
```

- [ ] **Step 5: `MenuIniciar.tsx` — ícone nos itens (e logoff)**

Importar `Icone`. Trocar `{registroApps[tipo].icone}` (linha ~22) por:
```tsx
<Icone nome={registroApps[tipo].icone} tamanho={16} alt="" style={{ marginRight: 6 }} />
```
Trocar o `🔌` de "Encerrar sessão" (linha ~29) por:
```tsx
<Icone nome="logoff" tamanho={16} alt="" style={{ marginRight: 6 }} />
```

- [ ] **Step 6: `AreaTrabalho.tsx` — atalhos da área de trabalho**

Importar `Icone`. Trocar `{registroApps[tipo].icone}` (linha ~47) — que está dentro de `.icone-atalho-glifo` — por:
```tsx
<Icone nome={registroApps[tipo].icone} tamanho={32} alt="" />
```
Trocar o `📄` do atalho "Relatório (Folha)" (linha ~63) por:
```tsx
<Icone nome="report" tamanho={32} alt="" />
```

- [ ] **Step 7: Atualizar `Janela.test.tsx` (sem emoji)**

Localizar (linha ~20):
```tsx
screen.getByText(/📝 Editor de Consultas/, { selector: '.title-bar-text' })
```
Trocar por uma asserção que ignora o ícone:
```tsx
const tb = screen.getByText('Editor de Consultas', { selector: '.title-bar-text' });
expect(tb).toBeInTheDocument();
expect(tb.querySelector('img')).toBeInTheDocument();
```

- [ ] **Step 8: Rodar a suíte do shell + tsc**

Run: `cd apps/web && bunx vitest run src/areaTrabalho && bunx tsc --noEmit`
Expected: PASS (todos os testes de `areaTrabalho`) + tsc limpo. Se algum outro teste de `areaTrabalho` assertava emoji, ajustar do mesmo modo (texto sem emoji + checagem de `img`).

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/areaTrabalho/tipos.ts apps/web/src/areaTrabalho/registroApps.tsx apps/web/src/areaTrabalho/Janela.tsx apps/web/src/areaTrabalho/BarraTarefas.tsx apps/web/src/areaTrabalho/MenuIniciar.tsx apps/web/src/areaTrabalho/AreaTrabalho.tsx apps/web/src/areaTrabalho/Janela.test.tsx
git commit -m "feat(tema): icone tipado (NomeIcone) e <Icone> no shell (título, tarefas, Iniciar, atalhos)"
```

---

### Task 4: Bandeja + avatar do Iniciar (ícones de chrome)

**Files:**
- Modify: `apps/web/src/areaTrabalho/BarraTarefas.tsx`, `apps/web/src/areaTrabalho/MenuIniciar.tsx`

> Estes ícones hoje podem ser texto/ausentes. Adicionar `<Icone>` na bandeja e no cabeçalho do Iniciar.

- [ ] **Step 1: Bandeja na `BarraTarefas.tsx`**

Na área da bandeja (perto do relógio), garantir ícones `database` (DBOS conectado), `wifi` (SQL Server) e `speaker`:
```tsx
<span className="bandeja-icones" aria-hidden="true">
  <Icone nome="database" tamanho={16} alt="" />
  <Icone nome="wifi" tamanho={16} alt="" />
  <Icone nome="speaker" tamanho={16} alt="" />
</span>
```
Posicionar antes do `.relogio` (sem alterar o relógio). Se já houver um container de bandeja, inserir lá; senão, adicionar este `<span>` imediatamente antes do relógio.

- [ ] **Step 2: Avatar no cabeçalho do `MenuIniciar.tsx`**

No topo do menu (faixa/cabeçalho), adicionar o avatar do usuário:
```tsx
<Icone nome="user" tamanho={24} alt="" style={{ marginRight: 6 }} />
```
Junto ao nome do usuário/login, se exibido; caso o cabeçalho atual seja só a faixa vertical, adicionar uma linha de cabeçalho com o avatar + login da sessão (não inventar dados — usar o que já estiver disponível no componente; se nada, só o avatar).

- [ ] **Step 3: Suíte do shell + tsc**

Run: `cd apps/web && bunx vitest run src/areaTrabalho && bunx tsc --noEmit`
Expected: PASS + limpo.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/areaTrabalho/BarraTarefas.tsx apps/web/src/areaTrabalho/MenuIniciar.tsx
git commit -m "feat(tema): ícones de bandeja (database/wifi/speaker) e avatar do menu Iniciar"
```

---

### Task 5: Diálogos + árvore do Explorador + Relacionamentos + logon

**Files:**
- Modify: `apps/web/src/areaTrabalho/GerenciadorDialogos.tsx`, `LimiteErroJanela.tsx`
- Modify: `apps/web/src/aplicativos/explorador/ExploradorObjetos.tsx`, `NoTabela.tsx`, `ColunasDaTabela.tsx`
- Modify (test): `apps/web/src/aplicativos/explorador/ColunasDaTabela.test.tsx`
- Modify: `apps/web/src/aplicativos/relacionamentos/Relacionamentos.tsx`
- Modify: `apps/web/src/autenticacao/TelaLogin.tsx`

- [ ] **Step 1: `GerenciadorDialogos.tsx` — ícone do diálogo**

Trocar o mapa `ICONE` de emojis por nomes e renderizar via `<Icone>` (linha ~61). Importar `Icone`:
```tsx
const ICONE = { erro: 'stop', aviso: 'help', info: 'props' } as const;
// ...
<span aria-hidden="true" style={{ flex: '0 0 auto' }}>
  <Icone nome={ICONE[dialogo.tipo]} tamanho={32} alt="" />
</span>
```

- [ ] **Step 2: `LimiteErroJanela.tsx` — `⚠️` → ícone**

Importar `Icone`; trocar o `⚠️` (linha ~27) por `<Icone nome="stop" tamanho={16} alt="" />`.

- [ ] **Step 3: `ExploradorObjetos.tsx` — grupos + raiz**

Importar `Icone`. Trocar os `📁` dos summaries "Tabelas"/"Views" (linhas ~35, ~45) por `<Icone nome="folder" tamanho={16} alt="" style={{ marginRight: 4 }} />`. Se houver um nó-raiz do banco, usar `database`.

- [ ] **Step 4: `NoTabela.tsx` — tabela/view**

Importar `Icone`. Onde escolhe `icone = tipo === 'view' ? '🔎' : '▦'` (linha ~13) e renderiza `{icone}` (linha ~28), trocar para:
```tsx
<Icone nome={tipo === 'view' ? 'view' : 'table'} tamanho={16} alt="" style={{ marginRight: 4 }} />
```

- [ ] **Step 5: `ColunasDaTabela.tsx` — PK + coluna**

Importar `Icone`. Onde prefixa `🔑` na PK (linha ~35), trocar para um `<Icone nome="key">` antes do texto; colunas comuns podem receber `<Icone nome="column">`. Exemplo:
```tsx
{ehPk && <Icone nome="key" tamanho={14} alt="chave primária" style={{ marginRight: 3 }} />}
```

- [ ] **Step 6: Atualizar `ColunasDaTabela.test.tsx`**

Localizar `screen.findByText(/🔑 id : int/)` (linha ~35). Trocar por asserção sem emoji:
```tsx
expect(await screen.findByText(/id : int/)).toBeInTheDocument();
```
(O ícone de PK vira `<img>`; o texto da coluna permanece.)

- [ ] **Step 7: `Relacionamentos.tsx` — nós + seletor**

Importar `Icone`. Trocar o mapa `ICONE` (linhas ~9-14) para nomes de ícone e renderizar `<Icone>` no nó (linha ~127) e no `👤` do seletor (linha ~58):
```tsx
const ICONE = { funcionario: 'user', departamento: 'folder', projeto: 'report', folha: 'props' } as const;
// nó (linha ~127):
<Icone nome={ICONE[n.tipo]} tamanho={20} alt="" style={{ marginRight: 4 }} />
// seletor (linha ~58):
<Icone nome="user" tamanho={16} alt="" style={{ marginRight: 4 }} /> {f.nome}
```
A seta `◀ Voltar` permanece como texto.

- [ ] **Step 8: `TelaLogin.tsx` — `🔑` → ícone**

Importar `Icone`; trocar o `🔑` do cabeçalho (linha ~29) por `<Icone nome="key" tamanho={24} alt="" />`.

- [ ] **Step 9: Suíte inteira + tsc**

Run: `cd apps/web && bunx vitest run && bunx tsc --noEmit`
Expected: PASS (tudo) + limpo. Ajustar qualquer asserção remanescente de emoji do mesmo modo (texto sem emoji + `img`).

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/areaTrabalho/GerenciadorDialogos.tsx apps/web/src/areaTrabalho/LimiteErroJanela.tsx apps/web/src/aplicativos/explorador/ExploradorObjetos.tsx apps/web/src/aplicativos/explorador/NoTabela.tsx apps/web/src/aplicativos/explorador/ColunasDaTabela.tsx apps/web/src/aplicativos/explorador/ColunasDaTabela.test.tsx apps/web/src/aplicativos/relacionamentos/Relacionamentos.tsx apps/web/src/autenticacao/TelaLogin.tsx
git commit -m "feat(tema): ícones em diálogos, árvore do Explorador, Relacionamentos e logon"
```

---

### Task 6: Verificação final da fase

- [ ] **Step 1: Suíte inteira verde**

Run: `cd apps/web && bunx vitest run`
Expected: todos os arquivos de teste passam (94+ testes, incluindo os novos de `icones`).

- [ ] **Step 2: `tsc` + build**

Run: `cd apps/web && bunx tsc --noEmit && bunx vite build`
Expected: tsc limpo; build conclui sem erro.

- [ ] **Step 3: Varredura de emojis remanescentes no shell/árvore**

Run: `git grep -nP "[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}]" apps/web/src/areaTrabalho apps/web/src/aplicativos/explorador apps/web/src/aplicativos/relacionamentos apps/web/src/autenticacao`
Expected: sem emojis de ícone remanescentes nos escopos desta fase (setas `◀▶＋` e emojis de toolbar de outros apps podem permanecer — Fase 4).

- [ ] **Step 4: Conferência visual (manual, pós-execução)**

`bun run dev:web` → confirmar ícones pixelados no título das janelas, botões da barra de tarefas, itens do Iniciar, atalhos da área de trabalho, bandeja, diálogos, árvore do Explorador e nós de Relacionamentos. (Verificação humana — registrar pendência.)

---

### Self-review (preenchido)

**1. Cobertura do spec (Fase 1 = ícones):** motor portado + tipado (Task 1) ✓; `<Icone>` com brilho por pele (Task 2) ✓; `icone: NomeIcone` + registro + shell (Task 3) ✓; bandeja/avatar (Task 4) ✓; diálogos + árvore + relacionamentos + logon (Task 5) ✓; verificação (Task 6) ✓. Ícones de toolbar/grade internos ficam para a Fase 4 (decisão registrada).

**2. Sem placeholders:** todo passo tem código/edição concreta; o único conteúdo "referenciado" (os 52 bitmaps) é copiado verbatim de um arquivo-fonte exato, com regra explícita para resolver os `.slice`.

**3. Consistência de tipos/nomes:** `NomeIcone`, `obterIcone`, `temIcone`, `listarIcones`, `NOMES_ICONES`, `PALETA`, `MAPAS`, `Icone`, `ContextoTema` usados igualmente entre `bitmaps.ts`, `motor.ts`, `Icone.tsx`, testes, `tipos.ts` e os componentes. Mapeamento app→ícone consistente com `registroApps`. ✓
