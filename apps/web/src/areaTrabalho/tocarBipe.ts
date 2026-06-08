// Bipe curto estilo "system beep" via Web Audio. Silencioso onde não há áudio
// (ex.: jsdom não tem AudioContext) — falha graciosamente.
export function tocarBipe(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 480;
    ganho.gain.value = 0.05;
    osc.connect(ganho);
    ganho.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => void ctx.close();
  } catch {
    // sem áudio disponível — ignore
  }
}
