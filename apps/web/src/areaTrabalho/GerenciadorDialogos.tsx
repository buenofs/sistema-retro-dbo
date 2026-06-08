import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { type Dialogo, useDialogos } from './useDialogos';
import { tocarBipe } from './tocarBipe';

const ICONE: Record<Dialogo['tipo'], string> = {
  erro: '❌',
  aviso: '⚠️',
  info: 'ℹ️',
};

// Portal único de diálogos modais 98.css (spec §6.4). Montado uma vez no desktop.
export function GerenciadorDialogos() {
  const dialogos = useDialogos(useShallow((s) => s.dialogos));
  const fechar = useDialogos((s) => s.fechar);
  if (dialogos.length === 0) return null;
  return (
    <div className="camada-dialogos">
      {dialogos.map((d) => (
        <CaixaDialogo key={d.id} dialogo={d} aoFechar={() => fechar(d.id)} />
      ))}
    </div>
  );
}

function CaixaDialogo({ dialogo, aoFechar }: { dialogo: Dialogo; aoFechar: () => void }) {
  // Bipe ao abrir (spec §6.4).
  useEffect(() => {
    tocarBipe();
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
            <span style={{ fontSize: 24, lineHeight: 1 }} aria-hidden="true">
              {ICONE[dialogo.tipo]}
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
            <button onClick={aoFechar}>OK</button>
          </div>
        </div>
      </div>
    </div>
  );
}
