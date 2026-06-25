import type { ConnectionPool } from 'mssql';
import type { ComandoSQL, TipoComando } from '@dbos/shared';

type Parametros = Record<string, unknown>;

export interface Banco {
  readonly comandos: ComandoSQL[];
  consultar<Linha>(texto: string, parametros?: Parametros): Promise<Linha[]>;
  executar(texto: string, parametros?: Parametros): Promise<number>;
}

/** Classifica o SQL pela primeira palavra-chave, ignorando CTE `WITH`. */
export function tipoDoTexto(texto: string): TipoComando {
  const limpo = texto.trim().toUpperCase();
  const corpo = limpo.startsWith('WITH') ? limpo.slice(limpo.indexOf(')') + 1) : limpo;
  if (/\bINSERT\b/.test(corpo)) return 'INSERT';
  if (/\bUPDATE\b/.test(corpo)) return 'UPDATE';
  if (/\bDELETE\b/.test(corpo)) return 'DELETE';
  return 'SELECT';
}

export function somar(numeros: number[] = []): number {
  return numeros.reduce((total, parcela) => total + parcela, 0);
}

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

function agora(): string {
  return new Date().toISOString();
}

/** Forma única de falar com o banco; com `acao` registra cada comando no Monitor, sem `acao` roda silencioso. */
export function criarBanco(pool: ConnectionPool, acao?: string): Banco {
  const comandos: ComandoSQL[] = [];

  async function rodar<Linha>(texto: string, parametros: Parametros) {
    const requisicao = pool.request();
    for (const nome of Object.keys(parametros)) requisicao.input(nome, parametros[nome]);
    const comando: ComandoSQL = {
      acao: acao ?? '',
      tipo: tipoDoTexto(texto),
      texto,
      parametros,
      linhasAfetadas: 0,
      em: agora(),
    };
    try {
      const resultado = await requisicao.query<Linha>(texto);
      comando.linhasAfetadas = somar(resultado.rowsAffected);
      return { linhas: resultado.recordset as Linha[], afetadas: comando.linhasAfetadas };
    } catch (erro) {
      comando.erro = mensagem(erro);
      throw erro;
    } finally {
      if (acao) comandos.push(comando);
    }
  }

  async function consultar<Linha>(texto: string, parametros: Parametros = {}): Promise<Linha[]> {
    const { linhas } = await rodar<Linha>(texto, parametros);
    return linhas;
  }

  async function executar(texto: string, parametros: Parametros = {}): Promise<number> {
    const { afetadas } = await rodar(texto, parametros);
    return afetadas;
  }

  return { comandos, consultar, executar };
}
