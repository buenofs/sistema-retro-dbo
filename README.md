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
bun run dev:server          # API em http://localhost:3001
bun run dev:web             # desktop em http://localhost:5173
```

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

## Testes
```bash
bun run test                # todos os pacotes
```

> Acesso ao banco é feito com SQL cru (sem ORM). Identificadores em pt-BR.
