import type { ReactNode } from 'react';

// Estado de um painel: carregando, erro, vazio, ou uma mensagem neutra.
// Substitui os <p/div com padding inline espalhados pelos apps.
// Os estilos (.estado*) vivem na folha global tema/base.css.
export function Estado({ variante, children }: { variante?: 'erro' | 'vazio'; children: ReactNode }) {
  return <p className={variante ? `estado estado-${variante}` : 'estado'}>{children}</p>;
}
