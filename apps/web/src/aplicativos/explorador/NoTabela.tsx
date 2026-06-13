import { memo, useState } from 'react';
import type { ObjetoBanco } from '@dbos/shared';
import { useMenuContexto } from '../../areaTrabalho/useMenuContexto';
import { useLoja } from '../../areaTrabalho/loja';
import { ColunasDaTabela } from './ColunasDaTabela';
import { Icone } from '../../tema/icones/Icone';

// Nó expansível: ao abrir, monta <ColunasDaTabela> — é o que dispara a busca lazy.
// Memoizado: re-renderiza só quando o próprio `objeto` muda (spec §2.3).
export const NoTabela = memo(function NoTabela({ objeto }: { objeto: ObjetoBanco }) {
  const [aberto, setAberto] = useState(false);
  const abrirMenu = useMenuContexto((s) => s.abrir);
  const abrirJanela = useLoja((s) => s.abrirJanela);

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
          <Icone
            nome={objeto.tipo === 'view' ? 'view' : 'database'}
            tamanho={16}
            alt=""
            style={{ marginRight: 4 }}
          />
          {objeto.nome}
        </summary>
        {aberto && <ColunasDaTabela esquema={objeto.esquema} tabela={objeto.nome} />}
      </details>
    </li>
  );
});
