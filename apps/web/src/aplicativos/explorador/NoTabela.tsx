import { useState } from 'react';
import type { ObjetoBanco } from '@dbos/shared';
import { useMenuContexto } from '../../areaTrabalho/useMenuContexto';
import { useLoja } from '../../areaTrabalho/loja';
import { ColunasDaTabela } from './ColunasDaTabela';

// Nó expansível: ao abrir, monta <ColunasDaTabela> — é o que dispara a busca lazy.
export function NoTabela({ objeto }: { objeto: ObjetoBanco }) {
  const [aberto, setAberto] = useState(false);
  const abrirMenu = useMenuContexto((s) => s.abrir);
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const icone = objeto.tipo === 'view' ? '🔎' : '▦';

  return (
    <li>
      <details onToggle={(e) => setAberto(e.currentTarget.open)}>
        <summary
          onContextMenu={(e) => {
            e.preventDefault();
            const ref = { esquema: objeto.esquema, tabela: objeto.nome };
            abrirMenu(e.clientX, e.clientY, [
              { rotulo: 'Propriedades', aoClicar: () => abrirJanela('propriedades', ref) },
              { rotulo: 'Abrir na grade', aoClicar: () => abrirJanela('grade', ref) },
            ]);
          }}
        >
          {icone} {objeto.nome}
        </summary>
        {aberto && <ColunasDaTabela esquema={objeto.esquema} tabela={objeto.nome} />}
      </details>
    </li>
  );
}
