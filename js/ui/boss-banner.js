import { sz } from '../render.js';
import {
  clamp,
  contrastText,
  drawText,
  fillRoundRect,
  font,
  hexToRgba,
  roundRectPath,
} from './draw.js';

export function renderBossBanner(ctx, theme, x, y, w, h, time = 0) {
  ctx.save();

  roundRectPath(ctx, x, y, w, h, sz(10));
  ctx.clip();

  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, theme.danger);
  gradient.addColorStop(0.55, theme.primaryDeep || theme.primary);
  gradient.addColorStop(1, theme.accent);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);

  const shimmerX = x + ((time * 120) % (w + 160)) - 80;
  const shimmer = ctx.createLinearGradient(shimmerX, y, shimmerX + 90, y);
  shimmer.addColorStop(0, 'rgba(255,255,255,0)');
  shimmer.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  shimmer.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shimmer;
  ctx.fillRect(shimmerX, y, 90, h);

  const textColor = contrastText(theme.primaryDeep || theme.primary);
  drawText(ctx, '👑  BOSS 题 · 双倍梗币', x + w / 2, y + h / 2, {
    font: font(sz(13), '800'),
    color: textColor,
    align: 'center',
    baseline: 'middle',
  });

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = hexToRgba(theme.accent, 0.6 + Math.sin(time * 4) * 0.2);
  ctx.lineWidth = 1;
  roundRectPath(ctx, x, y, w, h, sz(10));
  ctx.stroke();
  ctx.restore();
}

export function renderBossTag(ctx, theme, x, y, time = 0) {
  const w = sz(86);
  const h = sz(22);
  fillRoundRect(ctx, x, y, w, h, sz(11), hexToRgba(theme.danger, 0.18));
  drawText(ctx, 'BOSS · 第 10 题', x + w / 2, y + h / 2, {
    font: font(sz(10), '700'),
    color: theme.danger,
    align: 'center',
    baseline: 'middle',
  });
  ctx.save();
  ctx.globalAlpha = 0.35 + Math.sin(time * 5) * 0.15;
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + w - sz(5), y + h / 2, sz(3), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  return { w, h };
}

export function bossPulse(time = 0) {
  return 0.5 + Math.sin(time * 4) * 0.5;
}

export function safeBossAlpha(value) {
  return clamp(value, 0, 1);
}
