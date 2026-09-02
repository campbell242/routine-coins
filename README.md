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
- **A review can arrive unfinished.** Haley can ask for a check at any point,
  not only once every box is ticked — she may have hit something she can't do
  today. The review screen marks the unchecked items and shows an "Asked
  early" note: the suggested award doesn't dock for them, so adjust it, send
  it back, or approve as-is. (Her screen offers "Keep going instead" if she
  asked before she meant to.)
- **The out-of-the-box PIN is `1234`** — change it in Parent → Settings.
- **Giving bonus coins** (Settings → Balance → ＋/− adjust → ＋ Add) runs
  the same release as approving a routine: the coins are banked at your tap,
  then the phone shows "Bonus coins! — hand the phone back", and Haley's own
  tap plays the celebration. One tap, no confirmation. Subtracting is silent
  and keeps you in Settings.
- The parent session locks on LOCK, after 3 minutes of inactivity, or when
  leaving the parent area.

### Backing up her coins and history

There is no server: the phone holds the only copy. **Settings → BACKUP →
Save a copy** writes one JSON file — balance, every routine night (what the
streak is counted from), the settings on that screen and her chosen look —
and offers it to the Android share sheet, so it can land in Drive, mail or
chat rather than staying on the phone being backed up. It does **not**
contain the parent PIN.

**Choose a file** restores one: it validates the file first, names what's
inside it, and takes a confirmation, because a restore *replaces* everything
on the phone. Files that aren't backups, that come from another profile, or
that were written by a newer version are refused without changing anything.

Do it after a good week, and before changing phones.

### Parent-area materials (design v7)

**Green means Haley acted. Gold means coins are moving.** Neither is about
who is holding the phone:

- Green is **never** a parent-initiated action — nothing a parent taps in
  order to *do* something is green. Green only ever reports what Haley did.
- Gold is allowed anywhere coins actually move, parent zone included
  ("Approve & award", "Confirm & award night coins", "Redeem coins" — one
  family). The exception is a coin button that *can't* pay: a disabled
  "Redeem · N to go" takes the recessed iron below.
- Everything else in the parent zone is iron, stone or slate, and
  availability is carried by the bevel rather than by colour, so
  "available / not available" looks the same everywhere:

| Element | Treatment |
|---|---|
| ON / live / enabled | `.bevel-parent-on` — `#cfc8b2` fill, 3px `#4a4a44` border, `#2b2b24` text, **raised** bevel |
| OFF / disabled / unavailable | `.bevel-parent-off` — `#4a4a44` fill, 3px `#2b2b24` border, `#cfc8b2` text, **pressed** bevel (no highlight). Never dim the label: the bevel carries the state, and a disabled option's appended reason is load-bearing text |
| Editable value + its ✎ | `#3f5f78` slate (`<EditValue>`), never green — the same material as "Send back" |
| Cancel | never a filled button: `<ParentCancel>` — underlined `#6b675c` text, full width, ≥44px tall, placed under the confirm |
| Checkbox meaning | green bevelled slot = Haley did it · white ✔ on flat iron (`parentMark`) = a grown-up recorded it · plain inset square on flat iron = locked, not yet decided |
| Coin action | gold, with the coin icon on the primary one — it moves coins, so it is not iron |

A `PixelButton` with `variant="parentOn"` renders as `parentOff` when
`disabled`, so new parent controls get the rule for free. Parent copy is
plain and factual — explain the mechanic and stop; no exclamation marks, no
encouragement (that voice belongs to Haley's side of the app).

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
scripts/gen-icons.mjs    # PWA icons from design/appicon/master-32.png
scripts/contrast-audit.mjs  # WCAG checks for every theme variant
scripts/screenshots.mjs  # drives every screen/state for visual comparison
scripts/sync-design.mjs  # mirrors a fresh Claude Design export into design/
```

Adding a routine (e.g. a Saturday plan) is a configuration change in
`src/config/plans.ts` — the engine and UI pick it up automatically.

## Syncing a new design export

Claude Design exports the whole folder every time, so uploading it through
the GitHub web UI merges files instead of replacing them — anything deleted
in Design lingers here. Point the sync script at the zip instead and it
mirrors the export: copies what's new or changed, deletes what the export
dropped, and leaves the rest alone, so the commit shows only the real change.

```sh
node scripts/sync-design.mjs ~/Downloads/export.zip --dry-run   # preview
node scripts/sync-design.mjs ~/Downloads/export.zip             # apply
git add -A design && git commit -m "design: sync export"
```

It accepts an unzipped folder too, finds `design/` however the export wraps
it, ignores `__MACOSX`/`.DS_Store`, and writes nothing outside `design/`.
If an export would delete more than half of `design/` it stops — that
usually means a partial download; re-run with `--force` once you've checked.

## Authoring checklists

Checklist items live in `src/config/plans.ts` (`ItemConfig`): stable `id`,
`label`, optional `hint`, `kind` (`required` | `bonus`), `bonus` coins,
`attestation` (`child` | `parent-morning`), and an optional **`icon`**.
A `required` item may also carry `bonus` coins (the nightly sleep item):
it renders in the required section with its coin chip, and its value only
counts toward the suggested award when checked — an unmet requirement
docks itself without parent math.

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
