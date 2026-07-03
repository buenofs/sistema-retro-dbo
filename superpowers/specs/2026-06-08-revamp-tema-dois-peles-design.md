# DBOS — Revamp Visual: Tema único, duas peles (Aero + 98) — Design Spec

**Date:** 2026-06-08
**Status:** Approved (pending final user review of this document)

## 1. Overview

Dois protótipos de revamp visual (`C:\dev\dbos-design-revamp\aeroIdea` e
`9xIdea`) exploram, sobre **as mesmas classes de componente** do app real, duas
personalidades: **Aero** (Frutiger-Aero — vidro, brilho, gradientes, matiz
OKLCH) e **9X** (Win98 autêntico, porém ousado — relevos chapados, CRT,
dithering, densidade). Esta reforma **soma o valor das duas** e aplica ao sistema
real (`sistema-retro-dbo`): um **tema único com duas peles trocáveis em tempo de
execução**, um **motor de ícones pixelados**, um **painel de Tweaks** (theming ao
vivo) e **upgrades de visualização** nos apps já existentes, mais um app novo de
relatório.

O app real hoje é um monorepo TS/React/Vite (bun) totalmente testado, sobre
`98.css`, com shell de desktop e apps reais ligados a um backend SQL Server vivo.
Os protótipos são estudos visuais com dados mockados; aqui aproveitamos a
**implementação** deles (CSS de tokens, motor de ícones, painel de tweaks) e
aplicamos aos componentes reais, **sem reescrever a lógica testada**.

> **Supersede:** a restrição estética de specs anteriores ("Win98 autêntico via
> 98.css — sem glassmorphism/cards modernos") é **substituída** por este
> documento. A pele **98** preserva integralmente aquela estética; a pele
> **Aero** adiciona o visual de vidro como alternativa trocável. A dependência
> `98.css` é **removida** (seus relevos viram tokens próprios).

> **Nota (2026-06-13):** o domínio RH mencionado neste documento (Relacionamentos,
> Busca, Relatório/Folha) foi removido no pivô para o simulador de SO de arquivos —
> ver `docs/superpowers/specs/2026-06-13-so-arquivos-design.md`. As seções sobre
> motor de tema, ícones e painel de Tweaks permanecem válidas.

### Decisões travadas (do brainstorming)

| Área | Decisão |
|------|---------|
| Direção | **A — um tema, duas peles** (Aero ⇄ 98, trocáveis ao vivo) |
| Escopo | **Os quatro baldes**: motor de tema (2 peles), motor de ícones, painel de Tweaks, upgrades de visualização |
| Pele padrão | **Lembrar a última**; em máquina nova → **Aero** |
| Implementação | **Abordagem 1**: camada de tokens própria + atributo `data-skin`; remove `98.css`; componentes mantêm estrutura e testes |
| Rollout | **Incremental**, por fases; `bun test` verde e app rodável ao fim de cada fase |
| Relatório (Folha) | **Em escopo** como build novo (fase com backend) |

### Convenções (mantidas das fases anteriores)

- Identificadores em **pt-BR**; inglês só onde inevitável (APIs de libs, termos
  de protocolo, superfície "DOS/retrô").
- TypeScript estrito (`noUncheckedIndexedAccess`); `tsc --noEmit` limpo é gate.
- Caminho de dados existente (Fastify + `requisitar<T>` + TanStack Query +
  diálogos retrô) é **inalterado**; esta reforma é majoritariamente de
  apresentação.

## 2. Arquitetura — módulo `tema/`

Novo módulo passa a ser a espinha de estilo; `98.css` sai do `main.tsx`.

```
apps/web/src/tema/
  base.css            # classes compartilhadas em tokens:
                      #   .win .titlebar .win-body .btn input .menubar .toolbar
                      #   .statusbar .menu-pop .tree .dtable .code-wrap .term ...
  tokens.css          # :root — tokens de design (geometria, fontes, motion, slots de acento)
  pele-aero.css       # [data-skin="aero"]  vidro, brilho, matiz OKLCH, wallpapers, bolhas
  pele-98.css         # [data-skin="98"]    relevos, dithering, CRT, densidade
  ProvedorTema.tsx    # contexto na raiz: escreve vars CSS + body[data-*], persiste
  ganchos.ts          # useTema() / useTweaks()
  tweaks.ts           # definições de tweak: chaves, faixas, padrões, dono por pele
  PainelTweaks.tsx    # painel flutuante de theming ao vivo
  PainelTweaks.css
  icones/
    motor.ts          # motor de ícones pixelados portado (paleta + bitmaps + canvas + cache)
    Icone.tsx         # <Icone nome="grid" tamanho={16} gloss alt="Grade" />
    motor.test.ts     # integridade da tabela de ícones
```

### Fluxo de dados

`<ProvedorTema>` envolve `<App>` em `main.tsx` (no lugar de `import '98.css'`).
Detém o estado dos tweaks; a cada mudança escreve em `document.body`:

- `dataset.skin` = `"aero"` | `"98"` — **a chave-mestra**. As duas folhas de pele
  ficam sempre carregadas; o atributo decide qual bloco de tokens + overrides
  vence. Trocar re-peliza o desktop inteiro sem remontar nada.
- Atributos por pele: `data-wp` (wallpaper Aero) / `data-pat` (padrão 98); vars
  `--accent-h` / `--accent`, `--round*`, `--glass-blur`, `--crt`, `--motion`; e
  `body.style.fontSize` (densidade 98).

### Persistência

Uma chave de localStorage `dbos_tema`:

```jsonc
{ "skin": "aero",
  "aero": { "accentHue": 200, "glass": true, "corners": "aero", "wallpaper": "aqua" },
  "n98":  { "accent": "#1084d0", "pattern": "dither", "density": "normal", "crt": false },
  "motion": true, "sound": true }
```

Carga nova → padrões (`skin: "aero"`); senão restaura a última. Valores
ausentes/inválidos caem no padrão **por chave**. O acento é mantido
**independente por pele** (Aero usa matiz OKLCH; 98 usa hex de paleta). O
protocolo `postMessage`/"edit-mode host" dos protótipos é **descartado**.

### Componentes não mudam de estrutura

Como os dois protótipos provam que as mesmas classes funcionam sob as duas peles,
os componentes existentes (`Janela`, `BarraTarefas`, `ExploradorObjetos`, etc.)
mantêm JSX e testes. Cada CSS de app migra para consumir tokens/classes
compartilhadas na sua fase, e afordâncias de texto/emoji viram `<Icone>`.

## 3. Motor de tema (tokens + duas peles)

`base.css` nunca fixa cor ou raio — lê tokens abstratos. Uma pele é um conjunto de
valores de token + alguns overrides pontuais.

| Token abstrato | Aero define… | 98 define… |
|---|---|---|
| `--superficie / -alta / -baixa` | gradientes de prata fria (`#f3f7fb…`) | face chapada `#c0c0c0` |
| `--round / -sm / -btn` | `7/4/6px` | `0` |
| `--relevo-out / -in` | realce/sombra suave de 1px | relevos `inset` autênticos de 4 camadas |
| `--accent` (+`-d/-l/-glow`) | `oklch(... var(--accent-h))` | `color-mix` sobre o hex `--accent` |
| `--titulo-1/2/3` | gradiente aqua brilhante | gradiente navy→acento |
| `--ui / --pixel / --mono / --crt-font` | pilha Tahoma/Segoe | pilha MS Sans |
| `--shadow-win`, `--motion` | sombra grande e suave | 1px duro |

Onde as peles divergem de fato (fundo da titlebar, preenchimento de botão,
borda-vs-relevo, brilho do terminal), a folha da pele carrega um override
escopado — ex.: `[data-skin="aero"] .titlebar{…brilho…}` vs
`[data-skin="98"] .titlebar{…gradiente…}`. O resto (layout, dimensões — ~90%
idêntico) vive uma única vez em `base.css`. É um **port** da divisão que os
protótipos já fazem, não uma invenção.

### Conjunto unificado de tweaks

O painel mostra os controles relevantes à pele ativa.

- **Compartilhados:** Pele (Aero ⇄ 98), Animações, Som, Reiniciar sessão.
- **Só Aero:** matiz do acento (slider 150–320°), vidro fosco on/off, cantos
  (Aero / reto-98), wallpaper (Aqua / Pôr do sol / Verde / Noite + bolhas
  animadas).
- **Só 98:** acento em chips (5 curados), padrão da área de trabalho
  (Pontilhado / Sólido / Marca / Grade), densidade (Compacto / Normal),
  scanlines CRT.

## 4. Motor de ícones pixelados + `<Icone>`

**Port.** `pixel-icons.js` → `tema/icones/motor.ts`: paleta de 39 cores, 52
bitmaps 16×16, render em canvas (nearest-neighbor) e cache de data-URL chaveado
por `nome+tamanho+gloss`. Lógica inalterada, só tipada.

**Type safety.** As chaves do mapa geram a união `NomeIcone`, então
`<Icone nome="grdi" />` é **erro de compilação**. `motor.test.ts` afirma:
completude da paleta, todo bitmap com 16 linhas, e `listar()` consistente com o
mapa — roda em jsdom sobre as estruturas (sem canvas). O render em canvas é
guardado: sem contexto 2D (jsdom), `motor` devolve um 1×1 transparente, e
`<Icone>` ainda renderiza um `<img>` com seu `alt`.

**Componente.**

```tsx
<Icone nome="grid" tamanho={16} gloss alt="Grade" />
```

`<img>` memoizado (`image-rendering: pixelated`). O default de `gloss` vem da pele
ativa via contexto — **Aero com brilho, 98 chapado** (flag `DBOS_FLAT_ICONS` do
protótipo 9x) — e uma prop `gloss`/`gloss={false}` explícita sobrescreve por uso.

**Onde os ícones entram** (substituindo texto/emoji de hoje):

- **Shell:** titlebars de janela (`Janela`), tarefas + quick-launch + tray
  (`database/wifi/speaker`), itens do menu Iniciar + avatar, atalhos da área de
  trabalho.
- **Árvore do Explorador:** `database / folder / table / view / column / key` por
  tipo de nó.
- **Cromo dos apps:** ícones de toolbar/menubar (`run save insert edit trash
  refresh filter sql grid props`), ícones de diálogo (`stop / help / props`),
  selo 🔑 PK nas grades.
- **Registro:** `registroApps.tsx` ganha `icone: NomeIcone` por app, então o
  shell puxa o glifo certo em todo lugar automaticamente.

## 5. Painel de Tweaks + persistência

**Port simplificado.** O framework do painel do protótipo (slider, toggle, rádio
segmentado, select, chips de cor, botão) vira controles tipados em
`tema/PainelTweaks.tsx`. O encanamento `postMessage`/"edit-mode host" é
**descartado** — aqui é só um painel flutuante in-app.

**Casa do estado.** `<ProvedorTema>` detém o estado; `useTweaks()` expõe
`{ valores, definir }`. Todo `definir` aplica ao `document.body` (vars + `data-*`)
e grava no localStorage de forma síncrona. Sem store global novo — vive ao lado
de `areaTrabalho/loja.ts`, não dentro, para manter o theming autocontido.

**Reuso, não re-port:**

- O tweak **Som** liga/desliga o `areaTrabalho/sons.ts` **existente** — o
  `DBOS_sfx` do protótipo **não** é portado. Um único sistema de som.
- **Animações** dirige `--motion` **e** respeita `prefers-reduced-motion`.

**Abertura.** Um ícone de engrenagem/`props` no tray, mais uma entrada
**"Configurações"** no menu Iniciar e **"Propriedades"** no menu de contexto da
área de trabalho alternam o painel (arrastável, flutua no canto inferior direito,
acima das janelas e abaixo de diálogos modais). **"Reiniciar sessão"** reexecuta
a tela de boot — **não** derruba a sessão SQL.

## 6. Upgrades de visualização (por app)

**Só restyle (sem mudança de backend):**

- **Explorador** — ícones pixelados por nó (`database/folder/table/view/column/
  key`), twisties, `col-meta` à direita (tipo · nulabilidade · 🔑).
- **Consulta** — **mantém o CodeMirror** (o highlight real dele supera o overlay
  por regex do protótipo); adiciona tema CM ciente de pele, toolbar com ícones
  (`run` primário / `stop`), estados de resultado com ícone
  (executando/erro/sucesso) e statusbar mais rica (linhas · ms · usuário/banco).
- **Grade** — `dtable` tematizada: cabeçalho fixo, linhas zebra, alinhamento
  numérico à direita + formatação R$ (reusa `grade/conversao.ts`), realce de
  linha selecionada, selo 🔑 PK nos cabeçalhos, selo somente-leitura para views,
  input de filtro com ícone `filter`, paginação com ícones (`◀ ▶`).
- **Propriedades** — ícone de tipo no cabeçalho + painel chave-valor (`raised`) +
  tabela de índices.
- **Relacionamentos** — upgrade do grafo **já existente** (radial SVG, com
  centro/filhos, arestas, histórico/voltar, seletor — ligado a `useGrafo`): troca
  emoji → ícones pixelados (`user/folder/report`), cores de nó por tipo (acento /
  `#f6c945` / `#2bc28d`), canvas SVG tematizado. Navegação intocada.
- **Busca** — facetas (já completas: nome, departamento, salário op+valor,
  projeto, relacionado-a) → barra lateral tematizada com selo de contagem;
  tabela de resultados → cards (`user` + subtítulo *Cargo · Depto · R$* +
  botões-ícone "Grade" / "Relações").
- **Terminal** — aplica a pele CRT `.term` (verde fósforo, scanlines `--crt`),
  estilo de prompt; `comandos.ts` intocado.

**Build novo — a única feature real:**

- **Relatório (Folha)** — o relatório de barras do protótipo. O banco já tem
  `vw_FolhaResumo` / `vw_AnomaliasFolha`, então precisa de **backend**: uma
  query/rota + tipos compartilhados + um componente novo (barra horizontal por
  departamento, lista de anomalias opcional) + registro/ícones de área de
  trabalho e Iniciar. É o único item que não é puro restyle.

## 7. Fases de rollout

Cada fase termina verde em `bun test` e com app rodável.

| Fase | Entrega | Backend? |
|---|---|---|
| **0 — Costura** | scaffold `tema/`: tokens, `base.css`, as duas peles, `<ProvedorTema>`, troca `98.css` no `main.tsx`, `body[data-skin]` default Aero | não |
| **1 — Ícones** | `motor.ts` + `<Icone>` + testes; `icone` no `registroApps`; ícones pelo shell + árvore do Explorador | não |
| **2 — Tweaks** | `PainelTweaks` + persistência + afordâncias de abertura; liga Som/Animações/CRT/acento/wallpaper/padrão/densidade/cantos/vidro | não |
| **3 — Pele do shell** | fidelidade plena de boot/login/desktop/taskbar/Iniciar/diálogos, nas duas peles | não |
| **4 — Restyle dos apps** | explorador, consulta, grade, propriedades, relacionamentos, busca, terminal → tokens + ícones + gráficos/cards | não |
| **5 — Relatório (Folha)** | novo: query/rota + tipos compartilhados + app de barras + registro/ícones + testes | **sim** |

## 8. Estratégia de testes

- Manter **todos** os testes existentes verdes; atualizar só asserções de
  classe/texto que um restyle tocar.
- Adicionar: `motor.test.ts` (integridade do mapa de ícones); teste de
  `ProvedorTema` (pele padrão, restauração, escreve `body[data-*]`); testes de
  interação do `PainelTweaks`; e, na Fase 5, testes de rota + relatório.
- Sign-off visual ao fim de cada fase via `bun run dev:web` (e a skill `/verify`).

## 9. Fora de escopo (YAGNI)

- Protocolo `postMessage`/edit-mode dos protótipos.
- Re-port do `DBOS_sfx` (reusa `sons.ts`).
- Overlay de highlight por regex do protótipo (mantém CodeMirror).
- Peles/temas além de Aero e 98.
- Generalização do domínio RH (Relacionamentos/Relatório permanecem cientes do
  domínio atual, como o resto do app).
