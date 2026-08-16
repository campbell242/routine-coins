// All app sound, synthesized (no audio assets, works offline): one sine
// voice, 20ms exponential attack, exponential decay (spec: MOTION_AND_SOUND
// part 2). The AudioContext is primed on the first user gesture so the
// alarm can sound when the timer later expires.
//
// Gating (set by the store):
//  - cuesEnabled — the parent's global sound toggle. Off silences every cue.
//  - alarmEnabled — separate alarm-only toggle, so the timer can stay
//    audible with everything else off.
//  - quietHours — auto-quiet during the Nighttime Routine window and after
//    it (the phone is in her room): every cue plays at half gain. The alarm
//    is the one exception and keeps its full gain.

let ctx: AudioContext | undefined;

let cuesEnabled = true;
let alarmEnabled = true;
let quietHours = false;

export function setAudioPrefs(prefs: { cues: boolean; alarm: boolean }): void {
  cuesEnabled = prefs.cues;
  alarmEnabled = prefs.alarm;
}

export function setQuietHours(on: boolean): void {
  quietHours = on;
}

/** Gain scale for ordinary cues under the current quiet state. */
function cueGain(peak: number): number {
  return quietHours ? peak * 0.5 : peak;
}

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
    if (!alarmEnabled) return; // its own toggle; exempt from quiet hours
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
    if (!cuesEnabled) return;
    primeAudio();
    if (!ctx) return;
    note(ctx.currentTime + 0.02, checkBlipFreq(index), 0.12, cueGain(0.1));
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
    if (!cuesEnabled) return;
    primeAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.02;
    note(t0, 783.99, 0.18, cueGain(0.14)); // G5
    note(t0 + 0.16, 1046.5, 0.3, cueGain(0.14)); // C6
  } catch {
    /* ignore */
  }
}

/** The coin-award arpeggio, optionally starting at `offset` seconds. */
function awardArpeggio(t0: number, freqScale: number, gainScale: number): void {
  note(t0, 523.25 * freqScale, 0.25, cueGain(0.16 * gainScale)); // C5
  note(t0 + 0.12, 659.25 * freqScale, 0.25, cueGain(0.16 * gainScale)); // E5
  note(t0 + 0.24, 783.99 * freqScale, 0.45, cueGain(0.18 * gainScale)); // G5
  // Resolving on the octave, landing with the coins in the counter —
  // what makes the moment feel finished rather than cut off (spec §Sound).
  note(t0 + 0.36, 1046.5 * freqScale, 0.5, cueGain(0.18 * gainScale)); // C6
}

export function playAwardJingle(): void {
  try {
    if (!cuesEnabled) return;
    primeAudio();
    if (!ctx) return;
    awardArpeggio(ctx.currentTime + 0.02, 1, 1);
  } catch {
    /* ignore */
  }
}

/**
 * Redemption reached (1,720): the award arpeggio, then again an octave up at
 * +0.90s (freqs ×2, gain ×0.8). The only big sound in the app, heard a few
 * times a year — everything else stays small so this one lands.
 */
export function playRedemptionFanfare(): void {
  try {
    if (!cuesEnabled) return;
    primeAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.02;
    awardArpeggio(t0, 1, 1);
    awardArpeggio(t0 + 0.9, 2, 0.8);
  } catch {
    /* ignore */
  }
}

/** Ask a parent to check: handing over, not celebrating — the app's only descending cue. */
export function playAskParent(): void {
  try {
    if (!cuesEnabled) return;
    primeAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.02;
    note(t0, 392.0, 0.25, cueGain(0.12)); // G4
    note(t0 + 0.22, 293.66, 0.25, cueGain(0.12)); // D4
  } catch {
    /* ignore */
  }
}

/** Streak milestone (7, 14, 30, then every 30) — never the daily extension. */
export function playStreakMilestone(): void {
  try {
    if (!cuesEnabled) return;
    primeAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.02;
    note(t0, 659.25, 0.2, cueGain(0.14)); // E5
    note(t0 + 0.18, 987.77, 0.2, cueGain(0.14)); // B5
  } catch {
    /* ignore */
  }
}

/** Timer start: confirmation that it took, nothing more. (Resume is silent.) */
export function playTimerStart(): void {
  try {
    if (!cuesEnabled) return;
    primeAudio();
    if (!ctx) return;
    note(ctx.currentTime + 0.02, 587.33, 0.1, cueGain(0.12)); // D5
  } catch {
    /* ignore */
  }
}

export function playTimerPause(): void {
  try {
    if (!cuesEnabled) return;
    primeAudio();
    if (!ctx) return;
    note(ctx.currentTime + 0.02, 440.0, 0.12, cueGain(0.1)); // A4
  } catch {
    /* ignore */
  }
}

/** Avatar / theme change — the quietest cue; she'll tap these dozens of times. */
export function playPickBlip(): void {
  try {
    if (!cuesEnabled) return;
    primeAudio();
    if (!ctx) return;
    note(ctx.currentTime + 0.02, 880.0, 0.1, cueGain(0.08)); // A5
  } catch {
    /* ignore */
  }
}
