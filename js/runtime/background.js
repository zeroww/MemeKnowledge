import { SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import { hexToRgba } from '../ui/draw.js';

const FLOATERS = ['梗', '🤣', '💥', '🎭', '📱', '🐟', '👑', '🍋', '🦫', '💬'];

/**
 * 动态背景：渐变 + 光斑 + 网格 + 漂浮 emoji。
 * 保持低透明度，避免影响答题可读性。
 */
export default class Background {
  constructor() {
    this.items = FLOATERS.map((emoji, index) => ({
      emoji,
      x: ((index * 137) % 100) / 100,
      y: ((index * 73) % 100) / 100,
      size: sz(18 + (index % 3) * 10),
      speed: 0.12 + (index % 4) * 0.035,
      phase: index * 0.9,
      alpha: 0.06 + (index % 3) * 0.025,
      rotate: (index % 2 === 0 ? 1 : -1) * 0.08,
    }));
  }

  update(dt) {
    // 时间由 render 传入，本方法保留给未来粒子扩展
  }

  render(ctx, theme, time = 0) {
    const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    gradient.addColorStop(0, theme.bgTop);
    gradient.addColorStop(0.6, theme.bgBottom);
    gradient.addColorStop(1, theme.bgTop);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 光斑
    const blobs = [
      { x: SCREEN_WIDTH * 0.15, y: SCREEN_HEIGHT * 0.18, r: SCREEN_WIDTH * 0.5, color: theme.primary, a: 0.09 },
      { x: SCREEN_WIDTH * 0.9, y: SCREEN_HEIGHT * 0.55, r: SCREEN_WIDTH * 0.55, color: theme.accent, a: 0.055 },
      { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.95, r: SCREEN_WIDTH * 0.7, color: theme.primaryDeep || theme.primary, a: 0.08 },
    ];
    blobs.forEach((blob, index) => {
      const wobble = Math.sin(time * 0.25 + index) * sz(10);
      const radial = ctx.createRadialGradient(
        blob.x + wobble,
        blob.y,
        0,
        blob.x + wobble,
        blob.y,
        blob.r
      );
      radial.addColorStop(0, hexToRgba(blob.color, blob.a));
      radial.addColorStop(1, hexToRgba(blob.color, 0));
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    });

    // 网格
    ctx.save();
    ctx.strokeStyle = hexToRgba(theme.line, 0.18);
    ctx.lineWidth = 1;
    const step = sz(42);
    for (let x = 0; x < SCREEN_WIDTH; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SCREEN_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < SCREEN_HEIGHT; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SCREEN_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();

    // 漂浮 emoji
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.items.forEach((item) => {
      const x = item.x * SCREEN_WIDTH + Math.sin(time * item.speed + item.phase) * sz(18);
      const y = (item.y * SCREEN_HEIGHT + time * sz(6) * item.speed) % (SCREEN_HEIGHT + sz(80)) - sz(40);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(time * 0.4 + item.phase) * item.rotate);
      ctx.globalAlpha = item.alpha;
      ctx.font = `${item.size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.fillStyle = theme.text;
      ctx.fillText(item.emoji, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }
}
