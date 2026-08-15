// Timer alarm: a gentle synthesized chime (no audio assets needed, works
// offline). The AudioContext is primed on the first user gesture so the
// alarm can sound when the timer later expires.

let ctx: AudioContext | undefined;

export function primeAudio(): void {
  try {
    if (!ctx) {
      ctx = new AudioContext();
    }
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  } catch {
    /* audio unavailable — visual alert still shows */
  }
}

function note(at: number, freq: number, dur: number, gainPeak: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(gainPeak, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/** A soft, happy two-note chime, repeated three times. Never harsh. */
export function playAlarm(): void {
  try {
    primeAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.05;
    for (let rep = 0; rep < 3; rep++) {
      const t = t0 + rep * 1.1;
      note(t, 659.25, 0.5, 0.22); // E5
      note(t + 0.18, 783.99, 0.7, 0.22); // G5
    }
  } catch {
    /* ignore */
  }
}

/** A tiny positive blip for the coin-award moment. */
export function playAwardJingle(): void {
  try {
    primeAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.02;
    note(t0, 523.25, 0.25, 0.16); // C5
    note(t0 + 0.12, 659.25, 0.25, 0.16); // E5
    note(t0 + 0.24, 783.99, 0.45, 0.18); // G5
  } catch {
    /* ignore */
  }
}
