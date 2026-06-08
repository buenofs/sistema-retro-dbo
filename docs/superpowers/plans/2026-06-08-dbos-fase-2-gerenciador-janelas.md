# DBOS — Fase 2: Gerenciador de Janelas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a sensação de "sistema operacional" — uma área de trabalho Win98 com janelas arrastáveis/redimensionáveis, ordem de empilhamento (z-order), barra de tarefas, menu Iniciar e atalhos no desktop, dirigidos por uma única fonte de verdade em Zustand e um registro genérico de aplicativos (com apps placeholder).

**Architecture:** Estado 100% no frontend; o servidor não sabe nada de janelas (spec §4). Uma loja Zustand (`useLoja`) guarda o array de `EstadoJanela`, o id focado e os contadores de z-index/id. O `<Janela>` é o "chrome" 98.css (barra de título, min/max/fechar, borda 3D) que renderiza o componente do app via um **registro** (`registroApps`) — a fronteira WM↔app é só `dados` + ações da loja (spec §4.2). Arrastar e redimensionar são feitos à mão com pointer events em um hook (`usarArrasto`), com batelada por `requestAnimationFrame` (spec §2.3, §4.5). Performance: `React.memo` no `<Janela>` + seletores Zustand por janela, de modo que mover uma janela não re-renderiza as outras (spec §2.3).

**Tech Stack:** React 18, TypeScript, **Zustand 5** (`zustand` + `zustand/react/shallow`), 98.css, Vite, Vitest + React Testing Library. Sem novas dependências de servidor — esta fase é só `apps/web`.

**Naming convention:** Todos os identificadores que nós autoramos são pt-BR; a superfície de bibliotecas/protocolos fica em inglês. **Exceção deliberada:** os botões de controle da janela usam `aria-label="Minimize" | "Maximize" | "Restore" | "Close"` — o 98.css desenha os glifos retrô via seletores de atributo nesses valores em inglês; trocá-los por pt-BR apagaria os ícones. Isso conta como "API de terceiros" pela regra da spec §2.1.

**Builds on Phase 1:** `apps/web` já tem `App.tsx` (decide login vs. desktop via `useSessao`), `autenticacao/ganchos.ts` (`useLogin`/`useLogout`/`useSessao`), `api/cliente.ts`, e um **placeholder** `AreaTrabalho.tsx` na raiz de `src/` que esta fase **substitui** pelo desktop real. `@dbos/shared` exporta `UsuarioSessao`.

---

### File structure for this phase

Todo o novo código vive numa pasta nova `apps/web/src/areaTrabalho/` (arquivos que mudam juntos ficam juntos — spec/skill). Tipos puros isolados em `tipos.ts` para evitar ciclo de import entre a loja e o registro.

**`apps/web/src/areaTrabalho/`**
- Create `tipos.ts` — tipos do WM (`EstadoJanela`, `LojaAreaTrabalho`, `DefinicaoApp`, etc.). Sem imports de runtime → quebra ciclos.
- Create `AppPlaceholder.tsx` — componente placeholder usado por todos os 4 apps nesta fase.
- Create `registroApps.tsx` — `registroApps` (metadados + componente por `tipoApp`) e `ORDEM_APPS`.
- Create `loja.ts` — a loja Zustand `useLoja` + `estadoInicial`.
- Create `limites.ts` — `limitarRetangulo` (clamp no viewport) + `ALTURA_BARRA`.
- Create `usarArrasto.ts` — hook de arrasto por pointer events, batido por rAF.
- Create `Janela.tsx` — chrome 98.css, memoizado, com mover/redimensionar/min/max/fechar.
- Create `CamadaJanelas.tsx` — renderiza uma `<Janela>` por id aberto.
- Create `Relogio.tsx` — relógio HH:MM da barra de tarefas.
- Create `MenuIniciar.tsx` — menu Iniciar (abrir apps + encerrar sessão).
- Create `BarraTarefas.tsx` — botão Iniciar, um botão por janela, relógio.
- Create `AreaTrabalho.tsx` — o desktop (wallpaper + atalhos + camada de janelas + barra). **Substitui** o placeholder da raiz.
- Create `areaTrabalho.css` — estilos de desktop/barra/menu/atalhos que o 98.css não cobre.

**`apps/web/src/`**
- Modify `App.tsx` — trocar o import de `./AreaTrabalho` por `./areaTrabalho/AreaTrabalho`.
- Modify `App.test.tsx` — a tela logada agora é o desktop (asserta o botão "Iniciar"), com reset da loja entre testes.
- Delete `AreaTrabalho.tsx` (o placeholder da Fase 1).

**`apps/web/`**
- Modify `package.json` — adicionar `zustand`.

---

### Task 0: Adicionar o Zustand

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Adicionar `zustand` ao bloco `dependencies` de `apps/web/package.json`**

```json
  "dependencies": {
    "@dbos/shared": "workspace:*",
    "@tanstack/react-query": "^5.51.0",
    "98.css": "^0.1.20",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.2"
  }
```

- [ ] **Step 2: Instalar**

Run: `bun install`
Expected: `zustand` resolve; `bun.lock` atualiza.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json bun.lock
git commit -m "chore(web): adiciona zustand para o gerenciador de janelas"
```

---

### Task 1: Tipos do WM, app placeholder e registro de apps

Tipos puros e dados/JSX triviais — sem teste dedicado; o `tsc`/Vite via os consumidores e os testes das próximas tasks são a checagem.

**Files:**
- Create: `apps/web/src/areaTrabalho/tipos.ts`
- Create: `apps/web/src/areaTrabalho/AppPlaceholder.tsx`
- Create: `apps/web/src/areaTrabalho/registroApps.tsx`

- [ ] **Step 1: Criar `apps/web/src/areaTrabalho/tipos.ts`**

```ts
import type { ComponentType } from 'react';

export type IdJanela = string;
export type TipoApp = 'consulta' | 'explorador' | 'grade' | 'propriedades';
export type EstadoVisual = 'normal' | 'minimizada' | 'maximizada';

export interface Retangulo {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface EstadoJanela {
  id: IdJanela;
  tipoApp: TipoApp;
  titulo: string;
  icone: string;
  retangulo: Retangulo;
  zIndex: number;
  estado: EstadoVisual;
  // Para onde 'restaurar' deve voltar quando a janela está minimizada.
  anterior: 'normal' | 'maximizada';
  dados: unknown; // payload específico do app (null nos placeholders)
}

// Props que todo componente de app recebe do WM.
export interface PropsApp {
  janela: EstadoJanela;
}

// Entrada do registro: metadados + o componente React do app.
export interface DefinicaoApp {
  titulo: string;
  icone: string;
  tamanhoInicial: { largura: number; altura: number };
  componente: ComponentType<PropsApp>;
}

export interface LojaAreaTrabalho {
  janelas: EstadoJanela[];
  idFocada: IdJanela | null;
  proximoZ: number;
  proximoId: number;
  abrirJanela: (tipoApp: TipoApp, dados?: unknown) => void;
  fecharJanela: (id: IdJanela) => void;
  focar: (id: IdJanela) => void;
  mover: (id: IdJanela, x: number, y: number) => void;
  redimensionar: (id: IdJanela, largura: number, altura: number) => void;
  minimizar: (id: IdJanela) => void;
  maximizar: (id: IdJanela) => void;
  restaurar: (id: IdJanela) => void;
}
```

- [ ] **Step 2: Criar `apps/web/src/areaTrabalho/AppPlaceholder.tsx`**

```tsx
import type { PropsApp } from './tipos';

// Placeholder usado pelos 4 apps na Fase 2; os apps reais chegam nas Fases 3–6.
export function AppPlaceholder({ janela }: PropsApp) {
  return (
    <div style={{ padding: 8 }}>
      <p style={{ marginTop: 0 }}>{janela.titulo}</p>
      <p style={{ fontSize: 11, color: '#444' }}>
        Este aplicativo chega numa fase futura.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Criar `apps/web/src/areaTrabalho/registroApps.tsx`**

```tsx
import type { DefinicaoApp, TipoApp } from './tipos';
import { AppPlaceholder } from './AppPlaceholder';

// O WM é genérico: cada tipoApp mapeia para metadados + um componente.
// Adicionar um app futuro = trocar AppPlaceholder pelo componente real aqui.
export const registroApps: Record<TipoApp, DefinicaoApp> = {
  explorador: {
    titulo: 'Explorador de Objetos',
    icone: '🗂️',
    tamanhoInicial: { largura: 280, altura: 360 },
    componente: AppPlaceholder,
  },
  consulta: {
    titulo: 'Editor de Consultas',
    icone: '📝',
    tamanhoInicial: { largura: 480, altura: 320 },
    componente: AppPlaceholder,
  },
  grade: {
    titulo: 'Grade de Dados',
    icone: '▦',
    tamanhoInicial: { largura: 520, altura: 360 },
    componente: AppPlaceholder,
  },
  propriedades: {
    titulo: 'Propriedades',
    icone: 'ℹ️',
    tamanhoInicial: { largura: 320, altura: 300 },
    componente: AppPlaceholder,
  },
};

// Ordem fixa em que os apps aparecem nos atalhos e no menu Iniciar.
export const ORDEM_APPS: TipoApp[] = ['explorador', 'consulta', 'grade', 'propriedades'];
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/areaTrabalho/tipos.ts apps/web/src/areaTrabalho/AppPlaceholder.tsx apps/web/src/areaTrabalho/registroApps.tsx
git commit -m "feat(web): tipos do WM, app placeholder e registro de apps"
```

---

### Task 2: A loja Zustand (`useLoja`) — fonte única de verdade (TDD)

A loja é lógica pura (sem DOM) — totalmente testável chamando ações via `useLoja.getState()`.

**Files:**
- Create: `apps/web/src/areaTrabalho/loja.ts`
- Test: `apps/web/src/areaTrabalho/loja.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/areaTrabalho/loja.test.ts`**

```ts
import { test, expect, beforeEach } from 'vitest';
import { useLoja, estadoInicial } from './loja';

// A loja é um singleton de módulo; zera antes de cada teste.
beforeEach(() => {
  useLoja.setState(estadoInicial());
});

test('abrirJanela adiciona, foca e usa metadados do registro', () => {
  useLoja.getState().abrirJanela('consulta');
  const { janelas, idFocada } = useLoja.getState();
  expect(janelas).toHaveLength(1);
  expect(janelas[0].tipoApp).toBe('consulta');
  expect(janelas[0].titulo).toBe('Editor de Consultas');
  expect(janelas[0].retangulo.largura).toBe(480);
  expect(janelas[0].estado).toBe('normal');
  expect(idFocada).toBe(janelas[0].id);
});

test('cada janela recebe um id único', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta');
  loja.abrirJanela('grade');
  const ids = useLoja.getState().janelas.map((j) => j.id);
  expect(new Set(ids).size).toBe(2);
});

test('focar traz a janela para a frente e atualiza idFocada', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta'); // zIndex 1
  loja.abrirJanela('grade'); // zIndex 2 (focada)
  const [primeira, segunda] = useLoja.getState().janelas;
  expect(segunda.zIndex).toBeGreaterThan(primeira.zIndex);

  loja.focar(primeira.id);
  const depois = useLoja.getState();
  const p = depois.janelas.find((j) => j.id === primeira.id)!;
  const s = depois.janelas.find((j) => j.id === segunda.id)!;
  expect(p.zIndex).toBeGreaterThan(s.zIndex);
  expect(depois.idFocada).toBe(primeira.id);
});

test('fecharJanela remove e limpa o foco se era a focada', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta');
  const id = useLoja.getState().janelas[0].id;
  loja.fecharJanela(id);
  expect(useLoja.getState().janelas).toHaveLength(0);
  expect(useLoja.getState().idFocada).toBeNull();
});

test('mover e redimensionar atualizam só a janela alvo', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta');
  loja.abrirJanela('grade');
  const [a, b] = useLoja.getState().janelas;

  loja.mover(a.id, 120, 80);
  loja.redimensionar(a.id, 300, 200);

  const depois = useLoja.getState();
  const da = depois.janelas.find((j) => j.id === a.id)!;
  const db = depois.janelas.find((j) => j.id === b.id)!;
  expect(da.retangulo).toEqual({ x: 120, y: 80, largura: 300, altura: 200 });
  // a janela B mantém a MESMA referência (re-render isolado, spec §2.3)
  expect(db).toBe(b);
});

test('maximizar e restaurar alternam o estado visual', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta');
  const id = useLoja.getState().janelas[0].id;

  loja.maximizar(id);
  expect(useLoja.getState().janelas[0].estado).toBe('maximizada');
  loja.restaurar(id);
  expect(useLoja.getState().janelas[0].estado).toBe('normal');
});

test('minimizar lembra o estado anterior e restaurar volta para ele', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta');
  const id = useLoja.getState().janelas[0].id;

  loja.maximizar(id);
  loja.minimizar(id);
  expect(useLoja.getState().janelas[0].estado).toBe('minimizada');
  expect(useLoja.getState().idFocada).toBeNull(); // minimizar tira o foco

  loja.restaurar(id);
  expect(useLoja.getState().janelas[0].estado).toBe('maximizada');
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/loja.test.ts`
Expected: FAIL — `Cannot find module './loja'`.

- [ ] **Step 3: Implementar `apps/web/src/areaTrabalho/loja.ts`**

```ts
import { create } from 'zustand';
import type { EstadoJanela, IdJanela, LojaAreaTrabalho, TipoApp } from './tipos';
import { registroApps } from './registroApps';

// Estado inicial isolado para reaproveitar no reset dos testes.
export function estadoInicial() {
  return {
    janelas: [] as EstadoJanela[],
    idFocada: null as IdJanela | null,
    proximoZ: 1,
    proximoId: 1,
  };
}

export const useLoja = create<LojaAreaTrabalho>((set) => ({
  ...estadoInicial(),

  abrirJanela: (tipoApp: TipoApp, dados?: unknown) =>
    set((s) => {
      const def = registroApps[tipoApp];
      const id = `j${s.proximoId}`;
      const desloc = (s.janelas.length % 6) * 28; // cascata clássica
      const janela: EstadoJanela = {
        id,
        tipoApp,
        titulo: def.titulo,
        icone: def.icone,
        retangulo: {
          x: 48 + desloc,
          y: 48 + desloc,
          largura: def.tamanhoInicial.largura,
          altura: def.tamanhoInicial.altura,
        },
        zIndex: s.proximoZ,
        estado: 'normal',
        anterior: 'normal',
        dados: dados ?? null,
      };
      return {
        janelas: [...s.janelas, janela],
        idFocada: id,
        proximoZ: s.proximoZ + 1,
        proximoId: s.proximoId + 1,
      };
    }),

  fecharJanela: (id) =>
    set((s) => ({
      janelas: s.janelas.filter((j) => j.id !== id),
      idFocada: s.idFocada === id ? null : s.idFocada,
    })),

  focar: (id) =>
    set((s) => ({
      janelas: s.janelas.map((j) =>
        j.id === id ? { ...j, zIndex: s.proximoZ } : j,
      ),
      idFocada: id,
      proximoZ: s.proximoZ + 1,
    })),

  mover: (id, x, y) =>
    set((s) => ({
      janelas: s.janelas.map((j) =>
        j.id === id ? { ...j, retangulo: { ...j.retangulo, x, y } } : j,
      ),
    })),

  redimensionar: (id, largura, altura) =>
    set((s) => ({
      janelas: s.janelas.map((j) =>
        j.id === id ? { ...j, retangulo: { ...j.retangulo, largura, altura } } : j,
      ),
    })),

  minimizar: (id) =>
    set((s) => ({
      janelas: s.janelas.map((j) =>
        j.id === id
          ? { ...j, estado: 'minimizada', anterior: j.estado === 'maximizada' ? 'maximizada' : 'normal' }
          : j,
      ),
      idFocada: s.idFocada === id ? null : s.idFocada,
    })),

  maximizar: (id) =>
    set((s) => ({
      janelas: s.janelas.map((j) => (j.id === id ? { ...j, estado: 'maximizada' } : j)),
    })),

  restaurar: (id) =>
    set((s) => ({
      janelas: s.janelas.map((j) =>
        j.id === id
          ? { ...j, estado: j.estado === 'minimizada' ? j.anterior : 'normal' }
          : j,
      ),
    })),
}));
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/loja.test.ts`
Expected: PASS — 7 testes passam.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/loja.ts apps/web/src/areaTrabalho/loja.test.ts
git commit -m "feat(web): loja Zustand do WM (abrir/focar/mover/min/max/restaurar)"
```

---

### Task 3: `limitarRetangulo` — manter a janela dentro do viewport (TDD)

Helper puro usado pelo hook de arrasto para grudar a janela dentro da tela, acima da barra de tarefas (spec §4.4 "windows clamp within the viewport").

**Files:**
- Create: `apps/web/src/areaTrabalho/limites.ts`
- Test: `apps/web/src/areaTrabalho/limites.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/areaTrabalho/limites.test.ts`**

```ts
import { test, expect } from 'vitest';
import { limitarRetangulo, ALTURA_BARRA } from './limites';

const VP = { largura: 1000, altura: 700 };

test('não mexe num retângulo que já cabe', () => {
  const r = { x: 100, y: 100, largura: 300, altura: 200 };
  expect(limitarRetangulo(r, VP)).toEqual(r);
});

test('gruda em 0 quando passa da borda superior/esquerda', () => {
  const r = limitarRetangulo({ x: -50, y: -20, largura: 300, altura: 200 }, VP);
  expect(r.x).toBe(0);
  expect(r.y).toBe(0);
});

test('gruda na borda direita/inferior considerando a barra de tarefas', () => {
  const r = limitarRetangulo({ x: 5000, y: 5000, largura: 300, altura: 200 }, VP);
  expect(r.x).toBe(VP.largura - 300); // 700
  expect(r.y).toBe(VP.altura - ALTURA_BARRA - 200); // 700 - 30 - 200 = 470
});

test('janela maior que o viewport gruda em 0 (sem coordenada negativa)', () => {
  const r = limitarRetangulo({ x: 10, y: 10, largura: 2000, altura: 2000 }, VP);
  expect(r.x).toBe(0);
  expect(r.y).toBe(0);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/limites.test.ts`
Expected: FAIL — `Cannot find module './limites'`.

- [ ] **Step 3: Implementar `apps/web/src/areaTrabalho/limites.ts`**

```ts
import type { Retangulo } from './tipos';

// Altura da barra de tarefas (px). Compartilhada entre o clamp e o CSS.
export const ALTURA_BARRA = 30;

// Mantém o retângulo dentro do viewport, deixando a barra de tarefas livre embaixo.
export function limitarRetangulo(
  r: Retangulo,
  viewport: { largura: number; altura: number },
): Retangulo {
  const maxX = Math.max(0, viewport.largura - r.largura);
  const maxY = Math.max(0, viewport.altura - ALTURA_BARRA - r.altura);
  return {
    ...r,
    x: Math.min(Math.max(0, r.x), maxX),
    y: Math.min(Math.max(0, r.y), maxY),
  };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/limites.test.ts`
Expected: PASS — 4 testes passam.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/limites.ts apps/web/src/areaTrabalho/limites.test.ts
git commit -m "feat(web): limitarRetangulo (clamp da janela no viewport)"
```

---

### Task 4: `usarArrasto` — hook de arrasto por pointer events, batido por rAF

Arrasto à mão (sem `react-rnd`), batido por `requestAnimationFrame` (spec §2.3, §4.5). É difícil de testar de forma confiável no jsdom (pointer capture + rAF), então é verificado no navegador (Task 9) e indiretamente pelos botões do `<Janela>` (Task 5). Sem teste dedicado.

**Files:**
- Create: `apps/web/src/areaTrabalho/usarArrasto.ts`

- [ ] **Step 1: Implementar `apps/web/src/areaTrabalho/usarArrasto.ts`**

```ts
import { useCallback, useRef, type PointerEvent as PointerEventReact } from 'react';

export interface DeltaArrasto {
  dx: number;
  dy: number;
}

export interface OpcoesArrasto {
  aoIniciar?: () => void;
  // dx/dy são o deslocamento TOTAL desde o pointerdown (evita acúmulo de erro).
  aoMover: (delta: DeltaArrasto) => void;
  aoFinalizar?: () => void;
}

// Devolve um handler de onPointerDown. Enquanto o ponteiro se move, chama
// aoMover no máximo uma vez por frame (rAF) com o deslocamento total.
export function usarArrasto({ aoIniciar, aoMover, aoFinalizar }: OpcoesArrasto) {
  const ref = useRef({ inicioX: 0, inicioY: 0, ultimoX: 0, ultimoY: 0, frame: 0, ativo: false });

  return useCallback(
    (evento: PointerEventReact) => {
      evento.preventDefault();
      evento.stopPropagation();
      const e = ref.current;
      e.inicioX = e.ultimoX = evento.clientX;
      e.inicioY = e.ultimoY = evento.clientY;
      e.ativo = true;
      aoIniciar?.();

      function aoMoverPonteiro(ev: PointerEvent) {
        e.ultimoX = ev.clientX;
        e.ultimoY = ev.clientY;
        if (e.frame) return; // já há um frame agendado
        e.frame = requestAnimationFrame(() => {
          e.frame = 0;
          if (!e.ativo) return;
          aoMover({ dx: e.ultimoX - e.inicioX, dy: e.ultimoY - e.inicioY });
        });
      }

      function aoSoltar() {
        e.ativo = false;
        if (e.frame) {
          cancelAnimationFrame(e.frame);
          e.frame = 0;
        }
        window.removeEventListener('pointermove', aoMoverPonteiro);
        window.removeEventListener('pointerup', aoSoltar);
        aoFinalizar?.();
      }

      window.addEventListener('pointermove', aoMoverPonteiro);
      window.addEventListener('pointerup', aoSoltar);
    },
    [aoIniciar, aoMover, aoFinalizar],
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/areaTrabalho/usarArrasto.ts
git commit -m "feat(web): hook usarArrasto (pointer events batidos por rAF)"
```

---

### Task 5: `<Janela>` — chrome 98.css memoizado (TDD)

O `<Janela>` lê só a sua própria janela via seletor (`React.memo` + seletor Zustand → re-render isolado, spec §2.3). Os botões de controle usam aria-labels em inglês para herdar os glifos do 98.css (ver nota no cabeçalho).

**Files:**
- Create: `apps/web/src/areaTrabalho/Janela.tsx`
- Test: `apps/web/src/areaTrabalho/Janela.test.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/areaTrabalho/Janela.test.tsx`**

```tsx
import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Janela } from './Janela';
import { useLoja, estadoInicial } from './loja';

beforeEach(() => useLoja.setState(estadoInicial()));

function abrirERenderizar() {
  useLoja.getState().abrirJanela('consulta');
  const id = useLoja.getState().janelas[0].id;
  render(<Janela id={id} />);
  return id;
}

test('mostra título e ícone do app', () => {
  abrirERenderizar();
  expect(screen.getByText(/Editor de Consultas/)).toBeInTheDocument();
});

test('o botão Close fecha a janela na loja', () => {
  abrirERenderizar();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(useLoja.getState().janelas).toHaveLength(0);
});

test('o botão Minimize muda o estado para minimizada', () => {
  const id = abrirERenderizar();
  fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));
  expect(useLoja.getState().janelas.find((j) => j.id === id)!.estado).toBe('minimizada');
});

test('o botão Maximize maximiza e depois vira Restore', () => {
  const id = abrirERenderizar();
  fireEvent.click(screen.getByRole('button', { name: 'Maximize' }));
  expect(useLoja.getState().janelas.find((j) => j.id === id)!.estado).toBe('maximizada');
  fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
  expect(useLoja.getState().janelas.find((j) => j.id === id)!.estado).toBe('normal');
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/Janela.test.tsx`
Expected: FAIL — `Cannot find module './Janela'`.

- [ ] **Step 3: Implementar `apps/web/src/areaTrabalho/Janela.tsx`**

```tsx
import { memo, useCallback, useRef, type CSSProperties } from 'react';
import type { IdJanela, Retangulo } from './tipos';
import { useLoja } from './loja';
import { registroApps } from './registroApps';
import { usarArrasto } from './usarArrasto';
import { ALTURA_BARRA, limitarRetangulo } from './limites';

const LARGURA_MIN = 200;
const ALTURA_MIN = 120;

function viewport() {
  return { largura: window.innerWidth, altura: window.innerHeight };
}

export const Janela = memo(function Janela({ id }: { id: IdJanela }) {
  const janela = useLoja(useCallback((s) => s.janelas.find((j) => j.id === id), [id]));
  const idFocada = useLoja((s) => s.idFocada);
  // Ações do Zustand têm referência estável entre renders.
  const focar = useLoja((s) => s.focar);
  const mover = useLoja((s) => s.mover);
  const redimensionar = useLoja((s) => s.redimensionar);
  const minimizar = useLoja((s) => s.minimizar);
  const maximizar = useLoja((s) => s.maximizar);
  const restaurar = useLoja((s) => s.restaurar);
  const fechar = useLoja((s) => s.fecharJanela);

  // Retângulo no início do arrasto (lido via getState p/ manter os callbacks estáveis).
  const inicio = useRef<Retangulo>({ x: 0, y: 0, largura: 0, altura: 0 });
  const aoIniciar = useCallback(() => {
    const atual = useLoja.getState().janelas.find((j) => j.id === id);
    if (atual) inicio.current = atual.retangulo;
    focar(id);
  }, [id, focar]);

  const aoMoverTitulo = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      const limitado = limitarRetangulo(
        { ...inicio.current, x: inicio.current.x + dx, y: inicio.current.y + dy },
        viewport(),
      );
      mover(id, limitado.x, limitado.y);
    },
    [id, mover],
  );

  const aoMoverAlca = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      redimensionar(
        id,
        Math.max(LARGURA_MIN, inicio.current.largura + dx),
        Math.max(ALTURA_MIN, inicio.current.altura + dy),
      );
    },
    [id, redimensionar],
  );

  const arrastarTitulo = usarArrasto({ aoIniciar, aoMover: aoMoverTitulo });
  const arrastarAlca = usarArrasto({ aoIniciar, aoMover: aoMoverAlca });

  if (!janela) return null;

  const maximizada = janela.estado === 'maximizada';
  const ativa = idFocada === janela.id;
  const Componente = registroApps[janela.tipoApp].componente;

  const estilo: CSSProperties = maximizada
    ? { position: 'absolute', left: 0, top: 0, right: 0, bottom: ALTURA_BARRA, zIndex: janela.zIndex }
    : {
        position: 'absolute',
        left: janela.retangulo.x,
        top: janela.retangulo.y,
        width: janela.retangulo.largura,
        height: janela.retangulo.altura,
        zIndex: janela.zIndex,
        display: janela.estado === 'minimizada' ? 'none' : undefined,
      };

  return (
    <div
      className="window"
      style={estilo}
      role="dialog"
      aria-label={janela.titulo}
      onPointerDown={() => focar(janela.id)}
    >
      <div
        className={`title-bar ${ativa ? '' : 'inactive'}`}
        onPointerDown={arrastarTitulo}
        onDoubleClick={() => (maximizada ? restaurar(janela.id) : maximizar(janela.id))}
      >
        <div className="title-bar-text">
          {janela.icone} {janela.titulo}
        </div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={() => minimizar(janela.id)} />
          <button
            aria-label={maximizada ? 'Restore' : 'Maximize'}
            onClick={() => (maximizada ? restaurar(janela.id) : maximizar(janela.id))}
          />
          <button aria-label="Close" onClick={() => fechar(janela.id)} />
        </div>
      </div>
      <div
        className="window-body"
        style={{ height: 'calc(100% - 2.2rem)', margin: 0, overflow: 'auto' }}
      >
        <Componente janela={janela} />
      </div>
      {!maximizada && (
        <div className="alca-redimensionar" aria-hidden="true" onPointerDown={arrastarAlca} />
      )}
    </div>
  );
});
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/Janela.test.tsx`
Expected: PASS — 4 testes passam.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/Janela.tsx apps/web/src/areaTrabalho/Janela.test.tsx
git commit -m "feat(web): chrome <Janela> 98.css (mover/redimensionar/min/max/fechar)"
```

---

### Task 6: `CamadaJanelas` — renderiza uma `<Janela>` por id

Componente fino: assina só o **array de ids** com `useShallow`, de modo que mover/redimensionar (que não muda a lista de ids) não re-renderiza a camada — só o `<Janela>` afetado (spec §2.3). É exercido pela verificação de desktop (Task 9); sem teste dedicado.

**Files:**
- Create: `apps/web/src/areaTrabalho/CamadaJanelas.tsx`

- [ ] **Step 1: Implementar `apps/web/src/areaTrabalho/CamadaJanelas.tsx`**

```tsx
import { useShallow } from 'zustand/react/shallow';
import { useLoja } from './loja';
import { Janela } from './Janela';

// Renderiza todas as janelas não fechadas. As minimizadas continuam montadas
// (display:none no <Janela>) para preservar o estado dos apps em fases futuras.
export function CamadaJanelas() {
  const ids = useLoja(useShallow((s) => s.janelas.map((j) => j.id)));
  return (
    <div className="camada-janelas">
      {ids.map((id) => (
        <Janela key={id} id={id} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/areaTrabalho/CamadaJanelas.tsx
git commit -m "feat(web): CamadaJanelas (uma <Janela> por id, re-render isolado)"
```

---

### Task 7: `Relogio` — relógio da barra de tarefas (TDD)

**Files:**
- Create: `apps/web/src/areaTrabalho/Relogio.tsx`
- Test: `apps/web/src/areaTrabalho/Relogio.test.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/areaTrabalho/Relogio.test.tsx`**

```tsx
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Relogio } from './Relogio';

test('mostra a hora no formato HH:MM', () => {
  render(<Relogio />);
  expect(screen.getByLabelText('Relógio').textContent).toMatch(/^\d{2}:\d{2}$/);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/Relogio.test.tsx`
Expected: FAIL — `Cannot find module './Relogio'`.

- [ ] **Step 3: Implementar `apps/web/src/areaTrabalho/Relogio.tsx`**

```tsx
import { useEffect, useState } from 'react';

function horaAtual() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function Relogio() {
  const [hora, setHora] = useState(horaAtual);
  useEffect(() => {
    const t = setInterval(() => setHora(horaAtual()), 10_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relogio" aria-label="Relógio">
      {hora}
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/Relogio.test.tsx`
Expected: PASS — 1 teste passa.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/Relogio.tsx apps/web/src/areaTrabalho/Relogio.test.tsx
git commit -m "feat(web): relógio da barra de tarefas"
```

---

### Task 8: `MenuIniciar` e `BarraTarefas` (TDD)

**Files:**
- Create: `apps/web/src/areaTrabalho/MenuIniciar.tsx`
- Create: `apps/web/src/areaTrabalho/BarraTarefas.tsx`
- Test: `apps/web/src/areaTrabalho/MenuIniciar.test.tsx`
- Test: `apps/web/src/areaTrabalho/BarraTarefas.test.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/areaTrabalho/MenuIniciar.test.tsx`**

```tsx
import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MenuIniciar } from './MenuIniciar';
import { useLoja, estadoInicial } from './loja';

beforeEach(() => useLoja.setState(estadoInicial()));

function renderizar(aoFechar = () => {}) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MenuIniciar login="sa" aoFechar={aoFechar} />
    </QueryClientProvider>,
  );
}

test('clicar num app abre a janela e fecha o menu', () => {
  let fechou = false;
  renderizar(() => {
    fechou = true;
  });
  fireEvent.click(screen.getByRole('menuitem', { name: /Editor de Consultas/ }));
  expect(useLoja.getState().janelas).toHaveLength(1);
  expect(useLoja.getState().janelas[0].tipoApp).toBe('consulta');
  expect(fechou).toBe(true);
});

test('mostra a opção de encerrar sessão com o login', () => {
  renderizar();
  expect(screen.getByRole('menuitem', { name: /Encerrar sessão \(sa\)/ })).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/MenuIniciar.test.tsx`
Expected: FAIL — `Cannot find module './MenuIniciar'`.

- [ ] **Step 3: Implementar `apps/web/src/areaTrabalho/MenuIniciar.tsx`**

```tsx
import { ORDEM_APPS, registroApps } from './registroApps';
import { useLoja } from './loja';
import { useLogout } from '../autenticacao/ganchos';

export function MenuIniciar({ login, aoFechar }: { login: string; aoFechar: () => void }) {
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const sair = useLogout();

  return (
    <div className="menu-iniciar" role="menu">
      <div className="menu-iniciar-faixa">DBOS</div>
      <ul className="menu-iniciar-itens">
        {ORDEM_APPS.map((tipo) => (
          <li key={tipo}>
            <button
              role="menuitem"
              onClick={() => {
                abrirJanela(tipo);
                aoFechar();
              }}
            >
              <span aria-hidden="true">{registroApps[tipo].icone}</span> {registroApps[tipo].titulo}
            </button>
          </li>
        ))}
        <li className="menu-iniciar-separador" aria-hidden="true" />
        <li>
          <button role="menuitem" disabled={sair.isPending} onClick={() => sair.mutate()}>
            🔌 Encerrar sessão ({login})
          </button>
        </li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/MenuIniciar.test.tsx`
Expected: PASS — 2 testes passam.

- [ ] **Step 5: Escrever o teste que falha `apps/web/src/areaTrabalho/BarraTarefas.test.tsx`**

```tsx
import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BarraTarefas } from './BarraTarefas';
import { useLoja, estadoInicial } from './loja';

beforeEach(() => useLoja.setState(estadoInicial()));

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <BarraTarefas login="sa" />
    </QueryClientProvider>,
  );
}

test('mostra um botão por janela aberta', () => {
  useLoja.getState().abrirJanela('consulta');
  useLoja.getState().abrirJanela('grade');
  renderizar();
  expect(screen.getByRole('button', { name: /Editor de Consultas/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Grade de Dados/ })).toBeInTheDocument();
});

test('clicar no botão da janela focada a minimiza', () => {
  useLoja.getState().abrirJanela('consulta'); // fica focada
  const id = useLoja.getState().janelas[0].id;
  renderizar();
  fireEvent.click(screen.getByRole('button', { name: /Editor de Consultas/ }));
  expect(useLoja.getState().janelas.find((j) => j.id === id)!.estado).toBe('minimizada');
});

test('clicar no botão Iniciar abre o menu', () => {
  renderizar();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }));
  expect(screen.getByRole('menu')).toBeInTheDocument();
});
```

- [ ] **Step 6: Rodar o teste e confirmar que falha**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/BarraTarefas.test.tsx`
Expected: FAIL — `Cannot find module './BarraTarefas'`.

- [ ] **Step 7: Implementar `apps/web/src/areaTrabalho/BarraTarefas.tsx`**

```tsx
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLoja } from './loja';
import { MenuIniciar } from './MenuIniciar';
import { Relogio } from './Relogio';

export function BarraTarefas({ login }: { login: string }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const janelas = useLoja(
    useShallow((s) =>
      s.janelas.map((j) => ({
        id: j.id,
        titulo: j.titulo,
        icone: j.icone,
        minimizada: j.estado === 'minimizada',
      })),
    ),
  );
  const idFocada = useLoja((s) => s.idFocada);
  const focar = useLoja((s) => s.focar);
  const minimizar = useLoja((s) => s.minimizar);
  const restaurar = useLoja((s) => s.restaurar);

  function aoClicarJanela(id: string, minimizada: boolean) {
    if (minimizada) {
      restaurar(id);
      focar(id);
    } else if (idFocada === id) {
      minimizar(id);
    } else {
      focar(id);
    }
  }

  return (
    <div className="barra-tarefas">
      <button
        className="botao-iniciar"
        aria-haspopup="menu"
        aria-expanded={menuAberto}
        onClick={() => setMenuAberto((v) => !v)}
      >
        Iniciar
      </button>
      {menuAberto && <MenuIniciar login={login} aoFechar={() => setMenuAberto(false)} />}
      <div className="barra-tarefas-janelas">
        {janelas.map((j) => (
          <button
            key={j.id}
            className={`botao-janela ${idFocada === j.id && !j.minimizada ? 'ativo' : ''}`}
            onClick={() => aoClicarJanela(j.id, j.minimizada)}
          >
            <span aria-hidden="true">{j.icone}</span> {j.titulo}
          </button>
        ))}
      </div>
      <Relogio />
    </div>
  );
}
```

- [ ] **Step 8: Rodar o teste e confirmar que passa**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/BarraTarefas.test.tsx`
Expected: PASS — 3 testes passam.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/areaTrabalho/MenuIniciar.tsx apps/web/src/areaTrabalho/MenuIniciar.test.tsx apps/web/src/areaTrabalho/BarraTarefas.tsx apps/web/src/areaTrabalho/BarraTarefas.test.tsx
git commit -m "feat(web): menu Iniciar e barra de tarefas"
```

---

### Task 9: O desktop `AreaTrabalho` + CSS, ligar no `App`, verificar no navegador

Monta tudo: wallpaper, atalhos de duplo-clique, a camada de janelas e a barra de tarefas. Substitui o placeholder da Fase 1.

**Files:**
- Create: `apps/web/src/areaTrabalho/areaTrabalho.css`
- Create: `apps/web/src/areaTrabalho/AreaTrabalho.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`
- Delete: `apps/web/src/AreaTrabalho.tsx`

- [ ] **Step 1: Criar `apps/web/src/areaTrabalho/areaTrabalho.css`**

```css
.area-trabalho {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #008080; /* teal clássico do Win9x */
}

/* Atalhos no canto superior esquerdo */
.icones-area {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 1;
}
.icone-atalho {
  width: 80px;
  padding: 4px;
  background: transparent;
  border: 1px solid transparent;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #fff;
  cursor: default;
}
.icone-atalho:focus {
  border: 1px dotted #fff;
  outline: none;
}
.icone-atalho-glifo {
  font-size: 28px;
  line-height: 1;
}
.icone-atalho-rotulo {
  font-size: 11px;
  text-align: center;
  text-shadow: 1px 1px #000;
}

.camada-janelas {
  position: absolute;
  inset: 0;
}

/* Barra de título inativa (janela sem foco) */
.title-bar.inactive {
  background: linear-gradient(90deg, #808080, #b5b5b5);
}

/* Alça de redimensionamento no canto inferior direito */
.alca-redimensionar {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
}

/* Barra de tarefas */
.barra-tarefas {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  background: #c0c0c0;
  border-top: 2px solid #fff;
  z-index: 10000;
}
.botao-iniciar {
  font-weight: bold;
  height: 24px;
}
.barra-tarefas-janelas {
  display: flex;
  gap: 3px;
  flex: 1;
  margin-left: 4px;
  overflow: hidden;
}
.botao-janela {
  height: 24px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
.botao-janela.ativo {
  box-shadow: inset -1px -1px #fff, inset 1px 1px grey, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;
}
.relogio {
  height: 24px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 11px;
  box-shadow: inset -1px -1px #fff, inset 1px 1px grey;
}

/* Menu Iniciar */
.menu-iniciar {
  position: absolute;
  left: 2px;
  bottom: 30px;
  width: 210px;
  display: flex;
  padding: 3px;
  background: #c0c0c0;
  z-index: 10001;
  box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf;
}
.menu-iniciar-faixa {
  width: 24px;
  padding: 6px 2px;
  background: linear-gradient(0deg, #808080, #000080);
  color: #fff;
  font-weight: bold;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  text-align: right;
}
.menu-iniciar-itens {
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 0;
}
.menu-iniciar-itens > li > button {
  display: block;
  width: 100%;
  padding: 6px 8px;
  text-align: left;
  background: transparent;
  border: none;
  box-shadow: none;
}
.menu-iniciar-itens > li > button:hover:not(:disabled) {
  background: #000080;
  color: #fff;
}
.menu-iniciar-separador {
  height: 2px;
  margin: 3px 2px;
  border-top: 1px solid grey;
  border-bottom: 1px solid #fff;
}
```

- [ ] **Step 2: Criar `apps/web/src/areaTrabalho/AreaTrabalho.tsx`**

```tsx
import type { UsuarioSessao } from '@dbos/shared';
import { ORDEM_APPS, registroApps } from './registroApps';
import { useLoja } from './loja';
import { CamadaJanelas } from './CamadaJanelas';
import { BarraTarefas } from './BarraTarefas';
import './areaTrabalho.css';

// O desktop: wallpaper, atalhos de duplo-clique, janelas e barra de tarefas.
export function AreaTrabalho({ usuario }: { usuario: UsuarioSessao }) {
  const abrirJanela = useLoja((s) => s.abrirJanela);

  return (
    <div className="area-trabalho">
      <div className="icones-area">
        {ORDEM_APPS.map((tipo) => (
          <button
            key={tipo}
            className="icone-atalho"
            onDoubleClick={() => abrirJanela(tipo)}
          >
            <span className="icone-atalho-glifo" aria-hidden="true">
              {registroApps[tipo].icone}
            </span>
            <span className="icone-atalho-rotulo">{registroApps[tipo].titulo}</span>
          </button>
        ))}
      </div>
      <CamadaJanelas />
      <BarraTarefas login={usuario.login} />
    </div>
  );
}
```

- [ ] **Step 3: Atualizar o import em `apps/web/src/App.tsx`**

Troque a linha:

```tsx
import { AreaTrabalho } from './AreaTrabalho';
```

por:

```tsx
import { AreaTrabalho } from './areaTrabalho/AreaTrabalho';
```

(O resto de `App.tsx` fica igual — `AreaTrabalho` continua recebendo `usuario={sessao.data}`.)

- [ ] **Step 4: Atualizar `apps/web/src/App.test.tsx`**

A tela logada agora é o desktho real: assertamos o botão "Iniciar" da barra de tarefas em vez de "Bem-vindo, sa". Reescreva o arquivo inteiro:

```tsx
import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { useLoja, estadoInicial } from './areaTrabalho/loja';

beforeEach(() => useLoja.setState(estadoInicial()));
afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <App />
    </QueryClientProvider>,
  );
}

test('mostra a tela de login quando não há sessão', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: false, erro: { tipo: 'autenticacao', mensagem: 'sem sessão' } }),
        { status: 401 },
      ),
    ),
  );
  renderizar();
  expect(await screen.findByLabelText('Login')).toBeInTheDocument();
});

test('mostra a área de trabalho quando há sessão', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, dados: { login: 'sa' } })),
    ),
  );
  renderizar();
  expect(await screen.findByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
});
```

- [ ] **Step 5: Apagar o placeholder da Fase 1**

```bash
git rm apps/web/src/AreaTrabalho.tsx
```

(Não há `AreaTrabalho.test.tsx` na raiz para remover — a Fase 1 não criou um.)

- [ ] **Step 6: Rodar a suíte web inteira**

Run: `bun --filter @dbos/web test`
Expected: PASS — `cliente` (2), `TelaLogin` (1), `App` (2), `loja` (7), `limites` (4), `Janela` (4), `Relogio` (1), `MenuIniciar` (2), `BarraTarefas` (3). Sem referência ao `./AreaTrabalho` removido.

- [ ] **Step 7: Verificar o fluxo no navegador**

Em dois terminais:
```bash
bun run dev:server   # :3001
bun run dev:web      # :5173
```
Abra `http://localhost:5173` e faça login (`sa` + senha). Confirme, no desktop teal:
- 4 atalhos no canto superior esquerdo; **duplo-clique** em um abre a janela do app.
- Clicar em "Iniciar" abre o menu; clicar num app abre a janela; "Encerrar sessão (sa)" volta ao login.
- **Arrastar** a barra de título move a janela; ela **gruda** nas bordas e não passa por baixo da barra de tarefas.
- **Redimensionar** pela alça do canto inferior direito (respeita o mínimo 200×120).
- Clicar numa janela a traz para a frente (z-order) e deixa a barra de título azul; as outras ficam cinza.
- Botões da janela: **minimizar** (some, fica só na barra de tarefas), **maximizar** (preenche acima da barra), **fechar**.
- Botão da janela na barra de tarefas: restaura quando minimizada, minimiza quando é a focada.

Pare ambos com Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/areaTrabalho/AreaTrabalho.tsx apps/web/src/areaTrabalho/areaTrabalho.css apps/web/src/App.tsx apps/web/src/App.test.tsx
git commit -m "feat(web): desktop com atalhos, camada de janelas e barra de tarefas"
```

---

### Task 10: (Opcional, nice-to-have) Persistir o layout no localStorage

Spec §4.6 marca isto como opcional para a v1: as janelas reabrem onde foram deixadas. Escopo restrito à **geometria** (nada de credenciais — a sessão continua só no cookie httpOnly).

**Files:**
- Modify: `apps/web/src/areaTrabalho/loja.ts`

- [ ] **Step 1: Envolver a loja com o middleware `persist`**

No topo de `loja.ts`, troque o import do zustand:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
```

Troque a assinatura de criação de:

```ts
export const useLoja = create<LojaAreaTrabalho>((set) => ({
```

para:

```ts
export const useLoja = create<LojaAreaTrabalho>()(
  persist(
    (set) => ({
```

e, **no fim do objeto** (depois de `restaurar: ...`), feche o `persist` com a config (substitua o `}));` final por):

```ts
    }),
    {
      name: 'dbos-area-trabalho',
      // Só geometria/estado de janelas — funções não são serializadas pelo persist.
      partialize: (s) => ({
        janelas: s.janelas,
        idFocada: s.idFocada,
        proximoZ: s.proximoZ,
        proximoId: s.proximoId,
      }),
    },
  ),
);
```

- [ ] **Step 2: Confirmar que os testes da loja seguem verdes**

Run: `bun --filter @dbos/web exec vitest run src/areaTrabalho/loja.test.ts`
Expected: PASS — 7 testes (o `beforeEach` com `setState(estadoInicial())` continua zerando o estado; o `persist` não interfere porque os testes nunca dependem de carga prévia).

- [ ] **Step 3: Verificar no navegador**

Suba os dois servidores, abra duas janelas, mova-as, **recarregue a página** (F5). Esperado: as janelas reaparecem nas mesmas posições. (Para limpar: `localStorage.removeItem('dbos-area-trabalho')` no console do DevTools.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/areaTrabalho/loja.ts
git commit -m "feat(web): persistência do layout do desktop no localStorage"
```

---

### Task 11: README + verificação do monorepo inteiro

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Documentar o desktop no `README.md`**

Acrescente, logo após o parágrafo de login da seção "Como rodar":

```markdown

Depois do login você cai no desktop Win98: atalhos no canto, menu **Iniciar**,
barra de tarefas com relógio, e janelas arrastáveis/redimensionáveis. Os quatro
apps (Explorador, Editor de Consultas, Grade, Propriedades) abrem como janelas
placeholder — os apps reais chegam nas próximas fases.
```

- [ ] **Step 2: Rodar a suíte inteira**

Run: `bun run test`
Expected: tudo passa — shared (3), server (saúde + conexão + gerenciadorPools (5) + configParaLogin (2) + tratadorErros (3) + autenticação (5)), web (cliente 2 + TelaLogin 1 + App 2 + loja 7 + limites 4 + Janela 4 + Relogio 1 + MenuIniciar 2 + BarraTarefas 3).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README descreve o desktop da Fase 2"
```

---

## Self-Review

**Spec coverage (Fase 2 / roadmap passo 2 — "Gerenciador de janelas"):**
- Fonte única de verdade em Zustand com a interface `LojaAreaTrabalho` exata da spec §4.1 → Task 1 (`tipos.ts`) + Task 2 (`loja.ts`). ✓ (Acréscimo `anterior` + `proximoId` para `restaurar` a partir de minimizada e gerar ids únicos — documentado.)
- App registry genérico; fronteira WM↔app = `dados` + ações (spec §4.2) → Task 1 `registroApps` + `PropsApp`. ✓
- Camadas z-stacked: desktop, camada de janelas, barra de tarefas, menu Iniciar (spec §4.3) → Tasks 6, 8, 9. ✓
- `<Janela>` chrome 98.css com min/max/fechar e borda 3D; clicar foca e sobe o zIndex (spec §4.3) → Task 5. ✓
- Detalhes da ilusão (spec §4.4): título azul focado vs. cinza; maximizar preenche acima da barra; minimizar some na barra; janelas grudam no viewport → Task 5 (estilo/inactive), Task 3 (clamp), Task 9 (CSS). ✓ (A animação de minimizar para o botão é cosmética; deixada para o polimento da Fase 7.)
- Drag/resize à mão com pointer events, batido por rAF (spec §4.5, §2.3) → Task 4 `usarArrasto` + Task 5. ✓
- Performance (spec §2.3): `React.memo` no `<Janela>`, `useCallback` nos handlers, seletores Zustand por janela (`find` por id) + `useShallow` na lista de ids → Tasks 5, 6. ✓
- Persistência em localStorage (spec §4.6, opcional) → Task 10. ✓
- Identificadores pt-BR; inglês só na superfície de bibliotecas (props React, `zIndex`, e os aria-labels de controle que o 98.css exige) → cabeçalho + Task 5. ✓

**Placeholder scan:** Sem TBD/TODO. Todos os passos de código têm conteúdo completo. O `AppPlaceholder` é intencional e rotulado (apps reais = Fases 3–6). ✓

**Type consistency:** `EstadoJanela`/`LojaAreaTrabalho`/`DefinicaoApp`/`PropsApp`/`Retangulo`/`TipoApp` definidos uma vez em `tipos.ts` (Task 1) e importados com os mesmos nomes em `loja.ts`, `registroApps.tsx`, `Janela.tsx`, `CamadaJanelas.tsx`. As ações (`abrirJanela`/`fecharJanela`/`focar`/`mover`/`redimensionar`/`minimizar`/`maximizar`/`restaurar`) têm a mesma assinatura na interface (Task 1), na implementação (Task 2) e no consumo (Tasks 5, 8, 9). `useLoja`/`estadoInicial` definidos uma vez (Task 2) e reusados em todos os testes e componentes. `limitarRetangulo`/`ALTURA_BARRA` (Task 3) batem com o uso em `Janela.tsx` (Task 5) e no CSS (Task 9). `registroApps`/`ORDEM_APPS` (Task 1) consumidos identicamente em `loja.ts`, `MenuIniciar`, `BarraTarefas`, `AreaTrabalho`. ✓

**Decisões registradas (não são lacunas):**
- `EstadoJanela.anterior` e `proximoId` não estão na spec §4.1, mas são necessários para `restaurar` corretamente e gerar ids determinísticos/únicos (testável sem `Math.random`/`crypto`). Documentado no `tipos.ts`.
- Janelas minimizadas continuam montadas (`display:none`) em vez de desmontadas — preserva o estado dos apps reais nas fases futuras (Task 6).
- Drag/resize não tem teste de unidade (jsdom não simula pointer capture + rAF de forma confiável); cobertos por verificação no navegador (Task 9) e pelo E2E Playwright previsto na spec §7. A lógica testável (clamp, transições de estado) está isolada em `limites.ts` e na loja, ambos com testes.
- Menus de contexto (botão direito) da spec §4.3 são citados junto com o menu Iniciar como "uma única camada de portal"; o menu de contexto do desktop/ícones é cosmético e foi adiado para o polimento (Fase 7) — esta fase entrega o menu Iniciar, que é o que o passo 2 do roadmap nomeia explicitamente.
