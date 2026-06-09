import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLoja } from './loja';
import { MenuIniciar } from './MenuIniciar';
import { Relogio } from './Relogio';
import { Icone } from '../tema/icones/Icone';

export function BarraTarefas({ login }: { login: string }) {
  const [menuAberto, setMenuAberto] = useState(false);
  // useShallow compara só um nível: comparar um array de objetos recém-criados
  // nunca casa (refs distintas) e cai em loop. Assinamos o array de janelas e
  // derivamos os dados de exibição no render.
  const janelas = useLoja(useShallow((s) => s.janelas)).map((j) => ({
    id: j.id,
    titulo: j.titulo,
    icone: j.icone,
    minimizada: j.estado === 'minimizada',
  }));
  const idFocada = useLoja((s) => s.idFocada);
  const focar = useLoja((s) => s.focar);
  const minimizar = useLoja((s) => s.minimizar);
  const restaurar = useLoja((s) => s.restaurar);

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
        className="botao-iniciar"
        aria-haspopup="menu"
        aria-expanded={menuAberto}
        onClick={() => setMenuAberto((v) => !v)}
      >
        Iniciar
      </button>
      {menuAberto && <MenuIniciar login={login} aoFechar={() => setMenuAberto(false)} />}
      <div className="barra-tarefas-janelas">
        {janelas.map((j) => (
          <button
            key={j.id}
            className={`botao-janela ${idFocada === j.id && !j.minimizada ? 'ativo' : ''}`}
            onClick={() => aoClicarJanela(j.id, j.minimizada)}
          >
            <Icone nome={j.icone} tamanho={16} alt="" style={{ marginRight: 4 }} /> {j.titulo}
          </button>
        ))}
      </div>
      <Relogio />
    </div>
  );
}
