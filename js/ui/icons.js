import { hexToRgba, roundRectPath } from './draw.js';

/**
 * 卡通果冻图标库（Canvas 矢量绘制）。
 *
 * 参考图风格：
 * - 高饱和渐变 + 顶部白色高光 + 底部暗边，形成糖果/果冻质感；
 * - 图标本体不带方形底板，可单独放在按钮里；
 * - 需要“图鉴格子”时用 drawIconTile() 加一层奶油色圆角底板。
 *
 * 所有路径都在 -1..1 的局部坐标系内绘制，由 drawIcon 统一缩放。
 */

const TILE = {
  gold: ['#211806', '#352708'],
  blue: ['#071a2c', '#0b2942'],
  sky: ['#081c28', '#0b2b3a'],
  green: ['#0a2417', '#103a24'],
  purple: ['#1a1230', '#2a1a48'],
  red: ['#2a1013', '#3d181c'],
  slate: ['#0d1824', '#152838'],
  pink: ['#2a1220', '#3d1a2c'],
  orange: ['#2a1c0b', '#3d2a10'],
};

const TILE_EDGE = {
  gold: 'rgba(255, 207, 106, 0.5)',
  blue: 'rgba(94, 231, 255, 0.45)',
  sky: 'rgba(94, 231, 255, 0.4)',
  green: 'rgba(93, 242, 160, 0.45)',
  purple: 'rgba(201, 166, 255, 0.45)',
  red: 'rgba(255, 138, 138, 0.45)',
  slate: 'rgba(127, 166, 201, 0.4)',
  pink: 'rgba(255, 168, 212, 0.45)',
  orange: 'rgba(255, 207, 106, 0.45)',
};

const ICON_TILE = {
  trophy: 'gold',
  medal: 'gold',
  coin: 'gold',
  star: 'gold',
  spark: 'gold',
  crown: 'gold',
  flame: 'orange',
  bulb: 'gold',
  home: 'orange',
  edit: 'orange',
  replay: 'orange',
  bag: 'blue',
  cart: 'blue',
  book: 'blue',
  map: 'green',
  back: 'blue',
  play: 'blue',
  pause: 'blue',
  close: 'sky',
  lock: 'slate',
  info: 'blue',
  chat: 'blue',
  user: 'blue',
  volume: 'blue',
  share: 'blue',
  tv: 'blue',
  clock: 'blue',
  hourglass: 'blue',
  shield: 'blue',
  quiz: 'blue',
  music: 'purple',
  vibrate: 'purple',
  gear: 'purple',
  graduation: 'blue',
  mask: 'slate',
  fish: 'red',
  check: 'green',
  plus: 'green',
  heart: 'red',
  trash: 'red',
  image: 'green',
  bed: 'orange',
  bowl: 'red',
  library: 'purple',
  school: 'blue',
};

export function iconTileColors(name) {
  return TILE[ICON_TILE[name] || 'blue'];
}

// ------------------------------------------------------------
// 绘制小工具（局部坐标 -1..1）
// ------------------------------------------------------------
function path(ctx, build) {
  ctx.beginPath();
  build();
}

function paint(ctx, colors, edge, lineWidth = 0.07) {
  const gradient = ctx.createLinearGradient(0, -1, 0, 1);
  if (Array.isArray(colors)) {
    colors.forEach((color, index) => {
      gradient.addColorStop(index / Math.max(1, colors.length - 1), color);
    });
  } else {
    gradient.addColorStop(0, colors);
    gradient.addColorStop(1, colors);
  }
  ctx.fillStyle = gradient;
  ctx.fill();
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  return gradient;
}

function paintSolid(ctx, color, edge, lineWidth = 0.07) {
  ctx.fillStyle = color;
  ctx.fill();
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function fillRR(ctx, x, y, w, h, r, colors, edge, lineWidth = 0.07) {
  path(ctx, () => roundRectPath(ctx, x, y, w, h, r));
  return paint(ctx, colors, edge, lineWidth);
}

function circle(ctx, x, y, r, colors, edge, lineWidth = 0.07) {
  path(ctx, () => ctx.arc(x, y, r, 0, Math.PI * 2));
  if (Array.isArray(colors) || typeof colors === 'string') {
    if (typeof colors === 'string') paintSolid(ctx, colors, edge, lineWidth);
    else paint(ctx, colors, edge, lineWidth);
  }
}

/** 顶部椭圆高光 */
function glint(ctx, cx, cy, rx, ry, alpha = 0.75, rotation = 0) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.scale(rx, ry);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

/** 柔和投影：包裹一次绘制 */
function withShadow(ctx, color, blur, dy, draw) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = dy;
  draw();
  ctx.restore();
}

function starPath(ctx, cx, cy, outer, inner) {
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function fiveStar(ctx, cx, cy, outer, inner, colors, edge) {
  path(ctx, () => starPath(ctx, cx, cy, outer, inner));
  paint(ctx, colors, edge, 0.045);
}

function sparkle(ctx, cx, cy, size, color = '#ffffff', alpha = 0.95) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  path(ctx, () => {
    ctx.moveTo(cx, cy - size);
    ctx.quadraticCurveTo(cx + size * 0.14, cy - size * 0.14, cx + size, cy);
    ctx.quadraticCurveTo(cx + size * 0.14, cy + size * 0.14, cx, cy + size);
    ctx.quadraticCurveTo(cx - size * 0.14, cy + size * 0.14, cx - size, cy);
    ctx.quadraticCurveTo(cx - size * 0.14, cy - size * 0.14, cx, cy - size);
    ctx.closePath();
  });
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

const GOLD = ['#fff3b0', '#ffce3d', '#f5a300'];
const GOLD_EDGE = '#d98400';
const BLUE = ['#93dcff', '#43a7fb', '#2277e0'];
const BLUE_EDGE = '#1a63c4';
const GREEN = ['#b6f39a', '#57cf5f', '#28a63c'];
const GREEN_EDGE = '#1c8a30';
const RED = ['#ffb3a8', '#ff6b60', '#e73a30'];
const RED_EDGE = '#c62c24';
const PURPLE = ['#dcc4ff', '#a97bf5', '#7a4ae0'];
const PURPLE_EDGE = '#6335c4';
const ORANGE = ['#ffd89a', '#ffb03a', '#f5861a'];
const ORANGE_EDGE = '#d96f0c';
const CREAM = ['#ffffff', '#eef8ff'];

// ------------------------------------------------------------
// 图标绘制
// ------------------------------------------------------------
const DRAWERS = {
  // 奖杯：金色杯身 + 星星 + 双耳 + 底座
  trophy(ctx) {
    withShadow(ctx, 'rgba(214, 130, 0, 0.28)', 0.18, 0.08, () => {
      path(ctx, () => {
        ctx.moveTo(-0.5, -0.62);
        ctx.lineTo(0.5, -0.62);
        ctx.quadraticCurveTo(0.48, -0.02, 0.3, 0.1);
        ctx.quadraticCurveTo(0, 0.24, -0.3, 0.1);
        ctx.quadraticCurveTo(-0.48, -0.02, -0.5, -0.62);
        ctx.closePath();
      });
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 0.18;
      ctx.stroke();
      paint(ctx, GOLD, GOLD_EDGE, 0.06);
    });

    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 0.26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-0.58, -0.32, 0.24, Math.PI * 0.35, Math.PI * 1.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0.58, -0.32, 0.24, -Math.PI * 0.65, Math.PI * 0.65);
    ctx.stroke();
    ctx.strokeStyle = GOLD_EDGE;
    ctx.lineWidth = 0.13;
    ctx.beginPath();
    ctx.arc(-0.58, -0.32, 0.24, Math.PI * 0.35, Math.PI * 1.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0.58, -0.32, 0.24, -Math.PI * 0.65, Math.PI * 0.65);
    ctx.stroke();
    ctx.strokeStyle = '#ffd65a';
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    ctx.arc(-0.58, -0.32, 0.24, Math.PI * 0.35, Math.PI * 1.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0.58, -0.32, 0.24, -Math.PI * 0.65, Math.PI * 0.65);
    ctx.stroke();

    fillRR(ctx, -0.62, -0.72, 1.24, 0.16, 0.08, ['#ffe98a', '#ffbf1f'], GOLD_EDGE, 0.05);
    fillRR(ctx, -0.1, 0.18, 0.2, 0.2, 0.06, ['#ffd24b', '#f0a200'], GOLD_EDGE, 0.05);
    fillRR(ctx, -0.34, 0.34, 0.68, 0.16, 0.07, ['#ffe27a', '#ffb200'], GOLD_EDGE, 0.05);
    fillRR(ctx, -0.24, 0.5, 0.48, 0.18, 0.07, ['#ffd75c', '#eda400'], GOLD_EDGE, 0.05);

    fiveStar(ctx, 0, -0.3, 0.22, 0.09, ['#ffffff', '#fff4c2'], 'rgba(217,132,0,0.35)');
    glint(ctx, -0.24, -0.55, 0.2, 0.09, 0.7, -0.25);
    sparkle(ctx, -0.78, -0.78, 0.13, '#ffffff', 0.9);
    sparkle(ctx, 0.82, 0.28, 0.09, '#fff3b0', 0.85);
  },

  // 奖牌
  medal(ctx) {
    path(ctx, () => {
      ctx.moveTo(-0.4, -0.8);
      ctx.lineTo(-0.12, -0.24);
      ctx.lineTo(-0.5, -0.1);
      ctx.lineTo(-0.68, -0.66);
      ctx.closePath();
    });
    paint(ctx, RED, RED_EDGE, 0.04);
    path(ctx, () => {
      ctx.moveTo(0.4, -0.8);
      ctx.lineTo(0.12, -0.24);
      ctx.lineTo(0.5, -0.1);
      ctx.lineTo(0.68, -0.66);
      ctx.closePath();
    });
    paint(ctx, ['#ff8f8f', '#ef4a42'], RED_EDGE, 0.04);
    circle(ctx, 0, 0.16, 0.6, GOLD, GOLD_EDGE, 0.05);
    circle(ctx, 0, 0.16, 0.44, ['#fff7cf', '#ffd649'], 'rgba(217,132,0,0.5)', 0.04);
    fiveStar(ctx, 0, 0.16, 0.25, 0.1, ['#ffffff', '#ffeaa0'], 'rgba(217,132,0,0.3)');
    glint(ctx, -0.2, -0.1, 0.24, 0.1, 0.6, -0.4);
  },

  // 金币
  coin(ctx) {
    path(ctx, () => ctx.arc(0, 0.04, 0.78, 0, Math.PI * 2));
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 0.16;
    ctx.stroke();
    circle(ctx, 0, 0.04, 0.78, GOLD, GOLD_EDGE, 0.06);
    circle(ctx, 0, 0.04, 0.58, ['#ffdf6b', '#ffc21a'], 'rgba(217,132,0,0.45)', 0.05);
    fiveStar(ctx, 0, 0.04, 0.3, 0.12, ['#fffdf0', '#fff0a8'], 'rgba(217,132,0,0.28)');
    glint(ctx, -0.26, -0.34, 0.28, 0.12, 0.65, -0.35);
  },

  // 星星
  star(ctx) {
    withShadow(ctx, 'rgba(230, 160, 0, 0.3)', 0.16, 0.08, () => {
      path(ctx, () => starPath(ctx, 0, 0.04, 0.82, 0.36));
      paint(ctx, GOLD, GOLD_EDGE, 0.05);
    });
    glint(ctx, -0.18, -0.3, 0.16, 0.1, 0.65, -0.4);
    sparkle(ctx, 0.74, -0.5, 0.11, '#fff6c9', 0.9);
  },

  // 四角闪光
  spark(ctx) {
    path(ctx, () => {
      ctx.moveTo(0, -0.86);
      ctx.quadraticCurveTo(0.14, -0.14, 0.86, 0);
      ctx.quadraticCurveTo(0.14, 0.14, 0, 0.86);
      ctx.quadraticCurveTo(-0.14, 0.14, -0.86, 0);
      ctx.quadraticCurveTo(-0.14, -0.14, 0, -0.86);
      ctx.closePath();
    });
    paint(ctx, ['#fff8cc', '#ffd23f'], 'rgba(224,160,0,0.65)', 0.03);
    sparkle(ctx, 0.58, -0.58, 0.2, '#ffffff', 0.85);
  },

  // 皇冠
  crown(ctx) {
    withShadow(ctx, 'rgba(214, 150, 0, 0.3)', 0.16, 0.08, () => {
      path(ctx, () => {
        ctx.moveTo(-0.78, 0.46);
        ctx.lineTo(-0.68, -0.34);
        ctx.lineTo(-0.26, 0.02);
        ctx.lineTo(0, -0.72);
        ctx.lineTo(0.26, 0.02);
        ctx.lineTo(0.68, -0.34);
        ctx.lineTo(0.78, 0.46);
        ctx.closePath();
      });
      paint(ctx, GOLD, GOLD_EDGE, 0.05);
    });
    fillRR(ctx, -0.8, 0.46, 1.6, 0.22, 0.1, ['#ffe98a', '#ffb800'], GOLD_EDGE, 0.05);
    circle(ctx, -0.5, 0.57, 0.075, '#ff5f6d');
    circle(ctx, 0, 0.57, 0.075, '#4aa8ff');
    circle(ctx, 0.5, 0.57, 0.075, '#5ad07a');
    circle(ctx, 0, -0.78, 0.1, ['#fff6c9', '#ffd23f'], GOLD_EDGE, 0.04);
    glint(ctx, -0.3, 0.18, 0.18, 0.08, 0.5, -0.5);
  },

  // 火焰
  flame(ctx) {
    path(ctx, () => {
      ctx.moveTo(0, 0.82);
      ctx.quadraticCurveTo(-0.66, 0.5, -0.5, 0.02);
      ctx.quadraticCurveTo(-0.44, -0.24, -0.2, -0.44);
      ctx.quadraticCurveTo(-0.18, -0.12, 0.02, -0.16);
      ctx.quadraticCurveTo(0.08, -0.5, 0.3, -0.82);
      ctx.quadraticCurveTo(0.78, -0.3, 0.7, 0.16);
      ctx.quadraticCurveTo(0.64, 0.6, 0, 0.82);
      ctx.closePath();
    });
    paint(ctx, ['#ffd66b', '#ff9a2e', '#f2542d'], '#d9431c', 0.04);
    path(ctx, () => {
      ctx.moveTo(0.06, 0.6);
      ctx.quadraticCurveTo(-0.3, 0.36, -0.22, 0.08);
      ctx.quadraticCurveTo(-0.16, -0.08, 0.02, -0.2);
      ctx.quadraticCurveTo(0.4, 0.06, 0.34, 0.3);
      ctx.quadraticCurveTo(0.3, 0.52, 0.06, 0.6);
      ctx.closePath();
    });
    paint(ctx, ['#fff3b0', '#ffd75e'], null);
  },

  // 灯泡
  bulb(ctx) {
    withShadow(ctx, 'rgba(230, 170, 0, 0.25)', 0.16, 0.06, () => {
      circle(ctx, 0, -0.16, 0.58, ['#fff6b0', '#ffd336'], '#e0a700', 0.05);
    });
    path(ctx, () => {
      ctx.moveTo(-0.26, 0.3);
      ctx.quadraticCurveTo(-0.3, 0.5, -0.2, 0.56);
      ctx.lineTo(0.2, 0.56);
      ctx.quadraticCurveTo(0.3, 0.5, 0.26, 0.3);
      ctx.closePath();
    });
    paint(ctx, ['#e8eef8', '#b9c9dd'], '#93a7c0', 0.05);
    fillRR(ctx, -0.22, 0.56, 0.44, 0.12, 0.05, ['#dbe6f4', '#a9bdd6'], '#8fa4bd', 0.04);
    fillRR(ctx, -0.17, 0.68, 0.34, 0.1, 0.05, ['#c9d8ea', '#93aac6'], '#8199b5', 0.04);

    ctx.strokeStyle = '#e0a200';
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.12, -0.02);
    ctx.lineTo(0, -0.26);
    ctx.lineTo(0.12, -0.02);
    ctx.stroke();
    glint(ctx, -0.2, -0.42, 0.18, 0.1, 0.75, -0.4);

    ctx.strokeStyle = '#ffc21a';
    ctx.lineWidth = 0.075;
    ctx.lineCap = 'round';
    [-0.62, 0, 0.62].forEach((angle) => {
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle - Math.PI / 2) * 0.7, -0.16 + Math.sin(angle - Math.PI / 2) * 0.7);
      ctx.lineTo(Math.cos(angle - Math.PI / 2) * 0.88, -0.16 + Math.sin(angle - Math.PI / 2) * 0.88);
      ctx.stroke();
    });
  },

  // 打开的书
  book(ctx) {
    withShadow(ctx, 'rgba(30, 110, 200, 0.22)', 0.16, 0.07, () => {
      fillRR(ctx, -0.84, -0.6, 1.68, 1.24, 0.16, BLUE, BLUE_EDGE, 0.05);
    });
    path(ctx, () => {
      ctx.moveTo(-0.78, -0.5);
      ctx.lineTo(-0.04, -0.34);
      ctx.lineTo(-0.04, 0.54);
      ctx.lineTo(-0.72, 0.46);
      ctx.quadraticCurveTo(-0.8, 0.44, -0.78, 0.32);
      ctx.closePath();
    });
    paint(ctx, ['#ffffff', '#e8f6ff'], null);
    path(ctx, () => {
      ctx.moveTo(0.78, -0.5);
      ctx.lineTo(0.04, -0.34);
      ctx.lineTo(0.04, 0.54);
      ctx.lineTo(0.72, 0.46);
      ctx.quadraticCurveTo(0.8, 0.44, 0.78, 0.32);
      ctx.closePath();
    });
    paint(ctx, ['#ffffff', '#e1f3ff'], null);
    fillRR(ctx, -0.05, -0.36, 0.1, 0.92, 0.05, ['#cfeaff', '#8cc6f2'], null);

    ctx.strokeStyle = '#9fc9e8';
    ctx.lineWidth = 0.055;
    ctx.lineCap = 'round';
    [-0.02, 0.18, 0.38].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(-0.64, y - 0.08);
      ctx.lineTo(-0.16, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.16, y);
      ctx.lineTo(0.64, y - 0.08);
      ctx.stroke();
    });
    fillRR(ctx, 0.42, -0.56, 0.16, 0.36, 0.03, '#ff6b6b', null);
    glint(ctx, 0, -0.5, 0.4, 0.08, 0.35);
  },

  // 购物袋
  bag(ctx) {
    withShadow(ctx, 'rgba(30, 110, 200, 0.25)', 0.16, 0.07, () => {
      path(ctx, () => {
        ctx.moveTo(-0.6, -0.34);
        ctx.lineTo(0.6, -0.34);
        ctx.lineTo(0.72, 0.7);
        ctx.quadraticCurveTo(0.72, 0.8, 0.62, 0.8);
        ctx.lineTo(-0.62, 0.8);
        ctx.quadraticCurveTo(-0.72, 0.8, -0.72, 0.7);
        ctx.closePath();
      });
      paint(ctx, BLUE, BLUE_EDGE, 0.05);
    });
    ctx.strokeStyle = '#e8f6ff';
    ctx.lineWidth = 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -0.34, 0.34, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#9fd2f7';
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.arc(0, -0.34, 0.34, Math.PI, Math.PI * 2);
    ctx.stroke();
    glint(ctx, -0.2, 0.05, 0.22, 0.12, 0.45, -0.2);
    circle(ctx, 0, 0.28, 0.1, 'rgba(255,255,255,0.55)');
  },

  // 购物车
  cart(ctx) {
    ctx.strokeStyle = BLUE_EDGE;
    ctx.lineWidth = 0.12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.86, -0.56);
    ctx.lineTo(-0.58, -0.56);
    ctx.lineTo(-0.4, -0.06);
    ctx.stroke();
    path(ctx, () => {
      ctx.moveTo(-0.44, -0.24);
      ctx.lineTo(0.66, -0.24);
      ctx.lineTo(0.52, 0.34);
      ctx.lineTo(-0.34, 0.34);
      ctx.closePath();
    });
    paint(ctx, BLUE, BLUE_EDGE, 0.05);
    circle(ctx, -0.24, 0.62, 0.16, ['#9fd2f7', '#2f7fe8'], BLUE_EDGE, 0.04);
    circle(ctx, 0.44, 0.62, 0.16, ['#9fd2f7', '#2f7fe8'], BLUE_EDGE, 0.04);
    glint(ctx, -0.1, -0.1, 0.28, 0.09, 0.5, -0.1);
  },

  // 地图
  map(ctx) {
    path(ctx, () => {
      ctx.moveTo(-0.8, -0.5);
      ctx.lineTo(-0.28, -0.66);
      ctx.lineTo(0.24, -0.5);
      ctx.lineTo(0.8, -0.66);
      ctx.lineTo(0.8, 0.5);
      ctx.lineTo(0.24, 0.66);
      ctx.lineTo(-0.28, 0.5);
      ctx.lineTo(-0.8, 0.66);
      ctx.closePath();
    });
    paint(ctx, ['#e4ffd0', '#7fd867'], '#3f9c3c', 0.06);
    path(ctx, () => {
      ctx.moveTo(-0.28, -0.62);
      ctx.lineTo(-0.28, 0.52);
      ctx.lineTo(-0.8, 0.64);
      ctx.lineTo(-0.8, -0.5);
      ctx.closePath();
    });
    paint(ctx, ['#ffffff', '#cdf2b8'], null);
    path(ctx, () => {
      ctx.moveTo(0.24, -0.48);
      ctx.lineTo(0.24, 0.64);
      ctx.lineTo(0.8, 0.48);
      ctx.lineTo(0.8, -0.62);
      ctx.closePath();
    });
    paint(ctx, ['#b8f096', '#5cc44e'], null);
    ctx.strokeStyle = '#ff8a5c';
    ctx.lineWidth = 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.56, 0.36);
    ctx.quadraticCurveTo(-0.16, 0.12, 0, -0.08);
    ctx.quadraticCurveTo(0.16, -0.3, 0.46, -0.38);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = 'rgba(200,40,30,0.35)';
    ctx.shadowBlur = 0.12;
    ctx.shadowOffsetY = 0.05;
    fillRR(ctx, -0.4, -0.5, 0.32, 0.36, 0.14, ['#ff9c8c', '#ef4438'], '#c62c24', 0.04);
    ctx.restore();
    circle(ctx, -0.24, -0.32, 0.07, '#ffffff');
    glint(ctx, -0.6, -0.34, 0.14, 0.06, 0.45);
  },

  // 返回（蓝色圆形按钮）
  back(ctx) {
    circle(ctx, 0, 0, 0.86, BLUE, BLUE_EDGE, 0.05);
    glint(ctx, -0.2, -0.46, 0.4, 0.18, 0.45);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0.34, -0.42);
    ctx.lineTo(-0.24, 0);
    ctx.lineTo(0.34, 0.42);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.2, 0);
    ctx.lineTo(0.42, 0);
    ctx.stroke();
  },

  // 播放
  play(ctx) {
    circle(ctx, 0, 0, 0.86, BLUE, BLUE_EDGE, 0.05);
    glint(ctx, -0.2, -0.46, 0.4, 0.18, 0.45);
    path(ctx, () => {
      ctx.moveTo(-0.26, -0.44);
      ctx.lineTo(0.46, 0);
      ctx.lineTo(-0.26, 0.44);
      ctx.closePath();
    });
    paintSolid(ctx, '#ffffff', null);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.14;
    ctx.stroke();
  },

  // 暂停
  pause(ctx) {
    circle(ctx, 0, 0, 0.86, BLUE, BLUE_EDGE, 0.05);
    glint(ctx, -0.2, -0.46, 0.4, 0.18, 0.45);
    fillRR(ctx, -0.34, -0.38, 0.24, 0.76, 0.12, '#ffffff');
    fillRR(ctx, 0.1, -0.38, 0.24, 0.76, 0.12, '#ffffff');
  },

  // 关闭（白底蓝叉，参考图右上角）
  close(ctx) {
    circle(ctx, 0, 0, 0.86, ['#ffffff', '#eef9ff'], '#a9d6f2', 0.05);
    ctx.strokeStyle = '#2f7fe8';
    ctx.lineWidth = 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.32, -0.32);
    ctx.lineTo(0.32, 0.32);
    ctx.moveTo(0.32, -0.32);
    ctx.lineTo(-0.32, 0.32);
    ctx.stroke();
    glint(ctx, -0.24, -0.48, 0.34, 0.14, 0.6);
  },

  // 勾选
  check(ctx) {
    circle(ctx, 0, 0, 0.86, GREEN, GREEN_EDGE, 0.05);
    glint(ctx, -0.2, -0.46, 0.4, 0.18, 0.45);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.17;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.4, 0.02);
    ctx.lineTo(-0.1, 0.32);
    ctx.lineTo(0.44, -0.3);
    ctx.stroke();
  },

  // 加号
  plus(ctx) {
    circle(ctx, 0, 0, 0.84, GREEN, GREEN_EDGE, 0.05);
    glint(ctx, -0.2, -0.46, 0.36, 0.16, 0.35);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -0.38);
    ctx.lineTo(0, 0.38);
    ctx.moveTo(-0.38, 0);
    ctx.lineTo(0.38, 0);
    ctx.stroke();
  },

  // 爱心
  heart(ctx) {
    withShadow(ctx, 'rgba(214, 50, 50, 0.28)', 0.16, 0.07, () => {
      path(ctx, () => {
        ctx.moveTo(0, 0.74);
        ctx.bezierCurveTo(-1.02, 0.02, -0.66, -0.72, -0.16, -0.44);
        ctx.quadraticCurveTo(0, -0.36, 0, -0.24);
        ctx.quadraticCurveTo(0, -0.36, 0.16, -0.44);
        ctx.bezierCurveTo(0.66, -0.72, 1.02, 0.02, 0, 0.74);
        ctx.closePath();
      });
      paint(ctx, RED, RED_EDGE, 0.05);
    });
    glint(ctx, -0.34, -0.3, 0.2, 0.12, 0.6, -0.5);
    glint(ctx, 0.36, -0.16, 0.08, 0.05, 0.5);
  },

  // 时钟
  clock(ctx) {
    circle(ctx, 0, 0, 0.82, BLUE, BLUE_EDGE, 0.05);
    circle(ctx, 0, 0, 0.64, ['#ffffff', '#eaf7ff'], null);
    ctx.strokeStyle = '#2b6fc4';
    ctx.lineWidth = 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -0.34);
    ctx.lineTo(0, 0);
    ctx.lineTo(0.26, 0.16);
    ctx.stroke();
    circle(ctx, 0, 0, 0.07, '#2b6fc4');
    glint(ctx, -0.24, -0.44, 0.34, 0.14, 0.4);
  },

  // 沙漏
  hourglass(ctx) {
    fillRR(ctx, -0.56, -0.78, 1.12, 0.16, 0.08, BLUE, BLUE_EDGE, 0.04);
    fillRR(ctx, -0.56, 0.62, 1.12, 0.16, 0.08, BLUE, BLUE_EDGE, 0.04);
    path(ctx, () => {
      ctx.moveTo(-0.44, -0.62);
      ctx.lineTo(0.44, -0.62);
      ctx.quadraticCurveTo(0.4, -0.14, 0.06, 0);
      ctx.quadraticCurveTo(0.4, 0.14, 0.44, 0.62);
      ctx.lineTo(-0.44, 0.62);
      ctx.quadraticCurveTo(-0.4, 0.14, -0.06, 0);
      ctx.quadraticCurveTo(-0.4, -0.14, -0.44, -0.62);
      ctx.closePath();
    });
    paint(ctx, ['rgba(255,255,255,0.9)', 'rgba(225,246,255,0.9)'], '#7cb8e0', 0.045);
    path(ctx, () => {
      ctx.moveTo(-0.3, 0.42);
      ctx.lineTo(0.3, 0.42);
      ctx.quadraticCurveTo(0.2, 0.18, 0, 0.06);
      ctx.quadraticCurveTo(-0.2, 0.18, -0.3, 0.42);
      ctx.closePath();
    });
    paint(ctx, ['#ffd766', '#ffb01f'], null);
    path(ctx, () => {
      ctx.moveTo(-0.26, -0.5);
      ctx.lineTo(0.26, -0.5);
      ctx.quadraticCurveTo(0.18, -0.32, 0, -0.2);
      ctx.quadraticCurveTo(-0.18, -0.32, -0.26, -0.5);
      ctx.closePath();
    });
    paint(ctx, ['#ffd766', '#ffb01f'], null);
    glint(ctx, -0.18, -0.56, 0.18, 0.06, 0.5);
  },

  // 锁
  lock(ctx) {
    ctx.strokeStyle = '#6f96c0';
    ctx.lineWidth = 0.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -0.2, 0.36, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#cfe4f8';
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.arc(0, -0.2, 0.36, Math.PI, Math.PI * 2);
    ctx.stroke();
    fillRR(ctx, -0.58, -0.14, 1.16, 0.86, 0.2, ['#f2f9ff', '#8fb2d6'], '#5f88b4', 0.05);
    circle(ctx, 0, 0.14, 0.13, '#3d6795');
    fillRR(ctx, -0.06, 0.18, 0.12, 0.26, 0.06, '#3d6795');
    glint(ctx, -0.26, 0.0, 0.28, 0.11, 0.65);
  },

  // 放大镜 / 信息
  info(ctx) {
    circle(ctx, 0, 0, 0.84, BLUE, BLUE_EDGE, 0.05);
    glint(ctx, -0.2, -0.46, 0.36, 0.16, 0.4);
    circle(ctx, 0, -0.34, 0.1, '#ffffff');
    fillRR(ctx, -0.08, -0.12, 0.16, 0.5, 0.08, '#ffffff');
  },

  // 问号（真假题）
  quiz(ctx) {
    circle(ctx, 0, 0, 0.84, ['#ffd48a', '#ffab25', '#f38613'], '#d96f0c', 0.05);
    glint(ctx, -0.2, -0.46, 0.36, 0.16, 0.4);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -0.22, 0.24, Math.PI * 0.95, Math.PI * 0.1 + Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0.02);
    ctx.lineTo(0, 0.14);
    ctx.stroke();
    circle(ctx, 0, 0.4, 0.09, '#ffffff');
  },

  // 聊天
  chat(ctx) {
    path(ctx, () => {
      ctx.moveTo(-0.7, -0.6);
      ctx.lineTo(0.7, -0.6);
      ctx.quadraticCurveTo(0.82, -0.6, 0.82, -0.46);
      ctx.lineTo(0.82, 0.28);
      ctx.quadraticCurveTo(0.82, 0.42, 0.68, 0.42);
      ctx.lineTo(0.02, 0.42);
      ctx.lineTo(-0.3, 0.72);
      ctx.lineTo(-0.26, 0.42);
      ctx.lineTo(-0.7, 0.42);
      ctx.quadraticCurveTo(-0.82, 0.42, -0.82, 0.28);
      ctx.lineTo(-0.82, -0.46);
      ctx.quadraticCurveTo(-0.82, -0.6, -0.7, -0.6);
      ctx.closePath();
    });
    paint(ctx, BLUE, BLUE_EDGE, 0.05);
    [-0.36, 0, 0.36].forEach((x) => circle(ctx, x, -0.06, 0.09, '#ffffff'));
    glint(ctx, -0.3, -0.42, 0.3, 0.1, 0.35);
  },

  // 用户
  user(ctx) {
    circle(ctx, 0, -0.34, 0.38, BLUE, BLUE_EDGE, 0.05);
    glint(ctx, -0.14, -0.5, 0.16, 0.08, 0.5);
    path(ctx, () => {
      ctx.moveTo(-0.72, 0.76);
      ctx.quadraticCurveTo(-0.66, 0.12, 0, 0.12);
      ctx.quadraticCurveTo(0.66, 0.12, 0.72, 0.76);
      ctx.closePath();
    });
    paint(ctx, BLUE, BLUE_EDGE, 0.05);
    glint(ctx, -0.24, 0.28, 0.2, 0.08, 0.3);
  },

  // 分享
  share(ctx) {
    withShadow(ctx, 'rgba(30, 110, 200, 0.25)', 0.14, 0.06, () => {
      circle(ctx, -0.52, 0, 0.3, BLUE, BLUE_EDGE, 0.045);
      circle(ctx, 0.5, -0.5, 0.3, BLUE, BLUE_EDGE, 0.045);
      circle(ctx, 0.5, 0.5, 0.3, BLUE, BLUE_EDGE, 0.045);
    });
    ctx.strokeStyle = '#2f7fe8';
    ctx.lineWidth = 0.13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.24, -0.1);
    ctx.lineTo(0.24, -0.36);
    ctx.moveTo(-0.24, 0.1);
    ctx.lineTo(0.24, 0.36);
    ctx.stroke();
    glint(ctx, -0.58, -0.12, 0.12, 0.06, 0.6);
    glint(ctx, 0.44, -0.62, 0.12, 0.06, 0.6);
    glint(ctx, 0.44, 0.38, 0.12, 0.06, 0.6);
  },

  // 电视/广告
  tv(ctx) {
    fillRR(ctx, -0.84, -0.62, 1.68, 1.1, 0.16, BLUE, BLUE_EDGE, 0.05);
    fillRR(ctx, -0.68, -0.46, 1.36, 0.78, 0.1, ['#ffffff', '#dff4ff'], null);
    path(ctx, () => {
      ctx.moveTo(-0.14, -0.24);
      ctx.lineTo(0.28, 0);
      ctx.lineTo(-0.14, 0.24);
      ctx.closePath();
    });
    paint(ctx, ['#7cc4ff', '#2f7fe8'], null);
    fillRR(ctx, -0.3, 0.48, 0.6, 0.12, 0.05, ['#8fd0ff', '#2f7fe8'], null);
    fillRR(ctx, -0.5, 0.58, 1, 0.12, 0.06, ['#b8e4ff', '#4a9df8'], BLUE_EDGE, 0.035);
    glint(ctx, -0.42, -0.52, 0.24, 0.08, 0.4);
  },

  // 重玩/刷新
  replay(ctx) {
    circle(ctx, 0, 0, 0.86, ['#ffd98f', '#ffab25', '#f38613'], '#d96f0c', 0.05);
    circle(ctx, 0, 0, 0.66, ['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)'], null);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.19;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0.02, 0.44, -Math.PI * 0.2, Math.PI * 1.42);
    ctx.stroke();
    path(ctx, () => {
      ctx.moveTo(-0.62, -0.44);
      ctx.lineTo(-0.12, -0.34);
      ctx.lineTo(-0.44, 0.06);
      ctx.closePath();
    });
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    glint(ctx, -0.24, -0.5, 0.34, 0.14, 0.4);
  },

  // 主页
  home(ctx) {
    withShadow(ctx, 'rgba(220, 140, 0, 0.22)', 0.14, 0.06, () => {
      path(ctx, () => {
        ctx.moveTo(0, -0.78);
        ctx.lineTo(0.8, -0.06);
        ctx.lineTo(0.6, -0.06);
        ctx.lineTo(0.6, 0.68);
        ctx.quadraticCurveTo(0.6, 0.8, 0.48, 0.8);
        ctx.lineTo(-0.48, 0.8);
        ctx.quadraticCurveTo(-0.6, 0.8, -0.6, 0.68);
        ctx.lineTo(-0.6, -0.06);
        ctx.lineTo(-0.8, -0.06);
        ctx.closePath();
      });
      paint(ctx, ORANGE, ORANGE_EDGE, 0.05);
    });
    fillRR(ctx, -0.2, 0.26, 0.4, 0.54, 0.1, ['#8fd6ff', '#3d94ef'], '#2b6fc4', 0.04);
    circle(ctx, 0.1, 0.52, 0.04, '#dff2ff');
    glint(ctx, -0.3, -0.18, 0.22, 0.08, 0.4, -0.3);
  },

  // 铅笔
  edit(ctx) {
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    fillRR(ctx, -0.2, -0.82, 0.4, 1.1, 0.08, ORANGE, ORANGE_EDGE, 0.045);
    path(ctx, () => {
      ctx.moveTo(-0.2, 0.28);
      ctx.lineTo(0.2, 0.28);
      ctx.lineTo(0, 0.72);
      ctx.closePath();
    });
    paint(ctx, ['#ffe3b0', '#ffc06a'], ORANGE_EDGE, 0.04);
    path(ctx, () => {
      ctx.moveTo(-0.08, 0.56);
      ctx.lineTo(0.08, 0.56);
      ctx.lineTo(0, 0.72);
      ctx.closePath();
    });
    paint(ctx, ['#ffd08a', '#c98a3a'], null);
    fillRR(ctx, -0.2, -0.82, 0.4, 0.16, 0.06, ['#ff9f8a', '#ef5a45'], '#cf4331', 0.035);
    glint(ctx, -0.04, -0.5, 0.05, 0.16, 0.45);
    ctx.restore();
  },

  // 垃圾桶
  trash(ctx) {
    fillRR(ctx, -0.62, -0.56, 1.24, 0.16, 0.08, ['#ff9d92', '#ef5a4c'], '#cf4331', 0.04);
    fillRR(ctx, -0.16, -0.72, 0.32, 0.16, 0.06, ['#ff9d92', '#ef5a4c'], '#cf4331', 0.04);
    path(ctx, () => {
      ctx.moveTo(-0.5, -0.36);
      ctx.lineTo(0.5, -0.36);
      ctx.lineTo(0.4, 0.72);
      ctx.quadraticCurveTo(0.4, 0.8, 0.3, 0.8);
      ctx.lineTo(-0.3, 0.8);
      ctx.quadraticCurveTo(-0.4, 0.8, -0.4, 0.72);
      ctx.closePath();
    });
    paint(ctx, ['#ff9d92', '#f2544b', '#dd3b31'], '#cf4331', 0.045);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'round';
    [-0.2, 0, 0.2].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, -0.14);
      ctx.lineTo(x, 0.56);
      ctx.stroke();
    });
    glint(ctx, -0.24, -0.24, 0.16, 0.07, 0.4);
  },

  // 盾牌
  shield(ctx) {
    path(ctx, () => {
      ctx.moveTo(0, -0.78);
      ctx.lineTo(0.7, -0.5);
      ctx.lineTo(0.6, 0.18);
      ctx.quadraticCurveTo(0.48, 0.62, 0, 0.82);
      ctx.quadraticCurveTo(-0.48, 0.62, -0.6, 0.18);
      ctx.lineTo(-0.7, -0.5);
      ctx.closePath();
    });
    paint(ctx, ['#8fd0ff', '#3d94ef', '#1f6fd0'], BLUE_EDGE, 0.05);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.13;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.26, 0);
    ctx.lineTo(-0.04, 0.22);
    ctx.lineTo(0.3, -0.2);
    ctx.stroke();
    glint(ctx, -0.26, -0.44, 0.24, 0.12, 0.4, -0.3);
  },

  // 齿轮
  gear(ctx) {
    withShadow(ctx, 'rgba(96, 60, 190, 0.22)', 0.14, 0.06, () => {
      ctx.save();
      for (let i = 0; i < 8; i += 1) {
        ctx.save();
        ctx.rotate((Math.PI / 4) * i);
        path(ctx, () => {
          ctx.moveTo(-0.16, -0.46);
          ctx.lineTo(0.16, -0.46);
          ctx.lineTo(0.12, -0.86);
          ctx.quadraticCurveTo(0, -0.94, -0.12, -0.86);
          ctx.closePath();
        });
        paint(ctx, PURPLE, PURPLE_EDGE, 0.04);
        ctx.restore();
      }
      circle(ctx, 0, 0, 0.64, PURPLE, PURPLE_EDGE, 0.05);
      ctx.restore();
    });
    circle(ctx, 0, 0, 0.3, ['#ffffff', '#e9ddff'], 'rgba(99,53,196,0.5)', 0.05);
    glint(ctx, -0.26, -0.42, 0.26, 0.11, 0.45, -0.4);
  },

  // 音乐
  music(ctx) {
    fillRR(ctx, 0.02, -0.72, 0.16, 0.9, 0.06, PURPLE, PURPLE_EDGE, 0.035);
    path(ctx, () => {
      ctx.moveTo(0.02, -0.72);
      ctx.quadraticCurveTo(0.5, -0.62, 0.52, -0.28);
      ctx.quadraticCurveTo(0.34, -0.44, 0.02, -0.4);
      ctx.closePath();
    });
    paint(ctx, PURPLE, PURPLE_EDGE, 0.035);
    circle(ctx, -0.18, 0.4, 0.28, PURPLE, PURPLE_EDGE, 0.04);
    circle(ctx, 0.44, 0.26, 0.22, PURPLE, PURPLE_EDGE, 0.04);
    glint(ctx, -0.24, 0.24, 0.14, 0.06, 0.5);
  },

  // 音量
  volume(ctx) {
    path(ctx, () => {
      ctx.moveTo(-0.72, -0.22);
      ctx.lineTo(-0.36, -0.22);
      ctx.lineTo(0.02, -0.62);
      ctx.lineTo(0.02, 0.62);
      ctx.lineTo(-0.36, 0.22);
      ctx.lineTo(-0.72, 0.22);
      ctx.closePath();
    });
    paint(ctx, BLUE, BLUE_EDGE, 0.05);
    ctx.strokeStyle = '#2f7fe8';
    ctx.lineWidth = 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0.1, 0, 0.34, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0.1, 0, 0.58, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
    glint(ctx, -0.34, -0.44, 0.16, 0.07, 0.4);
  },

  // 振动
  vibrate(ctx) {
    fillRR(ctx, -0.28, -0.72, 0.56, 1.44, 0.14, PURPLE, PURPLE_EDGE, 0.045);
    fillRR(ctx, -0.17, -0.58, 0.34, 0.94, 0.06, ['#ffffff', '#eadcff'], null);
    circle(ctx, 0, 0.5, 0.08, 'rgba(255,255,255,0.85)');
    ctx.strokeStyle = '#a97bf5';
    ctx.lineWidth = 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.44, -0.3);
    ctx.quadraticCurveTo(-0.62, 0, -0.44, 0.3);
    ctx.moveTo(-0.62, -0.5);
    ctx.quadraticCurveTo(-0.86, 0, -0.62, 0.5);
    ctx.moveTo(0.44, -0.3);
    ctx.quadraticCurveTo(0.62, 0, 0.44, 0.3);
    ctx.moveTo(0.62, -0.5);
    ctx.quadraticCurveTo(0.86, 0, 0.62, 0.5);
    ctx.stroke();
    glint(ctx, -0.1, -0.54, 0.12, 0.06, 0.5);
  },

  // 学士帽
  graduation(ctx) {
    path(ctx, () => {
      ctx.moveTo(0, -0.62);
      ctx.lineTo(0.9, -0.26);
      ctx.lineTo(0, 0.1);
      ctx.lineTo(-0.9, -0.26);
      ctx.closePath();
    });
    paint(ctx, ['#5b6f9c', '#2b3d63'], '#1c2a49', 0.04);
    path(ctx, () => {
      ctx.moveTo(-0.46, 0);
      ctx.lineTo(0.46, 0);
      ctx.quadraticCurveTo(0.46, 0.4, 0, 0.54);
      ctx.quadraticCurveTo(-0.46, 0.4, -0.46, 0);
      ctx.closePath();
    });
    paint(ctx, ['#4a5d88', '#22314f'], '#1a2640', 0.04);
    ctx.strokeStyle = '#ffc531';
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.86, -0.24);
    ctx.lineTo(0.86, 0.36);
    ctx.stroke();
    circle(ctx, 0.86, 0.44, 0.12, ['#ffe98a', '#ffb400'], GOLD_EDGE, 0.035);
    glint(ctx, -0.3, -0.38, 0.26, 0.08, 0.28, -0.25);
  },

  // 抽象面具
  mask(ctx) {
    path(ctx, () => {
      ctx.moveTo(0, -0.7);
      ctx.quadraticCurveTo(0.7, -0.78, 0.72, -0.1);
      ctx.quadraticCurveTo(0.74, 0.62, 0, 0.8);
      ctx.quadraticCurveTo(-0.74, 0.62, -0.72, -0.1);
      ctx.quadraticCurveTo(-0.7, -0.78, 0, -0.7);
      ctx.closePath();
    });
    paint(ctx, ['#6c7293', '#2c3348'], '#1b2030', 0.05);
    ctx.save();
    ctx.globalAlpha = 0.9;
    fillRR(ctx, -0.5, -0.34, 0.36, 0.26, 0.12, ['#ffffff', '#cfd8ef'], null);
    fillRR(ctx, 0.14, -0.34, 0.36, 0.26, 0.12, ['#ffffff', '#cfd8ef'], null);
    circle(ctx, -0.32, -0.21, 0.07, '#2b3248');
    circle(ctx, 0.32, -0.21, 0.07, '#2b3248');
    ctx.restore();
    ctx.strokeStyle = '#8b93b3';
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.26, 0.34);
    ctx.quadraticCurveTo(0, 0.5, 0.26, 0.34);
    ctx.stroke();
    glint(ctx, -0.3, -0.56, 0.2, 0.08, 0.3);
  },

  // 锦鲤
  fish(ctx) {
    path(ctx, () => {
      ctx.moveTo(0.34, 0);
      ctx.quadraticCurveTo(0.02, -0.56, -0.5, -0.34);
      ctx.quadraticCurveTo(-0.72, -0.2, -0.72, 0);
      ctx.quadraticCurveTo(-0.72, 0.2, -0.5, 0.34);
      ctx.quadraticCurveTo(0.02, 0.56, 0.34, 0);
      ctx.closePath();
    });
    paint(ctx, ['#ffd0b8', '#ff8f6b', '#f2543a'], '#d43f28', 0.045);
    path(ctx, () => {
      ctx.moveTo(0.3, 0);
      ctx.quadraticCurveTo(0.62, -0.42, 0.86, -0.34);
      ctx.quadraticCurveTo(0.72, 0, 0.86, 0.34);
      ctx.quadraticCurveTo(0.62, 0.42, 0.3, 0);
      ctx.closePath();
    });
    paint(ctx, ['#ffb59a', '#f2543a'], '#d43f28', 0.04);
    path(ctx, () => {
      ctx.moveTo(-0.2, -0.4);
      ctx.quadraticCurveTo(0.02, -0.12, -0.12, 0.1);
      ctx.quadraticCurveTo(-0.36, -0.06, -0.3, -0.32);
      ctx.closePath();
    });
    paint(ctx, ['#ffffff', '#e8f6ff'], null);
    circle(ctx, -0.48, -0.06, 0.07, '#2b3248');
    glint(ctx, -0.4, -0.2, 0.16, 0.06, 0.5);
  },

  // 图片题
  image(ctx) {
    fillRR(ctx, -0.82, -0.66, 1.64, 1.32, 0.18, ['#ffffff', '#e6f7ff'], '#7cb8e0', 0.05);
    fillRR(ctx, -0.68, -0.52, 1.36, 1.04, 0.12, ['#bfe9ff', '#8fd2ff'], null);
    circle(ctx, 0.32, -0.26, 0.14, ['#fff3a8', '#ffd23f'], null);
    path(ctx, () => {
      ctx.moveTo(-0.62, 0.42);
      ctx.lineTo(-0.2, -0.06);
      ctx.lineTo(0.12, 0.26);
      ctx.lineTo(0.36, -0.04);
      ctx.lineTo(0.62, 0.42);
      ctx.closePath();
    });
    paint(ctx, ['#e9fff0', '#79d68c'], null);
    glint(ctx, -0.36, -0.54, 0.24, 0.07, 0.4);
  },

  // 宿舍（床）
  bed(ctx) {
    // 床头
    fillRR(ctx, -0.86, -0.52, 0.18, 0.96, 0.08, ['#ffc76b', '#f08a1e'], '#d9740c', 0.04);
    // 床架
    fillRR(ctx, -0.8, 0.12, 1.62, 0.28, 0.08, ['#ffc76b', '#f0932a'], '#d9740c', 0.04);
    fillRR(ctx, -0.72, 0.4, 0.12, 0.32, 0.05, ['#e8a24c', '#cf7a17'], null);
    fillRR(ctx, 0.6, 0.4, 0.12, 0.32, 0.05, ['#e8a24c', '#cf7a17'], null);
    // 床垫
    fillRR(ctx, -0.78, -0.1, 1.55, 0.26, 0.1, ['#ffffff', '#d8efff'], '#a9c9e0', 0.035);
    // 枕头
    fillRR(ctx, -0.66, -0.2, 0.36, 0.22, 0.09, ['#ffffff', '#e9f7ff'], '#bcd9ee', 0.035);
    // 被子
    path(ctx, () => {
      ctx.moveTo(-0.16, -0.08);
      ctx.lineTo(0.66, -0.08);
      ctx.quadraticCurveTo(0.76, -0.08, 0.76, 0.0);
      ctx.lineTo(0.76, 0.14);
      ctx.lineTo(-0.16, 0.14);
      ctx.closePath();
    });
    paint(ctx, ['#a6e2ff', '#4aa8f0'], '#2f8ce8', 0.035);
    glint(ctx, -0.5, -0.12, 0.14, 0.05, 0.55);
  },

  // 食堂（饭碗）
  bowl(ctx) {
    // 饭
    path(ctx, () => {
      ctx.moveTo(-0.58, -0.04);
      ctx.quadraticCurveTo(-0.54, -0.34, 0, -0.34);
      ctx.quadraticCurveTo(0.54, -0.34, 0.58, -0.04);
      ctx.closePath();
    });
    paint(ctx, ['#ffffff', '#f2f7ff'], '#c9d8e6', 0.03);
    // 碗
    path(ctx, () => {
      ctx.moveTo(-0.64, -0.06);
      ctx.lineTo(0.64, -0.06);
      ctx.quadraticCurveTo(0.6, 0.52, 0, 0.6);
      ctx.quadraticCurveTo(-0.6, 0.52, -0.64, -0.06);
      ctx.closePath();
    });
    paint(ctx, ['#ff9d92', '#f2544b', '#dd3b31'], '#c93226', 0.04);
    fillRR(ctx, -0.64, -0.12, 1.28, 0.14, 0.07, ['#ffd9d3', '#ff8f83'], '#c93226', 0.03);
    // 筷子
    ctx.strokeStyle = '#c98a3a';
    ctx.lineWidth = 0.06;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.18, -0.4);
    ctx.lineTo(0.66, -0.66);
    ctx.moveTo(0.34, -0.3);
    ctx.lineTo(0.82, -0.54);
    ctx.stroke();
    // 青菜
    circle(ctx, -0.08, -0.3, 0.09, ['#d9f7a8', '#6fc93f'], null);
    circle(ctx, 0.14, -0.34, 0.07, ['#ffd98a', '#ffab25'], null);
    glint(ctx, -0.3, 0.16, 0.22, 0.08, 0.35);
  },

  // 图书馆（书堆）
  library(ctx) {
    fillRR(ctx, -0.74, 0.24, 1.5, 0.3, 0.07, ['#8fd0ff', '#2f8ce8'], '#1f6ac9', 0.035);
    fillRR(ctx, -0.64, -0.06, 1.32, 0.3, 0.07, ['#a6ec7e', '#43c44f'], '#279a3a', 0.035);
    fillRR(ctx, -0.56, -0.36, 1.14, 0.3, 0.07, ['#ffd47a', '#ffa62b'], '#e97a08', 0.035);
    fillRR(ctx, -0.44, -0.64, 0.94, 0.3, 0.07, ['#ddc6ff', '#a97cf2'], '#7045c9', 0.035);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 0.05;
    [-0.3, 0.0, 0.3].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, -0.58);
      ctx.lineTo(x, -0.4);
      ctx.stroke();
    });
    glint(ctx, -0.2, -0.22, 0.2, 0.06, 0.4);
  },

  // 教学楼（学校）
  school(ctx) {
    fillRR(ctx, -0.8, -0.28, 1.6, 1.04, 0.08, ['#fff0d6', '#ffd9a0'], '#e0a868', 0.04);
    // 屋顶
    path(ctx, () => {
      ctx.moveTo(-0.88, -0.26);
      ctx.lineTo(0, -0.78);
      ctx.lineTo(0.88, -0.26);
      ctx.closePath();
    });
    paint(ctx, ['#ff9c8a', '#ef5a45'], '#cf4331', 0.04);
    fillRR(ctx, -0.22, -0.56, 0.44, 0.24, 0.05, ['#ffffff', '#e8f6ff'], null);
    circle(ctx, 0, -0.44, 0.07, '#2f8ce8');
    // 窗户
    [-0.58, -0.2, 0.2, 0.58].forEach((x) => {
      fillRR(ctx, x - 0.13, 0.02, 0.26, 0.24, 0.04, ['#a8e2ff', '#5cb4ef'], null);
    });
    [-0.58, -0.2, 0.2, 0.58].forEach((x) => {
      fillRR(ctx, x - 0.13, 0.38, 0.26, 0.22, 0.04, ['#a8e2ff', '#5cb4ef'], null);
    });
    // 门
    fillRR(ctx, -0.16, 0.28, 0.32, 0.46, 0.08, ['#8fd0ff', '#2f8ce8'], '#1f6ac9', 0.03);
    glint(ctx, -0.5, -0.18, 0.16, 0.05, 0.4);
  },
};

export function hasGlossyIcon(name) {
  return !!DRAWERS[name];
}

export function drawIcon(ctx, name, cx, cy, size, options = {}) {
  const drawer = DRAWERS[name];
  if (!drawer) return false;
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (options.alpha !== undefined) ctx.globalAlpha *= options.alpha;
  drawer(ctx);
  ctx.restore();
  return true;
}

/**
 * 图鉴/导航用的图标格子：奶油色圆角底板 + 白色描边 + 果冻图标。
 */
export function drawIconTile(ctx, name, x, y, w, h, options = {}) {
  const radius = options.radius !== undefined ? options.radius : Math.min(w, h) * 0.26;
  const tile = options.tile || iconTileColors(name);
  const edge = options.edge || TILE_EDGE[ICON_TILE[name] || 'blue'] || TILE_EDGE.blue;
  const shadow = options.shadow !== false;
  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = Math.max(4, h * 0.16);
    ctx.shadowOffsetY = Math.max(1, h * 0.06);
  }
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, tile[0]);
  gradient.addColorStop(1, tile[1]);
  path(ctx, () => roundRectPath(ctx, x, y, w, h, radius));
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  ctx.save();
  path(ctx, () => roundRectPath(ctx, x, y, w, h, radius));
  ctx.clip();
  const sheen = ctx.createLinearGradient(x, y, x, y + h * 0.55);
  sheen.addColorStop(0, 'rgba(190, 240, 255, 0.18)');
  sheen.addColorStop(1, 'rgba(190, 240, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h * 0.55);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = edge;
  ctx.shadowBlur = Math.max(2, h * 0.12);
  path(ctx, () => roundRectPath(ctx, x, y, w, h, radius));
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1.2, h * 0.035);
  ctx.stroke();
  ctx.restore();

  const scale = options.iconScale !== undefined ? options.iconScale : 0.62;
  drawIcon(ctx, name, x + w / 2, y + h / 2 + (options.iconYOffset || 0), Math.min(w, h) * scale, options);
}

/**
 * 纯色圆形按钮（用于返回、暂停等 HUD 小按钮）。
 */
export function drawRoundIconButton(ctx, name, cx, cy, size, options = {}) {
  const r = size / 2;
  const gradient = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  gradient.addColorStop(0, options.from || '#8fd0ff');
  gradient.addColorStop(1, options.to || '#2f7fe8');
  ctx.save();
  ctx.shadowColor = options.shadow || 'rgba(30, 110, 200, 0.3)';
  ctx.shadowBlur = size * 0.25;
  ctx.shadowOffsetY = size * 0.08;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.stroke();
  ctx.restore();

  drawIcon(ctx, name, cx, cy, size * 0.8, options);
}
