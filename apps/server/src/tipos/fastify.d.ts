import type { GerenciadorPools, RegistroSessao } from '../bd/gerenciadorPools';

declare module 'fastify' {
  interface FastifyInstance {
    pools: GerenciadorPools;
  }
  interface FastifyRequest {
    sessao?: RegistroSessao & { id: string };
  }
}

export {};
