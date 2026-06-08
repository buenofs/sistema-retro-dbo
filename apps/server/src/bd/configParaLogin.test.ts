import { test, expect } from 'bun:test';
import { configParaLogin } from './conexao';

test('usa o login e a senha informados', () => {
  const cfg = configParaLogin({ login: 'maria', senha: 'segredo' });
  expect(cfg.user).toBe('maria');
  expect(cfg.password).toBe('segredo');
});

test('mantém as opções de TLS local (autoassinado)', () => {
  const cfg = configParaLogin({ login: 'maria', senha: 'segredo' });
  expect(cfg.options?.encrypt).toBe(true);
  expect(cfg.options?.trustServerCertificate).toBe(true);
});
