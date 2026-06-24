import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Drive, Item } from '@dbos/shared';
import { pegar, mandar, type Envelope } from '../../api/cliente';
import { useContextoArquivos } from '../arquivos/contexto';
import { criarShell, type ContextoTerminal, type ItemTerminal } from './comandos';
import './terminal.css';

export function Terminal() {
  const driveId = useContextoArquivos((estado) => estado.driveId);
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

  // Descobre a letra do drive atual (para o prompt).
  useEffect(() => {
    let vivo = true;
    pegar<Envelope<Drive[]>>('/api/arquivos/drives').then((envelope) => {
      const drive = envelope.dados.find((item) => item.id === driveId);
      if (vivo && drive) setLetra(drive.letra);
    }).catch(() => {});
    return () => { vivo = false; };
  }, [driveId]);

  const ctx: ContextoTerminal = useMemo(() => ({
    letra,
    listar: async (paiId) => {
      const params = new URLSearchParams({ driveId: String(driveId) });
      if (paiId !== null) params.set('paiId', String(paiId));
      const envelope = await pegar<Envelope<Item[]>>(`/api/arquivos/listar?${params.toString()}`);
      return envelope.dados.map((item): ItemTerminal => ({ id: item.id, nome: item.nome, tipo: item.tipo }));
    },
    criarPasta: async (nome, paiId) => { await mandar('/api/arquivos/pasta', 'POST', { nome, paiId, driveId }); },
    criarArquivo: async (nome, paiId, conteudo) => { await mandar('/api/arquivos/arquivo', 'POST', { nome, paiId, driveId, conteudo }); },
    renomear: async (id, nome) => { await mandar(`/api/arquivos/${id}/renomear`, 'PUT', { nome }); },
    mover: async (id, paiId) => { await mandar(`/api/arquivos/${id}/mover`, 'PUT', { paiId }); },
    copiar: async (id, paiId) => { await mandar(`/api/arquivos/${id}/copiar`, 'POST', { paiId }); },
    apagar: async (id) => { await mandar(`/api/arquivos/${id}`, 'DELETE'); },
    restaurar: async (id) => { await mandar(`/api/arquivos/${id}/restaurar`, 'PUT'); },
    esvaziar: async () => { await mandar('/api/arquivos/lixeira', 'DELETE'); },
    lerConteudo: async (id) => (await pegar<Envelope<{ conteudo: string }>>(`/api/arquivos/${id}`)).dados.conteudo,
    salvarConteudo: async (id, conteudo) => { await mandar(`/api/arquivos/${id}/conteudo`, 'PUT', { conteudo }); },
    listarLixeira: async () => {
      const envelope = await pegar<Envelope<Item[]>>('/api/arquivos/lixeira');
      return envelope.dados.map((item): ItemTerminal => ({ id: item.id, nome: item.nome, tipo: item.tipo }));
    },
    limpar: () => setLinhas([]),
  }), [letra, driveId]);

  // Shell estável por (driveId, letra): preserva o diretório atual entre comandos.
  const shellRef = useRef(criarShell(ctx));
  useEffect(() => { shellRef.current = criarShell(ctx); }, [ctx]);

  useEffect(() => { entradaRef.current?.focus(); }, []);

  function focarEntrada() {
    if (window.getSelection()?.toString()) return;
    entradaRef.current?.focus();
  }

  async function submeter() {
    const texto = entrada;
    const prompt = shellRef.current.prompt();
    setLinhas((anteriores) => [...anteriores, `${prompt} ${texto}`]);
    setEntrada('');
    if (texto.trim()) setHistorico((anteriores) => [...anteriores, texto]);
    setIndice(-1);
    try {
      const saida = await shellRef.current.executar(texto);
      if (saida.length) setLinhas((anteriores) => [...anteriores, ...saida, '']);
    } catch (erro) {
      setLinhas((anteriores) => [...anteriores, `Erro: ${erro instanceof Error ? erro.message : String(erro)}`, '']);
    }
    fimRef.current?.scrollIntoView?.();
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      void submeter();
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (historico.length === 0) return;
      const novoIndice = indice < 0 ? historico.length - 1 : Math.max(0, indice - 1);
      setIndice(novoIndice);
      setEntrada(historico[novoIndice] ?? '');
    } else if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      if (indice < 0) return;
      const proximoIndice = indice + 1;
      if (proximoIndice >= historico.length) {
        setIndice(-1);
        setEntrada('');
      } else {
        setIndice(proximoIndice);
        setEntrada(historico[proximoIndice] ?? '');
      }
    }
  }

  return (
    <div className="terminal" onClick={focarEntrada}>
      <div className="terminal-saida">
        {linhas.map((linha, i) => (
          <div key={i} className="terminal-linha">{linha}</div>
        ))}
        <div className="terminal-prompt">
          <span className="terminal-ps">{shellRef.current.prompt()}</span>
          <input
            ref={entradaRef}
            className="terminal-input"
            aria-label="Comando"
            value={entrada}
            onChange={(evento) => setEntrada(evento.target.value)}
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
