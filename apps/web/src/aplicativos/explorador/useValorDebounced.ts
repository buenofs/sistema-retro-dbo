import { useEffect, useState } from 'react';

/** Devolve `valor` somente após `atrasoMs` ms sem mudanças (debounce). */
export function useValorDebounced<T>(valor: T, atrasoMs: number): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), atrasoMs);
    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);
  return debounced;
}
