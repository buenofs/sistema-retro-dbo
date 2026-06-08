import { test, expect } from 'bun:test';
import { construirApp } from '../app';

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

function postar(base: string, caminho: string, corpo: unknown, cookie?: string) {
  return fetch(`${base}${caminho}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(corpo),
  });
}

test('login com credenciais válidas devolve cookie e usuário', async () => {
  await comServidor(async (base) => {
    const r = await postar(base, '/api/autenticacao/login', SA);
    expect(r.status).toBe(200);
    expect(r.headers.get('set-cookie')).toContain('dbos_sid');
    expect(await r.json()).toEqual({
      ok: true,
      dados: { login: 'sa', banco: process.env.SQL_BANCO },
    });
  });
});

test('login com senha errada devolve 401 de autenticação', async () => {
  await comServidor(async (base) => {
    const r = await postar(base, '/api/autenticacao/login', {
      login: 'sa',
      senha: 'senha-errada-xyz-123',
    });
    expect(r.status).toBe(401);
    const corpo = await r.json();
    expect(corpo.ok).toBe(false);
    expect(corpo.erro.tipo).toBe('autenticacao');
  });
});

test('login com corpo inválido devolve 400 de validação', async () => {
  await comServidor(async (base) => {
    const r = await postar(base, '/api/autenticacao/login', { login: '' });
    expect(r.status).toBe(400);
    expect((await r.json()).erro.tipo).toBe('validacao');
  });
});

test('sessão sem cookie devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/autenticacao/sessao`);
    expect(r.status).toBe(401);
    expect((await r.json()).erro.tipo).toBe('autenticacao');
  });
});

test('fluxo completo: login → sessão → logout → 401', async () => {
  await comServidor(async (base) => {
    const login = await postar(base, '/api/autenticacao/login', SA);
    const cookie = login.headers.get('set-cookie')!.split(';')[0];

    const sessao = await fetch(`${base}/api/autenticacao/sessao`, {
      headers: { cookie },
    });
    expect(sessao.status).toBe(200);
    expect((await sessao.json()).dados.login).toBe('sa');

    const logout = await postar(base, '/api/autenticacao/logout', {}, cookie);
    expect(logout.status).toBe(200);

    const depois = await fetch(`${base}/api/autenticacao/sessao`, {
      headers: { cookie },
    });
    expect(depois.status).toBe(401);
  });
});
