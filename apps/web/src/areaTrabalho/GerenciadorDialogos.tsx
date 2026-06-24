import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { type Dialogo, useDialogos } from './useDialogos';
import { tocarSom } from './sons';
import { Icone } from '../tema/icones/Icone';
import type { NomeIcone } from '../tema/icones/motor';

const ICONE: Record<Dialogo['tipo'], NomeIcone> = {
  erro: 'stop',
  aviso: 'help',
  info: 'props',
};

// Portal único de diálogos modais 98.css (spec §6.4). Montado uma vez no desktop.
export function GerenciadorDialogos() {
  const dialogos = useDialogos(useShallow((loja) => loja.dialogos));
  const fechar = useDialogos((loja) => loja.fechar);

  // a11y: Esc fecha o diálogo do topo.
  useEffect(() => {
    if (dialogos.length === 0) return;
    function aoTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        const topo = dialogos[dialogos.length - 1];
        if (topo) fechar(topo.id);
      }
    }
    window.addEventListener('keydown', aoTecla);
    return () => window.removeEventListener('keydown', aoTecla);
  }, [dialogos, fechar]);

  if (dialogos.length === 0) return null;
  return (
    <div className="camada-dialogos">
      {dialogos.map((dialogo) => (
        <CaixaDialogo key={dialogo.id} dialogo={dialogo} aoFechar={() => fechar(dialogo.id)} />
      ))}
    </div>
  );
}

function CaixaDialogo({ dialogo, aoFechar }: { dialogo: Dialogo; aoFechar: () => void }) {
  const okRef = useRef<HTMLButtonElement>(null);

  // Bipe ao abrir (spec §6.4) + foco no OK (a11y).
  useEffect(() => {
    tocarSom('erro');
    okRef.current?.focus();
  }, []);

  return (
    <div className="dialogo-fundo" role="dialog" aria-modal="true" aria-label={dialogo.titulo}>
      <div className="window dialogo-janela">
        <div className="title-bar">
          <div className="title-bar-text">{dialogo.titulo}</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={aoFechar} />
          </div>
        </div>
        <div className="window-body">
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span aria-hidden="true" style={{ flex: '0 0 auto' }}>
              <Icone nome={ICONE[dialogo.tipo]} tamanho={32} alt="" />
            </span>
            <p style={{ margin: 0 }}>{dialogo.mensagem}</p>
          </div>
          {dialogo.detalhe && (
            <details style={{ marginTop: 8 }}>
              <summary>Detalhes</summary>
              <pre>{dialogo.detalhe}</pre>
            </details>
          )}
          <div className="field-row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button ref={okRef} onClick={aoFechar}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
