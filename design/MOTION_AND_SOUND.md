# Motion & Sound Spec — v5

Design source: `Haley Routine App.dc.html`, sections **3 (Motion)** and **4 (Sound)**.
Every demo in section 3 loops on a timer so it can be watched; **in the app each fires once, on the action.**

Existing keyframe names in `src/styles/global.css` are called out where a moment already has one. Nothing below asks for a new animation library, a new dependency, or a layout change.

---

## Part 1 — Motion

### Global rules (apply to everything in this file)

- **Animate `transform` and `opacity` only.** A colour change is always an overlay element fading in, never an animated `background-color`. (The two existing `background-color` keyframes — `gold-flash`, `strip-blink` — stay as they are; don't add more.)
- **`steps()` over easing for anything pixel-art.** 2–4 steps. Smooth easing belongs to fades and slides, not to blocks.
- **Nothing runs longer than 500ms** except the reward chain, which is ~2s and is the only place worth spending time.
- **Only two things loop forever**: the waiting dots (exists) and the uncollected-coin idle (new). Both mean "still true", not "look at me".
- **Nothing animates on a failure-adjacent state.** Sent back, closed for today, wrong PIN, a broken streak: stillness. (The existing `pin-shake` stays — it's feedback that the tap registered, not a scolding.)
- **Nothing blocks a tap.** No animation may gate input or delay a screen change.
- **`prefers-reduced-motion: reduce`** — keep the opacity fades, drop every transform and the coin arc. The award still reads: number, counter, XP bar.

---

### 1. Checking an item off — "block place" · NEW

Total 380ms. Fires on check, not on uncheck.

| At | What | How |
|---|---|---|
| 0ms | The checkbox slot presses | `transform: scale(0.86)` in **`steps(3)`**, then back to 1. Chunky, not smooth — the press is the part she feels. |
| 60ms | Green fill rises over the gray | An overlay div (the checked bevel: `#57a636`, borders `#2c5c1a / #a8e07f`) fades `opacity` 0 → 1 in **`steps(2)`** over 90ms. |
| 90ms | The ✔ pops | `scale` .2 → 1.18 → 1 over 180ms — reuse **`.pop-in`**. |
| 140ms | The row settles | `opacity` → 0.62 over 240ms. |
| deferred | Next progress pip flips green | `transform: scaleX(0 → 1)`, `transform-origin: left`, 160ms, 80ms stagger. The pip row lives on the **Home** routine card, not the routine screen — so the flip plays once, per pip, the first time the card is next seen. Do not add a pip row to the routine screen. |

**Unchecking** runs the same beats reversed at 60% duration, with **no ✔ pop**. A mis-tap should feel undoable, not punished.

**No coins move here.** Coins aren't hers until a parent approves; showing them at check time spends the award moment early.

---

### 2. The reward release — screen 1m, retimed · CHANGED

`t = 0` is **screen enter** (Haley tapping "Tap to see your coins!"), **not** the parent's approve tap.

| At | What | How |
|---|---|---|
| 0ms | Big coin pops in | **`.pop-in`**, 450ms. Unchanged. |
| 120ms | "+55" rolls from 0 | 500ms, stepped increments. The amount should register as a *number*, not a picture. |
| 350ms | 8 coins spawn at the big coin | Staggered 60ms (currently 4 coins at 120ms). |
| 350–1300ms | Each coin arcs **down into the balance counter** and shrinks to 0.38 | **`.coin-fly`** / `coin-arc`, retargeted. |
| on each landing | The counter's coin pip reacts | `scale` 1.18 → 1, 120ms. |
| 1400ms | Last coin lands — *only then* the XP segment glows | **`.xp-new-segment`** `#d9ff8a` overlay, settles over 1.6s. |
| 1600ms | "Great job, Haley!" and the streak line | Fade up 8px, 260ms. |

**The two real changes to what's built:**
1. The four coins currently arc *away* and vanish. Point them at the balance counter so they read as *becoming* the number.
2. Hold the XP glow until the last coin lands, instead of firing everything at t=0.

**Upstream stays still.** Approving in 1k animates nothing. The handoff screen 1o gets the coin pop and nothing else. Every moving thing in the chain is downstream of Haley's tap. "Back to Home" stays tappable throughout.

---

### 3. Streak · NEW

**Every extension (daily):** the ★ scales 1 → 1.3 → 1 in `steps(2)`, 300ms, and the count rolls to its new number. That is the whole thing, every day. A streak is a fact, not a payday.

**Milestones (7, 14, 30, then every 30):** three 6px pixel stars pop above the chip, rise 18px and fade over 700ms, staggered 80ms. The chip border flashes gold as a *fading overlay*. Toast as today.

**A broken streak animates nothing and says nothing.** The chip is simply absent. There is no state to design here.

---

### 4. Small moments

| Moment | Motion |
|---|---|
| **Uncollected reward button** (Home, 1o) | Idle: one `steps(8)` rotation of the coin icon every 6 seconds. It waits; it doesn't beg. |
| **"Ask a parent to check!" → Waiting** | Chip cross-fades READY → WAITING, 200ms; banner slides down 8px and fades in, 240ms; the dots start their existing `.wait-dot` pulse (0s / .45s / .9s). Then the screen holds still. |
| **Sent back** | Banner slides down 8px and fades in, 240ms. Nothing else, no sound. The quiet is the point. |
| **Handoff screen 1o** | The coin pops in, 450ms (`.pop-in`). Nothing else moves, nothing sounds. |
| **Timer start** | The bar snaps to full over 200ms, then begins draining, so starting reads as "loaded". *(The preset cross-fade originally specced here is dropped — starting replaces the screen, and screen changes are instant.)* |
| **Timer pause** | Bar and digits breathe between `opacity` 1 and .55 on a 2s loop. Resume just stops the breathing. |
| **Timer last 10 seconds** | Digits pulse `scale(1.04)` once a second. No colour change, no ticking. It's a bedroom. |
| **Avatar / theme change** | The newly selected slot pops in (450ms, `.pop-in`); the header trim strip cross-fades, 200ms. |
| **Screen changes** | **Instant.** No slides, no fades between screens — a 10-year-old taps fast and transitions become a tax. |

---

## Part 2 — Sound

All synthesis, extending `src/lib/audio.ts`. **No audio files.** Every cue uses the existing sine voice: `type: 'sine'`, 20ms exponential attack, exponential decay over `dur`.

### Rules

- **Sine only, peak gain ≤ .22, 20ms attack.** No samples, no square waves, nothing percussive.
- **Haley's actions make sound. Parent actions are silent** — PIN entry, approve, send back, close for today, settings. She should never hear the app being administered.
- **Nothing negative ever sounds.** Silence is the design, not an omission.
- **Nothing runs longer than 1.5s** except the alarm.
- **Auto-quiet during the Nighttime Routine window and after it** — this means **reduced gain, not mute**. The window opens at 19:00 and every core cue lives inside it, so muting would silence the app's signature sounds every night. All cues at **×0.5** from window start; **×0.25** after the phone is handed over for the night. The alarm is exempt at full gain.
- **One global toggle** in parent settings (1l), plus a **separate alarm-only toggle** so the timer can stay audible with everything else off.

### Cue table

`note(offsetFromCueStart, freqHz, durSeconds, peakGain)`

| Cue | Notes | Why |
|---|---|---|
| **Check an item off** | One blip, `dur .12`, gain `.10`. Pitch **climbs a pentatonic run as she goes down the list**: C6 `1046.50` · D6 `1174.66` · E6 `1318.51` · G6 `1567.98` · A6 `1760.00`, then **holds at A6** for any further items. Index resets when the routine resets. | The checklist plays a scale, so finishing sounds finished. |
| **Last required item done** | `(0, 783.99, .18, .14)` G5 → `(.16, 1046.50, .30, .14)` C6 | Replaces the run's next step. The only cue that says "that's the set". |
| **Ask a parent to check** | `(0, 392.00, .25, .12)` G4 → `(.22, 293.66, .25, .12)` D4 | Handing over, not celebrating — the only descending cue in the app. |
| **Coin award (1m)** | `(0, 523.25, .25, .16)` C5 · `(.12, 659.25, .25, .16)` E5 · `(.24, 783.99, .45, .18)` G5 · **`(.36, 1046.50, .50, .18)` C6** | Today's triad **plus a fourth note**, landing with the coins in the counter. Resolving on the octave is what makes it feel finished rather than cut off. |
| **Streak milestone** | `(0, 659.25, .20, .14)` E5 → `(.18, 987.77, .20, .14)` B5 | Milestones only (7, 14, 30…), **never** the daily extension. |
| **Timer start** | `(0, 587.33, .10, .12)` D5 | Confirmation that it took, nothing more. |
| **Timer pause** | `(0, 440.00, .12, .10)` A4. **Resume is silent** | It already started once. |
| **Timer alarm** | **Unchanged.** E5 + G5 rising third, ×3, 1.1s apart, gain `.22` | Still the loudest thing in the app. |
| **Avatar / theme change** | `(0, 880.00, .10, .08)` A5 | The quietest cue — she'll tap these dozens of times in a row. |
| **Redemption reached (1,720)** | The award arpeggio, then again **an octave up** at `+0.90s` (each freq ×2, gain ×0.8) | The only big sound in the app, heard a few times a year. Everything else stays small so this one lands. |

### Stays silent

Wrong PIN · sent back · closed for today · a missed routine · unchecking an item · the handoff screen 1o · every screen change · the parent area, end to end.

---

## Addendum — required rows that carry a coin value

A required row may carry a coin value; the gold coin chip is unchanged from the bonus rows. The chip means "this pays"; the row border means "required or bonus". Two independent facts on two independent channels.

**If the row is parent-verified rather than self-checked** (e.g. "In bed, lights out, stay in bed"), two things change on the checklist:

1. **Locked slot** — flat iron `#6f6f6f`, 3px `#4a4a44` border, a 14px `#4a4a44` inset square, **no bevel highlight**, not tappable. The ordinary stone slot promises a tap that isn't available.
2. **An iron pill instead of a second hint line** — `MORNING CHECK`, Jersey 25 13px, white on `#6f6f6f` with a 2px `#4a4a44` border, sitting under the hint. Iron is the parent material, so it reads as "someone else decides this" without any negative language. The sentence "A grown-up checks this one in the morning" moves out of the hint voice.

**Parent review (1k) is unchanged from the build**: the row sits in the required list with a live toggle and its value; unchecked auto-docks, one tap restores it. The parent is the one person who can set it, so that slot stays interactive.

**Award editor copy**: "AWARD · base X + **earned** Y". Design file updated to match.
