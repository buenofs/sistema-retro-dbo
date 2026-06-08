import { test, expect } from 'bun:test';
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
  return r.headers.get('set-cookie')!.split(';')[0];
}

test('sem cookie devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/dominio/departamentos`);
    expect(r.status).toBe(401);
  });
});

test('lista os 3 departamentos do seed', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/dominio/departamentos`, { headers: { cookie } });
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    const nomes = dados.map((d: { nome: string }) => d.nome);
    expect(dados.length).toBe(3);
    expect(nomes).toContain('Engenharia');
  });
});

test('lista os 3 projetos do seed', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/dominio/projetos`, { headers: { cookie } });
    const { dados } = await r.json();
    expect(dados.length).toBe(3);
    expect(dados.map((p: { nome: string }) => p.nome)).toContain('DBOS');
  });
});
