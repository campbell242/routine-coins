# Prompt for Claude Code

Paste everything below the line into Claude Code.

---

Look at the design handoff folder in this repo (`design_handoff_haley_routine_app/`). It has been updated. Read `README.md`, `NEW_ICONS.md`, and `MOTION_AND_SOUND.md` before you start. `Haley Routine App.dc.html` is the visual source — open it if you need to see any screen or spec rendered.

There are **two separate tasks**. Do Task 1 first, on its own, and let me check it before you start Task 2. They should not share a commit.

---

## Task 1 — two icons on the Nighttime checklist

Small and self-contained. The Nighttime checklist is finished and working; these are the only two changes to it.

Two new PNGs are in the handoff folder at `assets/icons/`. Copy both into the app's icon assets alongside the existing 37 and register them in whatever list or map the icon picker reads from:

- **`rat.png`** — School & chores group, meaning "Pet rat — Stormy"
- **`phone.png`** — Bedroom & clothes group, meaning "Phone / hand it in"

Then set the icon on two existing Nighttime items:

1. **"Feed Stormy"** (item 7) → `rat`
2. **"Phone to Mom & Dad's room"** (item 5) → `phone`

Nothing else about those items changes — not the text, not the order, not the coin values.

One thing to be aware of rather than surprised by: both new icons are drawn on a 2px block grid, where the original 37 use a 4px grid. That is deliberate — it is what lets a rat read as a rat at 24–34px. Render them through the same `image-rendering: pixelated` path as every other icon and do not resample or normalize them to the older grid.

Stop here and tell me when this is done.

---

## Task 2 — the animation and sound scheme

Read `MOTION_AND_SOUND.md`. It is the full spec: a set of animations and a set of sound cues, with exact timings, frequencies, durations and gains. Sections **3** and **4** of `Haley Routine App.dc.html` are the visual source — section 3's demos loop so they can be watched; in the app each fires once, on the action. Section 4's cue rows are playable at real gain.

**Work in three phases. Stop after each so I can hear and see it on the phone before you continue.**

**Phase 1 — the two changes to what already exists.** In the 1m award chain: the four `.coin-fly` coins currently arc away and vanish; make eight coins and point their `--dx/--dy` at the balance counter so they read as becoming the number, and delay the `.xp-new-segment` glow until the last coin lands (~1400ms) instead of firing at t=0. Then add C6 (`1046.50`) at `+0.36s` to the coin-award arpeggio in `audio.ts`. That is the whole reward moment, and it is the piece I most want to feel right before anything else is built.

**Phase 2 — check-off.** The 380ms block-place sequence, plus the pentatonic blip that climbs as she goes down the list and resolves G5 → C6 on the last required item. This is the thing she will experience most, so the timings in the table are worth hitting exactly rather than approximately.

**Phase 3 — everything else.** Streak, the small-moments table, the remaining cues, the two settings toggles, and `prefers-reduced-motion`.

**Constraints that are not negotiable, and that the spec is built to hold:**

- Animate `transform` and `opacity` only. A colour change is an overlay fading in, never an animated colour. Do not add `background-color` keyframes beyond the two that exist.
- No red anywhere; no creeper, TNT, or damage imagery in any failure-adjacent state.
- Nothing animates or sounds on a failure-adjacent state — sent back, closed for today, a broken streak, a missed routine. Silence there is the design, not an omission.
- Haley's actions make sound; **every parent action is silent**, end to end.
- The celebration is hers to release. Approving animates nothing and plays nothing. The handoff screen 1o gets the coin pop and silence. Everything that moves or sounds in that chain is downstream of *her* tap.
- No new dependencies, no animation library, no audio files. Extend the existing keyframes in `global.css` and the existing `note()` voice in `audio.ts`.
- No animation may block a tap or delay a screen change.

Two things to flag rather than guess at: the check-off blip needs per-routine state for its position in the pentatonic run — tell me where you put it. And the nighttime auto-quiet needs to know the Nighttime Routine's window; if that is not already available where audio is triggered, say so instead of hardcoding a time.
