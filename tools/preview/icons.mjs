/**
 * 图标预览表：node tools/preview/icons.mjs
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
try {
  GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc', 'Microsoft YaHei');
  GlobalFonts.registerFromPath('C:/Windows/Fonts/msyhbd.ttc', 'Microsoft YaHei');
} catch (error) {
  // optional
}

const { drawIcon, drawIconTile, hasGlossyIcon } = await import(
  pathToFileURL(path.join(ROOT, 'js/ui/icons.js')).href
);

const names = [
  'trophy', 'medal', 'coin', 'star', 'spark', 'crown',
  'flame', 'bulb', 'book', 'bag', 'cart', 'map',
  'back', 'play', 'pause', 'close', 'check', 'plus',
  'heart', 'clock', 'hourglass', 'lock', 'info', 'quiz',
  'chat', 'user', 'share', 'tv', 'replay', 'home',
  'edit', 'trash', 'shield', 'gear', 'music', 'volume',
  'vibrate', 'graduation', 'mask', 'fish', 'image',
  'bed', 'bowl', 'library', 'school',
];

const cols = 6;
const cellW = 130;
const cellH = 150;
const rows = Math.ceil(names.length / cols);
const canvas = createCanvas(cols * cellW, rows * cellH + 60);
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#050a14';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#e8f7ff';
ctx.font = '800 22px "Microsoft YaHei"';
ctx.fillText('梗世界 · 霓虹图标表', 24, 36);

names.forEach((name, index) => {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const x = col * cellW;
  const y = row * cellH + 60;
  if (!hasGlossyIcon(name)) {
    ctx.fillStyle = '#ff0000';
    ctx.font = '600 16px "Microsoft YaHei"';
    ctx.fillText('MISSING ' + name, x + 10, y + 20);
    return;
  }
  drawIconTile(ctx, name, x + 15, y + 10, 100, 100);
  drawIcon(ctx, name, x + 65, y + 118, 28);
  ctx.fillStyle = '#9ff4ff';
  ctx.font = '600 13px "Microsoft YaHei"';
  ctx.textAlign = 'center';
  ctx.fillText(name, x + 65, y + 142);
  ctx.textAlign = 'left';
});

const outDir = path.join(here, 'shots');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icons.png'), canvas.toBuffer('image/png'));
console.log('saved icons.png');
