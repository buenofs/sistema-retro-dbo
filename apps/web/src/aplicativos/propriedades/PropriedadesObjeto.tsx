import type { EstadoJanela, PropsApp } from '../../areaTrabalho/tipos';
import { Icone } from '../../tema/icones/Icone';
import { usePropriedades } from './ganchos';
import './propriedades.css';

interface RefObj {
  esquema: string;
  tabela: string;
}

function refDaJanela(janela: EstadoJanela): RefObj | null {
  const d = janela.dados as { esquema?: unknown; tabela?: unknown } | null | undefined;
  if (d && typeof d.esquema === 'string' && typeof d.tabela === 'string') {
    return { esquema: d.esquema, tabela: d.tabela };
  }
  return null;
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR');
}

export function PropriedadesObjeto({ janela }: PropsApp) {
  const ref = refDaJanela(janela);
  if (!ref) {
    return (
      <p style={{ padding: 8 }}>
        Clique com o botão direito num objeto no Explorador e escolha “Propriedades”.
      </p>
    );
  }
  return <DetalhePropriedades esquema={ref.esquema} tabela={ref.tabela} />;
}

function DetalhePropriedades({ esquema, tabela }: RefObj) {
  const consulta = usePropriedades(esquema, tabela);
  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando…</p>;
  if (consulta.isError) return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;
  const p = consulta.data;

  return (
    <div style={{ padding: 8 }}>
      <div className="prop-cabecalho">
        <Icone nome={p.tipo === 'view' ? 'view' : 'table'} tamanho={32} alt="" />
        <div>
          <div className="prop-titulo">{p.nome}</div>
          <div className="prop-subtitulo">
            {p.tipo === 'view' ? 'View' : 'Tabela'} · {p.esquema}
          </div>
        </div>
      </div>

      <div className="prop-kv">
        <div className="prop-linha"><span className="prop-chave">Colunas</span><strong>{p.totalColunas}</strong></div>
        <div className="prop-linha"><span className="prop-chave">Linhas (aprox.)</span><strong>{p.totalLinhas}</strong></div>
        <div className="prop-linha"><span className="prop-chave">Criado em</span><strong>{formatarData(p.criadoEm)}</strong></div>
        <div className="prop-linha"><span className="prop-chave">Modificado em</span><strong>{formatarData(p.modificadoEm)}</strong></div>
      </div>

      <fieldset>
        <legend>Índices ({p.indices.length})</legend>
        {p.indices.length === 0 ? (
          <p style={{ margin: '2px 0' }}>Nenhum índice.</p>
        ) : (
          <ul className="tree-view">
            {p.indices.map((i) => (
              <li key={i.nome} className="prop-indice">
                {i.chavePrimaria && <Icone nome="key" tamanho={12} alt="chave primária" />}
                <span>
                  {i.nome} — {i.tipo}
                  {i.unico ? ', único' : ''} ({i.colunas.join(', ')})
                </span>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
}
