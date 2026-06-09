# Revamp Visual — Fase 2: Painel de Tweaks + persistência + afordâncias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o painel de Tweaks (theming ao vivo) sobre o módulo `tema/`: um estado de tema completo (pele + tweaks por pele + globais), persistido em `localStorage`, aplicado ao `document` (vars CSS + `data-*`); controles tipados; um painel flutuante arrastável; e as afordâncias de abertura (engrenagem na bandeja, "Configurações" no Iniciar, "Propriedades" no menu de contexto da área de trabalho). Liga **Som** (ao `sons.ts` existente), **Animações** (`--motion` + `prefers-reduced-motion`), e escreve os atributos/vars de acento, vidro, cantos, wallpaper, padrão, densidade e CRT.

**Architecture:** O estado do tema deixa de ser só `pele` e passa a ser `EstadoTema` (`pele`, `aero`, `n98`, `motion`, `sound`) em `tema/tipos.ts`. Uma função pura `aplicarTema(estado)` em `tema/tweaks.ts` escreve tudo no `documentElement.style` + `document.body` (incluindo gate de som via `sons.ts`). `ProvedorTema` detém o `EstadoTema`, aplica a cada mudança, persiste, e re-aplica quando `prefers-reduced-motion` muda; expõe setters tipados via contexto. `useTweaks()` lê o contexto completo; `useTema()` segue retornando `{ pele, definirPele }` (compat). Os controles vivem em `tema/controles.tsx` (primitivos tipados). `PainelTweaks.tsx` monta os controles relevantes à pele ativa. Uma loja `usePainelTweaks` controla abertura; uma loja `useBoot` permite "Reiniciar sessão" (replay da `TelaBoot` sem derrubar a sessão SQL).

**Tech Stack:** React 18 + contexto + zustand, CSS custom properties + `data-*`, Vitest + RTL (jsdom), TypeScript estrito. pt-BR; `tsc --noEmit` limpo é gate. Sem novas dependências.

**Builds on Fase 1:** o módulo `tema/` já tem `ProvedorTema`/`ContextoTema`/`useTema`/`Pele` e `tema/icones/` (`<Icone>`/`NomeIcone`). O painel **descarta** o `postMessage`/edit-mode dos protótipos e **reusa** `sons.ts` (não porta `DBOS_sfx`). As peles Aero/98 completas (visual de wallpaper/glass/CRT) são da **Fase 3** — aqui os controles **escrevem** os atributos/vars; alguns só terão efeito visual quando a Fase 3 adicionar `pele-aero.css`/`pele-98.css`. A pele padrão segue **"98"** nesta fase (a virada para Aero em máquina nova é da Fase 3, quando a folha Aero existir).

---

### Decisões desta fase

- **Forma persistida (`localStorage['dbos_tema']`)** passa de `{ pele }` para o `EstadoTema` inteiro. A leitura faz *merge por chave* com `TEMA_PADRAO`, então dados antigos (`{ pele: "aero" }`) continuam válidos (as demais chaves caem no padrão).
- **`aplicarTema` é skin-aware.** Ela limpa os overrides inline específicos de pele (voltam ao token de `tokens.css`) e então escreve só os da pele ativa. Acentos ficam **independentes por pele** (Aero = `--accent-h`; 98 = `--accent`).
- **Som = um único sistema.** `sons.ts` ganha um flag de módulo (`definirSomHabilitado`/`somHabilitado`); `tocarSom` sai cedo quando desligado. `DBOS_sfx`/`window.DBOS_sound` do protótipo **não** são portados.
- **Animações** computa `--motion` como `(motion && !prefers-reduced-motion) ? '1' : '0.001'` e re-aplica quando a média muda.
- **"Reiniciar sessão"** apenas reexecuta a `TelaBoot` (via loja `useBoot`); **não** invalida a query de sessão SQL.
- **Mapeamentos de opção (verbatim dos protótipos):** wallpaper `aqua|sunset|verde|noite`; padrão `dither|solid|brand|grid`; acento 98 chips `#1084d0 #11807e #b0228c #2f8f3a #5a3fd0`; matiz Aero `150–320°`, passo 2, padrão 200; cantos `aero|reto`; densidade `compacto|normal`; vidro `14px|0px`; CRT `0.5|0`.

### Vars/atributos escritos por `aplicarTema`

| Origem | Alvo | Valores |
|---|---|---|
| `pele` | `body.dataset.skin` | `"aero"` \| `"98"` |
| `motion` | `--motion` (documentElement) | `"1"` \| `"0.001"` (respeita `prefers-reduced-motion`) |
| `sound` | `sons.definirSomHabilitado` | `true` \| `false` |
| `aero.accentHue` | `--accent-h` | número (só na pele aero) |
| `aero.corners` | `--round/--round-sm/--round-btn` + `body.dataset.corners` | `8/4/6px`+`"aero"` ou `0/0/0`+`"reto"` |
| `aero.glass` | `--glass-blur` | `"14px"` \| `"0px"` |
| `aero.wallpaper` | `body.dataset.wp` | `aqua\|sunset\|verde\|noite` |
| `n98.accent` | `--accent` | hex (só na pele 98) |
| `n98.crt` | `--crt` | `"0.5"` \| `"0"` |
| `n98.pattern` | `body.dataset.pat` | `dither\|solid\|brand\|grid` |
| `n98.density` | `body.style.fontSize` | `"11px"` \| `"12px"` |

### File structure for this plan

**`apps/web/src/tema`**
- Modify `tipos.ts` — tipos de tweak + `EstadoTema` + `TEMA_PADRAO` completo + listas de opção.
- Create `tweaks.ts` — `aplicarTema`, `lerEstadoInicial`, `persistirTema`.
- Create `tweaks.test.ts`.
- Modify `ProvedorTema.tsx` — estado completo, aplica/persiste/escuta MQ, setters.
- Modify `ProvedorTema.test.tsx` — nova forma persistida + atributos.
- Modify `ganchos.ts` — adiciona `useTweaks()`.
- Create `controles.tsx` — primitivos tipados.
- Create `controles.test.tsx`.
- Create `painel.ts` — loja `usePainelTweaks`.
- Create `PainelTweaks.tsx` + `PainelTweaks.css`.
- Create `PainelTweaks.test.tsx`.

**`apps/web/src/areaTrabalho`**
- Modify `sons.ts` — flag de habilitação + gate.
- Modify `sons.test.ts` — testa o gate.
- Modify `BarraTarefas.tsx` — engrenagem na bandeja.
- Modify `MenuIniciar.tsx` — item "Configurações".
- Modify `AreaTrabalho.tsx` — "Propriedades" no contexto + monta `<PainelTweaks/>`.

**`apps/web/src`**
- Create `boot.ts` — loja `useBoot`.
- Modify `App.tsx` — usa `useBoot`.
- Modify `App.test.tsx` — reseta `useBoot` entre testes.

---

### Task 1: Estado de tema completo + `aplicarTema` (TDD)

**Files:**
- Modify: `apps/web/src/tema/tipos.ts`
- Create: `apps/web/src/tema/tweaks.ts`
- Test: `apps/web/src/tema/tweaks.test.ts`

- [ ] **Step 1: Estender `apps/web/src/tema/tipos.ts`**

Substituir o conteúdo inteiro por:

```ts
export type Pele = 'aero' | '98';

export type Cantos = 'aero' | 'reto';
export type Wallpaper = 'aqua' | 'sunset' | 'verde' | 'noite';
export type Padrao98 = 'dither' | 'solid' | 'brand' | 'grid';
export type Densidade = 'compacto' | 'normal';

export interface TweaksAero {
  accentHue: number; // 150–320
  glass: boolean;
  corners: Cantos;
  wallpaper: Wallpaper;
}

export interface Tweaks98 {
  accent: string; // hex curado
  pattern: Padrao98;
  density: Densidade;
  crt: boolean;
}

export interface EstadoTema {
  pele: Pele;
  aero: TweaksAero;
  n98: Tweaks98;
  motion: boolean;
  sound: boolean;
}

export const CHAVE_TEMA = 'dbos_tema';

// Fase 2: padrão "98" (reproduz o visual atual). A Fase 3 muda para "aero"
// em máquina nova, quando a folha pele-aero existir.
export const TEMA_PADRAO: EstadoTema = {
  pele: '98',
  aero: { accentHue: 200, glass: true, corners: 'aero', wallpaper: 'aqua' },
  n98: { accent: '#1084d0', pattern: 'dither', density: 'normal', crt: false },
  motion: true,
  sound: true,
};

// Listas de opção (verbatim dos protótipos) — usadas pelo painel e pela validação.
export const WALLPAPERS: ReadonlyArray<{ valor: Wallpaper; rotulo: string }> = [
  { valor: 'aqua', rotulo: 'Aqua' },
  { valor: 'sunset', rotulo: 'Pôr do sol' },
  { valor: 'verde', rotulo: 'Verde' },
  { valor: 'noite', rotulo: 'Noite' },
];
export const PADROES: ReadonlyArray<{ valor: Padrao98; rotulo: string }> = [
  { valor: 'dither', rotulo: 'Pontilhado' },
  { valor: 'solid', rotulo: 'Sólido' },
  { valor: 'brand', rotulo: 'Marca' },
  { valor: 'grid', rotulo: 'Grade' },
];
export const ACENTOS_98: readonly string[] = [
  '#1084d0',
  '#11807e',
  '#b0228c',
  '#2f8f3a',
  '#5a3fd0',
];
```

- [ ] **Step 2: Escrever o teste que falha `apps/web/src/tema/tweaks.test.ts`**

```ts
import { test, expect, beforeEach } from 'vitest';
import { aplicarTema, lerEstadoInicial } from './tweaks';
import { TEMA_PADRAO, CHAVE_TEMA, type EstadoTema } from './tipos';
import { somHabilitado } from '../areaTrabalho/sons';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
  delete document.body.dataset.skin;
  delete document.body.dataset.corners;
  delete document.body.dataset.wp;
  delete document.body.dataset.pat;
});

function tema(parcial: Partial<EstadoTema>): EstadoTema {
  return { ...TEMA_PADRAO, ...parcial };
}

test('aplicarTema na pele 98 escreve acento, crt, padrão, densidade e nada de aero', () => {
  aplicarTema(
    tema({ pele: '98', n98: { accent: '#b0228c', pattern: 'grid', density: 'compacto', crt: true } }),
  );
  const raiz = document.documentElement.style;
  expect(document.body.dataset.skin).toBe('98');
  expect(raiz.getPropertyValue('--accent')).toBe('#b0228c');
  expect(raiz.getPropertyValue('--crt')).toBe('0.5');
  expect(document.body.dataset.pat).toBe('grid');
  expect(document.body.style.fontSize).toBe('11px');
  // overrides de aero foram limpos
  expect(raiz.getPropertyValue('--glass-blur')).toBe('');
  expect(document.body.dataset.wp).toBeUndefined();
});

test('aplicarTema na pele aero escreve matiz, cantos, vidro, wallpaper e nada de 98', () => {
  aplicarTema(
    tema({ pele: 'aero', aero: { accentHue: 280, glass: false, corners: 'reto', wallpaper: 'noite' } }),
  );
  const raiz = document.documentElement.style;
  expect(document.body.dataset.skin).toBe('aero');
  expect(raiz.getPropertyValue('--accent-h')).toBe('280');
  expect(raiz.getPropertyValue('--glass-blur')).toBe('0px');
  expect(raiz.getPropertyValue('--round')).toBe('0px'); // corners reto
  expect(document.body.dataset.corners).toBe('reto');
  expect(document.body.dataset.wp).toBe('noite');
  expect(document.body.dataset.pat).toBeUndefined();
});

test('motion=false reduz --motion', () => {
  aplicarTema(tema({ motion: false }));
  expect(document.documentElement.style.getPropertyValue('--motion')).toBe('0.001');
});

test('aplicarTema repercute o som no sistema de sons', () => {
  aplicarTema(tema({ sound: false }));
  expect(somHabilitado()).toBe(false);
  aplicarTema(tema({ sound: true }));
  expect(somHabilitado()).toBe(true);
});

test('lerEstadoInicial faz merge por chave com dados antigos', () => {
  localStorage.setItem(CHAVE_TEMA, JSON.stringify({ pele: 'aero' }));
  const e = lerEstadoInicial();
  expect(e.pele).toBe('aero');
  expect(e.aero).toEqual(TEMA_PADRAO.aero);
  expect(e.sound).toBe(true);
});

test('lerEstadoInicial cai no padrão com lixo', () => {
  localStorage.setItem(CHAVE_TEMA, '{nao-e-json');
  expect(lerEstadoInicial()).toEqual(TEMA_PADRAO);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd apps/web; bunx vitest run src/tema/tweaks.test.ts`
Expected: FAIL ("Failed to resolve import './tweaks'" e/ou `somHabilitado` inexistente). `somHabilitado` será criado na Task 2 — se o import quebrar a suíte inteira deste arquivo, siga assim mesmo (a Task 2 cria a função antes de rodar tudo de novo na Task 3). Para isolar, pode comentar temporariamente o teste de som; mas não é obrigatório.

- [ ] **Step 4: Criar `apps/web/src/tema/tweaks.ts`**

```ts
import {
  CHAVE_TEMA,
  TEMA_PADRAO,
  type EstadoTema,
  type Pele,
  type TweaksAero,
  type Tweaks98,
} from './tipos';
import { definirSomHabilitado } from '../areaTrabalho/sons';

const VARS_PELE = [
  '--accent',
  '--accent-h',
  '--glass-blur',
  '--crt',
  '--round',
  '--round-sm',
  '--round-btn',
];

function prefereReduzirMovimento(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function motionValor(motion: boolean): string {
  return motion && !prefereReduzirMovimento() ? '1' : '0.001';
}

// Escreve o tema inteiro no documento. Pura (sem React); idempotente.
export function aplicarTema(estado: EstadoTema): void {
  if (typeof document === 'undefined') return;
  const r = document.documentElement.style;
  const corpo = document.body;

  corpo.dataset.skin = estado.pele;
  r.setProperty('--motion', motionValor(estado.motion));
  definirSomHabilitado(estado.sound);

  // Limpa overrides específicos de pele → voltam ao token de tokens.css.
  for (const v of VARS_PELE) r.removeProperty(v);
  delete corpo.dataset.corners;
  delete corpo.dataset.wp;
  delete corpo.dataset.pat;
  corpo.style.removeProperty('font-size');

  if (estado.pele === 'aero') {
    const a: TweaksAero = estado.aero;
    r.setProperty('--accent-h', String(a.accentHue));
    const reto = a.corners === 'reto';
    r.setProperty('--round', reto ? '0px' : '8px');
    r.setProperty('--round-sm', reto ? '0px' : '4px');
    r.setProperty('--round-btn', reto ? '0px' : '6px');
    r.setProperty('--glass-blur', a.glass ? '14px' : '0px');
    corpo.dataset.corners = reto ? 'reto' : 'aero';
    corpo.dataset.wp = a.wallpaper;
  } else {
    const n: Tweaks98 = estado.n98;
    r.setProperty('--accent', n.accent);
    r.setProperty('--crt', n.crt ? '0.5' : '0');
    corpo.dataset.pat = n.pattern;
    corpo.style.fontSize = n.density === 'compacto' ? '11px' : '12px';
  }
}

function ehPele(v: unknown): v is Pele {
  return v === 'aero' || v === '98';
}

// Merge por chave: campos ausentes/ inválidos caem no padrão.
export function lerEstadoInicial(): EstadoTema {
  try {
    const cru = localStorage.getItem(CHAVE_TEMA);
    if (!cru) return TEMA_PADRAO;
    const o = JSON.parse(cru) as Partial<EstadoTema>;
    return {
      pele: ehPele(o.pele) ? o.pele : TEMA_PADRAO.pele,
      aero: { ...TEMA_PADRAO.aero, ...(o.aero ?? {}) },
      n98: { ...TEMA_PADRAO.n98, ...(o.n98 ?? {}) },
      motion: typeof o.motion === 'boolean' ? o.motion : TEMA_PADRAO.motion,
      sound: typeof o.sound === 'boolean' ? o.sound : TEMA_PADRAO.sound,
    };
  } catch {
    return TEMA_PADRAO;
  }
}

export function persistirTema(estado: EstadoTema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, JSON.stringify(estado));
  } catch {
    /* best-effort */
  }
}
```

> Nota: este arquivo importa `definirSomHabilitado`/(o teste importa `somHabilitado`) de `sons.ts`, criados na Task 2. Implemente a Task 2 antes de rodar o Step 5.

- [ ] **Step 5: (após a Task 2) rodar e ver passar**

Run: `cd apps/web; bunx vitest run src/tema/tweaks.test.ts`
Expected: PASS (6 testes). Volte aqui depois de concluir a Task 2.

- [ ] **Step 6: Commit (junto com a Task 2 — ver Task 2 Step 5)**

Esta task e a Task 2 são interdependentes (o gate de som). Faça o commit conjunto descrito na Task 2.

---

### Task 2: Gate de som em `sons.ts` (TDD)

**Files:**
- Modify: `apps/web/src/areaTrabalho/sons.ts`
- Test: `apps/web/src/areaTrabalho/sons.test.ts`

- [ ] **Step 1: Adicionar o teste em `apps/web/src/areaTrabalho/sons.test.ts`**

Acrescentar ao arquivo (mantendo o teste existente):

```ts
import { test, expect } from 'vitest';
import { tocarSom, definirSomHabilitado, somHabilitado } from './sons';

test('definirSomHabilitado alterna o flag consultável', () => {
  definirSomHabilitado(false);
  expect(somHabilitado()).toBe(false);
  definirSomHabilitado(true);
  expect(somHabilitado()).toBe(true);
});

test('tocarSom é seguro com o som desligado', () => {
  definirSomHabilitado(false);
  expect(() => tocarSom('abrir')).not.toThrow();
  definirSomHabilitado(true);
});
```

(O `import` no topo do arquivo já traz `tocarSom`; ajuste a linha de import existente para incluir `definirSomHabilitado, somHabilitado` em vez de duplicar.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/web; bunx vitest run src/areaTrabalho/sons.test.ts`
Expected: FAIL (`definirSomHabilitado`/`somHabilitado` não exportados).

- [ ] **Step 3: Editar `apps/web/src/areaTrabalho/sons.ts`**

Adicionar o flag de módulo logo após a linha `let contexto: AudioContext | null = null;`:

```ts
let habilitado = true;

export function definirSomHabilitado(valor: boolean): void {
  habilitado = valor;
}

export function somHabilitado(): boolean {
  return habilitado;
}
```

E no início de `tocarSom`, antes de `const ctx = obterContexto();`, inserir o gate:

```ts
export function tocarSom(tipo: TipoSom): void {
  if (!habilitado) return;
  const ctx = obterContexto();
  // ...resto inalterado
```

- [ ] **Step 4: Rodar e ver passar (sons + tweaks)**

Run: `cd apps/web; bunx vitest run src/areaTrabalho/sons.test.ts src/tema/tweaks.test.ts`
Expected: PASS (sons: 3 testes; tweaks: 6 testes). Agora volte e marque a Task 1 Step 5 como passada.

- [ ] **Step 5: `tsc` + Commit conjunto (Task 1 + Task 2)**

Run: `cd apps/web; bunx tsc --noEmit`
Expected: limpo.

```bash
git add apps/web/src/tema/tipos.ts apps/web/src/tema/tweaks.ts apps/web/src/tema/tweaks.test.ts apps/web/src/areaTrabalho/sons.ts apps/web/src/areaTrabalho/sons.test.ts
git commit -m "feat(tema): estado de tema completo, aplicarTema e gate de som"
```

---

### Task 3: `ProvedorTema` com estado completo + `useTweaks` (TDD)

**Files:**
- Modify: `apps/web/src/tema/ProvedorTema.tsx`, `apps/web/src/tema/ganchos.ts`
- Test: `apps/web/src/tema/ProvedorTema.test.tsx`

- [ ] **Step 1: Reescrever o teste `apps/web/src/tema/ProvedorTema.test.tsx`**

Substituir o conteúdo inteiro por:

```tsx
import { test, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ProvedorTema } from './ProvedorTema';
import { useTema, useTweaks } from './ganchos';
import { CHAVE_TEMA, TEMA_PADRAO } from './tipos';

function Sonda() {
  const { pele, definirPele } = useTema();
  const { definir98, definirSound } = useTweaks();
  return (
    <>
      <button onClick={() => definirPele('aero')}>pele:{pele}</button>
      <button onClick={() => definir98({ accent: '#b0228c' })}>acento98</button>
      <button onClick={() => definirSound(false)}>mudo</button>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  delete document.body.dataset.skin;
  document.documentElement.removeAttribute('style');
});

test('aplica a pele padrão "98" no body em máquina nova', () => {
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('98');
  expect(screen.getByText(/pele:/)).toHaveTextContent('pele:98');
});

test('definirPele troca a pele, atualiza o body e persiste o estado completo', () => {
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  act(() => { screen.getByText(/pele:/).click(); });
  expect(document.body.dataset.skin).toBe('aero');
  const persistido = JSON.parse(localStorage.getItem(CHAVE_TEMA)!);
  expect(persistido.pele).toBe('aero');
  expect(persistido.aero).toEqual(TEMA_PADRAO.aero);
});

test('definir98 atualiza a var de acento e persiste', () => {
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  // pele padrão é 98, então --accent é aplicado
  act(() => { screen.getByText('acento98').click(); });
  expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#b0228c');
  expect(JSON.parse(localStorage.getItem(CHAVE_TEMA)!).n98.accent).toBe('#b0228c');
});

test('restaura o estado persistido ao montar', () => {
  localStorage.setItem(CHAVE_TEMA, JSON.stringify({ ...TEMA_PADRAO, pele: 'aero' }));
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('aero');
});

test('cai no padrão quando o localStorage tem lixo', () => {
  localStorage.setItem(CHAVE_TEMA, '{nao-e-json');
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  expect(document.body.dataset.skin).toBe('98');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/web; bunx vitest run src/tema/ProvedorTema.test.tsx`
Expected: FAIL (`useTweaks` não existe; contexto ainda não tem `definir98`/`definirSound`).

- [ ] **Step 3: Reescrever `apps/web/src/tema/ProvedorTema.tsx`**

```tsx
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { EstadoTema, Pele, TweaksAero, Tweaks98 } from './tipos';
import { aplicarTema, lerEstadoInicial, persistirTema } from './tweaks';

export interface ContextoTemaValor {
  tema: EstadoTema;
  definirPele: (pele: Pele) => void;
  definirAero: (parcial: Partial<TweaksAero>) => void;
  definir98: (parcial: Partial<Tweaks98>) => void;
  definirMotion: (valor: boolean) => void;
  definirSound: (valor: boolean) => void;
}

export const ContextoTema = createContext<ContextoTemaValor | null>(null);

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<EstadoTema>(lerEstadoInicial);

  // Aplica + persiste a cada mudança.
  useEffect(() => {
    aplicarTema(tema);
    persistirTema(tema);
  }, [tema]);

  // Re-aplica quando prefers-reduced-motion muda (sem perder o estado atual).
  const temaRef = useRef(tema);
  temaRef.current = tema;
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aoMudar = () => aplicarTema(temaRef.current);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  const definirPele = useCallback((pele: Pele) => setTema((t) => ({ ...t, pele })), []);
  const definirAero = useCallback(
    (p: Partial<TweaksAero>) => setTema((t) => ({ ...t, aero: { ...t.aero, ...p } })),
    [],
  );
  const definir98 = useCallback(
    (p: Partial<Tweaks98>) => setTema((t) => ({ ...t, n98: { ...t.n98, ...p } })),
    [],
  );
  const definirMotion = useCallback((valor: boolean) => setTema((t) => ({ ...t, motion: valor })), []);
  const definirSound = useCallback((valor: boolean) => setTema((t) => ({ ...t, sound: valor })), []);

  const valor = useMemo<ContextoTemaValor>(
    () => ({ tema, definirPele, definirAero, definir98, definirMotion, definirSound }),
    [tema, definirPele, definirAero, definir98, definirMotion, definirSound],
  );

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}
```

- [ ] **Step 4: Atualizar `apps/web/src/tema/ganchos.ts`**

```ts
import { useContext } from 'react';
import { ContextoTema, type ContextoTemaValor } from './ProvedorTema';
import type { Pele } from './tipos';

// Compat: retorna só a pele e seu setter (usado por componentes que só trocam pele).
export function useTema(): { pele: Pele; definirPele: (p: Pele) => void } {
  const ctx = useContext(ContextoTema);
  if (!ctx) throw new Error('useTema deve ser usado dentro de <ProvedorTema>.');
  return { pele: ctx.tema.pele, definirPele: ctx.definirPele };
}

// Acesso completo aos tweaks (usado pelo PainelTweaks).
export function useTweaks(): ContextoTemaValor {
  const ctx = useContext(ContextoTema);
  if (!ctx) throw new Error('useTweaks deve ser usado dentro de <ProvedorTema>.');
  return ctx;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd apps/web; bunx vitest run src/tema/ProvedorTema.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 6: `tsc` + Commit**

Run: `cd apps/web; bunx tsc --noEmit`
Expected: limpo.

```bash
git add apps/web/src/tema/ProvedorTema.tsx apps/web/src/tema/ganchos.ts apps/web/src/tema/ProvedorTema.test.tsx
git commit -m "feat(tema): ProvedorTema detém o estado de tweaks; useTweaks"
```

---

### Task 4: Controles tipados (TDD)

**Files:**
- Create: `apps/web/src/tema/controles.tsx`
- Test: `apps/web/src/tema/controles.test.tsx`

- [ ] **Step 1: Escrever o teste `apps/web/src/tema/controles.test.tsx`**

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Alternador, RadioSegmentado, Deslizador, ChipsCor } from './controles';

test('Alternador chama aoMudar com o valor invertido', () => {
  const aoMudar = vi.fn();
  render(<Alternador rotulo="Som" valor={true} aoMudar={aoMudar} />);
  fireEvent.click(screen.getByRole('switch'));
  expect(aoMudar).toHaveBeenCalledWith(false);
});

test('RadioSegmentado marca o valor ativo e troca ao clicar', () => {
  const aoMudar = vi.fn();
  render(
    <RadioSegmentado
      rotulo="Densidade"
      valor="normal"
      opcoes={[
        { valor: 'compacto', rotulo: 'Compacto' },
        { valor: 'normal', rotulo: 'Normal' },
      ]}
      aoMudar={aoMudar}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Compacto' }));
  expect(aoMudar).toHaveBeenCalledWith('compacto');
});

test('Deslizador emite número ao mover', () => {
  const aoMudar = vi.fn();
  render(<Deslizador rotulo="Matiz" valor={200} min={150} max={320} passo={2} aoMudar={aoMudar} />);
  fireEvent.change(screen.getByRole('slider'), { target: { value: '260' } });
  expect(aoMudar).toHaveBeenCalledWith(260);
});

test('ChipsCor seleciona a cor clicada', () => {
  const aoMudar = vi.fn();
  render(<ChipsCor rotulo="Acento" valor="#1084d0" opcoes={['#1084d0', '#b0228c']} aoMudar={aoMudar} />);
  fireEvent.click(screen.getByRole('button', { name: '#b0228c' }));
  expect(aoMudar).toHaveBeenCalledWith('#b0228c');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/web; bunx vitest run src/tema/controles.test.tsx`
Expected: FAIL ("Failed to resolve import './controles'").

- [ ] **Step 3: Criar `apps/web/src/tema/controles.tsx`**

```tsx
import type { ReactNode } from 'react';

export function SecaoTweaks({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="tw-secao">
      <div className="tw-secao-rotulo">{rotulo}</div>
      {children}
    </div>
  );
}

export function LinhaTweak({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="tw-linha">
      <span className="tw-linha-rotulo">{rotulo}</span>
      <span className="tw-linha-ctl">{children}</span>
    </label>
  );
}

export function Alternador({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: boolean;
  aoMudar: (v: boolean) => void;
}) {
  return (
    <LinhaTweak rotulo={rotulo}>
      <button
        type="button"
        role="switch"
        aria-checked={valor}
        className={`tw-toggle ${valor ? 'on' : ''}`}
        onClick={() => aoMudar(!valor)}
      >
        <span className="tw-toggle-bolinha" />
      </button>
    </LinhaTweak>
  );
}

export function Deslizador({
  rotulo,
  valor,
  min,
  max,
  passo = 1,
  unidade = '',
  aoMudar,
}: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  passo?: number;
  unidade?: string;
  aoMudar: (v: number) => void;
}) {
  return (
    <LinhaTweak rotulo={`${rotulo} (${valor}${unidade})`}>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
      />
    </LinhaTweak>
  );
}

export function RadioSegmentado<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: T;
  opcoes: ReadonlyArray<{ valor: T; rotulo: string }>;
  aoMudar: (v: T) => void;
}) {
  return (
    <LinhaTweak rotulo={rotulo}>
      <span className="tw-seg" role="group">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            className={`tw-seg-btn ${valor === o.valor ? 'ativo' : ''}`}
            aria-pressed={valor === o.valor}
            onClick={() => aoMudar(o.valor)}
          >
            {o.rotulo}
          </button>
        ))}
      </span>
    </LinhaTweak>
  );
}

export function Selecao<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: T;
  opcoes: ReadonlyArray<{ valor: T; rotulo: string }>;
  aoMudar: (v: T) => void;
}) {
  return (
    <LinhaTweak rotulo={rotulo}>
      <select value={valor} onChange={(e) => aoMudar(e.target.value as T)}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </LinhaTweak>
  );
}

export function ChipsCor({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: readonly string[];
  aoMudar: (v: string) => void;
}) {
  return (
    <LinhaTweak rotulo={rotulo}>
      <span className="tw-chips" role="group">
        {opcoes.map((cor) => (
          <button
            key={cor}
            type="button"
            className={`tw-chip ${valor === cor ? 'ativo' : ''}`}
            aria-label={cor}
            aria-pressed={valor === cor}
            style={{ background: cor }}
            onClick={() => aoMudar(cor)}
          />
        ))}
      </span>
    </LinhaTweak>
  );
}

export function Botao({
  rotulo,
  aoClicar,
  secundario = false,
}: {
  rotulo: string;
  aoClicar: () => void;
  secundario?: boolean;
}) {
  return (
    <button type="button" className={`tw-botao ${secundario ? 'sec' : ''}`} onClick={aoClicar}>
      {rotulo}
    </button>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/web; bunx vitest run src/tema/controles.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: `tsc` + Commit**

Run: `cd apps/web; bunx tsc --noEmit`
Expected: limpo.

```bash
git add apps/web/src/tema/controles.tsx apps/web/src/tema/controles.test.tsx
git commit -m "feat(tema): controles tipados do painel (toggle, slider, segmentado, chips)"
```

---

### Task 5: Loja de boot + loja do painel + `PainelTweaks` (TDD)

**Files:**
- Create: `apps/web/src/boot.ts`, `apps/web/src/tema/painel.ts`
- Create: `apps/web/src/tema/PainelTweaks.tsx`, `apps/web/src/tema/PainelTweaks.css`
- Modify: `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx`
- Test: `apps/web/src/tema/PainelTweaks.test.tsx`

- [ ] **Step 1: Criar `apps/web/src/boot.ts`**

```ts
import { create } from 'zustand';

interface LojaBoot {
  concluido: boolean;
  concluir: () => void;
  reiniciar: () => void;
}

// Controla a exibição da TelaBoot. "Reiniciar sessão" só reexecuta o boot;
// não invalida a sessão SQL (react-query) nem a loja de janelas.
export const useBoot = create<LojaBoot>((set) => ({
  concluido: false,
  concluir: () => set({ concluido: true }),
  reiniciar: () => set({ concluido: false }),
}));
```

- [ ] **Step 2: Criar `apps/web/src/tema/painel.ts`**

```ts
import { create } from 'zustand';

interface LojaPainel {
  aberto: boolean;
  abrir: () => void;
  fechar: () => void;
  alternar: () => void;
}

export const usePainelTweaks = create<LojaPainel>((set) => ({
  aberto: false,
  abrir: () => set({ aberto: true }),
  fechar: () => set({ aberto: false }),
  alternar: () => set((s) => ({ aberto: !s.aberto })),
}));
```

- [ ] **Step 3: Atualizar `apps/web/src/App.tsx` para usar `useBoot`**

```tsx
import { useSessao } from './autenticacao/ganchos';
import { useBoot } from './boot';
import { TelaBoot } from './TelaBoot';
import { TelaLogin } from './autenticacao/TelaLogin';
import { AreaTrabalho } from './areaTrabalho/AreaTrabalho';

// boot (recarregável via "Reiniciar sessão") → login → desktop.
export function App() {
  const bootConcluido = useBoot((s) => s.concluido);
  const concluirBoot = useBoot((s) => s.concluir);
  const sessao = useSessao();

  if (!bootConcluido) return <TelaBoot onConcluir={concluirBoot} />;

  if (sessao.isLoading) {
    return (
      <div className="window" style={{ width: 320, margin: '15vh auto' }}>
        <div className="title-bar">
          <div className="title-bar-text">DBOS</div>
        </div>
        <div className="window-body">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return sessao.data ? <AreaTrabalho usuario={sessao.data} /> : <TelaLogin />;
}
```

- [ ] **Step 4: Atualizar `apps/web/src/App.test.tsx`** — resetar a loja de boot entre testes

Localizar `beforeEach(() => useLoja.setState(estadoInicial()));` e trocar por:

```tsx
import { useBoot } from './boot';
// ...
beforeEach(() => {
  useLoja.setState(estadoInicial());
  useBoot.setState({ concluido: false });
});
```

(O mock de `TelaBoot` já chama `onConcluir` no mount, então o boot conclui na hora.)

- [ ] **Step 5: Escrever o teste `apps/web/src/tema/PainelTweaks.test.tsx`**

```tsx
import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProvedorTema } from './ProvedorTema';
import { PainelTweaks } from './PainelTweaks';
import { usePainelTweaks } from './painel';
import { useBoot } from '../boot';

beforeEach(() => {
  localStorage.clear();
  delete document.body.dataset.skin;
  document.documentElement.removeAttribute('style');
  usePainelTweaks.setState({ aberto: true });
  useBoot.setState({ concluido: true });
});

function montar() {
  return render(
    <ProvedorTema>
      <PainelTweaks />
    </ProvedorTema>,
  );
}

test('não renderiza quando fechado', () => {
  usePainelTweaks.setState({ aberto: false });
  const { container } = montar();
  expect(container.querySelector('.painel-tweaks')).toBeNull();
});

test('na pele 98 mostra controles de 98 (densidade, CRT) e não os de Aero', () => {
  montar(); // pele padrão = 98
  expect(screen.getByText('Densidade')).toBeInTheDocument();
  expect(screen.getByText(/Monitor CRT/)).toBeInTheDocument();
  expect(screen.queryByText(/Vidro/)).toBeNull();
});

test('trocar a pele para Aero revela os controles de Aero', () => {
  montar();
  // segmentado de Pele: clicar em "Aero"
  fireEvent.click(screen.getByRole('button', { name: 'Aero' }));
  expect(document.body.dataset.skin).toBe('aero');
  expect(screen.getByText(/Vidro/)).toBeInTheDocument();
  expect(screen.getByText(/Wallpaper/)).toBeInTheDocument();
});

test('ligar/desligar Animações escreve --motion', () => {
  montar();
  const alt = screen.getByRole('switch', { name: /Animações/ });
  fireEvent.click(alt);
  expect(document.documentElement.style.getPropertyValue('--motion')).toBe('0.001');
});

test('"Reiniciar sessão" reexecuta o boot e fecha o painel', () => {
  montar();
  fireEvent.click(screen.getByRole('button', { name: /Reiniciar sessão/ }));
  expect(useBoot.getState().concluido).toBe(false);
  expect(usePainelTweaks.getState().aberto).toBe(false);
});
```

> Nota de acessibilidade: o `<Alternador>` precisa de um nome acessível para `getByRole('switch', { name: /Animações/ })`. Garanta isso no `PainelTweaks` passando `rotulo="Animações"` e que o `<button role="switch">` tenha esse rótulo associado (via `aria-label={rotulo}` no Alternador — ver Step 6).

- [ ] **Step 6: Ajustar `Alternador` para ter nome acessível**

Em `apps/web/src/tema/controles.tsx`, no `<button role="switch">`, adicionar `aria-label={rotulo}`:

```tsx
<button
  type="button"
  role="switch"
  aria-label={rotulo}
  aria-checked={valor}
  className={`tw-toggle ${valor ? 'on' : ''}`}
  onClick={() => aoMudar(!valor)}
>
```

(Os testes da Task 4 seguem válidos — `getByRole('switch')` sem nome ainda casa.)

- [ ] **Step 7: Criar `apps/web/src/tema/PainelTweaks.tsx`**

```tsx
import { useRef, useState } from 'react';
import { useTweaks } from './ganchos';
import { usePainelTweaks } from './painel';
import { useBoot } from '../boot';
import { WALLPAPERS, PADROES, ACENTOS_98 } from './tipos';
import {
  SecaoTweaks,
  Alternador,
  RadioSegmentado,
  Selecao,
  Deslizador,
  ChipsCor,
  Botao,
} from './controles';
import './PainelTweaks.css';

export function PainelTweaks() {
  const { tema, definirPele, definirAero, definir98, definirMotion, definirSound } = useTweaks();
  const aberto = usePainelTweaks((s) => s.aberto);
  const fechar = usePainelTweaks((s) => s.fechar);
  const reiniciarBoot = useBoot((s) => s.reiniciar);

  // arrasto simples pelo cabeçalho
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const arrasto = useRef<{ dx: number; dy: number } | null>(null);

  if (!aberto) return null;

  function aoPressionarCabecalho(e: React.PointerEvent) {
    const alvo = e.currentTarget as HTMLElement;
    const cx = pos?.x ?? alvo.parentElement!.getBoundingClientRect().left;
    const cy = pos?.y ?? alvo.parentElement!.getBoundingClientRect().top;
    arrasto.current = { dx: e.clientX - cx, dy: e.clientY - cy };
    alvo.setPointerCapture(e.pointerId);
  }
  function aoMover(e: React.PointerEvent) {
    if (!arrasto.current) return;
    setPos({ x: e.clientX - arrasto.current.dx, y: e.clientY - arrasto.current.dy });
  }
  function aoSoltar(e: React.PointerEvent) {
    arrasto.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  const estilo = pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined;

  return (
    <div className="painel-tweaks" style={estilo} role="dialog" aria-label="Tweaks">
      <div
        className="painel-tweaks-cabecalho"
        onPointerDown={aoPressionarCabecalho}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
      >
        <span>Tweaks</span>
        <button type="button" className="painel-tweaks-fechar" aria-label="Fechar" onClick={fechar}>
          ×
        </button>
      </div>

      <div className="painel-tweaks-corpo">
        <SecaoTweaks rotulo="Aparência">
          <RadioSegmentado
            rotulo="Pele"
            valor={tema.pele}
            opcoes={[
              { valor: 'aero', rotulo: 'Aero' },
              { valor: '98', rotulo: '98' },
            ]}
            aoMudar={definirPele}
          />
          <Alternador rotulo="Animações" valor={tema.motion} aoMudar={definirMotion} />
          <Alternador rotulo="Som" valor={tema.sound} aoMudar={definirSound} />
        </SecaoTweaks>

        {tema.pele === 'aero' ? (
          <SecaoTweaks rotulo="Aero">
            <Deslizador
              rotulo="Matiz do acento"
              valor={tema.aero.accentHue}
              min={150}
              max={320}
              passo={2}
              unidade="°"
              aoMudar={(v) => definirAero({ accentHue: v })}
            />
            <Alternador
              rotulo="Vidro fosco"
              valor={tema.aero.glass}
              aoMudar={(v) => definirAero({ glass: v })}
            />
            <RadioSegmentado
              rotulo="Cantos"
              valor={tema.aero.corners}
              opcoes={[
                { valor: 'aero', rotulo: 'Aero' },
                { valor: 'reto', rotulo: 'Reto (98)' },
              ]}
              aoMudar={(v) => definirAero({ corners: v })}
            />
            <Selecao
              rotulo="Wallpaper"
              valor={tema.aero.wallpaper}
              opcoes={WALLPAPERS}
              aoMudar={(v) => definirAero({ wallpaper: v })}
            />
          </SecaoTweaks>
        ) : (
          <SecaoTweaks rotulo="98">
            <ChipsCor
              rotulo="Acento"
              valor={tema.n98.accent}
              opcoes={ACENTOS_98}
              aoMudar={(v) => definir98({ accent: v })}
            />
            <Selecao
              rotulo="Padrão da área"
              valor={tema.n98.pattern}
              opcoes={PADROES}
              aoMudar={(v) => definir98({ pattern: v })}
            />
            <RadioSegmentado
              rotulo="Densidade"
              valor={tema.n98.density}
              opcoes={[
                { valor: 'compacto', rotulo: 'Compacto' },
                { valor: 'normal', rotulo: 'Normal' },
              ]}
              aoMudar={(v) => definir98({ density: v })}
            />
            <Alternador
              rotulo="Monitor CRT (scanlines)"
              valor={tema.n98.crt}
              aoMudar={(v) => definir98({ crt: v })}
            />
          </SecaoTweaks>
        )}

        <SecaoTweaks rotulo="Sessão">
          <Botao
            rotulo="Reiniciar sessão"
            secundario
            aoClicar={() => {
              reiniciarBoot();
              fechar();
            }}
          />
        </SecaoTweaks>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Criar `apps/web/src/tema/PainelTweaks.css`**

```css
.painel-tweaks {
  position: fixed;
  right: 16px;
  bottom: 56px; /* acima da barra de tarefas */
  z-index: 9000; /* acima das janelas, abaixo dos diálogos modais */
  width: 280px;
  max-height: 70vh;
  overflow: auto;
  background: var(--face);
  color: var(--ink);
  box-shadow: var(--relevo-out);
  border-radius: var(--round);
  font-family: var(--ui);
  font-size: 12px;
}
.painel-tweaks-cabecalho {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  cursor: move;
  color: var(--titulo-ink);
  background: linear-gradient(90deg, var(--titulo-1), var(--titulo-2));
  user-select: none;
}
.painel-tweaks-fechar {
  min-width: 18px;
  height: 18px;
  line-height: 1;
  padding: 0;
}
.painel-tweaks-corpo {
  padding: 8px;
}
.tw-secao {
  margin-bottom: 10px;
}
.tw-secao-rotulo {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.04em;
  opacity: 0.7;
  margin-bottom: 4px;
}
.tw-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 4px 0;
}
.tw-linha-rotulo {
  flex: 1;
}
.tw-seg,
.tw-chips {
  display: inline-flex;
  gap: 2px;
}
.tw-seg-btn.ativo {
  box-shadow: var(--relevo-in-fino);
}
.tw-toggle {
  width: 34px;
  height: 16px;
  border-radius: 8px;
  position: relative;
  background: var(--face-baixa);
}
.tw-toggle.on {
  background: var(--accent, #2bc28d);
}
.tw-toggle-bolinha {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: left calc(120ms * var(--motion, 1));
}
.tw-toggle.on .tw-toggle-bolinha {
  left: 19px;
}
.tw-chip {
  width: 18px;
  height: 18px;
  border-radius: var(--round-sm);
}
.tw-chip.ativo {
  outline: 2px solid var(--ink);
  outline-offset: 1px;
}
```

- [ ] **Step 9: Rodar e ver passar**

Run: `cd apps/web; bunx vitest run src/tema/PainelTweaks.test.tsx src/App.test.tsx src/tema/controles.test.tsx`
Expected: PASS (PainelTweaks: 5; App: 2; controles: 4).

- [ ] **Step 10: `tsc` + Commit**

Run: `cd apps/web; bunx tsc --noEmit`
Expected: limpo.

```bash
git add apps/web/src/boot.ts apps/web/src/tema/painel.ts apps/web/src/tema/PainelTweaks.tsx apps/web/src/tema/PainelTweaks.css apps/web/src/tema/PainelTweaks.test.tsx apps/web/src/tema/controles.tsx apps/web/src/App.tsx apps/web/src/App.test.tsx
git commit -m "feat(tema): PainelTweaks flutuante, loja de abertura e reinício de boot"
```

---

### Task 6: Afordâncias de abertura + montar o painel

**Files:**
- Modify: `apps/web/src/areaTrabalho/AreaTrabalho.tsx`, `apps/web/src/areaTrabalho/BarraTarefas.tsx`, `apps/web/src/areaTrabalho/MenuIniciar.tsx`

- [ ] **Step 1: Montar `<PainelTweaks/>` e "Propriedades" no contexto — `AreaTrabalho.tsx`**

Adicionar os imports:

```tsx
import { PainelTweaks } from '../tema/PainelTweaks';
import { usePainelTweaks } from '../tema/painel';
```

Dentro do componente, obter o setter:

```tsx
const abrirPainel = usePainelTweaks((s) => s.abrir);
```

No `onContextMenu` da área de trabalho (o que monta `itens` a partir de `ORDEM_APPS`), acrescentar uma entrada "Propriedades" ao final da lista, antes de `abrirMenu`:

```tsx
const itens: ItemMenu[] = ORDEM_APPS.map((tipo) => ({
  rotulo: `Abrir ${registroApps[tipo].titulo}`,
  aoClicar: () => abrirJanela(tipo),
}));
itens.push({ rotulo: 'Propriedades', aoClicar: () => abrirPainel() });
abrirMenu(e.clientX, e.clientY, itens);
```

E montar o painel ao lado de `<MenuContexto />` (final do JSX):

```tsx
<MenuContexto />
<PainelTweaks />
```

- [ ] **Step 2: Engrenagem na bandeja — `BarraTarefas.tsx`**

Importar a loja do painel:

```tsx
import { usePainelTweaks } from '../tema/painel';
```

No componente:

```tsx
const alternarPainel = usePainelTweaks((s) => s.alternar);
```

Na `<span className="bandeja-icones">`, transformar a engrenagem num botão clicável antes dos demais ícones (mantendo os ícones `database`/`wifi`/`speaker`). Trocar o `<span ...>` atual por:

```tsx
<span className="bandeja-icones">
  <button
    type="button"
    className="bandeja-engrenagem"
    aria-label="Configurações"
    onClick={alternarPainel}
  >
    <Icone nome="props" tamanho={16} alt="" />
  </button>
  <Icone nome="database" tamanho={16} alt="" />
  <Icone nome="wifi" tamanho={16} alt="" />
  <Icone nome="speaker" tamanho={16} alt="" />
</span>
```

(Remover o `aria-hidden="true"` do span, já que agora há um controle interativo.)

- [ ] **Step 3: "Configurações" no Iniciar — `MenuIniciar.tsx`**

Importar a loja:

```tsx
import { usePainelTweaks } from '../tema/painel';
```

No componente:

```tsx
const abrirPainel = usePainelTweaks((s) => s.abrir);
```

Adicionar um item antes do separador/"Encerrar sessão" (após o `.map` de `ORDEM_APPS`):

```tsx
<li className="menu-iniciar-separador" aria-hidden="true" />
<li>
  <button
    role="menuitem"
    onClick={() => {
      abrirPainel();
      aoFechar();
    }}
  >
    <Icone nome="props" tamanho={16} alt="" style={{ marginRight: 6 }} /> Configurações
  </button>
</li>
```

(Manter o separador + "Encerrar sessão" existentes logo abaixo; pode haver dois separadores — tudo bem, ou reutilize um único.)

- [ ] **Step 4: Suíte do shell + tsc**

Run: `cd apps/web; bunx vitest run src/areaTrabalho src/tema; bunx tsc --noEmit`
Expected: PASS + limpo. Se algum teste de `areaTrabalho` casar texto de menu por contagem/índice e quebrar com o novo item, ajuste a asserção para buscar pelo rótulo específico.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/AreaTrabalho.tsx apps/web/src/areaTrabalho/BarraTarefas.tsx apps/web/src/areaTrabalho/MenuIniciar.tsx
git commit -m "feat(tema): afordâncias do painel (bandeja, Iniciar, contexto) e montagem"
```

---

### Task 7: Verificação final da fase

- [ ] **Step 1: Suíte inteira verde**

Run: `cd apps/web; bunx vitest run`
Expected: todos os arquivos de teste passam (inclui os novos de `tema`: `tweaks`, `controles`, `PainelTweaks`, e o `ProvedorTema` atualizado).

- [ ] **Step 2: `tsc` + build**

Run: `cd apps/web; bunx tsc --noEmit; bunx vite build`
Expected: tsc limpo; build conclui sem erro.

- [ ] **Step 3: Conferência visual (manual, pós-execução)**

`bun run dev:web` → abrir o painel pela engrenagem da bandeja, por "Configurações" no Iniciar e por "Propriedades" no menu de contexto da área de trabalho. Confirmar: trocar a Pele troca `body[data-skin]` e os controles relevantes; Animações/Som ligam/desligam; densidade muda o `font-size`; acento 98 muda `--accent`; "Reiniciar sessão" reexecuta a TelaBoot e volta ao desktop sem novo login. (Wallpaper/glass/CRT podem não ter efeito visual até a Fase 3 — apenas escrevem os atributos.) Registrar pendência humana.

---

### Self-review (preenchido)

**1. Cobertura do spec (Fase 2 = Tweaks):** painel + persistência (Tasks 1,3,5) ✓; afordâncias de abertura — engrenagem/Configurações/Propriedades (Task 6) ✓; liga Som ao `sons.ts` existente (Task 2) ✓; Animações + `prefers-reduced-motion` (Tasks 1,3) ✓; acento/wallpaper/padrão/densidade/cantos/vidro/CRT escritos por `aplicarTema` (Task 1) ✓; "Reiniciar sessão" reexecuta boot sem derrubar SQL (Task 5) ✓; `postMessage`/edit-mode descartado e `DBOS_sfx` não portado (decisões) ✓. Visual pleno de wallpaper/glass/CRT é Fase 3 (registrado).

**2. Sem placeholders:** todo passo tem código concreto; nada de "TBD"/"adicionar tratamento".

**3. Consistência de tipos/nomes:** `EstadoTema`/`TweaksAero`/`Tweaks98`/`Pele`/`Cantos`/`Wallpaper`/`Padrao98`/`Densidade`; `aplicarTema`/`lerEstadoInicial`/`persistirTema`; `definirSomHabilitado`/`somHabilitado`; `useTema`/`useTweaks`; setters `definirPele`/`definirAero`/`definir98`/`definirMotion`/`definirSound`; lojas `useBoot`/`usePainelTweaks`; controles `Alternador`/`Deslizador`/`RadioSegmentado`/`Selecao`/`ChipsCor`/`Botao`/`SecaoTweaks`/`LinhaTweak`; listas `WALLPAPERS`/`PADROES`/`ACENTOS_98`. Usados de forma idêntica entre `tipos.ts`, `tweaks.ts`, `ProvedorTema.tsx`, `ganchos.ts`, `controles.tsx`, `PainelTweaks.tsx` e os componentes do shell. ✓
</content>
</invoke>
