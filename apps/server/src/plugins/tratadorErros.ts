import type { FastifyInstance } from 'fastify';
import sql from 'mssql';
import type { ErroApi } from '@dbos/shared';

/** Converte um erro do driver mssql/Tedious no formato padronizado ErroApi. */
export function mapearErroSql(erro: unknown): ErroApi {
  if (erro instanceof sql.RequestError) {
    if ((erro as { code?: string }).code === 'ETIMEOUT') {
      return {
        tipo: 'tempoEsgotado',
        mensagem: 'A consulta excedeu o tempo limite e foi cancelada.',
        detalhe: erro.message,
      };
    }
    return {
      tipo: 'sql',
      mensagem: 'O banco de dados recusou o comando.',
      detalhe: erro.message,
      codigoSql: (erro as { number?: number }).number,
      severidade: (erro as { class?: number }).class,
    };
  }
  if (erro instanceof sql.ConnectionError) {
    return {
      tipo: 'rede',
      mensagem: 'Não foi possível conectar ao banco de dados.',
      detalhe: erro.message,
    };
  }
  return {
    tipo: 'interno',
    mensagem: 'Ocorreu um erro inesperado no servidor.',
    detalhe: erro instanceof Error ? erro.message : String(erro),
  };
}

/** Erros não tratados nas rotas caem aqui e viram RespostaErro com status coerente. */
export function registrarTratadorErros(app: FastifyInstance): void {
  app.setErrorHandler((erro, _req, reply) => {
    const apiErro = mapearErroSql(erro);
    const status =
      apiErro.tipo === 'sql'
        ? 400
        : apiErro.tipo === 'tempoEsgotado'
          ? 504
          : apiErro.tipo === 'rede'
            ? 503
            : 500;
    void reply.status(status).send({ ok: false, erro: apiErro });
  });
}
