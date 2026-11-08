import {
  CONTENT_WIDTH,
  CONTENT_X,
  SAFE_BOTTOM,
  SAFE_TOP,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  sz,
} from '../render.js';

export default class BaseScreen {
  constructor(app) {
    this.app = app;
    this.params = {};
    this.enterAt = Date.now();
    this.time = 0;
    this.buttons = [];
    this.pressedButton = null;
  }

  enter(params = {}) {
    this.params = params || {};
    this.enterAt = Date.now();
    this.time = 0;
    this.pressedButton = null;
    this.onEnter();
  }

  leave() {
    this.onLeave();
  }

  onEnter() {}
  onLeave() {}
  update() {}
  render() {}
  onTouchStart() {}
  onTouchMove() {}
  onTouchEnd() {}
  onHide() {}
  onShow() {}

  get theme() {
    return this.app.databus.getTheme();
  }

  get profile() {
    return this.app.databus.profile;
  }

  get contentX() {
    return CONTENT_X;
  }

  get contentW() {
    return CONTENT_WIDTH;
  }

  get top() {
    return SAFE_TOP;
  }

  get bottom() {
    return SCREEN_HEIGHT - SAFE_BOTTOM;
  }

  handleButtonTouchStart(x, y) {
    this.pressedButton = null;
    for (const button of this.buttons || []) {
      if (button.onTouchStart && button.onTouchStart(x, y)) {
        this.pressedButton = button;
        return true;
      }
    }
    return false;
  }

  handleButtonTouchEnd(x, y) {
    if (this.pressedButton) {
      const button = this.pressedButton;
      this.pressedButton = null;
      button.onTouchEnd(x, y);
      return true;
    }
    for (const button of this.buttons || []) {
      if (button.cancel) button.cancel();
    }
    return false;
  }
}
