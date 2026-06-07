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
cp .env.example .env        # configure SQL_SENHA com a senha do sa
bun run dev:server          # API em http://localhost:3001
bun run dev:web             # desktop em http://localhost:5173
```

## Testes
```bash
bun run test                # todos os pacotes
```

> Acesso ao banco é feito com SQL cru (sem ORM). Identificadores em pt-BR.
