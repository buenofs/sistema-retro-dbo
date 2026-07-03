import { useState } from 'react';
import type { ValorCelula } from '@dbos/shared';
import { useDialogos } from '../../areaTrabalho/useDialogos';
import { ErroApiError } from '../consulta/ganchos';
import { Icone } from '../../tema/icones/Icone';
import { converterValor, ehTipoNumerico, ehTipoMoeda, formatarMoeda } from './conversao';
import { useAtualizarLinha, useInserirLinha, useLinhas, useRemoverLinha } from './ganchos';

const TAMANHO_PAGINA = 100;

function formatar(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function TabelaGrade({ esquema, tabela }: { esquema: string; tabela: string }) {
  const [pagina, setPagina] = useState(0);
  const consulta = useLinhas(esquema, tabela, pagina, TAMANHO_PAGINA);
  const abrirDialogo = useDialogos((s) => s.abrir);
  const inserir = useInserirLinha(esquema, tabela);
  const atualizar = useAtualizarLinha(esquema, tabela);
  const remover = useRemoverLinha(esquema, tabela);

  const [editando, setEditando] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [inserindo, setInserindo] = useState(false);
  const [rascunhoNovo, setRascunhoNovo] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState<number | null>(null);

  function mostrarErro(e: unknown) {
    const erro = e instanceof ErroApiError ? e.erro : undefined;
    const detalhe = [erro?.detalhe, erro?.codigoSql ? `Erro SQL ${erro.codigoSql}` : undefined]
      .filter(Boolean)
      .join('\n');
    abrirDialogo({
      tipo: 'erro',
      titulo: 'Erro',
      mensagem: erro?.mensagem ?? 'A operação falhou.',
      detalhe: detalhe || undefined,
    });
  }

  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando linhas…</p>;
  if (consulta.isError) return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;

  const dados = consulta.data;
  const editavel = dados.chavePrimaria.length > 0;
  const totalPaginas = Math.max(1, Math.ceil(dados.total / dados.tamanho));

  function chaveDaLinha(linha: Record<string, unknown>): Record<string, ValorCelula> {
    const chave: Record<string, ValorCelula> = {};
    for (const k of dados.chavePrimaria) chave[k] = linha[k] as ValorCelula;
    return chave;
  }

  function iniciarEdicao(indice: number) {
    const linha = dados.linhas[indice]!;
    const r: Record<string, string> = {};
    for (const c of dados.colunas) {
      if (!c.ehChavePrimaria) r[c.nome] = linha[c.nome] == null ? '' : String(linha[c.nome]);
    }
    setRascunho(r);
    setEditando(indice);
  }

  function salvarEdicao(indice: number) {
    const linha = dados.linhas[indice]!;
    const valores: Record<string, ValorCelula> = {};
    for (const c of dados.colunas) {
      if (!c.ehChavePrimaria) valores[c.nome] = converterValor(c, rascunho[c.nome] ?? '');
    }
    atualizar.mutate(
      { chave: chaveDaLinha(linha), valores },
      { onSuccess: () => setEditando(null), onError: mostrarErro },
    );
  }

  function salvarInsercao() {
    const valores: Record<string, ValorCelula> = {};
    for (const c of dados.colunas) {
      const texto = rascunhoNovo[c.nome];
      if (texto !== undefined && texto !== '') valores[c.nome] = converterValor(c, texto);
    }
    inserir.mutate(valores, {
      onSuccess: () => {
        setInserindo(false);
        setRascunhoNovo({});
      },
      onError: mostrarErro,
    });
  }

  function excluir(indice: number) {
    const linha = dados.linhas[indice]!;
    remover.mutate(chaveDaLinha(linha), {
      onSuccess: () => setConfirmando(null),
      onError: mostrarErro,
    });
  }

  return (
    <div className="grade-dados">
      <div className="grade-barra">
        {editavel && (
          <button onClick={() => setInserindo((v) => !v)}>
            <Icone nome="insert" tamanho={14} alt="" style={{ marginRight: 4 }} /> Nova linha
          </button>
        )}
        <span className="grade-paginacao">
          <button
            disabled={pagina === 0}
            onClick={() => setPagina((p) => p - 1)}
            aria-label="Anterior"
          >
            ◀
          </button>
          Página {pagina + 1} de {totalPaginas} ({dados.total} linhas)
          <button
            disabled={pagina + 1 >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
            aria-label="Próxima"
          >
            ▶
          </button>
        </span>
        {!editavel && (
          <span className="grade-aviso-pk">
            <Icone nome="stop" tamanho={12} alt="" style={{ marginRight: 3 }} />
            Sem chave primária — somente leitura.
          </span>
        )}
      </div>
      <div className="grade-rolagem">
        <table className="grade-tabela">
          <thead>
            <tr>
              {editavel && <th>Ações</th>}
              {dados.colunas.map((c) => (
                <th key={c.nome} className={ehTipoNumerico(c.tipoDado) ? 'num' : undefined}>
                  {c.ehChavePrimaria ? (
                    <span className="grade-th-pk">
                      <Icone nome="key" tamanho={12} alt="chave primária" />
                      {c.nome}
                    </span>
                  ) : (
                    c.nome
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inserindo && (
              <tr>
                <td className="grade-acoes">
                  <button onClick={salvarInsercao} disabled={inserir.isPending}>
                    Inserir
                  </button>
                  <button onClick={() => setInserindo(false)}>Cancelar</button>
                </td>
                {dados.colunas.map((c) => (
                  <td key={c.nome}>
                    <input
                      aria-label={`novo ${c.nome}`}
                      value={rascunhoNovo[c.nome] ?? ''}
                      onChange={(e) => setRascunhoNovo((r) => ({ ...r, [c.nome]: e.target.value }))}
                    />
                  </td>
                ))}
              </tr>
            )}
            {dados.linhas.map((linha, indice) => {
              const emEdicao = editando === indice;
              return (
                <tr key={indice}>
                  {editavel && (
                    <td className="grade-acoes">
                      {emEdicao ? (
                        <>
                          <button
                            onClick={() => salvarEdicao(indice)}
                            disabled={atualizar.isPending}
                          >
                            Salvar
                          </button>
                          <button onClick={() => setEditando(null)}>Cancelar</button>
                        </>
                      ) : confirmando === indice ? (
                        <>
                          Excluir?
                          <button onClick={() => excluir(indice)} disabled={remover.isPending}>
                            Sim
                          </button>
                          <button onClick={() => setConfirmando(null)}>Não</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => iniciarEdicao(indice)}>Editar</button>
                          <button onClick={() => setConfirmando(indice)}>Excluir</button>
                        </>
                      )}
                    </td>
                  )}
                  {dados.colunas.map((c) => (
                    <td key={c.nome} className={ehTipoNumerico(c.tipoDado) ? 'num' : undefined}>
                      {emEdicao && !c.ehChavePrimaria ? (
                        <input
                          aria-label={`editar ${c.nome}`}
                          value={rascunho[c.nome] ?? ''}
                          onChange={(e) => setRascunho((r) => ({ ...r, [c.nome]: e.target.value }))}
                        />
                      ) : ehTipoMoeda(c.tipoDado) ? (
                        formatarMoeda(linha[c.nome])
                      ) : (
                        formatar(linha[c.nome])
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
