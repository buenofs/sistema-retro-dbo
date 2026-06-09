import type { UsuarioSessao } from '@dbos/shared';
import { ORDEM_APPS, registroApps } from './registroApps';
import { useLoja } from './loja';
import { type ItemMenu, useMenuContexto } from './useMenuContexto';
import { usarSonsJanelas } from './usarSonsJanelas';
import { CamadaJanelas } from './CamadaJanelas';
import { BarraTarefas } from './BarraTarefas';
import { GerenciadorDialogos } from './GerenciadorDialogos';
import { MenuContexto } from './MenuContexto';
import { Icone } from '../tema/icones/Icone';
import './areaTrabalho.css';

const RELATORIO = { esquema: 'dbo', tabela: 'vw_FolhaResumo' };

export function AreaTrabalho({ usuario }: { usuario: UsuarioSessao }) {
  usarSonsJanelas();
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const abrirMenu = useMenuContexto((s) => s.abrir);

  return (
    <div
      className="area-trabalho"
      onContextMenu={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        const itens: ItemMenu[] = ORDEM_APPS.map((tipo) => ({
          rotulo: `Abrir ${registroApps[tipo].titulo}`,
          aoClicar: () => abrirJanela(tipo),
        }));
        abrirMenu(e.clientX, e.clientY, itens);
      }}
    >
      <div className="icones-area">
        {ORDEM_APPS.map((tipo) => (
          <button
            key={tipo}
            className="icone-atalho"
            onDoubleClick={() => abrirJanela(tipo)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              abrirMenu(e.clientX, e.clientY, [
                { rotulo: 'Abrir', aoClicar: () => abrirJanela(tipo) },
              ]);
            }}
          >
            <span className="icone-atalho-glifo" aria-hidden="true">
              <Icone nome={registroApps[tipo].icone} tamanho={32} alt="" />
            </span>
            <span className="icone-atalho-rotulo">{registroApps[tipo].titulo}</span>
          </button>
        ))}
        <button
          className="icone-atalho"
          onDoubleClick={() => abrirJanela('grade', RELATORIO)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            abrirMenu(e.clientX, e.clientY, [
              { rotulo: 'Abrir', aoClicar: () => abrirJanela('grade', RELATORIO) },
            ]);
          }}
        >
          <span className="icone-atalho-glifo" aria-hidden="true">
            <Icone nome="report" tamanho={32} alt="" />
          </span>
          <span className="icone-atalho-rotulo">Relatório (Folha)</span>
        </button>
      </div>
      <CamadaJanelas />
      <div className="rotulo-banco" aria-hidden="true">
        {usuario.banco}
      </div>
      <BarraTarefas login={usuario.login} />
      <GerenciadorDialogos />
      <MenuContexto />
    </div>
  );
}
