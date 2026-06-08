import sql from 'mssql';
import type { ConnectionPool } from 'mssql';
import type { GrafoRelacionamentos, NoGrafo, ArestaGrafo, RefRelacionamento } from '@dbos/shared';

function comId(pool: ConnectionPool, id: number) {
  return pool.request().input('id', sql.Int, id);
}

// Monta o grafo de uma entidade: nó central + nós relacionados + arestas a partir do centro.
export async function montarGrafo(
  pool: ConnectionPool,
  ref: RefRelacionamento,
): Promise<GrafoRelacionamentos | null> {
  const centro = `${ref.tipo}:${ref.id}`;
  const nos: NoGrafo[] = [];
  const arestas: ArestaGrafo[] = [];
  const ligar = (no: NoGrafo, rotulo?: string) => {
    nos.push(no);
    arestas.push({ de: centro, para: no.id, rotulo });
  };

  if (ref.tipo === 'funcionario') {
    const f = (await comId(pool, ref.id).query<{ nome: string; departamentoId: number; departamento: string }>(`
      SELECT f.nome, f.departamentoId, d.nome AS departamento
      FROM dbo.Funcionarios f JOIN dbo.Departamentos d ON d.id = f.departamentoId
      WHERE f.id = @id
    `)).recordset[0];
    if (!f) return null;
    nos.push({ id: centro, tipo: 'funcionario', rotulo: f.nome });
    ligar({ id: `departamento:${f.departamentoId}`, tipo: 'departamento', rotulo: f.departamento }, 'departamento');

    const projetos = (await comId(pool, ref.id).query<{ id: number; nome: string }>(`
      SELECT p.id, p.nome FROM dbo.Projetos p
      JOIN dbo.FuncionariosProjetos fp ON fp.projetoId = p.id
      WHERE fp.funcionarioId = @id ORDER BY p.nome
    `)).recordset;
    for (const p of projetos) ligar({ id: `projeto:${p.id}`, tipo: 'projeto', rotulo: p.nome }, 'projeto');

    const folha = (await comId(pool, ref.id).query<{ competencia: string }>(`
      SELECT competencia FROM dbo.FolhaPagamento WHERE funcionarioId = @id ORDER BY competencia DESC
    `)).recordset;
    for (const fp of folha) {
      ligar({ id: `folha:${ref.id}:${fp.competencia}`, tipo: 'folha', rotulo: `Folha ${fp.competencia}` }, 'folha');
    }
  } else if (ref.tipo === 'departamento') {
    const d = (await comId(pool, ref.id).query<{ nome: string }>(
      `SELECT nome FROM dbo.Departamentos WHERE id = @id`,
    )).recordset[0];
    if (!d) return null;
    nos.push({ id: centro, tipo: 'departamento', rotulo: d.nome });
    const funcs = (await comId(pool, ref.id).query<{ id: number; nome: string }>(
      `SELECT id, nome FROM dbo.Funcionarios WHERE departamentoId = @id ORDER BY nome`,
    )).recordset;
    for (const f of funcs) ligar({ id: `funcionario:${f.id}`, tipo: 'funcionario', rotulo: f.nome });
  } else {
    // projeto
    const p = (await comId(pool, ref.id).query<{ nome: string }>(
      `SELECT nome FROM dbo.Projetos WHERE id = @id`,
    )).recordset[0];
    if (!p) return null;
    nos.push({ id: centro, tipo: 'projeto', rotulo: p.nome });
    const membros = (await comId(pool, ref.id).query<{ id: number; nome: string; papel: string | null }>(`
      SELECT f.id, f.nome, fp.papel FROM dbo.Funcionarios f
      JOIN dbo.FuncionariosProjetos fp ON fp.funcionarioId = f.id
      WHERE fp.projetoId = @id ORDER BY f.nome
    `)).recordset;
    for (const m of membros) ligar({ id: `funcionario:${m.id}`, tipo: 'funcionario', rotulo: m.nome }, m.papel ?? undefined);
  }

  return { centro, nos, arestas };
}
