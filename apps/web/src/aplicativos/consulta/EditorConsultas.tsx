import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { ErroApiError, useExecutarConsulta } from './ganchos';
import { GradeResultado } from './GradeResultado';
import { useDialogos } from '../../areaTrabalho/useDialogos';
import './consulta.css';

const SQL_INICIAL = 'SELECT TOP 100 * FROM INFORMATION_SCHEMA.TABLES;';

export function EditorConsultas() {
  const [texto, setTexto] = useState(SQL_INICIAL);
  const executar = useExecutarConsulta();
  const abrirDialogo = useDialogos((s) => s.abrir);

  function rodar() {
    executar.mutate(texto, {
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
          {executar.isPending ? 'Executando…' : '▶ Executar (F5)'}
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
        <CodeMirror value={texto} height="160px" extensions={[sql()]} onChange={setTexto} />
      </div>
      <div className="editor-resultado">
        {executar.data ? (
          <GradeResultado resultado={executar.data} />
        ) : (
          <p style={{ padding: 8 }}>Execute uma consulta para ver o resultado.</p>
        )}
      </div>
    </div>
  );
}
