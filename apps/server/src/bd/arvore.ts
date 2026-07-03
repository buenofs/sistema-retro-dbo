export interface NoArvore {
  id: number;
  paiId: number | null;
}

/** Retorna a subárvore de `raizId` (inclusive) em ordem de largura; pais sempre antes dos filhos. */
export function subarvore<T extends NoArvore>(itens: T[], raizId: number): T[] {
  const filhosPorPai = new Map<number, T[]>();
  for (const it of itens) {
    if (it.paiId === null) continue;
    const lista = filhosPorPai.get(it.paiId) ?? [];
    lista.push(it);
    filhosPorPai.set(it.paiId, lista);
  }
  const raiz = itens.find((i) => i.id === raizId);
  if (!raiz) return [];
  const resultado: T[] = [raiz];
  const fila: T[] = [raiz];
  while (fila.length > 0) {
    const atual = fila.shift()!;
    for (const filho of filhosPorPai.get(atual.id) ?? []) {
      resultado.push(filho);
      fila.push(filho);
    }
  }
  return resultado;
}

/** Retorna true se mover/copiar `id` para `destino` criaria um ciclo (destino é o próprio item ou descendente). */
export function criaCiclo(itens: NoArvore[], id: number, destino: number | null): boolean {
  if (destino === null) return false;
  if (destino === id) return true;
  return subarvore(itens, id).some((no) => no.id === destino);
}
