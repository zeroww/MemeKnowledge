import { CAPS, TIMER_SEC, COSTS } from '../core/types.js';

/**
 * 本地“远程配置”默认值。
 * 结构与计划文档中的远程配置保持一致，后续可替换为云数据库/远程配置。
 */
export const DEFAULT_CONFIG = {
  adsEnabled: false,
  mockAds: true,
  mockAdDurationMs: 1600,
  adUnits: {
    revive: 'adunit-xxxxxxxxxxxx',
    hint: 'adunit-xxxxxxxxxxxx',
    extend: 'adunit-xxxxxxxxxxxx',
    double: 'adunit-xxxxxxxxxxxx',
    daily: 'adunit-xxxxxxxxxxxx',
    interstitial: 'adunit-xxxxxxxxxxxx',
  },
  caps: { ...CAPS },
  timers: [...TIMER_SEC],
  fallback: {
    reviveCoins: COSTS.REVIVE_COINS,
    hintCoins: COSTS.HINT_COINS,
  },
  features: {
    bossEnabled: true,
    dailyEnabled: true,
    leaderboardEnabled: true,
    shopEnabled: true,
    collectionEnabled: true,
    interstitialEnabled: true,
  },
  killSwitches: {
    disableAds: false,
    disableInterstitial: false,
    disableBoss: false,
    disableLeaderboard: false,
  },
};

export function getConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}
