import { memo, Suspense, useCallback, useRef, type CSSProperties } from 'react';
import type { IdJanela, Retangulo } from './tipos';
import { useLoja } from './loja';
import { registroApps } from './registroApps';
import { LimiteErroJanela } from './LimiteErroJanela';
import { usarArrasto } from './usarArrasto';
import { ALTURA_BARRA, limitarRetangulo } from './limites';
import { Icone } from '../tema/icones/Icone';

const LARGURA_MIN = 200;
const ALTURA_MIN = 120;

function viewport() {
  return { largura: window.innerWidth, altura: window.innerHeight };
}

export const Janela = memo(function Janela({ id }: { id: IdJanela }) {
  const janela = useLoja(useCallback((s) => s.janelas.find((j) => j.id === id), [id]));
  const idFocada = useLoja((s) => s.idFocada);
  // Ações do Zustand têm referência estável entre renders.
  const focar = useLoja((s) => s.focar);
  const mover = useLoja((s) => s.mover);
  const redimensionar = useLoja((s) => s.redimensionar);
  const minimizar = useLoja((s) => s.minimizar);
  const maximizar = useLoja((s) => s.maximizar);
  const restaurar = useLoja((s) => s.restaurar);
  const fechar = useLoja((s) => s.fecharJanela);

  // Retângulo no início do arrasto (lido via getState p/ manter os callbacks estáveis).
  const inicio = useRef<Retangulo>({ x: 0, y: 0, largura: 0, altura: 0 });
  const aoIniciar = useCallback(() => {
    const atual = useLoja.getState().janelas.find((j) => j.id === id);
    if (atual) inicio.current = atual.retangulo;
    focar(id);
  }, [id, focar]);

  const aoMoverTitulo = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      const limitado = limitarRetangulo(
        { ...inicio.current, x: inicio.current.x + dx, y: inicio.current.y + dy },
        viewport(),
      );
      mover(id, limitado.x, limitado.y);
    },
    [id, mover],
  );

  const aoMoverAlca = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      redimensionar(
        id,
        Math.max(LARGURA_MIN, inicio.current.largura + dx),
        Math.max(ALTURA_MIN, inicio.current.altura + dy),
      );
    },
    [id, redimensionar],
  );

  const arrastarTitulo = usarArrasto({ aoIniciar, aoMover: aoMoverTitulo });
  const arrastarAlca = usarArrasto({ aoIniciar, aoMover: aoMoverAlca });

  if (!janela) return null;

  const maximizada = janela.estado === 'maximizada';
  const ativa = idFocada === janela.id;
  const Componente = registroApps[janela.tipoApp].componente;

  const estilo: CSSProperties = maximizada
    ? { position: 'absolute', left: 0, top: 0, right: 0, bottom: ALTURA_BARRA, zIndex: janela.zIndex }
    : {
        position: 'absolute',
        left: janela.retangulo.x,
        top: janela.retangulo.y,
        width: janela.retangulo.largura,
        height: janela.retangulo.altura,
        zIndex: janela.zIndex,
        display: janela.estado === 'minimizada' ? 'none' : undefined,
      };

  return (
    <div
      className="window"
      style={estilo}
      role="dialog"
      aria-label={janela.titulo}
      onPointerDown={() => focar(janela.id)}
    >
      <div
        className={`title-bar ${ativa ? '' : 'inactive'}`}
        onPointerDown={arrastarTitulo}
        onDoubleClick={() => (maximizada ? restaurar(janela.id) : maximizar(janela.id))}
      >
        <div className="title-bar-text">
          <Icone nome={janela.icone} tamanho={16} alt="" style={{ marginRight: 4 }} />
          {janela.titulo}
        </div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={() => minimizar(janela.id)} />
          <button
            aria-label={maximizada ? 'Restore' : 'Maximize'}
            onClick={() => (maximizada ? restaurar(janela.id) : maximizar(janela.id))}
          />
          <button aria-label="Close" onClick={() => fechar(janela.id)} />
        </div>
      </div>
      <div
        className="window-body"
        style={{ height: 'calc(100% - 2.2rem)', margin: 0, overflow: 'auto' }}
      >
        <LimiteErroJanela titulo={janela.titulo}>
          <Suspense fallback={<p style={{ padding: 8 }}>Carregando…</p>}>
            <Componente janela={janela} />
          </Suspense>
        </LimiteErroJanela>
      </div>
      {!maximizada && (
        <div className="alca-redimensionar" aria-hidden="true" onPointerDown={arrastarAlca} />
      )}
    </div>
  );
});
