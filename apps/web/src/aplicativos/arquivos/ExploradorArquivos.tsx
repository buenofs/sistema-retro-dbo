import { useState } from 'react';
import type { Item } from '@dbos/shared';
import type { PropsApp } from '../../areaTrabalho/tipos';
import { useLoja } from '../../areaTrabalho/loja';
import { Icone } from '../../tema/icones/Icone';
import { useContextoArquivos } from './contexto';
import {
  useDrives, useConteudo, useCriarPasta, useCriarArquivo, useRenomear,
  useApagar, useMover, useCopiar,
} from './ganchos';
import './arquivos.css';

interface Nivel { id: number | null; nome: string }

export function ExploradorArquivos(_props: PropsApp) {
  const driveId = useContextoArquivos((s) => s.driveId);
  const definirDrive = useContextoArquivos((s) => s.definirDrive);
  const abrirJanela = useLoja((s) => s.abrirJanela);

  // Pilha de navegação: o topo é a pasta atual (id null = raiz do drive).
  const [pilha, setPilha] = useState<Nivel[]>([{ id: null, nome: '' }]);
  const atual = pilha[pilha.length - 1]!;
  const [sel, setSel] = useState<number | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);

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
    if (item.tipo === 'pasta') setPilha((p) => [...p, { id: item.id, nome: item.nome }]);
    else abrirJanela('bloco', { id: item.id, nome: item.nome });
  }
  function subir() {
    setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p));
    setSel(null);
  }

  function novaPasta() {
    const nome = window.prompt('Nome da nova pasta:');
    if (nome) criarPasta.mutate({ nome, paiId: atual.id, driveId });
  }
  function novoArquivo() {
    const nome = window.prompt('Nome do novo arquivo:');
    if (nome) criarArquivo.mutate({ nome, paiId: atual.id, driveId, conteudo: '' });
  }
  function renomearSel() {
    if (sel === null) return;
    const item = conteudo.data?.find((i) => i.id === sel);
    const nome = window.prompt('Novo nome:', item?.nome);
    if (nome) renomear.mutate({ id: sel, nome });
  }
  function apagarSel() {
    if (sel !== null) apagar.mutate(sel);
    setSel(null);
  }
  function colar() {
    if (copiado !== null) copiar.mutate({ id: copiado, paiId: atual.id });
  }

  return (
    <div className="exp">
      <div className="exp-barra">
        <select aria-label="Drive" value={driveId} onChange={(e) => { definirDrive(Number(e.target.value)); setPilha([{ id: null, nome: '' }]); }}>
          {drives.data?.map((d) => <option key={d.id} value={d.id}>{d.letra}: {d.rotulo}</option>)}
        </select>
        <button onClick={subir} disabled={pilha.length === 1}>Acima</button>
        <span className="exp-endereco">{caminho}</span>
        <button onClick={novaPasta}>Nova Pasta</button>
        <button onClick={novoArquivo}>Novo Arquivo</button>
        <button onClick={renomearSel} disabled={sel === null}>Renomear</button>
        <button onClick={() => setCopiado(sel)} disabled={sel === null}>Copiar</button>
        <button onClick={colar} disabled={copiado === null}>Colar</button>
        <button onClick={apagarSel} disabled={sel === null}>Apagar</button>
      </div>
      <div className="exp-lista">
        {conteudo.isLoading && <div style={{ padding: 8 }}>Carregando…</div>}
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
                mover.mutate({ id: arrastado, paiId: item.id });
              }
            }}
          >
            <Icone nome={item.tipo === 'pasta' ? 'folder' : 'newdoc'} tamanho={16} />
            <span>{item.nome}</span>
          </div>
        ))}
        {conteudo.data?.length === 0 && <div style={{ padding: 8, opacity: 0.7 }}>(pasta vazia)</div>}
      </div>
    </div>
  );
}
