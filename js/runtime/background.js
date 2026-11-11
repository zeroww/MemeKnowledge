import { SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import { fillCircle, fillRoundRect, hexToRgba } from '../ui/draw.js';

/**
 * 明亮的校园天空背景：
 * 天蓝渐变 + 暖阳 + 白云 + 底部草地色带 + 少量星光。
 * 保持低对比，避免抢走卡片文字与按钮的注意力。
 */
export default class Background {
  constructor() {
    this.sparkles = [
      { x: 0.08, y: 0.16, size: 3.4, phase: 0.4, speed: 0.5 },
      { x: 0.86, y: 0.1, size: 2.6, phase: 1.8, speed: 0.4 },
      { x: 0.72, y: 0.34, size: 2.2, phase: 3.1, speed: 0.6 },
      { x: 0.16, y: 0.52, size: 2.8, phase: 2.2, speed: 0.35 },
      { x: 0.92, y: 0.62, size: 2.4, phase: 4.4, speed: 0.45 },
      { x: 0.4, y: 0.08, size: 2, phase: 5.2, speed: 0.55 },
    ];
    this.clouds = [
      { x: 0.14, y: 0.09, scale: 1.1, speed: 0.012, alpha: 0.95 },
      { x: 0.78, y: 0.16, scale: 0.8, speed: 0.009, alpha: 0.8 },
      { x: 0.52, y: 0.05, scale: 0.62, speed: 0.015, alpha: 0.7 },
      { x: 0.9, y: 0.3, scale: 0.5, speed: 0.007, alpha: 0.55 },
    ];
    this.time = 0;
  }

  update(dt) {
    this.time += dt || 0;
  }

  drawCloud(ctx, x, y, scale, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = '#ffffff';
    const puff = (dx, dy, r) => {
      ctx.beginPath();
      ctx.arc(x + dx * scale, y + dy * scale, r * scale, 0, Math.PI * 2);
      ctx.fill();
    };
    puff(-28, 2, 18);
    puff(0, -8, 24);
    puff(26, 4, 17);
    puff(10, 8, 18);
    ctx.restore();
  }

  render(ctx, theme, time = 0) {
    const t = time || this.time;
    const top = theme.bgTop || '#dff4ff';
    const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    gradient.addColorStop(0, top);
    gradient.addColorStop(0.45, '#eefbff');
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 左上暖阳
    const sunX = SCREEN_WIDTH * 0.16;
    const sunY = SCREEN_HEIGHT * 0.06;
    const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, SCREEN_WIDTH * 0.9);
    sun.addColorStop(0, 'rgba(255, 244, 190, 0.55)');
    sun.addColorStop(0.35, 'rgba(255, 244, 190, 0.2)');
    sun.addColorStop(1, 'rgba(255, 244, 190, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 云
    this.clouds.forEach((cloud, index) => {
      const drift = ((t * cloud.speed + cloud.x) % 1.25) - 0.12;
      this.drawCloud(
        ctx,
        SCREEN_WIDTH * drift,
        SCREEN_HEIGHT * cloud.y + Math.sin(t * 0.3 + index) * sz(2),
        cloud.scale,
        cloud.alpha * 0.9
      );
    });

    // 远处草地/山丘
    const hillY = SCREEN_HEIGHT - sz(84);
    ctx.save();
    ctx.fillStyle = hexToRgba('#a8e47d', 0.4);
    ctx.beginPath();
    ctx.moveTo(0, hillY + sz(18));
    ctx.quadraticCurveTo(SCREEN_WIDTH * 0.22, hillY - sz(24), SCREEN_WIDTH * 0.52, hillY + sz(6));
    ctx.quadraticCurveTo(SCREEN_WIDTH * 0.8, hillY + sz(30), SCREEN_WIDTH, hillY - sz(6));
    ctx.lineTo(SCREEN_WIDTH, SCREEN_HEIGHT);
    ctx.lineTo(0, SCREEN_HEIGHT);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = hexToRgba('#8fd96a', 0.34);
    ctx.beginPath();
    ctx.moveTo(0, hillY + sz(46));
    ctx.quadraticCurveTo(SCREEN_WIDTH * 0.3, hillY + sz(16), SCREEN_WIDTH * 0.6, hillY + sz(44));
    ctx.quadraticCurveTo(SCREEN_WIDTH * 0.85, hillY + sz(64), SCREEN_WIDTH, hillY + sz(38));
    ctx.lineTo(SCREEN_WIDTH, SCREEN_HEIGHT);
    ctx.lineTo(0, SCREEN_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 细点阵纹理
    ctx.save();
    const step = sz(38);
    for (let y = sz(8); y < SCREEN_HEIGHT; y += step) {
      for (let x = sz(10); x < SCREEN_WIDTH; x += step) {
        fillCircle(ctx, x, y, sz(0.9), 'rgba(47, 140, 232, 0.05)');
      }
    }
    ctx.restore();

    // 漂浮星光
    this.sparkles.forEach((item, index) => {
      const alpha = 0.12 + Math.abs(Math.sin(t * item.speed + item.phase)) * 0.22;
      const x = item.x * SCREEN_WIDTH + Math.sin(t * 0.24 + index) * sz(6);
      const y = item.y * SCREEN_HEIGHT + Math.cos(t * 0.2 + index * 1.4) * sz(5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(t * 0.2 + index);
      fillRoundRect(ctx, -item.size / 2, -item.size / 2, item.size, item.size, item.size * 0.3, theme.accent || '#ffc531');
      ctx.restore();
    });
  }
}
