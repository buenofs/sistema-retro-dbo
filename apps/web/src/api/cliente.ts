import type { Resposta } from '@dbos/shared';

// Faz uma requisição à API e devolve sempre o contrato Resposta<T>.
// credentials: 'include' garante o envio do cookie de sessão.
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
    return {
      ok: false,
      erro: { tipo: 'rede', mensagem: 'Não foi possível falar com o servidor.' },
    };
  }

  try {
    return (await resposta.json()) as Resposta<T>;
  } catch {
    return {
      ok: false,
      erro: { tipo: 'interno', mensagem: 'Resposta inválida do servidor.' },
    };
  }
}
