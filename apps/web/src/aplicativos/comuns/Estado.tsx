import type { ReactNode } from 'react';

/** Parágrafo de estado de painel (carregando/erro/vazio); estilos em tema/base.css. */
export function Estado({ variante, children }: { variante?: 'erro' | 'vazio'; children: ReactNode }) {
  return <p className={variante ? `estado estado-${variante}` : 'estado'}>{children}</p>;
}
