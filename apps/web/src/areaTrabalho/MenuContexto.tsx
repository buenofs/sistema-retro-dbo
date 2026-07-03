import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMenuContexto } from './useMenuContexto';

export function MenuContexto() {
  const { aberto, x, y, itens } = useMenuContexto(
    useShallow((loja) => ({ aberto: loja.aberto, x: loja.x, y: loja.y, itens: loja.itens })),
  );
  const fechar = useMenuContexto((loja) => loja.fechar);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = () => fechar();
    const aoTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') fechar();
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
