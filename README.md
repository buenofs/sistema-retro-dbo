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
bun run db:setup            # cria e semeia o banco DBOS_RH no SQL Server
bun run dev:server          # API em http://localhost:3001
bun run dev:web             # desktop em http://localhost:5173
```

O sistema agora opera sobre o banco **DBOS_RH** (RH/folha): tabelas `Departamentos`,
`Funcionarios`, `Projetos` e `FolhaPagamento`, mais as views `vw_FolhaResumo` e
`vw_AnomaliasFolha`. Configure `SQL_BANCO=DBOS_RH` no `.env`.

Acesse `http://localhost:5173`, faça login com um login do SQL Server (ex.: `sa`).
A sessão vive num cookie httpOnly; o pool de conexão do login fica em memória no
servidor (um por sessão) e é encerrado no logout ou por inatividade.

Depois do login você cai no desktop Win98: atalhos no canto, menu **Iniciar**,
barra de tarefas com relógio, e janelas arrastáveis/redimensionáveis. Os quatro
apps (Explorador, Editor de Consultas, Grade, Propriedades) abrem como janelas
placeholder — os apps reais chegam nas próximas fases.

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

O app **Buscar** (estilo Search Companion) pesquisa funcionários por nome,
departamento, salário, projeto e por relacionamento (colegas de depto/projeto);
cada resultado tem **Abrir na grade**.

Toques de polimento: sons curtos ao abrir/fechar janelas e nos erros; clique com
o botão direito no **fundo do desktop** (abrir qualquer app) ou num **ícone**
("Abrir"); diálogos fecham no **Esc** e focam o OK ao abrir; o layout das janelas
é lembrado entre sessões (localStorage).

Ao abrir, o sistema mostra uma **tela de boot** e depois o diálogo **"Log On to
DBOS"**. O desktop exibe o nome do banco conectado e um atalho **Relatório (Folha)**
que abre a view `vw_FolhaResumo`. A Grade lista tabelas e views (views em modo
somente-leitura).

## Testes
```bash
bun run test                # todos os pacotes
```

> Acesso ao banco é feito com SQL cru (sem ORM). Identificadores em pt-BR.
