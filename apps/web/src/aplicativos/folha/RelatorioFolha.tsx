import { Icone } from '../../tema/icones/Icone';
import { formatarMoeda } from '../grade/conversao';
import { useRelatorioFolha } from './ganchos';
import './folha.css';

export function RelatorioFolha() {
  const consulta = useRelatorioFolha();

  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando…</p>;
  if (consulta.isError) {
    return <p style={{ padding: 8, color: 'var(--erro-ink)' }}>{consulta.error.message}</p>;
  }

  const { departamentos, totalGeral, anomalias } = consulta.data;
  const maior = departamentos.reduce((m, d) => Math.max(m, d.totalLiquido), 0) || 1;

  return (
    <div className="folha">
      <div className="folha-barra">
        <Icone nome="report" tamanho={16} alt="" />
        <strong>Folha de Pagamento — Resumo</strong>
        <button style={{ marginLeft: 'auto' }} onClick={() => consulta.refetch()}>
          <Icone nome="refresh" tamanho={14} alt="" style={{ marginRight: 4 }} /> Atualizar
        </button>
      </div>

      <div className="folha-corpo">
        <div className="folha-titulo">Líquido por departamento</div>
        <div className="folha-subtitulo">
          Líquido total <strong>{formatarMoeda(totalGeral)}</strong>
        </div>

        {departamentos.map((d) => (
          <div key={d.departamento} className="folha-linha">
            <div className="folha-linha-cab">
              <span>
                <strong>{d.departamento}</strong>{' '}
                <span style={{ color: 'var(--ink-suave)' }}>· {d.funcionarios} func.</span>
              </span>
              <span className="num">{formatarMoeda(d.totalLiquido)}</span>
            </div>
            <div className="folha-trilho">
              <div
                className="folha-preenche"
                style={{ width: `${(d.totalLiquido / maior) * 100}%` }}
              />
            </div>
          </div>
        ))}

        {anomalias.length > 0 && (
          <div className="folha-anomalias">
            <div className="folha-anomalias-titulo">
              <Icone nome="stop" tamanho={14} alt="" />
              Anomalias ({anomalias.length})
            </div>
            <table className="folha-tabela">
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Competência</th>
                  <th>Líquido pago</th>
                  <th>Esperado</th>
                </tr>
              </thead>
              <tbody>
                {anomalias.map((a) => (
                  <tr key={a.id}>
                    <td>{a.funcionario}</td>
                    <td>{a.competencia}</td>
                    <td className="num">{formatarMoeda(a.salarioLiquido)}</td>
                    <td className="num">{formatarMoeda(a.liquidoEsperado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="folha-statusbar">
        <span>{departamentos.length} departamento(s)</span>
        <span style={{ marginLeft: 'auto' }}>view · somente leitura</span>
      </div>
    </div>
  );
}
