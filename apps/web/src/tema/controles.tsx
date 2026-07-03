import type { ReactNode } from 'react';

export function SecaoTweaks({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="tw-secao">
      <div className="tw-secao-rotulo">{rotulo}</div>
      {children}
    </div>
  );
}

export function LinhaTweak({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="tw-linha">
      <span className="tw-linha-rotulo">{rotulo}</span>
      <span className="tw-linha-ctl">{children}</span>
    </div>
  );
}

export function Alternador({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: boolean;
  aoMudar: (valor: boolean) => void;
}) {
  return (
    <LinhaTweak rotulo={rotulo}>
      <button
        type="button"
        role="switch"
        aria-label={rotulo}
        aria-checked={valor}
        className={`tw-toggle ${valor ? 'on' : ''}`}
        onClick={() => aoMudar(!valor)}
      >
        <span className="tw-toggle-bolinha" />
      </button>
    </LinhaTweak>
  );
}

export function Deslizador({
  rotulo,
  valor,
  min,
  max,
  passo = 1,
  unidade = '',
  aoMudar,
}: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  passo?: number;
  unidade?: string;
  aoMudar: (valor: number) => void;
}) {
  return (
    <LinhaTweak rotulo={`${rotulo} (${valor}${unidade})`}>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(evento) => aoMudar(Number(evento.target.value))}
      />
    </LinhaTweak>
  );
}

export function RadioSegmentado<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: T;
  opcoes: ReadonlyArray<{ valor: T; rotulo: string }>;
  aoMudar: (valor: T) => void;
}) {
  return (
    <LinhaTweak rotulo={rotulo}>
      <span className="tw-seg" role="group">
        {opcoes.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            className={`tw-seg-btn ${valor === opcao.valor ? 'ativo' : ''}`}
            aria-pressed={valor === opcao.valor}
            onClick={() => aoMudar(opcao.valor)}
          >
            {opcao.rotulo}
          </button>
        ))}
      </span>
    </LinhaTweak>
  );
}

export function Selecao<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: T;
  opcoes: ReadonlyArray<{ valor: T; rotulo: string }>;
  aoMudar: (valor: T) => void;
}) {
  return (
    <LinhaTweak rotulo={rotulo}>
      <select value={valor} onChange={(evento) => aoMudar(evento.target.value as T)}>
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </LinhaTweak>
  );
}

export function ChipsCor({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: readonly string[];
  aoMudar: (valor: string) => void;
}) {
  return (
    <LinhaTweak rotulo={rotulo}>
      <span className="tw-chips" role="group">
        {opcoes.map((cor) => (
          <button
            key={cor}
            type="button"
            className={`tw-chip ${valor === cor ? 'ativo' : ''}`}
            aria-label={cor}
            aria-pressed={valor === cor}
            style={{ background: cor }}
            onClick={() => aoMudar(cor)}
          />
        ))}
      </span>
    </LinhaTweak>
  );
}

export function Botao({
  rotulo,
  aoClicar,
  secundario = false,
}: {
  rotulo: string;
  aoClicar: () => void;
  secundario?: boolean;
}) {
  return (
    <button type="button" className={`tw-botao ${secundario ? 'sec' : ''}`} onClick={aoClicar}>
      {rotulo}
    </button>
  );
}
