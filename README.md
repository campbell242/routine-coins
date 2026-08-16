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
- When a routine is waiting for a check, the routine screen also offers
  **"I'm the parent — review now"** — the same PIN pad, but it lands straight
  on that routine's review, and LOCK hands the phone back to Haley's routine
  screen. A shortcut, not a bypass: the PIN is still required.
- **The out-of-the-box PIN is `1234`** — change it in Parent → Settings.
- The parent session locks on LOCK, after 3 minutes of inactivity, or when
  leaving the parent area.

## Project map

```
design/                  # design handoff (reference only)
public/assets/           # pixel-art PNGs from the handoff (rendered pixelated)
public/fonts/            # self-hosted Jersey 25 + Nunito Sans
src/config/profile.ts    #   ONE child: name, coin goal, PIN, storage identity
src/config/plans.ts      #   ONE child: her routines
src/config/              # theme variant tokens, icon manifest, app-wide constants
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

## Authoring checklists

Checklist items live in `src/config/plans.ts` (`ItemConfig`): stable `id`,
`label`, optional `hint`, `kind` (`required` | `bonus`), `bonus` coins,
`attestation` (`child` | `parent-morning`), and an optional **`icon`**.

### Task icons

`icon` takes a bare name from the design's task icon pack
(`src/config/icons.ts`, PNGs in `public/assets/icons/`). Icons render at
28px to the left of the task text, pixelated, and are decorative only — the
task text always remains. An unknown or missing name simply renders no icon.

**When authoring a new checklist item — especially with an AI tool — pick the
best-fitting icon for every item from the list below. Do not leave items
icon-less when a reasonable fit exists, and never invent icon names that
aren't in this list.**

| Name | Meaning | | Name | Meaning |
|---|---|---|---|---|
| `toothbrush` | brush teeth | | `bottle` | water |
| `shower` | shower / bath | | `drumstick` | protein |
| `towel` | towel | | `carrot` | vegetables |
| `comb` | hairbrush | | `clock` | clock |
| `bed` | bed | | `hourglass` | timer |
| `shirt` | clothes | | `sun` | morning |
| `basket` | laundry | | `moon` | night |
| `lantern` | lights out | | `star` | streak |
| `door` | door / leave | | `bell` | reminder |
| `backpack` | backpack | | `heart` | kindness |
| `pencil` | homework | | `sword` | screen time |
| `paper` | worksheet | | `pickaxe` | big chore |
| `book` | reading | | `shield` | bonus quest |
| `broom` | tidy up | | `chest` | reward chest |
| `trash` | trash | | `key` | special unlock |
| `flower` | water plants | | `orb` | XP / bonus |
| `cookie` | snack | | `apple` | fruit |
| `bowl` | breakfast | | `cup` | milk / drink |
| `phone` | phone / hand it in | | `rat` | pet rat — Stormy |

Tip: avoid repeating the same icon twice within one routine's list when a
distinct alternative fits. Note: `rat` and `phone` are drawn on a finer 2px
block grid than the original 37 (deliberate — see `design/NEW_ICONS.md`);
render them as-is, never resample them to the older grid.
