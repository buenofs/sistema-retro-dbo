import { useMutation } from '@tanstack/react-query';
import type { ErroApi, ResultadoConsulta } from '@dbos/shared';
import { requisitar } from '../../api/cliente';

export class ErroApiError extends Error {
  constructor(public readonly erro: ErroApi) {
    super(erro.mensagem);
    this.name = 'ErroApiError';
  }
}

export function useExecutarConsulta() {
  return useMutation({
    mutationFn: async (sqlTexto: string): Promise<ResultadoConsulta> => {
      const r = await requisitar<ResultadoConsulta>('/api/consulta', {
        method: 'POST',
        body: JSON.stringify({ sql: sqlTexto }),
      });
      if (!r.ok) throw new ErroApiError(r.erro);
      return r.dados;
    },
  });
}
