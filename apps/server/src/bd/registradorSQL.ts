import type { ConnectionPool, IRecordSet } from 'mssql';
import type { ComandoSQL, TipoComando } from '@dbos/shared';

export function tipoDoTexto(texto: string): TipoComando {
  const t = texto.trim().toUpperCase();
  const corpo = t.startsWith('WITH') ? t.slice(t.indexOf(')') + 1) : t;
  if (/\bINSERT\b/.test(corpo)) return 'INSERT';
  if (/\bUPDATE\b/.test(corpo)) return 'UPDATE';
  if (/\bDELETE\b/.test(corpo)) return 'DELETE';
  return 'SELECT';
}

// Executa queries parametrizadas e registra cada comando (texto, params, linhas).
// A rota devolve `comandos` no campo `sql` da resposta — alimenta o Monitor.
export class RegistradorSQL {
  readonly comandos: ComandoSQL[] = [];
  constructor(private readonly acao: string) {}

  async executar<T = Record<string, unknown>>(
    pool: ConnectionPool,
    texto: string,
    parametros: Record<string, unknown> = {},
  ): Promise<IRecordSet<T>> {
    const req = pool.request();
    for (const [k, v] of Object.entries(parametros)) req.input(k, v);
    const em = new Date().toISOString();
    try {
      const r = await req.query<T>(texto);
      const linhasAfetadas = (r.rowsAffected ?? []).reduce((a, b) => a + b, 0);
      this.comandos.push({
        acao: this.acao,
        tipo: tipoDoTexto(texto),
        texto,
        parametros,
        linhasAfetadas,
        em,
      });
      return r.recordset;
    } catch (e) {
      this.comandos.push({
        acao: this.acao,
        tipo: tipoDoTexto(texto),
        texto,
        parametros,
        linhasAfetadas: 0,
        erro: e instanceof Error ? e.message : String(e),
        em,
      });
      throw e;
    }
  }
}
