import Fastify, { type FastifyInstance } from 'fastify';
import type { Resposta } from '@dbos/shared';
import { criarGerenciadorPools, type GerenciadorPools } from './bd/gerenciadorPools';
import { registrarSessao } from './plugins/sessao';
import { registrarTratadorErros } from './plugins/tratadorErros';
import { registrarRotasAutenticacao } from './rotas/autenticacao';
import { registrarRotasExplorador } from './rotas/explorador';
import { registrarRotasConsulta } from './rotas/consulta';
import { registrarRotasGrade } from './rotas/grade';
import { registrarRotasPropriedades } from './rotas/propriedades';

export interface OpcoesApp {
  // Permite injetar um gerenciador nos testes; em produção vem do ambiente.
  gerenciador?: GerenciadorPools;
}

// Constrói a instância do Fastify com plugins e rotas registrados.
export function construirApp(opcoes: OpcoesApp = {}): FastifyInstance {
  const app = Fastify({ logger: false });

  const gerenciador =
    opcoes.gerenciador ??
    criarGerenciadorPools({
      maxSessoes: Number(process.env.SESSAO_MAX ?? 50),
      ttlMs: Number(process.env.SESSAO_TTL_MS ?? 1_800_000),
    });

  registrarTratadorErros(app);

  // Cookie + rotas autenticadas num contexto que enxerga os helpers de cookie.
  app.register(async (instancia) => {
    await registrarSessao(instancia);
    registrarRotasAutenticacao(instancia, gerenciador);
    registrarRotasExplorador(instancia, gerenciador);
    registrarRotasConsulta(instancia, gerenciador);
    registrarRotasGrade(instancia, gerenciador);
    registrarRotasPropriedades(instancia, gerenciador);
  });

  app.get('/api/saude', async (): Promise<Resposta<{ status: string }>> => {
    return { ok: true, dados: { status: 'ok' } };
  });

  // Expõe o gerenciador para o index orquestrar a limpeza por TTL.
  app.decorate('pools', gerenciador);

  return app;
}
