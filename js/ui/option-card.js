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
 * 选项卡：深色霓虹胶囊。
 * A 青蓝 / B 绿 / C 琥珀 / D 紫 / T 浅青 / F 粉。
 */
const OPTION_STYLES = {
  A: {
    body: ['#08131f', '#0a2233', '#0d3a55'],
    edge: '#5ee7ff',
    glow: 'rgba(94, 231, 255, 0.34)',
    text: '#ecfdff',
  },
  B: {
    body: ['#0a1a12', '#0d2a1c', '#1c6b3c'],
    edge: '#5df2a0',
    glow: 'rgba(93, 242, 160, 0.34)',
    text: '#f2fff7',
  },
  C: {
    body: ['#1a1306', '#2a1e08', '#8a6a12'],
    edge: '#ffe08a',
    glow: 'rgba(255, 224, 138, 0.34)',
    text: '#fff9e6',
  },
  D: {
    body: ['#120c22', '#1e1338', '#5a2f9e'],
    edge: '#c9a6ff',
    glow: 'rgba(169, 124, 255, 0.34)',
    text: '#f8f2ff',
  },
  T: {
    body: ['#0a1b24', '#0e2a38', '#10465c'],
    edge: '#5ee7ff',
    glow: 'rgba(94, 231, 255, 0.26)',
    text: '#9ff4ff',
  },
  F: {
    body: ['#2b1220', '#3a1628', '#5a2240'],
    edge: '#ffa8d4',
    glow: 'rgba(255, 122, 184, 0.26)',
    text: '#ffd0e8',
  },
};

const FALLBACK = [
  OPTION_STYLES.A,
  OPTION_STYLES.B,
  OPTION_STYLES.C,
  OPTION_STYLES.D,
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
    const radius = this.h / 2;

    ctx.save();
    ctx.globalAlpha = isMuted ? 0.36 : 1;

    if (this.pressed) {
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      ctx.translate(cx, cy);
      ctx.scale(0.985, 0.96);
      ctx.translate(-cx, -cy);
    }

    const ringColor = isCorrect ? '#4ade80' : isWrong ? '#ff5c5c' : base.edge;
    const glowColor = isCorrect
      ? 'rgba(74, 222, 128, 0.55)'
      : isWrong
        ? 'rgba(255, 92, 92, 0.55)'
        : base.glow;

    // 外发光
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = this.h * 0.38;
    ctx.shadowOffsetY = this.h * 0.08;
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.fillStyle = base.body[1];
    ctx.fill();
    ctx.restore();

    // 主体
    const body = ctx.createLinearGradient(0, this.y, 0, this.y + this.h);
    body.addColorStop(0, base.body[0]);
    body.addColorStop(0.62, base.body[1]);
    body.addColorStop(1, base.body[2]);
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.fillStyle = body;
    ctx.fill();

    // 底部暗边
    ctx.save();
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.clip();
    const shade = ctx.createLinearGradient(0, this.y + this.h * 0.55, 0, this.y + this.h);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = shade;
    ctx.fillRect(this.x, this.y + this.h * 0.5, this.w, this.h * 0.5);
    ctx.restore();

    // 顶部冷光
    ctx.save();
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.clip();
    const gloss = ctx.createLinearGradient(0, this.y, 0, this.y + this.h * 0.55);
    gloss.addColorStop(0, 'rgba(210, 245, 255, 0.14)');
    gloss.addColorStop(1, 'rgba(210, 245, 255, 0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(this.x, this.y, this.w, this.h * 0.55);
    ctx.restore();

    // 霓虹描边
    ctx.save();
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = this.h * 0.3;
    roundRectPath(ctx, this.x + 1, this.y + 1, this.w - 2, this.h - 2, radius - 1);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = isCorrect || isWrong ? 3 : 2;
    ctx.stroke();
    ctx.restore();

    // 内侧细线
    roundRectPath(ctx, this.x + 5, this.y + 5, this.w - 10, this.h - 10, Math.max(1, radius - 5));
    ctx.strokeStyle = hexToRgba(ringColor, 0.22);
    ctx.lineWidth = 1;
    ctx.stroke();

    // 字母槽
    const padX = sz(9);
    const badgeSize = Math.min(this.h - sz(10), sz(34));
    const badgeX = this.x + padX + badgeSize / 2;
    const badgeY = this.y + this.h / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(3, 9, 17, 0.62)';
    ctx.fill();
    ctx.strokeStyle = hexToRgba(ringColor, 0.7);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawText(ctx, this.letter, badgeX, badgeY + 1, {
      font: font(badgeSize * 0.52, '900'),
      color: isCorrect ? '#4ade80' : isWrong ? '#ff8a8a' : base.edge,
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
        color: base.text,
        baseline: 'middle',
      });
    });

    // 判定徽章
    if (isCorrect || isWrong) {
      const cx = this.x + this.w - sz(20);
      const cy = this.y + this.h / 2;
      const r = Math.min(this.h * 0.32, sz(14));
      ctx.save();
      ctx.shadowColor = isCorrect
        ? 'rgba(74, 222, 128, 0.6)'
        : 'rgba(255, 92, 92, 0.6)';
      ctx.shadowBlur = sz(10);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = isCorrect ? '#1c8a45' : '#8a2027';
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = isCorrect ? '#6ef2a0' : '#ff9a9a';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (isCorrect) {
        drawCheckMark(ctx, cx, cy, r * 1.35, '#eafff2', Math.max(2, r * 0.32));
      } else {
        drawCrossMark(ctx, cx, cy, r * 1.2, '#fff0f0', Math.max(2, r * 0.28));
      }
    }

    ctx.restore();
  }
}
