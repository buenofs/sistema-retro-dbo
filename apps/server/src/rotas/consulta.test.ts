import { test, expect, afterEach } from 'bun:test';
import { construirApp } from '../app';

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

async function entrar(base: string): Promise<string> {
  const r = await fetch(`${base}/api/autenticacao/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(SA),
  });
  return r.headers.get('set-cookie')!.split(';')[0]!;
}

function consultar(base: string, cookie: string, sql: string) {
  return fetch(`${base}/api/consulta`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ sql }),
  });
}

afterEach(() => {
  delete process.env.SQL_MAX_LINHAS;
});

test('sem cookie, /consulta devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/consulta`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sql: 'SELECT 1' }),
    });
    expect(r.status).toBe(401);
    expect((await r.json()).erro.tipo).toBe('autenticacao');
  });
});

test('SELECT simples devolve colunas e linhas', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await consultar(base, cookie, 'SELECT 1 AS um, 2 AS dois');
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    expect(dados.colunas).toEqual(['um', 'dois']);
    expect(dados.linhas).toEqual([[1, 2]]);
    expect(dados.truncado).toBe(false);
  });
});

test('SQL inválido devolve erro tipo sql com codigoSql 208', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await consultar(base, cookie, 'SELECT * FROM tabela_inexistente_xyz_123');
    expect(r.status).toBe(400);
    const { erro } = await r.json();
    expect(erro.tipo).toBe('sql');
    expect(erro.codigoSql).toBe(208); // Invalid object name
  });
});

test('corpo sem sql devolve 400 de validação', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/consulta`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ sql: '' }),
    });
    expect(r.status).toBe(400);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});

test('teto de linhas marca truncado e corta as linhas', async () => {
  process.env.SQL_MAX_LINHAS = '2'; // lido por construirApp dentro de comServidor
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await consultar(base, cookie, 'SELECT n FROM (VALUES (1),(2),(3)) AS t(n)');
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    expect(dados.totalLinhas).toBe(3);
    expect(dados.truncado).toBe(true);
    expect(dados.linhas.length).toBe(2);
  });
});
