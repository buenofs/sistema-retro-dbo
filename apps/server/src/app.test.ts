import { test, expect } from 'bun:test';
import { construirApp } from './app';

// Sobe o app numa porta efêmera e testa pela rota HTTP real.
// Nota: não usamos app.inject() porque o light-my-request (helper do Fastify)
// é incompatível com o runtime do Bun. O servidor HTTP real funciona normalmente.
test('GET /api/saude responde ok', async () => {
  const app = construirApp();
  await app.listen({ port: 0, host: '127.0.0.1' });

  try {
    const { port } = app.server.address() as { port: number };
    const resposta = await fetch(`http://127.0.0.1:${port}/api/saude`);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ ok: true, dados: { status: 'ok' } });
  } finally {
    await app.close();
  }
});
