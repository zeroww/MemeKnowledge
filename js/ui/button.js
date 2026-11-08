import { sz } from '../render.js';
import {
  clamp,
  contrastText,
  drawText,
  fillRoundRect,
  font,
  hexToRgba,
  pointInRect,
  strokeRoundRect,
} from './draw.js';

export default class Button {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.w = options.w || 0;
    this.h = options.h || 0;
    this.label = options.label || '';
    this.subLabel = options.subLabel || '';
    this.icon = options.icon || '';
    this.style = options.style || 'primary';
    this.onClick = options.onClick || null;
    this.disabled = !!options.disabled;
    this.pressed = false;
    this.radius = options.radius || sz(14);
    this.fontSize = options.fontSize || sz(15);
    this.subFontSize = options.subFontSize || sz(11);
    this.visible = options.visible !== false;
  }

  setRect(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  setDisabled(disabled) {
    this.disabled = !!disabled;
    if (this.disabled) this.pressed = false;
  }

  setLabel(label, subLabel = this.subLabel) {
    this.label = label;
    if (subLabel !== undefined) this.subLabel = subLabel;
  }

  contains(x, y) {
    return this.visible && pointInRect(x, y, this.x, this.y, this.w, this.h);
  }

  onTouchStart(x, y) {
    if (!this.visible || this.disabled) return false;
    if (!this.contains(x, y)) return false;
    this.pressed = true;
    return true;
  }

  onTouchEnd(x, y) {
    if (!this.visible || this.disabled) {
      this.pressed = false;
      return false;
    }
    const hit = this.pressed && this.contains(x, y);
    this.pressed = false;
    if (hit && this.onClick) {
      this.onClick();
      return true;
    }
    return false;
  }

  cancel() {
    this.pressed = false;
  }

  render(ctx, theme) {
    if (!this.visible) return;

    const style = this.style;
    const pressedScale = this.pressed && !this.disabled ? 0.97 : 1;
    const alpha = this.disabled ? 0.4 : 1;

    let bg = theme.primary;
    let border = null;
    let textColor = contrastText(bg);

    if (style === 'secondary') {
      bg = hexToRgba(theme.panelSoft, 0.95);
      border = theme.line;
      textColor = theme.text;
    } else if (style === 'ghost') {
      bg = 'rgba(0,0,0,0)';
      border = theme.line;
      textColor = theme.text;
    } else if (style === 'gold') {
      bg = theme.accent;
      textColor = contrastText(bg);
    } else if (style === 'danger') {
      bg = theme.danger;
      textColor = '#ffffff';
    } else if (style === 'success') {
      bg = theme.success;
      textColor = '#ffffff';
    } else if (style === 'dark') {
      bg = hexToRgba('#000000', 0.55);
      border = theme.line;
      textColor = theme.text;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    if (pressedScale !== 1) {
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      ctx.translate(cx, cy);
      ctx.scale(pressedScale, pressedScale);
      ctx.translate(-cx, -cy);
    }

    if (bg !== 'rgba(0,0,0,0)') {
      fillRoundRect(ctx, this.x, this.y, this.w, this.h, this.radius, bg);
    }
    if (border) {
      strokeRoundRect(ctx, this.x, this.y, this.w, this.h, this.radius, border, 1);
    }

    const hasSub = !!this.subLabel;
    const labelY = hasSub ? this.y + this.h * 0.4 : this.y + this.h / 2;
    const text = this.icon ? `${this.icon} ${this.label}` : this.label;

    ctx.font = font(this.fontSize, '700');
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), this.x + this.w / 2, labelY);

    if (hasSub) {
      ctx.font = font(this.subFontSize, '400');
      ctx.fillStyle = hexToRgba(textColor, 0.78);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(this.subLabel), this.x + this.w / 2, this.y + this.h * 0.7);
    }

    ctx.restore();
  }
}
