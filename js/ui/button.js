import { sz } from '../render.js';
import { drawIcon, hasGlossyIcon } from './icons.js';
import {
  clamp,
  contrastText,
  darkenHex,
  font,
  hexToRgba,
  lightenHex,
  pointInRect,
  roundRectPath,
} from './draw.js';

/**
 * 参考图风格按钮：
 * - 胶囊外形 + 半透明白色厚描边（果冻外壳）
 * - 上亮下深的糖果渐变 + 顶部高光 + 底部暗边
 * - 同色柔和投影，按下时轻微下沉
 * - 高饱和全彩果冻图标（带白色光晕）
 */

const CANDY = {
  candyGreen: {
    stops: ['#9ceb74', '#4bcd55', '#2eb43d'],
    rim: '#eaffdf',
    edge: '#2a9f36',
    shadow: 'rgba(46, 180, 61, 0.42)',
  },
  candyBlue: {
    stops: ['#86d4ff', '#3a97f7', '#2174de'],
    rim: '#e4f6ff',
    edge: '#1f6ac9',
    shadow: 'rgba(33, 116, 222, 0.42)',
  },
  candyOrange: {
    stops: ['#ffd47a', '#ffa62b', '#ff8a12'],
    rim: '#fff3dd',
    edge: '#e97a08',
    shadow: 'rgba(255, 138, 18, 0.42)',
  },
  candyPink: {
    stops: ['#ffd0e8', '#ff86bf', '#f267a9'],
    rim: '#fff0f8',
    edge: '#dd4f93',
    shadow: 'rgba(242, 103, 169, 0.4)',
  },
  candyPurple: {
    stops: ['#ddc6ff', '#a97cf2', '#8154de'],
    rim: '#f6efff',
    edge: '#7045c9',
    shadow: 'rgba(129, 84, 222, 0.4)',
  },
};

const SOFT = {
  softSky: { from: '#eaf9ff', to: '#c3e9ff', text: '#2b6fd6', edge: '#a9d8f5' },
  softSun: { from: '#fffceb', to: '#ffeba8', text: '#a4690a', edge: '#f0cf72' },
  softMint: { from: '#effff7', to: '#c2f3d9', text: '#1f8a5e', edge: '#9fdcbd' },
  softViolet: { from: '#f9f2ff', to: '#e2ceff', text: '#6c40b8', edge: '#cab1ee' },
};

const FILLED = new Set(['primary', 'gold', 'danger', 'success', 'hero']);

const NEON = {
  green: {
    stops: ['#0f2f22', '#1c6b3c', '#2e9d54'],
    edge: '#5df2a0',
    glow: 'rgba(93, 242, 160, 0.42)',
    text: '#f2fff7',
    filled: true,
  },
  cyan: {
    stops: ['#081a2c', '#0d3a55', '#12688f'],
    edge: '#5ee7ff',
    glow: 'rgba(94, 231, 255, 0.4)',
    text: '#ecfdff',
    filled: true,
  },
  blue: {
    stops: ['#0b2036', '#155b8f', '#1f8fd8'],
    edge: '#6fe3ff',
    glow: 'rgba(111, 227, 255, 0.4)',
    text: '#f2fdff',
    filled: true,
  },
  gold: {
    stops: ['#2b210a', '#8a6a12', '#d6a41a'],
    edge: '#ffe08a',
    glow: 'rgba(255, 224, 138, 0.4)',
    text: '#fff9e6',
    filled: true,
  },
  red: {
    stops: ['#2b0d10', '#8a2027', '#d83a42'],
    edge: '#ff8a8a',
    glow: 'rgba(255, 92, 100, 0.45)',
    text: '#fff3f3',
    filled: true,
  },
  purple: {
    stops: ['#1d1236', '#5a2f9e', '#8b5cf6'],
    edge: '#c9a6ff',
    glow: 'rgba(169, 124, 255, 0.42)',
    text: '#f8f2ff',
    filled: true,
  },
  pink: {
    stops: ['#2b1220', '#8a2b58', '#d44a8b'],
    edge: '#ffa8d4',
    glow: 'rgba(255, 122, 184, 0.42)',
    text: '#fff4fa',
    filled: true,
  },
  glass: {
    stops: ['#0a1626', '#0e2238'],
    edge: '#5ee7ff',
    glow: 'rgba(94, 231, 255, 0.28)',
    text: '#c9f5ff',
    filled: false,
  },
  muted: {
    stops: ['#0b1420', '#111d2c'],
    edge: '#5a7f9e',
    glow: 'rgba(90, 127, 158, 0.24)',
    text: '#9fc0d8',
    filled: false,
  },
};

function neonFor(style) {  switch (style) {
    case 'primary':
    case 'success':
    case 'candyGreen':
    case 'softMint':
      return NEON.green;
    case 'candyBlue':
      return NEON.blue;
    case 'dark':
    case 'ghost':
    case 'secondary':
    case 'softSky':
      return NEON.glass;
    case 'candyOrange':
    case 'gold':
    case 'hero':
    case 'softSun':
      return NEON.gold;
    case 'candyPurple':
    case 'softViolet':
      return NEON.purple;
    case 'candyPink':
      return NEON.pink;
    case 'danger':
      return NEON.red;
    case 'quiet':
      return NEON.muted;
    default:
      return NEON.glass;
  }
}

function stopsFor(style, theme) {
  if (CANDY[style]) {
    return { ...CANDY[style], text: '#ffffff', filled: true };
  }
  if (style === 'hero') {
    return {
      stops: ['#ffe98f', '#ffc42e', '#ff9d0a'],
      rim: '#fff5cf',
      edge: '#ef9000',
      shadow: 'rgba(255, 157, 10, 0.46)',
      text: '#6b3a00',
      filled: true,
    };
  }
  if (style === 'gold') {
    return {
      stops: ['#ffe58a', '#ffc12a', '#ffa515'],
      rim: '#fff6d2',
      edge: '#e89400',
      shadow: 'rgba(255, 165, 21, 0.4)',
      text: '#7a4300',
      filled: true,
    };
  }
  if (style === 'danger') {
    const base = theme.danger || '#f2544b';
    return {
      stops: [lightenHex(base, 0.32), base, darkenHex(base, 0.14)],
      rim: '#ffecea',
      edge: darkenHex(base, 0.24),
      shadow: hexToRgba(base, 0.42),
      text: '#ffffff',
      filled: true,
    };
  }
  if (style === 'dark') {
    return {
      stops: ['#86d4ff', '#3a97f7', '#2174de'],
      rim: '#e4f6ff',
      edge: '#1f6ac9',
      shadow: 'rgba(33, 116, 222, 0.42)',
      text: '#ffffff',
      filled: true,
    };
  }
  if (style === 'success' || style === 'primary') {
    const base = style === 'success' ? theme.success || '#3fc45a' : theme.primary || '#3fbf4c';
    return {
      stops: [lightenHex(base, 0.34), lightenHex(base, 0.06), darkenHex(base, 0.1)],
      rim: lightenHex(base, 0.84),
      edge: darkenHex(base, 0.2),
      shadow: hexToRgba(base, 0.42),
      text: '#ffffff',
      filled: true,
    };
  }
  if (SOFT[style]) {
    return {
      stops: [SOFT[style].from, SOFT[style].to],
      rim: '#ffffff',
      edge: SOFT[style].edge,
      shadow: 'rgba(90, 150, 200, 0.2)',
      text: SOFT[style].text,
      filled: false,
    };
  }
  return null;
}

const NEON_GLYPHS = new Set(['back', 'play', 'pause', 'close']);

/** 圆形导航键的霓虹线性符号（替换糖果圆形图标） */
function drawNeonGlyph(ctx, name, cx, cy, size, color) {
  const s = size / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.6, size * 0.1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.28;

  if (name === 'back') {
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.28, cy - s * 0.46);
    ctx.lineTo(cx - s * 0.3, cy);
    ctx.lineTo(cx + s * 0.28, cy + s * 0.46);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.24, cy);
    ctx.lineTo(cx + s * 0.36, cy);
    ctx.stroke();
  } else if (name === 'play') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.28, cy - s * 0.48);
    ctx.lineTo(cx + s * 0.46, cy);
    ctx.lineTo(cx - s * 0.28, cy + s * 0.48);
    ctx.closePath();
    ctx.fill();
  } else if (name === 'pause') {
    ctx.lineWidth = Math.max(2, s * 0.32);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.24, cy - s * 0.4);
    ctx.lineTo(cx - s * 0.24, cy + s * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.24, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.24, cy + s * 0.4);
    ctx.stroke();
  } else if (name === 'close') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.4, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.4, cy + s * 0.4);
    ctx.moveTo(cx + s * 0.4, cy - s * 0.4);
    ctx.lineTo(cx - s * 0.4, cy + s * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

export default class Button {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.w = options.w || 0;
    this.h = options.h || 0;
    this.label = options.label || '';
    this.subLabel = options.subLabel || '';
    this.icon = options.icon || '';
    this.iconName = options.iconName || '';
    this.style = options.style || 'primary';
    this.onClick = options.onClick || null;
    this.disabled = !!options.disabled;
    this.pressed = false;
    this.radius = options.radius || sz(999);
    this.fontSize = options.fontSize || sz(15);
    this.subFontSize = options.subFontSize || sz(11);
    this.visible = options.visible !== false;
    this.tileIcon = options.tileIcon === true;
  }

  setRect(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  setDisabled(disabled) {
    this.disabled = !!disabled;
    if (this.disabled) this.pressed = false;
  }

  setLabel(label, subLabel = this.subLabel) {
    this.label = label;
    if (subLabel !== undefined) this.subLabel = subLabel;
  }

  contains(x, y) {
    return this.visible && pointInRect(x, y, this.x, this.y, this.w, this.h);
  }

  onTouchStart(x, y) {
    if (!this.visible || this.disabled) return false;
    if (!this.contains(x, y)) return false;
    this.pressed = true;
    return true;
  }

  onTouchEnd(x, y) {
    if (!this.visible || this.disabled) {
      this.pressed = false;
      return false;
    }
    const hit = this.pressed && this.contains(x, y);
    this.pressed = false;
    if (hit && this.onClick) {
      this.onClick();
      return true;
    }
    return false;
  }

  cancel() {
    this.pressed = false;
  }

  /** 描边宽度：小按钮略细，大按钮更厚 */
  rimWidth() {
    return clamp(this.h * 0.055, 1.6, 4.5);
  }

  render(ctx, theme) {
    if (!this.visible) return;

    if (theme.uiMode !== 'candy') {
      this.renderNeon(ctx, theme);
      return;
    }

    const size = stopsFor(this.style, theme);
    const filled = !!size && size.filled;
    const lightStyle = !filled;
    const alpha = this.disabled ? 0.46 : 1;
    const pressedScale = this.pressed && !this.disabled ? 0.972 : 1;
    const radius = clamp(this.radius, 0, Math.min(this.w, this.h) / 2);
    const rim = this.rimWidth();

    ctx.save();
    ctx.globalAlpha = alpha;

    if (pressedScale !== 1) {
      const ccx = this.x + this.w / 2;
      const ccy = this.y + this.h / 2;
      ctx.translate(ccx, ccy);
      ctx.scale(pressedScale, pressedScale);
      ctx.translate(-ccx, -ccy);
    }

    const shadowColor = size
      ? size.shadow
      : 'rgba(90, 150, 200, 0.22)';
    const edgeColor = size ? size.edge : '#a9d8f5';
    const rimColor = size ? size.rim : '#ffffff';

    // 纯图标按钮：图标本身是完整圆形胶囊（返回/暂停/关闭），直接绘制更干净
    if (!this.label && !this.subLabel && this.iconName && hasGlossyIcon(this.iconName)) {
      const iconSize = Math.min(this.w, this.h) * 0.99;
      ctx.save();
      ctx.globalAlpha *= this.disabled ? 0.5 : 1;
      const halo = ctx.createRadialGradient(
        this.x + this.w / 2,
        this.y + this.h / 2,
        iconSize * 0.2,
        this.x + this.w / 2,
        this.y + this.h / 2,
        iconSize * 0.6
      );
      halo.addColorStop(0, 'rgba(255,255,255,0.22)');
      halo.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, iconSize * 0.6, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(ctx, this.iconName, this.x + this.w / 2, this.y + this.h / 2, iconSize);
      ctx.restore();
      ctx.restore();
      return;
    }

    // 1) 柔和外投影
    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = this.pressed ? this.h * 0.18 : this.h * 0.42;
    ctx.shadowOffsetY = this.pressed ? this.h * 0.04 : this.h * 0.13;
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.fillStyle = filled ? size.stops[1] : '#e9f7ff';
    ctx.fill();
    ctx.restore();

    // 2) 外层彩色细描边（让胶囊在浅色背景上更立体）
    roundRectPath(ctx, this.x + 0.5, this.y + 0.5, this.w - 1, this.h - 1, radius);
    ctx.strokeStyle = hexToRgba(edgeColor, filled ? 0.55 : 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3) 白色果冻外壳
    const shell = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
    shell.addColorStop(0, '#ffffff');
    shell.addColorStop(0.5, rimColor);
    shell.addColorStop(1, filled ? lightenHex(edgeColor, 0.72) : '#e2f3ff');
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.fillStyle = shell;
    ctx.fill();

    // 4) 内层彩色主体
    const innerX = this.x + rim;
    const innerY = this.y + rim;
    const innerW = this.w - rim * 2;
    const innerH = this.h - rim * 2;
    const innerRadius = Math.max(1, radius - rim);

    const body = ctx.createLinearGradient(0, innerY, 0, innerY + innerH);
    if (filled) {
      body.addColorStop(0, size.stops[0]);
      body.addColorStop(0.52, size.stops[1]);
      body.addColorStop(1, size.stops[2]);
    } else if (size) {
      body.addColorStop(0, size.stops[0]);
      body.addColorStop(1, size.stops[1]);
    } else {
      body.addColorStop(0, '#ffffff');
      body.addColorStop(1, '#e8f7ff');
    }
    roundRectPath(ctx, innerX, innerY, innerW, innerH, innerRadius);
    ctx.fillStyle = body;
    ctx.fill();

    // 5) 内层暗边（底部 3D 厚度）
    ctx.save();
    roundRectPath(ctx, innerX, innerY, innerW, innerH, innerRadius);
    ctx.clip();
    if (filled) {
      const lip = ctx.createLinearGradient(0, innerY + innerH * 0.68, 0, innerY + innerH);
      lip.addColorStop(0, 'rgba(0,0,0,0)');
      lip.addColorStop(1, 'rgba(0,0,0,0.14)');
      ctx.fillStyle = lip;
      ctx.fillRect(innerX, innerY + innerH * 0.6, innerW, innerH * 0.4);
    }

    // 6) 顶部果冻高光
    const gloss = ctx.createLinearGradient(0, innerY, 0, innerY + innerH * 0.62);
    gloss.addColorStop(0, filled ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.9)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(innerX, innerY, innerW, innerH * 0.62);

    const shineW = Math.max(2, innerW * 0.3);
    const shineH = Math.max(2, innerH * 0.2);
    ctx.save();
    ctx.translate(innerX + innerW * 0.3, innerY + innerH * 0.27);
    ctx.scale(shineW, shineH);
    const shine = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    shine.addColorStop(0, `rgba(255,255,255,${filled ? 0.72 : 0.9})`);
    shine.addColorStop(0.6, `rgba(255,255,255,${filled ? 0.3 : 0.5})`);
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // 7) 内圈白色细描边
    roundRectPath(
      ctx,
      innerX + 0.75,
      innerY + 0.75,
      innerW - 1.5,
      innerH - 1.5,
      Math.max(1, innerRadius - 1)
    );
    ctx.strokeStyle = filled ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 8) 文本与图标
    const textColor = size
      ? size.text
      : lightStyle
        ? '#2b6fd6'
        : contrastText(size.stops[1]);
    const hasSub = !!this.subLabel;
    const labelY = hasSub ? this.y + this.h * 0.36 : this.y + this.h / 2;
    const iconSize = Math.min(this.h * 0.68, this.fontSize * 2.1);
    const isIconOnly = !this.label && !!this.iconName;
    const iconCenterY = isIconOnly ? this.y + this.h / 2 : labelY;

    let textStartX = this.x + this.w / 2;
    if (this.iconName && hasGlossyIcon(this.iconName)) {
      const gap = this.label ? sz(6) : 0;
      ctx.font = font(this.fontSize, '800');
      const labelW = ctx.measureText(String(this.label || '')).width;
      const totalW = iconSize + gap + labelW;
      const startX = this.x + this.w / 2 - totalW / 2;
      const iconCx = startX + iconSize / 2;

      // 白色光晕，避免彩色图标与彩色底混在一起
      if (this.label) {
        ctx.save();
        ctx.globalAlpha *= filled ? 0.35 : 0.5;
        const halo = ctx.createRadialGradient(
          iconCx,
          iconCenterY,
          iconSize * 0.1,
          iconCx,
          iconCenterY,
          iconSize * 0.72
        );
        halo.addColorStop(0, '#ffffff');
        halo.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(iconCx, iconCenterY, iconSize * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 贴纸式白色外发光：彩色图标叠在彩色按钮上仍然清晰
      ctx.save();
      ctx.shadowColor = filled ? 'rgba(255,255,255,0.92)' : 'rgba(70,130,190,0.2)';
      ctx.shadowBlur = Math.max(2, iconSize * 0.24);
      drawIcon(ctx, this.iconName, iconCx, iconCenterY, iconSize, { alpha: 1 });
      ctx.restore();
      if (this.label) textStartX = startX + iconSize + gap;
    } else if (this.icon) {
      ctx.font = font(iconSize * 0.92, '400');
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(this.icon), this.x + this.w * 0.28, iconCenterY);
    }

    if (this.label) {
      const labelFont = hasSub ? Math.max(10, this.fontSize * 0.88) : this.fontSize;
      ctx.font = font(labelFont, '800');
      ctx.textAlign = this.iconName ? 'left' : 'center';
      ctx.textBaseline = 'middle';
      if (filled) {
        ctx.save();
        ctx.globalAlpha *= 0.28;
        ctx.fillStyle = darkenHex(size.stops[2], 0.4);
        ctx.fillText(
          String(this.label),
          textStartX,
          labelY + Math.max(1, labelFont * 0.09)
        );
        ctx.restore();
      }
      ctx.fillStyle = textColor;
      ctx.fillText(String(this.label), textStartX, labelY);
    }

    if (hasSub) {
      ctx.font = font(this.subFontSize, '600');
      ctx.fillStyle = filled ? 'rgba(255,255,255,0.82)' : hexToRgba(textColor, 0.78);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(this.subLabel), this.x + this.w / 2, this.y + this.h * 0.73);
    }

    ctx.restore();
  }

  /** 深色霓虹按钮（非首页界面统一使用） */
  renderNeon(ctx) {
    const spec = neonFor(this.style);
    const radius = clamp(this.radius, 0, Math.min(this.w, this.h) / 2);
    const alpha = this.disabled ? 0.42 : 1;
    const pressedScale = this.pressed && !this.disabled ? 0.972 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (pressedScale !== 1) {
      const ccx = this.x + this.w / 2;
      const ccy = this.y + this.h / 2;
      ctx.translate(ccx, ccy);
      ctx.scale(pressedScale, pressedScale);
      ctx.translate(-ccx, -ccy);
    }

    const isIconOnly = !this.label && !this.subLabel && this.iconName && hasGlossyIcon(this.iconName);

    // 纯图标按钮：深色圆盘 + 霓虹环 + 图标
    if (isIconOnly) {
      const r = Math.min(this.w, this.h) / 2;
      ctx.save();
      ctx.shadowColor = spec.glow;
      ctx.shadowBlur = r * 0.7;
      ctx.shadowOffsetY = r * 0.12;
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = '#07111d';
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, r - 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = spec.edge;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, r - 5, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(spec.edge, 0.25);
      ctx.lineWidth = 1;
      ctx.stroke();

      if (NEON_GLYPHS.has(this.iconName)) {
        drawNeonGlyph(
          ctx,
          this.iconName,
          this.x + this.w / 2,
          this.y + this.h / 2,
          r * 1.05,
          spec.edge
        );
      } else {
        drawIcon(
          ctx,
          this.iconName,
          this.x + this.w / 2,
          this.y + this.h / 2,
          r * 1.5
        );
      }
      ctx.restore();
      return;
    }
    // 投影光晕
    ctx.save();
    ctx.shadowColor = spec.glow;
    ctx.shadowBlur = this.h * 0.45;
    ctx.shadowOffsetY = this.h * 0.08;
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.fillStyle = spec.filled ? spec.stops[1] : '#08121e';
    ctx.fill();
    ctx.restore();

    // 主体
    const body = ctx.createLinearGradient(0, this.y, 0, this.y + this.h);
    if (spec.filled) {
      body.addColorStop(0, spec.stops[0]);
      body.addColorStop(0.52, spec.stops[1]);
      body.addColorStop(1, spec.stops[2]);
    } else {
      body.addColorStop(0, spec.stops[0]);
      body.addColorStop(0.8, spec.stops[1]);
      body.addColorStop(1, hexToRgba(spec.edge, 0.12));
    }
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.fillStyle = body;
    ctx.fill();

    // 底部内阴影
    ctx.save();
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.clip();
    const shade = ctx.createLinearGradient(0, this.y + this.h * 0.55, 0, this.y + this.h);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = shade;
    ctx.fillRect(this.x, this.y + this.h * 0.5, this.w, this.h * 0.5);
    ctx.restore();

    // 冷色高光
    ctx.save();
    roundRectPath(ctx, this.x, this.y, this.w, this.h, radius);
    ctx.clip();
    const sheen = ctx.createLinearGradient(0, this.y, 0, this.y + this.h * 0.55);
    sheen.addColorStop(0, 'rgba(200, 245, 255, 0.16)');
    sheen.addColorStop(1, 'rgba(200, 245, 255, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(this.x, this.y, this.w, this.h * 0.55);
    ctx.restore();

    // 外发光描边
    ctx.save();
    ctx.shadowColor = spec.edge;
    ctx.shadowBlur = this.h * 0.32;
    roundRectPath(ctx, this.x + 1, this.y + 1, this.w - 2, this.h - 2, radius - 1);
    ctx.strokeStyle = spec.edge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 内侧细线
    roundRectPath(ctx, this.x + 5, this.y + 5, this.w - 10, this.h - 10, Math.max(1, radius - 5));
    ctx.strokeStyle = hexToRgba(spec.edge, 0.24);
    ctx.lineWidth = 1;
    ctx.stroke();

    // 文字与图标
    const hasSub = !!this.subLabel;
    const labelY = hasSub ? this.y + this.h * 0.36 : this.y + this.h / 2;
    const rawIconSize = Math.min(this.h * 0.54, this.fontSize * 1.55);
    const iconBox = rawIconSize * 1.28;
    const gap = sz(7);
    const labelFontSize = hasSub ? Math.max(10, this.fontSize * 0.88) : this.fontSize;

    let textStartX = this.x + this.w / 2;
    let iconCx = 0;
    let iconSize = 0;

    if (this.iconName && hasGlossyIcon(this.iconName)) {
      iconSize = rawIconSize;
      ctx.font = font(labelFontSize, '800');
      const labelW = this.label ? ctx.measureText(String(this.label)).width : 0;
      const totalW = iconBox + (this.label ? gap + labelW : 0);
      const startX = this.x + this.w / 2 - totalW / 2;
      iconCx = startX + iconBox / 2;
      textStartX = startX + iconBox + gap;

      // 全息图标槽
      ctx.save();
      ctx.beginPath();
      ctx.arc(iconCx, labelY, iconSize * 0.66, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(3, 9, 17, 0.66)';
      ctx.fill();
      ctx.strokeStyle = hexToRgba(spec.edge, 0.4);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = spec.edge;
      ctx.shadowBlur = iconSize * 0.34;
      if (NEON_GLYPHS.has(this.iconName)) {
        drawNeonGlyph(ctx, this.iconName, iconCx, labelY, iconSize * 0.92, spec.edge);
      } else {
        drawIcon(ctx, this.iconName, iconCx, labelY, iconSize * 0.9);
      }
      ctx.restore();
    } else if (this.icon) {
      ctx.font = font(rawIconSize * 0.92, '400');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = spec.text;
      ctx.fillText(String(this.icon), this.x + this.w * 0.28, labelY);
    }

    if (this.label) {
      ctx.font = font(labelFontSize, '800');
      ctx.textAlign = this.iconName ? 'left' : 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.globalAlpha *= 0.5;
      ctx.fillStyle = '#000000';
      ctx.fillText(
        String(this.label),
        textStartX,
        labelY + Math.max(1, labelFontSize * 0.08)
      );
      ctx.restore();
      ctx.fillStyle = spec.filled ? spec.text : spec.edge;
      ctx.fillText(String(this.label), textStartX, labelY);
    }

    if (hasSub) {
      ctx.font = font(this.subFontSize, '600');
      ctx.fillStyle = spec.filled
        ? 'rgba(235, 250, 255, 0.72)'
        : hexToRgba(spec.edge, 0.72);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(this.subLabel), this.x + this.w / 2, this.y + this.h * 0.73);
    }

    ctx.restore();
  }
}
