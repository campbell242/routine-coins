// Timer alarm: a gentle synthesized chime (no audio assets needed, works
// offline). The AudioContext is primed on the first user gesture so the
// alarm can sound when the timer later expires.

let ctx: AudioContext | undefined;

export function primeAudio(): void {
  try {
    if (!ctx) {
      ctx = new AudioContext();
    }
    // Not just 'suspended': iOS WebKit parks a backgrounded context in a
    // non-standard 'interrupted' state that also needs an explicit resume.
    if (ctx.state !== 'running') {
      void ctx.resume();
    }
  } catch {
    /* audio unavailable — visual alert still shows */
  }
}

// Re-prime as early as possible: any first tap after a relaunch, and the
// moment the app returns to the foreground with an interrupted context.
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => primeAudio(), { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx) primeAudio();
  });
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

/**
 * Check-off run (spec cue table): one .12s blip per check, gain .10, pitch
 * climbing a pentatonic run as she goes down the list, then holding at A6.
 * The run's position is DERIVED — the caller passes the occurrence's checked
 * count, so it resets with the routine and walks back down on unchecks.
 */
export const CHECK_RUN = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0] as const; // C6 D6 E6 G6 A6

export function checkBlipFreq(index: number): number {
  return CHECK_RUN[Math.min(Math.max(index, 0), CHECK_RUN.length - 1)];
}

export function playCheckBlip(index: number): void {
  try {
    primeAudio();
    if (!ctx) return;
    note(ctx.currentTime + 0.02, checkBlipFreq(index), 0.12, 0.1);
  } catch {
    /* ignore */
  }
}

/**
 * The last required item done — replaces the run's next step. G5 → C6, the
 * only cue that says "that's the set".
 */
export function playLastRequired(): void {
  try {
    primeAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.02;
    note(t0, 783.99, 0.18, 0.14); // G5
    note(t0 + 0.16, 1046.5, 0.3, 0.14); // C6
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
    // Resolving on the octave, landing with the coins in the counter —
    // what makes the moment feel finished rather than cut off (spec §Sound).
    note(t0 + 0.36, 1046.5, 0.5, 0.18); // C6
  } catch {
    /* ignore */
  }
}
