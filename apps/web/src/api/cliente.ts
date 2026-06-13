import type { ComandoSQL, Resposta } from '@dbos/shared';
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
