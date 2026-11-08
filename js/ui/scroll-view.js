import { clamp } from './draw.js';

/**
 * 垂直滚动容器。只在视口内绘制内容，减少大图鉴列表的绘制压力。
 */
export default class ScrollView {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.w = options.w || 0;
    this.h = options.h || 0;
    this.offset = 0;
    this.contentHeight = 0;
    this.velocity = 0;
    this.dragging = false;
    this.startY = 0;
    this.lastY = 0;
    this.startOffset = 0;
    this.moved = false;
  }

  setRect(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.clampOffset();
  }

  setContentHeight(height) {
    this.contentHeight = Math.max(0, height);
    this.clampOffset();
  }

  maxOffset() {
    return Math.max(0, this.contentHeight - this.h);
  }

  clampOffset() {
    this.offset = clamp(this.offset, 0, this.maxOffset());
  }

  reset() {
    this.offset = 0;
    this.velocity = 0;
    this.dragging = false;
    this.moved = false;
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
  }

  onTouchStart(x, y) {
    if (!this.contains(x, y)) return false;
    this.dragging = true;
    this.moved = false;
    this.velocity = 0;
    this.startY = y;
    this.lastY = y;
    this.startOffset = this.offset;
    return true;
  }

  onTouchMove(x, y) {
    if (!this.dragging) return false;
    const delta = y - this.startY;
    if (Math.abs(delta) > 6) this.moved = true;
    this.offset = clamp(this.startOffset - delta, 0, this.maxOffset());
    this.lastY = y;
    return true;
  }

  onTouchEnd(x, y) {
    if (!this.dragging) return false;
    this.dragging = false;
    const delta = y - this.startY;
    if (Math.abs(delta) > 6) {
      this.moved = true;
      this.velocity = -delta * 16;
    } else {
      this.velocity = 0;
    }
    return true;
  }

  update(dt) {
    if (this.dragging || this.maxOffset() <= 0) return;
    if (Math.abs(this.velocity) < 4) {
      this.velocity = 0;
      return;
    }
    this.offset += this.velocity * dt;
    this.velocity *= Math.exp(-7 * dt);
    if (this.offset < 0 || this.offset > this.maxOffset()) this.velocity = 0;
    this.clampOffset();
  }

  render(ctx, drawContent) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.w, this.h);
    ctx.clip();
    drawContent(ctx, this.offset, this);
    ctx.restore();

    const max = this.maxOffset();
    if (max > 0) {
      const trackX = this.x + this.w - 3;
      const trackH = this.h - 8;
      const thumbH = Math.max(24, (this.h / this.contentHeight) * trackH);
      const thumbY = this.y + 4 + (this.offset / max) * (trackH - thumbH);
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(trackX, this.y + 4, 2, trackH);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(trackX, thumbY, 2, thumbH);
      ctx.restore();
    }
  }
}
