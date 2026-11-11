import { sz } from '../render.js';
import { clamp, drawText, fillCircle, font, hexToRgba } from './draw.js';

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
    const pulse = urgent ? 0.5 + Math.sin(time * 8) * 0.5 : 0;
    const color = urgent ? theme.danger : '#2f8ce8';
    const lineWidth = sz(5);

    if (urgent) {
      ctx.save();
      ctx.globalAlpha = 0.18 + pulse * 0.18;
      fillCircle(ctx, this.x, this.y, this.r + sz(5) + pulse * sz(2), color);
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(80, 130, 180, 0.22)';
    ctx.shadowBlur = sz(14);
    ctx.shadowOffsetY = sz(4);
    fillCircle(ctx, this.x, this.y, this.r, '#ffffff');
    ctx.restore();

    const inner = ctx.createRadialGradient(
      this.x - this.r * 0.35,
      this.y - this.r * 0.45,
      this.r * 0.1,
      this.x,
      this.y,
      this.r
    );
    inner.addColorStop(0, '#ffffff');
    inner.addColorStop(1, '#eef8ff');
    fillCircle(ctx, this.x, this.y, this.r - sz(1.5), inner);

    ctx.beginPath();
    ctx.arc(
      this.x,
      this.y,
      this.r - lineWidth / 2 - sz(1),
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = '#dceaf7';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    const endAngle = -Math.PI / 2 + Math.PI * 2 * progress;
    ctx.beginPath();
    ctx.arc(
      this.x,
      this.y,
      this.r - lineWidth / 2 - sz(1),
      -Math.PI / 2,
      endAngle
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = hexToRgba(color, 0.7);
    ctx.shadowBlur = sz(6);
    fillCircle(
      ctx,
      this.x + Math.cos(endAngle) * (this.r - lineWidth / 2 - sz(1)),
      this.y + Math.sin(endAngle) * (this.r - lineWidth / 2 - sz(1)),
      sz(2.6),
      color
    );
    ctx.restore();

    drawText(ctx, String(Math.ceil(rawRemaining)), this.x, this.y - sz(2), {
      font: font(this.r * 0.8, '900'),
      color: '#1f4e9c',
      align: 'center',
      baseline: 'middle',
    });
    drawText(ctx, '秒', this.x, this.y + this.r * 0.42, {
      font: font(this.r * 0.32, '700'),
      color,
      align: 'center',
      baseline: 'middle',
    });
  }
}
