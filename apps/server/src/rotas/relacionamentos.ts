import type { FastifyInstance } from 'fastify';
import { esquemaRefRelacionamento, type RespostaRelacionamentos } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { montarGrafo } from '../bd/consultasRelacionamentos';

export function registrarRotasRelacionamentos(
  app: FastifyInstance,
  gerenciador: GerenciadorPools,
): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/relacionamentos', { preHandler: autenticar }, async (req, reply) => {
    const analise = esquemaRefRelacionamento.safeParse(req.query);
    if (!analise.success) {
      return reply.status(400).send({
        ok: false,
        erro: { tipo: 'validacao', mensagem: 'Informe tipo e id válidos.', detalhe: analise.error.issues[0]?.message },
      });
    }
    const grafo = await montarGrafo(req.sessao!.pool, analise.data);
    if (!grafo) {
      return reply.status(404).send({ ok: false, erro: { tipo: 'validacao', mensagem: 'Objeto não encontrado.' } });
    }
    const resposta: RespostaRelacionamentos = { ok: true, dados: grafo };
    return resposta;
  });
}
