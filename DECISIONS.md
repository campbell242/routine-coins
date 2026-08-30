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
  Approving shows the child-facing handoff screen, which *is* leaving the
  parent area — the session ends there by design.
- **The celebration is released by the child, never by the parent.**
  Approving used to fire the jingle, coin burst and XP animation on the
  parent's tap, with the phone still in their hand; the reward moment
  belonged to the wrong person. Approval now banks the coins and shows a
  handoff screen ("… approved! — hand the phone back"), and a gold
  "Tap to see your coins!" button under Haley's thumb plays it.
  **The coins still land at the parent's tap**, in the same single
  transaction as resolving the occurrence. Deferring the award itself was
  the obvious alternative and is a trap: the occurrence would stay
  unresolved until she tapped, and an unresolved occurrence blocks that
  plan's next occurrence — a forgotten tap would quietly stop tomorrow's
  routine and freeze the streak. A missed *celebration* costs nothing.
  Pending celebrations persist (the verify-last-night flow can approve while
  she is at school) and are a queue, not one slot, so approving two routines
  in one morning can't swallow one of her moments. Home carries the same
  gold button until she collects.
- **Manual bonus coins take the same celebration route as an approval.**
  A parent handing out coins for something wonderful (Settings → Balance →
  ＋/− adjust → ＋ Add) queues a `PendingAward` and lands on the handoff
  screen, so Haley releases the coin flight herself — the reward moment
  belongs to her whoever started it. The coins are still banked at the
  parent's tap (same principle as approving: a forgotten collection can
  never lose coins), and the entry persists, so a bonus survives the app
  being killed before she taps.
  - `PendingAward.kind` ('routine' | 'bonus', absent = 'routine' so an
    update can't strand a queued celebration) picks the copy: the handoff
    reads "Bonus coins!" and the award card "Bonus coins! / From Mom & Dad"
    instead of the routine's "… approved" lines. Everything else about 1m is
    identical — roll, coin flight, counter reaction, XP glow, jingle.
  - **A bonus carries `streak: 0`**, which both hides the award screen's
    streak line and skips the milestone toast and cue. A bonus doesn't
    extend her streak, and printing one under a spontaneous reward would
    imply it did. Crossing 1,720 on a bonus still plays the redemption
    fanfare — coins are coins.
  - **Adding is one tap; subtracting keeps its confirmation.** Adding isn't
    destructive, and the handoff screen appearing is itself confirmation.
    A subtraction stays silent and stays in Settings (nothing negative ever
    celebrates); only additions leave the parent area.
  - 1m/1o are drawn as routine-completion screens, so the bonus variants are
    a deviation — flagged for design.
- **Backup and restore** (Settings → BACKUP). There is no server and no
  sync, so a lost, wiped or dead phone is a lost balance and a lost streak
  history. One JSON file holds the balance, every occurrence (which is what
  streaks are *derived* from, so history is the streak), the plan overrides,
  her avatar/theme/sound settings, and any uncollected celebration.
  - **Saving prefers the share sheet** over a download: the point of a backup
    is to live somewhere other than the phone being backed up, and sharing
    puts it in Drive/mail/chat in one tap. Falls back to an `<a download>`
    where files can't be shared. No new dependencies, no network.
  - **The PIN hash and the running timer are deliberately excluded.** A
    4-digit hash in a file anyone could find is brute-forceable offline in
    milliseconds, and the file is meant to be copied around; a restored
    phone keeps whatever PIN it has. A half-finished timer isn't worth
    restoring, and `replaceAllData` clears it.
  - **Restore replaces, never merges**, and is written in ONE transaction
    after full validation — a kill mid-restore can't leave one night's coins
    beside another night's history. It takes the same extra confirmation as
    redemption and subtraction, and the confirm names what's in the file
    ("From Aug 17: 344 coins and 1 night of history").
  - **A picked file is untrusted input.** `parseBackup` rejects non-JSON,
    files with no format marker, a *newer* format, another profile's data,
    and a missing/negative balance — each with a reason plain enough to
    show. One malformed occurrence is dropped rather than failing the whole
    file: a backup missing one broken night still restores the coins and the
    rest of the history. Nothing is written unless parsing succeeds.
- **Extra confirmation taps**: redemption and manual subtraction (as
  specified) **plus "Close for today"** — it irreversibly ends the day's
  occurrence, matching the acceptance list's "destructive actions require the
  extra confirmation". Approve and send back stay one-tap (easy everyday use).
- **Parent-zone materials (design v7–v8, mockup sections 6–7 + design
  README)**: **green means Haley acted; gold means coins are moving** —
  neither is about who holds the phone. Green is never a parent-initiated
  action (nothing a parent taps in order to *do* something is green; green
  only reports what she did), gold is allowed wherever coins actually move
  including the parent zone, and everything else is iron, stone or slate.
  Availability moved into the bevel: raised bright
  stone (`#cfc8b2` fill / `#4a4a44` border / `#2b2b24` text) for ON and live,
  recessed dark iron (`#4a4a44` / `#2b2b24` / `#cfc8b2` text, pressed, no
  highlight) for OFF and for every disabled state, so "off" and "not
  available" are one look. **The label is never dimmed** — the bevel carries
  the state, and on a disabled option the appended reason ("· already
  settled") is load-bearing text; it reads at 5.33:1. Editable values and
  their ✎ are slate `#3f5f78` (the "Send back" material, the one accent
  Haley's side never uses); the edit field's focus ring moved from gold to
  the same slate. Cancel is never a filled button — underlined `#6b675c`
  text, full width, ≥44px tall, under the confirm rather than beside it, so
  the eye lands on the choice instead of the exit. `variant="parentOn"`
  degrades to `parentOff` when disabled so new controls inherit the rule.
  - Checkbox language, now a written rule: a **green bevelled slot** means
    Haley did it, a **white ✔ on flat iron** means a grown-up recorded it, a
    **plain inset square on flat iron** means locked and not yet decided.
  - Parent copy voice: plain, factual, no exclamation, no encouragement —
    explain the mechanic and stop. Haley's side gets the warmth.
  - v8 settled the two places the first, blunter rule ("no green and no gold
    in the parent zone") broke:
    - The **parent-verified row's live toggle** in review — and the same
      control in the morning-verify block, which records the identical fact
      — went from the green bevel to a white ✔ on flat iron (`parentMark`).
      Haley was asleep; the mark can't claim she did it. The green ✔ marks
      beside every *other* row are untouched: they are a record of her taps,
      and a parent scanning the list has to tell at a glance which lines are
      her word and which are their own.
    - **"Approve & award N"** went green → gold with the coin icon. It was
      green because it is the confirm; it is gold because it moves 344
      coins, and the three coin actions ("Approve & award", "Confirm &
      award night coins", "Redeem coins") should read as one family. A
      disabled "Redeem · N to go" stays recessed iron — the one case where
      gold gives way, because it can't pay.
    - `GreenButton` had no callers left and was deleted.
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
  handoff screen, which already hands the phone back). Entering through the
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
  approved goes to the handoff screen, then the award screen on her tap).
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

## Pet avatars (design v10)

- Three avatars drawn from photos of Haley's pets — Bear (bernedoodle),
  Shadow (cat) and Stormy (rat) — take the picker slots that `av-cat`,
  `av-alex` and `av-bee` held. The picker is still eight slots and grid
  position carries no meaning, so the swap is in place and the order matches
  the handoff's 1n.
- Shadow is a full-body sitting cat while the other two are heads. Design
  chose that deliberately (her silhouette is what makes her recognisable;
  a head-only crop lost the ruff), and the square frames centre the art, so
  the art is used as exported — never re-cropped to match the heads.
- All three are 32x32 flat pixel art with no anti-aliasing, rendered through
  the same global `img { image-rendering: pixelated }` rule as the rest of
  the set; nothing about them is resampled at build time.
- The three retired PNGs are still shipped: the Home "Nothing to do right
  now" empty state uses `av-bee.png` as decoration, where it is scenery
  rather than an avatar, and the handoff left it alone.
- A phone that saved one of the retired ids is mapped onto the pet that took
  its slot (`resolveAvatarId` in `src/config/app.ts`, applied when the store
  reads settings off disk or out of a backup). Without it a saved `cat`
  would match no slot and the picker would show nothing selected.

## App identity (APP_IDENTITY.md)

- The app installs as **"Gold Chest"** — manifest `name`, `short_name` and the
  `<title>` are all the same literal string. The identity constants
  (`APP_NAME`, `APP_SHORT_NAME`, `APP_DESCRIPTION`) moved from `profile.ts`
  to `app.ts` so the public identity never derives from `CHILD_NAME`; the
  child's name stays out of the manifest, the tab title and the repository.
  `APP_DESCRIPTION` is "Do your day, earn gold." — install metadata is not
  in-app copy, so no Minecoin reference (in-app copy may still say Minecoin).
  **`PROFILE_ID` was not touched**: it names the IndexedDB database, and a
  new value silently opens an empty one — a factory reset in disguise.
- The icon is the gold coin redrawn on a 32×32 master
  (`design/appicon/master-32.png`) over the app's ink `#2b2b24` — the old
  parchment ground made a pale coin on a pale square at 48px. Every shipped
  size is a nearest-neighbour **integer** upscale of that master
  (`scripts/gen-icons.mjs`, retargeted off the 16×16 in-app sprite, which is
  unchanged); the apple-touch 180 is the master ×5 centred on a 180 ink
  ground because 180 is not a multiple of 32. The maskable pair upscales a
  separate safe-zone master the export doesn't ship, so those two PNGs are
  committed assets from `design/appicon/`, not regenerated.
- **`background_color` stays `#f3eee1`** (splash ground; the app boots to
  Home, whose body is parchment under every world theme — deliberately not
  the icon's ink, since the splash shows the icon tile on parchment exactly
  as Home does).
- **`theme_color` stays `#f3eee1`, and must stay neutral**: the header strip
  is user-switchable across five world themes while a manifest colour is
  fixed at install, so any themed value would be wrong for four of the five.
  Parchment is the one surface every variant shares. The manifest value and
  the `index.html` meta agree today and are kept in sync **by hand**; if
  they ever diverge, **the index meta wins at runtime** (Chrome applies the
  live meta to the status bar; the manifest value is only the install-time
  default), so the manifest is not the single source.

## The real nighttime routine + excused nights (family-locked)

- The family locked their actual routine (nighttime only): opens 7:00 PM,
  worth exactly 344/night — base 204 for the five required items (snack →
  clean clothes → brush/floss → reading with a parent → phone to parents'
  room), +100 for the parent-verified "in bed, lights out, stay in bed",
  +20 feed Stormy, +20 pack lunch. 344 × 5 = 1,720 = one redemption.
- **Math concept cards, +50 (2026-08-28)**: a child-attested bonus item
  (`n-mathcards`, icon `paper`) in the nighttime bonus section. It sits on
  top of the locked 344 floor rather than inside it — a night she skips it
  is still worth exactly 344, a night she does it 394 — so no existing coin
  math changes and nothing auto-fails when there is no studying to do. The
  consequence to know: `REDEMPTION_THRESHOLD` stays 1,720, so the tidy "five
  perfect nights = exactly one redemption" no longer lands on the nose. Four
  review nights are 1,576 — still short — so the goal still takes five
  nights, but a five-night review week totals 1,970 and carries 250 past it.
  Raising the threshold was deliberately NOT bundled in — that is a family
  economy decision, not a checklist one.
- The morning plan is `enabled: false` (kept in config; its item IDs stay
  retired). The replaced nighttime items got NEW stable IDs (n-snack,
  n-change, n-teethfloss, n-parentread, n-phone, n-sleep, n-stormy,
  n-lunch); the old ones (n-teeth … n-stayedinbed) are never reused.
- The +100 sleep item started as a coin-valued bonus, then was promoted
  (2026-08-16, "option A") to `kind: 'required'` while keeping its own
  +100: it now sits in the required section of the checklist — mandatory in
  placement — but its coins still only count toward the suggested award
  when a parent checks it, so a night she gets up costs exactly 100
  automatically, without wiping out credit for the rest of the evening.
  `suggestedAward` therefore sums ALL checked coin-valued items regardless
  of kind. Because it's parent-verified (`parent-morning`), it never gates
  "Ask a parent" or the Home pips — those key off required+child items —
  and the parent can toggle it in the review screen and the morning-verify
  block alike. Its +100 chip shows on the row wherever it renders.
- Design then specced the pattern (mockup section 5a): **a required row may
  carry a coin value; the gold chip is unchanged** — the chip means "this
  pays", the border means "required or bonus", two facts on two channels.
  When such a row is parent-verified rather than self-checked, the
  checklist gives it (a) a **locked slot** — flat iron `#6f6f6f`, 3px
  `#4a4a44` border, 14px inset square, no bevel highlight, not tappable,
  because the ordinary stone slot promises a tap that isn't available — and
  (b) an iron **MORNING CHECK pill** under the hint, replacing the sentence
  "A grown-up checks this one in the morning": iron is the parent material,
  so it reads as "someone else decides this" with no negative language.
  Parent review (1k) is deliberately unchanged — the parent is the one
  person who *can* set it, so that slot stays live.
- The addendum specs the locked slot unset only. Once a parent HAS checked
  it (morning verify, before approval), the app keeps the iron ground and
  puts a white ✔ where the inset square goes — the fact is worth showing,
  and iron keeps it legible as someone else's mark. Flagged to design.
- "Phone to Mom & Dad's room" is the built-in handoff: she checks it in
  their room and hands the phone over for review on the spot.
- **Excused nights**: new `excused` occurrence status. A parent (PIN'd, in
  Settings → STREAK → "Excuse a night") can excuse Tonight or Last night —
  retroactive excusing creates an already-excused occurrence, covering the
  sleepover-where-nobody-opened-the-app case. Excused nights award no
  coins; the streak SKIPS them exactly like a non-scheduled day. Already
  resolved dates can't be excused (button disabled, "already settled").

## Motion & sound (design v5, MOTION_AND_SOUND.md)

Built in three phases: reward release (8 coins into the counter, XP glow at
1400ms, C6 on the arpeggio), check-off (380ms block place + pentatonic run,
G5→C6 on the last required, silent unchecks), then streak/small moments/
remaining cues/toggles/reduced-motion. Verified by instrumenting WebAudio —
frequencies and gains logged in the built app match the cue table.

Interpretations the spec left open — all since reviewed by design (section
5 of the mockup file) and confirmed, with the amendments noted:
- **Pip flip**: the spec's 200ms beat references the Home card's pip row,
  which isn't on screen during check-off — newly-green pips flip (80ms
  stagger) the first time the card is next seen, once, via a per-pip mask.
  Confirmed; design explicitly ruled out adding pips to the routine screen.
- **Auto-quiet = reduced gain, not mute**: the whole routine happens inside
  the nighttime window (opens 19:00), so muting would silence the app's
  core sounds every night. All cues ×0.5 from windowStart (override-
  resolved, never hardcoded) to midnight; the alarm keeps full gain.
  Confirmed, plus design's addition: **×0.25 once the phone is handed over
  for the night**, since nothing past that point is Haley acting. The
  handoff is read from tonight's occurrence — any status other than
  in_progress/sent_back — so a sent-back routine returns to ×0.5 while the
  phone is back in her hands.
- **Preset cross-fade on timer start**: skipped — it conflicts with the
  spec's own "no animation may delay a screen change / screen changes are
  instant" rules (starting swaps the whole screen). The bar snap remains.
  Confirmed and struck from the spec.
- **The three §2 reward rows** were unbuilt (no phase commissioned them)
  and design has since asked for all three: the "+N" roll (starts 120ms,
  10 × 50ms steps so it reads as a number), the counter coin's per-landing
  scale reaction (1.18 → 1, 120ms, replayed by remounting the pip on each
  of the 8 landings), and the 1600ms "Great job"/streak fade-up. Under
  `prefers-reduced-motion` the roll is skipped (final number immediately),
  no landings are scheduled (the coins never fly), and the closing lines
  still arrive on cue as a plain opacity fade.
- Sound toggles live in parent settings (SOUND card): All sounds + a
  separate Timer alarm switch; both persisted, parent toggles are silent.
- Live-tap-only rule: nothing animates on mount or plain revisits (except
  the sent-back banner's slide-in, which the spec specifies as arriving).

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
