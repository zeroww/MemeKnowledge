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

export function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string') return `rgba(0, 0, 0, ${alpha})`;
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (value.length !== 6) return `rgba(0, 0, 0, ${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCoin(ctx, cx, cy, radius, color, textColor = '#141519') {
  const gradient = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.35,
    radius * 0.1,
    cx,
    cy,
    radius
  );
  gradient.addColorStop(0, '#fff3c4');
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, '#b8860b');
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = font(radius * 0.9, '700');
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('币', cx, cy + 1);
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
  fillRoundRect(ctx, x, y, w, h, radius, hexToRgba(theme.panel, alpha));
  strokeRoundRect(ctx, x, y, w, h, radius, hexToRgba(theme.line, borderAlpha), 1);
}

export function drawPill(ctx, text, x, y, options = {}) {
  const {
    fontStr = font(11, '700'),
    color = '#ffffff',
    bg = 'rgba(0,0,0,0.3)',
    padX = 8,
    height = 20,
    radius = 10,
    align = 'left',
  } = options;
  ctx.font = fontStr;
  const width = ctx.measureText(String(text)).width + padX * 2;
  const drawX =
    align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  fillRoundRect(ctx, drawX, y - height / 2, width, height, radius, bg);
  drawText(ctx, text, drawX + padX, y + 0.5, { font: fontStr, color, baseline: 'middle' });
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
