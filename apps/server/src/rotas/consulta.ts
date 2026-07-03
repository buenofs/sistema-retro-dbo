import type { FastifyInstance } from 'fastify';
import { esquemaConsulta, type RespostaConsulta } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { executarConsulta } from '../bd/consultasUsuario';

export function registrarRotasConsulta(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.post('/api/consulta', { preHandler: autenticar }, async (req, reply) => {
    const analise = esquemaConsulta.safeParse(req.body);
    if (!analise.success) {
      return reply.status(400).send({
        ok: false,
        erro: {
          tipo: 'validacao',
          mensagem: 'Informe o SQL a executar.',
          detalhe: analise.error.issues[0]?.message,
        },
      });
    }
    // Lido a cada request para os testes poderem sobrescrever o teto.
    const maxLinhas = Number(process.env.SQL_MAX_LINHAS ?? 1000);
    const dados = await executarConsulta(req.sessao!.pool, analise.data.sql, maxLinhas);
    const resposta: RespostaConsulta = { ok: true, dados };
    return resposta;
  });
}
