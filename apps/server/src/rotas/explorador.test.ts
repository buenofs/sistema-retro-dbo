import { test, expect } from 'bun:test';
import sql from 'mssql';
import { construirApp } from '../app';
import { configParaLogin } from '../bd/conexao';

// Sobe o app numa porta efêmera e testa pela rota HTTP real.
async function comServidor(fn: (base: string) => Promise<void>) {
  const app = construirApp();
  await app.listen({ port: 0, host: '127.0.0.1' });
  try {
    const { port } = app.server.address() as { port: number };
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await app.close();
  }
}

const SA = { login: 'sa', senha: process.env.SQL_SENHA ?? '' };
const TABELA = '__dbos_teste_explorador';
const DROP = `IF OBJECT_ID('dbo.${TABELA}', 'U') IS NOT NULL DROP TABLE dbo.${TABELA};`;

async function entrar(base: string): Promise<string> {
  const r = await fetch(`${base}/api/autenticacao/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(SA),
  });
  return r.headers.get('set-cookie')!.split(';')[0]!;
}

// Cria uma tabela de teste conhecida, roda o corpo e remove no fim (via conexão direta).
async function comTabelaDeTeste(fn: () => Promise<void>) {
  const pool = await new sql.ConnectionPool(configParaLogin(SA)).connect();
  await pool.request().query(DROP);
  await pool
    .request()
    .query(`CREATE TABLE dbo.${TABELA} (id INT NOT NULL PRIMARY KEY, nome NVARCHAR(50) NULL);`);
  try {
    await fn();
  } finally {
    await pool.request().query(DROP);
    await pool.close();
  }
}

test('sem cookie, /objetos devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/explorador/objetos`);
    expect(r.status).toBe(401);
    expect((await r.json()).erro.tipo).toBe('autenticacao');
  });
});

test('/objetos lista a tabela de teste recém-criada', async () => {
  await comTabelaDeTeste(async () => {
    await comServidor(async (base) => {
      const cookie = await entrar(base);
      const r = await fetch(`${base}/api/explorador/objetos`, { headers: { cookie } });
      expect(r.status).toBe(200);
      const corpo = await r.json();
      expect(corpo.ok).toBe(true);
      const achou = corpo.dados.find(
        (o: { esquema: string; nome: string; tipo: string }) =>
          o.esquema === 'dbo' && o.nome === TABELA,
      );
      expect(achou).toBeDefined();
      expect(achou.tipo).toBe('tabela');
    });
  });
});

test('/colunas descreve as colunas (PK e nulabilidade)', async () => {
  await comTabelaDeTeste(async () => {
    await comServidor(async (base) => {
      const cookie = await entrar(base);
      const params = new URLSearchParams({ esquema: 'dbo', tabela: TABELA });
      const r = await fetch(`${base}/api/explorador/colunas?${params}`, { headers: { cookie } });
      expect(r.status).toBe(200);
      const { dados } = await r.json();
      const id = dados.find((c: { nome: string }) => c.nome === 'id');
      const nome = dados.find((c: { nome: string }) => c.nome === 'nome');
      expect(id.ehChavePrimaria).toBe(true);
      expect(id.anulavel).toBe(false);
      expect(nome.ehChavePrimaria).toBe(false);
      expect(nome.anulavel).toBe(true);
      expect(nome.tipoDado).toBe('nvarchar(50)');
    });
  });
});

test('/colunas sem parâmetros devolve 400 de validação', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/explorador/colunas`, { headers: { cookie } });
    expect(r.status).toBe(400);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});
