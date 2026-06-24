import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  esquemaCriarPasta, esquemaCriarArquivo, esquemaRenomear, esquemaMover,
  esquemaConteudo, esquemaCopiar, esquemaListar,
} from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { criarBanco, type Banco } from '../bd/banco';
import {
  listarDrives, usoPorDrive, listarConteudo, listarLixeira, lerItem,
  criarItem, renomear, salvarConteudo, mover, enviarParaLixeira, restaurar,
  esvaziarLixeira, copiar,
} from '../bd/consultasArquivos';

// Dono padrão: 1 (felipe). Numa evolução, viria do mapa login->usuario.
const DONO_PADRAO = 1;

function erroValidacao(reply: FastifyReply, mensagem: string, status = 400) {
  return reply.status(status).send({ ok: false, erro: { tipo: 'validacao', mensagem } });
}

// Lê e valida o :id da rota. Retorna o número, ou null (e já responde 400).
function parsearId(req: { params: unknown }, reply: FastifyReply): number | null {
  const id = Number((req.params as { id?: string }).id);
  if (!Number.isInteger(id) || id <= 0) {
    void erroValidacao(reply, 'id inválido.');
    return null;
  }
  return id;
}

// Traduz erros de domínio e violações de constraint em mensagens amigáveis.
function tratar(reply: FastifyReply, erro: unknown, banco: Banco) {
  const msg = erro instanceof Error ? erro.message : String(erro);
  const mapa: Record<string, string> = {
    PaiInvalido: 'A pasta de destino não existe ou não é uma pasta.',
    MovimentoCiclico: 'Não é possível mover/copiar uma pasta para dentro dela mesma.',
  };
  if (mapa[msg]) return reply.status(400).send({ ok: false, erro: { tipo: 'validacao', mensagem: mapa[msg] }, sql: banco.comandos });
  if (/UQ_Itens_local|duplicate key/i.test(msg)) {
    return reply.status(400).send({ ok: false, erro: { tipo: 'validacao', mensagem: 'Já existe um item com esse nome nesta pasta.' }, sql: banco.comandos });
  }
  return reply.status(400).send({ ok: false, erro: { tipo: 'sql', mensagem: 'O banco recusou o comando.', detalhe: msg }, sql: banco.comandos });
}

export function registrarRotasArquivos(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/arquivos/drives', { preHandler: autenticar }, async (req) => {
    const banco = criarBanco(req.sessao!.pool, 'Listar drives');
    const dados = await listarDrives(banco);
    return { ok: true, dados: { dados, sql: banco.comandos } };
  });

  app.get('/api/arquivos/uso', { preHandler: autenticar }, async (req) => {
    const banco = criarBanco(req.sessao!.pool, 'Uso por drive');
    const dados = await usoPorDrive(banco);
    return { ok: true, dados: { dados, sql: banco.comandos } };
  });

  app.get('/api/arquivos/listar', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaListar.safeParse(req.query);
    if (!a.success) return erroValidacao(reply, 'Parâmetros inválidos.');
    const banco = criarBanco(req.sessao!.pool, 'Listar pasta');
    const dados = await listarConteudo(banco, a.data.driveId, a.data.paiId ?? null);
    return { ok: true, dados: { dados, sql: banco.comandos } };
  });

  app.get('/api/arquivos/lixeira', { preHandler: autenticar }, async (req) => {
    const banco = criarBanco(req.sessao!.pool, 'Listar lixeira');
    const dados = await listarLixeira(banco);
    return { ok: true, dados: { dados, sql: banco.comandos } };
  });

  app.get('/api/arquivos/:id', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const banco = criarBanco(req.sessao!.pool, 'Ler item');
    const item = await lerItem(banco, id);
    if (!item) return reply.status(404).send({ ok: false, erro: { tipo: 'validacao', mensagem: 'Item não encontrado.' }, sql: banco.comandos });
    return { ok: true, dados: { dados: { ...item, conteudo: item.conteudo ?? '' }, sql: banco.comandos } };
  });

  app.post('/api/arquivos/pasta', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaCriarPasta.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados inválidos.');
    const banco = criarBanco(req.sessao!.pool, 'Criar pasta');
    try {
      const id = await criarItem(banco, { ...a.data, tipo: 'pasta', donoId: DONO_PADRAO, conteudo: null });
      return { ok: true, dados: { dados: { id }, sql: banco.comandos } };
    } catch (erro) { return tratar(reply, erro, banco); }
  });

  app.post('/api/arquivos/arquivo', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaCriarArquivo.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados inválidos.');
    const banco = criarBanco(req.sessao!.pool, 'Criar arquivo');
    try {
      const id = await criarItem(banco, { nome: a.data.nome, paiId: a.data.paiId, driveId: a.data.driveId, tipo: 'arquivo', donoId: DONO_PADRAO, conteudo: a.data.conteudo });
      return { ok: true, dados: { dados: { id }, sql: banco.comandos } };
    } catch (erro) { return tratar(reply, erro, banco); }
  });

  app.put('/api/arquivos/:id/renomear', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const a = esquemaRenomear.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Nome inválido.');
    const banco = criarBanco(req.sessao!.pool, 'Renomear');
    try {
      await renomear(banco, id, a.data.nome);
      return { ok: true, dados: { dados: { id }, sql: banco.comandos } };
    } catch (erro) { return tratar(reply, erro, banco); }
  });

  app.put('/api/arquivos/:id/mover', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const a = esquemaMover.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Destino inválido.');
    const banco = criarBanco(req.sessao!.pool, 'Mover');
    try {
      await mover(banco, id, a.data.paiId);
      return { ok: true, dados: { dados: { id }, sql: banco.comandos } };
    } catch (erro) { return tratar(reply, erro, banco); }
  });

  app.put('/api/arquivos/:id/conteudo', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const a = esquemaConteudo.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Conteúdo inválido.');
    const banco = criarBanco(req.sessao!.pool, 'Salvar conteúdo');
    try {
      await salvarConteudo(banco, id, a.data.conteudo);
      return { ok: true, dados: { dados: { id }, sql: banco.comandos } };
    } catch (erro) { return tratar(reply, erro, banco); }
  });

  app.post('/api/arquivos/:id/copiar', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const a = esquemaCopiar.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Destino inválido.');
    const banco = criarBanco(req.sessao!.pool, 'Copiar');
    try {
      await copiar(banco, id, a.data.paiId, DONO_PADRAO);
      return { ok: true, dados: { dados: { id }, sql: banco.comandos } };
    } catch (erro) { return tratar(reply, erro, banco); }
  });

  app.delete('/api/arquivos/lixeira', { preHandler: autenticar }, async (req, reply) => {
    const banco = criarBanco(req.sessao!.pool, 'Esvaziar lixeira');
    try {
      await esvaziarLixeira(banco);
      return { ok: true, dados: { dados: {}, sql: banco.comandos } };
    } catch (erro) { return tratar(reply, erro, banco); }
  });

  app.delete('/api/arquivos/:id', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const banco = criarBanco(req.sessao!.pool, 'Apagar (lixeira)');
    try {
      await enviarParaLixeira(banco, id);
      return { ok: true, dados: { dados: { id }, sql: banco.comandos } };
    } catch (erro) { return tratar(reply, erro, banco); }
  });

  app.put('/api/arquivos/:id/restaurar', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const banco = criarBanco(req.sessao!.pool, 'Restaurar');
    try {
      await restaurar(banco, id);
      return { ok: true, dados: { dados: { id }, sql: banco.comandos } };
    } catch (erro) { return tratar(reply, erro, banco); }
  });
}
