export interface ErroApi {
  tipo:
    | 'autenticacao'
    | 'validacao'
    | 'sql'
    | 'tempoEsgotado'
    | 'rede'
    | 'interno';
  mensagem: string;
  detalhe?: string;
  codigoSql?: number;
  severidade?: number;
}

export interface RespostaErro {
  ok: false;
  erro: ErroApi;
}

export interface RespostaSucesso<T> {
  ok: true;
  dados: T;
}

export type Resposta<T> = RespostaSucesso<T> | RespostaErro;
