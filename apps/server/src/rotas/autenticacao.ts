import type { FastifyInstance } from 'fastify';
import sql from 'mssql';
import { esquemaCredenciais, type RespostaSessao } from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { abrirPool, configParaLogin } from '../bd/conexao';
import {
  criarAutenticar,
  definirCookieSessao,
  lerIdSessao,
  limparCookieSessao,
} from '../plugins/sessao';

export function registrarRotasAutenticacao(
  app: FastifyInstance,
  gerenciador: GerenciadorPools,
): void {
  const autenticar = criarAutenticar(gerenciador);

  app.post('/api/autenticacao/login', async (req, reply) => {
    const analise = esquemaCredenciais.safeParse(req.body);
    if (!analise.success) {
      return reply.status(400).send({
        ok: false,
        erro: {
          tipo: 'validacao',
          mensagem: 'Informe login e senha.',
          detalhe: analise.error.issues[0]?.message,
        },
      });
    }

    const credenciais = analise.data;
    let pool: sql.ConnectionPool;
    try {
      pool = await abrirPool(configParaLogin(credenciais));
    } catch (erro) {
      const codigo = (erro as { code?: string }).code ?? '';
      if (erro instanceof sql.ConnectionError && /ELOGIN/i.test(codigo)) {
        return reply.status(401).send({
          ok: false,
          erro: {
            tipo: 'autenticacao',
            mensagem: 'Falha no logon: login ou senha inválidos.',
          },
        });
      }
      throw erro;
    }

    const idSessao = crypto.randomUUID();
    try {
      gerenciador.criar(idSessao, pool, credenciais.login, Date.now());
    } catch (erro) {
      await pool.close();
      throw erro;
    }

    definirCookieSessao(reply, idSessao);
    const resposta: RespostaSessao = {
      ok: true,
      dados: { login: credenciais.login, banco: process.env.SQL_BANCO ?? '' },
    };
    return resposta;
  });

  app.get(
    '/api/autenticacao/sessao',
    { preHandler: autenticar },
    async (req): Promise<RespostaSessao> => {
      return { ok: true, dados: { login: req.sessao!.login, banco: process.env.SQL_BANCO ?? '' } };
    },
  );

  app.post('/api/autenticacao/logout', async (req, reply) => {
    const id = lerIdSessao(req);
    if (id) await gerenciador.remover(id);
    limparCookieSessao(reply);
    return { ok: true, dados: { encerrada: true } };
  });
}
