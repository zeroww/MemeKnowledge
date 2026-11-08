/**
 * 视觉设计令牌。
 * 目标：黑墨 + 象牙白 + 猩红 + 暖金的高对比漫画/电影感 UI。
 */
export const PALETTE = {
  ink: '#0b0d12',
  ink2: '#11151b',
  ink3: '#181d26',
  ink4: '#232a35',
  ivory: '#f7f0e4',
  ivory2: '#efe3d1',
  ivory3: '#e2d1b8',
  crimson: '#e5483f',
  crimsonDeep: '#a92520',
  gold: '#f3c969',
  goldDeep: '#c69b3d',
  jade: '#44c39a',
  jadeDeep: '#238c6c',
  slate: '#8b909a',
  white: '#ffffff',
  black: '#000000',
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const FONT_STACK =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

export const TYPE = {
  kicker: 9,
  caption: 10,
  body: 12.5,
  bodyLarge: 14,
  title: 20,
  display: 34,
  hero: 52,
};

export const SHADOW = {
  panel: 'rgba(0, 0, 0, 0.38)',
  soft: 'rgba(0, 0, 0, 0.22)',
  glowCrimson: 'rgba(229, 72, 63, 0.28)',
  glowGold: 'rgba(243, 201, 105, 0.22)',
};

export function fontOf(size, weight = '400') {
  return `${weight} ${Math.round(size)}px ${FONT_STACK}`;
}

/**
 * 为页面主题补充固定的故事视觉色。
 * 皮肤的 primary/accent 仍用于品牌强调，黑/象牙/金/红保持统一。
 */
export function withDesignTokens(theme = {}) {
  return {
    ...theme,
    ink: PALETTE.ink,
    ink2: PALETTE.ink2,
    ink3: PALETTE.ink3,
    ink4: PALETTE.ink4,
    ivory: PALETTE.ivory,
    ivory2: PALETTE.ivory2,
    ivory3: PALETTE.ivory3,
    gold: PALETTE.gold,
    goldDeep: PALETTE.goldDeep,
    crimson: PALETTE.crimson,
    crimsonDeep: PALETTE.crimsonDeep,
    jade: theme.success || PALETTE.jade,
    slate: theme.muted || PALETTE.slate,
  };
}
