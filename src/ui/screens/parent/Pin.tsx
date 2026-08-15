// Parent entrance: iron-door header, PIN dots, 3×4 keypad. A wrong PIN just
// shakes the dots — no error text, no lockout messaging visible to Haley.

import { useRef, useState } from 'react';
import { store } from '../../../store/hooks';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function PinScreen() {
  const [entered, setEntered] = useState('');
  const [shaking, setShaking] = useState(false);
  const busy = useRef(false);

  const press = async (key: string) => {
    if (busy.current || shaking) return;
    if (key === '⌫') {
      setEntered((e) => e.slice(0, -1));
      return;
    }
    if (!key || entered.length >= 4) return;
    const next = entered + key;
    setEntered(next);
    if (next.length === 4) {
      busy.current = true;
      const ok = await store.verifyPin(next);
      busy.current = false;
      if (!ok) {
        setShaking(true);
        window.setTimeout(() => {
          setShaking(false);
          setEntered('');
        }, 420);
      }
    }
  };

  return (
    <div className="screen" style={{ background: '#e8e6e0', color: '#2b2b24' }}>
      <div
        style={{
          height: 14,
          flex: 'none',
          background: "url('assets/tx-iron.png')",
          backgroundSize: '16px',
          borderBottom: '3px solid #6b6b6b',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', flex: 'none' }}>
        <div
          style={{
            width: 26,
            height: 38,
            flex: 'none',
            background: "url('assets/tx-iron.png')",
            backgroundSize: '10px',
            border: '2px solid #6b6b6b',
            position: 'relative',
          }}
        >
          <span style={{ position: 'absolute', right: 3, top: 16, width: 4, height: 4, background: '#4a4a44' }} />
        </div>
        <div>
          <div className="px" style={{ fontSize: 22 }}>
            Parent area
          </div>
          <div style={{ fontSize: 12, color: '#6b675c', fontWeight: 600 }}>Enter your 4-digit PIN</div>
        </div>
        <button
          onClick={() => store.navigate({ name: 'home' })}
          style={{ marginLeft: 'auto', width: 'auto', padding: 6 }}
          aria-label="Close"
        >
          <span className="px" style={{ fontSize: 16, color: '#8a8578' }}>
            ✕ close
          </span>
        </button>
      </div>

      <div
        className={shaking ? 'pin-shake' : undefined}
        style={{ display: 'flex', justifyContent: 'center', gap: 14, padding: '22px 0 10px', flex: 'none' }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 20,
              height: 20,
              background: i < entered.length ? '#2b2b24' : '#fff',
              border: '3px solid #2b2b24',
            }}
          />
        ))}
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 12,
          padding: '18px 26px 26px',
          alignContent: 'center',
        }}
      >
        {KEYS.map((key, i) =>
          key === '' ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              className={key === '⌫' ? 'bevel bevel-key-dim' : 'bevel bevel-key'}
              style={{ fontSize: key === '⌫' ? 26 : 30, padding: key === '⌫' ? '22px 0' : '20px 0' }}
              onClick={() => void press(key)}
            >
              {key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
