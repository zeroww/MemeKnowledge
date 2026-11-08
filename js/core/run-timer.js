/**
 * 防漂移倒计时。
 * 不采用“每秒减一”，而是保存截止时间戳，按 Date.now() 计算剩余时间。
 * 暂停时保存剩余毫秒，恢复时重建截止时间。
 */
export default class RunTimer {
  constructor(onTick, onTimeout, options = {}) {
    this.onTick = onTick || (() => {});
    this.onTimeout = onTimeout || (() => {});
    this.now = options.now || (() => Date.now());
    this.schedule = options.schedule || ((fn, ms) => setTimeout(fn, ms));
    this.clear = options.clear || ((id) => clearTimeout(id));

    this.timerId = null;
    this.deadline = 0;
    this.remainingMs = 0;
    this.running = false;
    this.timeoutFired = false;
    this.lastSec = -1;
  }

  start(seconds) {
    this.startWithMs(Math.max(0, seconds * 1000));
  }

  startWithMs(ms) {
    this.stop();
    this.remainingMs = Math.max(0, ms);
    this.deadline = this.now() + this.remainingMs;
    this.running = true;
    this.timeoutFired = false;
    this.lastSec = -1;
    this.tick();
  }

  tick() {
    if (!this.running) return;

    const left = this.deadline - this.now();
    if (left <= 0) {
      this.running = false;
      this.remainingMs = 0;
      if (!this.timeoutFired) {
        this.timeoutFired = true;
        this.onTick(0, 0);
        this.onTimeout();
      }
      return;
    }

    const sec = Math.ceil(left / 1000);
    if (sec !== this.lastSec) {
      this.lastSec = sec;
      this.onTick(sec, left);
    }
    this.timerId = this.schedule(() => this.tick(), 200);
  }

  pause() {
    if (!this.running) return;
    this.remainingMs = Math.max(0, this.deadline - this.now());
    this.stop();
  }

  resume() {
    if (this.running || this.remainingMs <= 0) return;
    this.deadline = this.now() + this.remainingMs;
    this.running = true;
    this.tick();
  }

  add(seconds) {
    const delta = Math.max(0, seconds * 1000);
    this.remainingMs += delta;
    if (this.running) {
      this.deadline += delta;
    }
  }

  stop() {
    if (this.timerId !== null) {
      this.clear(this.timerId);
      this.timerId = null;
    }
    this.running = false;
  }

  getRemainingMs() {
    if (!this.running) return Math.max(0, this.remainingMs);
    return Math.max(0, this.deadline - this.now());
  }

  getRemainingSec() {
    return Math.ceil(this.getRemainingMs() / 1000);
  }

  isRunning() {
    return this.running;
  }
}
