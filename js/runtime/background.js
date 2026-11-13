import { SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import { fillCircle, hexToRgba } from '../ui/draw.js';

/**
 * 深色霓虹竞技场背景：
 * 深海军蓝渐变 + 透视网格 + 青色/红色光斑 + 扫描线 + 漂浮粒子。
 * 首页使用独立的竞技场主视觉，这里服务于地图、答题、结算、图鉴等页面。
 */
export default class Background {
  constructor() {
    this.particles = Array.from({ length: 26 }, (_, index) => ({
      x: ((index * 137) % 100) / 100,
      y: ((index * 73) % 100) / 100,
      size: 1 + (index % 3) * 0.8,
      speed: 0.006 + (index % 5) * 0.003,
      phase: index * 0.7,
    }));
    this.time = 0;
  }

  update(dt) {
    this.time += dt || 0;
  }

  render(ctx, theme, time = 0) {
    const t = time || this.time;

    // 底色
    const bg = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    bg.addColorStop(0, '#04070f');
    bg.addColorStop(0.45, theme.bgBottom || '#0a1424');
    bg.addColorStop(1, '#050a14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 顶部 / 底部光斑
    const glowTop = ctx.createRadialGradient(
      SCREEN_WIDTH * 0.82,
      SCREEN_HEIGHT * 0.08,
      0,
      SCREEN_WIDTH * 0.82,
      SCREEN_HEIGHT * 0.08,
      SCREEN_WIDTH * 0.8
    );
    glowTop.addColorStop(0, hexToRgba(theme.primary || '#43e0ff', 0.14));
    glowTop.addColorStop(1, hexToRgba(theme.primary || '#43e0ff', 0));
    ctx.fillStyle = glowTop;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const glowBottom = ctx.createRadialGradient(
      SCREEN_WIDTH * 0.2,
      SCREEN_HEIGHT * 0.92,
      0,
      SCREEN_WIDTH * 0.2,
      SCREEN_HEIGHT * 0.92,
      SCREEN_WIDTH * 0.9
    );
    glowBottom.addColorStop(0, 'rgba(255, 60, 70, 0.1)');
    glowBottom.addColorStop(1, 'rgba(255, 60, 70, 0)');
    ctx.fillStyle = glowBottom;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 透视网格（竞技场地板）
    const horizon = SCREEN_HEIGHT * 0.62;
    ctx.save();
    ctx.strokeStyle = hexToRgba(theme.primary || '#43e0ff', 0.1);
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i += 1) {
      const x = (SCREEN_WIDTH / 10) * i;
      ctx.beginPath();
      ctx.moveTo(SCREEN_WIDTH / 2 + (x - SCREEN_WIDTH / 2) * 0.18, horizon);
      ctx.lineTo(x - SCREEN_WIDTH * 0.35, SCREEN_HEIGHT + sz(20));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(SCREEN_WIDTH / 2 + (SCREEN_WIDTH - x - SCREEN_WIDTH / 2) * 0.18, horizon);
      ctx.lineTo(SCREEN_WIDTH - x + SCREEN_WIDTH * 0.35, SCREEN_HEIGHT + sz(20));
      ctx.stroke();
    }
    for (let i = 0; i < 7; i += 1) {
      const p = i / 7;
      const y = horizon + (SCREEN_HEIGHT - horizon) * p * p;
      ctx.strokeStyle = hexToRgba(theme.primary || '#43e0ff', 0.06 + p * 0.05);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SCREEN_WIDTH, y);
      ctx.stroke();
    }
    // 地平线霓虹
    ctx.strokeStyle = hexToRgba(theme.primary || '#43e0ff', 0.22);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(SCREEN_WIDTH, horizon);
    ctx.stroke();
    ctx.restore();

    // 扫描线
    ctx.save();
    ctx.fillStyle = 'rgba(120, 220, 255, 0.028)';
    for (let y = 0; y < SCREEN_HEIGHT; y += 4) {
      ctx.fillRect(0, y, SCREEN_WIDTH, 1);
    }
    ctx.restore();

    // 漂浮粒子
    ctx.save();
    this.particles.forEach((item, index) => {
      const alpha = 0.1 + Math.abs(Math.sin(t * 0.7 + item.phase)) * 0.35;
      const x = item.x * SCREEN_WIDTH + Math.sin(t * 0.35 + index) * sz(8);
      const y =
        (item.y * SCREEN_HEIGHT + t * SCREEN_HEIGHT * item.speed) %
          (SCREEN_HEIGHT + sz(40)) -
        sz(20);
      fillCircle(
        ctx,
        x,
        y,
        item.size,
        index % 4 === 0
          ? `rgba(255, 110, 110, ${alpha * 0.8})`
          : `rgba(140, 230, 255, ${alpha})`
      );
    });
    ctx.restore();

    // 暗角
    const vignette = ctx.createRadialGradient(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT * 0.48,
      SCREEN_WIDTH * 0.2,
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT * 0.48,
      SCREEN_WIDTH * 0.95
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }
}
