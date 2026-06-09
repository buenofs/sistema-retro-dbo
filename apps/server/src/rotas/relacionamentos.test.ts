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
  return r.headers.get('set-cookie')!.split(';')[0]!;
}

test('sem cookie devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/relacionamentos?tipo=funcionario&id=1`);
    expect(r.status).toBe(401);
  });
});

test('grafo do Felipe (1): centro + departamento + projetos + folha', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/relacionamentos?tipo=funcionario&id=1`, { headers: { cookie } });
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    expect(dados.centro).toBe('funcionario:1');
    const tipos = dados.nos.map((n: { tipo: string }) => n.tipo);
    expect(tipos).toContain('departamento');
    expect(tipos).toContain('projeto');
    // Felipe está em 2 projetos (DBOS, Intranet)
    const projetos = dados.nos.filter((n: { tipo: string }) => n.tipo === 'projeto');
    expect(projetos.length).toBe(2);
    // toda aresta parte do centro
    expect(dados.arestas.every((a: { de: string }) => a.de === 'funcionario:1')).toBe(true);
  });
});

test('parâmetros inválidos devolvem 400', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/relacionamentos?tipo=pessoa&id=1`, { headers: { cookie } });
    expect(r.status).toBe(400);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});
