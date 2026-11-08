import { getSkin } from './data/skins.js';
import { getBeijingDateKey, getWeekKey } from './core/daily.js';
import { MAX_RECENT_QUESTIONS } from './core/types.js';
import {
  clearAll as clearStorage,
  clearSnapshot,
  createDefaultProfile,
  saveProfile,
  saveSnapshot,
} from './services/storage.js';

/**
 * 全局状态与玩家资料。
 * 保持示例工程中 DataBus 的定位：页面读取它，服务层负责持久化。
 */
export default class DataBus {
  constructor({ profile, config, snapshot = null, launchQuery = {} } = {}) {
    this.profile = profile || createDefaultProfile();
    this.config = config || {};
    this.currentRun = null;
    this.snapshot = snapshot || null;
    this.launchQuery = launchQuery || {};
    this.lastRunUnlockedCount = 0;
    this.ensurePeriods();
  }

  /**
   * 统一处理周榜 / 日榜 / 广告日计数的时间边界。
   */
  ensurePeriods(now = new Date()) {
    const weekKey = getWeekKey(now);
    if (!this.profile.leaderboard) {
      this.profile.leaderboard = {
        weekKey,
        weekBest: 0,
        weekDurationMs: 0,
        totalBest: 0,
        totalDurationMs: 0,
        dailyBest: 0,
        dailyDurationMs: 0,
      };
      this.save();
    } else if (this.profile.leaderboard.weekKey !== weekKey) {
      this.profile.leaderboard.weekKey = weekKey;
      this.profile.leaderboard.weekBest = 0;
      this.profile.leaderboard.weekDurationMs = 0;
      this.save();
    }
    this.ensureDaily(now);
    this.ensureAdDay(now);
  }

  getTheme() {
    return this.getSkin().theme;
  }

  getSkin() {
    return getSkin(this.profile.equippedSkin);
  }

  getConfig() {
    return this.config;
  }

  save() {
    saveProfile(this.profile);
  }

  replaceProfile(profile) {
    this.profile = profile || createDefaultProfile();
    this.ensurePeriods();
    this.save();
  }

  // ------------------------------------------------------------
  // 每日挑战与广告日期边界
  // ------------------------------------------------------------
  ensureDaily(now = new Date()) {
    const dateKey = getBeijingDateKey(now);
    if (!this.profile.daily || this.profile.daily.dateKey !== dateKey) {
      this.profile.daily = {
        dateKey,
        attempts: 0,
        bestScore: 0,
        rewarded: false,
        adUsed: false,
        questionIds: [],
        started: false,
      };
      if (this.profile.leaderboard) {
        this.profile.leaderboard.dailyBest = 0;
        this.profile.leaderboard.dailyDurationMs = 0;
      }
      this.save();
    }
    return this.profile.daily;
  }

  getDailyInfo() {
    const daily = this.ensureDaily();
    return {
      ...daily,
      freeAvailable: daily.attempts === 0,
      adAvailable: daily.attempts === 1 && !daily.adUsed,
      exhausted: daily.attempts >= 2,
    };
  }

  markDailyAttempt(method = 'free') {
    const daily = this.ensureDaily();
    if (method === 'ad') {
      daily.adUsed = true;
      daily.attempts = 2;
    } else {
      daily.attempts = Math.max(1, daily.attempts);
    }
    daily.started = true;
    this.save();
    return daily;
  }

  setDailyQuestionIds(ids) {
    const daily = this.ensureDaily();
    daily.questionIds = Array.isArray(ids) ? ids.slice() : [];
    this.save();
    return daily.questionIds;
  }

  markDailyRewarded() {
    const daily = this.ensureDaily();
    daily.rewarded = true;
    this.save();
  }

  updateDailyBest(score) {
    const daily = this.ensureDaily();
    daily.bestScore = Math.max(daily.bestScore || 0, score || 0);
    this.save();
  }

  ensureAdDay(now = new Date()) {
    const dateKey = getBeijingDateKey(now);
    if (!this.profile.adDaily || this.profile.adDaily.dateKey !== dateKey) {
      this.profile.adDaily = { dateKey, count: 0 };
      this.save();
    }
    return this.profile.adDaily;
  }

  // ------------------------------------------------------------
  // 剧情关卡进度
  // ------------------------------------------------------------
  ensureStory() {
    if (!this.profile.story || typeof this.profile.story !== 'object') {
      this.profile.story = { started: false, currentLevel: 1, completedLevels: {} };
    }
    if (!this.profile.story.completedLevels || typeof this.profile.story.completedLevels !== 'object') {
      this.profile.story.completedLevels = {};
    }
    this.profile.story.currentLevel = Math.max(1, Number(this.profile.story.currentLevel) || 1);
    return this.profile.story;
  }

  getStoryProgress() {
    return this.ensureStory();
  }

  isLevelCompleted(levelId) {
    return !!this.ensureStory().completedLevels[Number(levelId)];
  }

  getLevelRecord(levelId) {
    return this.ensureStory().completedLevels[Number(levelId)] || null;
  }

  markStoryStarted() {
    const story = this.ensureStory();
    if (!story.started) {
      story.started = true;
      this.save();
    }
  }

  /**
   * 供 grantRunClaim 在同一次保存中调用；不单独保存。
   */
  applyStoryCompletion(run, claim) {
    if (!run || run.mode !== 'level' || !run.levelId || !claim || !claim.win) return;
    const story = this.ensureStory();
    const levelId = Number(run.levelId);
    const score = claim.score || 0;
    const prev = story.completedLevels[levelId];
    const bestScore = Math.max(score, prev ? prev.bestScore || prev.score || 0 : 0);

    if (!prev) {
      story.completedLevels[levelId] = {
        completedAt: Date.now(),
        score,
        correct: claim.correctCount || 0,
        durationMs: claim.durationMs || 0,
        bestScore,
      };
    } else {
      story.completedLevels[levelId] = {
        ...prev,
        score: Math.max(score, prev.score || 0),
        correct: Math.max(claim.correctCount || 0, prev.correct || 0),
        durationMs: claim.durationMs || prev.durationMs || 0,
        bestScore,
        lastCompletedAt: Date.now(),
      };
    }

    story.currentLevel = Math.max(story.currentLevel || 1, levelId + 1);
    story.started = true;
  }

  // ------------------------------------------------------------
  // 梗币与图鉴
  // ------------------------------------------------------------
  addCoins(amount, reason = '') {
    const value = Math.max(0, Math.round(amount || 0));
    if (!value) return 0;
    this.profile.coins = Math.max(0, (this.profile.coins || 0) + value);
    this.profile.stats.totalCoinsEarned = (this.profile.stats.totalCoinsEarned || 0) + value;
    this.profile.lastCoinReason = reason;
    this.save();
    return value;
  }

  spendCoins(amount) {
    const value = Math.max(0, Math.round(amount || 0));
    if ((this.profile.coins || 0) < value) return false;
    this.profile.coins -= value;
    this.save();
    return true;
  }

  isUnlocked(questionId) {
    return !!this.profile.collection[questionId];
  }

  unlockCollection(questionId) {
    if (!questionId || this.profile.collection[questionId]) return false;
    this.profile.collection[questionId] = Date.now();
    this.save();
    return true;
  }

  getCollectionCount() {
    return Object.keys(this.profile.collection || {}).length;
  }

  mergeRecentQuestions(questionIds) {
    const merged = [];
    const seen = new Set();
    const combined = [...(this.profile.recentQuestionIds || []), ...(questionIds || [])];
    for (let i = combined.length - 1; i >= 0; i -= 1) {
      const id = combined[i];
      if (!seen.has(id)) {
        seen.add(id);
        merged.unshift(id);
      }
    }
    this.profile.recentQuestionIds = merged.slice(-MAX_RECENT_QUESTIONS);
  }

  recordRecentQuestions(questionIds) {
    this.mergeRecentQuestions(questionIds);
    this.save();
  }

  // ------------------------------------------------------------
  // 结算与排行榜
  // ------------------------------------------------------------
  /**
   * 更新本局统计与排行榜，不负责保存。
   */
  updateRunStats(run, claim) {
    const previousBest = this.profile.bestScore || 0;
    const score = claim.score || 0;
    const durationMs = claim.durationMs || 0;
    const win = !!claim.win;

    this.profile.totalRuns = (this.profile.totalRuns || 0) + 1;
    if (win) this.profile.wins = (this.profile.wins || 0) + 1;
    this.profile.totalCorrect = (this.profile.totalCorrect || 0) + (claim.correctCount || 0);
    this.profile.bestScore = Math.max(previousBest, score);
    this.profile.firstRuns = (this.profile.firstRuns || 0) + 1;

    if (run.mode === 'daily') {
      this.profile.stats.dailyRuns = (this.profile.stats.dailyRuns || 0) + 1;
      const daily = this.ensureDaily();
      daily.bestScore = Math.max(daily.bestScore || 0, score);
    } else if (run.mode === 'level') {
      this.profile.stats.levelRuns = (this.profile.stats.levelRuns || 0) + 1;
    } else {
      this.profile.stats.classicRuns = (this.profile.stats.classicRuns || 0) + 1;
    }
    this.profile.stats.adWatched = (this.profile.stats.adWatched || 0) + (claim.adWatched || 0);

    const lb = this.profile.leaderboard;
    const weekKey = getWeekKey();
    if (lb.weekKey !== weekKey) {
      lb.weekKey = weekKey;
      lb.weekBest = 0;
      lb.weekDurationMs = 0;
    }
    if (
      score > (lb.weekBest || 0) ||
      (score === lb.weekBest && (!lb.weekDurationMs || durationMs < lb.weekDurationMs))
    ) {
      lb.weekBest = score;
      lb.weekDurationMs = durationMs;
    }
    if (
      score > (lb.totalBest || 0) ||
      (score === lb.totalBest && (!lb.totalDurationMs || durationMs < lb.totalDurationMs))
    ) {
      lb.totalBest = score;
      lb.totalDurationMs = durationMs;
    }
    if (run.mode === 'daily') {
      if (
        score > (lb.dailyBest || 0) ||
        (score === lb.dailyBest && (!lb.dailyDurationMs || durationMs < lb.dailyDurationMs))
      ) {
        lb.dailyBest = score;
        lb.dailyDurationMs = durationMs;
      }
    }

    this.mergeRecentQuestions(run.questionIds);

    return {
      isNewBest: score > previousBest,
      previousBest,
    };
  }

  recordRun(run, claim) {
    const result = this.updateRunStats(run, claim);
    this.applyStoryCompletion(run, claim);
    this.save();
    return result;
  }

  /**
   * 结算幂等账本：同一个 runId 只允许入账一次。
   * 账本、梗币与统计在同一次本地写入中保存，降低“发奖后被系统杀掉”的重复发奖风险。
   */
  getClaimedRun(runId) {
    if (!runId || !this.profile.claimedRuns) return null;
    return this.profile.claimedRuns[runId] || null;
  }

  grantRunClaim(run, claim, options = {}) {
    if (!run || !claim) return { ok: false, code: 'INVALID_CLAIM' };

    this.profile.claimedRuns = this.profile.claimedRuns || {};
    const existing = this.profile.claimedRuns[run.id];
    if (existing) {
      return { ok: false, code: 'ALREADY_CLAIMED', record: existing };
    }

    const record = {
      runId: run.id,
      mode: run.mode,
      win: !!claim.win,
      score: claim.score || 0,
      correctCount: claim.correctCount || 0,
      baseCoins: claim.baseCoins || 0,
      dailyBonus: claim.dailyBonus || 0,
      totalCoins: claim.totalCoins || 0,
      doubled: !!claim.doubled,
      durationMs: claim.durationMs || 0,
      unlockedCount: options.unlockedCount || 0,
      claimedAt: Date.now(),
    };
    this.profile.claimedRuns[run.id] = record;

    if (run.mode === 'daily' && record.dailyBonus > 0) {
      const daily = this.ensureDaily();
      daily.rewarded = true;
    }

    const coins = Math.max(0, Math.round(record.totalCoins));
    this.profile.coins = Math.max(0, (this.profile.coins || 0) + coins);
    this.profile.stats.totalCoinsEarned = (this.profile.stats.totalCoinsEarned || 0) + coins;

    const stats = this.updateRunStats(run, claim);
    // 通关剧情关卡与发奖在同一次本地保存中完成
    this.applyStoryCompletion(run, claim);

    const ledgerKeys = Object.keys(this.profile.claimedRuns);
    if (ledgerKeys.length > 200) {
      const sorted = ledgerKeys
        .map((key) => [key, this.profile.claimedRuns[key] || {}])
        .sort((a, b) => (a[1].claimedAt || 0) - (b[1].claimedAt || 0));
      sorted.slice(0, sorted.length - 200).forEach(([key]) => {
        delete this.profile.claimedRuns[key];
      });
    }

    this.save();
    return { ok: true, ...stats, record };
  }

  grantDouble(runId, extraCoins) {
    const record = this.getClaimedRun(runId);
    if (!record) return { ok: false, code: 'NO_CLAIM' };
    if (record.doubled) return { ok: false, code: 'ALREADY_DOUBLED', record };

    const coins = Math.max(0, Math.round(extraCoins || 0));
    record.doubled = true;
    record.doubleCoins = coins;
    record.totalCoins = (record.totalCoins || 0) + coins;
    this.profile.coins = Math.max(0, (this.profile.coins || 0) + coins);
    this.profile.stats.totalCoinsEarned = (this.profile.stats.totalCoinsEarned || 0) + coins;
    this.save();
    return { ok: true, record };
  }

  getLeaderboardProfile(period = 'week') {
    this.ensurePeriods();
    const lb = this.profile.leaderboard;
    if (period === 'daily') {
      return {
        score: lb.dailyBest || 0,
        durationMs: lb.dailyDurationMs || 0,
        nickname: this.profile.nickname,
      };
    }
    if (period === 'total') {
      return {
        score: lb.totalBest || 0,
        durationMs: lb.totalDurationMs || 0,
        nickname: this.profile.nickname,
      };
    }
    return {
      score: lb.weekBest || 0,
      durationMs: lb.weekDurationMs || 0,
      nickname: this.profile.nickname,
    };
  }

  // ------------------------------------------------------------
  // 皮肤与设置
  // ------------------------------------------------------------
  buySkin(skin, price) {
    if (!skin) return { ok: false, code: 'INVALID_SKIN' };
    if (this.profile.ownedSkins.includes(skin.id)) {
      this.profile.equippedSkin = skin.id;
      this.save();
      return { ok: true, code: 'EQUIPPED', owned: true };
    }
    if ((this.profile.coins || 0) < price) {
      return { ok: false, code: 'NOT_ENOUGH_COINS' };
    }
    this.profile.coins -= price;
    this.profile.ownedSkins.push(skin.id);
    this.profile.equippedSkin = skin.id;
    this.save();
    return { ok: true, code: 'BOUGHT', owned: true };
  }

  equipSkin(skinId) {
    if (!this.profile.ownedSkins.includes(skinId)) return false;
    this.profile.equippedSkin = skinId;
    this.save();
    return true;
  }

  setNickname(nickname) {
    const value = String(nickname || '').trim();
    if (value.length < 2 || value.length > 12) return false;
    this.profile.nickname = value;
    this.save();
    return true;
  }

  setSetting(key, value) {
    if (!key) return;
    this.profile.settings[key] = value;
    this.save();
  }

  // ------------------------------------------------------------
  // 当前局与快照
  // ------------------------------------------------------------
  setRun(run) {
    if (!run) {
      this.currentRun = null;
      this.lastRunUnlockedCount = 0;
      return;
    }
    // 同一局的快照持久化不应重置本局图鉴解锁计数
    if (!this.currentRun || this.currentRun.id !== run.id) {
      this.lastRunUnlockedCount = 0;
    }
    this.currentRun = run;
  }

  getRun() {
    return this.currentRun;
  }

  clearRun() {
    this.currentRun = null;
  }

  hasSnapshot() {
    return !!this.snapshot;
  }

  getSnapshot() {
    return this.snapshot;
  }

  setSnapshot(snapshot) {
    this.snapshot = snapshot || null;
    if (snapshot) saveSnapshot(snapshot);
    else clearSnapshot();
  }

  clearSnapshot() {
    this.snapshot = null;
    clearSnapshot();
  }

  noteUnlocked() {
    this.lastRunUnlockedCount += 1;
  }

  // ------------------------------------------------------------
  // 清除数据
  // ------------------------------------------------------------
  resetAll() {
    clearStorage();
    this.profile = createDefaultProfile();
    this.currentRun = null;
    this.snapshot = null;
    this.lastRunUnlockedCount = 0;
    this.ensurePeriods();
    this.save();
    return this.profile;
  }

  getLaunchQuery() {
    return this.launchQuery || {};
  }
}
