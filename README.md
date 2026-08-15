# Haley's Routine & Minecoin Coins

An installable, offline-first PWA for one household: routines, a countdown
timer, and Minecoin-style rewards for Haley, on a dedicated Android phone in
kiosk mode (portrait). No backend, no accounts, no sync, no analytics.

The visual design lives in `design/` (source of truth for appearance);
behavioral decisions are documented in [`DECISIONS.md`](DECISIONS.md).

## Run it

```bash
npm install
npm run dev        # development server
npm test           # engine + persistence unit tests (vitest)
npm run build      # typecheck + production build + service-worker generation
npm run preview    # serve the production build locally
```

The production build in `dist/` is fully static — host it on any HTTPS static
server. On first load the service worker precaches everything; afterwards the
app runs with no network at all.

## Install on the phone

1. Open the hosted URL in Chrome on the Android phone.
2. Menu → **Add to Home screen** (or the install prompt) → install.
3. Launch from the home screen — it runs standalone, portrait, offline.
4. Optionally pin it with Android's app-pinning (kiosk) so it stays up.

Storage persistence is requested on startup (`navigator.storage.persist()`)
so coins, routines, streaks and settings survive app kills and reboots.

## Parents

- The **PARENTS** chip (bottom-right of Home) opens the PIN pad.
- **The out-of-the-box PIN is `1234`** — change it in Parent → Settings.
- The parent session locks on LOCK, after 3 minutes of inactivity, or when
  leaving the parent area.

## Project map

```
design/                  # design handoff (reference only)
public/assets/           # pixel-art PNGs from the handoff (rendered pixelated)
public/fonts/            # self-hosted Pixelify Sans + Nunito Sans
src/config/              # plan configurations, theme variant tokens, app constants
src/engine/              # pure logic: occurrence state machine, scheduler,
                         #   streaks, coin ledger, timer
src/persistence/         # IndexedDB (idb) storage
src/store/               # app store wiring engine ⇄ persistence ⇄ UI
src/ui/                  # design-system components + screens (child + parent)
scripts/gen-sw.mjs       # emits the cache-first service worker after build
scripts/gen-icons.mjs    # PWA icons from the pixel-art coin
scripts/contrast-audit.mjs  # WCAG checks for every theme variant
scripts/screenshots.mjs  # drives every screen/state for visual comparison
```

Adding a routine (e.g. a Saturday plan) is a configuration change in
`src/config/plans.ts` — the engine and UI pick it up automatically.
