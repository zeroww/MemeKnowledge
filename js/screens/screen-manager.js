export default class ScreenManager {
  constructor(app, screens) {
    this.app = app;
    this.screens = screens || {};
    this.current = null;
    this.currentName = '';
  }

  navigate(name, params = {}) {
    const next = this.screens[name];
    if (!next) {
      console.warn(`[screen] not found: ${name}`);
      return false;
    }
    if (this.current && this.current.leave) this.current.leave();
    this.current = next;
    this.currentName = name;
    if (next.enter) next.enter(params || {});
    // 对话/菜单场景轻松，答题场景紧张
    if (this.app && this.app.audio) {
      this.app.audio.setBgmScene(name);
    }
    return true;
  }

  update(dt) {
    if (this.current && this.current.update) this.current.update(dt);
  }

  render(ctx) {
    if (this.current && this.current.render) this.current.render(ctx);
  }

  onTouchStart(x, y) {
    if (this.current && this.current.onTouchStart) return this.current.onTouchStart(x, y);
    return false;
  }

  onTouchMove(x, y) {
    if (this.current && this.current.onTouchMove) return this.current.onTouchMove(x, y);
    return false;
  }

  onTouchEnd(x, y) {
    if (this.current && this.current.onTouchEnd) return this.current.onTouchEnd(x, y);
    return false;
  }

  onHide() {
    if (this.current && this.current.onHide) this.current.onHide();
  }

  onShow() {
    if (this.current && this.current.onShow) this.current.onShow();
  }
}
