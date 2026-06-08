import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ResultadoConsulta } from '@dbos/shared';

const ALTURA_LINHA = 22;

function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function GradeResultado({ resultado }: { resultado: ResultadoConsulta }) {
  const corpoRef = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({
    count: resultado.linhas.length,
    getScrollElement: () => corpoRef.current,
    estimateSize: () => ALTURA_LINHA,
    overscan: 12,
  });

  // Comando sem recordset (INSERT/UPDATE/DELETE).
  if (resultado.colunas.length === 0) {
    return (
      <p style={{ padding: 8 }}>Comando executado. Linhas afetadas: {resultado.linhasAfetadas}.</p>
    );
  }

  const colunas = `repeat(${resultado.colunas.length}, minmax(120px, 1fr))`;

  return (
    <div className="grade-resultado">
      <div className="grade-cabecalho" style={{ gridTemplateColumns: colunas }}>
        {resultado.colunas.map((c) => (
          <div key={c} className="grade-celula grade-th">
            {c}
          </div>
        ))}
      </div>
      <div ref={corpoRef} className="grade-corpo">
        <div style={{ height: virtual.getTotalSize(), position: 'relative' }}>
          {virtual.getVirtualItems().map((item) => {
            const linha = resultado.linhas[item.index]!;
            return (
              <div
                key={item.key}
                className="grade-linha"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: ALTURA_LINHA,
                  transform: `translateY(${item.start}px)`,
                  display: 'grid',
                  gridTemplateColumns: colunas,
                }}
              >
                {linha.map((valor, i) => (
                  <div key={i} className="grade-celula">
                    {formatarValor(valor)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {resultado.truncado && (
        <p className="grade-aviso">
          Mostrando as primeiras {resultado.linhas.length} de {resultado.totalLinhas} linhas.
        </p>
      )}
    </div>
  );
}
