# Handoff: Haley's Routine & Minecoin App — Visual Design

## Overview
Visual design system and all key screens for a personal routine/reward app for Haley (age 10), running full-screen portrait on a dedicated Android phone. Minecraft-themed interface language: pixel bevel buttons, inventory slots, XP-bar progress, gold coins, block-texture trim. Application behavior/functionality is specified separately by the owner — this package covers **look and screen-level UX only**.

## About the Design Files
The files in this bundle are **design references created in HTML** — static mockups showing intended look, layout, and states. They are not production code to copy directly. The task is to **recreate these designs in the target app's environment** using its established patterns (or choose an appropriate framework if none exists yet). The PNG assets in `assets/` ARE production-ready and should be copied into the app as-is.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final intent. Recreate pixel-perfectly. All styling in the design file is inline on each element, so any screen's exact values can be read directly from its markup.

## How to Read the Design File
`Haley Routine App.dc.html` renders all screens on one canvas. Each screen is a `div.dv-opt` with an id and a `data-screen-label`:

| id | data-screen-label | Screen |
|----|-------------------|--------|
| 1a | Design system | Palette, type, buttons, slots, chips, toast, textures, avatars, theme variants |
| 1b | Home | Home with morning routine due (in progress) + running-timer pill |
| 1c | Home empty | Home, nothing due |
| 1d | Routine in progress | Checklist, 2/4 required done, bonus items, disabled ask-parent button |
| 1e | Routine ready | All required done, gold "Ask a parent to check!" CTA |
| 1f | Status treatments | The 5 checklist banners: in progress / ready / waiting / sent back / approved |
| 1g | Timer idle | Presets 5/10/15/30 + custom minutes stepper + Start |
| 1h | Timer running | Dark screen, giant countdown, Pause/Cancel |
| 1i | Timer expired | "TIME'S UP!" gold alert, Done / +5 more min |
| 1j | Parent PIN | Iron-door header, PIN dots, 3×4 keypad |
| 1k | Parent approval | Item summary, editable award (base+bonus), Approve / Send back / Close for today |
| 1l | Parent settings | Next-morning verification checkboxes, routine times, rewards, balance adjust, redemption, LOCK |
| 1m | Coin award | Toast + coin burst + XP bar advancing |
| 1n | Customization | Avatar slot grid + theme variant list |
| 2a | Icon brainstorm | Task icon pack — the final 37 checklist icons, grouped by category |

Small gray caption lines inside some screens (e.g. "New segment flashes bright…", "Wrong PIN just shakes the dots") are **designer annotations describing intended behavior** — implement them, don't render them.

## Navigation Model
- Three persistent bottom tabs on child screens: **HOME / TIMER / ME**. Active tab is gold (#f8c53a), inactive stone (#9a9a9a). Tab buttons ≥56px tall.
- Clock appears in every screen's header (huge on Home, top-right elsewhere).
- A **running timer** pins a dark pill (#20241a, white pixel text, "TIMER · 08:42 · tap to open") above content on every child screen (see top of 1b).
- **Parent entrance**: small iron-textured "PARENTS" chip at bottom-right of Home, above the tab bar — deliberately subtle.
- Routine screens are pushed from Home ("Keep going ›" / routine card), with a `‹` back affordance.

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| Parchment bg | #f3eee1 | Child-screen background |
| Card | #fffdf6 | Cards, checklist rows |
| Ink | #2b2b24 | Text, 3px borders |
| Button border | #20241a | All bevel-button borders |
| Grass green | #57a636 | Primary buttons, checked boxes, positive |
| Green dark text | #3d7a22 | Green text on light bg |
| XP green | #7fe237 | XP bar fill (gradient #b4f06a → #7fe237 45% → #59c01c) |
| Coin gold | #f8c53a | Reward buttons, active tab, ready states |
| Gold border/dark | #c8961e | Bonus item borders, ready chip |
| Gold text | #8a6200 / #b07d00 | Gold text on light bg / toast titles |
| Gold button text | #3d2c00 | Text on gold buttons |
| Stone | #9a9a9a | Secondary buttons |
| Disabled | #7d7d7d fill, #d5d2c9 text, #4a4a44 border | Disabled buttons |
| Calm slate | #6d89a3 (bg tint #e8eef4, text #42607c) | "Sent back" — the ONLY send-back color; never red |
| Muted text | #6b675c / #8a8578 | Secondary/tertiary text |
| Dark screen | #20241a | Timer running/expired background, timer pill |
| Parent bg | #e8e6e0 | All parent-area screens (cooler, iron-trimmed) |
| Divider | #cfc8b2 / #efe9d8 | Hairlines, section rules |

### Typography
- **Jersey 25** (Google Fonts, single weight): headings, numbers, clock, countdown, buttons, coin amounts, chips. Never below 13px. (Replaced Pixelify Sans in v4 — its digits were ambiguous, e.g. 5 read as S.)
- **Nunito Sans** (Google Fonts, 400–800): instructions and all sentence-length text, 12–15px, usually weight 600.
- Clock on Home: 74px. Countdown running: 110px. Award "+55": 64px. Buttons: 17–24px.

### Bevel / pixel language (no border-radius anywhere)
- **Button bevel**: 3px solid #20241a border + `inset 0 4px 0 rgba(255,255,255,.35), inset 0 -6px 0 rgba(0,0,0,.28)` box-shadow; white text with `text-shadow: 0 2px 0 rgba(0,0,0,.3)`. Gold buttons use lighter insets (.5 / .18) and dark text.
- **Inventory slot** (unchecked box, avatar frames): fill #8b8b8b, 3px border, border-color `#3f3f3f #fff #fff #3f3f3f` (dark top/left, light bottom/right).
- **Checked box**: fill #57a636, border-color `#2c5c1a #a8e07f #a8e07f #2c5c1a`, white ✔ in Jersey 25.
- **Selected slot** (avatar/theme pickers): 4px solid #f8c53a border + 3px #20241a outline.
- **XP bar**: 3px #20241a border, track #2f2f28, 2px padding; fill = green gradient with segment lines `repeating-linear-gradient(90deg, transparent 0 16px, rgba(0,0,0,.25) 16px 19px)`. Width = balance/1720, clamped at 100% — bar stays full past 1,720 while the number climbs.
- **Status chips**: Jersey 25 13–14px, 2px border, tinted bg (see 1a).
- **Texture trim**: tile PNGs at background-size 16px (12px for small chips), used ONLY as thin strips — grass+dirt top of child screens, grass strip on routine card, iron strips/chips on parent screens. Never behind text.

### Spacing
Screen padding 16–18px; card padding 12–16px; gaps 8–14px; checklist row gap 10px. All layout is flex/grid with gap.

## Key Interactions & Behavior (visual spec)
- **Tap targets**: minimum 44px; checklist checkboxes 46px; PIN keys ~70px tall; presets ~90px tall.
- **Advancement toast**: bevel card (#efe9d8, gold title, sans subtitle) slides in from top, self-dismisses ~3s, never blocks taps. Used for routine completion, coin awards, streak milestones.
- **Coin award moment (1m)**: toast + coins arcing into the counter + XP bar's new segment rendered bright (#d9ff8a) for ~1.5s before settling into the normal fill. Short and non-blocking.
- **Checked checklist rows** drop to opacity .62.
- **Disabled ask-parent button** shows helper text below: "Finish 2 more to unlock".
- **Timer**: running and expired states use the dark screen; expired flashes gold + gentle chime. "+5 more min" quick action. Timer pill on all other screens while running.
- **Wrong PIN**: shake the dots only; no error text, no lockout messaging visible to Haley.
- **Streak**: positive-only (★ chip). A broken streak simply shows no chip — never messaging about losing it.
- **Tone rules (hard)**: no red anywhere; no creepers/TNT/damage-hearts in failure-adjacent states; "sent back" and "closed for today" are calm slate/gray with encouraging copy.

## Theme Variants
Overworld (default, shown throughout), Nether, End, Ocean, Cherry Grove — accent swatches in 1a and 1n. A variant changes ONLY: accent colors, header strip treatment, small decorative touches. It never changes layout, text/background contrast, coin gold, or XP-bar green. No free-form color picker, no unlockables.

## Task Icon Pack (assets/icons/)
37 hand-drawn pixel PNGs for attaching to checklist/task items (screen 2a shows all with labels). Render with `image-rendering: pixelated`, sized 24–34px inside a checklist row (e.g. left of the task name) or 44px in a slot. Filename → intended meaning:
- Hygiene & bathroom: `toothbrush`, `shower` (shower/bath), `towel`, `comb` (hairbrush)
- Bedroom & clothes: `bed`, `shirt` (clothes), `basket` (laundry), `lantern` (lights out), `door` (door/leave)
- School & chores: `backpack`, `pencil` (homework), `paper` (worksheet), `book` (reading), `broom` (tidy up), `trash`, `flower` (water plants), `bone` (feed pet)
- Food & drink: `cookie` (snack), `apple` (golden apple/fruit), `bowl` (breakfast), `cup` (milk/drink), `bottle` (water), `drumstick` (protein), `carrot` (vegetables)
- Time & day: `clock`, `hourglass` (timer), `sun` (morning), `moon` (night), `star` (streak), `bell` (reminder)
- Fun & rewards: `heart` (kindness), `sword` (screen time), `pickaxe` (big chore), `shield` (bonus quest), `chest` (reward chest), `key` (special unlock), `orb` (XP/bonus)

Usage rules: icons are decorative labels, not buttons; never the only signal of meaning (task text is always present); no red icons exist by design (protein is a cooked drumstick, fruit is a golden apple, bed blanket is teal).

## Assets (production-ready, copy as-is)
All in `assets/`, hand-drawn pixel art, render with `image-rendering: pixelated`:
- `av-steve/alex/creeper/axolotl/cat/panda/fox/bee.png` — 32×32 avatar faces
- `coin.png` — 16×16 gold Minecoin-style coin (the coin motif everywhere)
- `tx-grass/dirt/stone/planks/iron/nether.png` — 8×8 tileable texture strips
- `icons/*.png` — 37 task icons (see Task Icon Pack above)
- Fonts via Google Fonts: Jersey 25, Nunito Sans.

## Files
- `Haley Routine App.dc.html` — all screens (open in a browser; every element's styles are inline)
- `assets/` — PNGs above

## Sample Data Note
All names, items, times, balances (1,240 / 1,720, +55 award, 6-day streak) are sample data. Redemption threshold 1,720 and preset timer values 5/10/15/30 are real spec values.
