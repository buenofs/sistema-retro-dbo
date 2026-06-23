import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  esquemaCriarPasta, esquemaCriarArquivo, esquemaRenomear, esquemaMover,
  esquemaConteudo, esquemaCopiar, esquemaListar,
} from '@dbos/shared';
import type { GerenciadorPools } from '../bd/gerenciadorPools';
import { criarAutenticar } from '../plugins/sessao';
import { RegistradorSQL } from '../bd/registradorSQL';
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
function tratar(reply: FastifyReply, e: unknown, reg: RegistradorSQL) {
  const msg = e instanceof Error ? e.message : String(e);
  const mapa: Record<string, string> = {
    PaiInvalido: 'A pasta de destino não existe ou não é uma pasta.',
    MovimentoCiclico: 'Não é possível mover/copiar uma pasta para dentro dela mesma.',
  };
  if (mapa[msg]) return reply.status(400).send({ ok: false, erro: { tipo: 'validacao', mensagem: mapa[msg] }, sql: reg.comandos });
  if (/UQ_Itens_local|duplicate key/i.test(msg)) {
    return reply.status(400).send({ ok: false, erro: { tipo: 'validacao', mensagem: 'Já existe um item com esse nome nesta pasta.' }, sql: reg.comandos });
  }
  return reply.status(400).send({ ok: false, erro: { tipo: 'sql', mensagem: 'O banco recusou o comando.', detalhe: msg }, sql: reg.comandos });
}

export function registrarRotasArquivos(app: FastifyInstance, gerenciador: GerenciadorPools): void {
  const autenticar = criarAutenticar(gerenciador);

  app.get('/api/arquivos/drives', { preHandler: autenticar }, async (req) => {
    const reg = new RegistradorSQL('Listar drives');
    const dados = await listarDrives(req.sessao!.pool, reg);
    return { ok: true, dados: { dados, sql: reg.comandos } };
  });

  app.get('/api/arquivos/uso', { preHandler: autenticar }, async (req) => {
    const reg = new RegistradorSQL('Uso por drive');
    const dados = await usoPorDrive(req.sessao!.pool, reg);
    return { ok: true, dados: { dados, sql: reg.comandos } };
  });

  app.get('/api/arquivos/listar', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaListar.safeParse(req.query);
    if (!a.success) return erroValidacao(reply, 'Parâmetros inválidos.');
    const reg = new RegistradorSQL('Listar pasta');
    const dados = await listarConteudo(req.sessao!.pool, reg, a.data.driveId, a.data.paiId ?? null);
    return { ok: true, dados: { dados, sql: reg.comandos } };
  });

  app.get('/api/arquivos/lixeira', { preHandler: autenticar }, async (req) => {
    const reg = new RegistradorSQL('Listar lixeira');
    const dados = await listarLixeira(req.sessao!.pool, reg);
    return { ok: true, dados: { dados, sql: reg.comandos } };
  });

  app.get('/api/arquivos/:id', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const reg = new RegistradorSQL('Ler item');
    const item = await lerItem(req.sessao!.pool, reg, id);
    if (!item) return reply.status(404).send({ ok: false, erro: { tipo: 'validacao', mensagem: 'Item não encontrado.' }, sql: reg.comandos });
    return { ok: true, dados: { dados: { ...item, conteudo: item.conteudo ?? '' }, sql: reg.comandos } };
  });

  app.post('/api/arquivos/pasta', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaCriarPasta.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados inválidos.');
    const reg = new RegistradorSQL('Criar pasta');
    try {
      const id = await criarItem(req.sessao!.pool, reg, { ...a.data, tipo: 'pasta', donoId: DONO_PADRAO, conteudo: null });
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.post('/api/arquivos/arquivo', { preHandler: autenticar }, async (req, reply) => {
    const a = esquemaCriarArquivo.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Dados inválidos.');
    const reg = new RegistradorSQL('Criar arquivo');
    try {
      const id = await criarItem(req.sessao!.pool, reg, { nome: a.data.nome, paiId: a.data.paiId, driveId: a.data.driveId, tipo: 'arquivo', donoId: DONO_PADRAO, conteudo: a.data.conteudo });
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.put('/api/arquivos/:id/renomear', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const a = esquemaRenomear.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Nome inválido.');
    const reg = new RegistradorSQL('Renomear');
    try {
      await renomear(req.sessao!.pool, reg, id, a.data.nome);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.put('/api/arquivos/:id/mover', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const a = esquemaMover.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Destino inválido.');
    const reg = new RegistradorSQL('Mover');
    try {
      await mover(req.sessao!.pool, reg, id, a.data.paiId);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.put('/api/arquivos/:id/conteudo', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const a = esquemaConteudo.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Conteúdo inválido.');
    const reg = new RegistradorSQL('Salvar conteúdo');
    try {
      await salvarConteudo(req.sessao!.pool, reg, id, a.data.conteudo);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.post('/api/arquivos/:id/copiar', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const a = esquemaCopiar.safeParse(req.body);
    if (!a.success) return erroValidacao(reply, 'Destino inválido.');
    const reg = new RegistradorSQL('Copiar');
    try {
      await copiar(req.sessao!.pool, reg, id, a.data.paiId, DONO_PADRAO);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.delete('/api/arquivos/lixeira', { preHandler: autenticar }, async (req, reply) => {
    const reg = new RegistradorSQL('Esvaziar lixeira');
    try {
      await esvaziarLixeira(req.sessao!.pool, reg);
      return { ok: true, dados: { dados: {}, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.delete('/api/arquivos/:id', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const reg = new RegistradorSQL('Apagar (lixeira)');
    try {
      await enviarParaLixeira(req.sessao!.pool, reg, id);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });

  app.put('/api/arquivos/:id/restaurar', { preHandler: autenticar }, async (req, reply) => {
    const id = parsearId(req, reply);
    if (id === null) return;
    const reg = new RegistradorSQL('Restaurar');
    try {
      await restaurar(req.sessao!.pool, reg, id);
      return { ok: true, dados: { dados: { id }, sql: reg.comandos } };
    } catch (e) { return tratar(reply, e, reg); }
  });
}
