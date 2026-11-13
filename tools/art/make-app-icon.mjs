/**
 * 生成小游戏图标（深色霓虹竞技场风格，开发用）：
 * - docs/branding/app-icon-512.png
 * - docs/branding/app-icon-144.png
 *
 * 运行：
 *   node tools/art/make-app-icon.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const canvasModulePath =
  process.env.CANVAS_MODULE ||
  path.join(process.env.TEMP || '', 'dsh-canvas', 'node_modules', '@napi-rs', 'canvas', 'index.js');
const { createCanvas, loadImage, GlobalFonts } = await import(pathToFileURL(canvasModulePath).href);

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

const SIZE = 512;
const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

function rr(x, y, w, h, r) {
  const radius = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function lin(x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}

function radial(x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}

function line(x0, y0, x1, y1, color, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

// ---- 深色竞技场底 ----
ctx.fillStyle = lin(0, 0, 0, SIZE, [
  [0, '#04070f'],
  [0.45, '#081426'],
  [1, '#0a1b30'],
]);
ctx.fillRect(0, 0, SIZE, SIZE);

ctx.fillStyle = radial(408, 58, 0, 260, [
  [0, 'rgba(94, 231, 255, 0.2)'],
  [0.55, 'rgba(94, 231, 255, 0.06)'],
  [1, 'rgba(94, 231, 255, 0)'],
]);
ctx.fillRect(0, 0, SIZE, SIZE);

ctx.fillStyle = radial(52, 486, 0, 300, [
  [0, 'rgba(255, 70, 70, 0.18)'],
  [0.55, 'rgba(255, 70, 70, 0.05)'],
  [1, 'rgba(255, 70, 70, 0)'],
]);
ctx.fillRect(0, 0, SIZE, SIZE);

// ---- 透视网格 ----
const horizon = 300;
ctx.save();
ctx.globalAlpha = 0.5;
for (let i = 0; i <= 8; i += 1) {
  const x = (SIZE / 8) * i;
  line(256 + (x - 256) * 0.14, horizon, x - 150, SIZE + 10, 'rgba(94,231,255,0.12)', 1);
}
for (let i = 0; i < 6; i += 1) {
  const p = i / 6;
  const y = horizon + (SIZE - horizon) * p * p;
  line(0, y, SIZE, y, `rgba(94,231,255,${0.04 + p * 0.06})`, 1);
}
ctx.restore();

// ---- 玩家屏幕外框 ----
ctx.save();
ctx.shadowColor = 'rgba(94, 231, 255, 0.7)';
ctx.shadowBlur = 34;
rr(46, 42, 420, 370, 54);
ctx.fillStyle = '#07111d';
ctx.fill();
ctx.restore();

rr(52, 48, 408, 358, 48);
ctx.fillStyle = lin(56, 48, 56, 406, [
  [0, '#0c1e33'],
  [1, '#07111d'],
]);
ctx.fill();
ctx.strokeStyle = 'rgba(94, 231, 255, 0.7)';
ctx.lineWidth = 3;
ctx.stroke();

// 内屏
const screen = { x: 68, y: 64, w: 376, h: 324, r: 34 };
rr(screen.x, screen.y, screen.w, screen.h, screen.r);
ctx.fillStyle = lin(screen.x, screen.y, screen.x, screen.y + screen.h, [
  [0, '#06101f'],
  [1, '#0a2440'],
]);
ctx.fill();
ctx.save();
ctx.clip();

// 内屏光晕
ctx.fillStyle = radial(256, 248, 20, 220, [
  [0, 'rgba(94, 231, 255, 0.2)'],
  [1, 'rgba(94, 231, 255, 0)'],
]);
ctx.fillRect(screen.x, screen.y, screen.w, screen.h);

// 扫描线
ctx.fillStyle = 'rgba(130, 230, 255, 0.05)';
for (let y = screen.y; y < screen.y + screen.h; y += 4) {
  ctx.fillRect(screen.x, y, screen.w, 1);
}

// 淡网格
ctx.strokeStyle = 'rgba(94, 231, 255, 0.08)';
ctx.lineWidth = 1;
for (let x = screen.x + 32; x < screen.x + screen.w; x += 64) {
  line(x, screen.y + 10, x, screen.y + screen.h - 10, 'rgba(94,231,255,0.08)', 1);
}
for (let y = screen.y + 40; y < screen.y + screen.h; y += 56) {
  line(screen.x + 10, y, screen.x + screen.w - 10, y, 'rgba(94,231,255,0.06)', 1);
}
ctx.restore();

// 屏幕内框霓虹
rr(screen.x, screen.y, screen.w, screen.h, screen.r);
ctx.strokeStyle = 'rgba(120, 238, 255, 0.9)';
ctx.lineWidth = 3;
ctx.stroke();
rr(screen.x + 12, screen.y + 12, screen.w - 24, screen.h - 24, screen.r - 12);
ctx.strokeStyle = 'rgba(94, 231, 255, 0.18)';
ctx.lineWidth = 1;
ctx.stroke();

// ---- 中央馆长 · 书灵 ----
const keeper = await loadImage(path.join(ROOT, 'assets/story/role4-1.png'));
const keepW = 270;
const keepH = (keeper.height / keeper.width) * keepW;
const keepX = (SIZE - keepW) / 2;
const keepY = 76;
ctx.save();
ctx.shadowColor = 'rgba(94, 231, 255, 0.55)';
ctx.shadowBlur = 28;
ctx.drawImage(keeper, keepX, keepY, keepW, keepH);
ctx.restore();

// ---- 屏幕标签 ----
ctx.fillStyle = '#ff5c5c';
ctx.beginPath();
ctx.arc(92, 88, 5, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#ff8a8a';
ctx.font = '700 14px "Microsoft YaHei"';
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';
ctx.fillText('LIVE', 104, 89);

ctx.fillStyle = 'rgba(130, 235, 255, 0.26)';
ctx.font = '900 46px "Microsoft YaHei"';
ctx.textAlign = 'left';
ctx.fillText('1P', 86, 144);

ctx.fillStyle = 'rgba(210, 248, 255, 0.86)';
ctx.font = '700 14px "Microsoft YaHei"';
ctx.textAlign = 'right';
ctx.fillText('READY', 430, 368);

// 红色角标
ctx.strokeStyle = 'rgba(255, 90, 90, 0.9)';
ctx.lineWidth = 3;
line(84, 106, 120, 106, 'rgba(255,90,90,0.9)', 3);
line(392, 372, 428, 372, 'rgba(255,90,90,0.9)', 3);

// ---- 底部品牌胶囊 ----
const pillW = 300;
const pillH = 72;
const pillX = (SIZE - pillW) / 2;
const pillY = 420;

ctx.save();
ctx.shadowColor = 'rgba(93, 242, 160, 0.55)';
ctx.shadowBlur = 24;
ctx.shadowOffsetY = 6;
rr(pillX, pillY, pillW, pillH, pillH / 2);
ctx.fillStyle = lin(0, pillY, 0, pillY + pillH, [
  [0, '#0b1a2e'],
  [1, '#07111d'],
]);
ctx.fill();
ctx.restore();

rr(pillX, pillY, pillW, pillH, pillH / 2);
ctx.strokeStyle = '#5df2a0';
ctx.lineWidth = 3;
ctx.stroke();
rr(pillX + 7, pillY + 7, pillW - 14, pillH - 14, (pillH - 14) / 2);
ctx.strokeStyle = 'rgba(93, 242, 160, 0.28)';
ctx.lineWidth = 1;
ctx.stroke();

ctx.font = '800 44px "Microsoft YaHei"';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.save();
ctx.globalAlpha = 0.55;
ctx.fillStyle = '#000000';
ctx.fillText('梗世界', SIZE / 2, pillY + pillH / 2 + 3);
ctx.restore();
ctx.fillStyle = '#ffffff';
ctx.fillText('梗世界', SIZE / 2, pillY + pillH / 2);

// ---- 粒子 / 点缀 ----
function dot(x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
dot(78, 232, 3, 'rgba(94,231,255,0.8)');
dot(438, 250, 2, 'rgba(255,120,120,0.75)');
dot(410, 330, 2.5, 'rgba(255,207,106,0.75)');
dot(96, 352, 2, 'rgba(94,231,255,0.55)');
dot(250, 40, 2, 'rgba(255,207,106,0.65)');

// 暗角
ctx.fillStyle = radial(256, 256, 190, 360, [
  [0, 'rgba(0,0,0,0)'],
  [1, 'rgba(0,0,0,0.45)'],
]);
ctx.fillRect(0, 0, SIZE, SIZE);

const outDir = path.join(ROOT, 'docs', 'branding');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'app-icon-512.png'), await canvas.encode('png'));
console.log('wrote app-icon-512.png');

const small = createCanvas(144, 144);
const smallCtx = small.getContext('2d');
smallCtx.imageSmoothingEnabled = true;
smallCtx.imageSmoothingQuality = 'high';
smallCtx.drawImage(canvas, 0, 0, 144, 144);
fs.writeFileSync(path.join(outDir, 'app-icon-144.png'), await small.encode('png'));
console.log('wrote app-icon-144.png');
