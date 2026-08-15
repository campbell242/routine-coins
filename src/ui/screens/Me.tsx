import { AVATARS } from '../../config/app';
import { THEMES } from '../../config/themes';
import { store, useAppState } from '../../store/hooks';
import { ChildStrips, SubHeader, TabBar, TimerPill } from '../components/chrome';

export function Me() {
  const { settings } = useAppState();
  const selectedAvatar = AVATARS.find((a) => a.id === settings.avatar);

  return (
    <div className="screen" style={{ background: '#f3eee1', color: '#2b2b24' }}>
      <ChildStrips />
      <TimerPill />
      <SubHeader title="My look" />
      <div className="screen-scroll">
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="px" style={{ fontSize: 17, color: '#8a8578', marginBottom: 10 }}>
              PICK YOUR AVATAR
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {AVATARS.map((a) => {
                const selected = a.id === settings.avatar;
                return (
                  <button
                    key={a.id}
                    onClick={() => store.setAvatar(a.id)}
                    aria-label={a.name}
                    aria-pressed={selected}
                    style={
                      selected
                        ? {
                            aspectRatio: '1',
                            background: '#c8961e',
                            border: '4px solid #f8c53a',
                            outline: '3px solid #20241a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }
                        : {
                            aspectRatio: '1',
                            background: '#8b8b8b',
                            border: '3px solid',
                            borderColor: '#3f3f3f #ffffff #ffffff #3f3f3f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }
                    }
                  >
                    <img src={a.src} alt={a.name} style={{ width: 48, height: 48 }} />
                  </button>
                );
              })}
            </div>
            {selectedAvatar && (
              <div className="px" style={{ textAlign: 'center', fontSize: 16, color: '#8a6200', marginTop: 8 }}>
                {selectedAvatar.name} — good choice!
              </div>
            )}
          </div>
          <div>
            <div className="px" style={{ fontSize: 17, color: '#8a8578', marginBottom: 10 }}>
              PICK YOUR WORLD
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {THEMES.map((t) => {
                const selected = t.id === settings.theme;
                return (
                  <button
                    key={t.id}
                    onClick={() => store.setTheme(t.id)}
                    aria-pressed={selected}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: '#fffdf6',
                      ...(selected
                        ? { border: '4px solid #f8c53a', outline: '3px solid #20241a' }
                        : { border: '3px solid #2b2b24' }),
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 26,
                        flex: 'none',
                        background: t.preview.image ? `url('${t.preview.image}')` : t.preview.color,
                        backgroundSize: t.preview.image ? '12px' : undefined,
                        border: '2px solid #20241a',
                      }}
                    />
                    <span className="px" style={{ fontSize: 18 }}>
                      {t.name}
                    </span>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      {t.swatches.map((c) => (
                        <span key={c} style={{ width: 13, height: 13, background: c }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <TabBar active="me" />
    </div>
  );
}
