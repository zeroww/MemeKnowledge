import { sz } from '../render.js';
import {
  clamp,
  drawCheckMark,
  drawCrossMark,
  drawText,
  font,
  hexToRgba,
  pointInRect,
  roundRectPath,
  wrapText,
} from './draw.js';

/**
 * 选项卡：参考图的彩色胶囊（A 蓝 / B 绿 / C 橙 / D 紫 / T 浅蓝 / F 粉）。
 * 白色字母徽章 + 果冻高光 + 白色外壳，和按钮保持同一套视觉语言。
 */
const OPTION_STYLES = {
  A: { stops: ['#8fd8ff', '#3a97f7', '#1f74dd'], edge: '#1a63c4', text: '#ffffff' },
  B: { stops: ['#a6ec7e', '#4bcd55', '#2eb43d'], edge: '#279a3a', text: '#ffffff' },
  C: { stops: ['#ffd47a', '#ffa62b', '#ff8a12'], edge: '#e97a08', text: '#ffffff' },
  D: { stops: ['#ddc6ff', '#a97cf2', '#8154de'], edge: '#7045c9', text: '#ffffff' },
  T: { stops: ['#eefaff', '#b8e4ff'], edge: '#8ac4e8', text: '#2f8ce8', light: true },
  F: { stops: ['#fff0f6', '#ffc3dd'], edge: '#f0a0c0', text: '#e8568f', light: true },
};

const FALLBACK = [
  { stops: ['#8fd8ff', '#3a97f7', '#1f74dd'], edge: '#1a63c4', text: '#ffffff' },
  { stops: ['#a6ec7e', '#4bcd55', '#2eb43d'], edge: '#279a3a', text: '#ffffff' },
  { stops: ['#ffd47a', '#ffa62b', '#ff8a12'], edge: '#e97a08', text: '#ffffff' },
  { stops: ['#ddc6ff', '#a97cf2', '#8154de'], edge: '#7045c9', text: '#ffffff' },
];

export default class OptionCard {
  constructor(options = {}) {
    this.id = options.id;
    this.text = options.text || '';
    this.letter = options.letter || '';
    this.index = options.index || 0;
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

  style() {
    return OPTION_STYLES[this.letter] || FALLBACK[this.index % FALLBACK.length];
  }

  render(ctx) {
    if (this.state === 'removed') return;

    const isCorrect = this.state === 'correct';
    const isWrong = this.state === 'wrong';
    const isMuted = this.state === 'muted';
    const base = this.style();
    const light = !!base.light;
    const radius = this.h / 2;
    const rim = clamp(this.h * 0.07, 1.8, 3.4);

    ctx.save();
    ctx.globalAlpha = isMuted ? 0.34 : 1;

    if (this.pressed) {
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      ctx.translate(cx, cy);
      ctx.scale(0.985, 0.96);
      ctx.translate(-cx, -cy);
    }

    // 投影
    ctx.save();
    ctx.shadowColor = isCorrect
      ? 'rgba(53, 184, 74, 0.45)'
      : isWrong
        ? 'rgba(242, 84, 75, 0.45)'
        : hexToRgba(base.edge, 0.3);
    ctx.shadowBlur = this.pressed ? this.h * 0.12 : this.h * 0.34;
    ctx.shadowOffsetY = this.pressed ? this.h * 0.04 : this.h * 0.12;
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.fillStyle = base.stops[1];
    ctx.fill();
    ctx.restore();

    // 白色外壳
    const shell = ctx.createLinearGradient(0, this.y, 0, this.y + this.h);
    shell.addColorStop(0, '#ffffff');
    shell.addColorStop(1, light ? '#effaff' : hexToRgba(base.stops[0], 0.9));
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.fillStyle = shell;
    ctx.fill();

    // 主体
    const innerX = this.x + rim;
    const innerY = this.y + rim;
    const innerW = this.w - rim * 2;
    const innerH = this.h - rim * 2;
    const body = ctx.createLinearGradient(0, innerY, 0, innerY + innerH);
    body.addColorStop(0, base.stops[0]);
    if (light) {
      body.addColorStop(1, base.stops[1]);
    } else {
      body.addColorStop(0.55, base.stops[1]);
      body.addColorStop(1, base.stops[2]);
    }
    roundRectPath(ctx, innerX, innerY, innerW, innerH, Math.max(1, radius - rim));
    ctx.fillStyle = body;
    ctx.fill();

    // 果冻高光
    ctx.save();
    roundRectPath(ctx, innerX, innerY, innerW, innerH, Math.max(1, radius - rim));
    ctx.clip();
    const gloss = ctx.createLinearGradient(0, innerY, 0, innerY + innerH * 0.62);
    gloss.addColorStop(0, 'rgba(255,255,255,0.5)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(innerX, innerY, innerW, innerH * 0.62);

    const shineW = Math.max(2, innerW * 0.26);
    const shineH = Math.max(1.5, innerH * 0.2);
    ctx.save();
    ctx.translate(innerX + innerW * 0.24, innerY + innerH * 0.28);
    ctx.scale(shineW, shineH);
    const shine = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    shine.addColorStop(0, 'rgba(255,255,255,0.75)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // 状态描边
    if (isCorrect || isWrong) {
      const ringColor = isCorrect ? '#2fae44' : '#e8453a';
      roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = Math.max(2.5, this.h * 0.09);
      ctx.stroke();
    }

    // 字母徽章
    const padX = sz(9);
    const badgeSize = Math.min(this.h - sz(10), sz(34));
    const badgeX = this.x + padX + badgeSize / 2;
    const badgeY = this.y + this.h / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = light ? hexToRgba(base.text, 0.14) : 'rgba(255,255,255,0.26)';
    ctx.fill();
    ctx.strokeStyle = light ? hexToRgba(base.text, 0.28) : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    drawText(ctx, this.letter, badgeX, badgeY + 1, {
      font: font(badgeSize * 0.56, '900'),
      color: light ? base.text : '#ffffff',
      align: 'center',
      baseline: 'middle',
    });
    ctx.restore();

    // 选项文字
    const textX = badgeX + badgeSize / 2 + sz(9);
    const stateW = isCorrect || isWrong ? sz(24) : 0;
    const textW = this.x + this.w - sz(10) - stateW - textX;
    const fontSize = this.h < sz(52) ? sz(13) : sz(14.5);
    const lineHeight = fontSize * 1.3;
    const maxLines = this.h > sz(62) ? 2 : 1;
    ctx.font = font(fontSize, '800');
    const lines = wrapText(ctx, this.text, Math.max(sz(20), textW), maxLines);
    const totalH = lines.length * lineHeight;
    const textStartY = this.y + this.h / 2 - totalH / 2 + lineHeight / 2;
    lines.forEach((line, index) => {
      drawText(ctx, line, textX, textStartY + index * lineHeight, {
        font: font(fontSize, '800'),
        color: light ? base.text : '#ffffff',
        baseline: 'middle',
      });
    });

    // 判定徽章
    if (isCorrect || isWrong) {
      const cx = this.x + this.w - sz(20);
      const cy = this.y + this.h / 2;
      const r = Math.min(this.h * 0.32, sz(14));
      ctx.save();
      ctx.shadowColor = isCorrect ? 'rgba(47, 174, 68, 0.4)' : 'rgba(232, 69, 58, 0.4)';
      ctx.shadowBlur = sz(8);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = isCorrect ? '#2fae44' : '#e8453a';
      ctx.fill();
      ctx.restore();
      if (isCorrect) {
        drawCheckMark(ctx, cx, cy, r * 1.35, '#ffffff', Math.max(2, r * 0.34));
      } else {
        drawCrossMark(ctx, cx, cy, r * 1.25, '#ffffff', Math.max(2, r * 0.3));
      }
    }

    ctx.restore();
  }
}
