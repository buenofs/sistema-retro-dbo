import { test, expect, beforeEach } from 'vitest';
import { useDialogos, estadoInicialDialogos } from './useDialogos';

beforeEach(() => useDialogos.setState(estadoInicialDialogos()));

test('abrir adiciona um diálogo com id', () => {
  useDialogos.getState().abrir({ tipo: 'erro', titulo: 'Erro', mensagem: 'falhou' });
  const { dialogos } = useDialogos.getState();
  expect(dialogos).toHaveLength(1);
  expect(dialogos[0]!.id).toBeGreaterThan(0);
  expect(dialogos[0]!.tipo).toBe('erro');
});

test('fechar remove pelo id', () => {
  useDialogos.getState().abrir({ tipo: 'info', titulo: 'Oi', mensagem: 'tudo bem' });
  const id = useDialogos.getState().dialogos[0]!.id;
  useDialogos.getState().fechar(id);
  expect(useDialogos.getState().dialogos).toHaveLength(0);
});

test('ids são únicos entre diálogos', () => {
  const loja = useDialogos.getState();
  loja.abrir({ tipo: 'erro', titulo: 'A', mensagem: '1' });
  loja.abrir({ tipo: 'erro', titulo: 'B', mensagem: '2' });
  const ids = useDialogos.getState().dialogos.map((d) => d.id);
  expect(new Set(ids).size).toBe(2);
});
