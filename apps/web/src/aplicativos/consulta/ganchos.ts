import { useMutation } from '@tanstack/react-query';
import type { ResultadoConsulta } from '@dbos/shared';
import { mandar } from '../../api/cliente';

export { ErroApiError } from '../../api/cliente';

export function useExecutarConsulta() {
  return useMutation({
    mutationFn: (sqlTexto: string) => mandar<ResultadoConsulta>('/api/consulta', 'POST', { sql: sqlTexto }),
  });
}
