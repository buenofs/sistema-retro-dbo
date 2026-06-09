# Revamp Visual — Fase 3: Pele do shell (duas peles, fidelidade plena) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar fidelidade visual plena às **duas peles** (Aero e 98) em todo o shell — boot, login, área de trabalho, barra de tarefas, menu Iniciar, janelas, diálogos e menu de contexto — criando `tema/pele-98.css` e `tema/pele-aero.css` (escopados por `body[data-skin]`), realizando os visuais que a Fase 2 só fiou (wallpapers `data-wp`, padrões `data-pat`, vidro `--glass-blur`, scanlines `--crt`), e **virando a pele padrão para Aero** em máquina nova.

**Architecture:** A Fase 0 deixou `tokens.css` (valores 98) + `base.css` (classes compartilhadas em tokens). A Fase 2 já escreve no `document` os atributos `body[data-skin|data-wp|data-pat|data-corners]` e as vars `--accent`/`--accent-h`/`--glass-blur`/`--crt`/`--round*`/`--motion`. Esta fase: (1) extrai os poucos hardcodes do CSS do shell para tokens abstratos (`tokens.css` ganha defaults 98); (2) cria `pele-98.css` (`body[data-skin="98"]`) com padrões de área + CRT; (3) cria `pele-aero.css` (`body[data-skin="aero"]`) com chrome prata, gradientes glossy, vidro (`backdrop-filter`), wallpapers + bolhas, e boot/login Aero; (4) importa as duas folhas no `main.tsx`; (5) muda `TEMA_PADRAO.pele` para `'aero'`. As peles coexistem: trocar `body[data-skin]` re-peliza tudo sem remontar.

**Tech Stack:** CSS puro (custom properties, `oklch()`, `color-mix()`, `backdrop-filter`, gradientes), React 18 (uma camada decorativa de bolhas), Vitest + RTL (jsdom — CSS não é testado por computação; o gate automático é `vite build` + suíte verde + `tsc`). pt-BR.

**Builds on Fase 2:** todo o encanamento de tweaks já existe e escreve os atributos/vars. Esta fase é **quase pura CSS**: consome o que a Fase 2 já produz. A única mudança de TS é o flip do padrão (`tipos.ts`) + a camada de bolhas (JSX decorativo em `AreaTrabalho.tsx`) + ajustes de asserção de testes que fixavam a pele padrão "98".

---

### Decisões desta fase

- **Coexistência por `[data-skin]`.** `base.css` continua sendo o 98 "neutro"; `pele-98.css` só adiciona o que é específico/tweakável (padrões, CRT). `pele-aero.css` sobrescreve via maior especificidade (`body[data-skin="aero"] .classe`).
- **`--round` e `--accent` são do runtime.** `aplicarTema` escreve `--round*` (tweak de cantos) e, no 98, `--accent` (chip). `pele-aero.css` define `--accent` via `oklch(... var(--accent-h))` porque, na pele Aero, `aplicarTema` faz `removeProperty('--accent')` e escreve só `--accent-h`. Ou seja: **não** redefinir `--round*` nas folhas de pele (deixar o runtime mandar).
- **Hardcodes migram para tokens com default 98 idêntico** ao atual — a pele 98 não muda de aparência na Task 1 (migração); ganha padrões/CRT na Task 2.
- **Padrão vira Aero** (`TEMA_PADRAO.pele = 'aero'`) — a decisão travada "máquina nova → Aero", adiada pela Fase 0 até a folha Aero existir. Testes que fixavam "98" como padrão são atualizados.
- **Bolhas** = camada decorativa CSS (`<div class="camada-bolhas">` com 6 `<span class="bolha">`), `aria-hidden`, visível só na pele Aero (`display:none` fora dela). Sem JS de física — animação por `@keyframes`.
- **Apps internos (grade/consulta/busca/relacionamentos/terminal) NÃO entram aqui** — são da Fase 4. Esta fase é só o **shell**.

### File structure for this plan

**`apps/web/src/tema`**
- Modify `tokens.css` — novos tokens abstratos (defaults 98).
- Create `pele-98.css` — padrões de área + CRT.
- Create `pele-aero.css` — pele Aero completa do shell.
- Modify `tipos.ts` — `TEMA_PADRAO.pele = 'aero'`.
- Modify (test) `ProvedorTema.test.tsx`, `tweaks.test.ts`, `PainelTweaks.test.tsx` — pele padrão.

**`apps/web/src`**
- Modify `main.tsx` — importa as duas folhas de pele.

**`apps/web/src/areaTrabalho`**
- Modify `areaTrabalho.css` — hardcodes → tokens; remove `.title-bar.inactive` hardcode? (mantém; pele-aero sobrescreve).
- Modify `AreaTrabalho.tsx` — camada de bolhas.

**`apps/web/src`**
- Modify `TelaBoot.css` — hardcodes → tokens.

**`apps/web/src/autenticacao`**
- Modify `telaLogin.css` — hardcode → token.

---

### Task 1: Tokens abstratos + migração dos hardcodes do shell

**Files:**
- Modify: `apps/web/src/tema/tokens.css`
- Modify: `apps/web/src/areaTrabalho/areaTrabalho.css`, `apps/web/src/TelaBoot.css`, `apps/web/src/autenticacao/telaLogin.css`

- [ ] **Step 1: Estender `apps/web/src/tema/tokens.css`**

Acrescentar, **antes do fechamento do `:root`** (depois de `--motion: 1;`), o bloco:

```css
  /* === Fase 3: tokens abstratos de pele (defaults = 98) === */
  --wallpaper-bg: #008080;        /* fundo da área de trabalho / logon */
  --barra-bg: var(--face);        /* fundo da barra de tarefas */
  --barra-borda-topo: var(--hi);
  --glass-blur: 0px;              /* só a pele Aero usa > 0 */
  --crt: 0;                       /* opacidade das scanlines (pele 98) */
  --accent-h: 210;               /* matiz do acento — só a pele Aero usa */
  --accent-d: var(--accent);      /* acento escuro (Aero redefine via oklch) */

  /* boot (defaults atuais; as peles sobrescrevem) */
  --boot-bg: #000000;
  --boot-marca: #00a4a4;
  --boot-marca-sombra: #004f4f;
  --boot-sub: #c0c0c0;
  --boot-barra-borda: #808080;
  --boot-barra-bg: #1a1a1a;
  --boot-progresso-1: #00a4a4;
  --boot-progresso-2: #007a7a;
  --boot-msg: #9a9a9a;
```

- [ ] **Step 2: Migrar `apps/web/src/areaTrabalho/areaTrabalho.css` para tokens**

Aplicar exatamente estas trocas (ler o arquivo e substituir cada literal):

1. `.area-trabalho` — `background: #008080; /* teal clássico do Win9x */` → `background: var(--wallpaper-bg);`
2. `.barra-tarefas` — `background: #c0c0c0;` → `background: var(--barra-bg);` **e** `border-top: 2px solid #fff;` → `border-top: 2px solid var(--barra-borda-topo);`
3. `.menu-iniciar` — `background: #c0c0c0;` → `background: var(--face);`
4. `.menu-iniciar-faixa` — `background: linear-gradient(0deg, #808080, #000080);` → `background: linear-gradient(0deg, var(--sh), var(--accent));`
5. `.menu-iniciar-itens > li > button:hover:not(:disabled)` — `background: #000080;` → `background: var(--accent);` **e** `color: #fff;` → `color: var(--accent-ink);`
6. `.menu-contexto` — `background: #c0c0c0;` → `background: var(--face);`
7. `.menu-contexto button:hover` — `background: #000080;` → `background: var(--accent);` **e** `color: #fff;` → `color: var(--accent-ink);`

(Deixar `.title-bar.inactive`, `.botao-janela.ativo`, `.relogio`, `.rotulo-banco`, atalhos e diálogos como estão — `pele-aero.css` sobrescreve o que precisa.)

- [ ] **Step 3: Migrar `apps/web/src/TelaBoot.css` para tokens**

Trocar:
- `.tela-boot` — `background: #000;` → `background: var(--boot-bg);` ; `color: #fff;` → `color: var(--titulo-ink, #fff);`
- `.boot-marca` — `color: #00a4a4;` → `color: var(--boot-marca);` ; `text-shadow: 2px 2px #004f4f;` → `text-shadow: 2px 2px var(--boot-marca-sombra);`
- `.boot-sub` — `color: #c0c0c0;` → `color: var(--boot-sub);`
- `.boot-barra` — `border: 2px solid #808080;` → `border: 2px solid var(--boot-barra-borda);` ; `background: #1a1a1a;` → `background: var(--boot-barra-bg);`
- `.boot-progresso` — `background: repeating-linear-gradient(90deg, #00a4a4 0 10px, #007a7a 10px 14px);` → `background: repeating-linear-gradient(90deg, var(--boot-progresso-1) 0 10px, var(--boot-progresso-2) 10px 14px);`
- `.boot-msg` — `color: #9a9a9a;` → `color: var(--boot-msg);`

- [ ] **Step 4: Migrar `apps/web/src/autenticacao/telaLogin.css`**

`.tela-logon` — `background: #008080;` → `background: var(--wallpaper-bg);`

- [ ] **Step 5: Build + suíte (sem regressão visual no 98)**

Run: `cd apps/web; bunx vite build; bunx vitest run`
Expected: build conclui (CSS válido); todos os testes verdes. O padrão ainda é "98", então os tokens caem nos defaults idênticos aos hardcodes — nenhuma mudança de aparência.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/tema/tokens.css apps/web/src/areaTrabalho/areaTrabalho.css apps/web/src/TelaBoot.css apps/web/src/autenticacao/telaLogin.css
git commit -m "refactor(tema): hardcodes do shell migram para tokens de pele"
```

---

### Task 2: `pele-98.css` (padrões de área + CRT)

**Files:**
- Create: `apps/web/src/tema/pele-98.css`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Criar `apps/web/src/tema/pele-98.css`**

```css
/* ============================================================
   DBOS // tema — pele-98.css
   Pele Windows 98 (autêntica). base.css já reproduz o 98 neutro;
   aqui só o que é específico desta pele e tweakável:
   padrões de área de trabalho (data-pat) e scanlines CRT (--crt).
   Escopo: body[data-skin="98"].
   ============================================================ */

/* padrão da área de trabalho — pontilhado (dither) é o default */
body[data-skin="98"] .area-trabalho::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.9;
  z-index: 0;
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    radial-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px);
  background-size: 4px 4px, 4px 4px;
  background-position: 0 0, 2px 2px;
}
body[data-skin="98"][data-pat="solid"] .area-trabalho::before {
  display: none;
}
body[data-skin="98"][data-pat="brand"] .area-trabalho::before {
  opacity: 0.5;
  background-image:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0 2px, transparent 2px 16px),
    repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.05) 0 2px, transparent 2px 16px);
  background-size: auto;
  background-position: 0 0;
}
body[data-skin="98"][data-pat="grid"] .area-trabalho::before {
  opacity: 0.35;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 22px 22px;
  background-position: 0 0;
}

/* scanlines CRT — opacidade dirigida por --crt (tweak) */
body[data-skin="98"] .area-trabalho::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: var(--crt, 0);
  background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.28) 0 1px, transparent 1px 3px);
  mix-blend-mode: multiply;
}
```

- [ ] **Step 2: Importar no `apps/web/src/main.tsx`**

Após `import './tema/base.css';`, acrescentar:

```ts
import './tema/pele-98.css';
import './tema/pele-aero.css';
```

> `pele-aero.css` é criado na Task 3. Para o build do Step 3 desta task passar, crie um `pele-aero.css` **vazio** agora (a Task 3 o preenche), ou implemente a Task 3 antes de rodar. Recomendado: crie o arquivo vazio agora:
> `apps/web/src/tema/pele-aero.css` com um comentário placeholder de uma linha.

- [ ] **Step 3: Criar placeholder `apps/web/src/tema/pele-aero.css`**

```css
/* pele-aero.css — preenchido na Task 3 desta fase. */
```

- [ ] **Step 4: Build + suíte**

Run: `cd apps/web; bunx vite build; bunx vitest run`
Expected: build OK; testes verdes. (Padrão ainda 98; agora o desktop 98 mostra o pontilhado.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/tema/pele-98.css apps/web/src/tema/pele-aero.css apps/web/src/main.tsx
git commit -m "feat(tema): pele-98 (padrões de área + scanlines CRT) e import das peles"
```

---

### Task 3: `pele-aero.css` — tokens + janela + título + controles

**Files:**
- Modify: `apps/web/src/tema/pele-aero.css`

- [ ] **Step 1: Substituir o placeholder por `apps/web/src/tema/pele-aero.css`**

```css
/* ============================================================
   DBOS // tema — pele-aero.css
   Pele Frutiger-Aero: prata fria, vidro, brilho, acento OKLCH.
   Escopo: body[data-skin="aero"]. Portado de aeroIdea.
   NÃO redefine --round* nem --accent fora destes tokens:
   --round* vem do runtime (tweak de cantos); --accent é oklch
   abaixo (o runtime faz removeProperty('--accent') na pele Aero).
   ============================================================ */

body[data-skin="aero"] {
  --ink: #122231;
  --ink-suave: #3a4d5e;

  /* prata fria (substitui o #c0c0c0 chapado) */
  --face: #dde6ef;
  --face-alta: #f3f7fb;
  --face-baixa: #c2cedb;

  /* acento aqua via matiz (aplicarTema escreve --accent-h inline) */
  --accent: oklch(0.72 0.16 var(--accent-h, 200));
  --accent-d: oklch(0.55 0.17 var(--accent-h, 200));
  --accent-ink: #ffffff;

  /* barra de título glossy */
  --titulo-1: oklch(0.78 0.12 var(--accent-h, 200));
  --titulo-2: oklch(0.62 0.16 var(--accent-h, 200));
  --titulo-ink: #ffffff;

  --ui: Tahoma, "Segoe UI", Geneva, Verdana, sans-serif;
}

/* JANELA — chrome prata, cantos, sombra suave, moldura de vidro */
body[data-skin="aero"] .window {
  background: linear-gradient(180deg, #f3f7fb, #dde6ef 12%, #c2cedb);
  border: 1px solid #5d6b7a;
  box-shadow: 0 14px 40px -8px rgba(12, 28, 44, 0.55), 0 3px 10px rgba(12, 28, 44, 0.3);
  outline: 1px solid rgba(255, 255, 255, 0.7);
  outline-offset: -2px;
}

/* BARRA DE TÍTULO — gradiente aqua de 3 paradas + brilho superior */
body[data-skin="aero"] .title-bar {
  position: relative;
  overflow: hidden;
  border-radius: calc(var(--round) - 2px) calc(var(--round) - 2px) 3px 3px;
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--titulo-1), white 18%) 0%,
    var(--titulo-1) 8%,
    var(--titulo-2) 52%,
    oklch(0.5 0.16 var(--accent-h, 200)) 100%
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), inset 0 -1px 0 rgba(0, 0, 0, 0.18);
}
body[data-skin="aero"] .title-bar::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0));
  pointer-events: none;
}
body[data-skin="aero"] .title-bar-text {
  position: relative; /* acima do brilho ::after */
}
body[data-skin="aero"] .title-bar.inactive {
  background: linear-gradient(180deg, #eef2f6, #cdd7e1 50%, #b7c3ce);
  color: #5c6b78;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}
/* glifos dos controles ficam pretos por base.css; no Aero use tinta suave */
body[data-skin="aero"] .title-bar-controls button {
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--round-sm);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

/* BOTÕES + CAMPOS — vidro suave */
body[data-skin="aero"] button,
body[data-skin="aero"] input[type="reset"],
body[data-skin="aero"] input[type="submit"] {
  background: linear-gradient(180deg, #ffffff, #e6eef6 60%, #d3deea);
  border: 1px solid #9aa9b8;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 1px 2px rgba(20, 50, 80, 0.18);
  color: var(--ink);
}
body[data-skin="aero"] button:not(:disabled):active,
body[data-skin="aero"] input[type="reset"]:not(:disabled):active,
body[data-skin="aero"] input[type="submit"]:not(:disabled):active {
  background: linear-gradient(180deg, #d3deea, #e6eef6);
  box-shadow: inset 0 1px 3px rgba(20, 50, 80, 0.3);
  padding: 0 12px;
}
body[data-skin="aero"] input[type="text"],
body[data-skin="aero"] input[type="password"],
body[data-skin="aero"] input[type="number"],
body[data-skin="aero"] input:not([type]),
body[data-skin="aero"] textarea,
body[data-skin="aero"] select {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #9aa9b8;
  box-shadow: inset 0 1px 2px rgba(20, 50, 80, 0.18);
  border-radius: var(--round-sm);
}
```

- [ ] **Step 2: Build (CSS válido)**

Run: `cd apps/web; bunx vite build`
Expected: build conclui sem erro de CSS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/tema/pele-aero.css
git commit -m "feat(tema): pele-aero — chrome prata, título glossy e controles de vidro"
```

---

### Task 4: `pele-aero.css` — área/wallpapers/bolhas + barra/Iniciar/menus de vidro

**Files:**
- Modify: `apps/web/src/tema/pele-aero.css` (append)
- Modify: `apps/web/src/areaTrabalho/AreaTrabalho.tsx` (camada de bolhas)

- [ ] **Step 1: Acrescentar ao fim de `apps/web/src/tema/pele-aero.css`**

```css

/* ÁREA DE TRABALHO — wallpaper Aqua (default) e variantes (data-wp) */
body[data-skin="aero"] .area-trabalho {
  background:
    radial-gradient(120% 90% at 50% -10%, #bfeaff 0%, transparent 55%),
    radial-gradient(80% 70% at 78% 8%, #e9fbff 0%, transparent 40%),
    linear-gradient(180deg, #7fc4f2 0%, #4f9fe0 38%, #2f7fc7 64%, #1f6fb6 100%);
}
body[data-skin="aero"][data-wp="sunset"] .area-trabalho {
  background:
    radial-gradient(120% 90% at 50% -10%, #ffe1b0 0%, transparent 55%),
    radial-gradient(80% 70% at 78% 12%, #fff3d6 0%, transparent 42%),
    linear-gradient(180deg, #ffb16b 0%, #f4824f 36%, #d9577a 66%, #7d3f8e 100%);
}
body[data-skin="aero"][data-wp="verde"] .area-trabalho {
  background:
    radial-gradient(120% 90% at 50% -10%, #e6ffd6 0%, transparent 55%),
    linear-gradient(180deg, #aee36b 0%, #6dbf4e 38%, #3f9e6a 66%, #2f7f86 100%);
}
body[data-skin="aero"][data-wp="noite"] .area-trabalho {
  background:
    radial-gradient(110% 80% at 50% -10%, #2a4a7a 0%, transparent 55%),
    radial-gradient(60% 50% at 80% 16%, #3a6aa8 0%, transparent 45%),
    linear-gradient(180deg, #1a2c4e 0%, #0d1c36 50%, #070f1f 100%);
}
body[data-skin="aero"] .icone-atalho-rotulo {
  text-shadow: 0 1px 3px rgba(0, 20, 40, 0.6);
}

/* BOLHAS — camada decorativa (só Aero) */
.camada-bolhas {
  display: none;
}
body[data-skin="aero"] .camada-bolhas {
  display: block;
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}
body[data-skin="aero"] .bolha {
  position: absolute;
  border-radius: 50%;
  background:
    radial-gradient(40% 35% at 32% 28%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0) 60%),
    radial-gradient(120% 120% at 70% 75%, rgba(120, 200, 255, 0.35), rgba(255, 255, 255, 0.06));
  box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.5), 0 2px 10px rgba(20, 60, 90, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.4);
  animation: bolha-flutua calc(18s / var(--motion, 1)) ease-in-out infinite;
}
body[data-skin="aero"] .bolha-1 { width: 90px; height: 90px; left: 12%; top: 60%; animation-delay: 0s; }
body[data-skin="aero"] .bolha-2 { width: 54px; height: 54px; left: 28%; top: 30%; animation-delay: -3s; }
body[data-skin="aero"] .bolha-3 { width: 120px; height: 120px; left: 62%; top: 55%; animation-delay: -6s; }
body[data-skin="aero"] .bolha-4 { width: 40px; height: 40px; left: 78%; top: 25%; animation-delay: -2s; }
body[data-skin="aero"] .bolha-5 { width: 70px; height: 70px; left: 45%; top: 72%; animation-delay: -8s; }
body[data-skin="aero"] .bolha-6 { width: 30px; height: 30px; left: 88%; top: 62%; animation-delay: -5s; }
@keyframes bolha-flutua {
  0%, 100% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(-22px) translateX(10px); }
}

/* BARRA DE TAREFAS — vidro */
body[data-skin="aero"] .barra-tarefas {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(214, 230, 245, 0.32) 22%, rgba(60, 120, 180, 0.28) 100%),
    rgba(238, 246, 252, 0.62);
  -webkit-backdrop-filter: blur(var(--glass-blur, 14px)) saturate(1.3);
  backdrop-filter: blur(var(--glass-blur, 14px)) saturate(1.3);
  border-top: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 -2px 12px rgba(10, 30, 50, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
/* botão Iniciar — pílula aqua glossy */
body[data-skin="aero"] .botao-iniciar {
  border: 1px solid var(--accent-d);
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--accent), white 42%) 0%,
    var(--accent) 46%,
    var(--accent-d) 54%,
    var(--accent-d) 100%
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), inset 0 -3px 6px rgba(0, 30, 60, 0.35), 0 2px 6px rgba(10, 40, 70, 0.35);
  text-shadow: 0 1px 1px rgba(0, 30, 60, 0.5);
}
/* botões de tarefa */
body[data-skin="aero"] .botao-janela {
  border: 1px solid #9aa9b8;
  border-radius: var(--round-btn);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(220, 232, 244, 0.5));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
body[data-skin="aero"] .botao-janela.ativo {
  border-color: var(--accent-d);
  color: #fff;
  background: linear-gradient(180deg, color-mix(in oklab, var(--accent), white 30%), var(--accent) 55%, var(--accent-d));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -2px 5px rgba(0, 30, 60, 0.3);
}
body[data-skin="aero"] .relogio {
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: var(--round-sm);
  background: rgba(255, 255, 255, 0.18);
  box-shadow: none;
  color: var(--ink);
}
body[data-skin="aero"] .bandeja-engrenagem {
  background: transparent;
  border: none;
  box-shadow: none;
  min-width: 0;
  min-height: 0;
  padding: 0;
}

/* MENU INICIAR — vidro */
body[data-skin="aero"] .menu-iniciar {
  background: rgba(238, 246, 252, 0.72);
  -webkit-backdrop-filter: blur(var(--glass-blur, 14px)) saturate(1.2);
  backdrop-filter: blur(var(--glass-blur, 14px)) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: var(--round);
  box-shadow: 0 14px 40px -8px rgba(12, 28, 44, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
body[data-skin="aero"] .menu-iniciar-faixa {
  background: linear-gradient(180deg, var(--titulo-1), oklch(0.5 0.16 var(--accent-h, 200)));
}
body[data-skin="aero"] .menu-iniciar-itens > li > button:hover:not(:disabled) {
  background: linear-gradient(180deg, color-mix(in oklab, var(--accent), white 22%), var(--accent));
  color: #fff;
  border-radius: var(--round-sm);
}

/* MENU DE CONTEXTO + DIÁLOGOS — vidro */
body[data-skin="aero"] .menu-contexto {
  background: rgba(238, 246, 252, 0.72);
  -webkit-backdrop-filter: blur(var(--glass-blur, 14px));
  backdrop-filter: blur(var(--glass-blur, 14px));
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: var(--round);
  box-shadow: 0 14px 40px -8px rgba(12, 28, 44, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
body[data-skin="aero"] .menu-contexto button:hover {
  background: linear-gradient(180deg, color-mix(in oklab, var(--accent), white 22%), var(--accent));
  color: #fff;
  border-radius: var(--round-sm);
}
```

- [ ] **Step 2: Camada de bolhas em `apps/web/src/areaTrabalho/AreaTrabalho.tsx`**

Logo no início do JSX retornado, como **primeiro filho** de `<div className="area-trabalho" ...>` (antes de `<div className="icones-area">`), inserir:

```tsx
<div className="camada-bolhas" aria-hidden="true">
  {Array.from({ length: 6 }, (_, i) => (
    <span key={i} className={`bolha bolha-${i + 1}`} />
  ))}
</div>
```

- [ ] **Step 3: Build + suíte + tsc**

Run: `cd apps/web; bunx vite build; bunx vitest run; bunx tsc --noEmit`
Expected: build OK; testes verdes (a camada de bolhas é `aria-hidden` decorativa — não deve quebrar asserções existentes; se algum teste de `AreaTrabalho` contar filhos diretos, ajustar para consultar por papel/texto); tsc limpo.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/tema/pele-aero.css apps/web/src/areaTrabalho/AreaTrabalho.tsx
git commit -m "feat(tema): pele-aero — wallpapers, bolhas e shell de vidro (barra, Iniciar, menus)"
```

---

### Task 5: `pele-aero.css` boot/login + virar o padrão para Aero

**Files:**
- Modify: `apps/web/src/tema/pele-aero.css` (append)
- Modify: `apps/web/src/tema/tipos.ts`
- Modify (test): `apps/web/src/tema/ProvedorTema.test.tsx`, `apps/web/src/tema/tweaks.test.ts`, `apps/web/src/tema/PainelTweaks.test.tsx`

- [ ] **Step 1: Acrescentar boot/login Aero ao fim de `apps/web/src/tema/pele-aero.css`**

```css

/* BOOT — Aero (fundo navy, marca com brilho aqua) */
body[data-skin="aero"] .tela-boot {
  background: #06121c;
  color: #cfeaff;
}
body[data-skin="aero"] .boot-marca {
  color: #ffffff;
  text-shadow: 0 0 18px oklch(0.75 0.18 var(--accent-h, 200) / 0.55), 0 3px 0 var(--accent-d);
}
body[data-skin="aero"] .boot-sub {
  color: #8fb6d4;
}
body[data-skin="aero"] .boot-barra {
  border: 1px solid #2a4a63;
  border-radius: 4px;
  background: #0a1c2a;
}
body[data-skin="aero"] .boot-progresso {
  background: linear-gradient(90deg, var(--accent-d), var(--accent), #7ec94a);
  box-shadow: 0 0 10px oklch(0.75 0.18 var(--accent-h, 200) / 0.55);
}
body[data-skin="aero"] .boot-msg {
  color: #5e89a6;
}

/* LOGIN — Aero (véu aqua radial) */
body[data-skin="aero"] .tela-logon {
  background: radial-gradient(120% 90% at 50% 0%, #2f7fc7, #0d2740);
}
```

- [ ] **Step 2: Virar o padrão para Aero em `apps/web/src/tema/tipos.ts`**

Trocar, em `TEMA_PADRAO`, `pele: '98',` por `pele: 'aero',` e atualizar o comentário acima de `TEMA_PADRAO` para:

```ts
// Fase 3: padrão "aero" em máquina nova (decisão travada). A última pele
// escolhida é restaurada do localStorage; só cai aqui sem persistência.
```

- [ ] **Step 3: Atualizar os testes que fixavam o padrão "98"**

Em `apps/web/src/tema/ProvedorTema.test.tsx`:
- O teste `'aplica a pele padrão "98" no body em máquina nova'` → renomear para `'aplica a pele padrão "aero" no body em máquina nova'` e trocar as asserções: `expect(document.body.dataset.skin).toBe('aero');` e `expect(screen.getByText(/pele:/)).toHaveTextContent('pele:aero');`.
- No teste `'definir98 atualiza a var de acento e persiste'`: a pele padrão agora é Aero, e na pele Aero `aplicarTema` faz `removeProperty('--accent')`. Para manter o teste válido, **forçar a pele 98 antes** de clicar em "acento98": no corpo do teste, antes do `act` que clica em `acento98`, adicione `localStorage.setItem` não — em vez disso, mude a Sonda para também trocar a pele, **ou** simplifique: troque este teste para semear `localStorage` com `{ ...TEMA_PADRAO, pele: '98' }` e remontar. Implementação concreta: substitua o corpo do teste por:

```tsx
test('definir98 atualiza a var de acento e persiste (na pele 98)', () => {
  localStorage.setItem(CHAVE_TEMA, JSON.stringify({ ...TEMA_PADRAO, pele: '98' }));
  render(<ProvedorTema><Sonda /></ProvedorTema>);
  act(() => { screen.getByText('acento98').click(); });
  expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#b0228c');
  expect(JSON.parse(localStorage.getItem(CHAVE_TEMA)!).n98.accent).toBe('#b0228c');
});
```

- No teste `'cai no padrão quando o localStorage tem lixo'`: trocar `expect(document.body.dataset.skin).toBe('98');` por `toBe('aero');`.

Em `apps/web/src/tema/tweaks.test.ts`:
- O teste `'lerEstadoInicial cai no padrão com lixo'` usa `toEqual(TEMA_PADRAO)` — continua válido (segue o novo padrão). Sem mudança.
- O teste `'lerEstadoInicial faz merge por chave com dados antigos'` semeia `{ pele: 'aero' }` — segue válido.
- Se algum teste de `aplicarTema` assumir 98 implícito, ele passa `tema({...})` explícito — sem mudança.

Em `apps/web/src/tema/PainelTweaks.test.tsx`:
- Para deixar os testes de controles determinísticos (independente do padrão), no `beforeEach`, **após** `localStorage.clear()`, semear a pele 98: `localStorage.setItem(CHAVE_TEMA, JSON.stringify({ ...TEMA_PADRAO, pele: '98' }));` e importar `TEMA_PADRAO`/`CHAVE_TEMA` de `./tipos`. Assim o teste `'na pele 98 mostra controles de 98'` parte do 98; o teste `'trocar a pele para Aero revela os controles de Aero'` segue clicando em "Aero". (O teste `'não renderiza quando fechado'` desliga `aberto` e não depende da pele.)

- [ ] **Step 4: Suíte + tsc + build**

Run: `cd apps/web; bunx vitest run; bunx tsc --noEmit; bunx vite build`
Expected: tudo verde; tsc limpo; build OK. Se algum outro teste falhar por assumir `data-skin="98"` implícito, ajuste-o para semear a pele desejada (mesmo padrão acima).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/tema/pele-aero.css apps/web/src/tema/tipos.ts apps/web/src/tema/ProvedorTema.test.tsx apps/web/src/tema/tweaks.test.ts apps/web/src/tema/PainelTweaks.test.tsx
git commit -m "feat(tema): pele-aero boot/login e padrão Aero em máquina nova"
```

---

### Task 6: Verificação final da fase

- [ ] **Step 1: Suíte inteira verde**

Run: `cd apps/web; bunx vitest run`
Expected: todos os testes passam.

- [ ] **Step 2: `tsc` + build**

Run: `cd apps/web; bunx tsc --noEmit; bunx vite build`
Expected: tsc limpo; build conclui.

- [ ] **Step 3: Conferência visual (manual, pós-execução)**

`bun run dev:web`. Em **máquina nova** (limpar localStorage), confirmar que abre em **Aero**: boot navy com marca em brilho aqua; login com véu aqua; desktop com wallpaper Aqua + bolhas flutuando; janelas com chrome prata, título glossy e cantos arredondados; barra de tarefas e menus de vidro (`backdrop-filter`); botão Iniciar pílula aqua. Pelo PainelTweaks, trocar matiz/wallpaper/vidro/cantos e ver efeito ao vivo. Trocar para **98**: face chapada `#c0c0c0`, relevos retos, padrão pontilhado, CRT ligável, acento em chip. Trocar `data-pat`/`--crt` e ver efeito. Registrar pendência humana.

---

### Self-review (preenchido)

**1. Cobertura do spec (Fase 3 = pele do shell, duas peles):** tokens abstratos + migração (Task 1) ✓; pele-98 com padrões/CRT (Task 2) ✓; pele-aero chrome/título/controles (Task 3) ✓; wallpapers + bolhas + barra/Iniciar/menus de vidro (Task 4) ✓; boot/login Aero + padrão Aero (Task 5) ✓; verificação (Task 6) ✓. Boot/login/desktop/taskbar/Iniciar/diálogos cobertos nas duas peles. Apps internos ficam para a Fase 4 (decisão registrada).

**2. Sem placeholders:** as duas folhas de pele são dadas verbatim; as migrações são pares literais exatos; os ajustes de teste têm o código final.

**3. Consistência de tipos/nomes:** tokens novos (`--wallpaper-bg`, `--barra-bg`, `--barra-borda-topo`, `--glass-blur`, `--crt`, `--accent-h`, `--accent-d`, `--boot-*`) usados igualmente entre `tokens.css`, `areaTrabalho.css`, `TelaBoot.css`, `telaLogin.css`, `pele-98.css`, `pele-aero.css`. Atributos `data-skin`/`data-wp`/`data-pat` e var `--round*`/`--accent`/`--motion` consumidos exatamente como `aplicarTema` (Fase 2) os escreve. Classe `.camada-bolhas`/`.bolha-N` casada entre `AreaTrabalho.tsx` e `pele-aero.css`. `TEMA_PADRAO.pele = 'aero'` refletido nos testes. ✓
</content>
</invoke>
