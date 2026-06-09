import { memo, useContext, type CSSProperties } from 'react';
import { ContextoTema } from '../ProvedorTema';
import { obterIcone, type NomeIcone } from './motor';

export interface PropsIcone {
  nome: NomeIcone;
  tamanho?: number;
  /** Força o brilho; por padrão segue a pele (Aero = com brilho). */
  gloss?: boolean;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

export const Icone = memo(function Icone({
  nome,
  tamanho = 16,
  gloss,
  alt,
  className,
  style,
}: PropsIcone) {
  const ctx = useContext(ContextoTema);
  const comGloss = gloss ?? ctx?.tema.pele === 'aero';
  return (
    <img
      src={obterIcone(nome, tamanho, comGloss)}
      width={tamanho}
      height={tamanho}
      alt={alt ?? ''}
      className={className}
      draggable={false}
      style={{ imageRendering: 'pixelated', verticalAlign: 'middle', ...style }}
    />
  );
});
