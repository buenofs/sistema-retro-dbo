import { memo, useState } from 'react';
import type { ObjetoBanco } from '@dbos/shared';
import { useMenuContexto } from '../../areaTrabalho/useMenuContexto';
import { useLoja } from '../../areaTrabalho/loja';
import { ColunasDaTabela } from './ColunasDaTabela';
import { Icone } from '../../tema/icones/Icone';

export const NoTabela = memo(function NoTabela({ objeto }: { objeto: ObjetoBanco }) {
  const [aberto, setAberto] = useState(false);
  const abrirMenu = useMenuContexto((loja) => loja.abrir);
  const abrirJanela = useLoja((loja) => loja.abrirJanela);

  return (
    <li>
      <details onToggle={(evento) => setAberto(evento.currentTarget.open)}>
        <summary
          onContextMenu={(evento) => {
            evento.preventDefault();
            const ref = { esquema: objeto.esquema, tabela: objeto.nome };
            abrirMenu(evento.clientX, evento.clientY, [
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
