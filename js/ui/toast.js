import { SAFE_BOTTOM, SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import { clamp, fillRoundRect, font, wrapText } from './draw.js';

export default class Toast {
  constructor() {
    this.message = '';
    this.startAt = 0;
    this.endAt = 0;
  }

  show(message, duration = 1600) {
    this.message = String(message || '');
    this.startAt = Date.now();
    this.endAt = this.startAt + duration;
  }

  isVisible() {
    return !!this.message && Date.now() < this.endAt;
  }

  render(ctx, theme) {
    if (!this.message) return;
    const now = Date.now();
    if (now >= this.endAt) {
      this.message = '';
      return;
    }

    const fadeIn = clamp((now - this.startAt) / 140, 0, 1);
    const fadeOut = clamp((this.endAt - now) / 260, 0, 1);
    const alpha = Math.min(fadeIn, fadeOut);
    if (alpha <= 0.01) return;

    const maxWidth = SCREEN_WIDTH - sz(64);
    const paddingX = sz(16);
    const paddingY = sz(10);
    const lineHeight = sz(19);
    ctx.font = font(sz(13), '500');
    const lines = wrapText(ctx, this.message, maxWidth - paddingX * 2, 3);
    const panelW = Math.min(
      maxWidth,
      Math.max(sz(120), ...lines.map((line) => ctx.measureText(line).width + paddingX * 2))
    );
    const panelH = lines.length * lineHeight + paddingY * 2;
    const x = (SCREEN_WIDTH - panelW) / 2;
    const y = SCREEN_HEIGHT - SAFE_BOTTOM - sz(26) - panelH;

    ctx.save();
    ctx.globalAlpha = alpha;
    fillRoundRect(ctx, x, y, panelW, panelH, sz(12), 'rgba(10, 11, 14, 0.9)');
    ctx.font = font(sz(13), '500');
    ctx.fillStyle = '#f7f2e7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => {
      ctx.fillText(line, x + panelW / 2, y + paddingY + lineHeight / 2 + index * lineHeight);
    });
    ctx.restore();
  }
}
