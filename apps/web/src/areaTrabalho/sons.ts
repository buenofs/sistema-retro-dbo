export type TipoSom = 'abrir' | 'fechar' | 'erro' | 'iniciar';

interface PerfilSom {
  freq: number;
  ms: number;
  onda: OscillatorType;
}

const PERFIS: Record<TipoSom, PerfilSom> = {
  abrir: { freq: 660, ms: 90, onda: 'square' },
  fechar: { freq: 330, ms: 90, onda: 'square' },
  erro: { freq: 200, ms: 200, onda: 'sawtooth' },
  iniciar: { freq: 880, ms: 140, onda: 'triangle' },
};

let contexto: AudioContext | null = null;

// AudioContext compartilhado e lazy. null onde não há Web Audio (ex.: jsdom).
function obterContexto(): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    contexto ??= new Ctx();
    return contexto;
  } catch {
    return null;
  }
}

// Toca um som curto sintetizado. Silencioso (sem lançar) onde não há áudio.
export function tocarSom(tipo: TipoSom): void {
  const ctx = obterContexto();
  if (!ctx) return;
  try {
    const perfil = PERFIS[tipo];
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = perfil.onda;
    osc.frequency.value = perfil.freq;
    ganho.gain.value = 0.04;
    osc.connect(ganho);
    ganho.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + perfil.ms / 1000);
  } catch {
    // sem áudio disponível — ignore
  }
}
