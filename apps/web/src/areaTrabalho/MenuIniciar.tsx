import { ORDEM_APPS, registroApps } from './registroApps';
import { useLoja } from './loja';
import { useLogout } from '../autenticacao/ganchos';
import { Icone } from '../tema/icones/Icone';
import { usePainelTweaks } from '../tema/painel';

export function MenuIniciar({ login, aoFechar }: { login: string; aoFechar: () => void }) {
  const abrirJanela = useLoja((loja) => loja.abrirJanela);
  const abrirPainel = usePainelTweaks((loja) => loja.abrir);
  const sair = useLogout();

  return (
    <div className="menu-iniciar" role="menu">
      <div className="menu-iniciar-faixa">DBOS</div>
      <div className="menu-iniciar-cabecalho">
        <Icone nome="user" tamanho={24} alt="" style={{ marginRight: 6 }} />
        {login}
      </div>
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
              <Icone nome={registroApps[tipo].icone} tamanho={16} alt="" style={{ marginRight: 6 }} /> {registroApps[tipo].titulo}
            </button>
          </li>
        ))}
        <li className="menu-iniciar-separador" aria-hidden="true" />
        <li>
          <button
            role="menuitem"
            onClick={() => {
              abrirPainel();
              aoFechar();
            }}
          >
            <Icone nome="props" tamanho={16} alt="" style={{ marginRight: 6 }} /> Configurações
          </button>
        </li>
        <li className="menu-iniciar-separador" aria-hidden="true" />
        <li>
          <button role="menuitem" disabled={sair.isPending} onClick={() => sair.mutate()}>
            <Icone nome="logoff" tamanho={16} alt="" style={{ marginRight: 6 }} /> Encerrar sessão ({login})
          </button>
        </li>
      </ul>
    </div>
  );
}
