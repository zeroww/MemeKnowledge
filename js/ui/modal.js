import { ctx as measureCtx, SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import Button from './button.js';
import { drawIcon } from './icons.js';
import {
  clamp,
  drawText,
  drawTopSheen,
  easeOutCubic,
  fillCircle,
  fillRoundRectGradient,
  font,
  hexToRgba,
  strokeRoundRect,
  wrapText,
} from './draw.js';

/**
 * 通用 Canvas 弹窗：标题 + 多行说明 + 1～3 个按钮。
 * 屏幕自己决定何时显示、按钮文案与回调。
 */
export default class Modal {
  constructor() {
    this.visible = false;
    this.title = '';
    this.message = '';
    this.tone = 'default';
    this.buttons = [];
    this.titleLines = [];
    this.messageLines = [];
    this.lineHeight = sz(21);
    this.contentX = 0;
    this.contentW = 0;
    this.panel = { x: 0, y: 0, w: 0, h: 0 };
    this.onClose = null;
    this.shownAt = 0;
  }

  isVisible() {
    return this.visible;
  }

  show(options = {}) {
    this.visible = true;
    this.title = options.title || '';
    this.message = options.message || '';
    this.tone = options.tone || 'default';
    this.iconName = options.icon || '';
    this.onClose = options.onClose || null;
    this.pressed = null;
    this.shownAt = Date.now();

    this.buttons = (options.buttons || []).map((definition) => {
      return new Button({
        label: definition.label || '',
        subLabel: definition.subLabel || '',
        icon: definition.icon || '',
        iconName: definition.iconName || '',
        style: definition.style || 'secondary',
        disabled: !!definition.disabled,
        onClick: () => {
          if (definition.closeOnClick !== false) this.hide();
          if (definition.onClick) definition.onClick();
        },
      });
    });

    this.layout();
  }

  hide() {
    this.visible = false;
    this.pressed = null;
    if (this.onClose) this.onClose();
  }

  layout() {
    const panelW = Math.min(SCREEN_WIDTH - sz(36), sz(360));
    const contentX = (SCREEN_WIDTH - panelW) / 2 + sz(22);
    const contentW = panelW - sz(44);
    const titleFont = font(sz(20), '800');
    const messageFont = font(sz(14), '400');
    const lineHeight = sz(21);
    const hasSubLabel = this.buttons.some((button) => !!button.subLabel);
    const buttonHeight = hasSubLabel ? sz(54) : this.buttons.length > 2 ? sz(46) : sz(48);
    const buttonGap = sz(10);
    const buttonsHeight =
      this.buttons.length === 0
        ? 0
        : this.buttons.length > 2
          ? this.buttons.length * buttonHeight + (this.buttons.length - 1) * buttonGap
          : buttonHeight;

    measureCtx.font = titleFont;
    const titleLines = this.title ? wrapText(measureCtx, this.title, contentW, 2) : [];
    const titleHeight = titleLines.length * sz(27);

    measureCtx.font = messageFont;
    const maxMessageHeight = SCREEN_HEIGHT - sz(150) - titleHeight - buttonsHeight;
    const maxLines = Math.max(2, Math.floor(maxMessageHeight / lineHeight));
    const messageLines = this.message ? wrapText(measureCtx, this.message, contentW, maxLines) : [];
    const messageHeight = messageLines.length * lineHeight;

    let panelH = sz(22) + titleHeight + (titleHeight ? sz(8) : 0) + messageHeight + (messageHeight ? sz(16) : 0) + buttonsHeight + sz(20);
    panelH = Math.min(panelH, SCREEN_HEIGHT - sz(48));

    const panelX = (SCREEN_WIDTH - panelW) / 2;
    const panelY = (SCREEN_HEIGHT - panelH) / 2;

    this.panel = { x: panelX, y: panelY, w: panelW, h: panelH };
    this.titleLines = titleLines;
    this.messageLines = messageLines;
    this.lineHeight = lineHeight;
    this.contentX = contentX;
    this.contentW = contentW;
    this.titleFont = titleFont;
    this.messageFont = messageFont;
    this.buttonHeight = buttonHeight;
    this.buttonGap = buttonGap;
    this.messageTop = panelY + sz(22) + titleHeight + (titleHeight ? sz(8) : 0);
    this.buttonsTop = panelY + panelH - sz(20) - buttonsHeight;

    if (this.buttons.length === 1) {
      this.buttons[0].setRect(contentX, this.buttonsTop, contentW, buttonHeight);
    } else if (this.buttons.length === 2) {
      const buttonW = (contentW - buttonGap) / 2;
      this.buttons[0].setRect(contentX, this.buttonsTop, buttonW, buttonHeight);
      this.buttons[1].setRect(contentX + buttonW + buttonGap, this.buttonsTop, buttonW, buttonHeight);
    } else {
      this.buttons.forEach((button, index) => {
        button.setRect(
          contentX,
          this.buttonsTop + index * (buttonHeight + buttonGap),
          contentW,
          buttonHeight
        );
      });
    }
  }

  onTouchStart(x, y) {
    if (!this.visible) return false;
    this.pressed = null;
    for (let i = 0; i < this.buttons.length; i += 1) {
      if (this.buttons[i].onTouchStart(x, y)) {
        this.pressed = this.buttons[i];
        break;
      }
    }
    return true;
  }

  onTouchEnd(x, y) {
    if (!this.visible) return false;
    if (this.pressed) {
      const button = this.pressed;
      this.pressed = null;
      button.onTouchEnd(x, y);
      return true;
    }
    for (const button of this.buttons) button.cancel();
    return true;
  }

  render(ctx, theme) {
    if (!this.visible) return;

    const entrance = clamp((Date.now() - this.shownAt) / 190, 0, 1);
    const eased = easeOutCubic(entrance);
    const { x, y, w, h } = this.panel;
    const toneColor = this.tone === 'danger' ? theme.danger : theme.accent;

    ctx.save();
    ctx.fillStyle = 'rgba(24, 58, 96, 0.42)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.translate(cx, cy);
    ctx.scale(0.94 + eased * 0.06, 0.94 + eased * 0.06);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = eased;

    ctx.save();
    ctx.shadowColor = 'rgba(30, 70, 120, 0.32)';
    ctx.shadowBlur = sz(28);
    ctx.shadowOffsetY = sz(12);
    fillRoundRectGradient(
      ctx,
      x,
      y,
      w,
      h,
      sz(26),
      '#ffffff',
      '#eefbff'
    );
    ctx.restore();
    drawTopSheen(ctx, x, y, w, h, sz(26), 0.5);
    strokeRoundRect(ctx, x, y, w, h, sz(26), '#bfe4f8', 1.8);

    // 顶部悬浮图标
    if (this.iconName) {
      drawIcon(ctx, this.iconName, cx, y + sz(2), sz(44));
    } else if (this.tone === 'pause') {
      drawIcon(ctx, 'pause', cx, y + sz(2), sz(44));
    } else {
      ctx.save();
      ctx.shadowColor = hexToRgba(toneColor, 0.5);
      ctx.shadowBlur = sz(18);
      ctx.shadowOffsetY = sz(4);
      const iconGradient = ctx.createLinearGradient(cx, y - sz(24), cx, y + sz(24));
      iconGradient.addColorStop(0, this.tone === 'danger' ? '#ff9d8f' : '#ffd970');
      iconGradient.addColorStop(1, this.tone === 'danger' ? '#e8453a' : '#ffb400');
      fillCircle(ctx, cx, y + sz(2), sz(22), iconGradient);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, y + sz(2), sz(22), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = sz(2);
      ctx.stroke();
      ctx.restore();
      if (this.tone === 'danger') {
        drawText(ctx, '!', cx, y + sz(2), {
          font: font(sz(22), '900'),
          color: '#ffffff',
          align: 'center',
          baseline: 'middle',
        });
      } else {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = sz(3.4);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - sz(8), y + sz(2));
        ctx.lineTo(cx - sz(2), y + sz(8));
        ctx.lineTo(cx + sz(9), y - sz(5));
        ctx.stroke();
        ctx.restore();
      }
    }

    let cursorY = y + sz(30);
    if (this.titleLines.length) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = this.titleFont;
      ctx.fillStyle = this.tone === 'danger' ? theme.danger : theme.text;
      this.titleLines.forEach((line, index) => {
        ctx.fillText(line, x + w / 2, cursorY + index * sz(27));
      });
      cursorY += this.titleLines.length * sz(27) + sz(8);
    }

    if (this.messageLines.length) {
      const messageColor =
        this.tone === 'danger'
          ? hexToRgba(theme.text, 0.88)
          : hexToRgba(theme.text, 0.72);
      ctx.font = this.messageFont;
      ctx.fillStyle = messageColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      this.messageLines.forEach((line, index) => {
        ctx.fillText(line, x + w / 2, cursorY + index * this.lineHeight);
      });
    }

    for (const button of this.buttons) button.render(ctx, theme);
    ctx.restore();
  }
}
