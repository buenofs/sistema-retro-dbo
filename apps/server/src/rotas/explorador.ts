import type { FastifyInstance } from 'fastify';
import {
  esquemaRefObjeto,
  type RespostaColunas,
  type RespostaObjetos,
} from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { listarColunas, listarObjetos } from '../bd/consultasSistema';
import { criarBanco } from '../bd/banco';

export function registrarRotasExplorador(
  app: FastifyInstance,
  gerenciador: GerenciadorPools,
): void {
  const autenticar = criarAutenticar(gerenciador);

  // Lista tabelas e views do banco da sessão.
  app.get(
    '/api/explorador/objetos',
    { preHandler: autenticar },
    async (req): Promise<RespostaObjetos> => {
      // sem ação: consultas de catálogo não vão para o Monitor
      const dados = await listarObjetos(criarBanco(req.sessao!.pool));
      return { ok: true, dados };
    },
  );

  // Colunas de um objeto específico (esquema + tabela via query string).
  app.get('/api/explorador/colunas', { preHandler: autenticar }, async (req, reply) => {
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
    // sem ação: consultas de catálogo não vão para o Monitor
    const dados = await listarColunas(criarBanco(req.sessao!.pool), analise.data);
    const resposta: RespostaColunas = { ok: true, dados };
    return resposta;
  });
}
