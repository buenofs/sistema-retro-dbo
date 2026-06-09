# Ícones reais por pele (98 / Aero) — Design

**Data:** 2026-06-09
**Status:** Aprovado (aguardando revisão final do spec)
**Tema:** Substituir o motor de ícones pixelados procedurais por dois conjuntos de ícones reais, um por pele — Win95/98 autêntico para a pele `98` e Windows XP "Luna" autêntico para a pele `aero` — mantendo a API `<Icone>` intacta.

---

## Problema

Hoje os ícones são bitmaps `16×16` desenhados à mão em `tema/icones/bitmaps.ts`, renderizados em canvas com escala nearest-neighbor (`image-rendering: pixelated`) e, na pele `aero`, recebem uma passada de **gloss** (gradiente branco→preto por cima). O resultado:

- Na pele **`aero`** o contorno preto (`k`) dos bitmaps + o gloss "encolhido" deixam os ícones com aparência amadora e datada — exatamente o oposto do visual liso e envidraçado do XP.
- Em **ambas** as peles os ícones são pobres em detalhe (16×16 chapado) e não conversam com a identidade de cada pele.

Queremos **duas linguagens de ícone distintas**, uma fiel a cada pele, sem contorno forçado nem gloss procedural na `aero`.

## Decisões (fechadas com o usuário)

1. **Pele `98` → `@react95/icons`** (MIT, uso comercial livre) — arte Win95/98 autêntica, distribuída como PNGs reais (16/32/48px).
2. **Pele `aero` → Windows XP "Luna" autêntico**, em conjunto **curado para melhor cobertura**: monto o set a partir das melhores fontes de XP autêntico (tema XP da B00merang + dump genuíno do Luna), escolhendo o ícone XP real mais próximo de cada nome.
3. **Uso pessoal/interno** — sem redistribuição pública; o ponto de licença dos ícones XP proprietários não nos restringe.
4. **Entrega:** assets **vendorizados localmente** no repositório (pastas PNG por pele). Sem hotlink de CDN em runtime; o app continua offline e determinístico.
5. **Motor:** **aposentar** o renderizador em canvas + a passada de gloss. `<Icone nome>` continua sendo a única API que todos os ~18 pontos de uso já consomem.
6. **Split de renderização:** `98` = tiers pixelados nativos; `aero` = um PNG hi-res suavizado.

## Não-objetivos

- **Nenhum nome de ícone novo.** `NomeIcone` permanece a união tipada atual (32 nomes).
- **Sem restyle app-a-app** (isso é a Fase 4 existente do revamp).
- **Sem pipeline SVG.** Os dois conjuntos são raster.
- Não mexer em consumidores além de remover usos do prop `gloss`.

---

## Arquitetura

### API pública — inalterada

`<Icone nome tamanho />` continua idêntico para os call sites (barra de título, barra de tarefas, menu Iniciar, atalhos, bandeja, diálogos, árvore do Explorador, nós de Relacionamentos, logon, limite de erro). `NomeIcone` continua a união tipada derivada do conjunto atual de **32 nomes**:

```
folder folderOpen sql grid props search network terminal report database
computer table view column key run save insert edit trash refresh filter
newdoc stop clock speaker wifi power logoff user help star
```

A **única** mudança em consumidores: remover quaisquer usos do prop `gloss` (hoje opcional). O prop deixa de existir.

### Motor — substituído

Removidos:
- `tema/icones/bitmaps.ts` (PALETA + MAPAS procedurais).
- A função `desenhar()` em `motor.ts` (canvas, nearest-neighbor, gradiente de gloss, fallback transparente para jsdom).

**Fonte da verdade dos nomes:** como `MAPAS` deixa de existir, `NomeIcone` passa a derivar de um array literal canônico em `tema/icones/nomes.ts`:

```ts
export const NOMES_ICONES = ['folder','folderOpen','sql', /* …32 nomes… */ 'star'] as const;
export type NomeIcone = (typeof NOMES_ICONES)[number];
```

`motor.ts` passa a expor: `temIcone`, `listarIcones`, `obterIcone(nome, pele, tamanho) → url` e reexporta `NomeIcone`/`NOMES_ICONES` de `nomes.ts`. O manifesto é **validado contra `NOMES_ICONES`** (o teste de completude falha se algum nome não tiver asset, e o glob não pode conter chave fora da lista).

### Assets — vendorizados e normalizados

```
apps/web/src/tema/icones/assets/
  98/
    folder-16.png   folder-32.png
    sql-16.png      sql-32.png
    ...             (um par -16/-32 por NomeIcone)
  aero/
    folder.png      (48px)
    sql.png         (48px)
    ...             (um arquivo por NomeIcone)
```

- **`98/`**: PNGs copiados de `@react95/icons` (pasta `png/`), **renomeados** para `<nome>-16.png` / `<nome>-32.png`. Copiamos só os 32 necessários — sem dependência de runtime do pacote.
- **`aero/`**: PNGs do conjunto XP curado, normalizados para `<nome>.png` em 48px (um hi-res por nome; escala suave para tamanhos menores).

### Manifesto tipado

Gerado em build com Vite glob, sem listagem manual:

```ts
const m98  = import.meta.glob('./assets/98/*.png',   { eager: true, query: '?url', import: 'default' });
const mAero = import.meta.glob('./assets/aero/*.png', { eager: true, query: '?url', import: 'default' });
// → Record<Pele, Partial<Record<NomeIcone, { '16'?: url; '32'?: url; base?: url }>>>
```

Os caminhos são parseados para `(nome, tier)`. O resultado é um mapa `pele → nome → urls`. URLs são hashed/bundladas pelo Vite (offline).

### Resolução e renderização em `<Icone>`

```
pele '98':   tier = tamanho <= 16 ? '16' : '32';  src = m98[nome][tier];   imageRendering = 'pixelated'
pele 'aero': src = mAero[nome].base (48px);        imageRendering = 'auto'
```

- A pele vem de `useContext(ContextoTema)` (já existe). Sem provedor → assume `98` (default seguro, sem gloss).
- `width`/`height` continuam = `tamanho`; o navegador escala (pixelado no 98, suave no aero).
- Mantém `alt`, `className`, `style`, `draggable={false}` como hoje.

### Tabelas de mapeamento (o trabalho real)

Dois mapeamentos de 32 entradas: `NomeIcone → arquivo de origem` em cada pele. Como os nomes de origem diferem dos nossos (ex.: react95 `FileFind`, XP `edit-find`), o mapeamento dirige a cópia/renomeação para `<nome>`.

Entregar junto um **relatório de cobertura** sinalizando todo nome cujo melhor match seja fraco/substituto, para conferência visual. Candidatos prováveis a substituto: `sql`, `grid`, `column`, `key` (como PK), `report`, `filter`, `insert`.

Regra para lacunas: se não há ícone XP/95 adequado para um nome, usar o substituto genérico mais próximo da própria pele (ex.: documento genérico para `sql`) — **nunca** misturar a arte da outra pele.

---

## Testes

Removidos: testes de PALETA/MAPAS de `motor.test.ts` (deixam de existir).

Adicionados/ajustados:
- **Completude do manifesto:** para **todo** `NomeIcone`, existe asset resolvível em **ambas** as peles (no 98, ambos os tiers `-16` e `-32`). Falha lista os nomes ausentes.
- **`<Icone>` por pele:** dentro de `ProvedorTema` na pele `98`, renderiza `<img>` com `image-rendering: pixelated`; na pele `aero`, com `image-rendering: auto`. Sem provedor, renderiza `<img>` (default 98).
- **Regressão de consumidores:** os testes existentes que só verificam presença de `<img>`/`alt` (ex.: `Janela.test.tsx`, `ColunasDaTabela.test.tsx`) continuam passando sem mudança.

**Nota jsdom:** com imports estáticos de asset, `<Icone>` apenas emite `<img src=<url-bundlada>>`. Não há mais canvas, então some o fallback de PNG transparente — em teste o `src` é o caminho resolvido pelo Vite. Sem dependência `canvas`.

---

## Estrutura de arquivos

**Novo**
- `apps/web/src/tema/icones/assets/98/*.png` — 32 nomes × 2 tiers.
- `apps/web/src/tema/icones/assets/aero/*.png` — 32 nomes × 1 hi-res.
- `apps/web/src/tema/icones/manifesto.ts` — glob + parse → mapa tipado por pele.
- `apps/web/src/tema/icones/nomes.ts` — `NOMES_ICONES` (array literal canônico) + `type NomeIcone`.

**Modificado**
- `apps/web/src/tema/icones/motor.ts` — remove `desenhar`/gloss; `obterIcone(nome, pele, tamanho)` lê o manifesto; reexporta helpers a partir do manifesto.
- `apps/web/src/tema/icones/Icone.tsx` — resolve por pele, define `image-rendering` por pele, remove o prop/lógica `gloss`.
- `apps/web/src/tema/icones/motor.test.ts` — substitui testes de bitmap por testes de completude/resolução.
- `apps/web/src/tema/icones/Icone.test.tsx` — adiciona asserções de `image-rendering` por pele.
- Consumidores que passam `gloss=` (varredura) — remover o prop.

**Removido**
- `apps/web/src/tema/icones/bitmaps.ts`.

---

## Riscos e mitigações

- **Cobertura XP de nomes técnicos** (`sql`, `grid`, `column`): mitigado pelo conjunto curado + relatório de cobertura para revisão humana; regra de substituto da mesma pele.
- **Nitidez do pixel art 98 em tamanhos não nativos** (14/20/24): usa o tier nativo mais próximo com `pixelated`; aceitável. Tamanhos 16 e 32 são os dominantes na UI.
- **Tamanho do bundle:** 32×(2+1) ≈ 96 PNGs pequenos; desprezível e tree-shakeable por hash. Vendorizar só os nomes usados evita carregar pacotes inteiros.
- **Peso visual entre peles:** `aero` em 48px hi-res pode parecer mais "encorpado" que `98`; o `image-rendering` e os tiers nativos por pele já tratam o essencial; ajuste fino fica para conferência visual manual.

## Verificação final

1. `bunx vitest run` — suíte verde (inclui novos testes de manifesto/resolução).
2. `bunx tsc --noEmit` — limpo (`NomeIcone` ainda fecha o tipo).
3. `bunx vite build` — conclui; assets entram bundlados.
4. Conferência visual manual: alternar peles e inspecionar título, tarefas, Iniciar, atalhos, bandeja, diálogos, árvore e Relacionamentos — confirmar 98 pixelado autêntico e aero liso/envidraçado sem contorno.
