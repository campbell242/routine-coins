import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AVATARS, resolveAvatarId } from '../app';

describe('avatar catalog', () => {
  it('is the eight-slot picker the design specifies, in the handoff order', () => {
    expect(AVATARS.map((a) => a.id)).toEqual([
      'steve',
      'shadow',
      'creeper',
      'axolotl',
      'bear',
      'panda',
      'fox',
      'stormy',
    ]);
  });

  it('ships every avatar it offers', () => {
    for (const a of AVATARS) {
      expect(existsSync(`public/${a.src}`), a.src).toBe(true);
    }
  });
});

describe('retired avatars (design v10)', () => {
  // A phone that saved 'cat', 'alex' or 'bee' before the pets landed must
  // still light up a slot in the picker, not fall through to nothing.
  it('maps a retired id onto the pet that took its slot', () => {
    expect(resolveAvatarId('cat')).toBe('bear');
    expect(resolveAvatarId('alex')).toBe('shadow');
    expect(resolveAvatarId('bee')).toBe('stormy');
  });

  it('resolves every id it maps to a slot that exists', () => {
    const ids = new Set(AVATARS.map((a) => a.id));
    for (const retired of ['cat', 'alex', 'bee']) {
      expect(ids.has(resolveAvatarId(retired)), retired).toBe(true);
    }
  });

  it('leaves a current id alone', () => {
    expect(resolveAvatarId('axolotl')).toBe('axolotl');
  });
});
