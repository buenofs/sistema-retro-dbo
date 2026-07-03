/** Substitui @parametros pelos literais para exibição no Monitor; não é usado para execução SQL. */
export function resolverSQL(texto: string, parametros: Record<string, unknown>): string {
  return texto.replace(/@(\w+)/g, (achado, nome: string) => {
    if (!(nome in parametros)) return achado;
    const valor = parametros[nome];
    if (valor === null || valor === undefined) return 'NULL';
    if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
    return `'${String(valor).replace(/'/g, "''")}'`;
  });
}
