/**
 * Canvas 绘制工具。所有尺寸均为逻辑像素。
 */

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

export function font(size, weight = '400') {
  return `${weight} ${Math.round(size)}px "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif`;
}

function parseHex(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (value.length !== 6) return null;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const to = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function hexToRgba(hex, alpha = 1) {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * 给任意 CSS 颜色叠加透明度（支持 #hex / rgb() / rgba()）。
 */
export function withAlpha(color, alpha = 1) {
  if (!color) return `rgba(0, 0, 0, ${alpha})`;
  if (color.startsWith('rgba(')) {
    return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  return hexToRgba(color, alpha);
}

/** 手绘对勾（避免字体缺少 ✓ 时出现豆腐块） */
export function drawCheckMark(ctx, cx, cy, size, color = '#ffffff', lineWidth = 0) {
  const lw = lineWidth || Math.max(1.5, size * 0.26);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.36, cy + size * 0.02);
  ctx.lineTo(cx - size * 0.1, cy + size * 0.3);
  ctx.lineTo(cx + size * 0.38, cy - size * 0.28);
  ctx.stroke();
  ctx.restore();
}

/** 手绘叉号 */
export function drawCrossMark(ctx, cx, cy, size, color = '#ffffff', lineWidth = 0) {
  const lw = lineWidth || Math.max(1.5, size * 0.24);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.28, cy - size * 0.28);
  ctx.lineTo(cx + size * 0.28, cy + size * 0.28);
  ctx.moveTo(cx + size * 0.28, cy - size * 0.28);
  ctx.lineTo(cx - size * 0.28, cy + size * 0.28);
  ctx.stroke();
  ctx.restore();
}

export function mixHex(from, to, amount = 0.5) {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;
  const t = clamp(amount, 0, 1);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

export function lightenHex(hex, amount = 0.2) {
  return mixHex(hex, '#ffffff', amount);
}

export function darkenHex(hex, amount = 0.2) {
  return mixHex(hex, '#000000', amount);
}

export function contrastText(hex) {
  if (!hex) return '#ffffff';
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (value.length !== 6) return '#ffffff';
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#141519' : '#ffffff';
}

export function roundRectPath(ctx, x, y, w, h, radius) {
  const r = clamp(radius, 0, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function fillRoundRect(ctx, x, y, w, h, radius, color) {
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

export function strokeRoundRect(ctx, x, y, w, h, radius, color, lineWidth = 1) {
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/**
 * 带柔和投影的圆角面板。用于页面主卡片、按钮与弹窗。
 */
export function fillRoundRectElevated(
  ctx,
  x,
  y,
  w,
  h,
  radius,
  color,
  shadow = {}
) {
  const {
    color: shadowColor = 'rgba(0, 0, 0, 0.32)',
    blur = 18,
    offsetY = 6,
  } = shadow;
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = offsetY;
  fillRoundRect(ctx, x, y, w, h, radius, color);
  ctx.restore();
}

/**
 * 圆角渐变填充。
 */
export function fillRoundRectGradient(ctx, x, y, w, h, radius, from, to, vertical = true) {
  const gradient = vertical
    ? ctx.createLinearGradient(x, y, x, y + h)
    : ctx.createLinearGradient(x, y, x + w, y);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  fillRoundRect(ctx, x, y, w, h, radius, gradient);
  return gradient;
}

/**
 * 卡片顶部高光，让纯色面板更有体积感。
 */
export function drawTopSheen(ctx, x, y, w, h, radius, alpha = 0.12) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();
  const gradient = ctx.createLinearGradient(x, y, x, y + h * 0.62);
  gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h * 0.62);
  ctx.restore();
}

export function fillCircle(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function strokeCircle(ctx, x, y, radius, color, lineWidth = 1) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function drawText(ctx, text, x, y, options = {}) {
  const {
    font: fontStr = font(14),
    color = '#ffffff',
    align = 'left',
    baseline = 'middle',
  } = options;
  ctx.font = fontStr;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(String(text), x, y);
}

function tokenize(text) {
  const tokens = [];
  let buffer = '';
  const flush = () => {
    if (buffer) {
      tokens.push(buffer);
      buffer = '';
    }
  };
  for (const ch of Array.from(text)) {
    if (/\s/.test(ch)) {
      flush();
      tokens.push(' ');
    } else if (/[　-〿一-龥＀-￯]/.test(ch)) {
      flush();
      tokens.push(ch);
    } else {
      buffer += ch;
    }
  }
  flush();
  return tokens;
}

/**
 * 文本换行（需先设置 ctx.font）。返回行数组。
 */
export function wrapText(ctx, text, maxWidth, maxLines = Infinity) {
  const source = String(text || '');
  if (!source) return [''];
  const lines = [];
  const paragraphs = source.split('\n');

  for (const paragraph of paragraphs) {
    if (lines.length >= maxLines) break;
    if (!paragraph) {
      lines.push('');
      continue;
    }

    const tokens = tokenize(paragraph);
    let line = '';

    for (const token of tokens) {
      if (lines.length >= maxLines) break;
      if (token === ' ' && line === '') continue;

      const test = line + token;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
        continue;
      }

      if (line) {
        lines.push(line.trimEnd());
        line = token === ' ' ? '' : token;
        if (lines.length >= maxLines) break;
        continue;
      }

      // 单个 token 超宽，按字符硬切
      let chunk = '';
      for (const ch of Array.from(token)) {
        if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
          if (lines.length >= maxLines) break;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    }

    if (lines.length < maxLines && line) {
      lines.push(line.trimEnd());
    }
  }

  if (lines.length === 0) return [''];

  const compactSource = source.replace(/\s/g, '');
  const compactLines = lines.join('').replace(/\s/g, '');
  if (compactLines.length < compactSource.length && lines.length) {
    let last = lines[lines.length - 1];
    while (last && ctx.measureText(last + '…').width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last}…`;
  }

  return lines;
}

export function drawWrappedText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines,
  color,
  align = 'left',
  fontStr = null
) {
  if (fontStr) ctx.font = fontStr;
  const lines = wrapText(ctx, text, maxWidth, maxLines);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return lines;
}

export function drawHeart(ctx, cx, cy, size, color, filled = true) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.62);
  ctx.bezierCurveTo(cx - size * 1.02, cy - size * 0.25, cx - size * 0.62, cy - size, cx, cy - size * 0.35);
  ctx.bezierCurveTo(cx + size * 0.62, cy - size, cx + size * 1.02, cy - size * 0.25, cx, cy + size * 0.62);
  ctx.closePath();
  if (filled) {
    const gradient = ctx.createLinearGradient(cx, cy - size, cx, cy + size * 0.6);
    gradient.addColorStop(0, lightenHex(color, 0.35));
    gradient.addColorStop(0.55, color);
    gradient.addColorStop(1, darkenHex(color, 0.16));
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse
      ? ctx.ellipse(cx - size * 0.32, cy - size * 0.32, size * 0.24, size * 0.16, -0.5, 0, Math.PI * 2)
      : ctx.arc(cx - size * 0.32, cy - size * 0.32, size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.restore();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCoin(ctx, cx, cy, radius, color, textColor = '#7a4300') {
  const gradient = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
  gradient.addColorStop(0, '#fff3b0');
  gradient.addColorStop(0.5, color || '#ffc531');
  gradient.addColorStop(1, '#f0a000');
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(217, 132, 0, 0.75)';
  ctx.lineWidth = Math.max(1, radius * 0.12);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 244, 190, 0.85)';
  ctx.lineWidth = Math.max(0.8, radius * 0.1);
  ctx.stroke();

  // 星星
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? radius * 0.44 : radius * 0.18;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#fffbe8';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse
    ? ctx.ellipse(cx - radius * 0.34, cy - radius * 0.4, radius * 0.28, radius * 0.16, -0.5, 0, Math.PI * 2)
    : ctx.arc(cx - radius * 0.34, cy - radius * 0.4, radius * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
}

export function drawStar(ctx, cx, cy, outer, inner, points, color) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawGlassPanel(ctx, x, y, w, h, radius, theme, alpha = 0.9, borderAlpha = 0.7) {
  drawCandyPanel(ctx, x, y, w, h, radius, {
    fill: theme.panel || '#0a1424',
    fillBottom: theme.panelSoft || '#0e1c30',
    border: theme.line || '#1e4a6e',
    shadowAlpha: 0.16 * alpha,
    borderAlpha: Math.max(0.45, borderAlpha),
  });
}

/**
 * 深色霓虹圆角卡片：深色玻璃渐变 + 霓虹描边 + 黑色投影 + 顶部冷光。
 */
export function drawCandyPanel(ctx, x, y, w, h, radius = 18, options = {}) {
  const {
    fill = '#0a1424',
    fillBottom = '#0e1c30',
    border = '#1e4a6e',
    shadowColor = 'rgba(0, 0, 0, 0.45)',
    shadowBlur = 18,
    shadowOffsetY = 7,
    shadowAlpha = 1,
    borderAlpha = 1,
    lineWidth = 1.5,
    glossAlpha = 0.12,
    headerHeight = 0,
    headerColor = 'rgba(18, 42, 66, 0.95)',
  } = options;

  ctx.save();
  ctx.shadowColor =
    shadowAlpha >= 1 ? shadowColor : `rgba(0, 0, 0, ${0.45 * shadowAlpha})`;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = shadowOffsetY;
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, fill);
  gradient.addColorStop(1, fillBottom);
  fillRoundRect(ctx, x, y, w, h, radius, gradient);
  ctx.restore();

  if (headerHeight > 0) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.clip();
    fillRoundRect(ctx, x, y, w, headerHeight, 0, headerColor);
    fillRoundRect(
      ctx,
      x,
      y + headerHeight - 1,
      w,
      1,
      0,
      withAlpha(border, Math.max(0.5, borderAlpha))
    );
    ctx.restore();
  }

  drawTopSheen(ctx, x, y, w, h, radius, glossAlpha);
  strokeRoundRect(ctx, x, y, w, h, radius, withAlpha(border, borderAlpha), lineWidth);
}

/**
 * 圆角胶囊标签（浅色底/彩色底都适用），带顶部高光。
 */
export function drawPill(ctx, text, x, y, options = {}) {
  const {
    fontStr = font(11, '700'),
    color = '#ffffff',
    bg = 'rgba(0,0,0,0.3)',
    border = null,
    padX = 8,
    height = 20,
    radius = 10,
    align = 'left',
    shadow = true,
    gloss = true,
  } = options;
  ctx.save();
  ctx.font = fontStr;
  const width = ctx.measureText(String(text)).width + padX * 2;
  const drawX =
    align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  if (shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = height * 0.5;
    ctx.shadowOffsetY = height * 0.18;
    fillRoundRect(ctx, drawX, y - height / 2, width, height, radius, bg);
    ctx.restore();
  } else {
    fillRoundRect(ctx, drawX, y - height / 2, width, height, radius, bg);
  }
  if (gloss) {
    ctx.save();
    roundRectPath(ctx, drawX, y - height / 2, width, height, radius);
    ctx.clip();
    const sheen = ctx.createLinearGradient(0, y - height / 2, 0, y - height / 2 + height * 0.6);
    sheen.addColorStop(0, 'rgba(255,255,255,0.4)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(drawX, y - height / 2, width, height * 0.6);
    ctx.restore();
  }
  if (border) {
    strokeRoundRect(ctx, drawX, y - height / 2, width, height, radius, border, 1);
  }
  drawText(ctx, text, drawX + padX, y + 0.5, { font: fontStr, color, baseline: 'middle' });
  ctx.restore();
  return width;
}

export function drawProgressBar(ctx, x, y, w, h, progress, bgColor, fillColor) {
  fillRoundRect(ctx, x, y, w, h, h / 2, bgColor);
  const clamped = clamp(progress, 0, 1);
  if (clamped > 0) {
    fillRoundRect(ctx, x, y, Math.max(h, w * clamped), h, h / 2, fillColor);
  }
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.round((ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatNumber(value) {
  return String(Math.max(0, Math.round(value || 0)));
}

export function truncate(text, max) {
  const value = String(text || '');
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
