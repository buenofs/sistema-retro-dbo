export interface ItemTerminal {
  id: number;
  nome: string;
  tipo: 'pasta' | 'arquivo';
}

export interface ContextoTerminal {
  letra: string;
  listar: (paiId: number | null) => Promise<ItemTerminal[]>;
  criarPasta: (nome: string, paiId: number | null) => Promise<void>;
  criarArquivo: (nome: string, paiId: number | null, conteudo: string) => Promise<void>;
  renomear: (id: number, nome: string) => Promise<void>;
  mover: (id: number, paiId: number | null) => Promise<void>;
  copiar: (id: number, paiId: number | null) => Promise<void>;
  apagar: (id: number) => Promise<void>;
  restaurar: (id: number) => Promise<void>;
  esvaziar: () => Promise<void>;
  lerConteudo: (id: number) => Promise<string>;
  salvarConteudo: (id: number, conteudo: string) => Promise<void>;
  listarLixeira: () => Promise<ItemTerminal[]>;
  limpar: () => void;
}

interface Nivel {
  id: number | null;
  nome: string;
}

const AJUDA = [
  'Comandos disponíveis:',
  '  ajuda | help               mostra esta ajuda',
  '  limpar | cls               limpa a tela',
  '  ls | dir                   lista a pasta atual',
  '  cd <pasta> | cd ..         navega entre pastas',
  '  mkdir <nome>               cria pasta',
  '  touch <nome>               cria arquivo vazio',
  '  ren <nome> <novo>          renomeia',
  '  mv <nome> <pasta>          move (use .. para subir)',
  '  cp <nome> <pasta>          copia',
  '  rm <nome>                  manda para a Lixeira',
  '  cat <arquivo>              mostra o conteúdo',
  '  echo <texto> > <arquivo>   grava conteúdo',
  '  lixeira                    lista a Lixeira',
  '  restaurar <id>             restaura item da Lixeira',
  '  empty                      esvazia a Lixeira',
];

export function criarShell(ctx: ContextoTerminal) {
  const pilha: Nivel[] = [{ id: null, nome: '' }];
  const atual = () => pilha[pilha.length - 1]!;

  function prompt(): string {
    return `${ctx.letra}:\\` + pilha.slice(1).map((n) => n.nome).join('\\') + '>';
  }

  async function acharNaPasta(nome: string): Promise<ItemTerminal | undefined> {
    const itens = await ctx.listar(atual().id);
    return itens.find((i) => i.nome.toLowerCase() === nome.toLowerCase());
  }

  async function executar(linha: string): Promise<string[]> {
    const partes = linha.trim().split(/\s+/);
    const cmd = (partes[0] ?? '').toLowerCase();
    if (cmd === '') return [];

    switch (cmd) {
      case 'ajuda':
      case 'help':
        return AJUDA;

      case 'limpar':
      case 'cls':
        ctx.limpar();
        return [];

      case 'ls':
      case 'dir': {
        const itens = await ctx.listar(atual().id);
        if (!itens.length) return ['(pasta vazia)'];
        return itens.map((i) => `${i.tipo === 'pasta' ? '<DIR>' : '     '}  ${i.nome}`);
      }

      case 'cd': {
        const alvo = partes[1] ?? '';
        if (alvo === '..') {
          if (pilha.length > 1) pilha.pop();
          return [];
        }
        if (alvo === '\\' || alvo === '/') {
          pilha.splice(1);
          return [];
        }
        if (!alvo) return [];
        const it = await acharNaPasta(alvo);
        if (!it || it.tipo !== 'pasta') return [`Pasta não encontrada: ${alvo}`];
        pilha.push({ id: it.id, nome: it.nome });
        return [];
      }

      case 'mkdir':
      case 'md': {
        const nome = partes.slice(1).join(' ');
        if (!nome) return ['Uso: mkdir <nome>'];
        await ctx.criarPasta(nome, atual().id);
        return [`Pasta criada: ${nome}`];
      }

      case 'touch': {
        const nome = partes.slice(1).join(' ');
        if (!nome) return ['Uso: touch <nome>'];
        await ctx.criarArquivo(nome, atual().id, '');
        return [`Arquivo criado: ${nome}`];
      }

      case 'ren': {
        const origem = partes[1];
        const novo = partes.slice(2).join(' ');
        if (!origem || !novo) return ['Uso: ren <nome> <novo>'];
        const it = await acharNaPasta(origem);
        if (!it) return [`Não encontrado: ${origem}`];
        await ctx.renomear(it.id, novo);
        return [`Renomeado para ${novo}`];
      }

      case 'rm':
      case 'del': {
        const nome = partes.slice(1).join(' ');
        if (!nome) return ['Uso: rm <nome>'];
        const it = await acharNaPasta(nome);
        if (!it) return [`Não encontrado: ${nome}`];
        await ctx.apagar(it.id);
        return [`Movido para a Lixeira: ${nome}`];
      }

      case 'mv':
      case 'cp': {
        const origem = partes[1];
        const destino = partes[2];
        if (!origem || !destino) return [`Uso: ${cmd} <nome> <pasta>`];
        const it = await acharNaPasta(origem);
        if (!it) return [`Não encontrado: ${origem}`];
        let destId: number | null;
        if (destino === '..') {
          destId = pilha.length > 1 ? pilha[pilha.length - 2]!.id : null;
        } else {
          const dpasta = await acharNaPasta(destino);
          if (!dpasta || dpasta.tipo !== 'pasta') return [`Pasta destino inválida: ${destino}`];
          destId = dpasta.id;
        }
        if (cmd === 'mv') await ctx.mover(it.id, destId);
        else await ctx.copiar(it.id, destId);
        return [`${cmd === 'mv' ? 'Movido' : 'Copiado'}: ${origem} -> ${destino}`];
      }

      case 'cat': {
        const nome = partes.slice(1).join(' ');
        const it = await acharNaPasta(nome);
        if (!it || it.tipo !== 'arquivo') return [`Arquivo não encontrado: ${nome}`];
        return (await ctx.lerConteudo(it.id)).split('\n');
      }

      case 'echo': {
        const m = linha.match(/^echo\s+(.*?)\s*>\s*(\S+)\s*$/i);
        if (!m) return ['Uso: echo <texto> > <arquivo>'];
        const texto = m[1] ?? '';
        const nome = m[2]!;
        const it = await acharNaPasta(nome);
        if (it) await ctx.salvarConteudo(it.id, texto);
        else await ctx.criarArquivo(nome, atual().id, texto);
        return [`Gravado em ${nome}`];
      }

      case 'lixeira': {
        const itens = await ctx.listarLixeira();
        if (!itens.length) return ['(lixeira vazia)'];
        return itens.map((i) => `${i.id}  ${i.nome}`);
      }

      case 'restaurar': {
        const id = Number(partes[1]);
        if (!id) return ['Uso: restaurar <id>  (veja "lixeira")'];
        await ctx.restaurar(id);
        return [`Restaurado: ${id}`];
      }

      case 'empty': {
        await ctx.esvaziar();
        return ['Lixeira esvaziada.'];
      }

      default:
        return [`Comando inválido: ${cmd}. Digite "ajuda".`];
    }
  }

  return { executar, prompt };
}
