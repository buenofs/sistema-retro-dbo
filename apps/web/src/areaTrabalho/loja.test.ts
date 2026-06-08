import { test, expect, beforeEach } from 'vitest';
import { useLoja, estadoInicial } from './loja';

// A loja é um singleton de módulo; zera antes de cada teste.
beforeEach(() => {
  useLoja.setState(estadoInicial());
});

test('abrirJanela adiciona, foca e usa metadados do registro', () => {
  useLoja.getState().abrirJanela('consulta');
  const { janelas, idFocada } = useLoja.getState();
  expect(janelas).toHaveLength(1);
  expect(janelas[0]!.tipoApp).toBe('consulta');
  expect(janelas[0]!.titulo).toBe('Editor de Consultas');
  expect(janelas[0]!.retangulo.largura).toBe(480);
  expect(janelas[0]!.estado).toBe('normal');
  expect(idFocada).toBe(janelas[0]!.id);
});

test('cada janela recebe um id único', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta');
  loja.abrirJanela('grade');
  const ids = useLoja.getState().janelas.map((j) => j.id);
  expect(new Set(ids).size).toBe(2);
});

test('focar traz a janela para a frente e atualiza idFocada', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta'); // zIndex 1
  loja.abrirJanela('grade'); // zIndex 2 (focada)
  const janelas2 = useLoja.getState().janelas;
  const primeira = janelas2[0]!;
  const segunda = janelas2[1]!;
  expect(segunda.zIndex).toBeGreaterThan(primeira.zIndex);

  loja.focar(primeira.id);
  const depois = useLoja.getState();
  const p = depois.janelas.find((j) => j.id === primeira.id)!;
  const s = depois.janelas.find((j) => j.id === segunda.id)!;
  expect(p.zIndex).toBeGreaterThan(s.zIndex);
  expect(depois.idFocada).toBe(primeira.id);
});

test('fecharJanela remove e limpa o foco se era a focada', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta');
  const id = useLoja.getState().janelas[0]!.id;
  loja.fecharJanela(id);
  expect(useLoja.getState().janelas).toHaveLength(0);
  expect(useLoja.getState().idFocada).toBeNull();
});

test('mover e redimensionar atualizam só a janela alvo', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta');
  loja.abrirJanela('grade');
  const janelasAB = useLoja.getState().janelas;
  const a = janelasAB[0]!;
  const b = janelasAB[1]!;

  loja.mover(a.id, 120, 80);
  loja.redimensionar(a.id, 300, 200);

  const depois = useLoja.getState();
  const da = depois.janelas.find((j) => j.id === a.id)!;
  const db = depois.janelas.find((j) => j.id === b.id)!;
  expect(da.retangulo).toEqual({ x: 120, y: 80, largura: 300, altura: 200 });
  // a janela B mantém a MESMA referência (re-render isolado, spec §2.3)
  expect(db).toBe(b);
});

test('maximizar e restaurar alternam o estado visual', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta');
  const id = useLoja.getState().janelas[0]!.id;

  loja.maximizar(id);
  expect(useLoja.getState().janelas[0]!.estado).toBe('maximizada');
  loja.restaurar(id);
  expect(useLoja.getState().janelas[0]!.estado).toBe('normal');
});

test('minimizar lembra o estado anterior e restaurar volta para ele', () => {
  const loja = useLoja.getState();
  loja.abrirJanela('consulta');
  const id = useLoja.getState().janelas[0]!.id;

  loja.maximizar(id);
  loja.minimizar(id);
  expect(useLoja.getState().janelas[0]!.estado).toBe('minimizada');
  expect(useLoja.getState().idFocada).toBeNull(); // minimizar tira o foco

  loja.restaurar(id);
  expect(useLoja.getState().janelas[0]!.estado).toBe('maximizada');
});
