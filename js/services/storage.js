import { STORAGE_KEYS, SNAPSHOT_TTL_MS } from '../core/types.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeGet(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    if (value === '' || value === undefined || value === null) return fallback;
    return value;
  } catch (error) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

function safeRemove(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (error) {
    return false;
  }
}

function mergeDeep(base, extra) {
  if (Array.isArray(base)) {
    return Array.isArray(extra) ? extra.slice() : base.slice();
  }
  if (base && typeof base === 'object') {
    const result = { ...base };
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      Object.keys(extra).forEach((key) => {
        result[key] = key in base ? mergeDeep(base[key], extra[key]) : extra[key];
      });
    }
    return result;
  }
  return extra === undefined ? base : extra;
}

export function createDefaultProfile() {
  const now = Date.now();
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return {
    schemaVersion: 1,
    nickname: `梗王#${suffix}`,
    coins: 300,
    bestScore: 0,
    totalRuns: 0,
    wins: 0,
    totalCorrect: 0,
    collection: {},
    ownedSkins: ['default'],
    equippedSkin: 'default',
    settings: {
      sound: true,
      bgm: true,
      vibration: true,
    },
    recentQuestionIds: [],
    daily: {
      dateKey: '',
      attempts: 0,
      bestScore: 0,
      rewarded: false,
      adUsed: false,
      questionIds: [],
      started: false,
    },
    adDaily: {
      dateKey: '',
      count: 0,
    },
    leaderboard: {
      weekKey: '',
      weekBest: 0,
      weekDurationMs: 0,
      totalBest: 0,
      totalDurationMs: 0,
      dailyBest: 0,
      dailyDurationMs: 0,
    },
    stats: {
      classicRuns: 0,
      dailyRuns: 0,
      levelRuns: 0,
      adWatched: 0,
      totalCoinsEarned: 0,
    },
    claimedRuns: {},
    story: {
      started: false,
      currentLevel: 1,
      completedLevels: {},
    },
    firstRuns: 0,
    lastInterstitialAt: 0,
    lastAdAt: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function loadProfile() {
  const stored = safeGet(STORAGE_KEYS.PROFILE, null);
  const defaults = createDefaultProfile();
  if (!stored || typeof stored !== 'object') return defaults;

  const profile = mergeDeep(defaults, stored);
  profile.schemaVersion = 1;
  profile.ownedSkins = Array.isArray(profile.ownedSkins) ? profile.ownedSkins : ['default'];
  if (!profile.ownedSkins.includes('default')) profile.ownedSkins.unshift('default');
  profile.recentQuestionIds = Array.isArray(profile.recentQuestionIds) ? profile.recentQuestionIds : [];
  profile.collection = profile.collection && typeof profile.collection === 'object' ? profile.collection : {};
  profile.claimedRuns =
    profile.claimedRuns && typeof profile.claimedRuns === 'object' ? profile.claimedRuns : {};
  profile.story =
    profile.story && typeof profile.story === 'object'
      ? profile.story
      : { started: false, currentLevel: 1, completedLevels: {} };
  profile.story.completedLevels =
    profile.story.completedLevels && typeof profile.story.completedLevels === 'object'
      ? profile.story.completedLevels
      : {};
  profile.story.currentLevel = Math.max(1, Number(profile.story.currentLevel) || 1);
  profile.story.started = !!profile.story.started;
  profile.settings = { ...defaults.settings, ...(profile.settings || {}) };
  profile.daily = { ...defaults.daily, ...(profile.daily || {}) };
  profile.adDaily = { ...defaults.adDaily, ...(profile.adDaily || {}) };
  profile.leaderboard = { ...defaults.leaderboard, ...(profile.leaderboard || {}) };
  profile.stats = { ...defaults.stats, ...(profile.stats || {}) };
  return profile;
}

export function saveProfile(profile) {
  if (!profile) return false;
  profile.updatedAt = Date.now();
  return safeSet(STORAGE_KEYS.PROFILE, clone(profile));
}

export function loadSnapshot() {
  const snapshot = safeGet(STORAGE_KEYS.SNAPSHOT, null);
  if (!snapshot || !snapshot.run || !snapshot.savedAt) return null;
  if (Date.now() - snapshot.savedAt > SNAPSHOT_TTL_MS) {
    clearSnapshot();
    return null;
  }
  return snapshot;
}

export function saveSnapshot(snapshot) {
  if (!snapshot) return false;
  return safeSet(STORAGE_KEYS.SNAPSHOT, clone(snapshot));
}

export function clearSnapshot() {
  return safeRemove(STORAGE_KEYS.SNAPSHOT);
}

export function loadEvents() {
  const events = safeGet(STORAGE_KEYS.EVENTS, []);
  return Array.isArray(events) ? events : [];
}

export function saveEvents(events) {
  return safeSet(STORAGE_KEYS.EVENTS, (events || []).slice(-300));
}

export function loadMeta() {
  const meta = safeGet(STORAGE_KEYS.META, null);
  if (!meta || typeof meta !== 'object') {
    const initial = { schemaVersion: 1, installedAt: Date.now() };
    safeSet(STORAGE_KEYS.META, initial);
    return initial;
  }
  return meta;
}

export function saveMeta(meta) {
  return safeSet(STORAGE_KEYS.META, meta || {});
}

export function clearAll() {
  Object.values(STORAGE_KEYS).forEach((key) => safeRemove(key));
  try {
    const info = wx.getStorageInfoSync();
    const keys = (info && info.keys) || [];
    keys.forEach((key) => {
      if (String(key).startsWith('mw_v1_')) safeRemove(key);
    });
  } catch (error) {
    // ignore
  }
  return true;
}
