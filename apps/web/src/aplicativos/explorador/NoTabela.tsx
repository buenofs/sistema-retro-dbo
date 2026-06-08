import { useState } from 'react';
import type { ObjetoBanco } from '@dbos/shared';
import { ColunasDaTabela } from './ColunasDaTabela';

// Nó expansível: ao abrir, monta <ColunasDaTabela> — é o que dispara a busca lazy.
export function NoTabela({ objeto }: { objeto: ObjetoBanco }) {
  const [aberto, setAberto] = useState(false);
  const icone = objeto.tipo === 'view' ? '🔎' : '▦';
  return (
    <li>
      <details onToggle={(e) => setAberto(e.currentTarget.open)}>
        <summary>
          {icone} {objeto.nome}
        </summary>
        {aberto && <ColunasDaTabela esquema={objeto.esquema} tabela={objeto.nome} />}
      </details>
    </li>
  );
}
