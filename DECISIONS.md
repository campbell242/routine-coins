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
- **Fonts self-hosted** (Jersey 25 + Nunito Sans latin woff2) so the app
  works offline; declared in `index.html` with document-relative URLs.
  Jersey 25 replaced Pixelify Sans per design v4 (Pixelify's digits were
  ambiguous — 5 read as S). It has **one weight**: the `@font-face` declares
  `font-weight: 400`, and no pixel-font element sets a weight, so the browser
  never synthesizes a bold. Nunito Sans (sentence text) is unchanged.

## Configuration & engine

- Plans are typed TS config objects (`src/config/plans.ts`) consumed by a
  generic engine. Adding a Saturday routine = appending one `PlanConfig`.
- **A child profile is exactly two files**: `src/config/profile.ts` (name,
  coin goal, default PIN and avatar, storage identity) and
  `src/config/plans.ts` (her routines). `app.ts` holds only app-wide
  constants — timer presets, the avatar catalog, the parent-session timeout
  — so a second profile never touches it. Config is compiled into the
  bundle, not loaded at runtime, so a second child means a second build
  deployed to its own URL; keeping the per-child surface to two files is
  what makes that a copy-and-edit job rather than a refactor. Runtime-loaded
  JSON was considered and rejected: it would give up the compile-time typing
  that makes config edits safe, and require runtime validation the engine
  deliberately doesn't do.
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
- **Routine-screen review shortcut**: while an occurrence is waiting, the
  child's routine screen shows an iron "I'm the parent — review now" button
  under the waiting banner, so the parent doesn't have to back out to Home
  for the PARENTS chip. It goes to the same PIN pad (no bypass); a correct
  PIN then lands on *that* occurrence's review instead of the usual
  queue/settings landing. The shortcut also records a **return route**: LOCK,
  send-back, and ✕-on-the-PIN-pad hand the phone back to Haley's routine
  screen rather than Home, so she sees the result (approval instead shows the
  award screen, which already hands the phone back). Entering through the
  PARENTS chip is unchanged in every respect. The shortcut is deliberately
  iron — the parent area's own material, never green or gold — so it never
  reads as one of Haley's actions.

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
- **The running screen's exit hierarchy was inverted, and was corrected.**
  That `‹` is the only way off the screen that keeps the timer alive, yet it
  was the dimmest thing on it (muted `#8a8578`, 4.30:1) while the *destructive*
  exit was a full-width button reading just "Cancel" — which a 10-year-old
  reads as "cancel out of this screen", not "destroy my timer". Two copy/color
  changes (deviations from mockup 1h, deliberate): the back reads **`‹ Home`**
  in light parchment `#cfc8b2` (9.45:1 — bright enough to find, neutral so it
  never merges with the accent-green title beside it), and the stone button
  reads **"Cancel Timer"**, naming what it ends. Both stay in the mockup's
  positions; no third button competes with Pause/Cancel. The labelled back is
  opt-in per screen (`SubHeader`'s `backLabel`), so the light sub-screens keep
  their bare `‹`.
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

## Task icons (design v2)

- The 37-icon pack lives in `public/assets/icons/`; the canonical
  name→meaning manifest is `src/config/icons.ts` (`TASK_ICONS`), mirrored in
  README.md's authoring table and enforced-by-instruction in `CLAUDE.md`.
- `ItemConfig.icon` is an optional bare name. Rendering (child checklist row
  only, per the README's "left of the task name"): 28px, pixelated,
  `alt=""`/`aria-hidden` (decorative — the task text is always present),
  between the checkbox and the text. Unknown/missing names render nothing;
  a broken image hides itself (`onError`). Parent review rows and the
  verify block stay icon-less to preserve 1k/1l fidelity.
- Existing occurrence snapshots predate icons and simply render no icon —
  snapshots stay frozen; new occurrences pick icons up automatically.
- Assignments: morning — toothbrush, shirt, bed, backpack, book (bonus),
  broom (bonus); nighttime — toothbrush, shirt, broom, basket, book (bonus),
  lantern (overnight), bed (overnight). No icon repeats within a single list.

## Review hardening

An adversarial multi-agent review (engine correctness, UX flows, pixel
fidelity, PWA/platform) ran against the finished build; every confirmed
finding was fixed:

- Approval writes the occurrence and balance in **one IndexedDB
  transaction** (a kill mid-approval can't award without resolving or vice
  versa).
- A Pause tap landing in the sub-second window after the timer's real end
  resolves to the expired state (alarm + TIME'S UP) instead of stranding a
  "paused at 00:00" timer.
- Service worker stores **Vary-stripped responses** and matches with
  `ignoreVary` — hosts sending `Vary: Origin` (vite preview does) would
  otherwise make crossorigin font/module requests miss the cache on a cold
  offline start.
- `primeAudio` resumes any non-`running` AudioContext (iOS WebKit's
  non-standard `interrupted` state), with a capture-phase first-tap primer
  and a visibilitychange re-prime, so the expiry alarm survives
  backgrounding and relaunch.
- Wake lock re-acquires after a platform-initiated release and releases
  immediately if the timer was cancelled while the request was in flight.
- Parent modals disable Save on invalid/empty input; manual award edits are
  remembered per occurrence; the exact-amount modal can't set 0 from an
  empty field.
- XP "new segment" is a bright overlay that fades to reveal the green fill
  (settles into the bar, never disappears); verify-last-night unchecked
  slots use the light #fffdf6 fill per 1l; small bevel buttons keep
  per-variant inset strengths; back/close/✎ affordances have ≥44px hit
  areas.

## Testing

- 20 vitest unit tests over the engine and persistence: state machine,
  approve-despite-incomplete, send-back preservation, snapshot isolation from
  config edits, override resolution, blocking across midnight, weekday streaks
  across weekends, pending-day streak repair, ledger clamps/limits (exact
  1,720 redemption, remainder, over-balance block), timer
  absolute-end/pause/kill-expiry semantics.
- `scripts/screenshots.mjs` drives the built app through every screen/state
  with a frozen clock and seeded IndexedDB for comparison against the mockups.
