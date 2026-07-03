# Simplificar as queries do sistema de arquivos — design

**Data:** 2026-06-23
**Status:** aprovado (aguardando revisão do spec)

## Contexto e motivação

O projeto é acadêmico, de nível iniciante, e será avaliado presencialmente. O
critério que guia este trabalho é **explicabilidade**: o autor precisa entender e
defender cada query na banca. SQL que não se consegue explicar ao vivo é um risco.

A superfície de demonstração escolhida é o **sistema de arquivos** (`DBOS_SISTEMA`):
criar/renomear/excluir arquivos e pastas no Explorador, e exibir registros via uma
view. Por acaso é também onde mora a SQL mais avançada do projeto.

O currículo ensinou: MER, DDL, DML, views/procedures/triggers, integração
banco↔sistema, bulk insert/replicação/linked server. Ficam **acima** do que foi
ensinado (e portanto difíceis de defender): CTE recursiva, `OUTER APPLY`,
consultas a catálogo `sys.*`, e SQL dinâmica. No caminho da demonstração, o que
está fora do nível são as **CTEs recursivas**.

## Princípio de design

Todo SQL que permanece no caminho da demonstração é de **nível iniciante e
nomeado**: `SELECT`/`INSERT`/`UPDATE`/`DELETE` de um nível, `JOIN` simples e views
com `WHERE`/`GROUP BY`. Qualquer "caminhar na árvore de pastas" passa a ser um
**laço em TypeScript** legível e explicável. Nada de CTE recursiva no caminho da
demo.

As queries exigidas pelo checklist continuam existindo como SQL real e apontável:
- **Inserir** → `INSERT INTO dbo.Itens (...)` (criar arquivo/pasta)
- **Atualizar** → `UPDATE dbo.Itens SET ... WHERE id=@id` (renomear/salvar)
- **Excluir** → `DELETE FROM dbo.Itens WHERE naLixeira=1` (esvaziar lixeira)
- **Exibir via view** → uma das views simples (`vw_Lixeira` / `vw_UsoPorDrive` /
  `vw_UsoPorUsuario`)

## Decisão de abordagem

Avaliamos três caminhos para a recursão:

- **A — Recursão no TypeScript, SQL chapada (escolhida).** O banco só executa
  consultas de um nível; o TS percorre a árvore em laço. Única abordagem que de
  fato torna o SQL explicável.
- **B — Mover a complexidade para stored procedures.** Rejeitada: o corpo da
  procedure ainda conteria a CTE recursiva — relocaliza, não simplifica.
- **C — Manter tudo e só documentar.** Rejeitada: ainda exigiria defender CTE
  recursiva ao vivo, exatamente o risco a evitar.

Sub-decisão: a `vw_ArvoreItens` recursiva é **removida** (não é consumida por
nenhuma tela); a árvore/caminho já é montada no TS pela pilha de navegação do
Explorador. Mantemos **apenas views simples**.

## Escopo

**Dentro do escopo (núcleo do sistema de arquivos):**
- Schema `db/dbos_sistema.sql`
- Queries do servidor em `apps/server/src/bd/consultasArquivos.ts`
- Rota e hook mortos relacionados à árvore

**Fora do escopo (intocado):**
- **DDL "niceties"** — coluna computada `tamanhoBytes AS DATALENGTH(conteudo)` e
  o índice único filtrado `WHERE naLixeira=0`. São explicáveis em uma frase e são
  estruturais (alimentam as views de uso / garantem nome único por pasta).
- **Grade genérica** (`consultasGrade.ts`, SQL dinâmica via `citarId`) e
  **Propriedades** (`sys.partitions`/`sys.indexes`) — ficam em apps separados
  (Explorador de Objetos / Grade de Dados), fora do caminho da demo.
- Paginação `OFFSET/FETCH`.

## Mudanças detalhadas

### 1. Schema — `db/dbos_sistema.sql`

- **Remover** a `CREATE VIEW dbo.vw_ArvoreItens` (CTE recursiva) e seu
  `DROP VIEW` idempotente.
- **Manter** `vw_Lixeira`, `vw_UsoPorDrive`, `vw_UsoPorUsuario` — todas são
  `WHERE`/`GROUP BY` puro e 100% explicáveis.

### 2. Queries do servidor — `apps/server/src/bd/consultasArquivos.ts`

Introduzir **um helper TypeScript** que coleta a subárvore de um item em laço,
usando apenas consultas de um nível:

```
coletarSubarvore(pool, reg, id) -> linhas[]
  // começa com [id]; a cada nível, SELECT ... FROM dbo.Itens WHERE paiId IN (...)
  // até não haver mais filhos. Largura-primeiro já entrega pais antes de filhos.
```

Substituições (comportamento idêntico; muda só a implementação):

| Operação        | Hoje (CTE recursiva)                          | Depois (TS + SQL de um nível)                                              |
|-----------------|-----------------------------------------------|----------------------------------------------------------------------------|
| Mover (ciclo)   | `WITH sub AS (...) SELECT CASE ...`           | sobe os pais de `destino` em laço (`SELECT paiId WHERE id=@x`); ciclo se encontrar `id` |
| Lixeira         | `WITH sub AS (...) UPDATE ...`                | `coletarSubarvore` → `UPDATE dbo.Itens SET naLixeira=@v WHERE id IN (...)` |
| Copiar          | `WITH sub AS (...) SELECT ...`                | `coletarSubarvore` → reusa o laço de `INSERT` existente                    |

- A coleta por largura já ordena pais antes de filhos, então `ordemDeInsercao`
  (em `copiaArvore.ts`) torna-se redundante para o caminho de cópia; pode ser
  removido ou mantido como utilitário trivial (decidir na implementação).
- **Remover** `arvoreDoDrive` (função morta).

### 3. Rota e hook mortos

- **Remover** a rota `GET /api/arquivos/arvore` em
  `apps/server/src/rotas/arquivos.ts`.
- **Remover** o hook `useArvore` em
  `apps/web/src/aplicativos/arquivos/ganchos.ts`.
- Avaliar remoção do tipo `ItemArvore` em `packages/shared/src/arquivos.ts` se
  não houver mais consumidores.

## Tratamento de erros

Sem mudança de contrato. `mover`/`copiar` continuam lançando
`Error('MovimentoCiclico')` quando o destino está dentro da própria subárvore;
`validarPai` continua lançando `Error('PaiInvalido')`. As mensagens amigáveis no
mapeador de erros da rota permanecem.

## Testes e verificação

- **Atualizar/remover** o teste da rota `/arvore` e quaisquer testes que assumam
  SQL recursivo no caminho de arquivos.
- **Manter verdes** os testes de comportamento de mover/lixeira/restaurar/copiar/
  esvaziar — o comportamento observável é idêntico.
- `registradorSQL.test.ts` exercita `tipoDoTexto` com entradas `WITH sub ...`;
  a função continua válida (ainda detecta o tipo), então os testes permanecem —
  apenas não geramos mais esse SQL no app.
- **Verificação manual (roteiro de banca):** criar 3 itens (INSERT), renomear 1
  (UPDATE), esvaziar a lixeira (DELETE), e exibir uma view simples — confirmando
  que cada comando aparece no Monitor de SQL como SQL chapada e explicável.

## Resultado esperado

Todo SQL no caminho da demonstração é de nível iniciante e nomeado; toda a
recursão de árvore vira laço TypeScript legível. O Monitor de SQL passa a
registrar apenas comandos simples — um bônus direto para a defesa presencial.
