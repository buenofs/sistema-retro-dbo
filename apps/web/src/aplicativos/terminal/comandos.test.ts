import { test, expect, vi } from 'vitest';
import { criarShell, type ContextoTerminal, type ItemTerminal } from './comandos';

const raiz: ItemTerminal[] = [
  { id: 10, nome: 'Documentos', tipo: 'pasta' },
  { id: 11, nome: 'a.txt', tipo: 'arquivo' },
];

function ctxFake(over: Partial<ContextoTerminal> = {}): ContextoTerminal {
  return {
    letra: 'C',
    listar: vi.fn(async (paiId) => (paiId === null ? raiz : [])),
    criarPasta: vi.fn(async () => {}),
    criarArquivo: vi.fn(async () => {}),
    renomear: vi.fn(async () => {}),
    mover: vi.fn(async () => {}),
    copiar: vi.fn(async () => {}),
    apagar: vi.fn(async () => {}),
    restaurar: vi.fn(async () => {}),
    esvaziar: vi.fn(async () => {}),
    lerConteudo: vi.fn(async () => 'linha1\nlinha2'),
    salvarConteudo: vi.fn(async () => {}),
    listarLixeira: vi.fn(async () => [{ id: 99, nome: 'velho.txt', tipo: 'arquivo' as const }]),
    limpar: vi.fn(),
    ...over,
  };
}

test('prompt inicial é C:\\>', () => {
  const sh = criarShell(ctxFake());
  expect(sh.prompt()).toBe('C:\\>');
});

test('ls lista pastas e arquivos', async () => {
  const linhas = await criarShell(ctxFake()).executar('ls');
  expect(linhas.join('\n')).toContain('Documentos');
  expect(linhas.join('\n')).toContain('a.txt');
});

test('mkdir cria na pasta atual (raiz = null)', async () => {
  const ctx = ctxFake();
  await criarShell(ctx).executar('mkdir Projetos');
  expect(ctx.criarPasta).toHaveBeenCalledWith('Projetos', null);
});

test('cd entra na pasta e muda o prompt', async () => {
  const sh = criarShell(ctxFake());
  await sh.executar('cd Documentos');
  expect(sh.prompt()).toBe('C:\\Documentos>');
});

test('cd .. volta para a raiz', async () => {
  const sh = criarShell(ctxFake());
  await sh.executar('cd Documentos');
  await sh.executar('cd ..');
  expect(sh.prompt()).toBe('C:\\>');
});

test('rm resolve nome->id e apaga', async () => {
  const ctx = ctxFake();
  await criarShell(ctx).executar('rm a.txt');
  expect(ctx.apagar).toHaveBeenCalledWith(11);
});

test('echo texto > arquivo grava conteúdo', async () => {
  const ctx = ctxFake();
  await criarShell(ctx).executar('echo ola mundo > a.txt');
  expect(ctx.salvarConteudo).toHaveBeenCalledWith(11, 'ola mundo');
});

test('cat mostra o conteúdo em linhas', async () => {
  const linhas = await criarShell(ctxFake()).executar('cat a.txt');
  expect(linhas).toEqual(['linha1', 'linha2']);
});

test('empty esvazia a lixeira', async () => {
  const ctx = ctxFake();
  await criarShell(ctx).executar('empty');
  expect(ctx.esvaziar).toHaveBeenCalled();
});

test('comando inválido avisa', async () => {
  const linhas = await criarShell(ctxFake()).executar('xyz');
  expect(linhas[0]!.toLowerCase()).toContain('inválido');
});
