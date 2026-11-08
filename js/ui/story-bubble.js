import { sz } from '../render.js';
import { drawPill, fillRoundRect, font, hexToRgba, strokeRoundRect } from './draw.js';

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

  // 阴影
  fillRoundRect(ctx, x + sz(2), y + sz(4), w, h, sz(16), 'rgba(0,0,0,0.34)');
  // 面板
  fillRoundRect(ctx, x, y, w, h, sz(16), hexToRgba(theme.panel, 0.94));
  // 顶部细光
  fillRoundRect(
    ctx,
    x + sz(14),
    y + sz(9),
    w - sz(28),
    sz(2),
    sz(1),
    hexToRgba(theme.accent, 0.35)
  );
  // 尖角：指向当前说话的角色（嘉豪在右，主角在左）
  if (showTail) {
    const tw = sz(38);
    const th = sz(18);
    const tx = tailSide === 'left' ? x + sz(38) : x + w - sz(76);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tx, y + sz(2));
    ctx.lineTo(tx + tw / 2, y - th);
    ctx.lineTo(tx + tw, y + sz(2));
    ctx.closePath();
    ctx.fillStyle = hexToRgba(theme.panel, 0.96);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(theme.accent, 0.8);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx, y + sz(2));
    ctx.lineTo(tx + tw / 2, y - th);
    ctx.lineTo(tx + tw, y + sz(2));
    ctx.stroke();
    ctx.restore();
  }
  // 面板描边
  strokeRoundRect(ctx, x, y, w, h, sz(16), hexToRgba(theme.accent, 0.72), 1.5);

  if (showName && speaker) {
    drawPill(ctx, speaker, x + sz(14), y + sz(18), {
      fontStr: font(sz(9), '800'),
      color: theme.accent,
      bg: hexToRgba(theme.accent, 0.14),
      height: sz(18),
      padX: sz(8),
    });
  }

  return {
    x: x + sz(16),
    y: y + sz(40),
    w: w - sz(32),
    h: Math.max(sz(20), h - sz(50)),
  };
}
