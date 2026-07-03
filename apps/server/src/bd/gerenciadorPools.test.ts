import { test, expect } from 'bun:test';
import { criarGerenciadorPools, ErroLimiteSessoes } from './gerenciadorPools';
import type { ConnectionPool } from 'mssql';

function poolFalso() {
  const estado = { fechado: false };
  const pool = { close: async () => { estado.fechado = true; } };
  return { pool: pool as unknown as ConnectionPool, estado };
}

test('cria e obtém uma sessão', () => {
  const g = criarGerenciadorPools({ maxSessoes: 2, ttlMs: 1000 });
  const { pool } = poolFalso();
  g.criar('s1', pool, 'sa', 0);
  expect(g.tamanho()).toBe(1);
  expect(g.obter('s1', 1)?.login).toBe('sa');
});

test('obter de id inexistente devolve undefined', () => {
  const g = criarGerenciadorPools({ maxSessoes: 2, ttlMs: 1000 });
  expect(g.obter('nao-existe', 0)).toBeUndefined();
});

test('aplica o limite de sessões simultâneas', () => {
  const g = criarGerenciadorPools({ maxSessoes: 1, ttlMs: 1000 });
  g.criar('s1', poolFalso().pool, 'sa', 0);
  expect(() => g.criar('s2', poolFalso().pool, 'sa', 0)).toThrow(ErroLimiteSessoes);
});

test('remover fecha o pool e some com a sessão', async () => {
  const g = criarGerenciadorPools({ maxSessoes: 2, ttlMs: 1000 });
  const { pool, estado } = poolFalso();
  g.criar('s1', pool, 'sa', 0);
  await g.remover('s1');
  expect(g.tamanho()).toBe(0);
  expect(estado.fechado).toBe(true);
});

test('limpa expiradas e mantém as ativas (TTL deslizante)', async () => {
  const g = criarGerenciadorPools({ maxSessoes: 5, ttlMs: 100 });
  const velha = poolFalso();
  const nova = poolFalso();
  g.criar('velha', velha.pool, 'sa', 0);
  g.criar('nova', nova.pool, 'sa', 0);
  g.obter('nova', 90);
  const removidas = await g.limparExpiradas(150);
  expect(removidas).toBe(1);
  expect(g.tamanho()).toBe(1);
  expect(velha.estado.fechado).toBe(true);
  expect(nova.estado.fechado).toBe(false);
});
