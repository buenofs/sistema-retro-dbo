import { test, expect } from 'vitest';
import { useContextoArquivos } from './contexto';

test('drive inicial é 1 e definirDrive troca', () => {
  expect(useContextoArquivos.getState().driveId).toBe(1);
  useContextoArquivos.getState().definirDrive(2);
  expect(useContextoArquivos.getState().driveId).toBe(2);
  useContextoArquivos.getState().definirDrive(1); // reset p/ não vazar entre testes
});
