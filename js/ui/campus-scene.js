import { fillCircle, fillRoundRect, hexToRgba, roundRectPath, strokeCircle } from './draw.js';

/**
 * 首页卡通校园场景（纯 Canvas 绘制）。
 * 参考图风格：明亮天空、白云、暖阳、奶油色教学楼、绿树与草地。
 * 只负责背景，不放任何文字与按钮。
 */
export function renderCampusScene(ctx, width, height, time = 0) {
  const w = width;
  const h = height;
  const horizon = h * 0.5;

  // 天空
  const sky = ctx.createLinearGradient(0, 0, 0, horizon + h * 0.1);
  sky.addColorStop(0, '#8ad6ff');
  sky.addColorStop(0.55, '#bfeaff');
  sky.addColorStop(1, '#e9fbff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon + h * 0.12);

  // 太阳光晕
  const sunX = w * 0.82;
  const sunY = h * 0.08;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, w * 0.5);
  sun.addColorStop(0, 'rgba(255, 248, 190, 0.9)');
  sun.addColorStop(0.4, 'rgba(255, 245, 180, 0.35)');
  sun.addColorStop(1, 'rgba(255, 245, 180, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, horizon);

  // 白云
  const clouds = [
    { x: 0.16, y: 0.1, s: 1.15, a: 0.95 },
    { x: 0.52, y: 0.05, s: 0.7, a: 0.8 },
    { x: 0.86, y: 0.2, s: 0.62, a: 0.7 },
    { x: 0.3, y: 0.22, s: 0.45, a: 0.5 },
  ];
  clouds.forEach((cloud, index) => {
    const drift = Math.sin(time * 0.12 + index) * w * 0.01;
    const cx = w * cloud.x + drift;
    const cy = h * cloud.y;
    const s = cloud.s * (w / 375);
    ctx.save();
    ctx.globalAlpha = cloud.a;
    ctx.fillStyle = '#ffffff';
    [
      [-26, 2, 16],
      [0, -7, 21],
      [24, 3, 15],
      [10, 8, 15],
    ].forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  });

  // 远景树线
  ctx.save();
  ctx.fillStyle = hexToRgba('#8bd96a', 0.55);
  ctx.beginPath();
  ctx.moveTo(0, horizon - h * 0.02);
  ctx.quadraticCurveTo(w * 0.2, horizon - h * 0.075, w * 0.42, horizon - h * 0.03);
  ctx.quadraticCurveTo(w * 0.7, horizon + h * 0.01, w, horizon - h * 0.05);
  ctx.lineTo(w, horizon + h * 0.06);
  ctx.lineTo(0, horizon + h * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 草地
  const lawnTop = horizon - h * 0.005;
  const lawn = ctx.createLinearGradient(0, lawnTop, 0, h);
  lawn.addColorStop(0, '#a5e878');
  lawn.addColorStop(0.45, '#8ddc5f');
  lawn.addColorStop(1, '#79cd52');
  ctx.fillStyle = lawn;
  ctx.fillRect(0, lawnTop, w, h - lawnTop);

  // 草地纹理
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, w * 0.0035);
  ctx.lineCap = 'round';
  for (let i = 0; i < 34; i += 1) {
    const gx = (((i * 97) % 100) / 100) * w;
    const gy = lawnTop + (((i * 53) % 100) / 100) * (h - lawnTop);
    const s = 0.7 + ((i * 31) % 10) / 14;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + 2 * s, gy - h * 0.008 * s, gx + 4 * s, gy);
    ctx.stroke();
  }
  ctx.restore();

  // 主路径
  const pathTopY = horizon + h * 0.02;
  const topHalf = w * 0.055;
  const bottomHalf = w * 0.2;
  ctx.beginPath();
  ctx.moveTo(w / 2 - topHalf, pathTopY);
  ctx.lineTo(w / 2 + topHalf, pathTopY);
  ctx.quadraticCurveTo(
    w / 2 + bottomHalf * 0.8,
    pathTopY + (h - pathTopY) * 0.5,
    w / 2 + bottomHalf,
    h
  );
  ctx.lineTo(w / 2 - bottomHalf, h);
  ctx.quadraticCurveTo(
    w / 2 - bottomHalf * 0.8,
    pathTopY + (h - pathTopY) * 0.5,
    w / 2 - topHalf,
    pathTopY
  );
  ctx.closePath();
  ctx.fillStyle = '#ffeccd';
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(2, w * 0.01);
  ctx.stroke();
  ctx.restore();

  // 教学楼
  drawSchool(ctx, w, h, horizon, time);

  // 大树
  drawTree(ctx, w * 0.1, horizon + h * 0.05, w * 0.17, '#5fbf49');
  drawTree(ctx, w * 0.92, horizon + h * 0.06, w * 0.15, '#57b843');
  drawTree(ctx, w * 0.015, horizon + h * 0.12, w * 0.11, '#6fca52');
  drawTree(ctx, w * 0.99, horizon + h * 0.17, w * 0.1, '#6fca52');

  // 灌木
  [
    [0.16, 0.55, 0.05],
    [0.29, 0.54, 0.035],
    [0.71, 0.545, 0.038],
    [0.84, 0.56, 0.05],
    [0.5, 0.548, 0.028],
    [0.06, 0.6, 0.036],
    [0.94, 0.63, 0.034],
  ].forEach(([x, y, r]) => {
    fillCircle(ctx, w * x, h * y, w * r, '#67c74a');
    fillCircle(ctx, w * x - w * r * 0.5, h * y + w * r * 0.2, w * r * 0.7, '#74d455');
    fillCircle(ctx, w * x + w * r * 0.55, h * y + w * r * 0.18, w * r * 0.65, '#5bbc41');
  });

  // 小花
  const flowers = [
    [0.06, 0.62, '#ffd54a'],
    [0.24, 0.72, '#ff9fb8'],
    [0.9, 0.7, '#ffffff'],
    [0.72, 0.86, '#ffd54a'],
    [0.14, 0.9, '#ffb3c7'],
    [0.94, 0.94, '#ffd54a'],
  ];
  flowers.forEach(([x, y, color]) => {
    const cx = w * x;
    const cy = h * y;
    for (let i = 0; i < 5; i += 1) {
      const angle = (Math.PI * 2 * i) / 5;
      fillCircle(
        ctx,
        cx + Math.cos(angle) * w * 0.008,
        cy + Math.sin(angle) * w * 0.008,
        w * 0.008,
        color
      );
    }
    fillCircle(ctx, cx, cy, w * 0.006, '#ffb020');
  });
}

function drawTree(ctx, x, baseY, size, leafColor) {
  const trunkW = size * 0.16;
  const trunkH = size * 0.5;
  ctx.save();
  ctx.fillStyle = '#b57a45';
  roundRectPath(ctx, x - trunkW / 2, baseY - trunkH, trunkW, trunkH, trunkW * 0.4);
  ctx.fill();
  ctx.fillStyle = hexToRgba('#8f5b30', 0.35);
  roundRectPath(ctx, x, baseY - trunkH, trunkW / 2, trunkH, trunkW * 0.3);
  ctx.fill();

  ctx.fillStyle = leafColor;
  ctx.beginPath();
  ctx.arc(x, baseY - trunkH - size * 0.28, size * 0.42, 0, Math.PI * 2);
  ctx.arc(x - size * 0.34, baseY - trunkH - size * 0.12, size * 0.32, 0, Math.PI * 2);
  ctx.arc(x + size * 0.34, baseY - trunkH - size * 0.14, size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.arc(x - size * 0.12, baseY - trunkH - size * 0.42, size * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSchool(ctx, w, h, horizon, time) {
  const bw = w * 0.8;
  const bh = h * 0.19;
  const bx = (w - bw) / 2;
  const baseY = horizon + h * 0.03;
  const topY = baseY - bh;
  const wingW = bw * 0.29;
  const centerW = bw * 0.42;

  ctx.save();
  // 投影
  ctx.fillStyle = 'rgba(60, 120, 60, 0.16)';
  ctx.beginPath();
  ctx.ellipse
    ? ctx.ellipse(w / 2, baseY + h * 0.008, bw * 0.56, h * 0.016, 0, 0, Math.PI * 2)
    : ctx.arc(w / 2, baseY + h * 0.008, bw * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // 左右翼楼
  [bx, bx + bw - wingW].forEach((wx) => {
    const wingH = bh * 0.72;
    const wy = baseY - wingH;
    ctx.fillStyle = '#ffe3bd';
    roundRectPath(ctx, wx, wy, wingW, wingH, w * 0.012);
    ctx.fill();
    ctx.fillStyle = 'rgba(228, 180, 128, 0.35)';
    ctx.fillRect(wx, wy + wingH - h * 0.014, wingW, h * 0.014);
    // 屋顶
    ctx.fillStyle = '#ff8f74';
    roundRectPath(ctx, wx - w * 0.008, wy - h * 0.018, wingW + w * 0.016, h * 0.026, w * 0.01);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(wx - w * 0.008, wy - h * 0.018, wingW + w * 0.016, h * 0.007);
    // 窗户
    drawWindows(ctx, wx + wingW * 0.1, wy + wingH * 0.16, wingW * 0.8, wingH * 0.56, w);
  });

  // 中间塔楼
  const towerX = bx + wingW + centerW * 0.1;
  const towerW = centerW * 0.8;
  const towerH = bh * 1.06;
  const towerY = baseY - towerH;
  ctx.fillStyle = '#fff0d6';
  roundRectPath(ctx, towerX, towerY, towerW, towerH, w * 0.012);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillRect(towerX + towerW * 0.06, towerY + towerH * 0.1, towerW * 0.1, towerH * 0.7);

  // 塔楼屋顶
  ctx.fillStyle = '#ff8266';
  ctx.beginPath();
  ctx.moveTo(towerX - w * 0.022, towerY);
  ctx.lineTo(towerX + towerW / 2, towerY - bh * 0.34);
  ctx.lineTo(towerX + towerW + w * 0.022, towerY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(towerX - w * 0.022, towerY);
  ctx.lineTo(towerX + towerW / 2, towerY - bh * 0.34);
  ctx.lineTo(towerX + towerW / 2, towerY - bh * 0.2);
  ctx.closePath();
  ctx.fill();

  // 旗杆与红旗
  const flagX = towerX + towerW / 2;
  const flagTop = towerY - bh * 0.34;
  ctx.strokeStyle = '#8aa7c4';
  ctx.lineWidth = Math.max(1.5, w * 0.006);
  ctx.beginPath();
  ctx.moveTo(flagX, flagTop);
  ctx.lineTo(flagX, flagTop - h * 0.045);
  ctx.stroke();
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  ctx.moveTo(flagX, flagTop - h * 0.045);
  ctx.quadraticCurveTo(
    flagX + w * 0.03,
    flagTop - h * 0.038 + Math.sin(time * 2) * h * 0.002,
    flagX + w * 0.055,
    flagTop - h * 0.032
  );
  ctx.lineTo(flagX, flagTop - h * 0.018);
  ctx.closePath();
  ctx.fill();

  // 钟
  const clockR = w * 0.028;
  const clockY = towerY + bh * 0.22;
  fillCircle(ctx, flagX, clockY, clockR, '#ffffff');
  strokeCircle(ctx, flagX, clockY, clockR, '#ffb08a', Math.max(1.5, w * 0.006));
  ctx.strokeStyle = '#4a6b8c';
  ctx.lineWidth = Math.max(1.2, w * 0.005);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(flagX, clockY);
  ctx.lineTo(flagX, clockY - clockR * 0.55);
  ctx.moveTo(flagX, clockY);
  ctx.lineTo(flagX + clockR * 0.45, clockY + clockR * 0.2);
  ctx.stroke();

  // 门
  const doorW = towerW * 0.46;
  const doorH = towerH * 0.3;
  const doorX = towerX + (towerW - doorW) / 2;
  const doorY = baseY - doorH;
  ctx.fillStyle = '#8fd0f2';
  ctx.beginPath();
  ctx.moveTo(doorX, baseY);
  ctx.lineTo(doorX, doorY + doorW * 0.3);
  ctx.quadraticCurveTo(doorX + doorW / 2, doorY - doorW * 0.16, doorX + doorW, doorY + doorW * 0.3);
  ctx.lineTo(doorX + doorW, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = Math.max(1.5, w * 0.006);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(doorX + doorW * 0.46, doorY + doorW * 0.35, doorW * 0.08, doorH * 0.55);

  // 台阶
  ctx.fillStyle = '#f6d9ae';
  roundRectPath(ctx, doorX - w * 0.03, baseY - h * 0.006, doorW + w * 0.06, h * 0.016, w * 0.008);
  ctx.fill();
  ctx.restore();
}

function drawWindows(ctx, x, y, w, h, screenW) {
  const cols = 4;
  const rows = 2;
  const gapX = w * 0.1;
  const gapY = h * 0.16;
  const winW = (w - gapX * (cols - 1)) / cols;
  const winH = (h - gapY * (rows - 1)) / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const wx = x + col * (winW + gapX);
      const wy = y + row * (winH + gapY);
      fillRoundRect(ctx, wx, wy, winW, winH, screenW * 0.004, '#7fc8f0');
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillRect(wx + winW * 0.12, wy + winH * 0.12, winW * 0.28, winH * 0.3);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(wx + winW * 0.46, wy, winW * 0.09, winH);
    }
  }
}
