import { MAPAS, PALETA, type NomeIcone } from './bitmaps';

export type { NomeIcone };

export const NOMES_ICONES = Object.keys(MAPAS) as NomeIcone[];

export function temIcone(nome: string): nome is NomeIcone {
  return Object.prototype.hasOwnProperty.call(MAPAS, nome);
}

export function listarIcones(): NomeIcone[] {
  return [...NOMES_ICONES];
}

// PNG 1×1 transparente — fallback quando não há canvas (jsdom).
const TRANSPARENTE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAYAAACgQDFGAAAAAElFTkSuQmCC';

const cache = new Map<string, string>();

function desenhar(mapa: readonly string[], tamanho: number, gloss: boolean): string {
  if (typeof document === 'undefined') return TRANSPARENTE;
  const linhas = mapa.length;
  const colunas = Math.max(...mapa.map((l) => l.length));

  const off = document.createElement('canvas');
  off.width = colunas;
  off.height = linhas;
  const o = off.getContext('2d');
  if (!o) return TRANSPARENTE; // jsdom sem canvas
  for (let y = 0; y < linhas; y++) {
    const linha = mapa[y]!;
    for (let x = 0; x < linha.length; x++) {
      const cor = PALETA[linha[x]!];
      if (cor) {
        o.fillStyle = cor;
        o.fillRect(x, y, 1, 1);
      }
    }
  }

  const cv = document.createElement('canvas');
  cv.width = tamanho;
  cv.height = tamanho;
  const ctx = cv.getContext('2d');
  if (!ctx) return TRANSPARENTE;
  ctx.imageSmoothingEnabled = false;
  const escala = Math.floor(tamanho / Math.max(linhas, colunas)) || 1;
  const dw = colunas * escala;
  const dh = linhas * escala;
  const dx = Math.floor((tamanho - dw) / 2);
  const dy = Math.floor((tamanho - dh) / 2);
  ctx.drawImage(off, 0, 0, colunas, linhas, dx, dy, dw, dh);

  if (gloss) {
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, 0, 0, tamanho);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tamanho, tamanho);
    ctx.globalCompositeOperation = 'source-over';
  }

  try {
    return cv.toDataURL('image/png');
  } catch {
    return TRANSPARENTE; // jsdom: toDataURL não implementado
  }
}

export function obterIcone(nome: NomeIcone, tamanho = 16, gloss = false): string {
  const chave = `${nome}@${tamanho}${gloss ? 'g' : ''}`;
  const emCache = cache.get(chave);
  if (emCache !== undefined) return emCache;
  const url = desenhar(MAPAS[nome], tamanho, gloss);
  cache.set(chave, url);
  return url;
}
