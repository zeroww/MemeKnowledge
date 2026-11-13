/**
 * 视觉设计令牌（深色霓虹风）。
 *
 * 目标：与首页竞技场背景统一 —— 深海军蓝 + 霓虹青 + 警示红 + 金色奖励。
 * - 背景：深色竞技场、透视网格、扫描线
 * - 面板：深色玻璃 + 霓虹描边 + 黑色投影
 * - 按钮：胶囊形霓虹控件，深色底 + 发光描边 + 顶部高光
 * - 文字：冰白标题 + 蓝灰辅助文字
 */
export const PALETTE = {
  bg: '#050a14',
  bgDeep: '#04070f',
  panel: '#0a1424',
  panelSoft: '#0e1c30',
  line: '#1e4a6e',
  neon: '#43e0ff',
  neonSoft: '#9ff4ff',
  green: '#4ade80',
  blue: '#4aa8ff',
  gold: '#ffcf6a',
  red: '#ff5c5c',
  purple: '#a97cff',
  pink: '#ff7ab8',
  ink: '#e8f7ff',
  ink2: '#bfeeff',
  ink3: '#7fa6c9',
  ink4: '#15334f',
  white: '#ffffff',
  black: '#000000',
};

export const NEON = {
  green: { from: '#0f2f22', mid: '#1c6b3c', to: '#2e9d54', edge: '#5df2a0' },
  cyan: { from: '#081a2c', mid: '#0d3a55', to: '#12688f', edge: '#5ee7ff' },
  blue: { from: '#0b2036', mid: '#155b8f', to: '#1f8fd8', edge: '#6fe3ff' },
  orange: { from: '#2b1c0a', mid: '#8a5a12', to: '#d68a1a', edge: '#ffcf6a' },
  red: { from: '#2b0d10', mid: '#8a2027', to: '#d83a42', edge: '#ff8a8a' },
  purple: { from: '#1d1236', mid: '#5a2f9e', to: '#8b5cf6', edge: '#c9a6ff' },
  pink: { from: '#2b1220', mid: '#8a2b58', to: '#d44a8b', edge: '#ffa8d4' },
  gold: { from: '#2b210a', mid: '#8a6a12', to: '#d6a41a', edge: '#ffe08a' },
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
  panel: 'rgba(0, 0, 0, 0.5)',
  soft: 'rgba(0, 0, 0, 0.3)',
  glowCyan: 'rgba(67, 224, 255, 0.3)',
  glowGold: 'rgba(255, 207, 106, 0.24)',
};

export function fontOf(size, weight = '400') {
  return `${weight} ${Math.round(size)}px ${FONT_STACK}`;
}

/**
 * 为页面主题补充固定的设计色。
 * 皮肤的 primary/accent 仍用于品牌强调，深色底与霓虹描边保持统一。
 */
export function withDesignTokens(theme = {}) {
  return {
    ...theme,
    ink: PALETTE.ink,
    ink2: PALETTE.ink2,
    ink3: PALETTE.ink3,
    ink4: PALETTE.ink4,
    ivory: PALETTE.white,
    ivory2: PALETTE.panelSoft,
    ivory3: PALETTE.line,
    gold: PALETTE.gold,
    goldDeep: '#c7922e',
    crimson: PALETTE.red,
    crimsonDeep: '#c43737',
    jade: theme.success || PALETTE.green,
    slate: theme.muted || PALETTE.ink3,
  };
}
