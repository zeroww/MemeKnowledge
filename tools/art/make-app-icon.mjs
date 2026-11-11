/**
 * 生成小游戏图标（开发用）：
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

// 天空
ctx.fillStyle = lin(0, 0, 0, SIZE, [
  [0, '#6cc7fb'],
  [0.55, '#bfeaff'],
  [1, '#f0fcff'],
]);
ctx.fillRect(0, 0, SIZE, SIZE);

// 阳光
ctx.fillStyle = radial(390, 66, 4, 220, [
  [0, 'rgba(255, 246, 190, 0.95)'],
  [0.45, 'rgba(255, 240, 170, 0.32)'],
  [1, 'rgba(255, 240, 170, 0)'],
]);
ctx.fillRect(0, 0, SIZE, SIZE);

// 云朵
function cloud(cx, cy, s, alpha = 0.9) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  [
    [-30, 4, 20],
    [0, -8, 26],
    [28, 4, 19],
    [12, 10, 19],
  ].forEach(([dx, dy, r]) => {
    ctx.beginPath();
    ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}
cloud(92, 92, 1.15);
cloud(410, 178, 0.8, 0.8);
cloud(230, 60, 0.62, 0.7);

// 草地
ctx.fillStyle = lin(0, 360, 0, SIZE, [
  [0, '#a5e878'],
  [1, '#79cd52'],
]);
ctx.beginPath();
ctx.moveTo(0, 380);
ctx.quadraticCurveTo(130, 340, 256, 372);
ctx.quadraticCurveTo(390, 404, SIZE, 360);
ctx.lineTo(SIZE, SIZE);
ctx.lineTo(0, SIZE);
ctx.closePath();
ctx.fill();

// 小路
ctx.fillStyle = '#ffeccd';
ctx.beginPath();
ctx.moveTo(212, 374);
ctx.quadraticCurveTo(180, 440, 120, SIZE);
ctx.lineTo(392, SIZE);
ctx.quadraticCurveTo(336, 440, 300, 374);
ctx.closePath();
ctx.fill();

// 光晕衬托
ctx.fillStyle = radial(256, 240, 30, 250, [
  [0, 'rgba(255,255,255,0.55)'],
  [0.6, 'rgba(255,255,255,0.16)'],
  [1, 'rgba(255,255,255,0)'],
]);
ctx.fillRect(0, 0, SIZE, SIZE);

// 馆长
const keeper = await loadImage(path.join(ROOT, 'assets/story/role4-1.png'));
const keepW = 320;
const keepH = (keeper.height / keeper.width) * keepW;
ctx.drawImage(keeper, (SIZE - keepW) / 2, 58, keepW, keepH);

// 标题胶囊
const pillW = 320;
const pillH = 82;
const pillX = (SIZE - pillW) / 2;
const pillY = 400;
ctx.save();
ctx.shadowColor = 'rgba(24, 96, 60, 0.4)';
ctx.shadowBlur = 18;
ctx.shadowOffsetY = 8;
rr(pillX, pillY, pillW, pillH, pillH / 2);
ctx.fillStyle = lin(0, pillY, 0, pillY + pillH, [
  [0, '#9ceb74'],
  [0.55, '#4bcd55'],
  [1, '#2eb43d'],
]);
ctx.fill();
ctx.restore();

// 白色果冻外壳
rr(pillX, pillY, pillW, pillH, pillH / 2);
ctx.strokeStyle = 'rgba(255,255,255,0.9)';
ctx.lineWidth = 4;
ctx.stroke();
rr(pillX + 8, pillY + 8, pillW - 16, pillH - 16, (pillH - 16) / 2);
ctx.strokeStyle = 'rgba(255,255,255,0.35)';
ctx.lineWidth = 1.5;
ctx.stroke();

// 高光
ctx.save();
rr(pillX + 18, pillY + 12, pillW * 0.34, pillH * 0.22, pillH * 0.11);
ctx.fillStyle = 'rgba(255,255,255,0.55)';
ctx.fill();
ctx.restore();

ctx.font = '800 50px "Microsoft YaHei"';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.save();
ctx.globalAlpha = 0.3;
ctx.fillStyle = '#1c7a2e';
ctx.fillText('梗世界', SIZE / 2, pillY + pillH / 2 + 4);
ctx.restore();
ctx.fillStyle = '#ffffff';
ctx.fillText('梗世界', SIZE / 2, pillY + pillH / 2 + 1);

// 星星点缀
function star(cx, cy, outer, inner, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
star(70, 220, 15, 6, '#ffe17a');
star(438, 300, 12, 5, '#ffd75e');
star(432, 96, 9, 4, '#fff3b0');

const outDir = path.join(ROOT, 'docs', 'branding');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'app-icon-512.png'), await canvas.encode('png'));
console.log('wrote app-icon-512.png');

const small = createCanvas(144, 144);
const smallCtx = small.getContext('2d');
smallCtx.drawImage(canvas, 0, 0, 144, 144);
fs.writeFileSync(path.join(outDir, 'app-icon-144.png'), await small.encode('png'));
console.log('wrote app-icon-144.png');
