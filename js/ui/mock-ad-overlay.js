import { AD_PLACEMENT } from '../core/types.js';
import { SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import { drawIcon } from './icons.js';
import {
  clamp,
  drawCandyPanel,
  drawProgressBar,
  drawText,
  fillCircle,
  fillRoundRect,
  font,
  hexToRgba,
  pointInRect,
  roundRectPath,
  strokeRoundRect,
} from './draw.js';

const PLACEMENT_LABEL = {
  revive: '复活',
  hint: '提示',
  extend: '加时',
  double: '双倍梗币',
  interstitial: '插屏广告',
};

/**
 * 模拟广告覆盖层。
 * 用于流量主未开通 / 开发阶段的完整流程演练：
 * - 完整观看后返回 true；
 * - 提前点右上角关闭返回 false（用于测试失败分支）。
 */
export default class MockAdOverlay {
  constructor() {
    this.visible = false;
    this.placement = '';
    this.interstitial = false;
    this.duration = 1600;
    this.startAt = 0;
    this.completed = false;
    this.pressed = null;
    this.resolve = null;

    this.panel = { x: 0, y: 0, w: 0, h: 0 };
    this.closeRect = { x: 0, y: 0, w: 0, h: 0 };
    this.actionRect = { x: 0, y: 0, w: 0, h: 0 };
    this.progressRect = { x: 0, y: 0, w: 0, h: 0 };
    this._layout();
  }

  _layout() {
    const panelW = Math.min(SCREEN_WIDTH - sz(40), sz(360));
    const panelH = sz(356);
    const panelX = (SCREEN_WIDTH - panelW) / 2;
    const panelY = (SCREEN_HEIGHT - panelH) / 2;
    this.panel = { x: panelX, y: panelY, w: panelW, h: panelH };
    this.closeRect = {
      x: panelX + panelW - sz(42),
      y: panelY + sz(10),
      w: sz(32),
      h: sz(32),
    };
    this.actionRect = {
      x: panelX + sz(22),
      y: panelY + sz(262),
      w: panelW - sz(44),
      h: sz(48),
    };
    this.progressRect = {
      x: panelX + sz(22),
      y: panelY + sz(222),
      w: panelW - sz(44),
      h: sz(8),
    };
  }

  show(placement = AD_PLACEMENT.REVIVE, options = {}) {
    if (this.visible) return Promise.resolve(false);

    this.visible = true;
    this.placement = placement;
    this.interstitial = !!options.interstitial;
    this.duration = options.duration || (this.interstitial ? 1200 : 1600);
    this.startAt = Date.now();
    this.completed = false;
    this.pressed = null;
    this._layout();

    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  update() {
    if (!this.visible) return;
    if (!this.completed && Date.now() - this.startAt >= this.duration) {
      this.completed = true;
    }
  }

  isVisible() {
    return this.visible;
  }

  finish(value) {
    if (!this.visible) return;
    this.visible = false;
    this.pressed = null;
    const resolve = this.resolve;
    this.resolve = null;
    if (resolve) resolve(!!value);
  }

  onTouchStart(x, y) {
    if (!this.visible) return false;
    this.pressed = 'none';
    if (pointInRect(x, y, this.closeRect.x, this.closeRect.y, this.closeRect.w, this.closeRect.h)) {
      this.pressed = 'close';
    } else if (
      this.completed &&
      pointInRect(x, y, this.actionRect.x, this.actionRect.y, this.actionRect.w, this.actionRect.h)
    ) {
      this.pressed = 'action';
    }
    return true;
  }

  onTouchEnd(x, y) {
    if (!this.visible) return false;
    const pressed = this.pressed;
    this.pressed = null;

    if (
      pressed === 'close' &&
      pointInRect(x, y, this.closeRect.x, this.closeRect.y, this.closeRect.w, this.closeRect.h)
    ) {
      // 已完整播放时关闭视同完成；提前关闭才不发奖
      this.finish(this.completed);
      return true;
    }
    if (
      pressed === 'action' &&
      this.completed &&
      pointInRect(x, y, this.actionRect.x, this.actionRect.y, this.actionRect.w, this.actionRect.h)
    ) {
      this.finish(true);
      return true;
    }
    return true;
  }

  render(ctx, theme) {
    if (!this.visible) return;

    const elapsed = clamp(Date.now() - this.startAt, 0, this.duration);
    const progress = elapsed / this.duration;
    const { x, y, w, h } = this.panel;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    drawCandyPanel(ctx, x, y, w, h, sz(26), {
      fill: '#0a1626',
      fillBottom: '#0e2138',
      border: 'rgba(94, 231, 255, 0.5)',
      shadowColor: 'rgba(0, 0, 0, 0.65)',
      shadowBlur: sz(30),
      shadowOffsetY: sz(12),
      glossAlpha: 0.12,
    });

    drawText(
      ctx,
      this.interstitial ? '模拟广告 · 插屏' : '模拟广告 · 激励视频',
      x + w / 2,
      y + sz(28),
      {
        font: font(sz(17), '800'),
        color: '#e8f7ff',
        align: 'center',
        baseline: 'middle',
      }
    );

    // 假广告画面
    const adX = x + sz(22);
    const adY = y + sz(50);
    const adW = w - sz(44);
    const adH = sz(158);
    const gradient = ctx.createLinearGradient(adX, adY, adX, adY + adH);
    gradient.addColorStop(0, '#0b2036');
    gradient.addColorStop(1, '#155b8f');
    fillRoundRect(ctx, adX, adY, adW, adH, sz(20), gradient);
    ctx.save();
    roundRectPath(ctx, adX, adY, adW, adH, sz(20));
    ctx.clip();
    const gloss = ctx.createLinearGradient(0, adY, 0, adY + adH * 0.6);
    gloss.addColorStop(0, 'rgba(180, 240, 255, 0.2)');
    gloss.addColorStop(1, 'rgba(180, 240, 255, 0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(adX, adY, adW, adH * 0.6);
    ctx.restore();
    strokeRoundRect(ctx, adX, adY, adW, adH, sz(20), 'rgba(94,231,255,0.45)', 1.5);

    drawIcon(ctx, 'tv', adX + adW / 2, adY + adH * 0.36, sz(58));
    drawText(ctx, '广告位占位', adX + adW / 2, adY + adH * 0.65, {
      font: font(sz(17), '800'),
      color: '#eaffff',
      align: 'center',
      baseline: 'middle',
    });
    drawText(
      ctx,
      this.interstitial ? '关闭后继续游戏' : '完整观看后领取奖励',
      adX + adW / 2,
      adY + adH * 0.82,
      {
        font: font(sz(11), '500'),
        color: 'rgba(200, 240, 255, 0.85)',
        align: 'center',
        baseline: 'middle',
      }
    );

    // 进度
    drawProgressBar(
      ctx,
      this.progressRect.x,
      this.progressRect.y,
      this.progressRect.w,
      this.progressRect.h,
      progress,
      '#12304a',
      this.completed ? '#5df2a0' : '#5ee7ff'
    );

    const status = this.completed
      ? this.interstitial
        ? '广告播放完成，点击下方按钮关闭'
        : '广告播放完成，点击下方按钮领取奖励'
      : '广告播放中… 完整观看后才能领取';
    drawText(ctx, status, x + w / 2, y + sz(246), {
      font: font(sz(12), '600'),
      color: this.completed ? '#6ef2a0' : '#7fa6c9',
      align: 'center',
      baseline: 'middle',
    });

    // 领取按钮
    const label = PLACEMENT_LABEL[this.placement] || '奖励';
    const actionText = this.completed
      ? this.interstitial
        ? '关闭'
        : `领取奖励 · ${label}`
      : '播放中…';
    const rect = this.actionRect;
    const radius = rect.h / 2;
    const edge = this.completed ? '#5df2a0' : '#5a7f9e';

    ctx.save();
    ctx.shadowColor = this.completed
      ? 'rgba(93, 242, 160, 0.4)'
      : 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = sz(14);
    ctx.shadowOffsetY = sz(5);
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius);
    ctx.fillStyle = this.completed ? '#1c6b3c' : '#0b1420';
    ctx.fill();
    ctx.restore();

    roundRectPath(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, radius - 1);
    const body = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    if (this.completed) {
      body.addColorStop(0, '#0f2f22');
      body.addColorStop(0.55, '#1c6b3c');
      body.addColorStop(1, '#2e9d54');
    } else {
      body.addColorStop(0, '#0b1420');
      body.addColorStop(1, '#111d2c');
    }
    ctx.fillStyle = body;
    ctx.fill();
    roundRectPath(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, radius - 1);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawText(ctx, actionText, rect.x + rect.w / 2, rect.y + rect.h / 2, {
      font: font(sz(15), '800'),
      color: this.completed ? '#f2fff7' : '#7fa6c9',
      align: 'center',
      baseline: 'middle',
    });

    // 关闭按钮
    const closeCx = this.closeRect.x + this.closeRect.w / 2;
    const closeCy = this.closeRect.y + this.closeRect.h / 2;
    const closeR = this.closeRect.w / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(94, 231, 255, 0.4)';
    ctx.shadowBlur = sz(12);
    fillCircle(ctx, closeCx, closeCy, closeR, '#07111d');
    ctx.restore();
    ctx.beginPath();
    ctx.arc(closeCx, closeCy, closeR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(94, 231, 255, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#9ff4ff';
    ctx.lineWidth = sz(2.2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(closeCx - closeR * 0.38, closeCy - closeR * 0.38);
    ctx.lineTo(closeCx + closeR * 0.38, closeCy + closeR * 0.38);
    ctx.moveTo(closeCx + closeR * 0.38, closeCy - closeR * 0.38);
    ctx.lineTo(closeCx - closeR * 0.38, closeCy + closeR * 0.38);
    ctx.stroke();

    drawText(ctx, '这是开发阶段模拟广告，不会产生真实收益', x + w / 2, y + h - sz(16), {
      font: font(sz(9.5), '400'),
      color: 'rgba(127, 166, 201, 0.75)',
      align: 'center',
      baseline: 'middle',
    });

    ctx.restore();
  }
}
