import type { FiltrosBusca, Funcionario, ResultadoConsulta } from '@dbos/shared';

export interface ContextoTerminal {
  consultar: (sql: string) => Promise<ResultadoConsulta>;
  buscar: (filtros: FiltrosBusca) => Promise<Funcionario[]>;
  abrirApp: (tipo: 'relacionamentos' | 'consulta', dados?: unknown) => void;
  limpar: () => void;
}

// Aliases pt-BR → objetos reais (whitelist; nenhum texto livre entra no SQL).
const TABELAS: Record<string, string> = {
  funcionarios: 'Funcionarios',
  departamentos: 'Departamentos',
  projetos: 'Projetos',
  folha: 'FolhaPagamento',
};
const VIEWS: Record<string, string> = {
  anomalias_folha: 'vw_AnomaliasFolha',
  folha_resumo: 'vw_FolhaResumo',
};
const OPERADORES: Record<string, FiltrosBusca['salarioOp']> = { '>': 'gt', '<': 'lt', '=': 'eq' };

const AJUDA = [
  'Comandos disponíveis:',
  '  ajuda                        mostra esta ajuda',
  '  limpar                       limpa a tela',
  '  listar <tabela>              funcionarios | departamentos | projetos | folha',
  '  buscar <campo> <op> <valor>  ex.: buscar salario > 10000',
  '  mostrar <view>               anomalias_folha | folha_resumo',
  '  abrir <nome>.func            abre os relacionamentos do funcionario',
  '  sql                          abre o Editor de Consultas',
];

function tabelaTexto(r: ResultadoConsulta): string[] {
  if (r.colunas.length === 0) return [`(${r.linhasAfetadas} linha(s) afetada(s))`];
  const linhas = [r.colunas.join(' | ')];
  for (const linha of r.linhas) {
    linhas.push(linha.map((v) => (v === null || v === undefined ? 'NULL' : String(v))).join(' | '));
  }
  if (r.truncado) linhas.push(`... (${r.totalLinhas} linhas no total)`);
  return linhas;
}

function funcionariosTexto(fs: Funcionario[]): string[] {
  if (fs.length === 0) return ['(nenhum funcionario encontrado)'];
  return fs.map((f) => `${f.id}  ${f.nome}  ${f.cargo ?? ''}  ${f.salario}  ${f.departamento ?? ''}`);
}

export async function executarComando(linha: string, ctx: ContextoTerminal): Promise<string[]> {
  const partes = linha.trim().split(/\s+/);
  const cmd = (partes[0] ?? '').toLowerCase();
  if (cmd === '') return [];

  if (cmd === 'ajuda') return AJUDA;
  if (cmd === 'limpar') {
    ctx.limpar();
    return [];
  }
  if (cmd === 'sql') {
    ctx.abrirApp('consulta');
    return ['Abrindo o Editor de Consultas...'];
  }

  if (cmd === 'listar') {
    const alvo = (partes[1] ?? '').toLowerCase();
    const tabela = TABELAS[alvo];
    if (!tabela) return [`Tabela desconhecida: ${alvo || '(vazio)'}. Tente: ${Object.keys(TABELAS).join(', ')}.`];
    return tabelaTexto(await ctx.consultar(`SELECT * FROM dbo.${tabela}`));
  }

  if (cmd === 'mostrar') {
    const alvo = (partes[1] ?? '').toLowerCase();
    const view = VIEWS[alvo];
    if (!view) return [`View desconhecida: ${alvo || '(vazio)'}. Tente: ${Object.keys(VIEWS).join(', ')}.`];
    return tabelaTexto(await ctx.consultar(`SELECT * FROM dbo.${view}`));
  }

  if (cmd === 'buscar') {
    const campo = (partes[1] ?? '').toLowerCase();
    const op = partes[2] ?? '';
    const valor = partes.slice(3).join(' ');
    const filtros: FiltrosBusca = {};
    if (campo === 'salario' && OPERADORES[op] && valor) {
      filtros.salarioOp = OPERADORES[op];
      filtros.salario = Number(valor);
    } else if (campo === 'nome' && op === '=' && valor) {
      filtros.nome = valor;
    } else {
      return ['Uso: buscar salario > 10000   |   buscar nome = Maria'];
    }
    return funcionariosTexto(await ctx.buscar(filtros));
  }

  if (cmd === 'abrir') {
    const nome = (partes[1] ?? '').replace(/\.func$/i, '');
    if (!nome) return ['Uso: abrir <nome>.func'];
    const achados = await ctx.buscar({ nome });
    const f = achados[0];
    if (!f) return [`Funcionario nao encontrado: ${nome}`];
    ctx.abrirApp('relacionamentos', { tipo: 'funcionario', id: f.id });
    return [`Abrindo relacionamentos de ${f.nome}...`];
  }

  return [`Comando ou nome invalido: ${cmd}. Digite "ajuda".`];
}
