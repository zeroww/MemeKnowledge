import { sz } from '../render.js';
import {
  clamp,
  drawText,
  fillCircle,
  fillRoundRect,
  font,
  hexToRgba,
  pointInRect,
  strokeRoundRect,
  wrapText,
} from './draw.js';

export default class OptionCard {
  constructor(options = {}) {
    this.id = options.id;
    this.text = options.text || '';
    this.letter = options.letter || '';
    this.onSelect = options.onSelect || null;
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
    this.state = 'normal'; // normal | correct | wrong | muted | removed
    this.pressed = false;
    this.disabled = false;
  }

  setRect(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  setState(state) {
    this.state = state;
    if (state !== 'normal') this.pressed = false;
  }

  setDisabled(disabled) {
    this.disabled = !!disabled;
    if (this.disabled) this.pressed = false;
  }

  contains(x, y) {
    return pointInRect(x, y, this.x, this.y, this.w, this.h);
  }

  onTouchStart(x, y) {
    if (this.state === 'removed' || this.state === 'correct' || this.state === 'wrong' || this.state === 'muted') {
      return false;
    }
    if (this.disabled) return false;
    if (!this.contains(x, y)) return false;
    this.pressed = true;
    return true;
  }

  onTouchEnd(x, y) {
    const hit = this.pressed && this.contains(x, y);
    this.pressed = false;
    if (hit && this.onSelect) {
      this.onSelect(this.id);
      return true;
    }
    return false;
  }

  cancel() {
    this.pressed = false;
  }

  render(ctx, theme) {
    if (this.state === 'removed') return;

    let bg = hexToRgba(theme.panelSoft, 0.94);
    let border = this.pressed ? theme.accent : theme.line;
    let textColor = theme.text;
    let letterBg = hexToRgba(theme.primary, 0.18);
    let letterColor = theme.accent;
    let alpha = 1;

    if (this.state === 'correct') {
      bg = hexToRgba(theme.success, 0.2);
      border = theme.success;
      letterBg = theme.success;
      letterColor = '#ffffff';
    } else if (this.state === 'wrong') {
      bg = hexToRgba(theme.danger, 0.2);
      border = theme.danger;
      letterBg = theme.danger;
      letterColor = '#ffffff';
    } else if (this.state === 'muted') {
      alpha = 0.42;
    }

    const radius = sz(13);
    const padX = sz(12);
    const letterSize = clamp(sz(28), 24, this.h - sz(12));
    const gap = sz(10);
    const textX = this.x + padX + letterSize + gap;
    const textW = this.w - (textX - this.x) - padX;
    const fontSize = this.h < sz(54) ? sz(13.5) : sz(15);
    const lineHeight = fontSize * 1.32;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.pressed) {
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      ctx.translate(cx, cy);
      ctx.scale(0.988, 0.988);
      ctx.translate(-cx, -cy);
    }

    fillRoundRect(ctx, this.x, this.y, this.w, this.h, radius, bg);
    strokeRoundRect(ctx, this.x, this.y, this.w, this.h, radius, border, this.pressed ? 1.5 : 1);

    const letterX = this.x + padX + letterSize / 2;
    const letterY = this.y + this.h / 2;
    fillCircle(ctx, letterX, letterY, letterSize / 2, letterBg);
    drawText(ctx, this.letter, letterX, letterY + 1, {
      font: font(letterSize * 0.48, '700'),
      color: letterColor,
      align: 'center',
      baseline: 'middle',
    });

    ctx.font = font(fontSize, '500');
    const lines = wrapText(ctx, this.text, textW, 2);
    const totalHeight = lines.length * lineHeight;
    const startY = this.y + this.h / 2 - totalHeight / 2 + lineHeight / 2;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => {
      ctx.fillText(line, textX, startY + index * lineHeight);
    });

    ctx.restore();
  }
}
