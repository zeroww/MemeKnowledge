import { DIFFICULTY_PLAN, MAX_RECENT_QUESTIONS } from './types.js';
import { hashString, mulberry32 } from './random.js';

function liveOnly(questions) {
  return (questions || []).filter((q) => q && q.status === 'live');
}

function takeCandidate(pool, used, rng, predicate) {
  const candidates = pool.filter((q) => !used.has(q.id) && (!predicate || predicate(q)));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

/**
 * 按 3 易 / 4 中 / 3 难抽题，第 10 题优先 BOSS 池。
 * 近期去重不足时自动放宽，绝不因为题池不足而无法开局。
 */
export function sampleQuestions(questions, options = {}) {
  const { recentIds = [], seed = Date.now(), poolIds = null } = options;
  const allLive = liveOnly(questions);
  if (allLive.length === 0) return [];

  // 剧情关卡可以传入专属题池；题池不足时回退到全题库，保证始终能开局。
  const poolIdSet = Array.isArray(poolIds) && poolIds.length ? new Set(poolIds) : null;
  const scoped = poolIdSet ? allLive.filter((q) => poolIdSet.has(q.id)) : allLive;
  const effectivePool = scoped.length >= DIFFICULTY_PLAN.length ? scoped : allLive;

  const rng = mulberry32(hashString(String(seed)));
  const recent = new Set((recentIds || []).slice(-MAX_RECENT_QUESTIONS));
  let pool = effectivePool.filter((q) => !recent.has(q.id));

  // 近期题太多时放宽到当前题池
  if (pool.length < DIFFICULTY_PLAN.length) {
    pool = effectivePool.slice();
  }

  const used = new Set();
  const picked = [];

  // 先为本局保留一道 BOSS 给第 10 题
  const reservedBoss = takeCandidate(
    pool,
    used,
    rng,
    (q) => q.isBoss && q.difficulty === 3
  );
  if (reservedBoss) used.add(reservedBoss.id);

  for (let i = 0; i < DIFFICULTY_PLAN.length; i += 1) {
    const level = DIFFICULTY_PLAN[i];
    const isLast = i === DIFFICULTY_PLAN.length - 1;

    if (isLast && reservedBoss) {
      picked.push(reservedBoss);
      continue;
    }

    // 前 9 题避开 BOSS 题，保证第 10 题的高光
    let candidate = takeCandidate(
      pool,
      used,
      rng,
      (q) => q.difficulty === level && (level === 3 ? !q.isBoss : true)
    );

    if (!candidate) {
      candidate = takeCandidate(pool, used, rng, (q) => q.difficulty === level);
    }

    if (!candidate) {
      const adjacent = [level - 1, level + 1, 1, 2, 3].filter((l) => l >= 1 && l <= 3);
      for (const l of adjacent) {
        candidate = takeCandidate(pool, used, rng, (q) => q.difficulty === l);
        if (candidate) break;
      }
    }

    if (!candidate) candidate = takeCandidate(pool, used, rng);

    if (!candidate) {
      // 最后兜底：允许重复，保证永远能开局
      candidate = effectivePool[Math.floor(rng() * effectivePool.length)];
    }

    if (candidate) {
      used.add(candidate.id);
      picked.push(candidate);
    }
  }

  return picked.slice(0, DIFFICULTY_PLAN.length);
}

/**
 * 每日挑战：同一天、同一题池 → 同一组题。
 * 不读取玩家近期题，保证每日公平。
 */
export function sampleDailyQuestions(questions, dateKey) {
  return sampleQuestions(questions, {
    recentIds: [],
    seed: hashString(`meme-world-daily-run:${dateKey}`),
  });
}

/**
 * 根据题目 ID 还原题目；用于每日挑战固定题单与快照恢复。
 */
export function questionsByIds(questions, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const map = new Map((questions || []).map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}
