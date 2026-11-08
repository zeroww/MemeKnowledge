import { roundRectPath } from '../ui/draw.js';

/**
 * 本地剧情图片加载与绘制。
 * 图片放在 assets/story/，使用 wx.createImage 异步加载；加载失败时调用方绘制占位。
 */
const imageCache = new Map();

export function loadImage(src) {
  if (!src) return null;
  if (imageCache.has(src)) return imageCache.get(src);

  const entry = {
    src,
    img: null,
    loaded: false,
    failed: false,
  };

  try {
    const img = wx.createImage();
    img.onload = () => {
      entry.loaded = true;
    };
    img.onerror = () => {
      entry.failed = true;
    };
    img.src = src;
    entry.img = img;
  } catch (error) {
    entry.failed = true;
  }

  imageCache.set(src, entry);
  return entry;
}

export function isImageReady(entry) {
  return !!(entry && entry.loaded && entry.img && entry.img.width > 0 && entry.img.height > 0);
}

function withRoundedClip(ctx, x, y, w, h, radius, draw) {
  ctx.save();
  if (radius > 0) {
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.clip();
  }
  draw();
  ctx.restore();
}

/**
 * 等比完整显示（可能留白）。
 */
export function drawImageContain(ctx, entry, x, y, w, h, radius = 0) {
  if (!isImageReady(entry)) return false;
  const img = entry.img;
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;

  withRoundedClip(ctx, x, y, w, h, radius, () => {
    ctx.drawImage(img, dx, dy, dw, dh);
  });
  return true;
}

/**
 * 等比铺满（裁切边缘）。
 */
export function drawImageCover(ctx, entry, x, y, w, h, radius = 0) {
  if (!isImageReady(entry)) return false;
  const img = entry.img;
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;

  withRoundedClip(ctx, x, y, w, h, radius, () => {
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  });
  return true;
}

/**
 * 绘制横向精灵图的第 frameIndex 帧。
 */
export function drawImageFrame(ctx, entry, frameIndex, frameCount, x, y, w, h, radius = 0) {
  if (!isImageReady(entry)) return false;
  const img = entry.img;
  const frameW = img.width / frameCount;
  const frameH = img.height;
  const index = Math.max(0, Math.min(frameCount - 1, frameIndex));

  withRoundedClip(ctx, x, y, w, h, radius, () => {
    ctx.drawImage(img, index * frameW, 0, frameW, frameH, x, y, w, h);
  });
  return true;
}

export function drawImagePlaceholder(ctx, x, y, w, h, radius, theme, label = '图片加载中…') {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = 'rgba(24, 26, 31, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = 'rgba(247,242,231,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.restore();
}
