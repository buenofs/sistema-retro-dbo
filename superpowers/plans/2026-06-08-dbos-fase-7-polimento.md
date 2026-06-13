# DBOS — Fase 7: Polimento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o roadmap com o polimento da spec (passo 7): **sons do sistema** (paleta sintetizada via Web Audio, tocados em eventos do WM), **menus de contexto do desktop e dos ícones** (spec §4.3, adiados da Fase 6), **acessibilidade básica dos diálogos** (Esc fecha, foco no OK), e um **passo de verificação de performance** (memo/lazy/virtualização). A persistência de layout (localStorage) já foi feita na Fase 2.

**Architecture:** Os sons ficam num módulo único `sons.ts` (`tocarSom(tipo)`) com um `AudioContext` lazy compartilhado; cada tipo é uma onda curta sintetizada (sem assets). Um hook `usarSonsJanelas` assina a loja do WM e toca abrir/fechar conforme a contagem de janelas muda — efeito colateral desacoplado da loja pura. O desktop e os ícones ganham `onContextMenu` que abrem o portal `useMenuContexto`/`<MenuContexto>` (Fase 6). Os diálogos (`GerenciadorDialogos`) passam a fechar no Esc e a focar o botão OK ao abrir, e migram do `tocarBipe` para `tocarSom('erro')`. A verificação de performance confirma as práticas da spec §2.3 já presentes e adiciona `React.memo` no nó de árvore do Explorador.

**Tech Stack:** React 18, Zustand, TanStack Query, Web Audio, 98.css, Vitest + RTL. pt-BR no que autoramos.

**Builds on Phases 0–6:**
- WM: `useLoja` (`abrirJanela`/`fecharJanela`, `janelas`), `AreaTrabalho` (desktop, já monta `<GerenciadorDialogos>` e `<MenuContexto>`), `registroApps`/`ORDEM_APPS`.
- Menus: `useMenuContexto`/`<MenuContexto>` (Fase 6, com `ItemMenu`, fecha em clique fora/Esc).
- Diálogos: `useDialogos` + `<GerenciadorDialogos>` (Fase 4) usando `tocarBipe` (a substituir).
- Explorador: `NoTabela` (nó por objeto).
- Persistência: `loja.ts` com `persist` (Fase 2) — **já cumpre o item "layout persistence" do passo 7**.

---

### Decisões de escopo desta fase (registradas)

- **Sons sintetizados** (sem arquivos): `AudioContext` lazy e compartilhado; falha graciosamente sem áudio (jsdom). Tipos: `abrir`/`fechar`/`erro`/`iniciar`. Sem toggle de mudo no v1 (os sons são curtos e disparados por gesto do usuário).
- **Sons de janela** via assinatura da loja (abrir/fechar pela contagem) — não polui a loja pura com efeitos. Minimizar/maximizar não tocam (não mudam a contagem) — fica simples.
- **Menu do desktop** abre só no fundo (`e.target === e.currentTarget`), não dentro de janelas; o menu do ícone usa `stopPropagation`. Itens: abrir cada app (desktop) / "Abrir" (ícone).
- **A11y dos diálogos**: Esc fecha o do topo; OK recebe foco ao abrir; `role="dialog"`/`aria-modal` já existem. (Navegação completa por teclado de todo o WM fica fora do v1.)
- **Performance**: o passo é de **verificação** (doc com referências de arquivo) + uma melhoria concreta (`memo` no `NoTabela`). As práticas-chave já existem desde as fases anteriores.
- **Layout persistence**: já entregue na Fase 2 — sem trabalho novo, só registrado na verificação.

---

### File structure for this phase

**`apps/web/src/areaTrabalho/`**
- Create `sons.ts` — `tocarSom` + perfis por tipo.
- Test `sons.test.ts`.
- Create `usarSonsJanelas.ts` — hook que toca abrir/fechar.
- Test `usarSonsJanelas.test.tsx`.
- Modify `AreaTrabalho.tsx` — montar `usarSonsJanelas` + `onContextMenu` no desktop e nos ícones.
- Test `AreaTrabalho.test.tsx` (novo).
- Modify `GerenciadorDialogos.tsx` — `tocarSom('erro')` + Esc fecha topo + foco no OK.
- Modify `GerenciadorDialogos.test.tsx` — testes de Esc e foco.
- Delete `tocarBipe.ts` (substituído por `sons.ts`).

**`apps/web/src/aplicativos/explorador/`**
- Modify `NoTabela.tsx` — `React.memo`.

**`docs/superpowers/`**
- Create `perf-fase-7.md` — verificação de performance.

**`README.md`** — Modify.

---

### Task 0: Web — paleta de sons do sistema (TDD)

**Files:**
- Create: `apps/web/src/areaTrabalho/sons.ts`
- Test: `apps/web/src/areaTrabalho/sons.test.ts`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/areaTrabalho/sons.test.ts`**

```ts
import { test, expect } from 'vitest';
import { tocarSom } from './sons';

// No jsdom não há AudioContext: tocarSom deve sair graciosamente, sem lançar.
test('tocarSom é seguro sem áudio (jsdom) para todos os tipos', () => {
  expect(() => {
    tocarSom('abrir');
    tocarSom('fechar');
    tocarSom('erro');
    tocarSom('iniciar');
  }).not.toThrow();
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/sons.test.ts`
Expected: FAIL — `Cannot find module './sons'`.

- [ ] **Step 3: Implementar `apps/web/src/areaTrabalho/sons.ts`**

```ts
export type TipoSom = 'abrir' | 'fechar' | 'erro' | 'iniciar';

interface PerfilSom {
  freq: number;
  ms: number;
  onda: OscillatorType;
}

const PERFIS: Record<TipoSom, PerfilSom> = {
  abrir: { freq: 660, ms: 90, onda: 'square' },
  fechar: { freq: 330, ms: 90, onda: 'square' },
  erro: { freq: 200, ms: 200, onda: 'sawtooth' },
  iniciar: { freq: 880, ms: 140, onda: 'triangle' },
};

let contexto: AudioContext | null = null;

// AudioContext compartilhado e lazy. null onde não há Web Audio (ex.: jsdom).
function obterContexto(): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    contexto ??= new Ctx();
    return contexto;
  } catch {
    return null;
  }
}

// Toca um som curto sintetizado. Silencioso (sem lançar) onde não há áudio.
export function tocarSom(tipo: TipoSom): void {
  const ctx = obterContexto();
  if (!ctx) return;
  try {
    const perfil = PERFIS[tipo];
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = perfil.onda;
    osc.frequency.value = perfil.freq;
    ganho.gain.value = 0.04;
    osc.connect(ganho);
    ganho.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + perfil.ms / 1000);
  } catch {
    // sem áudio disponível — ignore
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/sons.test.ts`
Expected: PASS — 1 teste.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/sons.ts apps/web/src/areaTrabalho/sons.test.ts
git commit -m "feat(web): paleta de sons do sistema (tocarSom)"
```

---

### Task 1: Web — gancho de sons ao abrir/fechar janelas (TDD)

**Files:**
- Create: `apps/web/src/areaTrabalho/usarSonsJanelas.ts`
- Test: `apps/web/src/areaTrabalho/usarSonsJanelas.test.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/areaTrabalho/usarSonsJanelas.test.tsx`**

```tsx
import { test, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useLoja, estadoInicial } from './loja';

vi.mock('./sons', () => ({ tocarSom: vi.fn() }));
import { tocarSom } from './sons';
import { usarSonsJanelas } from './usarSonsJanelas';

beforeEach(() => {
  useLoja.setState(estadoInicial());
  vi.clearAllMocks();
});

function Harness() {
  usarSonsJanelas();
  return null;
}

test('toca "abrir" ao abrir e "fechar" ao fechar', () => {
  render(<Harness />);
  act(() => useLoja.getState().abrirJanela('explorador'));
  expect(tocarSom).toHaveBeenCalledWith('abrir');

  const id = useLoja.getState().janelas[0]!.id;
  act(() => useLoja.getState().fecharJanela(id));
  expect(tocarSom).toHaveBeenCalledWith('fechar');
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/usarSonsJanelas.test.tsx`
Expected: FAIL — `Cannot find module './usarSonsJanelas'`.

- [ ] **Step 3: Implementar `apps/web/src/areaTrabalho/usarSonsJanelas.ts`**

```ts
import { useEffect, useRef } from 'react';
import { useLoja } from './loja';
import { tocarSom } from './sons';

// Toca sons quando a quantidade de janelas aumenta (abrir) ou diminui (fechar).
export function usarSonsJanelas(): void {
  const total = useLoja((s) => s.janelas.length);
  const anterior = useRef(total);
  useEffect(() => {
    if (total > anterior.current) tocarSom('abrir');
    else if (total < anterior.current) tocarSom('fechar');
    anterior.current = total;
  }, [total]);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/usarSonsJanelas.test.tsx`
Expected: PASS — 1 teste.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/areaTrabalho/usarSonsJanelas.ts apps/web/src/areaTrabalho/usarSonsJanelas.test.tsx
git commit -m "feat(web): gancho de sons ao abrir/fechar janelas"
```

---

### Task 2: Web — menus de contexto do desktop e dos ícones (TDD)

Reescreve `AreaTrabalho.tsx` para (a) montar `usarSonsJanelas` e (b) abrir o menu de contexto no fundo do desktop e em cada ícone.

**Files:**
- Modify: `apps/web/src/areaTrabalho/AreaTrabalho.tsx`
- Test: `apps/web/src/areaTrabalho/AreaTrabalho.test.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/areaTrabalho/AreaTrabalho.test.tsx`**

```tsx
import { test, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AreaTrabalho } from './AreaTrabalho';
import { useLoja, estadoInicial } from './loja';
import { useMenuContexto, estadoInicialMenuContexto } from './useMenuContexto';

vi.mock('./sons', () => ({ tocarSom: vi.fn() }));

beforeEach(() => {
  useLoja.setState(estadoInicial());
  useMenuContexto.setState(estadoInicialMenuContexto());
});

function renderizar() {
  return render(<AreaTrabalho usuario={{ login: 'sa' }} />);
}

test('botão direito no fundo do desktop abre menu com os 4 apps', () => {
  const { container } = renderizar();
  const desktop = container.querySelector('.area-trabalho') as HTMLElement;
  fireEvent.contextMenu(desktop);
  const rotulos = useMenuContexto.getState().itens.map((i) => i.rotulo);
  expect(rotulos).toHaveLength(4);
  expect(rotulos.some((r) => r.includes('Explorador de Objetos'))).toBe(true);
});

test('botão direito num ícone abre menu "Abrir"', () => {
  const { getAllByText } = renderizar();
  const botaoIcone = getAllByText('Explorador de Objetos')[0]!.closest('button') as HTMLElement;
  fireEvent.contextMenu(botaoIcone);
  expect(useMenuContexto.getState().itens.map((i) => i.rotulo)).toEqual(['Abrir']);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/AreaTrabalho.test.tsx`
Expected: FAIL — o menu não abre (itens vazios) porque ainda não há `onContextMenu`.

- [ ] **Step 3: Reescrever `apps/web/src/areaTrabalho/AreaTrabalho.tsx`**

```tsx
import type { UsuarioSessao } from '@dbos/shared';
import { ORDEM_APPS, registroApps } from './registroApps';
import { useLoja } from './loja';
import { type ItemMenu, useMenuContexto } from './useMenuContexto';
import { usarSonsJanelas } from './usarSonsJanelas';
import { CamadaJanelas } from './CamadaJanelas';
import { BarraTarefas } from './BarraTarefas';
import { GerenciadorDialogos } from './GerenciadorDialogos';
import { MenuContexto } from './MenuContexto';
import './areaTrabalho.css';

// O desktop: wallpaper, atalhos, janelas, barra de tarefas, diálogos e menus.
export function AreaTrabalho({ usuario }: { usuario: UsuarioSessao }) {
  usarSonsJanelas();
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const abrirMenu = useMenuContexto((s) => s.abrir);

  return (
    <div
      className="area-trabalho"
      onContextMenu={(e) => {
        // Só o fundo do desktop — janelas e ícones tratam o próprio menu.
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        const itens: ItemMenu[] = ORDEM_APPS.map((tipo) => ({
          rotulo: `Abrir ${registroApps[tipo].titulo}`,
          aoClicar: () => abrirJanela(tipo),
        }));
        abrirMenu(e.clientX, e.clientY, itens);
      }}
    >
      <div className="icones-area">
        {ORDEM_APPS.map((tipo) => (
          <button
            key={tipo}
            className="icone-atalho"
            onDoubleClick={() => abrirJanela(tipo)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              abrirMenu(e.clientX, e.clientY, [
                { rotulo: 'Abrir', aoClicar: () => abrirJanela(tipo) },
              ]);
            }}
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
      <GerenciadorDialogos />
      <MenuContexto />
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/AreaTrabalho.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 5: Rodar a suíte web inteira (garante que App.test e afins não regrediram)**

Run: `bun --filter @dbos/web test`
Expected: PASS — tudo, incluindo `App` (que renderiza `AreaTrabalho` quando há sessão) + os novos.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/areaTrabalho/AreaTrabalho.tsx apps/web/src/areaTrabalho/AreaTrabalho.test.tsx
git commit -m "feat(web): menus de contexto do desktop e dos ícones"
```

---

### Task 3: Web — acessibilidade dos diálogos (Esc + foco) e migração para `tocarSom` (TDD)

**Files:**
- Modify: `apps/web/src/areaTrabalho/GerenciadorDialogos.tsx`
- Modify: `apps/web/src/areaTrabalho/GerenciadorDialogos.test.tsx`
- Delete: `apps/web/src/areaTrabalho/tocarBipe.ts`

- [ ] **Step 1: Acrescentar os testes de a11y em `apps/web/src/areaTrabalho/GerenciadorDialogos.test.tsx`**

Acrescente estes dois testes ao final do arquivo (mantenha os 3 existentes):

```tsx
test('Esc fecha o diálogo do topo', () => {
  useDialogos.getState().abrir({ tipo: 'erro', titulo: 'Erro', mensagem: 'x' });
  render(<GerenciadorDialogos />);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(useDialogos.getState().dialogos).toHaveLength(0);
});

test('o botão OK recebe foco ao abrir', () => {
  useDialogos.getState().abrir({ tipo: 'erro', titulo: 'Erro', mensagem: 'x' });
  render(<GerenciadorDialogos />);
  expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus();
});
```

> Se o import de `fireEvent` ainda não existir no arquivo, troque a linha de import do testing-library para: `import { render, screen, fireEvent } from '@testing-library/react';`

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/GerenciadorDialogos.test.tsx`
Expected: FAIL — Esc ainda não fecha; OK ainda não recebe foco.

- [ ] **Step 3: Reescrever `apps/web/src/areaTrabalho/GerenciadorDialogos.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { type Dialogo, useDialogos } from './useDialogos';
import { tocarSom } from './sons';

const ICONE: Record<Dialogo['tipo'], string> = {
  erro: '❌',
  aviso: '⚠️',
  info: 'ℹ️',
};

// Portal único de diálogos modais 98.css (spec §6.4). Montado uma vez no desktop.
export function GerenciadorDialogos() {
  const dialogos = useDialogos(useShallow((s) => s.dialogos));
  const fechar = useDialogos((s) => s.fechar);

  // a11y: Esc fecha o diálogo do topo.
  useEffect(() => {
    if (dialogos.length === 0) return;
    function aoTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const topo = dialogos[dialogos.length - 1];
        if (topo) fechar(topo.id);
      }
    }
    window.addEventListener('keydown', aoTecla);
    return () => window.removeEventListener('keydown', aoTecla);
  }, [dialogos, fechar]);

  if (dialogos.length === 0) return null;
  return (
    <div className="camada-dialogos">
      {dialogos.map((d) => (
        <CaixaDialogo key={d.id} dialogo={d} aoFechar={() => fechar(d.id)} />
      ))}
    </div>
  );
}

function CaixaDialogo({ dialogo, aoFechar }: { dialogo: Dialogo; aoFechar: () => void }) {
  const okRef = useRef<HTMLButtonElement>(null);

  // Bipe ao abrir (spec §6.4) + foco no OK (a11y).
  useEffect(() => {
    tocarSom('erro');
    okRef.current?.focus();
  }, []);

  return (
    <div className="dialogo-fundo" role="dialog" aria-modal="true" aria-label={dialogo.titulo}>
      <div className="window dialogo-janela">
        <div className="title-bar">
          <div className="title-bar-text">{dialogo.titulo}</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={aoFechar} />
          </div>
        </div>
        <div className="window-body">
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 24, lineHeight: 1 }} aria-hidden="true">
              {ICONE[dialogo.tipo]}
            </span>
            <p style={{ margin: 0 }}>{dialogo.mensagem}</p>
          </div>
          {dialogo.detalhe && (
            <details style={{ marginTop: 8 }}>
              <summary>Detalhes</summary>
              <pre>{dialogo.detalhe}</pre>
            </details>
          )}
          <div className="field-row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button ref={okRef} onClick={aoFechar}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Remover o `tocarBipe` órfão**

Confirme que nada mais o referencia e remova:

Run: `cd apps/web && grep -rl "tocarBipe" src` (espere: nenhum resultado após o Step 3)
Se não houver resultados:

```bash
git rm apps/web/src/areaTrabalho/tocarBipe.ts
```

(Se ainda houver referência, ajuste-a para `tocarSom` antes de apagar.)

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/areaTrabalho/GerenciadorDialogos.test.tsx`
Expected: PASS — 5 testes (3 antigos + Esc + foco).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/areaTrabalho/GerenciadorDialogos.tsx apps/web/src/areaTrabalho/GerenciadorDialogos.test.tsx
git rm apps/web/src/areaTrabalho/tocarBipe.ts 2>/dev/null; git add -A
git commit -m "feat(web): acessibilidade dos diálogos (Esc + foco no OK)"
```

---

### Task 4: Web — passo de performance (memo + verificação)

**Files:**
- Modify: `apps/web/src/aplicativos/explorador/NoTabela.tsx`
- Create: `docs/superpowers/perf-fase-7.md`

- [ ] **Step 1: Memoizar `apps/web/src/aplicativos/explorador/NoTabela.tsx`**

Reescreva o arquivo envolvendo o componente em `memo` (o `objeto` tem referência estável entre filtragens, então o nó não re-renderiza à toa):

```tsx
import { memo, useState } from 'react';
import type { ObjetoBanco } from '@dbos/shared';
import { useMenuContexto } from '../../areaTrabalho/useMenuContexto';
import { useLoja } from '../../areaTrabalho/loja';
import { ColunasDaTabela } from './ColunasDaTabela';

// Nó expansível: ao abrir, monta <ColunasDaTabela> — é o que dispara a busca lazy.
// Memoizado: re-renderiza só quando o próprio `objeto` muda (spec §2.3).
export const NoTabela = memo(function NoTabela({ objeto }: { objeto: ObjetoBanco }) {
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
});
```

- [ ] **Step 2: Criar a verificação `docs/superpowers/perf-fase-7.md`**

```markdown
# Verificação de Performance — Fase 7

Checklist das práticas da spec §2.3, com onde cada uma vive no código.

- [x] **React.memo no chrome da janela** — `apps/web/src/areaTrabalho/Janela.tsx` (`export const Janela = memo(...)`). Mover uma janela não re-renderiza as outras.
- [x] **Seletores Zustand por janela** — `Janela.tsx` seleciona `s.janelas.find((j) => j.id === id)`; `CamadaJanelas.tsx` seleciona só a lista de ids via `useShallow`. Mover/redimensionar uma janela não re-renderiza a camada.
- [x] **React.memo em item de lista** — `apps/web/src/aplicativos/explorador/NoTabela.tsx` (adicionado nesta fase): filtrar o Explorador não re-renderiza nós cujo `objeto` não mudou.
- [x] **React.lazy + Suspense por app** — `registroApps.tsx` carrega `EditorConsultas` via `lazy(() => import(...))`; `Janela.tsx` envolve o app em `<Suspense>`. O CodeMirror só baixa ao abrir o Editor.
- [x] **Virtualização de lista** — `apps/web/src/aplicativos/consulta/GradeResultado.tsx` usa `@tanstack/react-virtual` para resultados ilimitados.
- [x] **Paginação no servidor** — `apps/web/src/aplicativos/grade/TabelaGrade.tsx` + `apps/server/src/bd/consultasGrade.ts` (`OFFSET/FETCH`); o Editor aplica teto de linhas (`SQL_MAX_LINHAS`).
- [x] **Debounce em filtro** — `apps/web/src/aplicativos/explorador/usarValorDebounced.ts` no filtro do Explorador.
- [x] **Arrasto/redimensionamento em rAF** — `apps/web/src/areaTrabalho/usarArrasto.ts` (batelada por `requestAnimationFrame`).
- [x] **Persistência de layout (localStorage)** — `apps/web/src/areaTrabalho/loja.ts` com `persist` (Fase 2).

Conclusão: todas as práticas da spec §2.3 estão presentes; esta fase acrescentou a memoização do nó da árvore.
```

- [ ] **Step 3: Checar tipos do web**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 4: Confirmar que os testes do Explorador seguem verdes**

Run: `cd apps/web && bunx vitest run src/aplicativos/explorador/NoTabela.test.tsx src/aplicativos/explorador/ExploradorObjetos.test.tsx`
Expected: PASS — o `memo` não muda o comportamento.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/aplicativos/explorador/NoTabela.tsx docs/superpowers/perf-fase-7.md
git commit -m "perf(web): memoiza nó da árvore + verificação de performance"
```

---

### Task 5: Verificação completa + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Checar tipos do web (garantia)**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 2: Documentar o polimento no `README.md`**

Acrescente, ao final do parágrafo das Propriedades na seção "Como rodar":

```markdown

Toques de polimento: sons curtos ao abrir/fechar janelas e nos erros; clique com
o botão direito no **fundo do desktop** (abrir qualquer app) ou num **ícone**
("Abrir"); diálogos fecham no **Esc** e focam o OK ao abrir; o layout das janelas
é lembrado entre sessões (localStorage).
```

- [ ] **Step 3: Rodar a suíte inteira do monorepo**

Run: `bun run test`
Expected: tudo verde — `@dbos/shared`, `@dbos/server`, `@dbos/web` (+ sons 1 + usarSonsJanelas 1 + AreaTrabalho 2 + GerenciadorDialogos agora 5). Falhas SÓ por conexão SQL = ambiente.

- [ ] **Step 4: Verificar no navegador**

Em dois terminais:
```bash
bun run dev:server   # :3001
bun run dev:web      # :5173
```
Faça login e confirme:
- Abrir um app toca um som; fechar toca outro; um erro de SQL toca o som de erro.
- Botão direito no fundo do desktop abre um menu para abrir qualquer app; botão direito num ícone mostra "Abrir".
- Um diálogo de erro (ex.: SQL inválido no Editor) abre com o OK já focado; **Esc** fecha.
- Reabrir a página mantém as janelas onde estavam (persistência da Fase 2).
- Os menus de contexto fecham ao clicar fora ou no Esc.

Pare ambos com Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README e polimento (Fase 7)"
```

---

## Self-Review

**Spec coverage (Fase 7 / roadmap passo 7 — "layout persistence, system sounds, context menus, perf pass, basic a11y"):**
- Layout persistence (localStorage) → já entregue na Fase 2 (`loja.ts` com `persist`); registrado na verificação (Task 4) e no README (Task 5). ✓
- System sounds → `sons.ts`/`tocarSom` (Task 0) tocados ao abrir/fechar janelas (Task 1) e nos diálogos de erro (Task 3). ✓
- Context menus (spec §4.3 "right-click on desktop or icons") → desktop e ícones (Task 2); objetos do Explorador já na Fase 6. ✓
- Perf pass (verify memo/lazy/virtualization) → doc de verificação + `memo` no `NoTabela` (Task 4). ✓
- Basic a11y → Esc fecha o diálogo do topo + foco no OK (Task 3); `role`/`aria-modal` já presentes. ✓

**Placeholder scan:** Sem TBD/TODO; todo passo tem conteúdo completo.

**Type consistency:** `TipoSom`/`tocarSom` (Task 0) usados por `usarSonsJanelas` (Task 1) e `GerenciadorDialogos` (Task 3). `ItemMenu`/`useMenuContexto.abrir` (Fase 6) usados em `AreaTrabalho` (Task 2). `usarSonsJanelas` montado em `AreaTrabalho` (Task 2). `tocarBipe` removido só após `GerenciadorDialogos` migrar para `tocarSom` (Task 3). `NoTabela` memoizado mantém a mesma assinatura `{ objeto }` (Task 4). ✓

**Riscos/observações:**
- Sons não são testados de verdade (sem Web Audio no jsdom); o teste garante apenas que `tocarSom` não lança, e o `usarSonsJanelas` é testado com `tocarSom` mockado. Verificação real no navegador (Task 5).
- O menu do desktop usa `e.target === e.currentTarget` para abrir só no fundo; o do ícone usa `stopPropagation`. Right-click dentro de janelas não abre o menu do desktop.
- `AreaTrabalho.test` renderiza o desktop inteiro (Relógio com `setInterval`, mockando `./sons`); reseta `useLoja`/`useMenuContexto` entre testes.
- `tocarBipe` é removido (substituído por `sons.ts`); o passo confirma ausência de outras referências antes de apagar.
- Navegação completa por teclado de todo o WM (foco entre janelas/taskbar) fica fora do escopo do v1; o foco em diálogos cobre o caso modal mais importante.
