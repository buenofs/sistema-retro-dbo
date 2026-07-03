import { test, expect } from 'vitest';
import { obterIcone, NOMES_ICONES, type NomeIcone } from './icones';

// obterIcone com um nome inexistente devolve o PNG transparente de fallback.
const FALLBACK = obterIcone('__nao_existe__' as NomeIcone);

test('todo nome conhecido resolve para um asset real (não cai no fallback)', () => {
  for (const nome of NOMES_ICONES) {
    const url = obterIcone(nome);
    expect(typeof url, nome).toBe('string');
    expect(url, nome).not.toBe(FALLBACK);
  }
});
