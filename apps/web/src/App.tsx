import { useSessao } from './autenticacao/ganchos';
import { useBoot } from './boot';
import { TelaBoot } from './TelaBoot';
import { TelaLogin } from './autenticacao/TelaLogin';
import { AreaTrabalho } from './areaTrabalho/AreaTrabalho';

// boot (recarregável via "Reiniciar sessão") → login → desktop.
export function App() {
  const bootConcluido = useBoot((loja) => loja.concluido);
  const concluirBoot = useBoot((loja) => loja.concluir);
  const sessao = useSessao();

  if (!bootConcluido) return <TelaBoot onConcluir={concluirBoot} />;

  if (sessao.isLoading) {
    return (
      <div className="window" style={{ width: 320, margin: '15vh auto' }}>
        <div className="title-bar">
          <div className="title-bar-text">DBOS</div>
        </div>
        <div className="window-body">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return sessao.data ? <AreaTrabalho usuario={sessao.data} /> : <TelaLogin />;
}
