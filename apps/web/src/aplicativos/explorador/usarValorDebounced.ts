import { useEffect, useState } from 'react';

// Devolve `valor` só depois que ele para de mudar por `atrasoMs` (spec §2.3).
export function usarValorDebounced<T>(valor: T, atrasoMs: number): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(valor), atrasoMs);
    return () => clearTimeout(t);
  }, [valor, atrasoMs]);
  return debounced;
}
