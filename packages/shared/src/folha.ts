import type { Resposta } from './respostas';

// Linha agregada por departamento (de vw_FolhaResumo).
export interface FolhaResumoDepartamento {
  departamento: string;
  funcionarios: number;
  totalLiquido: number;
}

// Anomalia de folha (de vw_AnomaliasFolha): líquido pago ≠ base + bônus − descontos.
export interface AnomaliaFolha {
  id: number;
  funcionario: string;
  competencia: string; // 'AAAA-MM'
  salarioBase: number;
  bonus: number;
  descontos: number;
  salarioLiquido: number;
  liquidoEsperado: number;
}

export interface RelatorioFolha {
  departamentos: FolhaResumoDepartamento[];
  totalGeral: number;
  anomalias: AnomaliaFolha[];
}

export type RespostaRelatorioFolha = Resposta<RelatorioFolha>;
