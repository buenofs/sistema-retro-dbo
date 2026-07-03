import type { Drive, Item, UsoDrive } from '@dbos/shared';
import type { Banco } from './banco';
import { listaIn } from './clausulas';
import { subarvore, criaCiclo } from './arvore';

export function listarDrives(banco: Banco): Promise<Drive[]> {
  return banco.consultar<Drive>('SELECT id, letra, rotulo, capacidadeBytes FROM dbo.Drives ORDER BY letra');
}

export function usoPorDrive(banco: Banco): Promise<UsoDrive[]> {
  return banco.consultar<UsoDrive>(
    'SELECT driveId, letra, rotulo, capacidadeBytes, usadoBytes, livreBytes FROM dbo.vw_UsoPorDrive ORDER BY letra',
  );
}

/** Lista o conteúdo de uma pasta; 'pasta' vem depois de 'arquivo' no alfabeto, então tipo DESC deixa as pastas primeiro. */
export function listarConteudo(banco: Banco, driveId: number, paiId: number | null): Promise<Item[]> {
  const filtroPai = paiId === null ? 'paiId IS NULL' : 'paiId = @pai';
  const parametros: Record<string, unknown> = { drive: driveId };
  if (paiId !== null) parametros.pai = paiId;
  return banco.consultar<Item>(
    `SELECT id, nome, tipo, paiId, driveId, donoId, tamanhoBytes, criadoEm, modificadoEm FROM dbo.Itens WHERE driveId = @drive AND ${filtroPai} AND naLixeira = 0 ORDER BY tipo DESC, nome`,
    parametros,
  );
}

export function listarLixeira(banco: Banco): Promise<Item[]> {
  return banco.consultar<Item>(
    "SELECT id, nome, tipo, paiId, driveId, donoId, tamanhoBytes, '' AS criadoEm, modificadoEm FROM dbo.vw_Lixeira ORDER BY nome",
  );
}

export async function lerItem(
  banco: Banco,
  id: number,
): Promise<{ id: number; nome: string; conteudo: string | null } | null> {
  const linhas = await banco.consultar<{ id: number; nome: string; conteudo: string | null }>(
    'SELECT id, nome, conteudo FROM dbo.Itens WHERE id = @id',
    { id },
  );
  return linhas[0] ?? null;
}

async function validarPai(banco: Banco, paiId: number | null): Promise<void> {
  if (paiId === null) return;
  const linhas = await banco.consultar<{ tipo: string }>('SELECT tipo FROM dbo.Itens WHERE id = @pai', { pai: paiId });
  if (linhas[0]?.tipo !== 'pasta') throw new Error('PaiInvalido');
}

export async function criarItem(
  banco: Banco,
  entrada: { nome: string; tipo: 'pasta' | 'arquivo'; paiId: number | null; driveId: number; donoId: number; conteudo: string | null },
): Promise<number> {
  await validarPai(banco, entrada.paiId);
  const linhas = await banco.consultar<{ id: number }>(
    'INSERT INTO dbo.Itens (nome, tipo, paiId, driveId, donoId, conteudo) OUTPUT INSERTED.id VALUES (@nome, @tipo, @pai, @drive, @dono, @conteudo)',
    { nome: entrada.nome, tipo: entrada.tipo, pai: entrada.paiId, drive: entrada.driveId, dono: entrada.donoId, conteudo: entrada.conteudo },
  );
  return linhas[0]!.id;
}

export async function renomear(banco: Banco, id: number, nome: string): Promise<void> {
  await banco.executar('UPDATE dbo.Itens SET nome = @nome, modificadoEm = SYSDATETIME() WHERE id = @id', { nome, id });
}

export async function salvarConteudo(banco: Banco, id: number, conteudo: string): Promise<void> {
  await banco.executar('UPDATE dbo.Itens SET conteudo = @conteudo, modificadoEm = SYSDATETIME() WHERE id = @id', { conteudo, id });
}

/** Lê (id, paiId) de todos os itens; árvore completa (ciclo e subárvore precisam dela) e acíclica, então os laços terminam. */
function lerArvore(banco: Banco): Promise<{ id: number; paiId: number | null }[]> {
  return banco.consultar<{ id: number; paiId: number | null }>('SELECT id, paiId FROM dbo.Itens');
}

export async function mover(banco: Banco, id: number, paiId: number | null): Promise<void> {
  const itens = await lerArvore(banco);
  if (criaCiclo(itens, id, paiId)) throw new Error('MovimentoCiclico');
  await validarPai(banco, paiId);
  await banco.executar('UPDATE dbo.Itens SET paiId = @pai, modificadoEm = SYSDATETIME() WHERE id = @id', { pai: paiId, id });
}

async function marcarLixeira(banco: Banco, id: number, valor: 0 | 1): Promise<void> {
  const itens = await lerArvore(banco);
  const ids = subarvore(itens, id).map((no) => no.id);
  if (ids.length === 0) return;
  const { lugares, parametros } = listaIn(ids);
  await banco.executar(`UPDATE dbo.Itens SET naLixeira = @valor WHERE id IN (${lugares})`, { ...parametros, valor });
}

export const enviarParaLixeira = (banco: Banco, id: number) => marcarLixeira(banco, id, 1);
export const restaurar = (banco: Banco, id: number) => marcarLixeira(banco, id, 0);

export async function esvaziarLixeira(banco: Banco): Promise<void> {
  await banco.executar('DELETE FROM dbo.Itens WHERE naLixeira = 1');
}

export async function copiar(banco: Banco, id: number, destino: number | null, donoId: number): Promise<void> {
  const itens = await lerArvore(banco);
  if (criaCiclo(itens, id, destino)) throw new Error('MovimentoCiclico');
  await validarPai(banco, destino);

  const idsSub = subarvore(itens, id).map((no) => no.id);
  const { lugares, parametros } = listaIn(idsSub);

  const linhas = await banco.consultar<{ id: number; paiId: number | null; nome: string; tipo: 'pasta' | 'arquivo'; conteudo: string | null; driveId: number }>(
    `SELECT id, paiId, nome, tipo, conteudo, driveId FROM dbo.Itens WHERE id IN (${lugares})`,
    parametros,
  );

  const porId = new Map(linhas.map((linha) => [linha.id, linha]));
  const nos = idsSub.map((idSub) => porId.get(idSub)!);

  let driveDestino = nos[0]!.driveId;
  if (destino !== null) {
    const alvo = await banco.consultar<{ driveId: number }>('SELECT driveId FROM dbo.Itens WHERE id = @destino', { destino });
    driveDestino = alvo[0]!.driveId;
  }

  const mapa = new Map<number, number>();
  for (const no of nos) {
    const novoPai = no.id === id ? destino : mapa.get(no.paiId!)!;
    const inseridas = await banco.consultar<{ id: number }>(
      'INSERT INTO dbo.Itens (nome, tipo, paiId, driveId, donoId, conteudo) OUTPUT INSERTED.id VALUES (@nome, @tipo, @pai, @drive, @dono, @conteudo)',
      { nome: no.nome, tipo: no.tipo, pai: novoPai, drive: driveDestino, dono: donoId, conteudo: no.conteudo },
    );
    mapa.set(no.id, inseridas[0]!.id);
  }
}
