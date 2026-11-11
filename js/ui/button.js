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
}
