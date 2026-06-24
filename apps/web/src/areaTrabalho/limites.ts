import type { Retangulo } from './tipos';

// Altura da barra de tarefas (px). Compartilhada entre o clamp e o CSS.
export const ALTURA_BARRA = 30;

// Mantém o retângulo dentro do viewport, deixando a barra de tarefas livre embaixo.
export function limitarRetangulo(
  retangulo: Retangulo,
  viewport: { largura: number; altura: number },
): Retangulo {
  const maxX = Math.max(0, viewport.largura - retangulo.largura);
  const maxY = Math.max(0, viewport.altura - ALTURA_BARRA - retangulo.altura);
  return {
    ...retangulo,
    x: Math.min(Math.max(0, retangulo.x), maxX),
    y: Math.min(Math.max(0, retangulo.y), maxY),
  };
}
