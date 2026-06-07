// Contrato de resposta padronizado entre web e server.
export interface ErroApi {
  tipo:
    | 'autenticacao'
    | 'validacao'
    | 'sql'
    | 'tempoEsgotado'
    | 'rede'
    | 'interno';
  mensagem: string; // legível, em pt-BR
  detalhe?: string; // mensagem crua do SQL Server
  codigoSql?: number; // número do erro do SQL Server (ex.: 208)
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
