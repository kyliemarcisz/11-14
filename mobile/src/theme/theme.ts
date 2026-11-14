export const HarborPalette = {
  // "Amber Vial" — a pharmacy is lit cold, so the ground is cool and
  // clinical and the single warm object on screen is the dose you must take.
  // Kept key-for-key with the web tokens in web/src/styles/harbor.css.
  backgroundPrimary: '#E6EAE5', // counter — fluorescent light on a pale surface
  backgroundSecondary: '#DBE1DB', // recessed bands, label stock
  surface: '#F3F6F2', // card
  border: 'rgba(26, 38, 48, 0.13)',
  borderStrong: 'rgba(26, 38, 48, 0.24)',

  textPrimary: '#1A2630', // label ink
  textSecondary: '#4E5C66',
  textMuted: '#7C8990',

  accentPrimary: '#C06A14', // the amber vial — the one accent
  accentSoft: '#F7EDE1',
  accentBorder: '#E3CBA9',

  safe: '#1F6B5C', // slack tide — taken, complete
  safeSoft: '#DEEAE5',
  safeBorder: '#A9C9BF',

  caution: '#96610A', // the auxiliary warning label
  cautionSoft: '#F6ECD9',
  cautionBorder: '#E0C899',

  critical: '#A13129', // contraindication
  criticalSoft: '#F7E4E1',
  criticalBorder: '#E3B4AE',

  white: '#FFFFFF',
  overlay: 'rgba(16, 24, 30, 0.46)',
} as const;

export interface HarborTheme {
  colors: typeof HarborPalette;
  brainFogMode: boolean;
  scale: number;
  minTouchTarget: number;
  showSecondaryMetadata: boolean;
  font: {
    xs: number;
    sm: number;
    body: number;
    bodyLg: number;
    subtitle: number;
    title: number;
    hero: number;
  };
  lineHeight: {
    sm: number;
    body: number;
    bodyLg: number;
    subtitle: number;
    title: number;
    hero: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export function buildHarborTheme(brainFogMode: boolean): HarborTheme {
  const scale = brainFogMode ? 1.25 : 1.0;
  const sz = (base: number) => Math.round(base * scale);

  return {
    colors: HarborPalette,
    brainFogMode,
    scale,
    minTouchTarget: brainFogMode ? 68 : 48,
    showSecondaryMetadata: !brainFogMode,
    font: {
      xs: sz(12),
      sm: sz(14),
      body: sz(16),
      bodyLg: sz(18),
      subtitle: sz(20),
      title: sz(24),
      hero: sz(30),
    },
    lineHeight: {
      sm: sz(20),
      body: sz(24),
      bodyLg: sz(27),
      subtitle: sz(28),
      title: sz(32),
      hero: sz(38),
    },
    radius: {
      sm: 8,
      md: 12,
      lg: 18,
      xl: 24,
      pill: 999,
    },
    spacing: {
      xs: 6,
      sm: 10,
      md: 16,
      lg: 22,
      xl: 30,
    },
  };
}
