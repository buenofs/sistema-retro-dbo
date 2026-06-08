import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMenuContexto } from './useMenuContexto';

// Portal único do menu de contexto (spec §4.3). Fecha ao clicar fora ou Esc.
export function MenuContexto() {
  const { aberto, x, y, itens } = useMenuContexto(
    useShallow((s) => ({ aberto: s.aberto, x: s.x, y: s.y, itens: s.itens })),
  );
  const fechar = useMenuContexto((s) => s.fechar);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = () => fechar();
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    window.addEventListener('click', aoClicarFora);
    window.addEventListener('keydown', aoTecla);
    return () => {
      window.removeEventListener('click', aoClicarFora);
      window.removeEventListener('keydown', aoTecla);
    };
  }, [aberto, fechar]);

  if (!aberto) return null;

  return (
    <div className="menu-contexto" role="menu" style={{ left: x, top: y }}>
      {itens.map((item, i) => (
        <button
          key={i}
          role="menuitem"
          onClick={() => {
            item.aoClicar();
            fechar();
          }}
        >
          {item.rotulo}
        </button>
      ))}
    </div>
  );
}
