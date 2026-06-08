import type { FastifyInstance } from 'fastify';
import type { RespostaDepartamentos, RespostaProjetos } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { listarDepartamentos, listarProjetos } from '../bd/consultasDominio';

export function registrarRotasDominio(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get(
    '/api/dominio/departamentos',
    { preHandler: autenticar },
    async (req): Promise<RespostaDepartamentos> => {
      return { ok: true, dados: await listarDepartamentos(req.sessao!.pool) };
    },
  );

  app.get(
    '/api/dominio/projetos',
    { preHandler: autenticar },
    async (req): Promise<RespostaProjetos> => {
      return { ok: true, dados: await listarProjetos(req.sessao!.pool) };
    },
  );
}
