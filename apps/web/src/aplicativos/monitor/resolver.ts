export function resolverSQL(texto: string, parametros: Record<string, unknown>): string {
  return texto.replace(/@(\w+)/g, (achado, nome: string) => {
    if (!(nome in parametros)) return achado;
    const v = parametros[nome];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return `'${String(v).replace(/'/g, "''")}'`;
  });
}
