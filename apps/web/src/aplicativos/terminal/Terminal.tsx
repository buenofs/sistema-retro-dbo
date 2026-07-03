import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ComandoSQL, Drive, Item } from '@dbos/shared';
import { requisitar } from '../../api/cliente';
import { useContextoArquivos } from '../arquivos/contexto';
import { criarShell, type ContextoTerminal, type ItemTerminal } from './comandos';
import './terminal.css';

type Env<T> = { dados: T; sql: ComandoSQL[] };

async function api<T>(caminho: string, method?: string, corpo?: unknown): Promise<Env<T>> {
  const r = await requisitar<Env<T>>(
    caminho,
    method ? { method, body: corpo === undefined ? undefined : JSON.stringify(corpo) } : {},
  );
  if (!r.ok) throw new Error(r.erro.mensagem);
  return r.dados;
}

export function Terminal() {
  const driveId = useContextoArquivos((s) => s.driveId);
  const [letra, setLetra] = useState('C');
  const [linhas, setLinhas] = useState<string[]>([
    'DBOS [Versão 2.0]',
    'Digite "ajuda" para ver os comandos.',
    '',
  ]);
  const [entrada, setEntrada] = useState('');
  const [historico, setHistorico] = useState<string[]>([]);
  const [indice, setIndice] = useState(-1);
  const fimRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    api<Drive[]>('/api/arquivos/drives')
      .then((e) => {
        const d = e.dados.find((x) => x.id === driveId);
        if (vivo && d) setLetra(d.letra);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [driveId]);

  const ctx: ContextoTerminal = useMemo(
    () => ({
      letra,
      listar: async (paiId) => {
        const q = new URLSearchParams({ driveId: String(driveId) });
        if (paiId !== null) q.set('paiId', String(paiId));
        const e = await api<Item[]>(`/api/arquivos/listar?${q.toString()}`);
        return e.dados.map((i): ItemTerminal => ({ id: i.id, nome: i.nome, tipo: i.tipo }));
      },
      criarPasta: async (nome, paiId) => {
        await api('/api/arquivos/pasta', 'POST', { nome, paiId, driveId });
      },
      criarArquivo: async (nome, paiId, conteudo) => {
        await api('/api/arquivos/arquivo', 'POST', { nome, paiId, driveId, conteudo });
      },
      renomear: async (id, nome) => {
        await api(`/api/arquivos/${id}/renomear`, 'PUT', { nome });
      },
      mover: async (id, paiId) => {
        await api(`/api/arquivos/${id}/mover`, 'PUT', { paiId });
      },
      copiar: async (id, paiId) => {
        await api(`/api/arquivos/${id}/copiar`, 'POST', { paiId });
      },
      apagar: async (id) => {
        await api(`/api/arquivos/${id}`, 'DELETE');
      },
      restaurar: async (id) => {
        await api(`/api/arquivos/${id}/restaurar`, 'PUT');
      },
      esvaziar: async () => {
        await api('/api/arquivos/lixeira', 'DELETE');
      },
      lerConteudo: async (id) =>
        (await api<{ conteudo: string }>(`/api/arquivos/${id}`)).dados.conteudo,
      salvarConteudo: async (id, conteudo) => {
        await api(`/api/arquivos/${id}/conteudo`, 'PUT', { conteudo });
      },
      listarLixeira: async () => {
        const e = await api<Item[]>('/api/arquivos/lixeira');
        return e.dados.map((i): ItemTerminal => ({ id: i.id, nome: i.nome, tipo: i.tipo }));
      },
      limpar: () => setLinhas([]),
    }),
    [letra, driveId],
  );

  // Shell estável por (driveId, letra): preserva o diretório atual entre comandos.
  const shellRef = useRef(criarShell(ctx));
  useEffect(() => {
    shellRef.current = criarShell(ctx);
  }, [ctx]);

  useEffect(() => {
    entradaRef.current?.focus();
  }, []);

  function focarEntrada() {
    if (window.getSelection()?.toString()) return;
    entradaRef.current?.focus();
  }

  async function submeter() {
    const texto = entrada;
    const prompt = shellRef.current.prompt();
    setLinhas((l) => [...l, `${prompt} ${texto}`]);
    setEntrada('');
    if (texto.trim()) setHistorico((h) => [...h, texto]);
    setIndice(-1);
    try {
      const saida = await shellRef.current.executar(texto);
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
    <div className="terminal" onClick={focarEntrada}>
      <div className="terminal-saida">
        {linhas.map((l, i) => (
          <div key={i} className="terminal-linha">
            {l}
          </div>
        ))}
        <div className="terminal-prompt">
          <span className="terminal-ps">{shellRef.current.prompt()}</span>
          <input
            ref={entradaRef}
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
