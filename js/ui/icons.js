/**
 * 轻量 Canvas 线性图标库。
 * drawIcon(ctx, name, cx, cy, size, color, lineWidth)
 */
export const ICON_NAMES = [
  'back',
  'arrow',
  'chevron',
  'play',
  'pause',
  'home',
  'book',
  'trophy',
  'bag',
  'gear',
  'map',
  'clock',
  'heart',
  'coin',
  'share',
  'close',
  'check',
  'lock',
  'plus',
  'bulb',
  'hourglass',
  'music',
  'volume',
  'vibrate',
  'shield',
  'info',
  'trash',
  'user',
  'edit',
  'refresh',
  'star',
  'spark',
  'crown',
  'flame',
];

const ALIASES = {
  collection: 'book',
  rank: 'trophy',
  leaderboard: 'trophy',
  shop: 'bag',
  settings: 'gear',
  replay: 'refresh',
  hint: 'bulb',
  extend: 'hourglass',
  sound: 'volume',
  home: 'home',
};

function stroke(ctx, draw) {
  ctx.beginPath();
  draw();
  ctx.stroke();
}

function fill(ctx, draw) {
  ctx.beginPath();
  draw();
  ctx.fill();
}

export function drawIcon(ctx, name, cx, cy, size, color, lineWidth) {
  const key = ALIASES[name] || name;
  const s = Math.max(2, size / 2);
  const lw = lineWidth || Math.max(1, size * 0.1);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (key) {
    case 'back':
      stroke(ctx, () => {
        ctx.moveTo(s * 0.35, -s * 0.65);
        ctx.lineTo(-s * 0.45, 0);
        ctx.lineTo(s * 0.35, s * 0.65);
        ctx.moveTo(-s * 0.45, 0);
        ctx.lineTo(s * 0.6, 0);
      });
      break;
    case 'arrow':
    case 'chevron':
      stroke(ctx, () => {
        ctx.moveTo(-s * 0.35, -s * 0.65);
        ctx.lineTo(s * 0.4, 0);
        ctx.lineTo(-s * 0.35, s * 0.65);
      });
      break;
    case 'play':
      fill(ctx, () => {
        ctx.moveTo(-s * 0.35, -s * 0.7);
        ctx.lineTo(s * 0.65, 0);
        ctx.lineTo(-s * 0.35, s * 0.7);
        ctx.closePath();
      });
      break;
    case 'pause':
      fill(ctx, () => {
        ctx.roundRect(-s * 0.42, -s * 0.62, s * 0.28, s * 1.24, s * 0.1);
        ctx.roundRect(s * 0.14, -s * 0.62, s * 0.28, s * 1.24, s * 0.1);
      });
      break;
    case 'home':
      stroke(ctx, () => {
        ctx.moveTo(-s * 0.75, s * 0.02);
        ctx.lineTo(0, -s * 0.65);
        ctx.lineTo(s * 0.75, s * 0.02);
        ctx.moveTo(-s * 0.52, -s * 0.05);
        ctx.lineTo(-s * 0.52, s * 0.65);
        ctx.lineTo(s * 0.52, s * 0.65);
        ctx.lineTo(s * 0.52, -s * 0.05);
        ctx.moveTo(-s * 0.15, s * 0.65);
        ctx.lineTo(-s * 0.15, s * 0.25);
        ctx.lineTo(s * 0.15, s * 0.25);
        ctx.lineTo(s * 0.15, s * 0.65);
      });
      break;
    case 'book':
      stroke(ctx, () => {
        ctx.moveTo(0, -s * 0.6);
        ctx.lineTo(-s * 0.62, -s * 0.46);
        ctx.lineTo(-s * 0.62, s * 0.52);
        ctx.lineTo(0, s * 0.64);
        ctx.lineTo(s * 0.62, s * 0.52);
        ctx.lineTo(s * 0.62, -s * 0.46);
        ctx.closePath();
        ctx.moveTo(0, -s * 0.6);
        ctx.lineTo(0, s * 0.64);
        ctx.moveTo(-s * 0.5, -s * 0.32);
        ctx.lineTo(-s * 0.15, -s * 0.4);
        ctx.moveTo(-s * 0.5, -s * 0.1);
        ctx.lineTo(-s * 0.15, -s * 0.18);
        ctx.moveTo(s * 0.5, -s * 0.32);
        ctx.lineTo(s * 0.15, -s * 0.4);
      });
      break;
    case 'trophy':
      stroke(ctx, () => {
        ctx.moveTo(-s * 0.46, -s * 0.62);
        ctx.lineTo(s * 0.46, -s * 0.62);
        ctx.lineTo(s * 0.34, s * 0.04);
        ctx.quadraticCurveTo(0, s * 0.34, -s * 0.34, s * 0.04);
        ctx.closePath();
        ctx.moveTo(-s * 0.46, -s * 0.46);
        ctx.quadraticCurveTo(-s * 0.8, -s * 0.3, -s * 0.42, -s * 0.06);
        ctx.moveTo(s * 0.46, -s * 0.46);
        ctx.quadraticCurveTo(s * 0.8, -s * 0.3, s * 0.42, -s * 0.06);
        ctx.moveTo(0, s * 0.34);
        ctx.lineTo(0, s * 0.55);
        ctx.moveTo(-s * 0.32, s * 0.64);
        ctx.lineTo(s * 0.32, s * 0.64);
      });
      break;
    case 'bag':
      stroke(ctx, () => {
        ctx.roundRect(-s * 0.58, -s * 0.26, s * 1.16, s * 0.9, s * 0.18);
        ctx.moveTo(-s * 0.28, -s * 0.26);
        ctx.quadraticCurveTo(-s * 0.28, -s * 0.68, 0, -s * 0.68);
        ctx.quadraticCurveTo(s * 0.28, -s * 0.68, s * 0.28, -s * 0.26);
      });
      break;
    case 'gear':
      stroke(ctx, () => {
        ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
        for (let i = 0; i < 8; i += 1) {
          const a = (Math.PI / 4) * i;
          ctx.moveTo(Math.cos(a) * s * 0.44, Math.sin(a) * s * 0.44);
          ctx.lineTo(Math.cos(a) * s * 0.68, Math.sin(a) * s * 0.68);
        }
      });
      break;
    case 'map':
      stroke(ctx, () => {
        ctx.moveTo(-s * 0.68, -s * 0.5);
        ctx.lineTo(-s * 0.2, -s * 0.66);
        ctx.lineTo(s * 0.2, -s * 0.5);
        ctx.lineTo(s * 0.68, -s * 0.66);
        ctx.lineTo(s * 0.68, s * 0.5);
        ctx.lineTo(s * 0.2, s * 0.66);
        ctx.lineTo(-s * 0.2, s * 0.5);
        ctx.lineTo(-s * 0.68, s * 0.66);
        ctx.closePath();
        ctx.moveTo(-s * 0.2, -s * 0.66);
        ctx.lineTo(-s * 0.2, s * 0.5);
        ctx.moveTo(s * 0.2, -s * 0.5);
        ctx.lineTo(s * 0.2, s * 0.66);
      });
      break;
    case 'clock':
      stroke(ctx, () => {
        ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
        ctx.moveTo(0, -s * 0.32);
        ctx.lineTo(0, 0);
        ctx.lineTo(s * 0.3, s * 0.18);
      });
      break;
    case 'heart':
      fill(ctx, () => {
        ctx.moveTo(0, s * 0.62);
        ctx.bezierCurveTo(-s * 1.0, -s * 0.2, -s * 0.58, -s * 0.98, 0, -s * 0.32);
        ctx.bezierCurveTo(s * 0.58, -s * 0.98, s * 1.0, -s * 0.2, 0, s * 0.62);
        ctx.closePath();
      });
      break;
    case 'coin':
      stroke(ctx, () => {
        ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
        ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
        ctx.moveTo(0, -s * 0.22);
        ctx.lineTo(s * 0.18, 0);
        ctx.lineTo(0, s * 0.22);
        ctx.lineTo(-s * 0.18, 0);
        ctx.closePath();
      });
      break;
    case 'share':
      stroke(ctx, () => {
        ctx.moveTo(0, s * 0.58);
        ctx.lineTo(0, -s * 0.38);
        ctx.moveTo(-s * 0.34, -s * 0.05);
        ctx.lineTo(0, -s * 0.4);
        ctx.lineTo(s * 0.34, -s * 0.05);
        ctx.moveTo(-s * 0.58, s * 0.12);
        ctx.lineTo(-s * 0.58, s * 0.6);
        ctx.lineTo(s * 0.58, s * 0.6);
        ctx.lineTo(s * 0.58, s * 0.12);
      });
      break;
    case 'close':
      stroke(ctx, () => {
        ctx.moveTo(-s * 0.5, -s * 0.5);
        ctx.lineTo(s * 0.5, s * 0.5);
        ctx.moveTo(s * 0.5, -s * 0.5);
        ctx.lineTo(-s * 0.5, s * 0.5);
      });
      break;
    case 'check':
      stroke(ctx, () => {
        ctx.moveTo(-s * 0.55, s * 0.02);
        ctx.lineTo(-s * 0.15, s * 0.42);
        ctx.lineTo(s * 0.6, -s * 0.42);
      });
      break;
    case 'lock':
      stroke(ctx, () => {
        ctx.roundRect(-s * 0.52, -s * 0.04, s * 1.04, s * 0.68, s * 0.14);
        ctx.moveTo(-s * 0.3, -s * 0.04);
        ctx.quadraticCurveTo(-s * 0.3, -s * 0.62, 0, -s * 0.62);
        ctx.quadraticCurveTo(s * 0.3, -s * 0.62, s * 0.3, -s * 0.04);
      });
      break;
    case 'plus':
      stroke(ctx, () => {
        ctx.moveTo(0, -s * 0.55);
        ctx.lineTo(0, s * 0.55);
        ctx.moveTo(-s * 0.55, 0);
        ctx.lineTo(s * 0.55, 0);
      });
      break;
    case 'bulb':
      stroke(ctx, () => {
        ctx.moveTo(-s * 0.36, s * 0.18);
        ctx.quadraticCurveTo(-s * 0.62, -s * 0.18, -s * 0.32, -s * 0.48);
        ctx.quadraticCurveTo(0, -s * 0.76, s * 0.32, -s * 0.48);
        ctx.quadraticCurveTo(s * 0.62, -s * 0.18, s * 0.36, s * 0.18);
        ctx.lineTo(s * 0.24, s * 0.32);
        ctx.lineTo(-s * 0.24, s * 0.32);
        ctx.closePath();
        ctx.moveTo(-s * 0.2, s * 0.46);
        ctx.lineTo(s * 0.2, s * 0.46);
        ctx.moveTo(-s * 0.14, s * 0.62);
        ctx.lineTo(s * 0.14, s * 0.62);
      });
      break;
    case 'hourglass':
      stroke(ctx, () => {
        ctx.moveTo(-s * 0.46, -s * 0.62);
        ctx.lineTo(s * 0.46, -s * 0.62);
        ctx.lineTo(-s * 0.46, s * 0.62);
        ctx.lineTo(s * 0.46, s * 0.62);
        ctx.closePath();
        ctx.moveTo(-s * 0.26, -s * 0.4);
        ctx.lineTo(s * 0.26, s * 0.4);
      });
      break;
    case 'music':
      stroke(ctx, () => {
        ctx.moveTo(s * 0.06, s * 0.42);
        ctx.lineTo(s * 0.06, -s * 0.58);
        ctx.lineTo(s * 0.56, -s * 0.44);
        ctx.lineTo(s * 0.56, s * 0.28);
        ctx.moveTo(-s * 0.22, s * 0.42);
        ctx.arc(s * 0.06, s * 0.42, s * 0.28, 0, Math.PI * 2);
        ctx.moveTo(s * 0.28, s * 0.28);
        ctx.arc(s * 0.56, s * 0.28, s * 0.28, 0, Math.PI * 2);
      });
      break;
    case 'volume':
      stroke(ctx, () => {
        ctx.moveTo(-s * 0.58, -s * 0.18);
        ctx.lineTo(-s * 0.28, -s * 0.18);
        ctx.lineTo(s * 0.04, -s * 0.5);
        ctx.lineTo(s * 0.04, s * 0.5);
        ctx.lineTo(-s * 0.28, s * 0.18);
        ctx.lineTo(-s * 0.58, s * 0.18);
        ctx.closePath();
        ctx.moveTo(s * 0.24, -s * 0.3);
        ctx.quadraticCurveTo(s * 0.52, 0, s * 0.24, s * 0.3);
        ctx.moveTo(s * 0.4, -s * 0.52);
        ctx.quadraticCurveTo(s * 0.82, 0, s * 0.4, s * 0.52);
      });
      break;
    case 'vibrate':
      stroke(ctx, () => {
        ctx.roundRect(-s * 0.3, -s * 0.62, s * 0.6, s * 1.24, s * 0.12);
        ctx.moveTo(-s * 0.56, -s * 0.36);
        ctx.lineTo(-s * 0.72, -s * 0.36);
        ctx.moveTo(-s * 0.56, s * 0.2);
        ctx.lineTo(-s * 0.72, s * 0.2);
        ctx.moveTo(s * 0.56, -s * 0.36);
        ctx.lineTo(s * 0.72, -s * 0.36);
        ctx.moveTo(s * 0.56, s * 0.2);
        ctx.lineTo(s * 0.72, s * 0.2);
      });
      break;
    case 'shield':
      stroke(ctx, () => {
        ctx.moveTo(0, -s * 0.66);
        ctx.lineTo(s * 0.58, -s * 0.42);
        ctx.lineTo(s * 0.48, s * 0.18);
        ctx.quadraticCurveTo(s * 0.34, s * 0.56, 0, s * 0.7);
        ctx.quadraticCurveTo(-s * 0.34, s * 0.56, -s * 0.48, s * 0.18);
        ctx.lineTo(-s * 0.58, -s * 0.42);
        ctx.closePath();
        ctx.moveTo(-s * 0.2, 0);
        ctx.lineTo(-s * 0.02, s * 0.18);
        ctx.lineTo(s * 0.26, -s * 0.16);
      });
      break;
    case 'info':
      stroke(ctx, () => {
        ctx.arc(0, 0, s * 0.64, 0, Math.PI * 2);
        ctx.moveTo(0, -s * 0.34);
        ctx.lineTo(0, -s * 0.22);
        ctx.moveTo(0, -s * 0.02);
        ctx.lineTo(0, s * 0.4);
      });
      break;
    case 'trash':
      stroke(ctx, () => {
        ctx.moveTo(-s * 0.62, -s * 0.42);
        ctx.lineTo(s * 0.62, -s * 0.42);
        ctx.moveTo(-s * 0.42, -s * 0.42);
        ctx.lineTo(-s * 0.34, s * 0.62);
        ctx.lineTo(s * 0.34, s * 0.62);
        ctx.lineTo(s * 0.42, -s * 0.42);
        ctx.moveTo(-s * 0.18, -s * 0.42);
        ctx.lineTo(-s * 0.12, -s * 0.66);
        ctx.lineTo(s * 0.12, -s * 0.66);
        ctx.lineTo(s * 0.18, -s * 0.42);
      });
      break;
    case 'user':
      stroke(ctx, () => {
        ctx.arc(0, -s * 0.28, s * 0.3, 0, Math.PI * 2);
        ctx.moveTo(-s * 0.62, s * 0.64);
        ctx.quadraticCurveTo(-s * 0.5, s * 0.02, 0, s * 0.02);
        ctx.quadraticCurveTo(s * 0.5, s * 0.02, s * 0.62, s * 0.64);
      });
      break;
    case 'edit':
      stroke(ctx, () => {
        ctx.moveTo(-s * 0.52, s * 0.52);
        ctx.lineTo(-s * 0.42, s * 0.18);
        ctx.lineTo(s * 0.36, -s * 0.58);
        ctx.lineTo(s * 0.62, -s * 0.32);
        ctx.lineTo(-s * 0.16, s * 0.44);
        ctx.closePath();
      });
      break;
    case 'refresh':
      stroke(ctx, () => {
        ctx.arc(0, 0, s * 0.55, -Math.PI * 0.15, Math.PI * 1.3);
        ctx.moveTo(s * 0.32, -s * 0.55);
        ctx.lineTo(s * 0.58, -s * 0.32);
        ctx.lineTo(s * 0.3, -s * 0.12);
      });
      break;
    case 'star':
      fill(ctx, () => {
        for (let i = 0; i < 10; i += 1) {
          const r = i % 2 === 0 ? s * 0.68 : s * 0.28;
          const a = (Math.PI / 5) * i - Math.PI / 2;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      });
      break;
    case 'spark':
      fill(ctx, () => {
        ctx.moveTo(0, -s * 0.7);
        ctx.quadraticCurveTo(s * 0.08, -s * 0.08, s * 0.7, 0);
        ctx.quadraticCurveTo(s * 0.08, s * 0.08, 0, s * 0.7);
        ctx.quadraticCurveTo(-s * 0.08, s * 0.08, -s * 0.7, 0);
        ctx.quadraticCurveTo(-s * 0.08, -s * 0.08, 0, -s * 0.7);
        ctx.closePath();
      });
      break;
    case 'crown':
      fill(ctx, () => {
        ctx.moveTo(-s * 0.7, s * 0.42);
        ctx.lineTo(-s * 0.58, -s * 0.3);
        ctx.lineTo(-s * 0.2, s * 0.05);
        ctx.lineTo(0, -s * 0.55);
        ctx.lineTo(s * 0.2, s * 0.05);
        ctx.lineTo(s * 0.58, -s * 0.3);
        ctx.lineTo(s * 0.7, s * 0.42);
        ctx.closePath();
      });
      break;
    case 'flame':
      fill(ctx, () => {
        ctx.moveTo(0, s * 0.68);
        ctx.quadraticCurveTo(-s * 0.65, s * 0.2, -s * 0.2, -s * 0.3);
        ctx.quadraticCurveTo(-s * 0.05, -s * 0.1, s * 0.02, -s * 0.68);
        ctx.quadraticCurveTo(s * 0.62, -s * 0.2, s * 0.55, s * 0.16);
        ctx.quadraticCurveTo(s * 0.5, s * 0.55, 0, s * 0.68);
        ctx.closePath();
      });
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

export function isIconName(name) {
  return ICON_NAMES.includes(ALIASES[name] || name);
}
