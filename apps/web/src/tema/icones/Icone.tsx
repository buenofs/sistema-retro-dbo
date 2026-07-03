import { memo, type CSSProperties } from 'react';
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
  return (
    <img
      src={obterIcone(nome)}
      width={tamanho}
      height={tamanho}
      alt={alt ?? ''}
      className={className}
      draggable={false}
      style={{ imageRendering: 'auto', verticalAlign: 'middle', ...style }}
    />
  );
});
