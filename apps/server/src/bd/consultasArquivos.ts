import type { ConnectionPool } from 'mssql';
import type { Drive, Item, UsoDrive } from '@dbos/shared';
import { RegistradorSQL } from './registradorSQL';
import { ordemDeInsercao, type NoCopia } from './copiaArvore';

const SEL_ITEM =
  'id, nome, tipo, paiId, driveId, donoId, CAST(tamanhoBytes AS BIGINT) AS tamanhoBytes, ' +
  'CONVERT(varchar(33), criadoEm, 126) AS criadoEm, CONVERT(varchar(33), modificadoEm, 126) AS modificadoEm';

export async function listarDrives(pool: ConnectionPool, reg: RegistradorSQL): Promise<Drive[]> {
  const r = await reg.executar<Drive>(
    pool,
    'SELECT id, letra, rotulo, capacidadeBytes FROM dbo.Drives ORDER BY letra',
  );
  return r as unknown as Drive[];
}

export async function usoPorDrive(pool: ConnectionPool, reg: RegistradorSQL): Promise<UsoDrive[]> {
  const r = await reg.executar<UsoDrive>(
    pool,
    'SELECT driveId, letra, rotulo, capacidadeBytes, usadoBytes, livreBytes FROM dbo.vw_UsoPorDrive ORDER BY letra',
  );
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
  const r = await reg.executar<Item>(
    pool,
    `SELECT ${SEL_ITEM} FROM dbo.Itens WHERE driveId = @drive AND ${filtroPai} AND naLixeira = 0 ORDER BY CASE tipo WHEN 'pasta' THEN 0 ELSE 1 END, nome`,
    params,
  );
  return r as unknown as Item[];
}

export async function listarLixeira(pool: ConnectionPool, reg: RegistradorSQL): Promise<Item[]> {
  const r = await reg.executar<Item>(
    pool,
    "SELECT id, nome, tipo, paiId, driveId, donoId, tamanhoBytes, '' AS criadoEm, CONVERT(varchar(33), modificadoEm, 126) AS modificadoEm FROM dbo.vw_Lixeira ORDER BY nome",
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

async function validarPai(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  paiId: number | null,
): Promise<void> {
  if (paiId === null) return;
  const r = await reg.executar<{ tipo: string }>(
    pool,
    'SELECT tipo FROM dbo.Itens WHERE id = @pai',
    { pai: paiId },
  );
  const tipo = (r as unknown as { tipo: string }[])[0]?.tipo;
  if (tipo !== 'pasta') throw new Error('PaiInvalido');
}

export async function criarItem(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  entrada: {
    nome: string;
    tipo: 'pasta' | 'arquivo';
    paiId: number | null;
    driveId: number;
    donoId: number;
    conteudo: string | null;
  },
): Promise<number> {
  await validarPai(pool, reg, entrada.paiId);
  const r = await reg.executar<{ id: number }>(
    pool,
    'INSERT INTO dbo.Itens (nome, tipo, paiId, driveId, donoId, conteudo) OUTPUT INSERTED.id VALUES (@nome, @tipo, @pai, @drive, @dono, @conteudo)',
    {
      nome: entrada.nome,
      tipo: entrada.tipo,
      pai: entrada.paiId,
      drive: entrada.driveId,
      dono: entrada.donoId,
      conteudo: entrada.conteudo,
    },
  );
  return (r as unknown as { id: number }[])[0]!.id;
}

export async function renomear(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  id: number,
  nome: string,
): Promise<void> {
  await reg.executar(
    pool,
    'UPDATE dbo.Itens SET nome = @nome, modificadoEm = SYSDATETIME() WHERE id = @id',
    { nome, id },
  );
}

export async function salvarConteudo(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  id: number,
  conteudo: string,
): Promise<void> {
  await reg.executar(
    pool,
    'UPDATE dbo.Itens SET conteudo = @conteudo, modificadoEm = SYSDATETIME() WHERE id = @id',
    { conteudo, id },
  );
}

async function criaCiclo(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  id: number,
  destino: number | null,
): Promise<boolean> {
  if (destino === null) return false;
  if (destino === id) return true;
  const r = await reg.executar<{ ciclo: number }>(
    pool,
    'WITH sub AS (SELECT id FROM dbo.Itens WHERE id = @id UNION ALL SELECT i.id FROM dbo.Itens i JOIN sub ON i.paiId = sub.id) SELECT CASE WHEN @destino IN (SELECT id FROM sub) THEN 1 ELSE 0 END AS ciclo',
    { id, destino },
  );
  return (r as unknown as { ciclo: number }[])[0]?.ciclo === 1;
}

export async function mover(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  id: number,
  paiId: number | null,
): Promise<void> {
  if (await criaCiclo(pool, reg, id, paiId)) throw new Error('MovimentoCiclico');
  await validarPai(pool, reg, paiId);
  await reg.executar(
    pool,
    'UPDATE dbo.Itens SET paiId = @pai, modificadoEm = SYSDATETIME() WHERE id = @id',
    { pai: paiId, id },
  );
}

async function marcarLixeira(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  id: number,
  valor: 0 | 1,
): Promise<void> {
  await reg.executar(
    pool,
    'WITH sub AS (SELECT id FROM dbo.Itens WHERE id = @id UNION ALL SELECT i.id FROM dbo.Itens i JOIN sub ON i.paiId = sub.id) UPDATE dbo.Itens SET naLixeira = @valor WHERE id IN (SELECT id FROM sub)',
    { id, valor },
  );
}

export const enviarParaLixeira = (pool: ConnectionPool, reg: RegistradorSQL, id: number) =>
  marcarLixeira(pool, reg, id, 1);
export const restaurar = (pool: ConnectionPool, reg: RegistradorSQL, id: number) =>
  marcarLixeira(pool, reg, id, 0);

// Seguro num único DELETE: marcarLixeira sempre envia subárvores inteiras para a
// lixeira, então todos os itens com naLixeira=1 formam um conjunto fechado pela FK
// auto-referenciada (paiId) — nenhum filho na lixeira fica órfão de um pai removido.
export async function esvaziarLixeira(pool: ConnectionPool, reg: RegistradorSQL): Promise<void> {
  await reg.executar(pool, 'DELETE FROM dbo.Itens WHERE naLixeira = 1', {});
}

export async function copiar(
  pool: ConnectionPool,
  reg: RegistradorSQL,
  id: number,
  destino: number | null,
  donoId: number,
): Promise<void> {
  if (await criaCiclo(pool, reg, id, destino)) throw new Error('MovimentoCiclico');
  await validarPai(pool, reg, destino);

  const subR = await reg.executar<
    NoCopia & { nome: string; tipo: 'pasta' | 'arquivo'; conteudo: string | null; driveId: number }
  >(
    pool,
    'WITH sub AS (SELECT id, paiId, 0 AS profundidade FROM dbo.Itens WHERE id = @id UNION ALL SELECT i.id, i.paiId, s.profundidade + 1 FROM dbo.Itens i JOIN sub s ON i.paiId = s.id) ' +
      'SELECT i.id, i.paiId, s.profundidade, i.nome, i.tipo, i.conteudo, i.driveId FROM dbo.Itens i JOIN sub s ON s.id = i.id',
    { id },
  );
  const nos = ordemDeInsercao(
    subR as unknown as (NoCopia & {
      nome: string;
      tipo: 'pasta' | 'arquivo';
      conteudo: string | null;
      driveId: number;
    })[],
  );
  const driveDestino =
    destino === null
      ? nos[0]!.driveId
      : (
          (await reg.executar<{ driveId: number }>(
            pool,
            'SELECT driveId FROM dbo.Itens WHERE id = @d',
            { d: destino },
          )) as unknown as { driveId: number }[]
        )[0]!.driveId;

  const mapa = new Map<number, number>();
  for (const no of nos) {
    const ehRaiz = no.id === id;
    const novoPai = ehRaiz ? destino : mapa.get(no.paiId!)!;
    const r = await reg.executar<{ id: number }>(
      pool,
      'INSERT INTO dbo.Itens (nome, tipo, paiId, driveId, donoId, conteudo) OUTPUT INSERTED.id VALUES (@nome, @tipo, @pai, @drive, @dono, @conteudo)',
      {
        nome: no.nome,
        tipo: no.tipo,
        pai: novoPai,
        drive: driveDestino,
        dono: donoId,
        conteudo: no.conteudo,
      },
    );
    mapa.set(no.id, (r as unknown as { id: number }[])[0]!.id);
  }
}
