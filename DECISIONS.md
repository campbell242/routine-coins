# DECISIONS

Significant choices made while building Haley's Routine & Minecoin PWA, per the
build instructions' latitude ("make the detailed decisions yourself"). The
design handoff (`design/`) was the visual source of truth; the build
instructions governed behavior. The three original spec documents were not in
the project folder, so behavior was implemented from the build instructions'
detailed requirements (Sections 3–6) plus the behavioral notes embedded in the
design README and mockup annotations.

## Stack

- **React 18 + Vite + TypeScript**, `idb` for IndexedDB. No router, no state
  library — one small external store (`src/store/store.ts`) with
  `useSyncExternalStore`. No server, no analytics, no notifications.
- **Hand-rolled service worker** (generated post-build by `scripts/gen-sw.mjs`)
  instead of Workbox: precaches the whole build output, cache-first with a
  cached-index navigation fallback, content-hash-versioned cache. ~50 lines,
  fully auditable, fully offline.
- **Fonts self-hosted** (Pixelify Sans + Nunito Sans latin woff2) so the app
  works offline; declared in `index.html` with document-relative URLs.

## Configuration & engine

- Plans are typed TS config objects (`src/config/plans.ts`) consumed by a
  generic engine. Adding a Saturday routine = appending one `PlanConfig`.
- **Occurrence start = the child opens/starts the routine** (taps the Home
  card CTA). The configuration snapshot is taken at that moment. Before that,
  Home renders the card from live (override-resolved) config.
- **Stored statuses**: `in_progress → review_requested → approved/closed`,
  with `sent_back` between; "ready for review" is *derived* (in progress +
  all required child-attested items checked), not stored.
- **"Ready" gate counts only child-attested required items.** Parent-verified
  overnight items never gate the child's "Ask a parent" CTA.
- **Sent-back banner's "Fix it and ask again" button acknowledges the note**
  (returns the occurrence to in-progress); re-requesting review uses the
  normal bottom CTA. One clear meaning per button.
- **Blocking**: any unresolved occurrence (its `dateKey` = its start date)
  blocks that plan's next occurrence. At most one unresolved occurrence per
  plan can exist. Resolution after midnight stays keyed to the start date.
- **Streaks are per-plan and schedule-aware** (weekday-only plans skip
  weekends when walking the chain). A *pending* (unresolved) day neither
  counts nor breaks — it repairs the chain if later approved. Closed or
  missed scheduled days end the chain silently. **Home shows the best current
  streak across enabled plans**; zero streak = no chip, no messaging (tone
  rule).
- **Nighttime overnight items** are modeled as parent-verified *bonus* items
  (+10 each) with `attestation: 'parent-morning'`. The child's checklist
  shows them with "A grown-up checks this one in the morning". The parent
  settings screen shows a **Verify last night** block for any unresolved
  past-date occurrence with such items (config-driven, not
  nighttime-specific); "Confirm & award night coins" verifies + approves in
  one tap — one parent session covers both. The full review screen remains
  available for edited awards.
- **Routine windows**: `windowStart` gates availability; `windowEnd` is the
  advisory "finish by" target only — shown in copy, never auto-evaluated,
  never auto-failed. A routine stays startable until end of day.
- **"Base award (each routine)"**: the design shows a single setting, so the
  parent edit writes a `baseAward` override to every plan. Window edits are
  per-plan. Overrides live in their own store and survive config updates.

## Parent area

- **Default PIN 1234** (documented in README; changeable in Parent →
  Settings, stored as SHA-256 hash). Design showed no PIN-change UI; a
  design-consistent "Parent PIN ···· ✎" row was added.
- Session ends on LOCK, 3 minutes of inactivity, or leaving the parent area.
  Approving shows the child-facing award screen, which *is* leaving the
  parent area — the session ends there by design.
- **Extra confirmation taps**: redemption and manual subtraction (as
  specified) **plus "Close for today"** — it irreversibly ends the day's
  occurrence, matching the acceptance list's "destructive actions require the
  extra confirmation". Approve and send back stay one-tap (easy everyday use).
- In the review screen the parent can toggle **parent-verified items only**;
  child-attested items are display-only (the parent's tool for an incomplete
  list is approve-despite-incomplete, send back, or close — not silently
  checking the child's boxes).
- Send-back note is optional, free-text; the child banner renders it as
  `A grown-up says: "…"` (no user model exists to know "Dad"; the mockup's
  "Dad says" was sample copy).
- Multiple pending reviews render as a picker row; review-queue order:
  review-requested first, then oldest.

## Child UX

- Home card CTA by state: not started → "Start ›", in progress/sent back →
  "Keep going ›", ready → gold "Ask a parent ›", waiting → stone
  "Waiting for a parent…". No status chip when not started.
- The five status banners from mockup 1f are implemented; the routine screen
  shows the **waiting** and **sent-back** banners contextually (mockups
  1d/1e show chip-only for in-progress/ready, so no banner in those states;
  approved goes straight to the award screen).
- Checklist row hints stay visible when checked (mockup 1d shows checked rows
  with hints; 1e's hint-less checked rows read as sample-data variation).
  Checked rows drop to opacity .62 per the handoff.
- **Timer running/expired screens have no tab bar** (per mockups 1h/1i) —
  a `‹` back affordance was added to the running screen header so a child
  can reach her checklist mid-timer without cancelling (deviation, documented;
  the timer pill keeps the countdown visible everywhere).
- Pause is allowed (mockup shows Pause ⏸); pausing freezes remaining time,
  resuming re-anchors the absolute end timestamp. A *running* timer can never
  be extended; "+5 more min" exists only from the expired state and starts a
  fresh 5-minute timer.
- Timer expiry while on any child screen navigates to the gold TIME'S UP
  screen and plays a soft synthesized chime (Web Audio, primed on first
  gesture — no audio assets). In the parent area, no forced navigation; the
  expired state shows on return. Expiry while killed → expired screen
  immediately on reopen.
- Above 1,720 the XP bar stays full, the number climbs, and the "to go" label
  flips to a gold "Goal reached! ★" (the child sees progress, the parent
  performs redemption).
- Award screen shows toast, coin burst, +N pop, and the XP bar's new segment
  bright for ~1.5s before settling (per mockup 1m annotations).

## Theme variants

- Variant tokens (`src/config/themes.ts`) change only: header strip
  treatment, primary action color (primary buttons, checked boxes, progress
  segments), and accent text color. Coin gold, XP green, status chips/banners
  (semantic colors), the dark timer screen, and the parent area's iron
  treatment never change.
- Per-variant button text color keeps contrast ≥ the handoff's own baseline
  (white on #57a636 = 3.04): Nether 3.38, End 3.66, Ocean 5.61 (uses the
  deeper #2e6e8f swatch as primary), Cherry uses dark text on pink (6.17,
  same convention as the gold button). Accent text ≥ 4.5 on parchment and
  card in every variant. `scripts/contrast-audit.mjs` verifies all pairs.

## Testing

- 20 vitest unit tests over the engine and persistence: state machine,
  approve-despite-incomplete, send-back preservation, snapshot isolation from
  config edits, override resolution, blocking across midnight, weekday streaks
  across weekends, pending-day streak repair, ledger clamps/limits (exact
  1,720 redemption, remainder, over-balance block), timer
  absolute-end/pause/kill-expiry semantics.
- `scripts/screenshots.mjs` drives the built app through every screen/state
  with a frozen clock and seeded IndexedDB for comparison against the mockups.
