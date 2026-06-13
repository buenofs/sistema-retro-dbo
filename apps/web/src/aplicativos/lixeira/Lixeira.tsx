import { Icone } from '../../tema/icones/Icone';
import { useLixeira, useRestaurar, useEsvaziarLixeira } from '../arquivos/ganchos';

export function Lixeira() {
  const lix = useLixeira();
  const restaurar = useRestaurar();
  const esvaziar = useEsvaziarLixeira();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: 12 }}>
      <div style={{ padding: 4, borderBottom: '1px solid var(--borda, #888)' }}>
        <button onClick={() => esvaziar.mutate()} disabled={esvaziar.isPending || (lix.data?.length ?? 0) === 0}>
          Esvaziar Lixeira
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {lix.isLoading && <div style={{ padding: 8 }}>Carregando…</div>}
        {lix.data?.map((item) => (
          <div key={item.id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '3px 6px' }}>
            <Icone nome={item.tipo === 'pasta' ? 'folder' : 'newdoc'} tamanho={16} />
            <span style={{ flex: 1 }}>{item.nome}</span>
            <button onClick={() => restaurar.mutate(item.id)} disabled={restaurar.isPending}>Restaurar</button>
          </div>
        ))}
        {lix.data?.length === 0 && <div style={{ padding: 8, opacity: 0.7 }}>(lixeira vazia)</div>}
      </div>
    </div>
  );
}
