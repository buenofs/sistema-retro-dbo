import { test, expect } from 'vitest';
import { MAPAS, PALETA, type NomeIcone } from './bitmaps';
import { obterIcone, temIcone, listarIcones, NOMES_ICONES } from './motor';

test('a paleta tem o transparente e cores válidas', () => {
  expect(PALETA['.']).toBeNull();
  for (const [ch, cor] of Object.entries(PALETA)) {
    if (ch === '.') continue;
    expect(cor).toMatch(/^#[0-9a-f]{6}$/i);
  }
});

test('todo ícone tem 16 linhas e nenhuma linha excede 16 colunas', () => {
  for (const [nome, mapa] of Object.entries(MAPAS)) {
    expect(mapa.length, `${nome}: nº de linhas`).toBe(16);
    for (const linha of mapa) {
      expect(linha.length, `${nome}: largura da linha`).toBeLessThanOrEqual(16);
    }
  }
});

test('todo caractere usado nos bitmaps existe na paleta', () => {
  for (const [nome, mapa] of Object.entries(MAPAS)) {
    for (const linha of mapa) {
      for (const ch of linha) {
        expect(PALETA, `${nome}: caractere "${ch}"`).toHaveProperty(ch);
      }
    }
  }
});

test('listarIcones e NOMES_ICONES batem com as chaves de MAPAS', () => {
  expect(new Set(listarIcones())).toEqual(new Set(Object.keys(MAPAS)));
  expect(NOMES_ICONES.length).toBe(Object.keys(MAPAS).length);
});

test('temIcone é um type-guard correto', () => {
  expect(temIcone('folder')).toBe(true);
  expect(temIcone('nao-existe')).toBe(false);
});

test('obterIcone devolve uma data URL (fallback em jsdom) e usa cache', () => {
  const nome = 'folder' as NomeIcone;
  const a = obterIcone(nome, 16);
  expect(typeof a).toBe('string');
  expect(a.startsWith('data:image/')).toBe(true);
  // segunda chamada (mesma chave) vem do cache — mesma referência de string
  expect(obterIcone(nome, 16)).toBe(a);
});
