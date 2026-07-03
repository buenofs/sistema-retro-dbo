import { useState, useRef } from 'react';
import type { ComandoSQL, Item } from '@dbos/shared';
import type { PropsApp } from '../../areaTrabalho/tipos';
import { useLoja } from '../../areaTrabalho/loja';
import { Icone } from '../../tema/icones/Icone';
import { useContextoArquivos } from './contexto';
import {
  useDrives, useConteudo, useCriarPasta, useCriarArquivo, useRenomear,
  useApagar, useMover, useCopiar,
} from './ganchos';
import { useLojaLogSQL } from '../monitor/lojaLog';
import { resolverSQL } from '../monitor/resolver';
import './arquivos.css';

interface Nivel { id: number | null; nome: string }

export function ExploradorArquivos(_props: PropsApp) {
  const driveId = useContextoArquivos((s) => s.driveId);
  const definirDrive = useContextoArquivos((s) => s.definirDrive);
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const ultimoLote = useLojaLogSQL((s) => s.ultimoLote);

  const [sqlAcao, setSqlAcao] = useState<ComandoSQL[] | null>(null);

  const [pilha, setPilha] = useState<Nivel[]>([{ id: null, nome: '' }]);
  const atual = pilha[pilha.length - 1]!;
  const [sel, setSel] = useState<number | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);

  const [edicao, setEdicao] = useState<{ id: number | 'novo'; tipo: 'pasta' | 'arquivo' } | null>(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const ignorarBlur = useRef(false);

  const drives = useDrives();
  const conteudo = useConteudo(driveId, atual.id);
  const criarPasta = useCriarPasta();
  const criarArquivo = useCriarArquivo();
  const renomear = useRenomear();
  const apagar = useApagar();
  const mover = useMover();
  const copiar = useCopiar();

  const letra = drives.data?.find((d) => d.id === driveId)?.letra ?? 'C';
  const caminho = `${letra}:\\` + pilha.slice(1).map((n) => n.nome).join('\\');

  function entrar(item: Item) {
    setSqlAcao(null);
    if (item.tipo === 'pasta') setPilha((p) => [...p, { id: item.id, nome: item.nome }]);
    else abrirJanela('bloco', { id: item.id, nome: item.nome });
  }
  function subir() {
    setSqlAcao(null);
    setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p));
    setSel(null);
  }

  function novaPasta() {
    setEdicao({ id: 'novo', tipo: 'pasta' });
    setNomeEdit('');
  }
  function novoArquivo() {
    setEdicao({ id: 'novo', tipo: 'arquivo' });
    setNomeEdit('');
  }
  function renomearSel() {
    if (sel === null) return;
    const item = conteudo.data?.find((i) => i.id === sel);
    if (!item) return;
    setEdicao({ id: item.id, tipo: item.tipo });
    setNomeEdit(item.nome);
  }
  function apagarSel() {
    if (sel !== null) apagar.mutate(sel, { onSuccess: (env) => setSqlAcao(env.sql) });
    setSel(null);
  }
  function colar() {
    if (copiado !== null) copiar.mutate({ id: copiado, paiId: atual.id }, { onSuccess: (env) => setSqlAcao(env.sql) });
  }

  function cancelarEdicao() {
    setEdicao(null);
    setNomeEdit('');
  }
  function confirmarEdicao() {
    // Enter chama isto e zera `edicao`; o blur do desmonte chama de novo, mas o guard acima já barra (edicao === null).
    if (!edicao) return;
    const nome = nomeEdit.trim();
    if (!nome) { cancelarEdicao(); return; }
    if (edicao.id === 'novo') {
      if (edicao.tipo === 'pasta') {
        criarPasta.mutate({ nome, paiId: atual.id, driveId }, { onSuccess: (env) => setSqlAcao(env.sql) });
      } else {
        criarArquivo.mutate({ nome, paiId: atual.id, driveId, conteudo: '' }, { onSuccess: (env) => setSqlAcao(env.sql) });
      }
    } else {
      renomear.mutate({ id: edicao.id as number, nome }, { onSuccess: (env) => setSqlAcao(env.sql) });
    }
    cancelarEdicao();
  }

  const editInput = (
    <input
      className="exp-edit-input"
      autoFocus
      value={nomeEdit}
      onChange={(e) => setNomeEdit(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmarEdicao(); }
        else if (e.key === 'Escape') { e.preventDefault(); ignorarBlur.current = true; cancelarEdicao(); }
      }}
      onBlur={() => { if (ignorarBlur.current) { ignorarBlur.current = false; return; } confirmarEdicao(); }}
    />
  );

  const sqlMostrado = sqlAcao ?? ultimoLote;

  return (
    <div
      className="exp"
      onKeyDown={(e) => {
        if (e.key === 'F2' && sel !== null && !edicao) { e.preventDefault(); renomearSel(); }
      }}
      tabIndex={-1}
    >
      <div className="exp-barra">
        <select aria-label="Drive" value={driveId} onChange={(e) => { definirDrive(Number(e.target.value)); setPilha([{ id: null, nome: '' }]); setSqlAcao(null); }}>
          {drives.data?.map((d) => <option key={d.id} value={d.id}>{d.letra}: {d.rotulo}</option>)}
        </select>
        <button onClick={subir} disabled={pilha.length === 1}>Acima</button>
        <span className="exp-endereco">{caminho}</span>
        <button onClick={novaPasta} disabled={!!edicao}>Nova Pasta</button>
        <button onClick={novoArquivo} disabled={!!edicao}>Novo Arquivo</button>
        <button onClick={renomearSel} disabled={sel === null || !!edicao}>Renomear</button>
        <button onClick={() => setCopiado(sel)} disabled={sel === null}>Copiar</button>
        <button onClick={colar} disabled={copiado === null}>Colar</button>
        <button onClick={apagarSel} disabled={sel === null || !!edicao}>Apagar</button>
      </div>
      <div className="exp-lista">
        {conteudo.isLoading && <div style={{ padding: 8 }}>Carregando…</div>}
        {edicao?.id === 'novo' && (
          <div className="exp-item">
            <Icone nome={edicao.tipo === 'pasta' ? 'folder' : 'newdoc'} tamanho={16} />
            {editInput}
          </div>
        )}
        {conteudo.data?.map((item) => (
          <div
            key={item.id}
            className={`exp-item${sel === item.id ? ' sel' : ''}${alvo === item.id ? ' alvo' : ''}`}
            onClick={() => setSel(item.id)}
            onDoubleClick={() => entrar(item)}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/id', String(item.id))}
            onDragOver={(e) => { if (item.tipo === 'pasta') { e.preventDefault(); setAlvo(item.id); } }}
            onDragLeave={() => setAlvo((a) => (a === item.id ? null : a))}
            onDrop={(e) => {
              e.preventDefault();
              setAlvo(null);
              const arrastado = Number(e.dataTransfer.getData('text/id'));
              if (item.tipo === 'pasta' && arrastado && arrastado !== item.id) {
                mover.mutate({ id: arrastado, paiId: item.id }, { onSuccess: (env) => setSqlAcao(env.sql) });
                setSel(null);
              }
            }}
          >
            <Icone nome={item.tipo === 'pasta' ? 'folder' : 'newdoc'} tamanho={16} />
            {edicao?.id === item.id ? (
              editInput
            ) : (
              <span>{item.nome}</span>
            )}
          </div>
        ))}
        {conteudo.data?.length === 0 && !edicao && <div style={{ padding: 8, opacity: 0.7 }}>(pasta vazia)</div>}
      </div>
      <div className="exp-sql">
        <div className="exp-sql-cab">
          <span className="exp-sql-titulo">SQL desta ação</span>
          <button onClick={() => abrirJanela('monitor')}>Histórico completo</button>
        </div>
        <div className="exp-sql-corpo">
          {sqlMostrado.length === 0 ? (
            <div className="exp-sql-vazia">(nenhuma ação ainda — navegue ou crie algo)</div>
          ) : (
            sqlMostrado.map((c, i) => (
              <div key={i} className="exp-sql-linha">
                <span className={`exp-sql-badge sql-${c.tipo}`}>{c.tipo}</span>
                <code>{resolverSQL(c.texto, c.parametros)}</code>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
