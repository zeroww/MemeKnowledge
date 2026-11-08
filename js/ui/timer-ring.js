import { sz } from '../render.js';
import { clamp, drawText, fillCircle, font, hexToRgba, strokeCircle } from './draw.js';

export default class TimerRing {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.r = options.r || sz(22);
  }

  setCenter(x, y, r = this.r) {
    this.x = x;
    this.y = y;
    this.r = r;
  }

  render(ctx, theme, remainingSec, totalSec, time = 0) {
    const safeTotal = Math.max(1, totalSec || 1);
    const rawRemaining = Math.max(0, remainingSec || 0);
    const remaining = clamp(rawRemaining, 0, safeTotal);
    const progress = remaining / safeTotal;
    const urgent = rawRemaining <= 5;
    const color = urgent ? theme.danger : theme.accent;
    const lineWidth = sz(5) + (urgent ? Math.sin(time * 7) * 0.8 : 0);

    fillCircle(ctx, this.x, this.y, this.r, hexToRgba(theme.panel, 0.92));
    strokeCircle(ctx, this.x, this.y, this.r, hexToRgba(theme.line, 0.9), sz(2));

    ctx.beginPath();
    ctx.arc(
      this.x,
      this.y,
      this.r - lineWidth / 2,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * progress
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    drawText(ctx, String(Math.ceil(rawRemaining)), this.x, this.y - 1, {
      font: font(this.r * 0.78, '800'),
      color,
      align: 'center',
      baseline: 'middle',
    });
    drawText(ctx, '秒', this.x, this.y + this.r * 0.48, {
      font: font(this.r * 0.34, '500'),
      color: hexToRgba(color, 0.78),
      align: 'center',
      baseline: 'middle',
    });
  }
}
