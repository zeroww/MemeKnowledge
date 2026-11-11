/**
 * 生成第四章「图书馆」素材（开发用）：
 * - assets/story/background4.jpg   夜晚图书馆背景（竖版，适配 9:16 全屏裁切）
 * - assets/story/role4.png         馆长 · 书灵（全身立绘，透明）
 * - assets/story/role4-1.png       馆长 · 书灵（提问半身像，透明）
 *
 * 运行：
 *   node tools/art/make-level4-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const canvasModulePath =
  process.env.CANVAS_MODULE ||
  path.join(process.env.TEMP || '', 'dsh-canvas', 'node_modules', '@napi-rs', 'canvas', 'index.js');
const { createCanvas, GlobalFonts } = await import(pathToFileURL(canvasModulePath).href);

for (const [file, family] of [
  ['C:/Windows/Fonts/msyhbd.ttc', 'Microsoft YaHei'],
  ['C:/Windows/Fonts/msyh.ttc', 'Microsoft YaHei'],
]) {
  try {
    GlobalFonts.registerFromPath(file, family);
  } catch (error) {
    // optional
  }
}

// ------------------------------------------------------------
// 通用绘制
// ------------------------------------------------------------
function rr(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRR(ctx, x, y, w, h, r, fill) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}

function radial(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BOOKS = [
  ['#8c3b34', '#b4564b', '#5f241f'],
  ['#2f6f7a', '#4b939c', '#1c4a52'],
  ['#c98a3a', '#e0ac60', '#8f5a1e'],
  ['#3b4f86', '#5b71ac', '#26345c'],
  ['#7a4a6e', '#9c6a90', '#512c49'],
  ['#4f7a45', '#6c9a5f', '#34552d'],
  ['#b5652f', '#d18551', '#83431b'],
  ['#5b6f8c', '#7b90ad', '#3c4c63'],
  ['#a44a55', '#c46a74', '#7a2d36'],
  ['#6a5a8c', '#8878a8', '#463a63'],
  ['#d8a24a', '#ecc27c', '#a1701f'],
  ['#3f6f5f', '#5b9080', '#284b3f'],
  ['#9c6b4a', '#bd8a66', '#6f452b'],
  ['#506a7a', '#6f8b9c', '#33474f'],
];

// ------------------------------------------------------------
// 背景
// ------------------------------------------------------------
function makeBackground() {
  const W = 1024;
  const H = 1820;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // 墙面底色
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [
    [0, '#1c1418'],
    [0.22, '#33221c'],
    [0.55, '#432b21'],
    [1, '#2a1a14'],
  ]);
  ctx.fillRect(0, 0, W, H);

  // 天花板
  ctx.fillStyle = '#221714';
  ctx.fillRect(0, 0, W, 190);
  for (let i = 0; i < 6; i += 1) {
    const x = 40 + i * 190;
    ctx.fillStyle = 'rgba(255, 220, 170, 0.05)';
    ctx.fillRect(x, 0, 26, 190);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(x + 26, 0, 10, 190);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 184, W, 12);

  // 墙面竖向木饰板
  for (let i = 0; i < 9; i += 1) {
    const x = 20 + i * 118;
    ctx.fillStyle = 'rgba(255, 200, 150, 0.035)';
    ctx.fillRect(x, 196, 3, 900);
  }

  // 书架
  const shelf = { x: 58, y: 214, w: 908, h: 836 };
  drawShelves(ctx, shelf, mulberry32(20261111));

  // 拱窗（覆盖在书架上）
  drawWindow(ctx, 54, 300, 252, 540);

  // 吊牌
  drawSign(ctx, 735, 60);

  // 梯子
  drawLadder(ctx, 800, 250, 150, 790);

  // 吊灯
  drawPendantLamp(ctx, 940, 120);

  // 书架上的猫
  drawCat(ctx, 700, 470, 0.9);

  // 地板
  ctx.fillStyle = lin(ctx, 0, 1050, 0, H, [
    [0, '#3a251c'],
    [1, '#1c110d'],
  ]);
  ctx.fillRect(0, 1050, W, H - 1050);
  for (let i = 0; i < 12; i += 1) {
    const y = 1060 + i * 66;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, y, W, 4);
    ctx.fillStyle = 'rgba(255, 210, 160, 0.04)';
    ctx.fillRect(0, y + 4, W, 2);
  }

  // 地毯
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(330, 1140, 300, 90, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(90, 40, 36, 0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(214, 160, 96, 0.28)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();

  // 前景书桌
  drawDesk(ctx, 40, 1010, 470, 220);

  // 暖光与氛围
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = radial(ctx, 940, 300, 20, 620, [
    [0, 'rgba(255, 190, 110, 0.34)'],
    [0.5, 'rgba(255, 170, 90, 0.12)'],
    [1, 'rgba(255, 170, 90, 0)'],
  ]);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = radial(ctx, 160, 640, 40, 540, [
    [0, 'rgba(120, 170, 255, 0.16)'],
    [1, 'rgba(120, 170, 255, 0)'],
  ]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // 漂浮书页与尘埃
  const rng = mulberry32(77123);
  for (let i = 0; i < 26; i += 1) {
    const x = 80 + rng() * 860;
    const y = 220 + rng() * 820;
    const s = 2 + rng() * 3;
    ctx.save();
    ctx.globalAlpha = 0.15 + rng() * 0.35;
    ctx.fillStyle = '#ffd89a';
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 5; i += 1) {
    const x = 120 + rng() * 760;
    const y = 260 + rng() * 560;
    const rot = (rng() - 0.5) * 0.8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.5 + rng() * 0.3;
    const pw = 26 + rng() * 22;
    const ph = 34 + rng() * 20;
    ctx.fillStyle = '#f4e3c2';
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = 'rgba(120, 80, 50, 0.35)';
    ctx.fillRect(-pw / 2 + 3, -ph / 2 + 6, pw - 6, 1.5);
    ctx.fillRect(-pw / 2 + 3, -ph / 2 + 12, pw - 10, 1.5);
    ctx.restore();
  }

  // 暗角
  ctx.fillStyle = radial(ctx, 512, 860, 420, 1180, [
    [0, 'rgba(0,0,0,0)'],
    [0.72, 'rgba(10, 6, 8, 0.18)'],
    [1, 'rgba(8, 4, 6, 0.62)'],
  ]);
  ctx.fillRect(0, 0, W, H);

  // 顶部压暗，保证标题可读
  ctx.fillStyle = lin(ctx, 0, 0, 0, 300, [
    [0, 'rgba(10, 6, 10, 0.5)'],
    [1, 'rgba(10, 6, 10, 0)'],
  ]);
  ctx.fillRect(0, 0, W, 300);

  return canvas;
}

function drawShelves(ctx, box, rng) {
  const { x, y, w, h } = box;
  // 外框
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  fillRR(ctx, x - 18, y - 18, w + 36, h + 36, 10, '#241610');
  ctx.restore();
  fillRR(ctx, x - 8, y - 8, w + 16, h + 16, 6, lin(ctx, 0, y, 0, y + h, [
    [0, '#6b4128'],
    [1, '#3d2519'],
  ]));
  fillRR(ctx, x, y, w, h, 4, '#150e0b');

  const rows = 6;
  const rowH = h / rows;
  const cols = 4;
  const colW = w / cols;

  for (let r = 0; r < rows; r += 1) {
    const shelfY = y + r * rowH;
    const bookBottom = shelfY + rowH - 16;
    for (let c = 0; c < cols; c += 1) {
      const cellX = x + 12 + c * colW;
      const cellW = colW - 24;
      drawBookRow(ctx, cellX, bookBottom, cellW, rowH - 16, rng);
    }
    // 隔板
    ctx.fillStyle = lin(ctx, 0, shelfY + rowH - 14, 0, shelfY + rowH, [
      [0, '#8a5636'],
      [1, '#4a2c1c'],
    ]);
    ctx.fillRect(x + 4, shelfY + rowH - 14, w - 8, 14);
    ctx.fillStyle = 'rgba(255, 210, 160, 0.18)';
    ctx.fillRect(x + 4, shelfY + rowH - 14, w - 8, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 4, shelfY + rowH - 4, w - 8, 4);
  }

  // 竖向分隔
  for (let c = 1; c < cols; c += 1) {
    const dx = x + c * colW - 6;
    ctx.fillStyle = '#3a2418';
    ctx.fillRect(dx, y + 4, 12, h - 8);
    ctx.fillStyle = 'rgba(255, 210, 160, 0.14)';
    ctx.fillRect(dx, y + 4, 3, h - 8);
  }

  // 书架内暖光
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = radial(ctx, 780, 420, 30, 560, [
    [0, 'rgba(255, 190, 110, 0.24)'],
    [1, 'rgba(255, 190, 110, 0)'],
  ]);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawBookRow(ctx, x, bottom, width, height, rng) {
  let cursor = x + 4;
  const end = x + width - 6;
  while (cursor < end - 12) {
    if (rng() < 0.1) {
      // 空位
      cursor += 10 + rng() * 16;
      continue;
    }
    if (rng() < 0.12) {
      // 横放的书堆
      const stackH = 12 + Math.floor(rng() * 3) * 10;
      let sy = bottom;
      for (let i = 0; i < Math.floor(stackH / 10); i += 1) {
        const bw = 40 + rng() * 26;
        if (cursor + bw > end) break;
        const colors = BOOKS[Math.floor(rng() * BOOKS.length)];
        const bh = 9 + rng() * 3;
        ctx.fillStyle = colors[0];
        ctx.fillRect(cursor, sy - bh, bw, bh);
        ctx.fillStyle = colors[1];
        ctx.fillRect(cursor, sy - bh, bw, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(cursor, sy - 1, bw, 2);
        sy -= bh + 1;
      }
      cursor += 44 + rng() * 20;
      continue;
    }
    const bw = 9 + rng() * 13;
    if (cursor + bw > end) break;
    const bh = height * (0.52 + rng() * 0.4);
    const colors = BOOKS[Math.floor(rng() * BOOKS.length)];
    const lean = rng() < 0.06;
    ctx.save();
    if (lean) {
      ctx.translate(cursor + bw / 2, bottom);
      ctx.rotate(-0.12);
      ctx.translate(-cursor - bw / 2, -bottom);
    }
    ctx.fillStyle = colors[0];
    ctx.fillRect(cursor, bottom - bh, bw, bh);
    ctx.fillStyle = colors[1];
    ctx.fillRect(cursor, bottom - bh, bw, 3);
    ctx.fillStyle = colors[2];
    ctx.fillRect(cursor + bw - 2, bottom - bh, 2, bh);
    if (rng() < 0.4) {
      ctx.fillStyle = 'rgba(240, 210, 160, 0.45)';
      ctx.fillRect(cursor + 1, bottom - bh * 0.72, bw - 2, 2);
      ctx.fillRect(cursor + 1, bottom - bh * 0.42, bw - 2, 2);
    }
    if (rng() < 0.25) {
      ctx.fillStyle = 'rgba(232, 190, 110, 0.55)';
      ctx.fillRect(cursor, bottom - bh * 0.5, bw, 1.5);
    }
    ctx.restore();
    cursor += bw + 1 + rng() * 2;
  }
}

function drawWindow(ctx, x, y, w, h) {
  const arch = w * 0.5;
  ctx.save();
  // 外框阴影
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#2c1b13';
  ctx.beginPath();
  ctx.moveTo(x - 16, y + h + 16);
  ctx.lineTo(x - 16, y + arch);
  ctx.arc(x + w / 2, y + arch, arch + 16, Math.PI, 0);
  ctx.lineTo(x + w + 16, y + h + 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 夜空
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + arch);
  ctx.arc(x + w / 2, y + arch, arch, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [
    [0, '#0b1430'],
    [0.6, '#1f3760'],
    [1, '#37547f'],
  ]);
  ctx.fillRect(x, y, w, h);

  // 月亮
  ctx.fillStyle = radial(ctx, x + w * 0.62, y + h * 0.3, 4, 90, [
    [0, 'rgba(255, 245, 205, 1)'],
    [0.55, 'rgba(255, 235, 180, 0.9)'],
    [1, 'rgba(255, 235, 180, 0)'],
  ]);
  ctx.beginPath();
  ctx.arc(x + w * 0.62, y + h * 0.3, 88, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7d8';
  ctx.beginPath();
  ctx.arc(x + w * 0.62, y + h * 0.3, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(225, 215, 185, 0.5)';
  ctx.beginPath();
  ctx.arc(x + w * 0.58, y + h * 0.28, 9, 0, Math.PI * 2);
  ctx.arc(x + w * 0.67, y + h * 0.33, 6, 0, Math.PI * 2);
  ctx.fill();

  // 星星
  const rng = mulberry32(4242);
  for (let i = 0; i < 26; i += 1) {
    const sx = x + 14 + rng() * (w - 28);
    const sy = y + 30 + rng() * (h * 0.55);
    ctx.globalAlpha = 0.35 + rng() * 0.6;
    ctx.fillStyle = '#eaf3ff';
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + rng() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 远处树影
  ctx.fillStyle = 'rgba(10, 18, 30, 0.85)';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h * 0.82);
  for (let i = 0; i <= 12; i += 1) {
    const tx = x + (i / 12) * w;
    const ty = y + h * 0.8 + Math.sin(i * 1.7) * 14;
    ctx.lineTo(tx, ty);
  }
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(8, 14, 24, 0.9)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.3, y + h * 0.8, 40, 26, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.72, y + h * 0.83, 52, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 窗框与棂条
  ctx.save();
  ctx.strokeStyle = '#3a2418';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + arch);
  ctx.arc(x + w / 2, y + arch, arch, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();
  ctx.strokeStyle = '#6b4128';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(58, 36, 24, 0.95)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 8);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h * 0.42);
  ctx.lineTo(x + w, y + h * 0.42);
  ctx.moveTo(x, y + h * 0.7);
  ctx.lineTo(x + w, y + h * 0.7);
  ctx.stroke();

  // 窗台
  ctx.fillStyle = lin(ctx, 0, y + h, 0, y + h + 22, [
    [0, '#8a5636'],
    [1, '#4a2c1c'],
  ]);
  ctx.fillRect(x - 26, y + h, w + 52, 22);
  ctx.fillStyle = 'rgba(255, 220, 170, 0.2)';
  ctx.fillRect(x - 26, y + h, w + 52, 4);
  ctx.restore();

  // 月光洒落
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = radial(ctx, x + w * 0.55, y + h * 0.45, 20, 500, [
    [0, 'rgba(150, 190, 255, 0.14)'],
    [1, 'rgba(150, 190, 255, 0)'],
  ]);
  ctx.fillRect(0, y, 700, h + 300);
  ctx.restore();
}

function drawSign(ctx, cx, y) {
  const half = 125;
  ctx.save();
  // 吊链
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 64, 0);
  ctx.lineTo(cx - 64, y + 8);
  ctx.moveTo(cx + 64, 0);
  ctx.lineTo(cx + 64, y + 8);
  ctx.stroke();
  // 牌匾
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  fillRR(ctx, cx - half, y, half * 2, 96, 12, lin(ctx, 0, y, 0, y + 96, [
    [0, '#4a2f20'],
    [1, '#2a1a12'],
  ]));
  ctx.restore();
  ctx.strokeStyle = 'rgba(232, 190, 110, 0.85)';
  ctx.lineWidth = 4;
  rr(ctx, cx - half + 10, y + 10, half * 2 - 20, 76, 8);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(232, 190, 110, 0.35)';
  ctx.lineWidth = 1.5;
  rr(ctx, cx - half + 18, y + 18, half * 2 - 36, 60, 6);
  ctx.stroke();
  ctx.fillStyle = '#f2cd8a';
  ctx.font = '800 48px "Microsoft YaHei"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('图书馆', cx, y + 50);
  ctx.fillStyle = 'rgba(242, 205, 138, 0.6)';
  ctx.font = '500 11px "Microsoft YaHei"';
  ctx.fillText('L I B R A R Y', cx, y + 76);
}

function drawLadder(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x + w / 2, y);
  ctx.rotate(0.05);
  ctx.translate(-x - w / 2, -y);
  // 轨道
  ctx.fillStyle = lin(ctx, x, 0, x + 12, 0, [
    [0, '#8a5636'],
    [1, '#4a2c1c'],
  ]);
  ctx.fillRect(x, y, 12, h);
  ctx.fillRect(x + w - 12, y, 12, h);
  ctx.fillStyle = 'rgba(255, 220, 170, 0.18)';
  ctx.fillRect(x, y, 3, h);
  ctx.fillRect(x + w - 12, y, 3, h);
  // 横档
  for (let i = 0; i < 12; i += 1) {
    const ry = y + 30 + i * ((h - 50) / 11);
    ctx.fillStyle = '#5c3a26';
    ctx.fillRect(x + 6, ry, w - 12, 9);
    ctx.fillStyle = 'rgba(255, 210, 160, 0.22)';
    ctx.fillRect(x + 6, ry, w - 12, 2);
  }
  ctx.restore();
}

function drawPendantLamp(ctx, x, y) {
  ctx.save();
  // 吊绳
  ctx.strokeStyle = '#6b5534';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, y - 26);
  ctx.stroke();
  // 灯罩
  ctx.fillStyle = lin(ctx, x - 34, 0, x + 34, 0, [
    [0, '#2f7f78'],
    [0.5, '#4aa39b'],
    [1, '#1f5f5a'],
  ]);
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 26);
  ctx.quadraticCurveTo(x - 52, y - 6, x - 56, y + 14);
  ctx.lineTo(x + 56, y + 14);
  ctx.quadraticCurveTo(x + 52, y - 6, x + 12, y - 26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(232, 190, 110, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 灯泡光
  ctx.fillStyle = radial(ctx, x, y + 30, 2, 90, [
    [0, 'rgba(255, 244, 200, 1)'],
    [0.4, 'rgba(255, 220, 140, 0.6)'],
    [1, 'rgba(255, 210, 120, 0)'],
  ]);
  ctx.beginPath();
  ctx.arc(x, y + 30, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath();
  ctx.arc(x, y + 22, 14, 0, Math.PI * 2);
  ctx.fill();
  // 光锥
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = lin(ctx, 0, y + 20, 0, y + 430, [
    [0, 'rgba(255, 200, 120, 0.16)'],
    [1, 'rgba(255, 200, 120, 0)'],
  ]);
  ctx.beginPath();
  ctx.moveTo(x - 56, y + 16);
  ctx.lineTo(x + 56, y + 16);
  ctx.lineTo(x + 260, y + 520);
  ctx.lineTo(x - 260, y + 520);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCat(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#14100f';
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(30, -30, 24, 0, Math.PI * 2);
  ctx.fill();
  // 耳朵
  ctx.beginPath();
  ctx.moveTo(16, -48);
  ctx.lineTo(22, -72);
  ctx.lineTo(36, -52);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(38, -50);
  ctx.lineTo(52, -70);
  ctx.lineTo(54, -44);
  ctx.closePath();
  ctx.fill();
  // 尾巴
  ctx.strokeStyle = '#14100f';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-38, 4);
  ctx.quadraticCurveTo(-70, -4, -66, -34);
  ctx.stroke();
  // 眼睛
  ctx.fillStyle = '#ffcf6a';
  ctx.beginPath();
  ctx.ellipse(24, -34, 4.5, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(38, -34, 4.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDesk(ctx, x, y, w, h) {
  ctx.save();
  // 桌下阴影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 70, w * 0.46, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // 桌腿
  [[x + 54, y + 100], [x + w - 74, y + 100], [x + 86, y + 100], [x + w - 106, y + 100]].forEach(
    ([lx, ly], index) => {
      const legH = 160 - index * 6;
      ctx.fillStyle = lin(ctx, 0, ly, 0, ly + legH, [
        [0, '#6b4128'],
        [1, '#2a1a12'],
      ]);
      ctx.fillRect(lx, ly, 22, legH);
      ctx.fillStyle = 'rgba(255, 210, 160, 0.16)';
      ctx.fillRect(lx, ly, 5, legH);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(lx + 17, ly, 5, legH);
    }
  );

  // 桌面（透视四边形）
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 20);
  ctx.lineTo(x + w - 6, y + 8);
  ctx.lineTo(x + w - 52, y + 58);
  ctx.lineTo(x + 48, y + 70);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, y, 0, y + 70, [
    [0, '#b07a50'],
    [0.5, '#8a5636'],
    [1, '#5d3722'],
  ]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 220, 170, 0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 20);
  ctx.lineTo(x + w - 6, y + 8);
  ctx.stroke();

  // 木纹
  ctx.strokeStyle = 'rgba(60, 30, 16, 0.25)';
  ctx.lineWidth = 1.4;
  for (let i = 1; i < 5; i += 1) {
    const t = i / 5;
    ctx.beginPath();
    ctx.moveTo(x + 10 + (w - 16) * t * 0.92, y + 20 - 12 * t + 6);
    ctx.lineTo(x + 48 + (w - 100) * t * 0.92, y + 70 - 12 * t);
    ctx.stroke();
  }

  // 桌沿
  ctx.fillStyle = lin(ctx, 0, y + 58, 0, y + 80, [
    [0, '#7a4b2e'],
    [1, '#3d2519'],
  ]);
  ctx.beginPath();
  ctx.moveTo(x + 48, y + 70);
  ctx.lineTo(x + w - 52, y + 58);
  ctx.lineTo(x + w - 52, y + 78);
  ctx.lineTo(x + 48, y + 90);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 220, 170, 0.18)';
  ctx.fillRect(x + 48, y + 70, w - 100, 3);

  // 桌裙
  ctx.beginPath();
  ctx.moveTo(x + 48, y + 86);
  ctx.lineTo(x + w - 52, y + 76);
  ctx.lineTo(x + w - 52, y + 110);
  ctx.lineTo(x + 48, y + 122);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, y + 76, 0, y + 122, [
    [0, '#6b4128'],
    [1, '#3d2519'],
  ]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 210, 160, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 48, y + 88);
  ctx.lineTo(x + w - 52, y + 78);
  ctx.stroke();

  // 书堆
  const stack = [
    ['#8c3b34', 150, 18],
    ['#2f6f7a', 138, 16],
    ['#c98a3a', 132, 14],
  ];
  let sy = y + 38;
  stack.forEach(([color, sw, sh], i) => {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 64 + i * 4, sy - sh + 4, sw, sh);
    ctx.fillStyle = color;
    ctx.fillRect(x + 60 + i * 4, sy - sh, sw, sh);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 60 + i * 4, sy - sh, sw, 2);
    ctx.fillStyle = 'rgba(255, 225, 170, 0.3)';
    ctx.fillRect(x + 60 + i * 4, sy - sh * 0.5, sw, 1.5);
    sy -= sh + 2;
  });

  // 摊开的书
  ctx.save();
  ctx.translate(x + 300, y + 30);
  ctx.rotate(-0.05);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 76, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2e2c4';
  ctx.beginPath();
  ctx.moveTo(-70, 0);
  ctx.quadraticCurveTo(-30, -12, 0, 0);
  ctx.quadraticCurveTo(30, -12, 70, 0);
  ctx.quadraticCurveTo(30, 16, 0, 10);
  ctx.quadraticCurveTo(-30, 16, -70, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 60, 40, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 10);
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) {
    ctx.strokeStyle = 'rgba(120, 90, 60, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-58, 2 + i * 3);
    ctx.lineTo(-8, 4 + i * 3);
    ctx.moveTo(8, 4 + i * 3);
    ctx.lineTo(58, 2 + i * 3);
    ctx.stroke();
  }
  ctx.restore();

  // 台灯
  const lx = x + 410;
  const ly = y + 34;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(lx, ly + 6, 34, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a5a2f';
  ctx.beginPath();
  ctx.ellipse(lx, ly + 4, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a5a2f';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(lx, ly + 2);
  ctx.lineTo(lx, ly - 58);
  ctx.stroke();
  ctx.fillStyle = lin(ctx, lx - 46, 0, lx + 46, 0, [
    [0, '#1f5f5a'],
    [0.5, '#3f9d92'],
    [1, '#1a4a46'],
  ]);
  ctx.beginPath();
  ctx.moveTo(lx - 10, ly - 58);
  ctx.quadraticCurveTo(lx - 46, ly - 42, lx - 50, ly - 22);
  ctx.lineTo(lx + 50, ly - 22);
  ctx.quadraticCurveTo(lx + 46, ly - 42, lx + 10, ly - 58);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 225, 160, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = radial(ctx, lx, ly - 16, 2, 120, [
    [0, 'rgba(255, 244, 200, 0.95)'],
    [0.4, 'rgba(255, 214, 130, 0.4)'],
    [1, 'rgba(255, 210, 120, 0)'],
  ]);
  ctx.beginPath();
  ctx.arc(lx, ly - 16, 120, 0, Math.PI * 2);
  ctx.fill();

  // 茶杯
  const cx = x + 250;
  const cy = y + 60;
  ctx.fillStyle = '#e8dcc8';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f6eedd';
  ctx.beginPath();
  ctx.roundRect
    ? ctx.roundRect(cx - 12, cy - 22, 24, 26, 6)
    : ctx.rect(cx - 12, cy - 22, 24, 26);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx + 12, cy - 10, 7, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(120, 90, 60, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 22, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ------------------------------------------------------------
// 馆长 · 书灵
// ------------------------------------------------------------
const TEAL = ['#5fc0b3', '#3f9d92', '#236b68'];
const GOLD = ['#ffe6a1', '#e9b96b', '#b98534'];
const PAPER = ['#fff7e3', '#efdcb8'];

function drawSpirit(ctx, options = {}) {
  const { cx = 0, cy = 0, scale = 1, ask = false } = options;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // 地面/悬浮阴影
  ctx.fillStyle = 'rgba(20, 40, 40, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, ask ? 290 : 420, ask ? 150 : 130, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // 书页尾迹
  drawPageTrail(ctx, ask);

  // 飘浮的小书
  drawFloatingBook(ctx, -170, -160, 70, 90, -0.5, '#7a4a6e');
  drawFloatingBook(ctx, 165, -190, 64, 84, 0.35, '#3b4f86');
  if (!ask) drawFloatingBook(ctx, 170, 280, 58, 76, 0.55, '#8c3b34');

  // 主体书本
  drawBookBody(ctx, ask);
  drawFace(ctx, ask);
  drawCap(ctx, ask);
  drawArms(ctx, ask);
  drawRibbon(ctx, ask);

  // 微光
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = radial(ctx, 0, ask ? -20 : -40, 10, 260, [
    [0, 'rgba(120, 240, 220, 0.18)'],
    [1, 'rgba(120, 240, 220, 0)'],
  ]);
  ctx.beginPath();
  ctx.arc(0, ask ? -20 : -40, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawBookBody(ctx, ask) {
  const w = ask ? 250 : 236;
  const h = ask ? 300 : 320;
  const x = -w / 2;
  const y = ask ? -150 : -170;

  ctx.save();
  ctx.rotate(ask ? -0.05 : -0.035);

  // 书页（底部与右侧）
  ctx.fillStyle = PAPER[1];
  rr(ctx, x + 10, y + 14, w + 12, h + 8, 16);
  ctx.fill();
  for (let i = 0; i < 5; i += 1) {
    ctx.strokeStyle = 'rgba(160, 120, 70, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 20 + i * 3);
    ctx.lineTo(x + w + 16, y + 20 + i * 3);
    ctx.stroke();
  }

  // 封面
  ctx.save();
  ctx.shadowColor = 'rgba(8, 40, 40, 0.35)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 12;
  rr(ctx, x, y, w, h, 18);
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [
    [0, TEAL[0]],
    [0.45, TEAL[1]],
    [1, TEAL[2]],
  ]);
  ctx.fill();
  ctx.restore();

  // 封面装饰
  ctx.strokeStyle = 'rgba(255, 225, 160, 0.55)';
  ctx.lineWidth = 3;
  rr(ctx, x + 12, y + 12, w - 24, h - 24, 12);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 225, 160, 0.25)';
  ctx.lineWidth = 1.5;
  rr(ctx, x + 20, y + 20, w - 40, h - 40, 8);
  ctx.stroke();

  // 书脊
  ctx.fillStyle = 'rgba(10, 40, 38, 0.28)';
  ctx.fillRect(x, y + 8, 20, h - 16);
  ctx.fillStyle = 'rgba(255, 240, 200, 0.2)';
  ctx.fillRect(x + 20, y + 10, 2, h - 20);
  [-0.22, 0, 0.22].forEach((p) => {
    ctx.fillStyle = 'rgba(232, 190, 110, 0.55)';
    ctx.fillRect(x + 2, y + h * (0.5 + p), 16, 4);
  });

  // 金色护角
  [[x + 10, y + 10, 1, 1], [x + w - 10, y + 10, -1, 1], [x + 10, y + h - 10, 1, -1], [x + w - 10, y + h - 10, -1, -1]].forEach(
    ([px, py, sx, sy]) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(sx, sy);
      ctx.fillStyle = GOLD[1];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(34, 0);
      ctx.lineTo(0, 34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 240, 190, 0.6)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(26, 0);
      ctx.lineTo(0, 26);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  );

  // 封面高光
  ctx.save();
  rr(ctx, x, y, w, h, 18);
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h * 0.55, [
    [0, 'rgba(255,255,255,0.28)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  ctx.fillRect(x, y, w, h * 0.55);
  ctx.fillStyle = radial(ctx, x + w * 0.28, y + h * 0.18, 6, 130, [
    [0, 'rgba(255,255,255,0.32)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  ctx.fillRect(x, y, w, h * 0.5);
  ctx.restore();

  ctx.restore();
}

function drawFace(ctx, ask) {
  const ey = ask ? -60 : -78;
  const ex = ask ? 56 : 52;
  const r = ask ? 26 : 24;

  // 眼睛光晕
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = radial(ctx, 0, ey, 4, 120, [
    [0, 'rgba(255, 210, 120, 0.35)'],
    [1, 'rgba(255, 210, 120, 0)'],
  ]);
  ctx.beginPath();
  ctx.arc(0, ey, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  [-ex, ex].forEach((x) => {
    // 眼白
    ctx.fillStyle = '#fff9e8';
    ctx.beginPath();
    ctx.ellipse(x, ey, r, r * 1.08, 0, 0, Math.PI * 2);
    ctx.fill();
    // 虹膜
    ctx.fillStyle = radial(ctx, x - r * 0.2, ey - r * 0.2, 2, r, [
      [0, '#ffe9a8'],
      [0.55, '#ffb84a'],
      [1, '#c96a1c'],
    ]);
    ctx.beginPath();
    ctx.arc(x, ey, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    // 瞳孔
    ctx.fillStyle = '#2a1a12';
    ctx.beginPath();
    ctx.arc(x, ey, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    // 高光
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - r * 0.24, ey - r * 0.28, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x + r * 0.2, ey + r * 0.2, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  });

  // 圆眼镜
  ctx.strokeStyle = GOLD[1];
  ctx.lineWidth = ask ? 6 : 5.5;
  [-ex, ex].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, ey, r * 1.28, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(-ex + r * 1.28, ey);
  ctx.quadraticCurveTo(0, ey - r * 0.5, ex - r * 1.28, ey);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 240, 190, 0.4)';
  ctx.lineWidth = 2;
  [-ex, ex].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x - r * 0.2, ey - r * 0.2, r * 1.05, Math.PI * 1.05, Math.PI * 1.5);
    ctx.stroke();
  });

  // 腮红
  ctx.fillStyle = 'rgba(255, 150, 130, 0.28)';
  ctx.beginPath();
  ctx.ellipse(-ex - 30, ey + 44, 20, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(ex + 30, ey + 44, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // 微笑
  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = ask ? 5 : 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, ey + 46, ask ? 26 : 24, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  // 书名标签
  ctx.fillStyle = 'rgba(10, 45, 42, 0.6)';
  rr(ctx, -70, ask ? 58 : 62, 140, 36, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232, 190, 110, 0.8)';
  ctx.lineWidth = 2;
  rr(ctx, -70, ask ? 58 : 62, 140, 36, 9);
  ctx.stroke();
  ctx.fillStyle = '#ffe6a1';
  ctx.font = `800 ${ask ? 21 : 19}px "Microsoft YaHei"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('馆 长', 0, ask ? 76 : 80);
}

function drawCap(ctx, ask) {
  const y = ask ? -196 : -212;
  ctx.save();
  ctx.translate(0, y);
  ctx.rotate(ask ? -0.1 : -0.08);
  // 帽子
  ctx.fillStyle = '#243a4f';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(110, 10);
  ctx.lineTo(0, 40);
  ctx.lineTo(-110, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(110, 10);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a2c3c';
  rr(ctx, -52, 20, 104, 22, 8);
  ctx.fill();
  // 流苏
  ctx.strokeStyle = '#e9b96b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(78, 10);
  ctx.quadraticCurveTo(108, 30, 96, 62);
  ctx.stroke();
  ctx.fillStyle = '#e9b96b';
  ctx.beginPath();
  ctx.arc(96, 66, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawArms(ctx, ask) {
  const armY = ask ? 60 : 40;
  const bodyHalf = ask ? 125 : 118;

  // 左臂
  ctx.save();
  ctx.translate(-bodyHalf - 6, armY);
  ctx.rotate(ask ? -0.5 : -0.35);
  ctx.fillStyle = TEAL[1];
  rr(ctx, -64, -18, 74, 36, 18);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(ctx, -60, -14, 66, 10, 6);
  ctx.fill();
  // 手套
  ctx.fillStyle = '#fff6e2';
  ctx.beginPath();
  ctx.arc(-64, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190, 150, 100, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 右臂
  ctx.save();
  ctx.translate(bodyHalf + 6, armY);
  ctx.rotate(ask ? 0.32 : 0.28);
  ctx.fillStyle = TEAL[1];
  rr(ctx, -10, -18, 74, 36, 18);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(ctx, -6, -14, 66, 10, 6);
  ctx.fill();
  ctx.fillStyle = '#fff6e2';
  ctx.beginPath();
  ctx.arc(64, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190, 150, 100, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawRibbon(ctx, ask) {
  const top = ask ? 140 : 150;
  ctx.save();
  ctx.fillStyle = '#d8523f';
  ctx.beginPath();
  ctx.moveTo(-18, top);
  ctx.lineTo(18, top);
  ctx.lineTo(18, top + 100);
  ctx.lineTo(0, top + 82);
  ctx.lineTo(-18, top + 100);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(-18, top, 36, 4);
  ctx.fillStyle = 'rgba(120, 30, 20, 0.25)';
  ctx.fillRect(8, top, 10, 100);
  ctx.restore();
}

function drawPageTrail(ctx, ask) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  const base = ask ? 170 : 200;
  for (let i = 0; i < 4; i += 1) {
    const y = base + i * 34;
    const w = 120 - i * 18;
    ctx.fillStyle = `rgba(255, 245, 220, ${0.55 - i * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(-w / 2, y);
    ctx.quadraticCurveTo(0, y + 12, w / 2, y);
    ctx.quadraticCurveTo(0, y + 20, -w / 2, y);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloatingBook(ctx, x, y, w, h, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(10, 30, 30, 0.18)';
  rr(ctx, -w / 2 + 6, -h / 2 + 10, w, h, 6);
  ctx.fill();
  ctx.fillStyle = '#f3e4c6';
  rr(ctx, -w / 2 + 4, -h / 2 + 4, w, h, 6);
  ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, -w / 2, -h / 2, w, h, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(ctx, -w / 2, -h / 2, w, h * 0.42, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 225, 160, 0.6)';
  ctx.lineWidth = 2;
  rr(ctx, -w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 3);
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------
// 输出
// ------------------------------------------------------------
const outDir = path.join(ROOT, 'assets/story');
fs.mkdirSync(outDir, { recursive: true });

const bg = makeBackground();
fs.writeFileSync(path.join(outDir, 'background4.jpg'), await bg.encode('jpeg', 88));
console.log('wrote background4.jpg');

const roleCanvas = createCanvas(440, 640);
const roleCtx = roleCanvas.getContext('2d');
drawSpirit(roleCtx, { cx: 220, cy: 258, scale: 1.07 });
fs.writeFileSync(path.join(outDir, 'role4.png'), await roleCanvas.encode('png'));
console.log('wrote role4.png');

const askCanvas = createCanvas(460, 520);
const askCtx = askCanvas.getContext('2d');
drawSpirit(askCtx, { cx: 230, cy: 231, scale: 0.96, ask: true });
fs.writeFileSync(path.join(outDir, 'role4-1.png'), await askCanvas.encode('png'));
console.log('wrote role4-1.png');
