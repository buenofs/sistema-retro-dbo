import { useState } from 'react';
import { useSessao } from './autenticacao/ganchos';
import { TelaBoot } from './TelaBoot';
import { TelaLogin } from './autenticacao/TelaLogin';
import { AreaTrabalho } from './areaTrabalho/AreaTrabalho';

// boot (só na carga inicial) → login → desktop.
export function App() {
  const [bootConcluido, setBootConcluido] = useState(false);
  const sessao = useSessao();

  if (!bootConcluido) return <TelaBoot onConcluir={() => setBootConcluido(true)} />;

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
