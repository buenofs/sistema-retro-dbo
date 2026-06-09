import { memo, useContext, type CSSProperties } from 'react';
import { ContextoTema } from '../ProvedorTema';
import { obterIcone, type NomeIcone } from './motor';

export interface PropsIcone {
  nome: NomeIcone;
  tamanho?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

export const Icone = memo(function Icone({
  nome,
  tamanho = 16,
  alt,
  className,
  style,
}: PropsIcone) {
  const ctx = useContext(ContextoTema);
  const pele = ctx?.tema.pele ?? '98';
  const renderizacao: CSSProperties['imageRendering'] = pele === 'aero' ? 'auto' : 'pixelated';
  return (
    <img
      src={obterIcone(nome, pele, tamanho)}
      width={tamanho}
      height={tamanho}
      alt={alt ?? ''}
      className={className}
      draggable={false}
      style={{ imageRendering: renderizacao, verticalAlign: 'middle', ...style }}
    />
  );
});
