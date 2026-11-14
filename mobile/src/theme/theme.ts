export const HarborPalette = {
  // Core "Warm Harbor" Palette
  backgroundPrimary: '#F8F6F2', // Warm Alabaster
  backgroundSecondary: '#F1EDE4', // Soft Sand
  surface: '#FFFFFF', // Pure Cream
  border: '#E6E2D8', // Subtle Warm Border
  borderStrong: '#D3CDBE',

  textPrimary: '#132238', // Deep Harbor Navy
  textSecondary: '#5A6B7C', // Muted Slate
  textMuted: '#7E8E9E',

  accentPrimary: '#2A7B6F', // Calm Seafoam
  accentSoft: '#E6F3F0',
  accentBorder: '#B7DCD5',

  safe: '#2E6F40', // Sage Green
  safeSoft: '#EAF5EE',
  safeBorder: '#B8DEC4',

  caution: '#D97706', // Warm Amber
  cautionSoft: '#FEF5E7',
  cautionBorder: '#F5D49B',

  critical: '#C83E3B', // Soft Coral Red
  criticalSoft: '#FDECEC',
  criticalBorder: '#F3BABA',

  white: '#FFFFFF',
  overlay: 'rgba(19, 34, 56, 0.42)',
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
      sm: 10,
      md: 16,
      lg: 22,
      xl: 28,
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
