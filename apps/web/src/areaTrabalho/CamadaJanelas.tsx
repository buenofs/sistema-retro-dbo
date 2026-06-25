import { useShallow } from 'zustand/react/shallow';
import { useLoja } from './loja';
import { Janela } from './Janela';

export function CamadaJanelas() {
  const ids = useLoja(useShallow((loja) => loja.janelas.map((janela) => janela.id)));
  return (
    <div className="camada-janelas">
      {ids.map((id) => (
        <Janela key={id} id={id} />
      ))}
    </div>
  );
}
