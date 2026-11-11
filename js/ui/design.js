/**
 * 视觉设计令牌（参考图风格）。
 *
 * 目标：明亮校园卡通 —— 天空蓝 + 奶油白 + 糖果绿/蓝/橙 + 金色。
 * - 背景：浅蓝天空、白云、阳光
 * - 面板：白色圆角卡片 + 浅蓝描边 + 柔和蓝灰投影
 * - 按钮：胶囊形果冻质感，白边 + 高光 + 同色投影
 * - 文字：深海军蓝标题 + 蓝灰辅助文字
 */
export const PALETTE = {
  sky: '#79cbff',
  skyLight: '#e6f8ff',
  skyDeep: '#2f8ce8',
  navy: '#1f4e9c',
  navySoft: '#4a7cba',
  ink: '#1f4e9c',
  ink2: '#2f6fc0',
  ink3: '#7fa3c6',
  ink4: '#cfeafb',
  ivory: '#ffffff',
  ivory2: '#f1faff',
  ivory3: '#dff1fd',
  crimson: '#ff8a3d',
  crimsonDeep: '#e97a1e',
  gold: '#ffc531',
  goldDeep: '#d99a00',
  jade: '#35b84a',
  jadeDeep: '#279a3a',
  slate: '#7fa3c6',
  white: '#ffffff',
  black: '#000000',
};

export const CANDY = {
  green: { from: '#9ceb74', mid: '#4bcd55', to: '#2eb43d', edge: '#2a9f36' },
  blue: { from: '#86d4ff', mid: '#3a97f7', to: '#2174de', edge: '#1f6ac9' },
  orange: { from: '#ffd47a', mid: '#ffa62b', to: '#ff8a12', edge: '#e97a08' },
  red: { from: '#ffb0a6', mid: '#f96054', to: '#e8453a', edge: '#c93226' },
  purple: { from: '#ddc6ff', mid: '#a97cf2', to: '#8154de', edge: '#7045c9' },
  pink: { from: '#ffd0e8', mid: '#ff86bf', to: '#f267a9', edge: '#dd4f93' },
  gold: { from: '#ffe58a', mid: '#ffc12a', to: '#ffa515', edge: '#e89400' },
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
  panel: 'rgba(58, 122, 180, 0.18)',
  soft: 'rgba(58, 122, 180, 0.12)',
  glowCrimson: 'rgba(255, 138, 61, 0.28)',
  glowGold: 'rgba(255, 197, 49, 0.22)',
};

export function fontOf(size, weight = '400') {
  return `${weight} ${Math.round(size)}px ${FONT_STACK}`;
}

/**
 * 为页面主题补充固定的设计色。
 * 皮肤的 primary/accent 仍用于品牌强调，天空蓝/奶油白/金色保持统一。
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
