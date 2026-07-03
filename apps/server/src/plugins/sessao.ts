import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import type { GerenciadorPools } from '../bd/gerenciadorPools';

export const NOME_COOKIE = 'dbos_sid';

function opcoesCookie() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    signed: true,
  };
}

/** Registra o suporte a cookies assinados; exige SESSAO_SEGREDO no ambiente. */
export async function registrarSessao(app: FastifyInstance): Promise<void> {
  const segredo = process.env.SESSAO_SEGREDO;
  if (!segredo) throw new Error('SESSAO_SEGREDO não definido no ambiente.');
  await app.register(fastifyCookie, { secret: segredo });
}

export function definirCookieSessao(reply: FastifyReply, idSessao: string): void {
  reply.setCookie(NOME_COOKIE, idSessao, opcoesCookie());
}

export function limparCookieSessao(reply: FastifyReply): void {
  reply.clearCookie(NOME_COOKIE, { path: '/' });
}

export function lerIdSessao(req: FastifyRequest): string | null {
  const bruto = req.cookies[NOME_COOKIE];
  if (!bruto) return null;
  const resultado = req.unsignCookie(bruto);
  return resultado.valid ? resultado.value : null;
}

/** preHandler que exige sessão válida e injeta o registro em req.sessao. */
export function criarAutenticar(gerenciador: GerenciadorPools) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const id = lerIdSessao(req);
    const registro = id ? gerenciador.obter(id, Date.now()) : undefined;
    if (!id || !registro) {
      await reply.status(401).send({
        ok: false,
        erro: {
          tipo: 'autenticacao',
          mensagem: 'Sessão expirada ou inexistente. Faça login novamente.',
        },
      });
      return;
    }
    req.sessao = { ...registro, id };
  };
}
