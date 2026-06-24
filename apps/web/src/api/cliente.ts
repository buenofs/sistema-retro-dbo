import type { ComandoSQL, ErroApi, Resposta } from '@dbos/shared';
import { useLojaLogSQL } from '../aplicativos/monitor/lojaLog';

// Faz uma requisição à API e devolve sempre o contrato Resposta<T>.
// credentials: 'include' garante o envio do cookie de sessão.
// Efeito: respostas que trazem `dados.sql` alimentam o Monitor SQL automaticamente.
export async function requisitar<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<Resposta<T>> {
  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      credentials: 'include',
      ...opcoes,
      headers: { 'content-type': 'application/json', ...opcoes.headers },
    });
  } catch {
    return { ok: false, erro: { tipo: 'rede', mensagem: 'Não foi possível falar com o servidor.' } };
  }

  let parsed: Resposta<T>;
  try {
    parsed = (await resposta.json()) as Resposta<T>;
  } catch {
    return { ok: false, erro: { tipo: 'interno', mensagem: 'Resposta inválida do servidor.' } };
  }

  // Captura central do SQL (vale para sucesso e para erro com `sql`).
  const corpo = (parsed as { dados?: { sql?: unknown }; sql?: unknown });
  const sql = (corpo.dados && (corpo.dados as { sql?: unknown }).sql) ?? corpo.sql;
  if (Array.isArray(sql)) useLojaLogSQL.getState().registrar(sql as ComandoSQL[]);

  return parsed;
}

// Erro que preserva o ErroApi inteiro (mensagem + detalhe + codigoSql) para o diálogo.
export class ErroApiError extends Error {
  constructor(public readonly erro: ErroApi) {
    super(erro.mensagem);
    this.name = 'ErroApiError';
  }
}

// Envelope da Fase 1: payload + o SQL que rodou.
export type Envelope<T> = { dados: T; sql: ComandoSQL[] };

// Leitura: faz um GET e desembrulha a Resposta, ou lança ErroApiError.
export async function pegar<T>(caminho: string): Promise<T> {
  const resposta = await requisitar<T>(caminho);
  if (!resposta.ok) throw new ErroApiError(resposta.erro);
  return resposta.dados;
}

// Escrita: método + corpo opcional; mesma garantia de desembrulho.
export async function mandar<T>(caminho: string, metodo: string, corpo?: unknown): Promise<T> {
  const resposta = await requisitar<T>(caminho, {
    method: metodo,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new ErroApiError(resposta.erro);
  return resposta.dados;
}
