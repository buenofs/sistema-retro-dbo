import type { FastifyInstance } from 'fastify';
import { esquemaRefObjeto, type RespostaColunas, type RespostaObjetos } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { listarColunas, listarObjetos } from '../bd/consultasSistema';

export function registrarRotasExplorador(
  app: FastifyInstance,
  gerenciador: GerenciadorPools,
): void {
  const guard = criarAutenticar(gerenciador);

  app.get(
    '/api/explorador/objetos',
    { preHandler: guard },
    async (req): Promise<RespostaObjetos> => {
      const dados = await listarObjetos(req.sessao!.pool);
      return { ok: true, dados };
    },
  );

  app.get('/api/explorador/colunas', { preHandler: guard }, async (req, reply) => {
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
    const dados = await listarColunas(req.sessao!.pool, analise.data);
    const resposta: RespostaColunas = { ok: true, dados };
    return resposta;
  });
}
