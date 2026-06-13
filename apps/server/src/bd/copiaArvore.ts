// Nós de uma subárvore a copiar. A ordenação garante que o pai já foi inserido
// (e teve seu novo id mapeado) antes de cada filho.
export interface NoCopia {
  id: number;
  paiId: number | null;
  profundidade: number;
}

export function ordemDeInsercao<T extends NoCopia>(nos: T[]): T[] {
  return [...nos].sort((a, b) => a.profundidade - b.profundidade);
}
