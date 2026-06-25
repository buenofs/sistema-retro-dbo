import type { FastifyInstance } from 'fastify';
import { esquemaRefObjeto, type RespostaPropriedades } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { obterPropriedades } from '../bd/consultasPropriedades';
import { criarBanco } from '../bd/banco';

export function registrarRotasPropriedades(
  app: FastifyInstance,
  gerenciador: GerenciadorPools,
): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/propriedades', { preHandler: autenticar }, async (req, reply) => {
    const analise = esquemaRefObjeto.safeParse(req.query);
    if (!analise.success) {
      return reply.status(400).send({
        ok: false,
        erro: {
          tipo: 'validacao',
          mensagem: 'Informe esquema e tabela.',
          detalhe: analise.error.issues[0]?.message,
        },
      });
    }
    const props = await obterPropriedades(criarBanco(req.sessao!.pool), analise.data);
    if (!props) {
      return reply
        .status(404)
        .send({ ok: false, erro: { tipo: 'validacao', mensagem: 'Objeto não encontrado.' } });
    }
    const resposta: RespostaPropriedades = { ok: true, dados: props };
    return resposta;
  });
}
