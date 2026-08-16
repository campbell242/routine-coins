// Screen wake lock while a timer runs in the foreground. Re-acquired on
// visibility change (the platform releases it when the page hides).

type WakeLockSentinel = {
  release(): Promise<void>;
  addEventListener(type: 'release', fn: () => void): void;
};

let sentinel: WakeLockSentinel | undefined;
let wanted = false;

async function acquire(): Promise<void> {
  try {
    const wl = (navigator as unknown as { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> } }).wakeLock;
    if (!wl || sentinel) return;
    const s = await wl.request('screen');
    // The timer may have been cancelled while the request was in flight —
    // don't hold a lock nobody wants.
    if (!wanted) {
      void s.release();
      return;
    }
    sentinel = s;
    // The platform may release the lock while the page stays visible
    // (battery saver, thermal policy). Clear the stale sentinel and retry
    // once shortly after, so a transient release doesn't block forever.
    s.addEventListener('release', () => {
      if (sentinel === s) {
        sentinel = undefined;
        if (wanted && document.visibilityState === 'visible') {
          window.setTimeout(() => {
            if (wanted && !sentinel && document.visibilityState === 'visible') void acquire();
          }, 3000);
        }
      }
    });
  } catch {
    sentinel = undefined; // not fatal — the timer itself is clock-derived
  }
}

async function release(): Promise<void> {
  try {
    await sentinel?.release();
  } catch {
    /* ignore */
  } finally {
    sentinel = undefined;
  }
}

export function setWakeLockWanted(on: boolean): void {
  wanted = on;
  if (on && document.visibilityState === 'visible') void acquire();
  if (!on) void release();
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wanted) {
      sentinel = undefined; // platform dropped it while hidden
      void acquire();
    }
  });
}
