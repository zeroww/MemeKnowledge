import { sz } from '../render.js';
import { clamp, drawHeart, hexToRgba } from './draw.js';

export function renderLives(ctx, x, y, lives, maxLives, theme, size = sz(18), gap = sz(7)) {
  const total = Math.max(0, maxLives || 3);
  const current = clamp(lives, 0, total);
  for (let i = 0; i < total; i += 1) {
    const cx = x + size + i * (size * 1.45 + gap);
    const filled = i < current;
    drawHeart(
      ctx,
      cx,
      y,
      size,
      filled ? theme.danger : hexToRgba(theme.muted, 0.55),
      filled
    );
  }
  return total * (size * 1.45 + gap);
}
