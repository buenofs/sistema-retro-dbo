import { useShallow } from 'zustand/react/shallow';
import { useLoja } from './loja';
import { Janela } from './Janela';

// Renderiza todas as janelas não fechadas. As minimizadas continuam montadas
// (display:none no <Janela>) para preservar o estado dos apps em fases futuras.
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
