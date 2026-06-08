# DBOS — Reforma RH + Novas Janelas — Design Spec

**Date:** 2026-06-08
**Status:** Approved (pending final user review of this document)

## 1. Overview

A base DBOS (Fases 0–7) entrega um shell de SO retrô (Win98) com ferramentas
genéricas de banco (Explorador, Editor de Consultas, Grade, Propriedades) rodando
contra `master`. Esta reforma transforma o DBOS num **sistema de RH/folha de
pagamento concreto**, com banco próprio, e adiciona três janelas-feature retrô —
**Busca** (estilo Search Companion do Win98), **Relacionamentos** (explorador de
rede navegável) e **Terminal** (prompt DOS) — além de uma camada de polimento:
**tela de boot + logon estilo SO** e melhoria de UX/estética das janelas existentes.

Também atende o checklist acadêmico (banco no SQL Server, inserir/atualizar/excluir
via sistema, exibição via uma view) e maximiza a nota de complexidade.

**Estética (inalterada):** Win98 autêntico via 98.css — painéis cinza, barras de
título azuis, botões 3D, ícones pixelados. Sem glassmorphism/cards modernos.

### Decisões travadas (do brainstorming)

| Área | Decisão |
|------|---------|
| Modelo de dados | **Schema RH fixo + view** (não genérico) |
| Riqueza do schema | 5 tabelas + 2 views, conforme proposto |
| Login | **Boot splash + diálogo de logon** clássico; logout volta ao logon (boot só na carga inicial) |
| Terminal | **Comandos de domínio + lançamentos**; reusa o Editor de Consultas para SQL |
| Relacionamentos | **Grafo navegável** (clicar em nó re-centraliza; pilha de volta) |
| Busca | **Painel de resultados + ações**; "Relationships" = funcionários que compartilham depto/projeto com X |
| Apps existentes | **Domínio + polimento visual** (RH-aware, restyle consistente) |
| Entrega | **Fundação primeiro**, 1 spec → ~5 planos ordenados |

### Convenções (mantidas das fases anteriores)

- Identificadores autorados em **pt-BR**; inglês só onde inevitável (APIs de
  libs, termos de protocolo, e a superfície "DOS/retrô" do Terminal/Relacionamentos).
- **SQL cru, sem ORM.** Parametrizado onde a entrada vem do cliente
  (`request.input` + `@nome`); identificadores citados com colchetes quando
  dinâmicos (padrão da Fase 5).
- Caminho de dados: `requisitar<T>` → rota Fastify (preHandler `autenticar`,
  `req.sessao!.pool`) → SQL → `Resposta<T>` tipado → TanStack Query → diálogos
  retrô em erro.
- TypeScript estrito (`noUncheckedIndexedAccess`); `tsc --noEmit` limpo é gate.

## 2. Banco de dados `DBOS_RH`

Banco **dedicado** `DBOS_RH` (para "apresentar o banco no SQL Server" de forma
limpa no SSMS), criado por um script idempotente versionado `db/dbos_rh.sql` e
um task `bun run db:setup` que o executa como `sa`. `SQL_BANCO` passa de `master`
para `DBOS_RH` no `.env`/`.env.example`.

### 2.1 Tabelas

- **Departamentos** (`id` PK identity, `nome` NOT NULL, `centroCusto`)
- **Funcionarios** (`id` PK identity, `nome` NOT NULL, `cargo`, `salario` DECIMAL(10,2),
  `dataAdmissao` DATE, `departamentoId` FK→Departamentos)
- **Projetos** (`id` PK identity, `nome` NOT NULL, `status`, `dataInicio` DATE)
- **FuncionariosProjetos** (`funcionarioId` FK→Funcionarios, `projetoId` FK→Projetos,
  `papel`; PK composta (`funcionarioId`,`projetoId`)) — N:N
- **FolhaPagamento** (`id` PK identity, `funcionarioId` FK→Funcionarios,
  `competencia` CHAR(7) p.ex. `2026-05`, `salarioBase` DECIMAL(10,2),
  `bonus` DECIMAL(10,2), `descontos` DECIMAL(10,2), `salarioLiquido` DECIMAL(10,2))

FKs com `ON DELETE` adequado (ex.: `FuncionariosProjetos` e `FolhaPagamento`
cascateiam ao excluir um funcionário, para que a exclusão via Grade funcione sem
erro de FK). Índices nas FKs.

### 2.2 Views

- **`vw_FolhaResumo`** — relatório principal (atende o checklist "exibição via
  view"): junta Funcionario + Departamento + último/most-recent `salarioLiquido`,
  ex. colunas `funcionario, cargo, departamento, salario, ultimaCompetencia, ultimoLiquido`.
- **`vw_AnomaliasFolha`** — linhas de folha onde
  `salarioLiquido <> salarioBase + bonus - descontos` (alimenta `show payroll_anomalies`).

### 2.3 Seed

Dados de exemplo determinísticos: ~3 departamentos, ~8 funcionários (incluindo
**Felipe**), ~3 projetos, alocações N:N (Felipe em ≥2 projetos), e várias linhas
de folha — **uma propositalmente anômala** para `vw_AnomaliasFolha` retornar
resultado. O seed fixa nomes/valores para os testes de integração assertarem
exatamente (relacionamentos do Felipe, hits de busca, a anomalia).

## 3. Servidor (módulos de domínio novos)

Mesmos padrões das fases anteriores; rotas registradas no contexto do cookie em
`app.ts`.

- `bd/consultasBusca.ts` + `rotas/busca.ts` →
  `GET /api/busca/funcionarios` com filtros opcionais **parametrizados**:
  `nome` (LIKE), `departamentoId`, `salarioOp` (`gt|lt|eq|entre`) + `salario`(+`salario2`),
  `projetoId`, `relacionadoA` (funcionarioId → outros do mesmo depto/projeto).
  Devolve `ResultadoBusca` (lista de `Funcionario` enriquecido com departamento).
- `bd/consultasRelacionamentos.ts` + `rotas/relacionamentos.ts` →
  `GET /api/relacionamentos?tipo=&id=` (`tipo` ∈ `funcionario|departamento|projeto`)
  devolve `GrafoRelacionamentos { nos, arestas }`:
  - `funcionario` → nós: o próprio + Departamento + Projetos + (resumo) Folha; arestas ligando.
  - `departamento` → nós: o depto + seus funcionários.
  - `projeto` → nós: o projeto + seus membros.
- **Terminal** quase sem backend novo: o parser cliente reusa
  `/api/busca` (`find`), `/api/consulta` (Fase 4, pass-through) para `dir`/`show`
  via `SELECT` **construído a partir de um mapa de aliases whitelisted** (sem
  texto livre do usuário no SQL), e `abrirJanela` para `open`/`sql`.

Endpoints novos exigem sessão (preHandler `autenticar`) e tratam erro pelo
`tratadorErros` existente.

## 4. Contratos compartilhados (`@dbos/shared`)

- `Funcionario { id, nome, cargo, salario, dataAdmissao, departamentoId, departamento? }`
- `Departamento`, `Projeto` (leves, conforme necessário).
- `FiltrosBusca` + `esquemaBusca` (zod) — campos opcionais acima.
- `ResultadoBusca = Funcionario[]` (ou `{ funcionarios: Funcionario[] }`).
- `GrafoRelacionamentos { nos: NoGrafo[]; arestas: ArestaGrafo[] }`
  - `NoGrafo { id: string; tipo: 'funcionario'|'departamento'|'projeto'|'folha'; rotulo: string }`
  - `ArestaGrafo { de: string; para: string; rotulo?: string }`
- `Resposta<T>`/`ErroApi` reusados. Tipos de erro inalterados.

## 5. Janelas-feature (novos apps do WM)

Novos `tipoApp`: `busca`, `relacionamentos`, `terminal`. Registrados em
`registroApps` (ícone, tamanho inicial, componente); entram em `ORDEM_APPS` →
atalhos no desktop + menu Iniciar automáticos. Cada um é `ComponentType<PropsApp>`
e lê `janela.dados` quando aplicável. Reusam `requisitar`, TanStack Query e os
diálogos.

### 5.1 Busca (`busca`) — Search Companion

Janela de dois painéis. **Esquerda (companion):** formulário de critérios —
*Nome contém*, *Departamento* (select de Departamentos), *Salário* (operador
`> < = entre` + valor(es)), *Projeto* (select de Projetos), *Relacionado a*
(select de funcionário) — e botão **Pesquisar**. **Direita (resultados):** lista
de funcionários (nome, cargo, departamento, salário); cada linha com
**"Ver relacionamentos"** (`abrirJanela('relacionamentos', { tipo:'funcionario', id })`)
e **"Abrir na grade"**. Hook `useBusca(filtros)` (query keyed pelos filtros
aplicados, habilitada após "Pesquisar"). Estética 98.css (fieldset de busca,
lista com seleção).

### 5.2 Relacionamentos (`relacionamentos`) — explorador de rede navegável

`janela.dados = { tipo, id }` (sem dados → estado vazio "escolha um funcionário",
reusa busca/objetos). Busca `GET /api/relacionamentos` e renderiza um **canvas
SVG**: nó central = entidade em foco; nós relacionados dispostos radialmente
(centro + filhos igualmente espaçados num círculo, layout calculado no cliente);
ligados por linhas conectoras. Nós = caixas cinza biseladas com ícone + rótulo
(estilo diagrama do antigo SQL Server Enterprise Manager / Visio). **Navegável:**
clicar num nó re-centraliza o grafo nele (refetch); **pilha de volta** ("◀ Voltar").
Clicar numa folha de funcionário também permite "Abrir na grade".

### 5.3 Terminal (`terminal`) — prompt DOS

Fundo preto, texto verde monoespaçado, cursor piscando, prompt `C:\DBOS>`,
histórico (↑/↓), scrollback. **Parser no cliente**:

| Comando | Ação |
|---------|------|
| `help` | lista comandos |
| `cls` | limpa a tela |
| `dir <tabela>` | lista linhas (alias `employees`→Funcionarios) via `/api/consulta` (`SELECT` whitelisted) |
| `find <campo> <op> <valor>` | ex. `find salary > 10000` → `/api/busca` |
| `show <view>` | ex. `show payroll_anomalies` → `vw_AnomaliasFolha` via `/api/consulta` |
| `open <nome>.emp` | resolve funcionário por nome → `abrirJanela('relacionamentos', …)` |
| `sql` | `abrirJanela('consulta')` (reusa o Editor de Consultas) |

**Mapa de aliases** (inglês retrô → schema pt-BR), whitelisted para evitar
injeção: `employees→Funcionarios`, `departments→Departamentos`,
`projects→Projetos`, `payroll→FolhaPagamento`, `salary→salario`,
`payroll_anomalies→vw_AnomaliasFolha`. Comandos desconhecidos → mensagem de erro
estilo DOS ("Comando ou nome de arquivo inválido").

## 6. Boot + Logon

`App` vira uma máquina de estados: **`boot` → `login` → `desktop`**.

- **BootScreen** (carga inicial só): tela cheia com logo DBOS + barra de progresso
  "Iniciando..." (~1,5–2s), com o som `iniciar`; depois transita para o logon.
- **Logon** (substitui o estilo atual de `TelaLogin`): diálogo 98.css centralizado
  "Log On to DBOS" (ícone de chave/computador, *Login* + *Senha* do login do SQL
  Server, OK/Cancelar). Sucesso → desktop; erro → inline/diálogo.
- **Logout** → volta ao **logon** (não reinicia o boot).

## 7. Polimento das janelas existentes

- **RH-aware:** com `SQL_BANCO=DBOS_RH`, Explorador/Grade já mostram as tabelas
  RH. O desktop exibe o nome do banco conectado.
- **Grade exibe views:** o seletor de tabela da Grade passa a listar **views**
  (somente leitura) → `vw_FolhaResumo` abrível (checklist "exibição via view").
- **Atalho "Relatório":** item de desktop/Iniciar que abre a Grade em
  `vw_FolhaResumo`.
- **Consistência visual:** barras de ferramentas, ícones, espaçamentos, **estados
  vazios** e rótulos de domínio pt-BR padronizados entre as janelas; sem
  reconstruir comportamento.

## 8. Mapeamento do checklist acadêmico (peso 0,3 cada)

| Critério | Como é atendido |
|----------|-----------------|
| Apresentação do banco no SQL Server | `DBOS_RH` + `db/dbos_rh.sql` (abrir no SSMS) |
| Inserir 3 registros via sistema | Grade → inserir em **Funcionarios** (CRUD da Fase 5) |
| Atualizar 1 registro via sistema | Grade → editar |
| Excluir 1 registro via sistema | Grade → excluir (FKs cascateiam) |
| Exibição via uma view | Grade em **`vw_FolhaResumo`** (e Terminal `show`) |
| Complexidade 1→5 | 5 tabelas + N:N + 2 views; 7 apps incl. grafo/terminal/busca |

## 9. Testes

- **Servidor (integração, SQL real):** com o `DBOS_RH` semeado, asserções
  **determinísticas** — relacionamentos exatos do Felipe, hits exatos da busca
  (`find salary > X`), conteúdo da `vw_AnomaliasFolha`, resumo da `vw_FolhaResumo`.
  Pré-requisito da suíte: `bun run db:setup` (o banco deve existir e estar
  semeado).
- **Web (Vitest + RTL, fetch stub):** Busca (resultados renderizam, ações
  disparam `abrirJanela`), Relacionamentos (nós/arestas renderizam; clicar
  re-centraliza; voltar), Terminal (parser mapeia cada comando; aliases),
  Boot→Login (transição) e Logon (renderiza/valida).
- **`tsc --noEmit` limpo** no web. **Navegador:** verificação manual por plano.

## 10. Sequenciamento da entrega (1 spec → ~5 planos)

A fundação primeiro (tudo depende do schema); as três janelas são independentes
entre si (reordenáveis), mas todas precisam da fundação.

1. **Fundação RH** — `db/dbos_rh.sql` + `bun run db:setup`, `SQL_BANCO=DBOS_RH`,
   contratos compartilhados (`Funcionario`, `FiltrosBusca`, `GrafoRelacionamentos`),
   módulos/rotas de servidor (`busca`, `relacionamentos`) + testes de integração.
2. **Boot/Logon + polimento** — máquina de estados do `App`, BootScreen, diálogo
   de logon clássico, Grade exibindo views + atalho "Relatório", consistência
   visual/RH-aware das janelas existentes.
3. **Busca (Search Companion)** — janela + `useBusca`.
4. **Relacionamentos** — janela de grafo navegável (SVG).
5. **Terminal DOS** — janela + parser + aliases.

**Ordenação alternativa (fallback se houver pressa de prazo):** entregar só o
mínimo do checklist primeiro — Fundação (1) + garantir CRUD na Grade e a view —
e depois as janelas-feature (3–5) e o polimento (2).

## 11. Fora de escopo (registrado)

- Gestão de logins/permissões do SQL Server pela UI (usa-se `sa` no demo; logins
  precisam de acesso a `DBOS_RH`).
- Edição de relacionamentos pelo grafo (o grafo é navegação/visualização; CRUD
  fica na Grade).
- Migrações versionadas de banco além do script idempotente único.
- Navegação completa por teclado de todo o WM (mantém-se o foco em diálogos da
  Fase 7).
- Personagem animado do Search Companion (mantém-se a estética do painel, sem o
  mascote animado).

## 12. Riscos / observações

- **Troca de `SQL_BANCO` para `DBOS_RH`:** os testes de integração das Fases 1–6
  passam a rodar contra `DBOS_RH` (criam/derrubam tabelas temporárias próprias —
  seguem passando, só exigem que o banco exista). A suíte inteira passa a depender
  de `bun run db:setup`.
- **SVG do grafo no jsdom:** sem layout real; os testes assertam nós/arestas
  renderizados e a re-centralização por estado, não posições — verificação visual
  no navegador.
- **`show`/`dir` via `/api/consulta`:** o `SELECT` é montado a partir de um mapa
  de aliases controlado (sem texto livre do usuário), então não há injeção; o
  pass-through continua sendo o único ponto de SQL livre (via `sql`/Editor).
- **Exclusão via Grade exige cascata de FK** (ou exclusão das dependências antes),
  senão o DELETE falha — resolvido no schema com `ON DELETE CASCADE` nas tabelas
  dependentes.
