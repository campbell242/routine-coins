import { useEffect, useRef, useState } from 'react';
import { iconSrc } from '../../config/icons';
import type { ItemConfig } from '../../config/types';
import {
  isChecked,
  isReadyForReview,
  requiredChildItems,
  requiredDoneCount,
  type Occurrence,
} from '../../engine/machine';
import { store, useAppState } from '../../store/hooks';
import { ChildStrips, SubHeader, TimerPill } from '../components/chrome';
import { Chip, PixelButton, SectionRule, SlotCheck, useTheme } from '../components/core';

/**
 * The "block place" checkbox (spec §1): gray slot always underneath, the
 * checked bevel as an overlay whose opacity steps in over it, the ✔ popping
 * on top. Animates ONLY on a live tap (`anim`), never on mount — revisiting
 * the screen renders finished states with no motion. Parent-area checkboxes
 * use the plain SlotCheck and stay still.
 */
function BlockCheck({
  checked,
  size,
  anim,
}: {
  checked: boolean;
  size: number;
  anim: 'check' | 'uncheck' | null;
}) {
  const theme = useTheme();
  return (
    <span
      className={anim === 'check' ? 'bc-press' : anim === 'uncheck' ? 'bc-press-r' : undefined}
      style={{ position: 'relative', width: size, height: size, flex: 'none', display: 'block' }}
    >
      <span className="slot" style={{ position: 'absolute', inset: 0 }} />
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: theme.primary,
          border: '3px solid',
          borderColor: `${theme.checkedDark} ${theme.checkedLight} ${theme.checkedLight} ${theme.checkedDark}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // 60ms in, the green rises over the gray in 2 chunky steps (90ms);
          // unchecking reverses at 60% duration.
          opacity: checked ? 1 : 0,
          transition: checked ? 'opacity 90ms steps(2) 60ms' : 'opacity 54ms steps(2)',
        }}
      >
        {checked && (
          <span
            className={anim === 'check' ? 'tick-pop' : undefined}
            style={{
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: size * 0.57,
              color: theme.primaryText,
            }}
          >
            ✔
          </span>
        )}
      </span>
    </span>
  );
}

function ChecklistRow({
  occ,
  item,
  showCoin,
}: {
  occ: Occurrence;
  item: ItemConfig;
  showCoin: boolean;
}) {
  const checked = isChecked(occ, item.id);
  const editable =
    (occ.status === 'in_progress' || occ.status === 'sent_back') && item.attestation === 'child';
  const isBonus = item.kind === 'bonus';
  const parentLater = item.attestation === 'parent-morning';

  // Live-tap animation flag: set on her tap, cleared after the sequence.
  const [anim, setAnim] = useState<'check' | 'uncheck' | null>(null);
  useEffect(() => {
    if (!anim) return;
    const h = window.setTimeout(() => setAnim(null), 450);
    return () => window.clearTimeout(h);
  }, [anim]);

  const icon = iconSrc(item.icon);

  const row = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        background: isBonus ? '#fdf8e8' : '#fffdf6',
        border: `3px solid ${isBonus ? '#c8961e' : '#2b2b24'}`,
        // 140ms in, the row settles to .62 over 240ms (uncheck: 60% duration).
        opacity: checked ? 0.62 : 1,
        transition: checked ? 'opacity 240ms ease 140ms' : 'opacity 144ms ease',
        width: '100%',
        textAlign: 'left',
      }}
    >
      {editable ? (
        <BlockCheck checked={checked} size={46} anim={anim} />
      ) : (
        <SlotCheck checked={checked} size={46} />
      )}
      {icon && (
        // Decorative task icon (design README: 24–34px, left of the task
        // text, never the only signal of meaning).
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          // contain: non-square icons (rat 40×22, phone 24×40) keep their
          // true proportions inside the shared 28px footprint
          style={{ width: 28, height: 28, flex: 'none', objectFit: 'contain' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div style={{ flex: 1 }}>
        <div className="px" style={{ fontSize: 18, color: '#2b2b24' }}>
          {item.label}
        </div>
        {item.hint && (
          <div style={{ fontSize: 13, color: '#6b675c', fontWeight: 600 }}>{item.hint}</div>
        )}
        {parentLater && (
          <div style={{ fontSize: 13, color: '#6b675c', fontWeight: 600 }}>
            A grown-up checks this one in the morning
          </div>
        )}
      </div>
      {showCoin && item.bonus !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}>
          <img src="assets/coin.png" alt="" style={{ width: 18, height: 18 }} />
          <span className="px" style={{ fontSize: 17, color: '#8a6200' }}>
            +{item.bonus}
          </span>
        </div>
      )}
    </div>
  );

  if (!editable) return row;
  return (
    <button
      onClick={() => {
        setAnim(checked ? 'uncheck' : 'check');
        store.childToggleItem(occ.id, item.id);
      }}
      style={{ display: 'block' }}
    >
      {row}
    </button>
  );
}

function StatusBanner({ occ, justAsked }: { occ: Occurrence; justAsked: boolean }) {
  if (occ.status === 'review_requested') {
    return (
      // Slides down 8px and fades in only on the live ask; a revisit renders
      // it still. Then the screen holds still (spec §4).
      <div
        className={justAsked ? 'banner-in' : undefined}
        style={{ background: '#efefec', border: '3px solid #9a9a9a', padding: '12px 14px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="px" style={{ fontSize: 18, color: '#6b6b6b' }}>
            Waiting for a parent…
          </div>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <span className="wait-dot" style={{ width: 8, height: 8, background: '#9a9a9a' }} />
            <span className="wait-dot" style={{ width: 8, height: 8, background: '#bdbdbd', animationDelay: '.45s' }} />
            <span className="wait-dot" style={{ width: 8, height: 8, background: '#d9d9d9', animationDelay: '.9s' }} />
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#4a463a' }}>
          Hand the phone to a grown-up when they’re ready.
        </div>
      </div>
    );
  }
  if (occ.status === 'sent_back') {
    return (
      // Slides down and fades in, nothing else, no sound — the quiet is the
      // point (spec §4).
      <div className="banner-in" style={{ background: '#e8eef4', border: '3px solid #6d89a3', padding: '12px 14px' }}>
        <div className="px" style={{ fontSize: 18, color: '#42607c' }}>
          Sent back
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#4a463a' }}>
          {occ.sentBackNote ? `A grown-up says: “${occ.sentBackNote}”` : 'Almost there — one more try!'}
        </div>
        <PixelButton
          variant="slate"
          small
          style={{ fontSize: 16, padding: 11, marginTop: 10 }}
          onClick={() => store.childAckSentBack(occ.id)}
        >
          Fix it and ask again
        </PixelButton>
      </div>
    );
  }
  return null;
}

/**
 * Parent-zone shortcut, shown under the waiting banner: the grown-up standing
 * next to Haley reviews from here instead of backing out to Home for the
 * PARENTS chip. Iron — the parent area's own material, never green or gold —
 * so it never reads as one of Haley's actions. The PIN pad still gates it.
 */
function ParentReviewShortcut({ occ }: { occ: Occurrence }) {
  return (
    <div>
      <PixelButton
        variant="iron"
        style={{
          fontSize: 18,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
        onClick={() => store.parentReviewShortcut(occ.id)}
      >
        {/* the iron-door handle from the Home PARENTS chip */}
        <span style={{ width: 9, height: 9, background: '#4a4a44', flex: 'none' }} />
        I’m the parent — review now
      </PixelButton>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#8a8578', fontWeight: 700, marginTop: 6 }}>
        Opens the parent PIN pad
      </div>
    </div>
  );
}

export function RoutineScreen({ planId }: { planId: string }) {
  useAppState(); // re-render on ticks and occurrence changes
  const occ = store.activeOccurrence(planId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Defensive: resolved/missing occurrence (e.g. approved from the parent
  // area, or stale route after data cleanup) → back to Home.
  useEffect(() => {
    if (!occ) store.navigate({ name: 'home' });
  }, [occ]);

  // True only for the live ask on this mount — revisits render the waiting
  // state still.
  const [justAsked, setJustAsked] = useState(false);

  // Asking for review swaps the bottom CTA for the waiting banner and the
  // "I'm the parent" button, both of which render at the TOP of the list. On
  // a long checklist she taps from the bottom of the scroll and never sees
  // what replaced it — so ride back up with her. Smooth, so the movement
  // itself shows her the screen changed.
  useEffect(() => {
    if (occ?.status === 'review_requested') {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [occ?.status]);

  if (!occ) return null;

  const required = occ.snapshot.items.filter((i) => i.kind === 'required');
  const bonus = occ.snapshot.items.filter((i) => i.kind === 'bonus');
  const reqTotal = requiredChildItems(occ).length;
  const reqDone = requiredDoneCount(occ);
  const ready = isReadyForReview(occ);
  const waiting = occ.status === 'review_requested';

  let chip: JSX.Element;
  if (waiting) {
    chip = (
      <span className={justAsked ? 'chip-fade-in' : undefined} style={{ display: 'inline-flex' }}>
        <Chip kind="waiting">WAITING</Chip>
      </span>
    );
  } else if (occ.status === 'sent_back') {
    chip = <Chip kind="sentback">SENT BACK</Chip>;
  } else if (ready) {
    chip = <Chip kind="ready">READY FOR REVIEW</Chip>;
  } else {
    chip = <Chip kind="progress">IN PROGRESS</Chip>;
  }

  const remaining = reqTotal - reqDone;

  return (
    <div className="screen" style={{ background: '#f3eee1', color: '#2b2b24' }}>
      <ChildStrips />
      <TimerPill />
      <SubHeader title={occ.snapshot.name} onBack={() => store.navigate({ name: 'home' })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 4px', flex: 'none' }}>
        {chip}
        <span style={{ fontSize: 13, color: '#6b675c', fontWeight: 700 }}>
          {ready || waiting ? `All ${reqTotal} required done!` : `${reqDone} of ${reqTotal} required done`}
        </span>
      </div>
      <div className="screen-scroll" ref={scrollRef}>
        <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <StatusBanner occ={occ} justAsked={justAsked} />
          {waiting && <ParentReviewShortcut occ={occ} />}
          {required.map((item) => (
            <ChecklistRow key={item.id} occ={occ} item={item} showCoin={false} />
          ))}
          {bonus.length > 0 && <SectionRule label="BONUS COINS" color="#8a6200" />}
          {bonus.map((item) => (
            <ChecklistRow key={item.id} occ={occ} item={item} showCoin />
          ))}
        </div>
        {!waiting && (
          <div style={{ padding: '12px 16px 16px', flex: 'none' }}>
            {ready ? (
              <PixelButton
                variant="gold"
                style={{
                  fontSize: 22,
                  padding: 17,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
                onClick={() => {
                  setJustAsked(true);
                  store.childRequestReview(occ.id);
                }}
              >
                <img src="assets/coin.png" alt="" style={{ width: 24, height: 24 }} />
                Ask a parent to check!
              </PixelButton>
            ) : (
              <>
                <PixelButton disabled style={{ fontSize: 20, padding: 15 }}>
                  Ask a parent to check
                </PixelButton>
                <div style={{ textAlign: 'center', fontSize: 12, color: '#8a8578', fontWeight: 700, marginTop: 6 }}>
                  Finish {remaining} more to unlock
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
