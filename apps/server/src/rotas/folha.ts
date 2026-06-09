import type { FastifyInstance } from 'fastify';
import type { RespostaRelatorioFolha } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { obterRelatorioFolha } from '../bd/consultasFolha';

export function registrarRotasFolha(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/folha/relatorio', { preHandler: autenticar }, async (req) => {
    const dados = await obterRelatorioFolha(req.sessao!.pool);
    const resposta: RespostaRelatorioFolha = { ok: true, dados };
    return resposta;
  });
}
