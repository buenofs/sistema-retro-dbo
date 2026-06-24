import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  esquemaPaginaGrade,
  esquemaInsercao,
  esquemaAtualizacao,
  esquemaRemocao,
  type RespostaGrade,
  type RespostaMutacaoGrade,
} from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { criarBanco } from '../bd/banco';
import {
  obterMetadados,
  listarLinhas,
  inserirLinha,
  atualizarLinha,
  removerLinha,
  type MetadadosTabela,
} from '../bd/consultasGrade';

function erroValidacao(reply: FastifyReply, mensagem: string, status = 400) {
  return reply.status(status).send({ ok: false, erro: { tipo: 'validacao', mensagem } });
}

// Devolve o nome da primeira coluna inválida, ou null se todas existem.
function colunaInvalida(meta: MetadadosTabela, nomes: string[]): string | null {
  const validas = new Set(meta.colunas.map((coluna) => coluna.nome));
  for (const nome of nomes) if (!validas.has(nome)) return nome;
  return null;
}

export function registrarRotasGrade(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/grade/linhas', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaPaginaGrade.safeParse(req.query);
    if (!a.success) return erroValidacao(reply, a.error.issues[0]?.message ?? 'Parâmetros inválidos.');
    const ref = { esquema: a.data.esquema, tabela: a.data.tabela };
    // sem ação: consultas de grade não vão para o Monitor
    const banco = criarBanco(req.sessao!.pool);
    const meta = await obterMetadados(banco, ref);
    if (meta.colunas.length === 0) return erroValidacao(reply, 'Tabela não encontrada.', 404);
    const dados = await listarLinhas(banco, ref, meta, a.data.pagina, a.data.tamanho);
    const resposta: RespostaGrade = { ok: true, dados };
    return resposta;
  });

  app.post('/api/grade/linha', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaInsercao.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados de inserção inválidos.');
    const ref = { esquema: a.data.esquema, tabela: a.data.tabela };
    // sem ação: consultas de grade não vão para o Monitor
    const banco = criarBanco(req.sessao!.pool);
    const meta = await obterMetadados(banco, ref);
    if (meta.colunas.length === 0) return erroValidacao(reply, 'Tabela não encontrada.', 404);
    const ruim = colunaInvalida(meta, Object.keys(a.data.valores));
    if (ruim) return erroValidacao(reply, `Coluna inexistente: ${ruim}`);
    const linhasAfetadas = await inserirLinha(banco, ref, a.data.valores);
    const resposta: RespostaMutacaoGrade = { ok: true, dados: { linhasAfetadas } };
    return resposta;
  });

  app.put('/api/grade/linha', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaAtualizacao.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados de atualização inválidos.');
    if (Object.keys(a.data.valores).length === 0) return erroValidacao(reply, 'Nada para atualizar.');
    if (Object.keys(a.data.chave).length === 0) return erroValidacao(reply, 'Chave ausente.');
    const ref = { esquema: a.data.esquema, tabela: a.data.tabela };
    // sem ação: consultas de grade não vão para o Monitor
    const banco = criarBanco(req.sessao!.pool);
    const meta = await obterMetadados(banco, ref);
    if (meta.colunas.length === 0) return erroValidacao(reply, 'Tabela não encontrada.', 404);
    const ruim = colunaInvalida(meta, [...Object.keys(a.data.valores), ...Object.keys(a.data.chave)]);
    if (ruim) return erroValidacao(reply, `Coluna inexistente: ${ruim}`);
    const linhasAfetadas = await atualizarLinha(banco, ref, a.data.chave, a.data.valores);
    const resposta: RespostaMutacaoGrade = { ok: true, dados: { linhasAfetadas } };
    return resposta;
  });

  app.delete('/api/grade/linha', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaRemocao.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados de remoção inválidos.');
    if (Object.keys(a.data.chave).length === 0) return erroValidacao(reply, 'Chave ausente.');
    const ref = { esquema: a.data.esquema, tabela: a.data.tabela };
    // sem ação: consultas de grade não vão para o Monitor
    const banco = criarBanco(req.sessao!.pool);
    const meta = await obterMetadados(banco, ref);
    if (meta.colunas.length === 0) return erroValidacao(reply, 'Tabela não encontrada.', 404);
    const ruim = colunaInvalida(meta, Object.keys(a.data.chave));
    if (ruim) return erroValidacao(reply, `Coluna inexistente: ${ruim}`);
    const linhasAfetadas = await removerLinha(banco, ref, a.data.chave);
    const resposta: RespostaMutacaoGrade = { ok: true, dados: { linhasAfetadas } };
    return resposta;
  });
}
