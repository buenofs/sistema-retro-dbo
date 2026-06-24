import { useEffect, useState } from 'react';
import type { PropsApp } from '../../areaTrabalho/tipos';
import { useItem, useSalvarConteudo } from '../arquivos/ganchos';
import { Estado } from '../comuns/Estado';

interface DadosBloco { id: number; nome: string }

export function BlocoNotas({ janela }: PropsApp) {
  const dados = janela.dados as DadosBloco | null;
  const id = dados?.id ?? 0;
  const consulta = useItem(id);
  const salvar = useSalvarConteudo();
  const [texto, setTexto] = useState('');
  const [carregado, setCarregado] = useState(false);

  // Sincroniza o textarea quando o conteúdo chega.
  useEffect(() => {
    if (consulta.data && !carregado) {
      setTexto(consulta.data.conteudo);
      setCarregado(true);
    }
  }, [consulta.data, carregado]);

  // Se a janela passar a apontar para outro arquivo, recarrega.
  useEffect(() => { setCarregado(false); }, [id]);

  if (!dados) return <Estado>Nenhum arquivo aberto.</Estado>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 4, borderBottom: '1px solid var(--borda, #888)' }}>
        <strong>{dados.nome}</strong>
        <button style={{ marginLeft: 8 }} onClick={() => salvar.mutate({ id, conteudo: texto })} disabled={salvar.isPending}>
          Salvar
        </button>
        {salvar.isSuccess && <span style={{ marginLeft: 8 }}>salvo ✓</span>}
      </div>
      <textarea
        aria-label="Conteúdo"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        style={{ flex: 1, resize: 'none', border: 'none', padding: 8, fontFamily: 'monospace' }}
      />
    </div>
  );
}
