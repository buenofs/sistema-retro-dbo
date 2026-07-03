import { useEffect, useRef } from 'react';
import { useLoja } from './loja';
import { tocarSom } from './sons';

export function useSonsJanelas(): void {
  const total = useLoja((s) => s.janelas.length);
  const anterior = useRef(total);
  useEffect(() => {
    if (total > anterior.current) tocarSom('abrir');
    else if (total < anterior.current) tocarSom('fechar');
    anterior.current = total;
  }, [total]);
}
