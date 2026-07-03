import { test, expect } from 'bun:test';
import sql from 'mssql';
import { construirApp } from '../app';
import { configParaLogin } from '../bd/conexao';

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
const TABELA = '__dbos_teste_grade';
const DROP = `IF OBJECT_ID('dbo.${TABELA}', 'U') IS NOT NULL DROP TABLE dbo.${TABELA};`;

async function entrar(base: string): Promise<string> {
  const r = await fetch(`${base}/api/autenticacao/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(SA),
  });
  return r.headers.get('set-cookie')!.split(';')[0]!;
}

async function comTabelaDeTeste(fn: () => Promise<void>) {
  const pool = await new sql.ConnectionPool(configParaLogin(SA)).connect();
  await pool.request().query(DROP);
  await pool.request().query(
    `CREATE TABLE dbo.${TABELA} (id INT IDENTITY(1,1) PRIMARY KEY, nome NVARCHAR(50) NOT NULL, valor INT NULL);
     INSERT INTO dbo.${TABELA} (nome, valor) VALUES ('Ana', 10), ('Bia', 20);`,
  );
  try {
    await fn();
  } finally {
    await pool.request().query(DROP);
    await pool.close();
  }
}

function req(base: string, metodo: string, caminho: string, cookie: string, corpo?: unknown) {
  return fetch(`${base}${caminho}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', cookie },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

test('sem cookie, /grade/linhas devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/grade/linhas?esquema=dbo&tabela=x`);
    expect(r.status).toBe(401);
  });
});

test('CRUD completo paginado', async () => {
  await comTabelaDeTeste(async () => {
    await comServidor(async (base) => {
      const cookie = await entrar(base);

      let r = await req(base, 'GET', `/api/grade/linhas?esquema=dbo&tabela=${TABELA}&pagina=0&tamanho=100`, cookie);
      expect(r.status).toBe(200);
      let dados = (await r.json()).dados;
      expect(dados.chavePrimaria).toEqual(['id']);
      expect(dados.total).toBe(2);
      expect(dados.linhas.length).toBe(2);

      r = await req(base, 'POST', '/api/grade/linha', cookie, { esquema: 'dbo', tabela: TABELA, valores: { nome: 'Caio', valor: 30 } });
      expect(r.status).toBe(200);
      expect((await r.json()).dados.linhasAfetadas).toBe(1);

      r = await req(base, 'GET', `/api/grade/linhas?esquema=dbo&tabela=${TABELA}`, cookie);
      dados = (await r.json()).dados;
      expect(dados.total).toBe(3);
      const caio = dados.linhas.find((l: { nome: string }) => l.nome === 'Caio');
      expect(caio).toBeDefined();

      r = await req(base, 'PUT', '/api/grade/linha', cookie, { esquema: 'dbo', tabela: TABELA, chave: { id: caio.id }, valores: { nome: 'Caio Editado' } });
      expect(r.status).toBe(200);
      expect((await r.json()).dados.linhasAfetadas).toBe(1);

      r = await req(base, 'DELETE', '/api/grade/linha', cookie, { esquema: 'dbo', tabela: TABELA, chave: { id: caio.id } });
      expect(r.status).toBe(200);
      expect((await r.json()).dados.linhasAfetadas).toBe(1);

      r = await req(base, 'GET', `/api/grade/linhas?esquema=dbo&tabela=${TABELA}`, cookie);
      expect((await r.json()).dados.total).toBe(2);
    });
  });
});

test('insert com coluna inexistente devolve 400 de validação', async () => {
  await comTabelaDeTeste(async () => {
    await comServidor(async (base) => {
      const cookie = await entrar(base);
      const r = await req(base, 'POST', '/api/grade/linha', cookie, { esquema: 'dbo', tabela: TABELA, valores: { naoexiste: 1 } });
      expect(r.status).toBe(400);
      expect((await r.json()).erro.tipo).toBe('validacao');
    });
  });
});

test('tabela inexistente devolve 404 de validação', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await req(base, 'GET', '/api/grade/linhas?esquema=dbo&tabela=__nao_existe_zzz', cookie);
    expect(r.status).toBe(404);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});
