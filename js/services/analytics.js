import { STORAGE_KEYS } from '../core/types.js';

class Analytics {
  constructor() {
    this.events = [];
    this.sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    this.lastFlushAt = 0;
    this.load();
  }

  load() {
    try {
      const saved = wx.getStorageSync(STORAGE_KEYS.EVENTS);
      this.events = Array.isArray(saved) ? saved : [];
    } catch (error) {
      this.events = [];
    }
  }

  track(name, props = {}) {
    const event = {
      name,
      props: { ...props },
      sessionId: this.sessionId,
      ts: Date.now(),
    };
    this.events.push(event);
    if (this.events.length > 300) {
      this.events.splice(0, this.events.length - 300);
    }

    if (
      name.startsWith('ad_') ||
      name === 'run_end' ||
      name === 'claim_result' ||
      name === 'run_start' ||
      name === 'daily_finish'
    ) {
      console.debug(`[analytics] ${name}`, props);
    }

    this.flushThrottled();
    return event;
  }

  flush() {
    try {
      wx.setStorageSync(STORAGE_KEYS.EVENTS, this.events.slice(-300));
      this.lastFlushAt = Date.now();
    } catch (error) {
      // 埋点失败不阻塞游戏
    }
  }

  flushThrottled() {
    if (Date.now() - this.lastFlushAt > 2000) this.flush();
  }

  getRecent(count = 50) {
    return this.events.slice(-count);
  }

  clear() {
    this.events = [];
    this.flush();
  }
}

export const analytics = new Analytics();
export default analytics;
