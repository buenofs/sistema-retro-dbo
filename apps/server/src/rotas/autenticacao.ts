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

  // Login = abrir um ConnectionPool com as credenciais. Sucesso = login válido.
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
      throw erro; // rede/interno tratados pelo tratadorErros
    }

    const idSessao = crypto.randomUUID();
    try {
      gerenciador.criar(idSessao, pool, credenciais.login, Date.now());
    } catch (erro) {
      await pool.close(); // não conseguimos guardar o pool → não vaza conexão
      throw erro;
    }

    // A senha sai de escopo aqui — nunca é armazenada nem devolvida (spec §5.2).
    definirCookieSessao(reply, idSessao);
    const resposta: RespostaSessao = { ok: true, dados: { login: credenciais.login } };
    return resposta;
  });

  // Sessão atual: protegida; devolve o login guardado no registro.
  app.get(
    '/api/autenticacao/sessao',
    { preHandler: autenticar },
    async (req): Promise<RespostaSessao> => {
      return { ok: true, dados: { login: req.sessao!.login } };
    },
  );

  // Logout: fecha o pool, remove a sessão e limpa o cookie.
  app.post('/api/autenticacao/logout', async (req, reply) => {
    const id = lerIdSessao(req);
    if (id) await gerenciador.remover(id);
    limparCookieSessao(reply);
    return { ok: true, dados: { encerrada: true } };
  });
}
