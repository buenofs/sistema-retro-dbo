import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import type { GerenciadorPools } from '../bd/gerenciadorPools';

export const NOME_COOKIE = 'dbos_sid';

// Secure só em produção: o dev roda sobre http e o cookie Secure não seria enviado.
function cookieBase() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    signed: true,
  };
}

export async function registrarSessao(app: FastifyInstance): Promise<void> {
  const segredo = process.env.SESSAO_SEGREDO;
  if (!segredo) throw new Error('SESSAO_SEGREDO não definido no ambiente.');
  await app.register(fastifyCookie, { secret: segredo });
}

export function definirCookieSessao(reply: FastifyReply, idSessao: string): void {
  reply.setCookie(NOME_COOKIE, idSessao, cookieBase());
}

export function limparCookieSessao(reply: FastifyReply): void {
  reply.clearCookie(NOME_COOKIE, cookieBase());
}

// null se ausente ou assinatura inválida
export function lerIdSessao(req: FastifyRequest): string | null {
  const bruto = req.cookies[NOME_COOKIE];
  if (!bruto) return null;
  const resultado = req.unsignCookie(bruto);
  return resultado.valid ? resultado.value : null;
}

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
