import { useSessao } from './autenticacao/ganchos';
import { TelaLogin } from './autenticacao/TelaLogin';
import { AreaTrabalho } from './AreaTrabalho';

// Decide entre login e área de trabalho conforme a sessão atual.
export function App() {
  const sessao = useSessao();

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
