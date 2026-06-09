# Ícones reais por pele (98 / Aero) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o motor de ícones procedurais (canvas + gloss) por dois conjuntos de PNGs reais vendorizados — Win95/98 (`@react95/icons`) na pele `98` e XP "Luna" autêntico na pele `aero` — atrás da API `<Icone nome>` inalterada.

**Architecture:** Um script de vendorização baixa e normaliza os PNGs para `apps/web/src/tema/icones/assets/{98,aero}/<nome>...png`. Um manifesto Vite-glob tipado mapeia `pele → nome → url`. `<Icone>` resolve o asset pela pele ativa (98 = tiers `-16`/`-32` pixelados; aero = um hi-res suavizado), sem gloss e sem contorno forçado. `NomeIcone` passa a derivar de um array canônico em `nomes.ts`; `bitmaps.ts` é removido.

**Tech Stack:** React 18 + contexto (`ContextoTema`/`Pele = 'aero' | '98'`), Vite 5 (`import.meta.glob`), Vitest 2 + RTL (jsdom), TypeScript estrito. Node 18+ (`fetch` nativo) para o script de vendorização. pt-BR. Gate: `bunx tsc --noEmit` limpo + suíte verde.

**Spec:** `docs/superpowers/specs/2026-06-09-icones-por-pele-design.md`.

---

## File structure for this plan

**`scripts/`** (novo, raiz do repo)
- Create `scripts/vendor-icones.mjs` — baixa/normaliza os PNGs das duas fontes; gera contact-sheet + relatório de cobertura.

**`apps/web/src/tema/icones/`**
- Create `assets/98/<nome>-16.png`, `assets/98/<nome>-32.png` (32 nomes × 2) — gerados pelo script.
- Create `assets/aero/<nome>.png` (32 nomes) — gerados pelo script.
- Create `nomes.ts` — `NOMES_ICONES` (array literal canônico) + `type NomeIcone`.
- Create `manifesto.ts` — glob dos assets → `Record<Pele, Record<NomeIcone, Tiers>>`.
- Modify `motor.ts` — remove `desenhar`/gloss/cache-canvas; `obterIcone(nome, pele, tamanho)` lê o manifesto; reexporta de `nomes.ts`.
- Modify `Icone.tsx` — resolve por pele, `image-rendering` por pele, remove o prop/lógica `gloss`.
- Modify `motor.test.ts` — substitui testes de PALETA/MAPAS por testes de manifesto/resolução.
- Modify `Icone.test.tsx` — adiciona asserções de `image-rendering` por pele.
- Delete `bitmaps.ts`.

**Consumidores:** nenhuma mudança de API. (Varredura confirmou que `gloss` só é usado dentro de `motor.ts`/`Icone.tsx`.)

### Os 32 nomes (NomeIcone)

```
folder folderOpen sql grid props search network terminal report database
computer table view column key run save insert edit trash refresh filter
newdoc stop clock speaker wifi power logoff user help star
```

---

### Task 1: Script de vendorização + assets

**Files:**
- Create: `scripts/vendor-icones.mjs`
- Create (gerado): `apps/web/src/tema/icones/assets/98/*.png`, `apps/web/src/tema/icones/assets/aero/*.png`
- Create (gerado, ignorado): `apps/web/src/tema/icones/assets/_contato.html`, `apps/web/src/tema/icones/assets/_cobertura.json`

- [ ] **Step 1: Criar `scripts/vendor-icones.mjs`**

Conteúdo completo:

```js
// Vendoriza ícones por pele:
//   98  -> @react95/icons (jsDelivr), tiers 16/32, image pixelado
//   aero -> tema XP B00merang (raw GitHub), hi-res, suavizado
// Uso: node scripts/vendor-icones.mjs
// Saída: apps/web/src/tema/icones/assets/{98,aero}/<nome>...png
//        + _contato.html (folha de contato) + _cobertura.json (relatório)
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEST = join(RAIZ, 'apps/web/src/tema/icones/assets');
const REACT95 = 'https://cdn.jsdelivr.net/npm/@react95/icons@2.5.0';
const R95_LISTA = 'https://data.jsdelivr.com/v1/packages/npm/@react95/icons@2.5.0?structure=flat';
const XP_RAW = 'https://raw.githubusercontent.com/B00merang-Artwork/Windows-XP/master';
const XP_TREE = 'https://api.github.com/repos/B00merang-Artwork/Windows-XP/git/trees/master?recursive=1';

// Palavras-chave por nome, em ordem de prioridade (1ª = match forte).
// react95: casadas contra o BASE name (antes de _WxH_D), minúsculo.
const KW_98 = {
  folder:['folder'], folderOpen:['folderopen','folder'],
  sql:['database','odbc','sql','filetext'], grid:['columns','table','grid'],
  props:['filesettings','filetextsettings','settings'], search:['filefind','find','search'],
  network:['microsoftnetwork','network','globe'], terminal:['msdos','command','terminal','console'],
  report:['doc','report','chart'], database:['database','drvspace','disk','odbc'],
  computer:['computer'], table:['columns','table','grid'],
  view:['eye','view','filefind','find'], column:['columns','column'],
  key:['key'], run:['run','exec','play','application'],
  save:['save','floppy','drvspace','disk'], insert:['billadd','add','insert','new'],
  edit:['filepen','filepencil','pen','pencil','edit'], trash:['delete','recycle','trash'],
  refresh:['refresh','reload','sync'], filter:['filter','funnel'],
  newdoc:['blankscreen','doc','blank','new'], stop:['forbidden','filecorrupted','stop','error'],
  clock:['date','dial','clock','time'], speaker:['mmsys','speaker','volume','sound','mplayer'],
  wifi:['microsoftnetwork','inetcfg','inetcpl','network','globe'], power:['power','shutdown'],
  logoff:['logoff','logout','key'], user:['user','people','person','account'],
  help:['helpbook','help'], star:['fave','bookmark','star','favorite'],
};
// XP: casadas contra o STEM do arquivo (sem extensão), minúsculo, em 128x128/**.
const KW_AERO = {
  folder:['gtk-directory','folder'], folderOpen:['folder-open','folder_open','folder'],
  sql:['libreoffice-base','ooo-base','phppg','database'], grid:['x-office-spreadsheet','libreoffice-calc','gnometris','table'],
  props:['document-properties','gtk-properties','cs-details','preferences-system'], search:['system-search','edit-find','kfind','gnome-searchtool','find'],
  network:['network-workgroup','gnome-remote-desktop','cs-network','network'], terminal:['gnome-terminal','terminal','openterm'],
  report:['x-office-document','libreoffice-writer','document'], database:['drive-harddisk','libreoffice-base','server'],
  computer:['computer','gnome-fs-client'], table:['x-office-spreadsheet','libreoffice-calc'],
  view:['document-print-preview','edit-find','view'], column:['x-office-spreadsheet','format-columns'],
  key:['seahorse','key_bindings','keybindings','key'], run:['system-run','gnome-run','run'],
  save:['document-save','media-floppy','gtk-save'], insert:['list-add','gtk-add','add'],
  edit:['accessories-text-editor','text-editor','gedit','gtk-edit'], trash:['user-trash','gtk-delete','edit-delete','trash'],
  refresh:['view-refresh','gtk-refresh','stock_refresh','reload'], filter:['view-filter','filter','funnel'],
  newdoc:['document-new','gtk-new','stock_new'], stop:['process-stop','gtk-stop','dialog-error','stop'],
  clock:['gnome-panel-clock','cairo-clock','clock','time'], speaker:['audio-volume-high','multimedia-volume-control','gnome-volume-control','speaker'],
  wifi:['network-wireless','nm-device-wireless','wifi','network'], power:['system-shutdown','gnome-power-manager','cs-power','power'],
  logoff:['system-log-out','gnome-logout','logout'], user:['system-users','config-users','stock_people','cs-user-accounts','user'],
  help:['help-browser','help-index','khelpcenter','help'], star:['bookmark-new','bookmark','emblem-favorite','starred','favorite'],
};
const NOMES = Object.keys(KW_98);

const txt = async (u) => (await fetch(u)).text();
const json = async (u) => JSON.parse(await txt(u));
const PNG_MAGIC = [0x89,0x50,0x4e,0x47];

async function baixarPng(url, tentativasSymlink = 5) {
  // Resolve symlinks do raw.githubusercontent (devolve o caminho-alvo como texto).
  let atual = url;
  for (let i = 0; i < tentativasSymlink; i++) {
    const r = await fetch(atual);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const ehPng = PNG_MAGIC.every((b, j) => buf[j] === b);
    if (ehPng) return buf;
    // texto curto = provável symlink relativo
    const alvo = buf.toString('utf8').trim();
    if (buf.length < 200 && alvo && !alvo.includes('\n')) {
      atual = new URL(alvo, atual + '').toString();
      continue;
    }
    return null;
  }
  return null;
}

function escolher(stems, kws) {
  // devolve { stem, prioridade } do melhor match; prioridade = índice na lista (0 = forte)
  for (let p = 0; p < kws.length; p++) {
    const kw = kws[p];
    const hit = stems.find((s) => s.toLowerCase().includes(kw));
    if (hit) return { stem: hit, prioridade: p };
  }
  return null;
}

async function vendor98(cobertura) {
  const lista = await json(R95_LISTA);
  const pngs = lista.files.map((f) => f.name).filter((n) => /\.png$/i.test(n) && /_(16x16|32x32)_\d\.png$/.test(n));
  // index: base -> { 16: arquivo, 32: arquivo } preferindo depth 8 > 4
  const idx = {};
  for (const n of pngs) {
    const m = n.match(/\/png\/(.+)_(16x16|32x32)_(\d)\.png$/);
    if (!m) continue;
    const [, base, dim, depth] = m;
    const tier = dim === '16x16' ? '16' : '32';
    idx[base] ??= {};
    const prev = idx[base][tier];
    if (!prev || Number(depth) > prev.depth) idx[base][tier] = { arquivo: n, depth: Number(depth) };
  }
  const bases = Object.keys(idx);
  await mkdir(join(DEST, '98'), { recursive: true });
  for (const nome of NOMES) {
    const esc = escolher(bases, KW_98[nome]);
    if (!esc) { cobertura.push({ pele:'98', nome, status:'FALTA', via:null }); continue; }
    const base = esc.stem;
    for (const tier of ['16','32']) {
      let alvo = idx[base][tier];
      if (!alvo) alvo = idx[base]['32'] || idx[base]['16']; // fallback de tier
      const buf = await baixarPng(REACT95 + alvo.arquivo);
      if (buf) await writeFile(join(DEST, '98', `${nome}-${tier}.png`), buf);
    }
    cobertura.push({ pele:'98', nome, status: esc.prioridade === 0 ? 'OK' : 'REVISAR', via: base, kw: KW_98[nome][esc.prioridade] });
  }
}

async function vendorAero(cobertura) {
  const tree = await json(XP_TREE);
  const paths = tree.tree.map((t) => t.path).filter((p) => /^128x128\/.+\.png$/i.test(p));
  const stems = paths.map((p) => p.replace(/^128x128\//, '').replace(/\.png$/i, '')); // ex.: apps/system-search
  await mkdir(join(DEST, 'aero'), { recursive: true });
  for (const nome of NOMES) {
    const esc = escolher(stems, KW_AERO[nome]);
    if (!esc) { cobertura.push({ pele:'aero', nome, status:'FALTA', via:null }); continue; }
    const buf = await baixarPng(`${XP_RAW}/128x128/${esc.stem}.png`);
    if (buf) await writeFile(join(DEST, 'aero', `${nome}.png`), buf);
    cobertura.push({ pele:'aero', nome, status: esc.prioridade === 0 ? 'OK' : 'REVISAR', via: esc.stem, kw: KW_AERO[nome][esc.prioridade] });
  }
}

function folhaContato() {
  const linhas = NOMES.map((n) => `
    <tr><td>${n}</td>
      <td class=c98><img src="98/${n}-16.png"><img src="98/${n}-32.png"></td>
      <td class=caero><img src="aero/${n}.png"></td></tr>`).join('');
  return `<!doctype html><meta charset=utf8><title>Ícones — folha de contato</title>
<style>body{background:#1a1a1a;color:#eee;font:14px system-ui}img{margin:4px;vertical-align:middle}
table{border-collapse:collapse}td{padding:8px 12px;border-top:1px solid #333}
.c98{background:#c3c7cb}.caero{background:linear-gradient(#eef5fc,#d4e6f7)}
.c98 img{image-rendering:pixelated}.caero img{width:48px;height:48px}</style>
<h2>Folha de contato (98 = pixelado, aero = suave)</h2><table>
<tr><th>nome</th><th>98 (16/32)</th><th>aero</th></tr>${linhas}</table>`;
}

const cobertura = [];
await vendor98(cobertura);
await vendorAero(cobertura);
await writeFile(join(DEST, '_cobertura.json'), JSON.stringify(cobertura, null, 2));
await writeFile(join(DEST, '_contato.html'), folhaContato());
const revisar = cobertura.filter((c) => c.status !== 'OK');
console.log(`Gerados ${cobertura.length} registros. A revisar (${revisar.length}):`);
for (const c of revisar) console.log(`  [${c.pele}] ${c.nome} -> ${c.status} (${c.via ?? 'sem match'})`);
console.log('Abra apps/web/src/tema/icones/assets/_contato.html no navegador.');
```

- [ ] **Step 2: Rodar o script**

Run: `node scripts/vendor-icones.mjs`
Expected: imprime "Gerados 64 registros." (32×2 peles) e a lista "A revisar". Cria `assets/98/*.png`, `assets/aero/*.png`, `_contato.html`, `_cobertura.json`. Se algum `FALTA` aparecer, anotar — será resolvido na Task 5 (override). Tudo bem prosseguir com `REVISAR` por ora.

- [ ] **Step 3: Ignorar artefatos de revisão no git**

Adicionar a `apps/web/src/tema/icones/assets/.gitignore`:

```
_contato.html
_cobertura.json
```

(Os PNGs SÃO versionados; os relatórios não.)

- [ ] **Step 4: Commit**

```bash
git add scripts/vendor-icones.mjs apps/web/src/tema/icones/assets/98 apps/web/src/tema/icones/assets/aero apps/web/src/tema/icones/assets/.gitignore
git commit -m "feat(tema): vendoriza ícones por pele (98=react95, aero=XP Luna)"
```

---

### Task 2: `nomes.ts` + `manifesto.ts` (TDD)

**Files:**
- Create: `apps/web/src/tema/icones/nomes.ts`, `apps/web/src/tema/icones/manifesto.ts`
- Test: `apps/web/src/tema/icones/manifesto.test.ts`

- [ ] **Step 1: Criar `nomes.ts`**

```ts
// Fonte da verdade dos nomes de ícone. NomeIcone deriva daqui.
export const NOMES_ICONES = [
  'folder','folderOpen','sql','grid','props','search','network','terminal',
  'report','database','computer','table','view','column','key','run','save',
  'insert','edit','trash','refresh','filter','newdoc','stop','clock','speaker',
  'wifi','power','logoff','user','help','star',
] as const;

export type NomeIcone = (typeof NOMES_ICONES)[number];

export function temIcone(nome: string): nome is NomeIcone {
  return (NOMES_ICONES as readonly string[]).includes(nome);
}

export function listarIcones(): NomeIcone[] {
  return [...NOMES_ICONES];
}
```

- [ ] **Step 2: Escrever o teste que falha `manifesto.test.ts`**

```ts
import { test, expect } from 'vitest';
import { NOMES_ICONES } from './nomes';
import { MANIFESTO } from './manifesto';

test('todo nome tem assets em ambas as peles', () => {
  for (const nome of NOMES_ICONES) {
    const a98 = MANIFESTO['98'][nome];
    expect(a98, `98/${nome}`).toBeDefined();
    expect(a98!['16'], `98/${nome}-16`).toBeTruthy();
    expect(a98!['32'], `98/${nome}-32`).toBeTruthy();
    const aAero = MANIFESTO['aero'][nome];
    expect(aAero, `aero/${nome}`).toBeDefined();
    expect(aAero!.base, `aero/${nome}.base`).toBeTruthy();
  }
});

test('o manifesto não tem nome fora de NOMES_ICONES', () => {
  const validos = new Set<string>(NOMES_ICONES);
  for (const pele of ['98','aero'] as const)
    for (const nome of Object.keys(MANIFESTO[pele]))
      expect(validos.has(nome), `${pele}/${nome} inesperado`).toBe(true);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd apps/web && bunx vitest run src/tema/icones/manifesto.test.ts`
Expected: FAIL ("Failed to resolve import './manifesto'").

- [ ] **Step 4: Criar `manifesto.ts`**

```ts
import type { Pele } from '../tipos';
import { NOMES_ICONES, type NomeIcone } from './nomes';

export interface TiersIcone { '16'?: string; '32'?: string; base?: string }
export type Manifesto = Record<Pele, Partial<Record<NomeIcone, TiersIcone>>>;

const url98 = import.meta.glob('./assets/98/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const urlAero = import.meta.glob('./assets/aero/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const valido = new Set<string>(NOMES_ICONES);

function montar98(): Partial<Record<NomeIcone, TiersIcone>> {
  const out: Partial<Record<NomeIcone, TiersIcone>> = {};
  for (const [caminho, url] of Object.entries(url98)) {
    const m = caminho.match(/\/([a-zA-Z]+)-(16|32)\.png$/);
    if (!m) continue;
    const [, nome, tier] = m;
    if (!valido.has(nome)) continue;
    (out[nome as NomeIcone] ??= {})[tier as '16' | '32'] = url;
  }
  return out;
}

function montarAero(): Partial<Record<NomeIcone, TiersIcone>> {
  const out: Partial<Record<NomeIcone, TiersIcone>> = {};
  for (const [caminho, url] of Object.entries(urlAero)) {
    const m = caminho.match(/\/([a-zA-Z]+)\.png$/);
    if (!m) continue;
    const nome = m[1];
    if (!valido.has(nome)) continue;
    (out[nome as NomeIcone] ??= {}).base = url;
  }
  return out;
}

export const MANIFESTO: Manifesto = { '98': montar98(), aero: montarAero() };
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd apps/web && bunx vitest run src/tema/icones/manifesto.test.ts`
Expected: PASS (2 testes). Se "todo nome tem assets" falhar listando nomes, voltar à Task 1/Task 5 e resolver o override do nome faltante antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/tema/icones/nomes.ts apps/web/src/tema/icones/manifesto.ts apps/web/src/tema/icones/manifesto.test.ts
git commit -m "feat(tema): nomes canônicos + manifesto de assets por pele"
```

---

### Task 3: Reescrever `motor.ts` (resolução por pele) (TDD)

**Files:**
- Modify: `apps/web/src/tema/icones/motor.ts`
- Modify (test): `apps/web/src/tema/icones/motor.test.ts`

- [ ] **Step 1: Reescrever `motor.test.ts`** (substitui os testes de PALETA/MAPAS)

```ts
import { test, expect } from 'vitest';
import { obterIcone, temIcone, listarIcones } from './motor';
import { NOMES_ICONES } from './nomes';

test('listarIcones e temIcone refletem NOMES_ICONES', () => {
  expect(new Set(listarIcones())).toEqual(new Set(NOMES_ICONES));
  expect(temIcone('folder')).toBe(true);
  expect(temIcone('nao-existe')).toBe(false);
});

test('98: tamanho <= 16 usa o tier 16; > 16 usa o tier 32', () => {
  const p = obterIcone('folder', '98', 16);
  const g = obterIcone('folder', '98', 32);
  expect(p).toBeTruthy();
  expect(g).toBeTruthy();
  // urls de tiers diferentes não colidem (a menos que falte um tier nativo)
  expect(typeof p).toBe('string');
});

test('aero: usa o asset base independentemente do tamanho', () => {
  const a = obterIcone('folder', 'aero', 16);
  const b = obterIcone('folder', 'aero', 48);
  expect(a).toBeTruthy();
  expect(a).toBe(b);
});

test('obterIcone devolve string para todos os nomes em ambas as peles', () => {
  for (const nome of NOMES_ICONES) {
    expect(typeof obterIcone(nome, '98', 16)).toBe('string');
    expect(typeof obterIcone(nome, 'aero', 32)).toBe('string');
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/web && bunx vitest run src/tema/icones/motor.test.ts`
Expected: FAIL (assinatura antiga de `obterIcone`/imports de `bitmaps` removidos ainda não existem).

- [ ] **Step 3: Reescrever `motor.ts` por completo**

```ts
import type { Pele } from '../tipos';
import { MANIFESTO, type TiersIcone } from './manifesto';
import { NOMES_ICONES, temIcone, listarIcones, type NomeIcone } from './nomes';

export { NOMES_ICONES, temIcone, listarIcones };
export type { NomeIcone };

// PNG 1×1 transparente — só como rede de segurança se faltar um asset.
const TRANSPARENTE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAYAAACgQDFGAAAAAElFTkSuQmCC';

function tiers(nome: NomeIcone, pele: Pele): TiersIcone | undefined {
  return MANIFESTO[pele][nome];
}

/** Resolve a URL do asset para a pele/tamanho. */
export function obterIcone(nome: NomeIcone, pele: Pele, tamanho = 16): string {
  const t = tiers(nome, pele);
  if (!t) return TRANSPARENTE;
  if (pele === 'aero') return t.base ?? t['32'] ?? t['16'] ?? TRANSPARENTE;
  // 98: tier nativo por tamanho, com fallback ao outro tier
  if (tamanho <= 16) return t['16'] ?? t['32'] ?? TRANSPARENTE;
  return t['32'] ?? t['16'] ?? TRANSPARENTE;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/web && bunx vitest run src/tema/icones/motor.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: `tsc` limpo**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: erros APENAS em `Icone.tsx` (ainda chama a assinatura antiga e importa `gloss`) e em `bitmaps.ts`/imports órfãos — resolvidos na Task 4.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/tema/icones/motor.ts apps/web/src/tema/icones/motor.test.ts
git commit -m "feat(tema): motor resolve assets por pele (tiers 98 / base aero), sem canvas/gloss"
```

---

### Task 4: Reescrever `Icone.tsx` + remover `bitmaps.ts` (TDD)

**Files:**
- Modify: `apps/web/src/tema/icones/Icone.tsx`
- Modify (test): `apps/web/src/tema/icones/Icone.test.tsx`
- Delete: `apps/web/src/tema/icones/bitmaps.ts`

- [ ] **Step 1: Reescrever `Icone.test.tsx`**

```tsx
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icone } from './Icone';
import { ProvedorTema } from '../ProvedorTema';

test('renderiza um <img> com o alt informado', () => {
  render(<Icone nome="folder" tamanho={16} alt="Pasta" />);
  const img = screen.getByAltText('Pasta');
  expect(img.tagName).toBe('IMG');
  expect(img).toHaveAttribute('width', '16');
  expect(img.getAttribute('src')).toBeTruthy();
});

test('sem ProvedorTema: assume pele 98 (image-rendering pixelated)', () => {
  const { container } = render(<Icone nome="grid" />);
  const img = container.querySelector('img')!;
  expect(img).toBeInTheDocument();
  expect(img).toHaveAttribute('alt', '');
  expect(img).toHaveStyle({ imageRendering: 'pixelated' });
});

test('dentro do ProvedorTema (pele padrão) renderiza um <img>', () => {
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
Expected: FAIL (Icone ainda usa `gloss`/assinatura antiga de `obterIcone`).

- [ ] **Step 3: Reescrever `Icone.tsx`**

```tsx
import { memo, useContext, type CSSProperties } from 'react';
import { ContextoTema } from '../ProvedorTema';
import { obterIcone, type NomeIcone } from './motor';

export interface PropsIcone {
  nome: NomeIcone;
  tamanho?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

export const Icone = memo(function Icone({
  nome,
  tamanho = 16,
  alt,
  className,
  style,
}: PropsIcone) {
  const ctx = useContext(ContextoTema);
  const pele = ctx?.tema.pele ?? '98';
  const renderizacao: CSSProperties['imageRendering'] = pele === 'aero' ? 'auto' : 'pixelated';
  return (
    <img
      src={obterIcone(nome, pele, tamanho)}
      width={tamanho}
      height={tamanho}
      alt={alt ?? ''}
      className={className}
      draggable={false}
      style={{ imageRendering: renderizacao, verticalAlign: 'middle', ...style }}
    />
  );
});
```

- [ ] **Step 4: Deletar `bitmaps.ts`**

```bash
git rm apps/web/src/tema/icones/bitmaps.ts
```

- [ ] **Step 5: Rodar e ver passar + tsc**

Run: `cd apps/web && bunx vitest run src/tema/icones/Icone.test.tsx && bunx tsc --noEmit`
Expected: PASS (3 testes) + `tsc` limpo (sem mais referências a `bitmaps`/`gloss`/`PALETA`/`MAPAS`).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/tema/icones/Icone.tsx apps/web/src/tema/icones/Icone.test.tsx
git commit -m "feat(tema): <Icone> resolve por pele e define image-rendering; remove gloss e bitmaps.ts"
```

---

### Task 5: Revisão visual + overrides dos ícones sinalizados

**Files:**
- Modify: `scripts/vendor-icones.mjs` (bloco de overrides)
- Regenera: assets sinalizados

> A Task 1 marcou nomes como `REVISAR`/`FALTA` no console e em `_cobertura.json`. Aqui um humano confere a folha de contato e fixa o arquivo-fonte certo para os ruins (ex.: `network` virando um glyph de desktop remoto, ou `sql`/`grid`/`column`/`key`/`filter` sem bom match).

- [ ] **Step 1: Conferir a folha de contato**

Abrir `apps/web/src/tema/icones/assets/_contato.html` no navegador. Para cada nome `REVISAR`/`FALTA` (e qualquer um que destoe visualmente da pele), anotar o nome e a fonte correta:
- **98:** procurar o base name certo na lista do pacote (`https://data.jsdelivr.com/v1/packages/npm/@react95/icons@2.5.0?structure=flat`).
- **aero:** procurar o stem certo na árvore B00merang (`https://api.github.com/repos/B00merang-Artwork/Windows-XP/git/trees/master?recursive=1`, paths `128x128/**`).

- [ ] **Step 2: Adicionar o mapa de overrides ao script**

Em `scripts/vendor-icones.mjs`, logo após `const NOMES = Object.keys(KW_98);`, inserir (preencher com os achados do Step 1; exemplos ilustrativos — ajustar à realidade):

```js
// Overrides manuais (pinam o BASE/STEM exato, ignorando o matcher).
const OVR_98 = {
  // nome: 'BaseNameExatoDoReact95',
  // ex.: column: 'Columns',
};
const OVR_AERO = {
  // nome: 'subpasta/stem-exato',  (sem .png, relativo a 128x128/)
  // ex.: network: 'places/network-workgroup',
};
```

E aplicar nos seletores: em `vendor98`, antes de `escolher(...)`:

```js
    if (OVR_98[nome]) { const base = OVR_98[nome];
      for (const tier of ['16','32']) {
        const alvo = idx[base]?.[tier] || idx[base]?.['32'] || idx[base]?.['16'];
        if (alvo) { const buf = await baixarPng(REACT95 + alvo.arquivo); if (buf) await writeFile(join(DEST,'98',`${nome}-${tier}.png`), buf); }
      }
      cobertura.push({ pele:'98', nome, status:'OVERRIDE', via: base }); continue; }
```

em `vendorAero`, antes de `escolher(...)`:

```js
    if (OVR_AERO[nome]) { const stem = OVR_AERO[nome];
      const buf = await baixarPng(`${XP_RAW}/128x128/${stem}.png`);
      if (buf) await writeFile(join(DEST,'aero',`${nome}.png`), buf);
      cobertura.push({ pele:'aero', nome, status:'OVERRIDE', via: stem }); continue; }
```

- [ ] **Step 3: Regenerar e reconferir**

Run: `node scripts/vendor-icones.mjs`
Expected: os nomes em override saem como `OVERRIDE`; lista "A revisar" encurta. Reabrir `_contato.html` e confirmar que todos os 32 estão coerentes com a respectiva pele.

- [ ] **Step 4: Garantir cobertura (teste de manifesto)**

Run: `cd apps/web && bunx vitest run src/tema/icones/manifesto.test.ts`
Expected: PASS — nenhum nome sem asset.

- [ ] **Step 5: Commit**

```bash
git add scripts/vendor-icones.mjs apps/web/src/tema/icones/assets/98 apps/web/src/tema/icones/assets/aero
git commit -m "fix(tema): overrides de ícones por pele após revisão visual da folha de contato"
```

---

### Task 6: Verificação final da fase

- [ ] **Step 1: Suíte inteira verde**

Run: `cd apps/web && bunx vitest run`
Expected: todos os arquivos passam (inclui `manifesto.test.ts`, `motor.test.ts`, `Icone.test.tsx`; testes de consumidores que checam `<img>`/`alt` seguem verdes).

- [ ] **Step 2: `tsc` + build**

Run: `cd apps/web && bunx tsc --noEmit && bunx vite build`
Expected: `tsc` limpo; build conclui com os PNGs bundlados/hashados.

- [ ] **Step 3: Varredura de resíduos do motor antigo**

Run: `git grep -nE "bitmaps|PALETA|MAPAS|desenhar|gloss" apps/web/src`
Expected: sem ocorrências em `apps/web/src` (todas removidas). Qualquer resto deve ser apagado.

- [ ] **Step 4: Conferência visual manual (pós-execução)**

`bun run dev:web` → alternar entre as peles `98` e `aero` e confirmar: na `98`, ícones pixelados autênticos no título, tarefas, Iniciar, atalhos, bandeja, diálogos, árvore do Explorador e nós de Relacionamentos; na `aero`, ícones XP lisos e envidraçados, **sem contorno e sem gloss artificial**, escalando suave. (Verificação humana — registrar pendência se algo destoar.)

---

### Self-review (preenchido)

**1. Cobertura do spec:**
- API `<Icone>` inalterada + `gloss` removido → Task 4 ✓ (varredura confirmou `gloss` só interno).
- Motor substituído (sem canvas/gloss), `bitmaps.ts` removido → Task 3 + Task 4 ✓.
- Assets vendorizados e normalizados (`98/<nome>-16|32`, `aero/<nome>`) → Task 1 ✓.
- Manifesto Vite-glob tipado por pele → Task 2 ✓.
- Resolução por pele (98 tiers pixelados / aero base suave) → Task 3 + Task 4 ✓.
- Fonte da verdade dos nomes em `nomes.ts` (`NomeIcone` derivado; manifesto validado contra a lista) → Task 2 ✓.
- Conjunto XP **curado** + **relatório de cobertura** + regra de substituto → Task 1 (relatório) + Task 5 (revisão/override) ✓.
- Testes: completude do manifesto + `image-rendering` por pele + regressão de consumidores → Tasks 2/3/4/6 ✓.
- Verificação final (vitest, tsc, build, varredura, visual) → Task 6 ✓.

**2. Sem placeholders:** todo passo traz código/comando concreto. As tabelas `KW_98`/`KW_AERO` são dados reais; nomes fracos são tratados pelo fluxo aprovado (relatório → revisão → override) na Task 5, não por "TODO".

**3. Consistência de tipos/nomes:** `NomeIcone`/`NOMES_ICONES` (nomes.ts) usados igualmente em `manifesto.ts`, `motor.ts`, `Icone.tsx` e testes. `MANIFESTO`/`TiersIcone` (manifesto.ts) consumidos em `motor.ts` e no teste. `obterIcone(nome, pele, tamanho)` tem a mesma assinatura no motor, no teste e na chamada de `Icone.tsx`. `Pele = 'aero' | '98'` (tema/tipos) usado de ponta a ponta. Os nomes de arquivo (`<nome>-16.png`/`<nome>-32.png`/`<nome>.png`) batem entre o script (escrita), o manifesto (regex de leitura) e os testes.
