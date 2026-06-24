import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { ErroApiError, useExecutarConsulta } from './ganchos';
import { GradeResultado } from './GradeResultado';
import { useDialogos } from '../../areaTrabalho/useDialogos';
import { Estado } from '../comuns/Estado';
import { Icone } from '../../tema/icones/Icone';
import { useTema } from '../../tema/ganchos';
import { useSessao } from '../../autenticacao/ganchos';
import { temaCodeMirror } from './temaCodeMirror';
import './consulta.css';

const SQL_INICIAL = 'SELECT TOP 100 * FROM INFORMATION_SCHEMA.TABLES;';

export function EditorConsultas() {
  const [texto, setTexto] = useState(SQL_INICIAL);
  const [ms, setMs] = useState<number | null>(null);
  const executar = useExecutarConsulta();
  const abrirDialogo = useDialogos((s) => s.abrir);
  const { pele } = useTema();
  const sessao = useSessao();

  function rodar() {
    const inicio = performance.now();
    setMs(null);
    executar.mutate(texto, {
      onSettled: () => setMs(Math.round(performance.now() - inicio)),
      onError: (e) => {
        const erro = e instanceof ErroApiError ? e.erro : undefined;
        const detalhe = [erro?.detalhe, erro?.codigoSql ? `Erro SQL ${erro.codigoSql}` : undefined]
          .filter(Boolean)
          .join('\n');
        abrirDialogo({
          tipo: 'erro',
          titulo: 'Erro',
          mensagem: erro?.mensagem ?? 'Falha ao executar a consulta.',
          detalhe: detalhe || undefined,
        });
      },
    });
  }

  return (
    <div className="editor-consultas">
      <div className="editor-barra">
        <button onClick={rodar} disabled={executar.isPending}>
          <Icone nome="run" tamanho={14} alt="" style={{ marginRight: 4 }} />
          {executar.isPending ? 'Executando…' : 'Executar (F5)'}
        </button>
      </div>
      <div
        className="editor-codigo"
        onKeyDown={(e) => {
          if (e.key === 'F5') {
            e.preventDefault();
            rodar();
          }
        }}
      >
        <CodeMirror
          value={texto}
          height="160px"
          extensions={[sql(), temaCodeMirror(pele)]}
          onChange={setTexto}
        />
      </div>
      <div className="editor-resultado">
        {executar.data ? (
          <GradeResultado resultado={executar.data} />
        ) : (
          <Estado>Execute uma consulta para ver o resultado.</Estado>
        )}
      </div>
      <div className="editor-statusbar">
        {executar.isPending ? (
          <span className="editor-estado">
            <Icone nome="run" tamanho={12} alt="" /> Executando…
          </span>
        ) : executar.isError ? (
          <span className="editor-estado erro">
            <Icone nome="stop" tamanho={12} alt="" /> Erro
          </span>
        ) : executar.data ? (
          <span className="editor-estado">
            <Icone nome="grid" tamanho={12} alt="" />
            {executar.data.colunas.length > 0
              ? `${executar.data.linhas.length} linha(s)`
              : `${executar.data.linhasAfetadas} afetada(s)`}
          </span>
        ) : (
          <span className="editor-estado">Pronto</span>
        )}
        {ms !== null && <span>{ms} ms</span>}
        {sessao.data && (
          <span style={{ marginLeft: 'auto' }}>
            {sessao.data.login} · {sessao.data.banco}
          </span>
        )}
      </div>
    </div>
  );
}
