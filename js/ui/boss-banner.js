import { sz } from '../render.js';
import { clamp, drawText, font, hexToRgba, roundRectPath } from './draw.js';
import { drawIcon } from './icons.js';

export function renderBossBanner(ctx, theme, x, y, w, h, time = 0) {
  const radius = sz(14);
  ctx.save();

  // 红金渐变底
  ctx.save();
  ctx.shadowColor = 'rgba(242, 84, 75, 0.4)';
  ctx.shadowBlur = sz(14);
  ctx.shadowOffsetY = sz(4);
  roundRectPath(ctx, x, y, w, h, radius);
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, '#ffd166');
  gradient.addColorStop(0.42, '#ff9f43');
  gradient.addColorStop(1, '#f2544b');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();

  // 顶部高光
  const sheen = ctx.createLinearGradient(0, y, 0, y + h * 0.6);
  sheen.addColorStop(0, 'rgba(255,255,255,0.5)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h * 0.6);

  // 流动反光
  const shimmerX = x + ((time * 120) % (w + 160)) - 80;
  const shimmer = ctx.createLinearGradient(shimmerX, y, shimmerX + 90, y);
  shimmer.addColorStop(0, 'rgba(255,255,255,0)');
  shimmer.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  shimmer.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shimmer;
  ctx.fillRect(shimmerX, y, 90, h);
  ctx.restore();

  drawIcon(ctx, 'crown', x + sz(22), y + h / 2, sz(22));
  drawText(ctx, 'BOSS 题 · 双倍梗币', x + w / 2 + sz(10), y + h / 2, {
    font: font(sz(13), '800'),
    color: '#ffffff',
    align: 'center',
    baseline: 'middle',
  });

  // 白色果冻边
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = sz(1.6);
  ctx.stroke();

  ctx.restore();
}

export function renderBossTag(ctx, theme, x, y, time = 0) {
  const w = sz(86);
  const h = sz(22);
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = hexToRgba(theme.danger, 0.16);
  ctx.fill();
  drawText(ctx, 'BOSS · 第 10 题', x + w / 2, y + h / 2, {
    font: font(sz(10), '700'),
    color: theme.danger,
    align: 'center',
    baseline: 'middle',
  });
  return { w, h };
}

export function bossPulse(time = 0) {
  return 0.5 + Math.sin(time * 4) * 0.5;
}

export function safeBossAlpha(value) {
  return clamp(value, 0, 1);
}
