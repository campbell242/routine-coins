# New icons in this version — `rat.png`, `phone.png`

Two additions to the task icon pack. Everything else in `assets/icons/` is unchanged.

| File | Size | Group | Meaning |
|---|---|---|---|
| `icons/rat.png` | 40×22 | School & chores | Pet rat — Stormy |
| `icons/phone.png` | 24×40 | Bedroom & clothes | Phone / hand it in |

Both are drawn on a **2px block grid** rather than the 4px grid used by the original 37. They render at the same 24–34px as every other icon and read correctly there; the finer grid is what makes a rat look like a rat and a phone look like a phone at that size. Do not resample or redraw them.

**`rat.png`** — side profile, hunched body, small ear, dark eye, pink snout, long naked pink tail lifted behind. Stone gray `#b0b0b0`, pink `#e58bb4`, eye `#2b2b24`.

**`phone.png`** — thin-bezel handset with a speaker slit and home bar in `#8a8578`, frame `#2b2b24`, slate screen `#6d89a3`, and three green `#7fe237` ticks beside three dark list rows on the screen.

Render both with `image-rendering: pixelated`, same as the rest of the pack. Icons are decorative labels, never buttons.

## Sizing rule for non-square icons

The original 37 icons are all square. `rat.png` (40×22) and `phone.png` (24×40) are not, and icons added from here on may be any aspect ratio.

**The row reserves a square footprint (28px) and the art sits inside it via `object-fit: contain`.** Proportions are preserved; the icon is never stretched, cropped, or resampled to fill the square. This is what the build already does — it is now the rule.
