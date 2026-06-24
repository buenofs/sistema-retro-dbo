import type { ConnectionPool } from 'mssql';
import type { Drive, Item, UsoDrive } from '@dbos/shared';
import { RegistradorSQL } from './registradorSQL';
import { subarvore, criaCiclo } from './arvore';

export async function listarDrives(pool: ConnectionPool, reg: RegistradorSQL): Promise<Drive[]> {
  const r = await reg.executar<Drive>(pool, 'SELECT id, letra, rotulo, capacidadeBytes FROM dbo.Drives ORDER BY letra');
  return r as unknown as Drive[];
}

export async function usoPorDrive(pool: ConnectionPool, reg: RegistradorSQL): Promise<UsoDrive[]> {
  const r = await reg.executar<UsoDrive>(pool, 'SELECT driveId, letra, rotulo, capacidadeBytes, usadoBytes, livreBytes FROM dbo.vw_UsoPorDrive ORDER BY letra');
  return r as unknown as UsoDrive[];
}

export async function listarConteudo(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  driveId: number,
  paiId: number | null,
): Promise<Item[]> {
  const filtroPai = paiId === null ? 'paiId IS NULL' : 'paiId = @pai';
  const params: Record<string, unknown> = { drive: driveId };
  if (paiId !== null) params.pai = paiId;
  // 'pasta' vem depois de 'arquivo' no alfabeto, então tipo DESC deixa as pastas primeiro.
  const r = await reg.executar<Item>(
    pool,
    `SELECT id, nome, tipo, paiId, driveId, donoId, tamanhoBytes, criadoEm, modificadoEm FROM dbo.Itens WHERE driveId = @drive AND ${filtroPai} AND naLixeira = 0 ORDER BY tipo DESC, nome`,
    params,
  );
  return r as unknown as Item[];
}

export async function listarLixeira(pool: ConnectionPool, reg: RegistradorSQL): Promise<Item[]> {
  const r = await reg.executar<Item>(
    pool,
    'SELECT id, nome, tipo, paiId, driveId, donoId, tamanhoBytes, \'\' AS criadoEm, modificadoEm FROM dbo.vw_Lixeira ORDER BY nome',
  );
  return r as unknown as Item[];
}

export async function lerItem(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  id: number,
): Promise<{ id: number; nome: string; conteudo: string | null } | null> {
  const r = await reg.executar<{ id: number; nome: string; conteudo: string | null }>(
    pool,
    'SELECT id, nome, conteudo FROM dbo.Itens WHERE id = @id',
    { id },
  );
  return (r as unknown as { id: number; nome: string; conteudo: string | null }[])[0] ?? null;
}

// Lança Error('PaiInvalido') se paiId não existir ou não for pasta.
async function validarPai(pool: ConnectionPool, reg: RegistradorSQL, paiId: number | null): Promise<void> {
  if (paiId === null) return;
  const r = await reg.executar<{ tipo: string }>(pool, 'SELECT tipo FROM dbo.Itens WHERE id = @pai', { pai: paiId });
  const tipo = (r as unknown as { tipo: string }[])[0]?.tipo;
  if (tipo !== 'pasta') throw new Error('PaiInvalido');
}

export async function criarItem(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  entrada: { nome: string; tipo: 'pasta' | 'arquivo'; paiId: number | null; driveId: number; donoId: number; conteudo: string | null },
): Promise<number> {
  await validarPai(pool, reg, entrada.paiId);
  const r = await reg.executar<{ id: number }>(
    pool,
    'INSERT INTO dbo.Itens (nome, tipo, paiId, driveId, donoId, conteudo) OUTPUT INSERTED.id VALUES (@nome, @tipo, @pai, @drive, @dono, @conteudo)',
    { nome: entrada.nome, tipo: entrada.tipo, pai: entrada.paiId, drive: entrada.driveId, dono: entrada.donoId, conteudo: entrada.conteudo },
  );
  return (r as unknown as { id: number }[])[0]!.id;
}

export async function renomear(pool: ConnectionPool, reg: RegistradorSQL, id: number, nome: string): Promise<void> {
  await reg.executar(pool, 'UPDATE dbo.Itens SET nome = @nome, modificadoEm = SYSDATETIME() WHERE id = @id', { nome, id });
}

export async function salvarConteudo(pool: ConnectionPool, reg: RegistradorSQL, id: number, conteudo: string): Promise<void> {
  await reg.executar(pool, 'UPDATE dbo.Itens SET conteudo = @conteudo, modificadoEm = SYSDATETIME() WHERE id = @id', { conteudo, id });
}

// Monta os placeholders e os parâmetros para uma cláusula IN (@i0, @i1, ...).
function listaIn(ids: number[]): { lugares: string; params: Record<string, unknown> } {
  return {
    lugares: ids.map((_, k) => `@i${k}`).join(', '),
    params: Object.fromEntries(ids.map((v, k) => [`i${k}`, v])),
  };
}

// Lê (id, paiId) de todos os itens — base para percorrer a árvore em memória.
// Sem filtro de lixeira nem de drive: tanto a checagem de ciclo quanto a coleta
// de subárvore precisam da árvore completa. Os dados são acíclicos (FK paiId +
// checagem de ciclo garantem), então os laços sobre essa lista sempre terminam.
async function lerArvore(pool: ConnectionPool, reg: RegistradorSQL): Promise<{ id: number; paiId: number | null }[]> {
  const r = await reg.executar<{ id: number; paiId: number | null }>(pool, 'SELECT id, paiId FROM dbo.Itens');
  return r as unknown as { id: number; paiId: number | null }[];
}

export async function mover(pool: ConnectionPool, reg: RegistradorSQL, id: number, paiId: number | null): Promise<void> {
  const itens = await lerArvore(pool, reg);
  if (criaCiclo(itens, id, paiId)) throw new Error('MovimentoCiclico');
  await validarPai(pool, reg, paiId);
  await reg.executar(pool, 'UPDATE dbo.Itens SET paiId = @pai, modificadoEm = SYSDATETIME() WHERE id = @id', { pai: paiId, id });
}

// Soft-delete (=1) ou restauração (=0) da subárvore inteira. A subárvore é
// coletada em memória (subarvore) e marcada com um único UPDATE ... WHERE id IN (...).
async function marcarLixeira(pool: ConnectionPool, reg: RegistradorSQL, id: number, valor: 0 | 1): Promise<void> {
  const itens = await lerArvore(pool, reg);
  const ids = subarvore(itens, id).map((n) => n.id);
  if (ids.length === 0) return;
  const { lugares, params } = listaIn(ids);
  params.valor = valor;
  await reg.executar(pool, `UPDATE dbo.Itens SET naLixeira = @valor WHERE id IN (${lugares})`, params);
}

export const enviarParaLixeira = (pool: ConnectionPool, reg: RegistradorSQL, id: number) => marcarLixeira(pool, reg, id, 1);
export const restaurar = (pool: ConnectionPool, reg: RegistradorSQL, id: number) => marcarLixeira(pool, reg, id, 0);

// Seguro num único DELETE: marcarLixeira sempre envia subárvores inteiras para a
// lixeira, então todos os itens com naLixeira=1 formam um conjunto fechado pela FK
// auto-referenciada (paiId) — nenhum filho na lixeira fica órfão de um pai removido.
export async function esvaziarLixeira(pool: ConnectionPool, reg: RegistradorSQL): Promise<void> {
  await reg.executar(pool, 'DELETE FROM dbo.Itens WHERE naLixeira = 1', {});
}

// Copia um item (e a subárvore, se pasta) para dentro de `destino`.
export async function copiar(pool: ConnectionPool, reg: RegistradorSQL, id: number, destino: number | null, donoId: number): Promise<void> {
  const itens = await lerArvore(pool, reg);
  if (criaCiclo(itens, id, destino)) throw new Error('MovimentoCiclico');
  await validarPai(pool, reg, destino);

  // Ids da subárvore, já em ordem de pais-antes-dos-filhos.
  const idsSub = subarvore(itens, id).map((n) => n.id);
  const { lugares, params: paramsSub } = listaIn(idsSub);

  const linhas = (await reg.executar<{ id: number; paiId: number | null; nome: string; tipo: 'pasta' | 'arquivo'; conteudo: string | null; driveId: number }>(
    pool,
    `SELECT id, paiId, nome, tipo, conteudo, driveId FROM dbo.Itens WHERE id IN (${lugares})`,
    paramsSub,
  )) as unknown as { id: number; paiId: number | null; nome: string; tipo: 'pasta' | 'arquivo'; conteudo: string | null; driveId: number }[];

  // Reordena os dados completos conforme a ordem da subárvore.
  const porId = new Map(linhas.map((l) => [l.id, l]));
  const nos = idsSub.map((i) => porId.get(i)!);

  const driveDestino = destino === null
    ? nos[0]!.driveId
    : ((await reg.executar<{ driveId: number }>(pool, 'SELECT driveId FROM dbo.Itens WHERE id = @d', { d: destino })) as unknown as { driveId: number }[])[0]!.driveId;

  const mapa = new Map<number, number>(); // idAntigo -> idNovo
  for (const no of nos) {
    const ehRaiz = no.id === id;
    const novoPai = ehRaiz ? destino : mapa.get(no.paiId!)!;
    const r = await reg.executar<{ id: number }>(
      pool,
      'INSERT INTO dbo.Itens (nome, tipo, paiId, driveId, donoId, conteudo) OUTPUT INSERTED.id VALUES (@nome, @tipo, @pai, @drive, @dono, @conteudo)',
      { nome: no.nome, tipo: no.tipo, pai: novoPai, drive: driveDestino, dono: donoId, conteudo: no.conteudo },
    );
    mapa.set(no.id, (r as unknown as { id: number }[])[0]!.id);
  }
}
