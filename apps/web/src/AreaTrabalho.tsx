import type { UsuarioSessao } from '@dbos/shared';
import { useLogout } from './autenticacao/ganchos';

// Placeholder da área de trabalho. O gerenciador de janelas chega na Fase 2.
export function AreaTrabalho({ usuario }: { usuario: UsuarioSessao }) {
  const sair = useLogout();
  return (
    <div className="window" style={{ width: 360, margin: '15vh auto' }}>
      <div className="title-bar">
        <div className="title-bar-text">DBOS — Área de trabalho</div>
      </div>
      <div className="window-body">
        <p>Bem-vindo, {usuario.login}.</p>
        <p>O sistema de janelas chega na próxima fase.</p>
        <div className="field-row" style={{ justifyContent: 'flex-end' }}>
          <button onClick={() => sair.mutate()} disabled={sair.isPending}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
