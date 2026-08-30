# App identity — icon and name

Deliverable for the routine app's install-time identity. Artboard: `App Icon & Name.dc.html`.

## 1 · Icon

**Master:** `appicon/master-32.png` — a 32×32 cell grid. Every shipped size is a
nearest-neighbour integer upscale of this one file. Never anti-alias, never scale by a
non-integer factor, never regenerate from the 16×16 in-app coin sprite (that sprite is
unchanged and stays where it is).

**Mark:** the gold coin at 22 cells across, centred, with a one-cell lifted halo.
Rim `#6e4a00`, bevel `#ffe98a` / `#b57e10`, face `#f8c53a`, embossed diamond `#e5ad1e`.
Same palette as the in-app coin, redrawn at twice its grid.

**Ground:** `#2b2b24` — the app's own ink, the colour of every border and every piece of
body text. Opaque to all four edges.

**Why the ground changed.** The shipping icons put the pale gold coin on parchment
`#f3eee1`. Both are light, so at 48px the mark is a smudge. Ink gives the coin the
strongest ground the palette already contains, and it hands the math app the entire light
half of the pair.

**The two-apps rule.** Routine is *gold on ink*; math is *emerald on a light ground*.
Different material **and** inverted ground, so a glance at the ground alone separates them.
The math app's pass owns its own artwork — the emerald tile on the artboard is a stand-in
placed there only to check the pair, and must not be shipped.

**Safe zone.** The `any` master puts the coin at radius 11 of 16 cells. The maskable master
shrinks it to radius 9 so it clears the 80% centred circle with a cell to spare; the halo
may be cropped, which is what a halo is for.

The icon never changes with the world theme.

### Files

| File | Composition |
|---|---|
| `icon-192.png` | master × 6 · purpose `any` |
| `icon-512.png` | master × 16 · purpose `any` |
| `icon-maskable-192.png` | maskable master × 6 · **new** |
| `icon-maskable-512.png` | maskable master × 16 · replaces `maskable-512.png` (**note the rename**) |
| `apple-touch-icon.png` | 180 is not a multiple of 32 — master × 5 = 160px, centred on a 180px ink ground with a 10px border. Composed, never resampled. **New** |
| `favicon-32.png` | master × 1. **New** |
| `master-32.png` | source of truth, for regeneration |

## 2 · Name

Five candidates on the artboard, rendered at home-screen scale. **Recommended: Gold Chest.**
A chest is already the app's word for where earned things go, and the pair gets a shared
surname — *Gold Chest* and *Emerald Chest* read as one family on sight.

The household picks. Whichever wins, the three strings are the same value:

```
name        Gold Chest
short_name  Gold Chest      (10 of 12)
<title>     Gold Chest
```

A longer `name` with a tagline is a web habit. This name appears under an icon and in a task
switcher; both want the short one.

## 3 · Manifest rulings

**`background_color` — keep `#f3eee1`.** The splash ground's only job is to not flash. The
app boots to Home, whose body is parchment under every world theme. The placeholder is
already correct. Deliberately *not* the icon's ink ground: the splash shows the icon tile on
parchment, exactly as the home screen does.

**`theme_color` — keep `#f3eee1`. The manifest and the index meta agree; nothing to resolve.**
It must stay neutral because the header strip is user-switchable across five world themes and
a manifest colour is fixed at install — any themed value is wrong for four of the five.
Parchment is the one surface every variant shares.

If the two ever diverge, **the index meta wins** at runtime: Chrome applies the live meta to
the status bar, while the manifest value is only the install-time default. Keep them in sync
by hand; the manifest is not the single source.

## 4 · Audit findings for the build

**Kept, because it already earns its place:** the coin as the mark; the nearest-neighbour
integer upscale in `gen-icons.mjs`; the opaque plate; `background_color`; `theme_color`;
`display: standalone`; `orientation: portrait`; relative `start_url` and `scope`.

**a. The manifest carries the child's name.** `APP_NAME`, `APP_SHORT_NAME` and
`APP_DESCRIPTION` all derive from `CHILD_NAME` in `profile.ts`, so the installed identity is
"Haley's Routine & Coins" / "Haley". The app's public identity should stop deriving from the
child and become app-wide constants. **`PROFILE_ID` must not be touched** — it names the
IndexedDB database, and changing it looks like a factory reset.

**b. `APP_DESCRIPTION` says "Minecoin".** In-app copy may reference real Minecoins; install
metadata is not in-app copy. Suggested replacement: *"Do your day, earn gold."*

**c. Three icon files do not exist.** No 192 maskable; no true 180 apple-touch-icon (the index
points it at the 192); no favicon (same). All three are in this export.
