import type { ConnectionPool } from 'mssql';

export interface RegistroSessao {
  pool: ConnectionPool;
  login: string;
  ultimoAcesso: number;
}

export interface OpcoesGerenciador {
  maxSessoes: number;
  ttlMs: number;
}

export interface GerenciadorPools {
  criar(idSessao: string, pool: ConnectionPool, login: string, agora: number): void;
  obter(idSessao: string, agora: number): RegistroSessao | undefined;
  remover(idSessao: string): Promise<void>;
  limparExpiradas(agora: number): Promise<number>;
  tamanho(): number;
}

/** Lançado quando o limite de sessões simultâneas é atingido. */
export class ErroLimiteSessoes extends Error {
  constructor() {
    super('Limite de sessões simultâneas atingido.');
    this.name = 'ErroLimiteSessoes';
  }
}

/** Mantém os ConnectionPools vivos em memória, um por sessão. */
export function criarGerenciadorPools(opcoes: OpcoesGerenciador): GerenciadorPools {
  const registros = new Map<string, RegistroSessao>();

  return {
    criar(idSessao, pool, login, agora) {
      if (registros.size >= opcoes.maxSessoes) {
        throw new ErroLimiteSessoes();
      }
      registros.set(idSessao, { pool, login, ultimoAcesso: agora });
    },

    obter(idSessao, agora) {
      const registro = registros.get(idSessao);
      if (!registro) return undefined;
      registro.ultimoAcesso = agora;
      return registro;
    },

    async remover(idSessao) {
      const registro = registros.get(idSessao);
      if (!registro) return;
      registros.delete(idSessao);
      await registro.pool.close();
    },

    async limparExpiradas(agora) {
      let removidas = 0;
      for (const [id, registro] of registros) {
        if (agora - registro.ultimoAcesso > opcoes.ttlMs) {
          registros.delete(id);
          await registro.pool.close();
          removidas += 1;
        }
      }
      return removidas;
    },

    tamanho() {
      return registros.size;
    },
  };
}
