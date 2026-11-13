import { sz } from '../render.js';
import {
  drawPill,
  drawTopSheen,
  fillRoundRect,
  fillRoundRectGradient,
  font,
  hexToRgba,
  strokeRoundRect,
} from './draw.js';

/**
 * 剧情对话气泡。
 * 深色半透明面板 + 金色描边 + 右侧尖角，替代原图里的白色方框。
 */
export function renderStoryBubble(ctx, theme, x, y, w, h, options = {}) {
  const {
    speaker = '嘉豪',
    showTail = true,
    showName = true,
    tailSide = 'right',
  } = options;

  // 尖角：指向当前说话的角色（对手在右，主角在左）
  if (showTail) {
    const tw = sz(42);
    const th = sz(19);
    const tx = tailSide === 'left' ? x + sz(40) : x + w - sz(82);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tx, y + sz(3));
    ctx.lineTo(tx + tw / 2, y - th);
    ctx.lineTo(tx + tw, y + sz(3));
    ctx.closePath();
    ctx.fillStyle = '#0a1626';
    ctx.fill();
    ctx.strokeStyle = 'rgba(94, 231, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx, y + sz(3));
    ctx.lineTo(tx + tw / 2, y - th);
    ctx.lineTo(tx + tw, y + sz(3));
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = sz(24);
  ctx.shadowOffsetY = sz(10);
  fillRoundRectGradient(ctx, x, y, w, h, sz(22), '#0a1626', '#0e2138');
  ctx.restore();
  drawTopSheen(ctx, x, y, w, h, sz(22), 0.12);
  fillRoundRect(
    ctx,
    x + sz(16),
    y + sz(10),
    w - sz(32),
    sz(2),
    sz(1),
    hexToRgba(theme.primary, 0.35)
  );
  strokeRoundRect(ctx, x, y, w, h, sz(22), 'rgba(94, 231, 255, 0.55)', 1.5);

  if (showName && speaker) {
    drawPill(ctx, speaker, x + sz(16), y + sz(21), {
      fontStr: font(sz(9), '800'),
      color: '#d9f8ff',
      bg: '#0d3a55',
      border: 'rgba(94,231,255,0.7)',
      height: sz(19),
      padX: sz(9),
    });
  }

  return {
    x: x + sz(16),
    y: y + sz(40),
    w: w - sz(32),
    h: Math.max(sz(20), h - sz(50)),
  };
}
