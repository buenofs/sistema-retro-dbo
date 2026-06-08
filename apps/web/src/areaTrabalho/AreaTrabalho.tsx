import type { UsuarioSessao } from '@dbos/shared';
import { ORDEM_APPS, registroApps } from './registroApps';
import { useLoja } from './loja';
import { CamadaJanelas } from './CamadaJanelas';
import { BarraTarefas } from './BarraTarefas';
import './areaTrabalho.css';

// O desktop: wallpaper, atalhos de duplo-clique, janelas e barra de tarefas.
export function AreaTrabalho({ usuario }: { usuario: UsuarioSessao }) {
  const abrirJanela = useLoja((s) => s.abrirJanela);

  return (
    <div className="area-trabalho">
      <div className="icones-area">
        {ORDEM_APPS.map((tipo) => (
          <button
            key={tipo}
            className="icone-atalho"
            onDoubleClick={() => abrirJanela(tipo)}
          >
            <span className="icone-atalho-glifo" aria-hidden="true">
              {registroApps[tipo].icone}
            </span>
            <span className="icone-atalho-rotulo">{registroApps[tipo].titulo}</span>
          </button>
        ))}
      </div>
      <CamadaJanelas />
      <BarraTarefas login={usuario.login} />
    </div>
  );
}
