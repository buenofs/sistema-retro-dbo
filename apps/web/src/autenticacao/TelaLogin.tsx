import { useState, type FormEvent } from 'react';
import { useLogin } from './ganchos';

// Tela de boot/login no estilo Win98. O login mapeia direto para um login do SQL Server.
export function TelaLogin() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const entrar = useLogin();

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    entrar.mutate({ login, senha });
  }

  return (
    <div className="window" style={{ width: 320, margin: '15vh auto' }}>
      <div className="title-bar">
        <div className="title-bar-text">DBOS — Entrar</div>
      </div>
      <div className="window-body">
        <p>Database Operating System</p>
        <form onSubmit={aoEnviar}>
          <div className="field-row-stacked">
            <label htmlFor="login">Login</label>
            <input
              id="login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>
          <div className="field-row-stacked">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <div
            className="field-row"
            style={{ justifyContent: 'flex-end', marginTop: 8 }}
          >
            <button type="submit" disabled={entrar.isPending}>
              {entrar.isPending ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
          {entrar.isError && (
            <p role="alert" style={{ color: 'red', marginTop: 8 }}>
              {entrar.error.message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
