import type { Retangulo } from './tipos';

// Compartilhada entre o clamp e o CSS.
export const ALTURA_BARRA = 30;

export function limitarRetangulo(
  r: Retangulo,
  viewport: { largura: number; altura: number },
): Retangulo {
  const maxX = Math.max(0, viewport.largura - r.largura);
  const maxY = Math.max(0, viewport.altura - ALTURA_BARRA - r.altura);
  return {
    ...r,
    x: Math.min(Math.max(0, r.x), maxX),
    y: Math.min(Math.max(0, r.y), maxY),
  };
}
