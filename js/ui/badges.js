import { drawCoin, hexToRgba, roundRectPath } from './draw.js';

const BADGE_STYLES = {
  trophy: {
    edge: '#ffe08a',
    glow: 'rgba(255, 224, 138, 0.5)',
    glyph: '#ffe08a',
  },
  cart: {
    edge: '#5ee7ff',
    glow: 'rgba(94, 231, 255, 0.5)',
    glyph: '#9ff4ff',
  },
  gear: {
    edge: '#c9a6ff',
    glow: 'rgba(201, 166, 255, 0.5)',
    glyph: '#d9c2ff',
  },
};

function trophyGlyph(ctx, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
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
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#fff6d0';
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

function cartGlyph(ctx, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
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

function gearGlyph(ctx, r, holeColor, color) {
  ctx.save();
  ctx.fillStyle = color;
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
 * 首页功能徽章：深色圆盘 + 霓虹描边 + 发光功能符号。
 */
export function drawBadgeButton(ctx, cx, cy, r, kind, pressed = false) {
  const style = BADGE_STYLES[kind] || BADGE_STYLES.cart;
  const scale = pressed ? 0.94 : 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // 外发光
  ctx.save();
  ctx.shadowColor = style.glow;
  ctx.shadowBlur = r * 0.7;
  ctx.shadowOffsetY = r * 0.12;
  const gradient = ctx.createLinearGradient(0, -r, 0, r);
  gradient.addColorStop(0, '#0b1a2e');
  gradient.addColorStop(1, '#07111d');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  // 霓虹外圈
  ctx.save();
  ctx.shadowColor = style.edge;
  ctx.shadowBlur = r * 0.45;
  ctx.beginPath();
  ctx.arc(0, 0, r - Math.max(1, r * 0.06), 0, Math.PI * 2);
  ctx.strokeStyle = style.edge;
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.stroke();
  ctx.restore();

  // 内侧细线
  ctx.beginPath();
  ctx.arc(0, 0, r - Math.max(3, r * 0.2), 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba(style.edge, 0.22);
  ctx.lineWidth = 1;
  ctx.stroke();

  // 顶部冷光
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  const gloss = ctx.createLinearGradient(0, -r, 0, r * 0.4);
  gloss.addColorStop(0, 'rgba(200, 245, 255, 0.16)');
  gloss.addColorStop(1, 'rgba(200, 245, 255, 0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(-r, -r, r * 2, r * 1.4);
  ctx.restore();

  const glyph = GLYPHS[kind];
  if (kind === 'gear') gearGlyph(ctx, r, '#07111d', style.glyph);
  else if (glyph) glyph(ctx, r, style.glyph);
  ctx.restore();
}

/**
 * 梗币胶囊：金币图标 + 数量。默认浅色；传入 { dark: true } 使用深色霓虹底。
 */
export function drawCoinPill(ctx, x, y, width, height, coins, options = {}) {
  const radius = height / 2;
  const dark = options.dark === true;
  ctx.save();
  ctx.shadowColor = dark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(58, 122, 180, 0.22)';
  ctx.shadowBlur = height * 0.4;
  ctx.shadowOffsetY = height * 0.12;
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  gradient.addColorStop(0, dark ? '#0a1626' : '#ffffff');
  gradient.addColorStop(1, dark ? '#0e2138' : '#eaf8ff');
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  roundRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = dark ? 'rgba(94, 231, 255, 0.45)' : 'rgba(191, 228, 248, 0.95)';
  ctx.lineWidth = Math.max(1, height * 0.05);
  ctx.stroke();

  drawCoin(ctx, x + height * 0.5, y + height / 2, height * 0.34, '#ffc531');

  ctx.font = `800 ${Math.round(height * 0.52)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillStyle = dark ? '#e8f7ff' : '#1f4e9c';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(coins), x + height * 0.92, y + height / 2 + 0.5);
  return width;
}
