import { useState, type FormEvent } from 'react';
import { useLogin } from './ganchos';
import { Icone } from '../tema/icones/Icone';
import './telaLogin.css';

export function TelaLogin() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const entrar = useLogin();

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    entrar.mutate({ login, senha });
  }

  function cancelar() {
    setLogin('');
    setSenha('');
  }

  return (
    <div className="tela-logon">
      <div className="window logon-janela">
        <div className="title-bar">
          <div className="title-bar-text">Log On to DBOS</div>
        </div>
        <div className="window-body">
          <div className="logon-cabecalho">
            <span className="logon-icone" aria-hidden="true">
              <Icone nome="key" tamanho={24} alt="" />
            </span>
            <p style={{ margin: 0 }}>
              Digite seu login e senha do SQL Server para entrar no Database
              Operating System.
            </p>
          </div>
          <form onSubmit={aoEnviar}>
            <div className="field-row" style={{ marginTop: 12 }}>
              <label htmlFor="login" style={{ width: 64 }}>
                Login
              </label>
              <input id="login" value={login} onChange={(evento) => setLogin(evento.target.value)} />
            </div>
            <div className="field-row" style={{ marginTop: 8 }}>
              <label htmlFor="senha" style={{ width: 64 }}>
                Senha
              </label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
              />
            </div>
            <div className="field-row" style={{ justifyContent: 'flex-end', marginTop: 14, gap: 6 }}>
              <button type="submit" disabled={entrar.isPending}>
                {entrar.isPending ? 'Entrando...' : 'OK'}
              </button>
              <button type="button" onClick={cancelar}>
                Cancelar
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
    </div>
  );
}
