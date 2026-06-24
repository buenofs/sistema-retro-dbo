import { useMutation } from '@tanstack/react-query';
import type { ResultadoConsulta } from '@dbos/shared';
import { mandar } from '../../api/cliente';

// Re-export: ErroApiError agora mora em api/cliente; mantemos este ponto de
// import para os consumidores que já o importavam daqui.
export { ErroApiError } from '../../api/cliente';

export function useExecutarConsulta() {
  return useMutation({
    mutationFn: (sqlTexto: string) => mandar<ResultadoConsulta>('/api/consulta', 'POST', { sql: sqlTexto }),
  });
}
