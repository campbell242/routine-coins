// Drives the built app through every screen/state and captures screenshots
// for comparison against design/Haley Routine App.dc.html. Usage:
//   node scripts/screenshots.mjs [outDir] [theme]
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || 'shots';
const THEME = process.argv[3] || 'overworld';
const BASE = process.env.APP_URL || 'http://localhost:4173/';
fs.mkdirSync(OUT, { recursive: true });

const DAY = '2026-08-11'; // a Tuesday
const YESTERDAY = '2026-08-10';

function occ({ planId, dk, status, checks = {}, startedAt, finishedAt, reviewRequestedAt, sentBackNote, snapshot }) {
  return {
    id: `${planId}:${dk}`,
    planId,
    dateKey: dk,
    status,
    snapshot,
    checks,
    startedAt,
    finishedAt,
    reviewRequestedAt,
    sentBackNote,
  };
}

const MORNING_SNAP = {
  planId: 'morning',
  name: 'Morning Routine',
  baseAward: 40,
  windowStart: '06:30',
  windowEnd: '08:30',
  takenAt: 0,
  items: [
    { id: 'm-teeth', label: 'Brush teeth', hint: 'Two whole minutes!', kind: 'required', attestation: 'child' },
    { id: 'm-dressed', label: 'Get dressed', hint: 'Clothes are on your chair', kind: 'required', attestation: 'child' },
    { id: 'm-bed', label: 'Make your bed', hint: 'Covers up, pillow on top', kind: 'required', attestation: 'child' },
    { id: 'm-backpack', label: 'Pack backpack', hint: 'Homework folder + water bottle', kind: 'required', attestation: 'child' },
    { id: 'm-read', label: 'Read 10 minutes', hint: 'Any book you like', kind: 'bonus', bonus: 15, attestation: 'child' },
    { id: 'm-desk', label: 'Tidy your desk', hint: 'Clear surface, pencils in the cup', kind: 'bonus', bonus: 10, attestation: 'child' },
  ],
};

const NIGHT_SNAP = {
  planId: 'nighttime',
  name: 'Nighttime Routine',
  baseAward: 40,
  windowStart: '20:00',
  takenAt: 0,
  items: [
    { id: 'n-teeth', label: 'Brush teeth', hint: 'Two whole minutes!', kind: 'required', attestation: 'child' },
    { id: 'n-pjs', label: 'PJs on', hint: 'Comfy ones ready for bed', kind: 'required', attestation: 'child' },
    { id: 'n-tidy', label: 'Five-minute tidy', hint: 'Toys and clothes off the floor', kind: 'required', attestation: 'child' },
    { id: 'n-clothes', label: 'Lay out tomorrow’s clothes', hint: 'Pick your favorites', kind: 'required', attestation: 'child' },
    { id: 'n-read', label: 'Read 10 minutes in bed', hint: 'Any book you like', kind: 'bonus', bonus: 15, attestation: 'child' },
    { id: 'n-lightsout', label: 'Lights out by 8:45', kind: 'bonus', bonus: 10, attestation: 'parent-morning' },
    { id: 'n-stayedinbed', label: 'Stayed in bed after lights out', kind: 'bonus', bonus: 10, attestation: 'parent-morning' },
  ],
};

const at = (h, m) => new Date(2026, 7, 11, h, m).getTime();
const ck = (t) => ({ checked: true, at: t, by: 'child' });

async function seed(page, { balance, occurrences = [], timer, settings, streakDays = [] }) {
  await page.evaluate(
    async ({ balance, occurrences, timer, settings }) => {
      await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase('haley-routine-coins');
        req.onsuccess = resolve;
        req.onerror = reject;
        req.onblocked = resolve;
      });
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('haley-routine-coins', 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore('kv');
          req.result.createObjectStore('occurrences', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['kv', 'occurrences'], 'readwrite');
        tx.objectStore('kv').put(balance, 'balance');
        if (timer) tx.objectStore('kv').put(timer, 'timer');
        if (settings) tx.objectStore('kv').put(settings, 'settings');
        for (const o of occurrences) tx.objectStore('occurrences').put(o);
        tx.oncomplete = resolve;
        tx.onerror = reject;
      });
      db.close();
    },
    {
      balance,
      occurrences: [...occurrences, ...streakDays],
      timer,
      settings: settings ?? { avatar: 'axolotl', theme: 'THEME' },
    },
  );
}

// 6 approved weekday mornings + nights for the "6 day streak" chip
function streakOccs() {
  const out = [];
  for (const dk of ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-10']) {
    out.push(
      occ({
        planId: 'morning',
        dk,
        status: 'approved',
        snapshot: MORNING_SNAP,
        checks: { 'm-teeth': ck(1), 'm-dressed': ck(1), 'm-bed': ck(1), 'm-backpack': ck(1) },
        startedAt: 1,
      }),
    );
  }
  return out;
}

async function shot(page, name) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('  ✓', name);
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium', // pre-installed in this environment
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('CONSOLE:', m.text());
});

const settings = { avatar: 'axolotl', theme: THEME };

// ---------- 1b Home — morning due, timer running ----------
await page.clock.setFixedTime(new Date(2026, 7, 11, 7, 42));
await page.goto(BASE);
await page.waitForTimeout(300);
await seed(page, {
  balance: 1240,
  settings,
  occurrences: [
    occ({
      planId: 'morning',
      dk: DAY,
      status: 'in_progress',
      snapshot: MORNING_SNAP,
      checks: { 'm-teeth': ck(at(7, 31)), 'm-dressed': ck(at(7, 35)) },
      startedAt: at(7, 30),
    }),
  ],
  streakDays: streakOccs(),
  timer: { phase: 'running', endAt: at(7, 42) + 8 * 60000 + 42000, totalMin: 12 },
});
await page.reload();
await shot(page, '1b-home-due');

// ---------- 1d routine in progress ----------
await page.getByText('Keep going ›').click();
await shot(page, '1d-routine-in-progress');

// ---------- asking early (unfinished list) and taking the ask back ----------
// Asking is not gated on a finished checklist: the stone CTA is live at 2 of 5.
await page.getByText('Ask a parent to check', { exact: true }).click();
await shot(page, 'routine-asked-early');
// the parent's review of an unfinished ask carries the slate "Asked early" note
await page.getByText('I’m the parent — review now').click();
for (const k of ['1', '2', '3', '4']) await page.getByText(k, { exact: true }).click();
await page.waitForTimeout(300);
await shot(page, 'review-asked-early');
await page.getByText('LOCK ▪').click();
await page.waitForTimeout(200);
await page.getByText('Keep going instead').click();

// ---------- 1e routine ready (check remaining two) ----------
await page.getByText('Make your bed').click();
await page.getByText('Pack backpack').click();
await page.getByText('Read 10 minutes', { exact: true }).click();
await shot(page, '1e-routine-ready');

// ---------- waiting banner ----------
await page.getByText('Ask a parent to check!').click();
await shot(page, '1f-routine-waiting');

// ---------- parent-review shortcut: PIN → straight to this routine's review ----------
await page.getByText('I’m the parent — review now').click();
await shot(page, 'shortcut-parent-pin');
for (const k of ['1', '2', '3', '4']) await page.getByText(k, { exact: true }).click();
await page.waitForTimeout(300);
await shot(page, 'shortcut-parent-review');
// LOCK goes back to Haley's routine screen, not the parent area
await page.getByText('LOCK ▪').click();
await page.waitForTimeout(200);
await shot(page, 'shortcut-back-to-routine');

// ---------- 1j parent pin ----------
await page.getByText('‹').click();
await page.getByText('PARENTS').click();
await shot(page, '1j-parent-pin');

// wrong PIN shake
await page.getByText('9', { exact: true }).click();
await page.getByText('9', { exact: true }).click();
await page.getByText('9', { exact: true }).click();
await page.getByText('9', { exact: true }).click();
await page.waitForTimeout(150);
await shot(page, '1j-parent-pin-shake');

// right PIN
for (const k of ['1', '2', '3', '4']) await page.getByText(k, { exact: true }).click();
await page.waitForTimeout(300);
await shot(page, '1k-parent-approval');

// ---------- send back modal ----------
await page.getByText('Send back', { exact: true }).click();
await shot(page, '1k-sendback-modal');
await page.getByPlaceholder('Bed needs one more try — pillow on top!').fill('Bed needs one more try — pillow on top!');
await page.locator('.modal-card').getByText('Send back', { exact: true }).click();
await page.waitForTimeout(200);
// back home → open routine to see sent-back banner (items stay checked, so
// the card CTA is the gold "Ask a parent ›")
await page.getByText(/Keep going ›|Ask a parent ›/).click();
await shot(page, '1f-routine-sent-back');

// ---------- approval → award ----------
await page.getByText('Fix it and ask again').click();
await page.getByText('Ask a parent to check!').click();
await page.getByText('‹').click(); // back to Home — PARENTS chip lives there
await page.getByText('PARENTS').click();
for (const k of ['1', '2', '3', '4']) await page.getByText(k, { exact: true }).click();
await page.waitForTimeout(300);
await page.getByText(/^Approve & award/).click();
// Approving banks the coins but does NOT play the celebration — the phone
// goes back to Haley and she releases it.
await shot(page, 'handoff-hand-the-phone-back');
await page.getByText('Tap to see your coins!').click();
await shot(page, '1m-coin-award');
await page.getByText('Back to Home').click();

// ---------- 1c home empty (afternoon) ----------
await page.clock.setFixedTime(new Date(2026, 7, 11, 15, 15));
await seed(page, {
  balance: 1295,
  settings,
  occurrences: [
    occ({
      planId: 'morning',
      dk: DAY,
      status: 'approved',
      snapshot: MORNING_SNAP,
      checks: { 'm-teeth': ck(1), 'm-dressed': ck(1), 'm-bed': ck(1), 'm-backpack': ck(1) },
      startedAt: 1,
    }),
  ],
  streakDays: streakOccs(),
});
await page.reload();
await shot(page, '1c-home-empty');

// ---------- 1g timer idle ----------
await page.clock.setFixedTime(new Date(2026, 7, 11, 16, 20));
await page.getByText('TIMER', { exact: true }).click();
await shot(page, '1g-timer-idle');

// ---------- 1h timer running ----------
await page.clock.setFixedTime(new Date(2026, 7, 11, 16, 22));
await seed(page, {
  balance: 1295,
  settings,
  timer: { phase: 'running', endAt: new Date(2026, 7, 11, 16, 22).getTime() + 8 * 60000 + 42000, totalMin: 12 },
});
await page.reload();
await page.getByText('TIMER', { exact: true }).click();
await shot(page, '1h-timer-running');

// ---------- 1i timer expired ----------
await seed(page, {
  balance: 1295,
  settings,
  timer: { phase: 'expired', totalMin: 12, expiredAt: new Date(2026, 7, 11, 16, 20).getTime() },
});
await page.reload();
await shot(page, '1i-timer-expired');
await page.getByText('Done!').click();

// ---------- 1n customization ----------
await page.clock.setFixedTime(new Date(2026, 7, 11, 16, 31));
await page.getByText('ME', { exact: true }).click();
await shot(page, '1n-customization');

// ---------- 1l parent settings with verify-last-night ----------
await page.clock.setFixedTime(new Date(2026, 7, 11, 7, 55));
await seed(page, {
  balance: 1240,
  settings,
  occurrences: [
    occ({
      planId: 'nighttime',
      dk: YESTERDAY,
      status: 'review_requested',
      snapshot: NIGHT_SNAP,
      checks: {
        'n-teeth': ck(1),
        'n-pjs': ck(1),
        'n-tidy': ck(1),
        'n-clothes': ck(1),
        'n-lightsout': { checked: true, at: 2, by: 'parent' },
      },
      startedAt: 1,
      finishedAt: 1,
      reviewRequestedAt: 1,
    }),
  ],
  streakDays: streakOccs(),
});
await page.reload();
await page.getByText('PARENTS').click();
for (const k of ['1', '2', '3', '4']) await page.getByText(k, { exact: true }).click();
await page.waitForTimeout(300);
await shot(page, '1k-parent-review-nighttime');
await page.getByText('Settings ›').click();
await shot(page, '1l-parent-settings');

// redemption modal (balance above threshold)
await seed(page, { balance: 1900, settings, streakDays: streakOccs() });
await page.reload();
await page.getByText('PARENTS').click();
for (const k of ['1', '2', '3', '4']) await page.getByText(k, { exact: true }).click();
await page.waitForTimeout(300);
await page.getByText('Redeem coins').click();
await shot(page, '1l-redeem-modal');

await browser.close();
console.log('done → ' + OUT);
