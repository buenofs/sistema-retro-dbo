import Fastify, { type FastifyInstance } from 'fastify';
import type { Resposta } from '@dbos/shared';

// Constrói a instância do Fastify com as rotas registradas.
// Separado de index.ts para permitir testes via inject().
export function construirApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/api/saude', async (): Promise<Resposta<{ status: string }>> => {
    return { ok: true, dados: { status: 'ok' } };
  });

  return app;
}
