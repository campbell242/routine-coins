// Theme variants (Amendment 2): a small token layer over one shared design
// system. A variant changes ONLY accent colors, the header strip treatment and
// small decorative touches. It never changes layout, text/background contrast
// pairs outside these tokens, coin gold, or XP-bar green. Parent-area screens
// keep the neutral iron treatment in every variant.

export interface StripStyle {
  image?: string; // tiled texture (rendered at background-size 16px)
  color?: string; // solid strip
}

export interface ThemeVariant {
  id: string;
  name: string;
  /** Top header strip on child screens (12px; 8px on cards). */
  strip: StripStyle;
  /** Second strip under the top one on Home (8px). */
  stripUnder: StripStyle;
  /** Primary action color: primary buttons, checked boxes, progress segments. */
  primary: string;
  /** Checked inventory-slot border corners. */
  checkedDark: string;
  checkedLight: string;
  /** Text color on primary buttons (chosen per variant for contrast). */
  primaryText: string;
  primaryTextShadow: string;
  primaryInsetTop: string;
  primaryInsetBottom: string;
  /** Accent-colored text on light backgrounds (replaces #3d7a22 on child screens). */
  accentText: string;
  /** Decorative swatch trio (pickers and previews). */
  swatches: [string, string, string];
  /** Thumbnail strip in the theme picker. */
  preview: StripStyle;
}

const GRASS = 'assets/tx-grass.png';
const DIRT = 'assets/tx-dirt.png';
const NETHER = 'assets/tx-nether.png';

export const THEMES: ThemeVariant[] = [
  {
    id: 'overworld',
    name: 'Overworld',
    strip: { image: GRASS },
    stripUnder: { image: DIRT },
    primary: '#57a636',
    checkedDark: '#2c5c1a',
    checkedLight: '#a8e07f',
    primaryText: '#fff',
    primaryTextShadow: '0 2px 0 rgba(0,0,0,.3)',
    primaryInsetTop: 'rgba(255,255,255,.35)',
    primaryInsetBottom: 'rgba(0,0,0,.28)',
    accentText: '#3d7a22',
    swatches: ['#57a636', '#7a5233', '#7fe237'],
    preview: { image: GRASS },
  },
  {
    id: 'nether',
    name: 'Nether',
    strip: { image: NETHER },
    stripUnder: { color: '#8a4545' },
    primary: '#d96e2e',
    checkedDark: '#8a3f14',
    checkedLight: '#f2b98a',
    primaryText: '#fff',
    primaryTextShadow: '0 2px 0 rgba(0,0,0,.3)',
    primaryInsetTop: 'rgba(255,255,255,.35)',
    primaryInsetBottom: 'rgba(0,0,0,.28)',
    accentText: '#9c4610',
    swatches: ['#d96e2e', '#8a4545', '#f2a23e'],
    preview: { image: NETHER },
  },
  {
    id: 'end',
    name: 'End',
    strip: { color: '#3a2e4a' },
    stripUnder: { color: '#5a4478' },
    primary: '#a06fd6',
    checkedDark: '#5a3489',
    checkedLight: '#d8c7ee',
    primaryText: '#fff',
    primaryTextShadow: '0 2px 0 rgba(0,0,0,.3)',
    primaryInsetTop: 'rgba(255,255,255,.35)',
    primaryInsetBottom: 'rgba(0,0,0,.28)',
    accentText: '#7040a8',
    swatches: ['#a06fd6', '#d8c7ee', '#e5e8a0'],
    preview: { color: '#3a2e4a' },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    strip: { color: '#2e6e8f' },
    stripUnder: { color: '#3aa6b9' },
    primary: '#2e6e8f',
    checkedDark: '#1c4a63',
    checkedLight: '#a3d5e8',
    primaryText: '#fff',
    primaryTextShadow: '0 2px 0 rgba(0,0,0,.3)',
    primaryInsetTop: 'rgba(255,255,255,.35)',
    primaryInsetBottom: 'rgba(0,0,0,.28)',
    accentText: '#205e7d',
    swatches: ['#3aa6b9', '#2e6e8f', '#8fd8c9'],
    preview: { color: '#2e6e8f' },
  },
  {
    id: 'cherry',
    name: 'Cherry Grove',
    strip: { color: '#e8a9c6' },
    stripUnder: { color: '#8f5a44' },
    primary: '#e58bb4',
    checkedDark: '#a8577d',
    checkedLight: '#f5cede',
    // Light accent → dark text (same convention as the gold/coin button).
    primaryText: '#46152e',
    primaryTextShadow: '0 1px 0 rgba(255,255,255,.4)',
    primaryInsetTop: 'rgba(255,255,255,.5)',
    primaryInsetBottom: 'rgba(0,0,0,.18)',
    accentText: '#a83866',
    swatches: ['#e58bb4', '#8f5a44', '#f5cede'],
    preview: { color: '#e8a9c6' },
  },
];

export const DEFAULT_THEME = 'overworld';

export function getTheme(id: string): ThemeVariant {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
