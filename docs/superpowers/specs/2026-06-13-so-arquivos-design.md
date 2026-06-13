# DBOS — SO de Arquivos (sistema de arquivos sobre banco de dados)

**Data:** 2026-06-13
**Status:** Aprovado (design)
**Branch alvo:** `feat/so-arquivos`

## Contexto e objetivo

O projeto era um sistema de RH (departamentos, folha de pagamento, funcionários)
disfarçado de sistema operacional retrô ("DBOS"). O conceito não tinha coesão: um
"SO" que mostra folha de pagamento não faz sentido.

Este pivô transforma o DBOS num **simulador de SO de verdade**, onde cada ação do
sistema (criar pasta, criar arquivo, mover, copiar, apagar, listar) é, por baixo,
uma **operação SQL real** (INSERT/UPDATE/DELETE/SELECT/VIEW). O sistema de arquivos
**é** o banco de dados.

### Foco da avaliação (o que o professor avalia)

Definido com o usuário, em ordem de importância:

1. **SQL puro (DDL/DML)** — CREATE TABLE, INSERT, UPDATE, DELETE, VIEWs visíveis e
   demonstráveis.
2. **Modelagem (PK/FK, relacionamentos)** — integridade referencial, FK
   auto-referenciada, normalização.
3. **Views e consultas** — VIEWs e SELECTs interessantes (árvore de diretórios, uso
   por usuário/drive, lixeira).

A "cara de SO" é o veículo de apresentação; a nota vem do banco.

### Decisões de escopo (tomadas no brainstorming)

- **Riqueza do modelo:** médio — itens (pastas/arquivos) + **Usuários** (dono) +
  **Drives** (volumes). Sem permissões/processos por ora (YAGNI).
- **Interação:** GUI amigável **e** Terminal, ambos batendo no mesmo SQL.
- **Visibilidade do SQL:** **Monitor SQL ao vivo** — painel que mostra cada comando
  executado em tempo real.
- **Modelagem do filesystem:** **lista de adjacência** — uma tabela `Itens` com
  auto-FK `paiId` (abordagem A; rejeitadas: B tabelas separadas, C closure table).
- **Apps mantidos:** Explorador de Objetos, Editor de Consultas, Grade de Dados
  (viram ferramentas de inspeção do banco).
- **Apps removidos:** Folha, Busca de funcionários, Relacionamentos — e todo o
  domínio RH.

---

## Seção 1 — Modelo de dados

Três tabelas + quatro views, em `dbo`, SQL Server.

### Tabela `Drives` (volumes)

| coluna | tipo | nota |
|---|---|---|
| `id` | INT IDENTITY | **PK** |
| `letra` | CHAR(1) **UNIQUE** | `'C'`, `'D'`... |
| `rotulo` | NVARCHAR(50) | "Sistema", "Dados" |
| `capacidadeBytes` | BIGINT | para view de espaço livre |

### Tabela `Usuarios` (donos dos arquivos)

| coluna | tipo | nota |
|---|---|---|
| `id` | INT IDENTITY | **PK** |
| `login` | NVARCHAR(50) **UNIQUE** | |
| `nome` | NVARCHAR(100) | |

Tabela de domínio para "dono". Separada do login do SQL Server que a autenticação
existente usa.

### Tabela `Itens` (pastas **e** arquivos — o coração)

| coluna | tipo | nota |
|---|---|---|
| `id` | INT IDENTITY | **PK** |
| `nome` | NVARCHAR(255) NOT NULL | |
| `tipo` | VARCHAR(10) NOT NULL | **CHECK** `IN ('pasta','arquivo')` |
| `paiId` | INT NULL | **FK → Itens(id)** (auto-referência; NULL = raiz do drive) |
| `driveId` | INT NOT NULL | **FK → Drives(id)** |
| `donoId` | INT NOT NULL | **FK → Usuarios(id)** |
| `conteudo` | NVARCHAR(MAX) NULL | texto do arquivo; NULL em pasta |
| `tamanhoBytes` | AS `DATALENGTH(conteudo)` | coluna **computada** |
| `criadoEm` | DATETIME2 DEFAULT SYSDATETIME() | |
| `modificadoEm` | DATETIME2 NULL | |
| `naLixeira` | BIT NOT NULL DEFAULT 0 | soft-delete (lixeira) |

Constraints adicionais: **`UNIQUE(paiId, nome)`** (sem nome repetido na mesma pasta)
e os três FKs acima.

### Views (vitrine de SELECT)

1. **`vw_ArvoreItens`** — **CTE recursiva** que monta o caminho completo
   (`C:\Docs\Sub\nota.txt`) e a profundidade de cada item. Destaque de modelagem.
2. **`vw_UsoPorUsuario`** — `SUM(tamanhoBytes)` e contagem `GROUP BY` dono.
3. **`vw_UsoPorDrive`** — uso vs. `capacidadeBytes` por drive (espaço livre).
4. **`vw_Lixeira`** — itens com `naLixeira = 1`.

### Decisões de design embutidas

- **Soft-delete (`naLixeira`):** "Apagar" = mover para a Lixeira = **UPDATE**
  `naLixeira=1`. "Esvaziar Lixeira" = **DELETE** físico. Demonstra UPDATE e DELETE
  naturalmente e rende a view `vw_Lixeira`.
- **Delete físico de pasta** usa **CTE recursiva** para juntar descendentes (SQL
  Server não permite `ON DELETE CASCADE` em FK auto-referenciada).
- Regras "arquivo não pode ser pai" e "pai precisa ser pasta" validadas na camada de
  aplicação (servidor), mantendo o schema limpo.

Cobertura de conceitos: PK em tudo, três FKs (uma auto-referenciada), CHECK, UNIQUE,
coluna computada, CTE recursiva e quatro views.

---

## Seção 2 — Mapa: Ação de SO → SQL

Cada ação tem um caminho na GUI e um comando no Terminal; ambos disparam o **mesmo
SQL**, que aparece no Monitor SQL ao vivo.

| Ação | GUI | Terminal | SQL |
|---|---|---|---|
| Listar pasta | abrir pasta | `ls` / `dir` | `SELECT * FROM Itens WHERE paiId=@pai AND driveId=@drive AND naLixeira=0 ORDER BY tipo, nome` |
| Criar pasta | botão direito → Nova Pasta | `mkdir <nome>` | `INSERT INTO Itens (nome,tipo,paiId,driveId,donoId) VALUES (@nome,'pasta',@pai,@drive,@dono)` |
| Criar arquivo | botão direito → Novo Arquivo | `touch <nome>` | `INSERT INTO Itens (nome,tipo,paiId,driveId,donoId,conteudo) VALUES (@nome,'arquivo',@pai,@drive,@dono,'')` |
| Renomear | F2 | `ren <id> <novo>` | `UPDATE Itens SET nome=@novo, modificadoEm=SYSDATETIME() WHERE id=@id` |
| Mover | arrastar e soltar | `mv <id> <paiDestino>` | `UPDATE Itens SET paiId=@destino, modificadoEm=SYSDATETIME() WHERE id=@id` |
| Editar conteúdo | abrir → salvar | `echo <texto> > <id>` | `UPDATE Itens SET conteudo=@texto, modificadoEm=SYSDATETIME() WHERE id=@id` |
| Copiar arquivo | Ctrl+C/Ctrl+V | `cp <id> <paiDestino>` | `INSERT INTO Itens (nome,tipo,paiId,driveId,donoId,conteudo) SELECT nome,tipo,@destino,driveId,@dono,conteudo FROM Itens WHERE id=@id` |
| Copiar pasta | Ctrl+C/Ctrl+V | `cp <id> <paiDestino>` | leitura recursiva de `vw_ArvoreItens` + INSERTs nível a nível (transação) |
| Apagar (→ Lixeira) | Del | `rm <id>` | `UPDATE Itens SET naLixeira=1 WHERE id IN (<subárvore via CTE>)` |
| Restaurar | botão na Lixeira | `restore <id>` | `UPDATE Itens SET naLixeira=0 WHERE id IN (<subárvore via CTE>)` |
| Esvaziar Lixeira | botão Esvaziar | `empty` | `DELETE FROM Itens WHERE naLixeira=1` |
| Propriedades / uso | botão direito → Propriedades | `du` / `stat <id>` | `SELECT * FROM vw_ArvoreItens WHERE id=@id` / `SELECT * FROM vw_UsoPorDrive` |

### Detalhes

- **Mover/apagar pasta afeta a subárvore.** Apagar marca a pasta e todos os
  descendentes (`naLixeira=1`) via CTE recursiva + um único `UPDATE ... WHERE id IN
  (...)`. Mover muda só o `paiId` da pasta — os filhos seguem o pai
  automaticamente.
- **Validações no servidor** antes do SQL: pai precisa ser `tipo='pasta'`; nome único
  na pasta (constraint + checagem amigável); não mover/copiar pasta para dentro de si
  mesma (via `vw_ArvoreItens`).
- **`@dono` e `@drive`** vêm do contexto da sessão/explorador — nunca pedidos como
  "digite um ID". (Era a dor original do usuário.)
- No Terminal, `<id>` pode ser o **nome** do item na pasta atual; o shell resolve
  nome→id antes de montar o SQL (`rm relatorio.txt`).

---

## Seção 3 — Arquitetura dos apps e telas

Gerenciador de janelas, tema (98/Aero) e barra de tarefas **não mudam** — são
genéricos. Muda o conjunto de apps em `registroApps.tsx` e o union `TipoApp`.

### Apps novos

**1. Explorador de Arquivos** (GUI principal)
- Duas colunas: árvore de pastas à esquerda, conteúdo da pasta atual à direita.
- Barra de endereço (`C:\Docs\Sub`), navegação voltar/avançar/acima.
- Menu de contexto: Nova Pasta, Novo Arquivo, Renomear, Copiar, Colar, Apagar,
  Propriedades.
- Arrastar-soltar move; Del → Lixeira; F2 renomeia; duplo clique abre pasta ou
  arquivo (no Bloco de Notas).
- Sem "digite o ID": dono e drive vêm do contexto; destino de mover/copiar é a pasta
  escolhida.

**2. Terminal** (reaproveita o app atual; reescreve o parser)
- Ganha diretório atual (`cd`) e prompt dinâmico (`C:\Docs>`).
- Comandos: `ls`/`dir`, `cd`, `mkdir`, `touch`, `ren`, `mv`, `cp`, `rm`,
  `echo ... > arquivo`, `cat`, `restore`, `empty`, `du`, `stat`, `help`.
- Resolve nome→id na pasta atual.

**3. Monitor SQL** (novo)
- Lista em tempo real: hora · ação · tipo · SQL com parâmetros · linhas afetadas.
- Detalhado na Seção 5.

**4. Bloco de Notas** (novo, pequeno)
- Abre ao dar duplo clique num arquivo; `textarea` com `conteudo`; Salvar dispara
  `UPDATE conteudo`.

**5. Lixeira** (ícone na área de trabalho)
- Abre o Explorador em "modo lixeira" (lista `vw_Lixeira`) com Restaurar e Esvaziar.
  Um modo do Explorador, não um app separado.

### Apps mantidos (inspeção do banco, sem mudança funcional)

- **Explorador de Objetos** — navega tabelas `Itens`/`Usuarios`/`Drives` e as 4 views.
- **Editor de Consultas** — roda SQL à mão.
- **Grade de Dados** — CRUD genérico em qualquer tabela.
- **Propriedades** — metadados de uma tabela (colunas, índices, constraints, PK/FK);
  reforça a demonstração de modelagem.

### Apps removidos

- **Folha**, **Busca de funcionários**, **Relacionamentos**.

### Fluxo de dados

- Cada app fala com `/api/arquivos/*` via React Query (padrão `ganchos.ts` atual).
- Store global de contexto (Zustand): drive atual + usuário logado, compartilhado por
  Explorador e Terminal.
- Store global de log SQL (Zustand): toda resposta de mutação traz o SQL executado;
  um `onSuccess` global empurra para o log; o Monitor SQL apenas assina o store.

Registro final de apps: **Explorador de Arquivos, Terminal, Monitor SQL, Bloco de
Notas** (novos) + **Explorador de Objetos, Editor de Consultas, Grade de Dados,
Propriedades** (mantidos). Lixeira como ícone/modo.

---

## Seção 4 — Backend: rotas e camada de banco

Segue os padrões existentes (rotas Fastify com `preHandler: autenticar`, módulos
`consultas*.ts` em `bd/`, contratos Zod em `packages/shared`).

### Arquivos novos

- `packages/shared/src/arquivos.ts` — tipos + schemas Zod.
- `apps/server/src/rotas/arquivos.ts` — rotas Fastify.
- `apps/server/src/bd/consultasArquivos.ts` — o SQL.
- `apps/server/src/bd/registradorSQL.ts` — captura o SQL executado.

### Rotas (`/api/arquivos/*`)

| Método + rota | Ação | SQL |
|---|---|---|
| `GET /listar?paiId&driveId` | conteúdo da pasta | SELECT |
| `GET /arvore?driveId` | árvore | `vw_ArvoreItens` |
| `GET /drives` / `GET /uso` | drives / uso | SELECT / `vw_UsoPorDrive` |
| `POST /pasta` | criar pasta | INSERT |
| `POST /arquivo` | criar arquivo | INSERT |
| `PUT /:id/renomear` | renomear | UPDATE nome |
| `PUT /:id/mover` | mover | UPDATE paiId |
| `PUT /:id/conteudo` | salvar arquivo | UPDATE conteudo |
| `POST /:id/copiar` | copiar | INSERT (recursivo p/ pasta) |
| `DELETE /:id` | mandar p/ Lixeira | UPDATE naLixeira=1 (subárvore) |
| `GET /lixeira` | listar lixeira | `vw_Lixeira` |
| `PUT /:id/restaurar` | restaurar | UPDATE naLixeira=0 (subárvore) |
| `DELETE /lixeira` | esvaziar | DELETE |

Todas com `preHandler: autenticar` e body validado por Zod no `shared`.

### Captador de SQL (`registradorSQL.ts`)

Em vez de `pool.request().query(...)` direto, as funções de `consultasArquivos.ts`
recebem um **registrador** e chamam `reg.executar(pool, { acao, texto, parametros,
tipos })`, que: (1) roda a query parametrizada; (2) grava `{ acao, texto, parametros,
linhasAfetadas, em }`; (3) devolve o recordset. No fim do handler, a rota responde
`{ ok: true, dados, sql: reg.comandos }`. O SQL mostrado no Monitor é literalmente o
executado. Estende o envelope `Resposta<T>` com um campo opcional `sql`.

### Operações recursivas

- **Apagar/Restaurar pasta** → CTE recursiva coleta ids da subárvore + um único
  `UPDATE ... WHERE id IN (SELECT id FROM subarvore)`.
- **Copiar pasta** → lê a subárvore via `vw_ArvoreItens` e re-insere nível a nível
  remapeando `paiId`, dentro de uma **transação**.
- **Esvaziar Lixeira** → `DELETE FROM Itens WHERE naLixeira=1` num só comando (o
  conjunto é fechado — pai e filhos sempre vão juntos para a lixeira —, então a FK
  auto-referenciada é satisfeita ao fim do statement).

### Validações no servidor

- pai precisa existir e ser `tipo='pasta'`;
- não mover/copiar pasta para dentro de si mesma (via `vw_ArvoreItens`);
- nome único na pasta (constraint `UNIQUE` + validação para erro amigável).

### Segurança

Nomes de tabela/coluna são **fixos no código**; só os **valores** são
parametrizados. Superfície de injeção praticamente nula (diferente da Grade
genérica, que monta identificadores dinâmicos).

### Seed (`db/dbos_sistema.sql`, substitui `dbos_rh.sql`)

Cria as 3 tabelas + 4 views e popula: drives `C:`/`D:`, 2–3 usuários, e uma árvore
inicial estilo Windows (`C:\Windows`, `C:\Usuarios\...`, alguns `.txt`).

---

## Seção 5 — Monitor SQL ao vivo + tratamento de erros

### Coleta no frontend

- Store Zustand `lojaLogSQL`: `{ comandos, registrar(cmds), limpar() }`, teto de
  ~200 entradas (descarta antigas).
- No `QueryClient` global, um `onSuccess`/`onError` em `MutationCache`/`QueryCache` lê
  o campo `sql` de **qualquer** resposta e empurra para o store. Nenhum app precisa de
  código especial.

### O que é logado

Tudo: INSERT/UPDATE/DELETE e os SELECT de leitura (`ls`, abrir pasta, propriedades).
Toggle "incluir SELECTs" (ligado por padrão) para reduzir ruído quando desejado.

### Tela do Monitor SQL

Cada linha: hora · ação · badge do tipo · SQL · linhas afetadas. Por comando:

- texto **parametrizado** (`INSERT ... VALUES (@nome, 'pasta', @pai, ...)`);
- **prévia resolvida** com valores substituídos (`... VALUES ('Documentos', 'pasta',
  3, ...)`);
- botão **"Copiar pro Editor de Consultas"**.

Controles: filtro por tipo, pausar, limpar, auto-scroll. Log em memória, por sessão
(não persiste).

### Tratamento de erros

- **Servidor:** reaproveita o plugin `tratadorErros` (devolve `Resposta` com
  `erro: { tipo, mensagem, detalhe }`). Mapeamento:
  - `UNIQUE` (SQL Server 2627/2601) → `NomeDuplicado`: "Já existe um item com esse
    nome nesta pasta.";
  - pai inexistente/não-pasta → `PaiInvalido`;
  - mover para dentro de si mesma → `MovimentoCiclico`;
  - item inexistente → `ItemNaoEncontrado`.
- **Frontend:** `GerenciadorDialogos` (já existe) mostra diálogo de erro retrô.
- **O erro também aparece no Monitor:** o `registradorSQL` captura a falha (grava o
  comando com marca de erro + a mensagem do banco) antes de relançar — o professor vê
  a constraint rejeitando o INSERT.

---

## Seção 6 — Migração + testes

### Remoção do RH — inventário

- **Banco:** `db/dbos_rh.sql` → `db/dbos_sistema.sql`. `configurarBanco.ts`
  (`bun db:setup`) aponta para o novo arquivo.
- **`packages/shared`:** remove `dominio.ts`, `busca.ts`, `relacionamentos.ts`,
  `folha.ts`; adiciona `arquivos.ts`; atualiza `index.ts`.
- **`apps/server`:** remove rotas `busca.ts`, `relacionamentos.ts`, `folha.ts`,
  `dominio.ts` e suas `consultas*.ts`; remove o registro em `app.ts`; adiciona
  `rotas/arquivos.ts` + `bd/consultasArquivos.ts` + `bd/registradorSQL.ts`.
- **`apps/web`:** remove `aplicativos/folha`, `aplicativos/busca`,
  `aplicativos/relacionamentos`; adiciona `aplicativos/arquivos`,
  `aplicativos/monitor`, `aplicativos/bloco`; reescreve
  `aplicativos/terminal/comandos.ts`.
- **Gerenciador de janelas:** atualiza `TipoApp` em `areaTrabalho/tipos.ts`, e
  `registroApps.tsx` + `ORDEM_APPS` — saem `busca`/`relacionamentos`/`relatorio`;
  entram `arquivos`/`monitor`/`bloco`; ficam
  `explorador`/`consulta`/`grade`/`propriedades`/`terminal`.
- **Ícones:** reaproveita os existentes (`newdoc`→arquivo, `trash`→lixeira,
  `folder`/`folderOpen` servem) e adiciona os que faltarem (ex.: `drive`, `monitor`)
  nas duas peles (98 e Aero).
- **Branding:** limpa textos de RH remanescentes (boot/logon, títulos). "DBOS" segue
  como nome do "SO".

### Segurança da migração

Pivô destrutivo (derruba o domínio RH). Tudo na branch `feat/so-arquivos`, com
commits por fase. O banco antigo só é derrubado ao rodar `db:setup` no novo schema.

### Estratégia de testes (proporcional a um projeto escolar)

- **Unitários (Vitest, sem banco)** no que é lógica pura:
  - parser do Terminal (split, resolução nome→id, prompt/caminho);
  - detecção de ciclo ao mover;
  - remapeamento de `paiId` na cópia de subárvore;
  - shape dos builders de SQL (texto + parâmetros) e dos schemas Zod.
- **Verificação manual guiada:** roteiro de demo (criar pasta → arquivo → renomear →
  mover → copiar → apagar → restaurar → esvaziar) confirmando que cada ação aparece
  no Monitor com o SQL certo.
- Sem testes de integração com banco real (custo alto, ganho baixo para o escopo);
  a camada SQL é validada pelo roteiro manual + testes de shape dos builders.

---

## Resumo

1. **Modelo:** `Drives`, `Usuarios`, `Itens` (auto-FK) + 4 views (árvore recursiva,
   uso/usuário, uso/drive, lixeira).
2. **Ações→SQL:** CRUD completo mapeado; GUI e Terminal no mesmo SQL.
3. **Apps:** Explorador de Arquivos, Terminal, Monitor SQL, Bloco de Notas (novos) +
   Explorador de Objetos, Editor de Consultas, Grade (mantidos); Lixeira como modo.
4. **Backend:** rotas `/api/arquivos/*`, `consultasArquivos.ts`, `registradorSQL.ts`.
5. **Monitor SQL ao vivo** + erros visíveis (constraints rejeitando).
6. **Migração** em branch + testes nas partes puras.
