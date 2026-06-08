import sql from 'mssql';
import type { ConnectionPool } from 'mssql';
import type { FiltrosBusca, Funcionario } from '@dbos/shared';

// Busca funcionários com filtros opcionais. Tudo parametrizado (@p) — cru e seguro.
export async function buscarFuncionarios(
  pool: ConnectionPool,
  filtros: FiltrosBusca,
): Promise<Funcionario[]> {
  const req = pool.request();
  const condicoes: string[] = [];

  if (filtros.nome) {
    req.input('nome', sql.NVarChar, `%${filtros.nome}%`);
    condicoes.push('f.nome LIKE @nome');
  }
  if (filtros.departamentoId !== undefined) {
    req.input('dep', sql.Int, filtros.departamentoId);
    condicoes.push('f.departamentoId = @dep');
  }
  if (filtros.salarioOp && filtros.salario !== undefined) {
    req.input('sal', sql.Decimal(10, 2), filtros.salario);
    if (filtros.salarioOp === 'gt') condicoes.push('f.salario > @sal');
    else if (filtros.salarioOp === 'lt') condicoes.push('f.salario < @sal');
    else if (filtros.salarioOp === 'eq') condicoes.push('f.salario = @sal');
    else if (filtros.salarioOp === 'entre' && filtros.salario2 !== undefined) {
      req.input('sal2', sql.Decimal(10, 2), filtros.salario2);
      condicoes.push('f.salario BETWEEN @sal AND @sal2');
    }
  }
  if (filtros.projetoId !== undefined) {
    req.input('proj', sql.Int, filtros.projetoId);
    condicoes.push(
      'EXISTS (SELECT 1 FROM dbo.FuncionariosProjetos fp WHERE fp.funcionarioId = f.id AND fp.projetoId = @proj)',
    );
  }
  if (filtros.relacionadoA !== undefined) {
    req.input('rel', sql.Int, filtros.relacionadoA);
    condicoes.push(`f.id <> @rel AND (
      f.departamentoId = (SELECT departamentoId FROM dbo.Funcionarios WHERE id = @rel)
      OR EXISTS (
        SELECT 1 FROM dbo.FuncionariosProjetos a
        JOIN dbo.FuncionariosProjetos b ON b.projetoId = a.projetoId
        WHERE a.funcionarioId = @rel AND b.funcionarioId = f.id
      )
    )`);
  }

  const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const resultado = await req.query<Funcionario>(`
    SELECT f.id, f.nome, f.cargo, f.salario, f.dataAdmissao, f.departamentoId,
           d.nome AS departamento
    FROM dbo.Funcionarios f
    JOIN dbo.Departamentos d ON d.id = f.departamentoId
    ${onde}
    ORDER BY f.nome
  `);
  return resultado.recordset;
}
