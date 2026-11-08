import { SCORE } from './types.js';

/**
 * 单题得分：10 × 难度；BOSS 题 ×2。
 */
export function questionScore(question) {
  const base = SCORE.BASE_UNIT * (question.difficulty || 1);
  return question.isBoss ? base * 2 : base;
}

/**
 * 基础梗币 = 分数 × 2 + 通关奖励。
 * 失败（含放弃）没有通关奖励。
 */
export function calculateBaseCoins(score, win) {
  const safeScore = Math.max(0, Math.round(score || 0));
  const scoreCoins = safeScore * SCORE.COIN_PER_SCORE;
  const winCoins = win ? SCORE.WIN_COIN_BONUS : 0;
  return {
    scoreCoins,
    winCoins,
    baseCoins: scoreCoins + winCoins,
  };
}

/**
 * 双倍只翻倍基础梗币；每日挑战奖励不参与双倍。
 */
export function calculateTotalCoins(baseCoins, doubled = false, dailyBonus = 0) {
  const safeBase = Math.max(0, Math.round(baseCoins || 0));
  const safeBonus = Math.max(0, Math.round(dailyBonus || 0));
  return safeBase * (doubled ? 2 : 1) + safeBonus;
}

export function isAllCorrect(questionIds, correctMap) {
  if (!Array.isArray(questionIds) || questionIds.length === 0) return false;
  return questionIds.every((id) => !!correctMap[id]);
}
