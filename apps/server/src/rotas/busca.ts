import type { FastifyInstance } from 'fastify';
import { esquemaBusca, type RespostaBusca } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { buscarFuncionarios } from '../bd/consultasBusca';

export function registrarRotasBusca(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/busca/funcionarios', { preHandler: autenticar }, async (req, reply) => {
    const analise = esquemaBusca.safeParse(req.query);
    if (!analise.success) {
      return reply.status(400).send({
        ok: false,
        erro: { tipo: 'validacao', mensagem: 'Filtros inválidos.', detalhe: analise.error.issues[0]?.message },
      });
    }
    const dados = await buscarFuncionarios(req.sessao!.pool, analise.data);
    const resposta: RespostaBusca = { ok: true, dados };
    return resposta;
  });
}
