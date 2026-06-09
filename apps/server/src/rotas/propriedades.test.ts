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
const TABELA = '__dbos_teste_props';
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
    `CREATE TABLE dbo.${TABELA} (id INT IDENTITY(1,1) PRIMARY KEY, nome NVARCHAR(50) NOT NULL);
     CREATE INDEX IX_props_nome ON dbo.${TABELA} (nome);
     INSERT INTO dbo.${TABELA} (nome) VALUES ('Ana'), ('Bia');`,
  );
  try {
    await fn();
  } finally {
    await pool.request().query(DROP);
    await pool.close();
  }
}

test('sem cookie, /propriedades devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/propriedades?esquema=dbo&tabela=x`);
    expect(r.status).toBe(401);
  });
});

test('propriedades de uma tabela: tipo, colunas e índices', async () => {
  await comTabelaDeTeste(async () => {
    await comServidor(async (base) => {
      const cookie = await entrar(base);
      const r = await fetch(`${base}/api/propriedades?esquema=dbo&tabela=${TABELA}`, {
        headers: { cookie },
      });
      expect(r.status).toBe(200);
      const { dados } = await r.json();
      expect(dados.tipo).toBe('tabela');
      expect(dados.totalColunas).toBe(2);
      expect(typeof dados.totalLinhas).toBe('number');

      const pk = dados.indices.find((i: { chavePrimaria: boolean }) => i.chavePrimaria);
      expect(pk).toBeDefined();
      expect(pk.colunas).toContain('id');

      const ix = dados.indices.find((i: { nome: string }) => i.nome === 'IX_props_nome');
      expect(ix).toBeDefined();
      expect(ix.unico).toBe(false);
      expect(ix.colunas).toContain('nome');
    });
  });
});

test('objeto inexistente devolve 404 de validação', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/propriedades?esquema=dbo&tabela=__nao_existe_zzz`, {
      headers: { cookie },
    });
    expect(r.status).toBe(404);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});
