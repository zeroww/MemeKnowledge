import { hashString } from './random.js';

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * 以北京时间（UTC+8）计算日期键 YYYY-MM-DD。
 * 本轮为纯本地 Demo，设备时间可被修改，属于已知限制。
 */
export function getBeijingDateKey(date = new Date()) {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

/**
 * 以周一为起点计算周键（北京时间）。
 * 返回该周周一的 YYYY-MM-DD，便于存储与比较。
 */
export function getWeekKey(date = new Date()) {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS);
  const day = shifted.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - diff)
  );
  return monday.toISOString().slice(0, 10);
}

export function getDailySeed(dateKey) {
  return hashString(`meme-world-daily:${dateKey}`);
}

export function isNewDay(previousDateKey, now = new Date()) {
  return previousDateKey !== getBeijingDateKey(now);
}

export function getYesterdayKey(date = new Date()) {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS - 24 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}
