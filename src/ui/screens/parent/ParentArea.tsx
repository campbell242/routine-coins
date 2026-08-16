// Parent area (Amendment 2): PIN-gated session that ends on manual lock,
// 3 minutes of inactivity, or leaving the parent area. Neutral iron styling
// in every theme variant. Redemption and manual subtraction take an extra
// confirmation tap; "close for today" gets one too (it ends the day's
// occurrence). Approval and send-back are one tap — easy everyday use.

import { useEffect, useRef, useState } from 'react';
import { PARENT_SESSION_IDLE_MS } from '../../../config/app';
import { CHILD_NAME, REDEMPTION_THRESHOLD } from '../../../config/profile';
import type { PlanResolved, Weekday } from '../../../config/types';
import {
  isChecked,
  isResolved,
  occurrenceId,
  parentVerifyItems,
  suggestedAward,
  type Occurrence,
} from '../../../engine/machine';
import { addDays, dateKey, fmtCoins, fmtDateShort, fmtHM, fmtTimeOfDay, fromDateKey } from '../../../lib/dates';
import { store, useAppState } from '../../../store/hooks';
import { ConfirmModal, Modal } from '../../components/chrome';
import { GreenButton, PixelButton, SlotCheck } from '../../components/core';

// ---------- shared chrome ----------

function ParentHeader({ title, titleSize = 21 }: { title: string; titleSize?: number }) {
  return (
    <>
      <div
        style={{
          height: 14,
          flex: 'none',
          background: "url('assets/tx-iron.png')",
          backgroundSize: '16px',
          borderBottom: '3px solid #6b6b6b',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', flex: 'none' }}>
        <div className="px" style={{ fontSize: titleSize }}>
          {title}
        </div>
        <button
          className="bevel bevel-iron"
          onClick={() => store.lock()}
          style={{
            marginLeft: 'auto',
            width: 'auto',
            fontSize: 14,
            padding: '6px 10px',
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,.3), inset 0 -3px 0 rgba(0,0,0,.25)',
          }}
        >
          LOCK ▪
        </button>
      </div>
    </>
  );
}

function scheduleLabel(plan: PlanResolved): string {
  const days = [...plan.schedule.days].sort() as Weekday[];
  const key = days.join(',');
  if (key === '0,1,2,3,4,5,6') return 'every day';
  if (key === '1,2,3,4,5') return 'weekdays';
  if (key === '0,6') return 'weekends';
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.map((d) => names[d]).join(' ');
}

function occDayLabel(occ: Occurrence, todayKey: string): string {
  if (occ.dateKey === todayKey) return 'today';
  const d = fromDateKey(occ.dateKey);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ---------- review view (mockup 1k) ----------

function ReviewView({ occId }: { occId?: string }) {
  const state = useAppState();
  const queue = store.reviewQueue();
  const occ = (occId && state.occurrences[occId] ? state.occurrences[occId] : queue[0]) as
    | Occurrence
    | undefined;

  // Manual edits are remembered per occurrence (switching between queued
  // reviews never silently discards an edited amount); an unedited award
  // keeps tracking the suggestion (base + completed bonuses).
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [modal, setModal] = useState<'none' | 'amount' | 'sendback' | 'close'>('none');
  const [note, setNote] = useState('');
  const [amountText, setAmountText] = useState('');

  const awardValue = occ ? (edits[occ.id] ?? suggestedAward(occ)) : 0;
  const setAward = (v: number) => {
    if (occ) setEdits((e) => ({ ...e, [occ.id]: Math.max(0, Math.min(999, Math.round(v))) }));
  };

  if (!occ) {
    return (
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            background: '#fffdf6',
            border: '3px solid #2b2b24',
            padding: '22px 16px',
            textAlign: 'center',
          }}
        >
          <div className="px" style={{ fontSize: 20, marginBottom: 4 }}>
            Nothing waiting for review
          </div>
          <div style={{ fontSize: 13, color: '#6b675c', fontWeight: 600 }}>
            When {CHILD_NAME} asks for a check, it shows up here.
          </div>
        </div>
        <PixelButton
          variant="stone"
          small
          style={{ fontSize: 16, padding: 12 }}
          onClick={() => store.navigate({ name: 'parent', view: 'settings' })}
        >
          Go to settings ›
        </PixelButton>
      </div>
    );
  }

  const todayKey = dateKey(new Date(state.nowMs));
  const required = occ.snapshot.items.filter((i) => i.kind === 'required');
  const bonus = occ.snapshot.items.filter((i) => i.kind === 'bonus');
  const base = occ.snapshot.baseAward;
  const bonusEarned = suggestedAward(occ) - base;

  const timeline: string[] = [];
  if (occ.dateKey !== todayKey) timeline.push(`from ${occDayLabel(occ, todayKey)}`);
  if (occ.finishedAt) timeline.push(`finished ${fmtTimeOfDay(occ.finishedAt)}`);
  else timeline.push(`started ${fmtTimeOfDay(occ.startedAt)}`);
  if (occ.reviewRequestedAt) timeline.push(`asked for review ${fmtTimeOfDay(occ.reviewRequestedAt)}`);
  else timeline.push('not sent for review yet');

  return (
    <>
      <div className="screen-scroll">
        {queue.length > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: '0 16px', flexWrap: 'wrap' }}>
            {queue.map((q) => (
              <button
                key={q.id}
                className={q.id === occ.id ? 'bevel bevel-gold bevel-sm' : 'bevel bevel-key bevel-sm'}
                style={{ width: 'auto', fontSize: 13, padding: '6px 10px' }}
                onClick={() => store.navigate({ name: 'parent', view: 'review', reviewOccId: q.id })}
              >
                {q.snapshot.name} · {occDayLabel(q, todayKey)}
              </button>
            ))}
          </div>
        )}
        <div style={{ padding: '4px 16px 0', fontSize: 13, color: '#6b675c', fontWeight: 600 }}>
          {timeline.join(' · ')}
        </div>
        <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {required.map((item) => {
            const done = isChecked(occ, item.id);
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: '#fffdf6',
                  border: '2px solid #cfc8b2',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {done ? (
                  <span className="px" style={{ color: '#3d7a22' }}>
                    ✔
                  </span>
                ) : (
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid #9a9a9a',
                      background: '#efefec',
                      flex: 'none',
                    }}
                  />
                )}
                {item.label}
                {!done && (
                  <span className="px" style={{ marginLeft: 'auto', fontSize: 13, color: '#8a8578' }}>
                    not done
                  </span>
                )}
              </div>
            );
          })}
          {bonus.map((item) => {
            const done = isChecked(occ, item.id);
            const parentItem = item.attestation === 'parent-morning';
            const row = (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: '#fdf8e8',
                  border: '2px solid #c8961e',
                  fontSize: 14,
                  fontWeight: 600,
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {parentItem ? (
                  <SlotCheck checked={done} size={24} themed={false} />
                ) : done ? (
                  <span className="px" style={{ color: '#3d7a22' }}>
                    ✔
                  </span>
                ) : (
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid #c8961e',
                      background: '#fdf3d4',
                      flex: 'none',
                    }}
                  />
                )}
                Bonus: {item.label}
                <span className="px" style={{ marginLeft: 'auto', color: '#8a6200' }}>
                  +{item.bonus ?? 0}
                </span>
              </div>
            );
            return parentItem ? (
              <button key={item.id} onClick={() => store.parentToggleItem(occ.id, item.id)} style={{ display: 'block' }}>
                {row}
              </button>
            ) : (
              <div key={item.id}>{row}</div>
            );
          })}

          <div style={{ marginTop: 10, background: '#fffdf6', border: '3px solid #2b2b24', padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#6b675c', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              AWARD · base {base} + bonus {bonusEarned}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <PixelButton
                variant="stone"
                small
                style={{ width: 52, fontSize: 24, padding: '10px 0' }}
                onClick={() => setAward(awardValue - 5)}
              >
                −5
              </PixelButton>
              <button
                onClick={() => {
                  setAmountText(String(awardValue));
                  setModal('amount');
                }}
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <img src="assets/coin.png" alt="" style={{ width: 32, height: 32 }} />
                <span className="px" style={{ fontSize: 46 }}>
                  {awardValue}
                </span>
              </button>
              <PixelButton
                variant="stone"
                small
                style={{ width: 52, fontSize: 24, padding: '10px 0' }}
                onClick={() => setAward(awardValue + 5)}
              >
                +5
              </PixelButton>
            </div>
            <div style={{ fontSize: 11, color: '#8a8578', fontWeight: 600, marginTop: 4 }}>
              tap the number to type an exact amount
            </div>
          </div>
        </div>
        <div style={{ padding: '0 16px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 'none' }}>
          <GreenButton style={{ fontSize: 22, padding: 16 }} onClick={() => store.parentApprove(occ.id, awardValue)}>
            Approve &amp; award {awardValue}
          </GreenButton>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <PixelButton
              variant="slate"
              small
              style={{ fontSize: 17, padding: 13 }}
              onClick={() => {
                setNote('');
                setModal('sendback');
              }}
            >
              Send back
            </PixelButton>
            <PixelButton variant="iron" small style={{ fontSize: 17, padding: 13 }} onClick={() => setModal('close')}>
              Close for today
            </PixelButton>
          </div>
        </div>
      </div>

      {modal === 'amount' && (
        <Modal title="Exact award" onClose={() => setModal('none')}>
          <input
            className="pixel-input"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
            autoFocus
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <PixelButton variant="stone" small style={{ fontSize: 17, padding: 13 }} onClick={() => setModal('none')}>
              Cancel
            </PixelButton>
            <PixelButton
              small
              disabled={!/^\d+$/.test(amountText)}
              style={{ fontSize: 17, padding: 13, ...(/^\d+$/.test(amountText) ? { background: '#57a636' } : {}) }}
              onClick={() => {
                setAward(Number(amountText));
                setModal('none');
              }}
            >
              Set
            </PixelButton>
          </div>
        </Modal>
      )}

      {modal === 'sendback' && (
        <Modal title="Send back for another try" onClose={() => setModal('none')}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4a463a', marginBottom: 8 }}>
            Checked items stay checked. Add a friendly note (optional):
          </div>
          <input
            className="pixel-input"
            style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 16, textAlign: 'left' }}
            value={note}
            maxLength={120}
            placeholder="Bed needs one more try — pillow on top!"
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <PixelButton variant="stone" small style={{ fontSize: 17, padding: 13 }} onClick={() => setModal('none')}>
              Cancel
            </PixelButton>
            <PixelButton
              variant="slate"
              small
              style={{ fontSize: 17, padding: 13 }}
              onClick={() => store.parentSendBack(occ.id, note)}
            >
              Send back
            </PixelButton>
          </div>
        </Modal>
      )}

      {modal === 'close' && (
        <ConfirmModal
          title={`Close ${occ.snapshot.name} for today?`}
          body="No coins this time — it simply closes. Tomorrow is a fresh start."
          confirmLabel="Close for today"
          onConfirm={() => {
            setModal('none');
            store.parentCloseToday(occ.id);
          }}
          onCancel={() => setModal('none')}
        />
      )}
    </>
  );
}

// ---------- settings view (mockup 1l) ----------

function VerifyLastNight() {
  const state = useAppState();
  const todayKey = dateKey(new Date(state.nowMs));
  // Any unresolved occurrence from a past day with parent-verified items —
  // config-driven, so a future plan with overnight items gets this for free.
  const occ = Object.values(state.occurrences)
    .filter(
      (o) =>
        o.status !== 'approved' &&
        o.status !== 'closed' &&
        o.dateKey < todayKey &&
        parentVerifyItems(o).length > 0,
    )
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))[0];
  if (!occ) return null;

  const items = parentVerifyItems(occ);
  return (
    <div style={{ background: '#fdf8e8', border: '3px solid #c8961e', padding: 12 }}>
      <div className="px" style={{ fontSize: 16, color: '#8a6200', marginBottom: 8 }}>
        VERIFY LAST NIGHT · {fmtDateShort(fromDateKey(occ.dateKey))}
      </div>
      <div style={{ fontSize: 12, color: '#6b675c', fontWeight: 600, marginBottom: 8 }}>
        Items {CHILD_NAME} couldn’t check after the phone left her room:
      </div>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => store.parentToggleItem(occ.id, item.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 0',
            fontSize: 14,
            fontWeight: 600,
            width: '100%',
            textAlign: 'left',
          }}
        >
          <SlotCheck checked={isChecked(occ, item.id)} size={30} themed={false} lightUnchecked />
          {item.label}
        </button>
      ))}
      <PixelButton
        variant="gold"
        small
        style={{ fontSize: 15, padding: 10, marginTop: 8, boxShadow: 'inset 0 3px 0 rgba(255,255,255,.5), inset 0 -4px 0 rgba(0,0,0,.18)' }}
        onClick={() => store.parentApprove(occ.id, suggestedAward(occ))}
      >
        Confirm &amp; award night coins
      </PixelButton>
      <div style={{ fontSize: 11, color: '#8a8578', fontWeight: 600, marginTop: 6, textAlign: 'center' }}>
        awards {suggestedAward(occ)} · or open it under review to edit
      </div>
    </div>
  );
}

function SettingsView() {
  const state = useAppState();
  const plans = store.resolvedPlans().filter((p) => p.enabled);
  const queue = store.reviewQueue();
  const [modal, setModal] = useState<
    | { kind: 'none' }
    | { kind: 'time'; planId: string }
    | { kind: 'base' }
    | { kind: 'adjust' }
    | { kind: 'confirmSubtract'; amount: number }
    | { kind: 'redeem' }
    | { kind: 'confirmRedeem'; amount: number }
    | { kind: 'pin' }
    | { kind: 'excuse' }
  >({ kind: 'none' });
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState('');

  const balance = state.balance;
  const toGo = Math.max(0, REDEMPTION_THRESHOLD - balance);
  const canRedeem = balance >= REDEMPTION_THRESHOLD;
  const soundOn = state.settings.sound !== false;
  const alarmOn = state.settings.alarmSound !== false;
  const baseShared = plans[0]?.baseAward ?? 40;

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    fontWeight: 600,
    padding: '6px 0',
    borderBottom: '2px solid #efe9d8',
  } as const;

  // ✎ edit affordances keep the design's row look but get a ≥44px hit area.
  const editBtnStyle = {
    marginLeft: 'auto',
    width: 'auto',
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    padding: '0 4px',
    margin: '-9px -4px -9px auto',
  } as const;

  return (
    <>
      <div className="screen-scroll">
        <div style={{ flex: 1, padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {queue.length > 0 && (
            <PixelButton
              variant="gold"
              small
              style={{ fontSize: 15, padding: 10 }}
              onClick={() => store.navigate({ name: 'parent', view: 'review' })}
            >
              ‹ {queue.length === 1 ? '1 routine' : `${queue.length} routines`} waiting for review
            </PixelButton>
          )}

          <VerifyLastNight />

          <div style={{ background: '#fffdf6', border: '3px solid #2b2b24', padding: 12 }}>
            <div className="px" style={{ fontSize: 16, color: '#8a8578', marginBottom: 8 }}>
              ROUTINES
            </div>
            {plans.map((plan, i) => (
              <div key={plan.id} style={{ ...rowStyle, borderBottom: i === plans.length - 1 ? 'none' : rowStyle.borderBottom }}>
                {plan.name.replace(' Routine', '')} · {scheduleLabel(plan)}
                <button
                  onClick={() => {
                    setField1(plan.windowStart);
                    setField2(plan.windowEnd ?? '');
                    setModal({ kind: 'time', planId: plan.id });
                  }}
                  style={editBtnStyle}
                >
                  <span className="px" style={{ color: '#3d7a22' }}>
                    {plan.windowEnd
                      ? `${fmtHM(plan.windowStart, false)}–${fmtHM(plan.windowEnd, false)} ✎`
                      : `${fmtHM(plan.windowStart)} ✎`}
                  </span>
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: '#fffdf6', border: '3px solid #2b2b24', padding: 12 }}>
            <div className="px" style={{ fontSize: 16, color: '#8a8578', marginBottom: 8 }}>
              STREAK
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              Sleepover or special night?
              <button onClick={() => setModal({ kind: 'excuse' })} style={editBtnStyle}>
                <span className="px" style={{ color: '#3d7a22' }}>Excuse a night ✎</span>
              </button>
            </div>
          </div>

          <div style={{ background: '#fffdf6', border: '3px solid #2b2b24', padding: 12 }}>
            <div className="px" style={{ fontSize: 16, color: '#8a8578', marginBottom: 8 }}>
              SOUND
            </div>
            <div style={rowStyle}>
              All sounds
              <span style={{ marginLeft: 'auto' }}>
                <PixelButton
                  small
                  variant={soundOn ? undefined : 'stone'}
                  style={{ fontSize: 14, padding: '8px 14px', width: 'auto', ...(soundOn ? { background: '#57a636' } : {}) }}
                  onClick={() => store.setSoundPrefs({ sound: !soundOn })}
                >
                  {soundOn ? 'ON' : 'OFF'}
                </PixelButton>
              </span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              Timer alarm
              <span style={{ marginLeft: 'auto' }}>
                <PixelButton
                  small
                  variant={alarmOn ? undefined : 'stone'}
                  style={{ fontSize: 14, padding: '8px 14px', width: 'auto', ...(alarmOn ? { background: '#57a636' } : {}) }}
                  onClick={() => store.setSoundPrefs({ alarmSound: !alarmOn })}
                >
                  {alarmOn ? 'ON' : 'OFF'}
                </PixelButton>
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#8a8578', fontWeight: 600, marginTop: 6 }}>
              The alarm has its own switch so the timer can stay audible with everything else off.
              Sounds automatically play quieter during and after the nighttime routine.
            </div>
          </div>

          <div style={{ background: '#fffdf6', border: '3px solid #2b2b24', padding: 12 }}>
            <div className="px" style={{ fontSize: 16, color: '#8a8578', marginBottom: 8 }}>
              REWARDS + COINS
            </div>
            <div style={rowStyle}>
              Base award (each routine)
              <button
                onClick={() => {
                  setField1(String(baseShared));
                  setModal({ kind: 'base' });
                }}
                style={editBtnStyle}
              >
                <span className="px" style={{ color: '#3d7a22' }}>
                  {baseShared} ✎
                </span>
              </button>
            </div>
            <div style={rowStyle}>
              Balance
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <img src="assets/coin.png" alt="" style={{ width: 18, height: 18 }} />
                <span className="px">{fmtCoins(balance)}</span>
                <button
                  onClick={() => {
                    setField1('');
                    setModal({ kind: 'adjust' });
                  }}
                  style={{ width: 'auto', minHeight: 44, display: 'flex', alignItems: 'center', margin: '-9px 0' }}
                >
                  <span className="px" style={{ color: '#3d7a22' }}>
                    ＋/− adjust
                  </span>
                </button>
              </span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none', padding: '8px 0 2px' }}>
              Redemption at {fmtCoins(REDEMPTION_THRESHOLD)}
              <span style={{ marginLeft: 'auto' }}>
                {canRedeem ? (
                  <PixelButton
                    variant="gold"
                    small
                    style={{ fontSize: 14, padding: '8px 12px', width: 'auto' }}
                    onClick={() => {
                      setField1(String(REDEMPTION_THRESHOLD));
                      setModal({ kind: 'redeem' });
                    }}
                  >
                    Redeem coins
                  </PixelButton>
                ) : (
                  <PixelButton disabled small style={{ fontSize: 14, padding: '8px 12px', width: 'auto' }}>
                    Redeem · {fmtCoins(toGo)} to go
                  </PixelButton>
                )}
              </span>
            </div>
          </div>

          <div style={{ background: '#fffdf6', border: '3px solid #2b2b24', padding: 12 }}>
            <div className="px" style={{ fontSize: 16, color: '#8a8578', marginBottom: 8 }}>
              PARENT PIN
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              4-digit PIN
              <button
                onClick={() => {
                  setField1('');
                  setModal({ kind: 'pin' });
                }}
                style={editBtnStyle}
              >
                <span className="px" style={{ color: '#3d7a22' }}>
                  ···· ✎
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {modal.kind === 'time' &&
        (() => {
          const plan = plans.find((p) => p.id === modal.planId);
          if (!plan) return null;
          return (
            <Modal title={`${plan.name} time`} onClose={() => setModal({ kind: 'none' })}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#6b675c', marginBottom: 4 }}>Starts</div>
              <input className="pixel-input" type="time" value={field1} onChange={(e) => setField1(e.target.value)} />
              {plan.windowEnd !== undefined && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#6b675c', margin: '10px 0 4px' }}>
                    Finish by (just a target — never auto-fails)
                  </div>
                  <input className="pixel-input" type="time" value={field2} onChange={(e) => setField2(e.target.value)} />
                </>
              )}
              {(() => {
                const valid =
                  /^\d{2}:\d{2}$/.test(field1) &&
                  (plan.windowEnd === undefined || /^\d{2}:\d{2}$/.test(field2));
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                    <PixelButton variant="stone" small style={{ fontSize: 17, padding: 13 }} onClick={() => setModal({ kind: 'none' })}>
                      Cancel
                    </PixelButton>
                    <PixelButton
                      small
                      disabled={!valid}
                      style={{ fontSize: 17, padding: 13, ...(valid ? { background: '#57a636' } : {}) }}
                      onClick={() => {
                        store.setOverride(plan.id, {
                          windowStart: field1,
                          ...(plan.windowEnd !== undefined ? { windowEnd: field2 } : {}),
                        });
                        setModal({ kind: 'none' });
                      }}
                    >
                      Save
                    </PixelButton>
                  </div>
                );
              })()}
            </Modal>
          );
        })()}

      {modal.kind === 'base' && (
        <Modal title="Base award (each routine)" onClose={() => setModal({ kind: 'none' })}>
          <input
            className="pixel-input"
            inputMode="numeric"
            pattern="[0-9]*"
            value={field1}
            onChange={(e) => setField1(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
            autoFocus
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <PixelButton variant="stone" small style={{ fontSize: 17, padding: 13 }} onClick={() => setModal({ kind: 'none' })}>
              Cancel
            </PixelButton>
            <PixelButton
              small
              disabled={!/^\d+$/.test(field1)}
              style={{ fontSize: 17, padding: 13, ...(/^\d+$/.test(field1) ? { background: '#57a636' } : {}) }}
              onClick={() => {
                store.setBaseAwardAll(Number(field1));
                setModal({ kind: 'none' });
              }}
            >
              Save
            </PixelButton>
          </div>
        </Modal>
      )}

      {modal.kind === 'adjust' && (
        <Modal title="Adjust balance" onClose={() => setModal({ kind: 'none' })}>
          <input
            className="pixel-input"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="coins"
            value={field1}
            onChange={(e) => setField1(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            autoFocus
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <GreenButton
              style={{ fontSize: 17, padding: 13 }}
              onClick={() => {
                const n = Number(field1);
                if (Number.isFinite(n) && n > 0) store.parentAdjustBalance(n);
                setModal({ kind: 'none' });
              }}
            >
              ＋ Add
            </GreenButton>
            <PixelButton
              variant="iron"
              small
              style={{ fontSize: 17, padding: 13 }}
              onClick={() => {
                const n = Number(field1);
                if (Number.isFinite(n) && n > 0) setModal({ kind: 'confirmSubtract', amount: n });
                else setModal({ kind: 'none' });
              }}
            >
              − Subtract
            </PixelButton>
          </div>
          <PixelButton
            variant="stone"
            small
            style={{ fontSize: 15, padding: 11, marginTop: 10 }}
            onClick={() => setModal({ kind: 'none' })}
          >
            Cancel
          </PixelButton>
        </Modal>
      )}

      {modal.kind === 'confirmSubtract' && (
        <ConfirmModal
          title={`Subtract ${fmtCoins(modal.amount)} coins?`}
          body={`Balance goes from ${fmtCoins(balance)} to ${fmtCoins(Math.max(0, balance - modal.amount))}.`}
          confirmLabel="Yes, subtract"
          onConfirm={() => {
            store.parentAdjustBalance(-modal.amount);
            setModal({ kind: 'none' });
          }}
          onCancel={() => setModal({ kind: 'none' })}
        />
      )}

      {modal.kind === 'redeem' && (
        <Modal title="Redeem coins" onClose={() => setModal({ kind: 'none' })}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4a463a', marginBottom: 8 }}>
            Balance: {fmtCoins(balance)}. Any amount up to the balance — the rest stays.
          </div>
          <input
            className="pixel-input"
            inputMode="numeric"
            pattern="[0-9]*"
            value={field1}
            onChange={(e) => setField1(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
            autoFocus
          />
          {(() => {
            const n = Number(field1);
            const valid = Number.isFinite(n) && n > 0 && n <= balance;
            return (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: valid ? '#6b675c' : '#8a6200' }}>
                  {field1 === ''
                    ? ' '
                    : !valid
                      ? n > balance
                        ? 'That’s more than the balance.'
                        : 'Enter an amount above zero.'
                      : `Keeps ${fmtCoins(balance - n)} coins.`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  <PixelButton variant="stone" small style={{ fontSize: 17, padding: 13 }} onClick={() => setModal({ kind: 'none' })}>
                    Cancel
                  </PixelButton>
                  <PixelButton
                    variant="gold"
                    small
                    disabled={!valid}
                    style={{ fontSize: 17, padding: 13 }}
                    onClick={() => setModal({ kind: 'confirmRedeem', amount: n })}
                  >
                    Redeem
                  </PixelButton>
                </div>
              </>
            );
          })()}
        </Modal>
      )}

      {modal.kind === 'confirmRedeem' && (
        <ConfirmModal
          title={`Redeem ${fmtCoins(modal.amount)} coins?`}
          body={`Balance goes from ${fmtCoins(balance)} to ${fmtCoins(balance - modal.amount)}. Time for the reward!`}
          confirmLabel="Yes, redeem"
          onConfirm={() => {
            store.parentRedeem(modal.amount);
            setModal({ kind: 'none' });
          }}
          onCancel={() => setModal({ kind: 'none' })}
        />
      )}

      {modal.kind === 'excuse' &&
        (() => {
          const now = new Date(state.nowMs);
          const nights = [
            { label: 'Tonight', dk: dateKey(now), date: now },
            { label: 'Last night', dk: dateKey(addDays(now, -1)), date: addDays(now, -1) },
          ];
          return (
            <Modal title="Excuse a night" onClose={() => setModal({ kind: 'none' })}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#4a463a', marginBottom: 12 }}>
                Sleepover, travel, sick day — the streak skips the night instead of breaking.
                No coins are awarded.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plans.map((plan) =>
                  nights.map(({ label, dk, date }) => {
                    const existing = state.occurrences[occurrenceId(plan.id, dk)];
                    const done = existing !== undefined && isResolved(existing);
                    return (
                      <PixelButton
                        key={`${plan.id}:${dk}`}
                        variant={done ? 'disabled' : 'iron'}
                        small
                        disabled={done}
                        style={{ fontSize: 16, padding: 12 }}
                        onClick={() => {
                          store.parentExcuseNight(plan.id, dk);
                          store.toast('Night excused', `${plan.name} · ${fmtDateShort(date)} — the streak skips it.`);
                          setModal({ kind: 'none' });
                        }}
                      >
                        {label} · {fmtDateShort(date)}
                        {done ? ' · already settled' : ''}
                      </PixelButton>
                    );
                  }),
                )}
              </div>
              <PixelButton
                variant="stone"
                small
                style={{ fontSize: 15, padding: 11, marginTop: 10 }}
                onClick={() => setModal({ kind: 'none' })}
              >
                Cancel
              </PixelButton>
            </Modal>
          );
        })()}

      {modal.kind === 'pin' && (
        <Modal title="New 4-digit PIN" onClose={() => setModal({ kind: 'none' })}>
          <input
            className="pixel-input"
            inputMode="numeric"
            pattern="[0-9]*"
            value={field1}
            onChange={(e) => setField1(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            autoFocus
          />
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: '#6b675c' }}>
            {field1.length === 4 ? 'Ready to save.' : 'Enter exactly 4 digits.'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <PixelButton variant="stone" small style={{ fontSize: 17, padding: 13 }} onClick={() => setModal({ kind: 'none' })}>
              Cancel
            </PixelButton>
            <PixelButton
              small
              disabled={!/^\d{4}$/.test(field1)}
              style={{ fontSize: 17, padding: 13, ...(/^\d{4}$/.test(field1) ? { background: '#57a636' } : {}) }}
              onClick={() => {
                void store.setPin(field1);
                setModal({ kind: 'none' });
              }}
            >
              Save
            </PixelButton>
          </div>
        </Modal>
      )}
    </>
  );
}

// ---------- container with the inactivity session ----------

export function ParentArea({ view, reviewOccId }: { view: 'review' | 'settings'; reviewOccId?: string }) {
  const state = useAppState();
  const lastActivity = useRef(Date.now());

  // 3 minutes of inactivity ends the session; any activity resets the clock.
  useEffect(() => {
    const touch = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    const check = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= PARENT_SESSION_IDLE_MS) {
        store.lock();
      }
    }, 2000);
    return () => {
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
      window.clearInterval(check);
    };
  }, []);

  // Defensive: never render the parent area without an unlocked session.
  useEffect(() => {
    if (!state.parentUnlocked) store.navigate({ name: 'home' });
  }, [state.parentUnlocked]);
  if (!state.parentUnlocked) return null;

  const queue = store.reviewQueue();
  const reviewTitle =
    queue.length > 0
      ? `Review: ${(reviewOccId && state.occurrences[reviewOccId]?.snapshot.name) || queue[0].snapshot.name}`
      : 'Review';

  return (
    <div className="screen" style={{ background: '#e8e6e0', color: '#2b2b24' }}>
      <ParentHeader title={view === 'review' ? reviewTitle : 'Settings'} titleSize={view === 'review' ? 21 : 22} />
      {view === 'review' && queue.length > 0 && (
        <div style={{ padding: '0 16px 4px', flex: 'none' }}>
          <button onClick={() => store.navigate({ name: 'parent', view: 'settings' })} style={{ width: 'auto' }}>
            <span className="px" style={{ fontSize: 14, color: '#6b675c' }}>
              Settings ›
            </span>
          </button>
        </div>
      )}
      {view === 'review' ? <ReviewView occId={reviewOccId} /> : <SettingsView />}
    </div>
  );
}
