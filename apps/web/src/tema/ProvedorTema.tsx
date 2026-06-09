import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CHAVE_TEMA, TEMA_PADRAO, type Pele } from './tipos';

export interface ContextoTemaValor {
  pele: Pele;
  definirPele: (pele: Pele) => void;
}

export const ContextoTema = createContext<ContextoTemaValor | null>(null);

function lerPeleInicial(): Pele {
  try {
    const cru = localStorage.getItem(CHAVE_TEMA);
    if (cru) {
      const obj = JSON.parse(cru) as { pele?: unknown };
      if (obj.pele === 'aero' || obj.pele === '98') return obj.pele;
    }
  } catch {
    /* localStorage indisponível ou JSON inválido → padrão */
  }
  return TEMA_PADRAO.pele;
}

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [pele, setPele] = useState<Pele>(lerPeleInicial);

  useEffect(() => {
    document.body.dataset.skin = pele;
    try {
      localStorage.setItem(CHAVE_TEMA, JSON.stringify({ pele }));
    } catch {
      /* ignora — persistência é best-effort */
    }
  }, [pele]);

  const definirPele = useCallback((p: Pele) => setPele(p), []);
  const valor = useMemo<ContextoTemaValor>(() => ({ pele, definirPele }), [pele, definirPele]);

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}
