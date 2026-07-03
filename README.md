# DBOS — Database Operating System

SQL database management disguised as a retro Win98 desktop OS.

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

O sistema opera sobre o banco **DBOS_SISTEMA**: um sistema de arquivos simulado
sobre SQL, com as tabelas `Drives`, `Usuarios` e `Itens` (pastas e arquivos, com
auto-FK `paiId`), mais as views `vw_ArvoreItens`, `vw_UsoPorUsuario`,
`vw_UsoPorDrive` e `vw_Lixeira`. Configure `SQL_BANCO=DBOS_SISTEMA` no `.env`.

Acesse `http://localhost:5173`, faça login com um login do SQL Server (ex.: `sa`).
A sessão vive num cookie httpOnly; o pool de conexão do login fica em memória no
servidor (um por sessão) e é encerrado no logout ou por inatividade.

Depois do login você cai no desktop Win98: atalhos no canto, menu **Iniciar**,
barra de tarefas com relógio, e janelas arrastáveis/redimensionáveis. Os quatro
apps (Explorador, Editor de Consultas, Grade, Propriedades) abrem como janelas
placeholder — os apps reais chegam nas próximas fases.

O estilo do desktop vem do módulo próprio `apps/web/src/tema/` (tokens +
`base.css`, fonte MS Sans Serif vendorizada). A dependência `98.css` foi
removida. A pele é trocável por `body[data-skin]` (`98` | `aero`); por ora só
a pele `98` está implementada (revamp visual — Fase 0/costura).

O **Explorador de Objetos** já é funcional: abra-o pelo atalho ou pelo menu Iniciar
para ver as tabelas e views do banco numa árvore; expanda um objeto para listar
suas colunas (tipo, nulabilidade e 🔑 chave primária), via SQL cru no
`INFORMATION_SCHEMA`. Há uma caixa de filtro no topo. Os outros três apps ainda
são placeholders.

O **Editor de Consultas** roda SQL livre contra o login da sessão: digite no
editor (CodeMirror) e execute com o botão ou F5. O resultado aparece numa grade
virtualizada; comandos sem retorno mostram as linhas afetadas. Há teto de linhas
e timeout de statement (`SQL_MAX_LINHAS`/`SQL_TIMEOUT_MS`), e erros do SQL Server
abrem um diálogo retrô com a mensagem e os detalhes (código do erro).

A **Grade de Dados** lê uma tabela paginada (escolha-a no seletor do app) e
permite editar, inserir e excluir linhas. Edição/exclusão usam a chave primária
(tabelas sem PK ficam somente-leitura); identificadores são citados e validados,
e valores vão sempre parametrizados. Erros de escrita aparecem no diálogo retrô.

No **Explorador**, clique com o botão direito num objeto para abrir o menu de
contexto: **Propriedades** abre uma janela com tipo, contagem de colunas/linhas,
datas e os **índices** (lidos de `sys.*`); **Abrir na grade** abre a tabela na
Grade de Dados.

O **Explorador de Arquivos** é a GUI principal do sistema de arquivos: árvore de
pastas à esquerda, conteúdo da pasta atual à direita. Criar/renomear/mover/copiar/
apagar pastas e arquivos, com menu de contexto e arrastar-soltar; cada ação
dispara um INSERT/UPDATE/DELETE real. Duplo clique num arquivo abre o **Bloco de
Notas**, que edita o conteúdo e salva com `UPDATE`.

O **Monitor SQL** mostra em tempo real cada comando disparado pelas ações da GUI
e do Terminal: hora, ação, SQL parametrizado com os valores resolvidos, e linhas
afetadas.

A **Lixeira** lista os itens apagados (soft-delete, `naLixeira=1`), com
**Restaurar** e **Esvaziar** (delete físico).

O app **Terminal** é um prompt DOS (`C:\Docs>`) sobre o mesmo sistema de
arquivos: `ajuda`, `limpar`, `ls`/`dir`, `cd <pasta>`, `mkdir <nome>`,
`touch <nome>`, `ren <nome> <novo>`, `mv`/`cp <nome> <pasta>`, `rm <nome>`
(manda para a Lixeira), `cat <arquivo>`, `echo <texto> > <arquivo>`, `lixeira`,
`restaurar <id>` e `empty`. Histórico com ↑/↓.

Toques de polimento: sons curtos ao abrir/fechar janelas e nos erros; clique com
o botão direito no **fundo do desktop** (abrir qualquer app) ou num **ícone**
("Abrir"); diálogos fecham no **Esc** e focam o OK ao abrir; o layout das janelas
é lembrado entre sessões (localStorage).

Ao abrir, o sistema mostra uma **tela de boot** e depois o diálogo **"Log On to
DBOS"**. O desktop exibe o nome do banco conectado. A Grade lista tabelas e
views (views em modo somente-leitura).

## Testes
```bash
bun run test                # todos os pacotes
```

> Acesso ao banco é feito com SQL cru (sem ORM). Identificadores em pt-BR.
