import { test, expect } from 'vitest';
import { limitarRetangulo, ALTURA_BARRA } from './limites';

const VP = { largura: 1000, altura: 700 };

test('não mexe num retângulo que já cabe', () => {
  const r = { x: 100, y: 100, largura: 300, altura: 200 };
  expect(limitarRetangulo(r, VP)).toEqual(r);
});

test('gruda em 0 quando passa da borda superior/esquerda', () => {
  const r = limitarRetangulo({ x: -50, y: -20, largura: 300, altura: 200 }, VP);
  expect(r.x).toBe(0);
  expect(r.y).toBe(0);
});

test('gruda na borda direita/inferior considerando a barra de tarefas', () => {
  const r = limitarRetangulo({ x: 5000, y: 5000, largura: 300, altura: 200 }, VP);
  expect(r.x).toBe(VP.largura - 300);
  expect(r.y).toBe(VP.altura - ALTURA_BARRA - 200);
});

test('janela maior que o viewport gruda em 0 (sem coordenada negativa)', () => {
  const r = limitarRetangulo({ x: 10, y: 10, largura: 2000, altura: 2000 }, VP);
  expect(r.x).toBe(0);
  expect(r.y).toBe(0);
});
