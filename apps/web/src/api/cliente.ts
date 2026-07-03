import type { ComandoSQL, Resposta } from '@dbos/shared';
import { useLojaLogSQL } from '../aplicativos/monitor/lojaLog';

export async function requisitar<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<Resposta<T>> {
  // Só anuncia JSON quando há corpo: o Fastify rejeita `content-type: application/json`
  // com corpo vazio (FST_ERR_CTP_EMPTY_JSON_BODY), o que quebraria DELETE/PUT sem body.
  const temCorpo = opcoes.body !== undefined && opcoes.body !== null;
  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      credentials: 'include',
      ...opcoes,
      headers: {
        ...(temCorpo ? { 'content-type': 'application/json' } : {}),
        ...opcoes.headers,
      },
    });
  } catch {
    return {
      ok: false,
      erro: { tipo: 'rede', mensagem: 'Não foi possível falar com o servidor.' },
    };
  }

  let parsed: Resposta<T>;
  try {
    parsed = (await resposta.json()) as Resposta<T>;
  } catch {
    return { ok: false, erro: { tipo: 'interno', mensagem: 'Resposta inválida do servidor.' } };
  }

  const corpo = parsed as { dados?: { sql?: unknown }; sql?: unknown };
  const sql = (corpo.dados && (corpo.dados as { sql?: unknown }).sql) ?? corpo.sql;
  if (Array.isArray(sql)) useLojaLogSQL.getState().registrar(sql as ComandoSQL[]);

  return parsed;
}
