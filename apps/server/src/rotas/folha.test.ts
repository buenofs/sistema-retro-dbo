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

test('sem cookie, /folha/relatorio devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/folha/relatorio`);
    expect(r.status).toBe(401);
    expect((await r.json()).erro.tipo).toBe('autenticacao');
  });
});

test('com sessão, devolve departamentos, total e anomalias', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await fetch(`${base}/api/folha/relatorio`, { headers: { cookie } });
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    expect(Array.isArray(dados.departamentos)).toBe(true);
    expect(typeof dados.totalGeral).toBe('number');
    expect(Array.isArray(dados.anomalias)).toBe(true);
    if (dados.departamentos.length > 0) {
      const d = dados.departamentos[0];
      expect(typeof d.departamento).toBe('string');
      expect(typeof d.funcionarios).toBe('number');
      expect(typeof d.totalLiquido).toBe('number');
    }
  });
});
