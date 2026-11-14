/**
 * 全局枚举与规则常量。
 * 该文件不依赖 wx / Canvas，可以被 Node 测试直接 import。
 */

export const RUN_PHASE = Object.freeze({
  IDLE: 'idle',
  PLAYING: 'playing',
  FEEDBACK: 'feedback',
  DEAD: 'dead',
  FINISHED: 'finished',
  ABANDONED: 'abandoned',
});

export const MODE = Object.freeze({
  CLASSIC: 'classic',
  DAILY: 'daily',
});

export const QUESTION_TYPE = Object.freeze({
  IMAGE: 'image',
  DIALOGUE: 'dialogue',
  TRUEFALSE: 'truefalse',
  MEANING: 'meaning',
});

export const DIFFICULTY = Object.freeze({
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
});

/** 第 1～3 易、4～7 中、8～10 难；第 10 题为 BOSS */
export const DIFFICULTY_PLAN = Object.freeze([1, 1, 1, 2, 2, 2, 2, 3, 3, 3]);

export const DIFFICULTY_LABEL = Object.freeze({
  1: '简单',
  2: '进阶',
  3: '地狱',
});

export const DIFFICULTY_NAME = Object.freeze({
  1: '易',
  2: '中',
  3: '难',
});

export const TYPE_LABEL = Object.freeze({
  image: '梗图猜梗',
  dialogue: '接话',
  truefalse: '真假梗',
  meaning: '梗释义',
});

export const TYPE_ICON = Object.freeze({
  image: '🖼️',
  dialogue: '💬',
  truefalse: '🤔',
  meaning: '📖',
});

export const LIVES = 3;
export const TIMER_SEC = Object.freeze([12, 12, 12, 10, 10, 10, 10, 9, 9, 8]);

export const SCORE = Object.freeze({
  BASE_UNIT: 10,
  ALL_CORRECT_BONUS: 50,
  WIN_COIN_BONUS: 100,
  DAILY_WIN_COIN_BONUS: 200,
  COIN_PER_SCORE: 2,
});

export const COSTS = Object.freeze({
  REVIVE_COINS: 200,
  HINT_COINS: 100,
});

export const CAPS = Object.freeze({
  revivePerRun: 2,
  hintPerRun: 2,
  hintPerQuestion: 1,
  extendPerRun: 1,
  rewardedPerRun: 6,
  rewardedPerDay: 12,
  adCooldownMs: 5000,
  interstitialEveryRuns: 2,
  interstitialMinSeconds: 180,
  interstitialSkipFirstRuns: 3,
});

export const AD_PLACEMENT = Object.freeze({
  REVIVE: 'revive',
  HINT: 'hint',
  EXTEND: 'extend',
  DOUBLE: 'double',
  INTERSTITIAL: 'interstitial',
});

export const FEEDBACK_MS = 1400;
export const DEATH_REVEAL_MS = 1000;
export const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_RECENT_QUESTIONS = 120;

export const STORAGE_KEYS = Object.freeze({
  PROFILE: 'mw_v1_profile',
  SNAPSHOT: 'mw_v1_run_snapshot',
  EVENTS: 'mw_v1_events',
  META: 'mw_v1_meta',
});

export const BANK_VERSION = 1;
export const APP_VERSION = '1.7.0';
