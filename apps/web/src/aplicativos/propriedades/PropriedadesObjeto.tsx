import type { EstadoJanela, PropsApp } from '../../areaTrabalho/tipos';
import { Icone } from '../../tema/icones/Icone';
import { usePropriedades } from './ganchos';
import { Estado } from '../comuns/Estado';
import './propriedades.css';

interface RefObj {
  esquema: string;
  tabela: string;
}

function refDaJanela(janela: EstadoJanela): RefObj | null {
  const dados = janela.dados as { esquema?: unknown; tabela?: unknown } | null | undefined;
  if (dados && typeof dados.esquema === 'string' && typeof dados.tabela === 'string') {
    return { esquema: dados.esquema, tabela: dados.tabela };
  }
  return null;
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : data.toLocaleString('pt-BR');
}

export function PropriedadesObjeto({ janela }: PropsApp) {
  const ref = refDaJanela(janela);
  if (!ref) {
    return (
      <Estado>
        Clique com o botão direito num objeto no Explorador e escolha “Propriedades”.
      </Estado>
    );
  }
  return <DetalhePropriedades esquema={ref.esquema} tabela={ref.tabela} />;
}

function DetalhePropriedades({ esquema, tabela }: RefObj) {
  const consulta = usePropriedades(esquema, tabela);
  if (consulta.isPending) return <Estado>Carregando…</Estado>;
  if (consulta.isError) return <Estado variante="erro">{consulta.error.message}</Estado>;
  const propriedades = consulta.data;

  return (
    <div className="painel">
      <div className="prop-cabecalho">
        <Icone nome={propriedades.tipo === 'view' ? 'view' : 'table'} tamanho={32} alt="" />
        <div>
          <div className="prop-titulo">{propriedades.nome}</div>
          <div className="prop-subtitulo">
            {propriedades.tipo === 'view' ? 'View' : 'Tabela'} · {propriedades.esquema}
          </div>
        </div>
      </div>

      <div className="prop-kv">
        <div className="prop-linha"><span className="prop-chave">Colunas</span><strong>{propriedades.totalColunas}</strong></div>
        <div className="prop-linha"><span className="prop-chave">Linhas (aprox.)</span><strong>{propriedades.totalLinhas}</strong></div>
        <div className="prop-linha"><span className="prop-chave">Criado em</span><strong>{formatarData(propriedades.criadoEm)}</strong></div>
        <div className="prop-linha"><span className="prop-chave">Modificado em</span><strong>{formatarData(propriedades.modificadoEm)}</strong></div>
      </div>

      <fieldset>
        <legend>Índices ({propriedades.indices.length})</legend>
        {propriedades.indices.length === 0 ? (
          <p style={{ margin: '2px 0' }}>Nenhum índice.</p>
        ) : (
          <ul className="tree-view">
            {propriedades.indices.map((indice) => (
              <li key={indice.nome} className="prop-indice">
                {indice.chavePrimaria && <Icone nome="key" tamanho={12} alt="chave primária" />}
                <span>
                  {indice.nome} — {indice.tipo}
                  {indice.unico ? ', único' : ''} ({indice.colunas.join(', ')})
                </span>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
}
