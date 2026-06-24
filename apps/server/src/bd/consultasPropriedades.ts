import type { IndiceBanco, PropriedadesObjeto, RefObjeto, TipoObjeto } from '@dbos/shared';
import type { Banco } from './banco';

export async function obterPropriedades(banco: Banco, ref: RefObjeto): Promise<PropriedadesObjeto | null> {
  const parametros = { esquema: ref.esquema, tabela: ref.tabela };

  // Um Request roda uma query só; cada consulta recebe um request novo já com os
  // parâmetros @esquema/@tabela (cru, mas parametrizado — spec §2.2).
  const infos = await banco.consultar<{ tipo: string; criadoEm: Date; modificadoEm: Date }>(`
      SELECT o.type_desc AS tipo, o.create_date AS criadoEm, o.modify_date AS modificadoEm
      FROM sys.objects o
      JOIN sys.schemas s ON s.schema_id = o.schema_id
      WHERE s.name = @esquema AND o.name = @tabela AND o.type IN ('U', 'V')
    `, parametros);
  const info = infos[0];
  if (!info) return null;
  const tipo: TipoObjeto = info.tipo === 'VIEW' ? 'view' : 'tabela';

  const totaisColuna = await banco.consultar<{ total: number }>(`
        SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @esquema AND TABLE_NAME = @tabela
      `, parametros);
  const totalColunas = totaisColuna[0]?.total ?? 0;

  let totalLinhas = 0;
  if (tipo === 'tabela') {
    const totaisLinha = await banco.consultar<{ linhas: number }>(`
          SELECT CAST(ISNULL(SUM(p.rows), 0) AS BIGINT) AS linhas
          FROM sys.partitions p
          JOIN sys.objects o ON o.object_id = p.object_id
          JOIN sys.schemas s ON s.schema_id = o.schema_id
          WHERE s.name = @esquema AND o.name = @tabela AND p.index_id IN (0, 1)
        `, parametros);
    totalLinhas = Number(totaisLinha[0]?.linhas ?? 0);
  }

  const indicesBrutos = await banco.consultar<{
    nome: string | null;
    tipo: string;
    unico: boolean;
    chavePrimaria: boolean;
  }>(`
      SELECT i.name AS nome, i.type_desc AS tipo, i.is_unique AS unico, i.is_primary_key AS chavePrimaria
      FROM sys.indexes i
      JOIN sys.objects o ON o.object_id = i.object_id
      JOIN sys.schemas s ON s.schema_id = o.schema_id
      WHERE s.name = @esquema AND o.name = @tabela AND i.type > 0
      ORDER BY i.is_primary_key DESC, i.name
    `, parametros);

  const colunasBrutas = await banco.consultar<{ indice: string; coluna: string }>(`
      SELECT i.name AS indice, c.name AS coluna
      FROM sys.index_columns ic
      JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      JOIN sys.objects o ON o.object_id = i.object_id
      JOIN sys.schemas s ON s.schema_id = o.schema_id
      WHERE s.name = @esquema AND o.name = @tabela AND ic.is_included_column = 0 AND i.type > 0
      ORDER BY i.name, ic.key_ordinal
    `, parametros);

  const colunasPorIndice = new Map<string, string[]>();
  for (const linha of colunasBrutas) {
    const lista = colunasPorIndice.get(linha.indice) ?? [];
    lista.push(linha.coluna);
    colunasPorIndice.set(linha.indice, lista);
  }

  const indices: IndiceBanco[] = indicesBrutos.map((indice) => ({
    nome: indice.nome ?? '(sem nome)',
    tipo: indice.tipo,
    unico: indice.unico,
    chavePrimaria: indice.chavePrimaria,
    colunas: indice.nome ? colunasPorIndice.get(indice.nome) ?? [] : [],
  }));

  return {
    esquema: ref.esquema,
    nome: ref.tabela,
    tipo,
    totalColunas,
    totalLinhas,
    criadoEm: info.criadoEm ? new Date(info.criadoEm).toISOString() : null,
    modificadoEm: info.modificadoEm ? new Date(info.modificadoEm).toISOString() : null,
    indices,
  };
}
