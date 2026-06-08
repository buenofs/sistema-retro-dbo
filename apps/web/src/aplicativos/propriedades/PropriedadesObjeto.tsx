import type { EstadoJanela, PropsApp } from '../../areaTrabalho/tipos';
import { usePropriedades } from './ganchos';

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
      <fieldset>
        <legend>Geral</legend>
        <p style={{ margin: '2px 0' }}>Tipo: <strong>{p.tipo === 'view' ? 'View' : 'Tabela'}</strong></p>
        <p style={{ margin: '2px 0' }}>Esquema: {p.esquema}</p>
        <p style={{ margin: '2px 0' }}>Nome: {p.nome}</p>
        <p style={{ margin: '2px 0' }}>Colunas: {p.totalColunas}</p>
        <p style={{ margin: '2px 0' }}>Linhas (aprox.): {p.totalLinhas}</p>
        <p style={{ margin: '2px 0' }}>Criado em: {formatarData(p.criadoEm)}</p>
        <p style={{ margin: '2px 0' }}>Modificado em: {formatarData(p.modificadoEm)}</p>
      </fieldset>
      <fieldset style={{ marginTop: 8 }}>
        <legend>Índices ({p.indices.length})</legend>
        {p.indices.length === 0 ? (
          <p style={{ margin: '2px 0' }}>Nenhum índice.</p>
        ) : (
          <ul className="tree-view">
            {p.indices.map((i) => (
              <li key={i.nome}>
                {(i.chavePrimaria ? '🔑 ' : '') +
                  i.nome +
                  ' — ' +
                  i.tipo +
                  (i.unico ? ', único' : '') +
                  ' (' +
                  i.colunas.join(', ') +
                  ')'}
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
}
