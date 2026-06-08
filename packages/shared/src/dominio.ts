export interface Departamento {
  id: number;
  nome: string;
  centroCusto: string | null;
}

export interface Projeto {
  id: number;
  nome: string;
  status: string;
  dataInicio: string | null;
}

export interface Funcionario {
  id: number;
  nome: string;
  cargo: string | null;
  salario: number;
  dataAdmissao: string | null;
  departamentoId: number;
  departamento?: string; // nome do departamento, quando a consulta faz join
}
