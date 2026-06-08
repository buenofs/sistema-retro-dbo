import { useRef, useState, type KeyboardEvent } from 'react';
import type { FiltrosBusca, Funcionario, ResultadoConsulta } from '@dbos/shared';
import { useLoja } from '../../areaTrabalho/loja';
import { requisitar } from '../../api/cliente';
import { executarComando, type ContextoTerminal } from './comandos';
import './terminal.css';

const PROMPT = 'C:\\DBOS>';

export function Terminal() {
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const [linhas, setLinhas] = useState<string[]>([
    'DBOS [Versão 1.0]',
    'Digite "ajuda" para ver os comandos.',
    '',
  ]);
  const [entrada, setEntrada] = useState('');
  const [historico, setHistorico] = useState<string[]>([]);
  const [indice, setIndice] = useState(-1);
  const fimRef = useRef<HTMLDivElement>(null);

  const ctx: ContextoTerminal = {
    consultar: async (sql) => {
      const r = await requisitar<ResultadoConsulta>('/api/consulta', {
        method: 'POST',
        body: JSON.stringify({ sql }),
      });
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
    buscar: async (filtros: FiltrosBusca) => {
      const params = new URLSearchParams();
      for (const [chave, valor] of Object.entries(filtros)) {
        if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor));
      }
      const r = await requisitar<Funcionario[]>(`/api/busca/funcionarios?${params.toString()}`);
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.dados;
    },
    abrirApp: (tipo, dados) => abrirJanela(tipo, dados),
    limpar: () => setLinhas([]),
  };

  async function submeter() {
    const texto = entrada;
    setLinhas((l) => [...l, `${PROMPT} ${texto}`]);
    setEntrada('');
    if (texto.trim()) setHistorico((h) => [...h, texto]);
    setIndice(-1);
    try {
      const saida = await executarComando(texto, ctx);
      if (saida.length) setLinhas((l) => [...l, ...saida, '']);
    } catch (e) {
      setLinhas((l) => [...l, `Erro: ${e instanceof Error ? e.message : String(e)}`, '']);
    }
    fimRef.current?.scrollIntoView?.();
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submeter();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historico.length === 0) return;
      const i = indice < 0 ? historico.length - 1 : Math.max(0, indice - 1);
      setIndice(i);
      setEntrada(historico[i] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (indice < 0) return;
      const i = indice + 1;
      if (i >= historico.length) {
        setIndice(-1);
        setEntrada('');
      } else {
        setIndice(i);
        setEntrada(historico[i] ?? '');
      }
    }
  }

  return (
    <div className="terminal">
      <div className="terminal-saida">
        {linhas.map((l, i) => (
          <div key={i} className="terminal-linha">
            {l}
          </div>
        ))}
        <div className="terminal-prompt">
          <span className="terminal-ps">{PROMPT}</span>
          <input
            className="terminal-input"
            aria-label="Comando"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={aoTeclar}
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div ref={fimRef} />
      </div>
    </div>
  );
}
