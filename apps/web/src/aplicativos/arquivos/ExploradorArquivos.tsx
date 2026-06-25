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
import { Estado } from '../comuns/Estado';
import './arquivos.css';

interface Nivel { id: number | null; nome: string }

export function ExploradorArquivos(_props: PropsApp) {
  const driveId = useContextoArquivos((loja) => loja.driveId);
  const definirDrive = useContextoArquivos((loja) => loja.definirDrive);
  const abrirJanela = useLoja((loja) => loja.abrirJanela);
  const ultimoLote = useLojaLogSQL((loja) => loja.ultimoLote);

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

  const letra = drives.data?.find((drive) => drive.id === driveId)?.letra ?? 'C';
  const caminho = `${letra}:\\` + pilha.slice(1).map((nivel) => nivel.nome).join('\\');

  function entrar(item: Item) {
    setSqlAcao(null);
    if (item.tipo === 'pasta') setPilha((anterior) => [...anterior, { id: item.id, nome: item.nome }]);
    else abrirJanela('bloco', { id: item.id, nome: item.nome });
  }
  function subir() {
    setSqlAcao(null);
    setPilha((anterior) => (anterior.length > 1 ? anterior.slice(0, -1) : anterior));
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
    const itemSelecionado = conteudo.data?.find((item) => item.id === sel);
    if (!itemSelecionado) return;
    setEdicao({ id: itemSelecionado.id, tipo: itemSelecionado.tipo });
    setNomeEdit(itemSelecionado.nome);
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
      onChange={(evento) => setNomeEdit(evento.target.value)}
      onClick={(evento) => evento.stopPropagation()}
      onDoubleClick={(evento) => evento.stopPropagation()}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') { evento.preventDefault(); confirmarEdicao(); }
        else if (evento.key === 'Escape') { evento.preventDefault(); ignorarBlur.current = true; cancelarEdicao(); }
      }}
      onBlur={() => { if (ignorarBlur.current) { ignorarBlur.current = false; return; } confirmarEdicao(); }}
    />
  );

  const sqlMostrado = sqlAcao ?? ultimoLote;

  return (
    <div
      className="exp"
      onKeyDown={(evento) => {
        if (evento.key === 'F2' && sel !== null && !edicao) { evento.preventDefault(); renomearSel(); }
      }}
      tabIndex={-1}
    >
      <div className="exp-barra">
        <select aria-label="Drive" value={driveId} onChange={(evento) => { definirDrive(Number(evento.target.value)); setPilha([{ id: null, nome: '' }]); setSqlAcao(null); }}>
          {drives.data?.map((drive) => <option key={drive.id} value={drive.id}>{drive.letra}: {drive.rotulo}</option>)}
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
        {conteudo.isLoading && <Estado>Carregando…</Estado>}
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
            onDragStart={(evento) => evento.dataTransfer.setData('text/id', String(item.id))}
            onDragOver={(evento) => { if (item.tipo === 'pasta') { evento.preventDefault(); setAlvo(item.id); } }}
            onDragLeave={() => setAlvo((anterior) => (anterior === item.id ? null : anterior))}
            onDrop={(evento) => {
              evento.preventDefault();
              setAlvo(null);
              const arrastado = Number(evento.dataTransfer.getData('text/id'));
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
        {conteudo.data?.length === 0 && !edicao && <Estado variante="vazio">(pasta vazia)</Estado>}
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
            sqlMostrado.map((comando, i) => (
              <div key={i} className="exp-sql-linha">
                <span className={`exp-sql-badge sql-${comando.tipo}`}>{comando.tipo}</span>
                <code>{resolverSQL(comando.texto, comando.parametros)}</code>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
