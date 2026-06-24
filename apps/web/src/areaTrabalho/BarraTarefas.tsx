import { useState, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLoja } from './loja';
import { MenuIniciar } from './MenuIniciar';
import { Relogio } from './Relogio';
import { Icone } from '../tema/icones/Icone';
import { usePainelTweaks } from '../tema/painel';

export function BarraTarefas({ login }: { login: string }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const refMenu = useRef<HTMLDivElement>(null);
  const refBotao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuAberto) return;
    function aoClicarFora(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (refMenu.current?.contains(alvo)) return;
      if (refBotao.current?.contains(alvo)) return;
      setMenuAberto(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [menuAberto]);
  // useShallow compara só um nível: comparar um array de objetos recém-criados
  // nunca casa (refs distintas) e cai em loop. Assinamos o array de janelas e
  // derivamos os dados de exibição no render.
  const janelas = useLoja(useShallow((loja) => loja.janelas)).map((janela) => ({
    id: janela.id,
    titulo: janela.titulo,
    icone: janela.icone,
    minimizada: janela.estado === 'minimizada',
  }));
  const idFocada = useLoja((loja) => loja.idFocada);
  const focar = useLoja((loja) => loja.focar);
  const minimizar = useLoja((loja) => loja.minimizar);
  const restaurar = useLoja((loja) => loja.restaurar);
  const alternarPainel = usePainelTweaks((loja) => loja.alternar);

  function aoClicarJanela(id: string, minimizada: boolean) {
    if (minimizada) {
      restaurar(id);
      focar(id);
    } else if (idFocada === id) {
      minimizar(id);
    } else {
      focar(id);
    }
  }

  return (
    <div className="barra-tarefas">
      <button
        ref={refBotao}
        className="botao-iniciar"
        aria-haspopup="menu"
        aria-expanded={menuAberto}
        onClick={() => setMenuAberto((anterior) => !anterior)}
      >
        Iniciar
      </button>
      {menuAberto && (
        <div ref={refMenu}>
          <MenuIniciar login={login} aoFechar={() => setMenuAberto(false)} />
        </div>
      )}
      <div className="barra-tarefas-janelas">
        {janelas.map((janela) => (
          <button
            key={janela.id}
            className={`botao-janela ${idFocada === janela.id && !janela.minimizada ? 'ativo' : ''}`}
            onClick={() => aoClicarJanela(janela.id, janela.minimizada)}
          >
            <Icone nome={janela.icone} tamanho={16} alt="" style={{ marginRight: 4 }} /> {janela.titulo}
          </button>
        ))}
      </div>
      <span className="bandeja-icones">
        <button
          type="button"
          className="bandeja-engrenagem"
          aria-label="Configurações"
          onClick={alternarPainel}
        >
          <Icone nome="props" tamanho={16} alt="" />
        </button>
        <Icone nome="database" tamanho={16} alt="" />
        <Icone nome="wifi" tamanho={16} alt="" />
        <Icone nome="speaker" tamanho={16} alt="" />
      </span>
      <Relogio />
    </div>
  );
}
