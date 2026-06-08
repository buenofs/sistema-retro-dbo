import type { GerenciadorPools, RegistroSessao } from '../bd/gerenciadorPools';

declare module 'fastify' {
  interface FastifyInstance {
    pools: GerenciadorPools;
  }
  interface FastifyRequest {
    // Preenchido pelo preHandler 'autenticar' em rotas protegidas.
    sessao?: RegistroSessao & { id: string };
  }
}

export {};
