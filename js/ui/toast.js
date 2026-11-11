import { SAFE_BOTTOM, SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import {
  clamp,
  fillCircle,
  fillRoundRect,
  font,
  hexToRgba,
  strokeRoundRect,
  wrapText,
} from './draw.js';

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

    const maxWidth = SCREEN_WIDTH - sz(72);
    const paddingX = sz(20);
    const paddingY = sz(11);
    const lineHeight = sz(19);
    ctx.font = font(sz(13), '600');
    const lines = wrapText(ctx, this.message, maxWidth - paddingX * 2, 3);
    const textW = Math.max(...lines.map((line) => ctx.measureText(line).width));
    const panelW = Math.min(maxWidth, Math.max(sz(132), textW + paddingX * 2 + sz(18)));
    const panelH = lines.length * lineHeight + paddingY * 2;
    const x = (SCREEN_WIDTH - panelW) / 2;
    const y = SCREEN_HEIGHT - SAFE_BOTTOM - sz(88) - panelH;
    const rise = (1 - alpha) * sz(8);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, rise);
    ctx.save();
    ctx.shadowColor = 'rgba(58, 122, 180, 0.22)';
    ctx.shadowBlur = sz(18);
    ctx.shadowOffsetY = sz(6);
    fillRoundRect(ctx, x, y, panelW, panelH, sz(18), '#ffffff');
    ctx.restore();
    strokeRoundRect(ctx, x, y, panelW, panelH, sz(18), '#bfe4f8', 1.5);
    fillCircle(ctx, x + sz(14), y + panelH / 2, sz(6), 'rgba(58,151,247,0.16)');
    fillCircle(ctx, x + sz(14), y + panelH / 2, sz(2.8), '#3a97f7');
    ctx.font = font(sz(13), '600');
    ctx.fillStyle = '#1f4e9c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => {
      ctx.fillText(
        line,
        x + panelW / 2 + sz(6),
        y + paddingY + lineHeight / 2 + index * lineHeight
      );
    });
    ctx.restore();
  }
}
