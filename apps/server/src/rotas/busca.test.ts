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

function buscar(base: string, cookie: string, qs: string) {
  return fetch(`${base}/api/busca/funcionarios?${qs}`, { headers: { cookie } });
}

test('sem cookie devolve 401', async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/busca/funcionarios`);
    expect(r.status).toBe(401);
  });
});

test('filtra por salário (gt) — Felipe entra, estagiária não', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await buscar(base, cookie, 'salarioOp=gt&salario=10000');
    expect(r.status).toBe(200);
    const { dados } = await r.json();
    const nomes = dados.map((f: { nome: string }) => f.nome);
    expect(nomes).toContain('Felipe Bueno');
    expect(nomes).not.toContain('Gabi Martins');
  });
});

test('filtra por departamento (Engenharia = 1) e traz o nome do depto', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await buscar(base, cookie, 'departamentoId=1');
    const { dados } = await r.json();
    expect(dados.length).toBeGreaterThanOrEqual(3);
    expect(dados.every((f: { departamento: string }) => f.departamento === 'Engenharia')).toBe(true);
  });
});

test('relacionadoA Felipe (1) traz colegas de depto/projeto e exclui o próprio', async () => {
  await comServidor(async (base) => {
    const cookie = await entrar(base);
    const r = await buscar(base, cookie, 'relacionadoA=1');
    const { dados } = await r.json();
    const ids = dados.map((f: { id: number }) => f.id);
    expect(ids).not.toContain(1); // não inclui o próprio Felipe
    expect(ids).toContain(2); // Ana: mesmo depto + projeto DBOS
  });
});
