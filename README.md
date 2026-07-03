# DBOS — Database Operating System

Um sistema de arquivos que vive dentro de um banco SQL Server, disfarçado de
desktop retrô. Pastas e arquivos são linhas na tabela `Itens`; navegar, criar,
mover, renomear e apagar são operações SQL. Toda ação registra o SQL que
executou, e um Monitor mostra esses comandos ao vivo.

## Requisitos

- Bun
- SQL Server 2022 nativo (Developer/Express) instalado no Windows, com
  Mixed Mode auth e TCP/IP (porta 1433) habilitados. Sem Docker.
  (Opcional: SSMS ou DBeaver como cliente para inspecionar o banco.)

## Como rodar

```bash
bun install
cp .env.example .env        # configure SQL_SENHA (senha do sa) e SESSAO_SEGREDO
bun run db:setup            # cria e semeia o banco DBOS_SISTEMA no SQL Server
bun run dev:server          # API em http://localhost:3001
bun run dev:web             # desktop em http://localhost:5173
```

O sistema opera sobre o banco **DBOS_SISTEMA**. O esquema (`db/dbos_sistema.sql`)
define três tabelas — `Drives` (volumes: `C:`, `D:`), `Usuarios` e `Itens` (a
árvore de pastas/arquivos, uma lista de adjacência com `paiId` auto-referenciado)
— e as views `vw_UsoPorDrive`, `vw_UsoPorUsuario` e `vw_Lixeira`. O seed cria dois
drives, os usuários (felipe/ana/sistema) e uma pequena árvore inicial. Configure
`SQL_BANCO=DBOS_SISTEMA` no `.env`.

Acesse `http://localhost:5173`, faça login com um login do SQL Server (ex.: `sa`).
A sessão vive num cookie httpOnly; o pool de conexão do login fica em memória no
servidor (um por sessão) e é encerrado no logout ou por inatividade.

Depois do login você cai no desktop: atalhos no canto (com seleção, arrastar e
seleção por marquee), menu **Iniciar**, barra de tarefas com relógio, e janelas
arrastáveis/redimensionáveis cujo layout é lembrado entre sessões (localStorage).
O estilo vem do módulo próprio `apps/web/src/tema/` (tokens + `base.css`, fonte
MS Sans Serif vendorizada) e da pele **Aero** (`body[data-skin="aero"]`); ícones
são resolvidos por um manifesto a partir de `tema/icones/assets/aero/`.

## Aplicativos

**Explorador de Arquivos** — navega pela árvore de um drive, com CRUD completo:
criar pasta/arquivo e renomear inline (sem prompts do navegador), mover por
arrastar-e-soltar, copiar, e mandar para a Lixeira. Um painel acoplado mostra o
SQL da última ação.

**Terminal** — um shell estilo DOS (`C:\>`) sobre o mesmo sistema de arquivos:
`ajuda`, `limpar`/`cls`, `ls`/`dir`, `cd`, `mkdir`, `touch`, `ren`, `mv`, `cp`,
`rm`, `cat`, `echo <texto> > <arquivo>`, `lixeira`, `restaurar <id>` e `empty`.
Histórico com ↑/↓.

**Bloco de Notas** — abre um arquivo e edita seu conteúdo (grava via `UPDATE`).

**Lixeira** — lista itens apagados (soft-delete via `naLixeira`), com restaurar e
esvaziar.

**Monitor SQL** — registra ao vivo todos os comandos SQL que as ações disparam
(texto, parâmetros, linhas afetadas, tipo), alimentado automaticamente pelas
respostas da API.

**Editor de Consultas** — roda SQL livre contra o login da sessão: digite no
editor (CodeMirror) e execute com o botão ou F5. O resultado aparece numa grade
virtualizada; comandos sem retorno mostram as linhas afetadas. Há teto de linhas
e timeout de statement (`SQL_MAX_LINHAS`/`SQL_TIMEOUT_MS`), e erros do SQL Server
abrem um diálogo retrô com a mensagem e os detalhes (código do erro).

**Grade de Dados** — lê uma tabela paginada (escolha-a no seletor do app) e
permite editar, inserir e excluir linhas. Edição/exclusão usam a chave primária
(tabelas sem PK ficam somente-leitura); identificadores são validados e valores
vão sempre parametrizados. Erros de escrita aparecem no diálogo retrô.

**Explorador de Objetos** — mostra tabelas e views do banco numa árvore; expanda
um objeto para listar suas colunas (tipo, nulabilidade e 🔑 chave primária), via
SQL cru no `INFORMATION_SCHEMA`. Clique com o botão direito num objeto para abrir
**Propriedades** (tipo, contagem de colunas/linhas, datas e índices, lidos de
`sys.*`) ou **Abrir na grade**.

Toques de polimento: sons curtos ao abrir/fechar janelas e nos erros; clique com
o botão direito no **fundo do desktop** ou num **ícone** para menus de contexto;
diálogos fecham no **Esc** e focam o OK ao abrir; e uma tela de **boot** seguida
do diálogo de **login** ao iniciar.

## Testes

```bash
bun run test                # todos os pacotes
```

> Acesso ao banco é feito com SQL cru (sem ORM). Identificadores em pt-BR.
