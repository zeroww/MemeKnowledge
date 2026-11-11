import { drawCoin, hexToRgba, roundRectPath } from './draw.js';

const BADGE_STYLES = {
  trophy: { stops: ['#ffe98f', '#ffc12a', '#f39a00'], edge: '#e08a00' },
  cart: { stops: ['#9bdcff', '#3a97f7', '#1f6fd0'], edge: '#1a63c4' },
  gear: { stops: ['#d9c2ff', '#a97cf2', '#7d4ae0'], edge: '#6335c4' },
};

function trophyGlyph(ctx, r) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = r * 0.14;
  ctx.lineCap = 'round';
  // 杯身
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, -r * 0.42);
  ctx.lineTo(r * 0.32, -r * 0.42);
  ctx.quadraticCurveTo(r * 0.3, -r * 0.02, r * 0.12, r * 0.08);
  ctx.quadraticCurveTo(0, r * 0.18, -r * 0.12, r * 0.08);
  ctx.quadraticCurveTo(-r * 0.3, -r * 0.02, -r * 0.32, -r * 0.42);
  ctx.closePath();
  ctx.fill();
  // 双耳
  ctx.beginPath();
  ctx.arc(-r * 0.38, -r * 0.2, r * 0.16, Math.PI * 0.4, Math.PI * 1.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r * 0.38, -r * 0.2, r * 0.16, -Math.PI * 0.6, Math.PI * 0.6);
  ctx.stroke();
  // 杯柄与底座
  ctx.fillRect(-r * 0.055, r * 0.12, r * 0.11, r * 0.16);
  ctx.beginPath();
  roundRectPath(ctx, -r * 0.26, r * 0.26, r * 0.52, r * 0.12, r * 0.06);
  ctx.fill();
  // 星星
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#fff3c0';
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r * 0.1 : r * 0.045;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = -r * 0.22 + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function cartGlyph(ctx, r) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = r * 0.13;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.44, -r * 0.38);
  ctx.lineTo(-r * 0.28, -r * 0.38);
  ctx.lineTo(-r * 0.16, -r * 0.04);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.18);
  ctx.lineTo(r * 0.34, -r * 0.18);
  ctx.lineTo(r * 0.26, r * 0.2);
  ctx.lineTo(-r * 0.14, r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-r * 0.1, r * 0.36, r * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.22, r * 0.36, r * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function gearGlyph(ctx, r, holeColor) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i += 1) {
    ctx.save();
    ctx.rotate((Math.PI / 4) * i);
    roundRectPath(ctx, -r * 0.1, -r * 0.42, r * 0.2, r * 0.2, r * 0.06);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = holeColor;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const GLYPHS = { trophy: trophyGlyph, cart: cartGlyph, gear: gearGlyph };

/**
 * 首页右上角的圆形果冻按钮（参考图：奖杯 / 购物车 / 齿轮）。
 */
export function drawBadgeButton(ctx, cx, cy, r, kind, pressed = false) {
  const style = BADGE_STYLES[kind] || BADGE_STYLES.cart;
  const scale = pressed ? 0.94 : 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.save();
  ctx.shadowColor = hexToRgba(style.edge, 0.45);
  ctx.shadowBlur = r * 0.5;
  ctx.shadowOffsetY = r * 0.16;
  const gradient = ctx.createLinearGradient(0, -r, 0, r);
  gradient.addColorStop(0, style.stops[0]);
  gradient.addColorStop(0.55, style.stops[1]);
  gradient.addColorStop(1, style.stops[2]);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  // 白色外圈 + 顶部高光
  ctx.beginPath();
  ctx.arc(0, 0, r - Math.max(1, r * 0.045), 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1.4, r * 0.1);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  const gloss = ctx.createLinearGradient(0, -r, 0, r * 0.4);
  gloss.addColorStop(0, 'rgba(255,255,255,0.5)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(-r, -r, r * 2, r * 1.4);
  ctx.restore();

  const glyph = GLYPHS[kind];
  if (glyph) glyph(ctx, r, style.stops[1]);
  ctx.restore();
}

/**
 * 梗币胶囊：金币图标 + 数量。
 */
export function drawCoinPill(ctx, x, y, width, height, coins, options = {}) {
  const radius = height / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(58, 122, 180, 0.22)';
  ctx.shadowBlur = height * 0.4;
  ctx.shadowOffsetY = height * 0.12;
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(1, '#eaf8ff');
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  roundRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = 'rgba(191, 228, 248, 0.95)';
  ctx.lineWidth = Math.max(1, height * 0.05);
  ctx.stroke();

  drawCoin(ctx, x + height * 0.5, y + height / 2, height * 0.34, '#ffc531');

  ctx.font = `800 ${Math.round(height * 0.52)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillStyle = '#1f4e9c';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(coins), x + height * 0.92, y + height / 2 + 0.5);
  return width;
}
