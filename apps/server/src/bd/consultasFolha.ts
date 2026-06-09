import type { ConnectionPool } from 'mssql';
import type { AnomaliaFolha, FolhaResumoDepartamento, RelatorioFolha } from '@dbos/shared';

export async function obterRelatorioFolha(pool: ConnectionPool): Promise<RelatorioFolha> {
  const dep = await pool.request().query<{
    departamento: string;
    funcionarios: number;
    totalLiquido: number | string;
  }>(`
    SELECT departamento,
           COUNT(*) AS funcionarios,
           SUM(ISNULL(ultimoLiquido, 0)) AS totalLiquido
    FROM dbo.vw_FolhaResumo
    GROUP BY departamento
    ORDER BY totalLiquido DESC
  `);

  const departamentos: FolhaResumoDepartamento[] = dep.recordset.map((r) => ({
    departamento: r.departamento,
    funcionarios: Number(r.funcionarios),
    totalLiquido: Number(r.totalLiquido),
  }));
  const totalGeral = departamentos.reduce((s, d) => s + d.totalLiquido, 0);

  const anom = await pool.request().query<AnomaliaFolha>(`
    SELECT id, funcionario, competencia, salarioBase, bonus, descontos,
           salarioLiquido, liquidoEsperado
    FROM dbo.vw_AnomaliasFolha
    ORDER BY funcionario, competencia DESC
  `);
  const anomalias: AnomaliaFolha[] = anom.recordset.map((a) => ({
    id: Number(a.id),
    funcionario: a.funcionario,
    competencia: a.competencia,
    salarioBase: Number(a.salarioBase),
    bonus: Number(a.bonus),
    descontos: Number(a.descontos),
    salarioLiquido: Number(a.salarioLiquido),
    liquidoEsperado: Number(a.liquidoEsperado),
  }));

  return { departamentos, totalGeral, anomalias };
}
