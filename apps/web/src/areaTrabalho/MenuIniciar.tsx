import { ORDEM_APPS, registroApps } from './registroApps';
import { useLoja } from './loja';
import { useLogout } from '../autenticacao/ganchos';

export function MenuIniciar({ login, aoFechar }: { login: string; aoFechar: () => void }) {
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const sair = useLogout();

  return (
    <div className="menu-iniciar" role="menu">
      <div className="menu-iniciar-faixa">DBOS</div>
      <ul className="menu-iniciar-itens">
        {ORDEM_APPS.map((tipo) => (
          <li key={tipo}>
            <button
              role="menuitem"
              onClick={() => {
                abrirJanela(tipo);
                aoFechar();
              }}
            >
              <span aria-hidden="true">{registroApps[tipo].icone}</span> {registroApps[tipo].titulo}
            </button>
          </li>
        ))}
        <li className="menu-iniciar-separador" aria-hidden="true" />
        <li>
          <button role="menuitem" disabled={sair.isPending} onClick={() => sair.mutate()}>
            🔌 Encerrar sessão ({login})
          </button>
        </li>
      </ul>
    </div>
  );
}
