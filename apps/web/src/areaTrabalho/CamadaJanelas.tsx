import { useShallow } from 'zustand/react/shallow';
import { useLoja } from './loja';
import { Janela } from './Janela';

export function CamadaJanelas() {
  const ids = useLoja(useShallow((s) => s.janelas.map((j) => j.id)));
  return (
    <div className="camada-janelas">
      {ids.map((id) => (
        <Janela key={id} id={id} />
      ))}
    </div>
  );
}
