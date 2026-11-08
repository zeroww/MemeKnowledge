import { AD_PLACEMENT } from '../core/types.js';
import { SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import {
  clamp,
  contrastText,
  drawProgressBar,
  drawText,
  fillCircle,
  fillRoundRect,
  font,
  hexToRgba,
  pointInRect,
  strokeRoundRect,
} from './draw.js';

const PLACEMENT_LABEL = {
  revive: '复活',
  hint: '提示',
  extend: '加时',
  double: '双倍梗币',
  daily: '每日挑战',
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
    const panelH = sz(340);
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
      y: panelY + panelH - sz(66),
      w: panelW - sz(44),
      h: sz(46),
    };
    this.progressRect = {
      x: panelX + sz(22),
      y: panelY + sz(236),
      w: panelW - sz(44),
      h: sz(6),
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    fillRoundRect(ctx, x, y, w, h, sz(22), hexToRgba(theme.panel, 0.99));
    strokeRoundRect(ctx, x, y, w, h, sz(22), theme.line, 1);

    drawText(ctx, this.interstitial ? '模拟插屏广告 · 开发阶段' : '模拟激励视频 · 开发阶段', x + w / 2, y + sz(28), {
      font: font(sz(12), '700'),
      color: theme.accent,
      align: 'center',
      baseline: 'middle',
    });

    // 假广告画面
    const adX = x + sz(22);
    const adY = y + sz(54);
    const adW = w - sz(44);
    const adH = sz(152);
    const gradient = ctx.createLinearGradient(adX, adY, adX + adW, adY + adH);
    gradient.addColorStop(0, theme.primaryDeep || theme.primary);
    gradient.addColorStop(1, theme.primary);
    fillRoundRect(ctx, adX, adY, adW, adH, sz(16), gradient);

    drawText(ctx, '📺', adX + adW / 2, adY + adH * 0.34, {
      font: font(sz(46), '400'),
      color: '#ffffff',
      align: 'center',
      baseline: 'middle',
    });
    drawText(ctx, '广告位占位', adX + adW / 2, adY + adH * 0.62, {
      font: font(sz(17), '800'),
      color: contrastText(theme.primary),
      align: 'center',
      baseline: 'middle',
    });
    drawText(ctx, this.interstitial ? '关闭后继续游戏' : '完整观看后领取奖励', adX + adW / 2, adY + adH * 0.8, {
      font: font(sz(12), '500'),
      color: hexToRgba(contrastText(theme.primary), 0.82),
      align: 'center',
      baseline: 'middle',
    });

    // 进度
    drawProgressBar(
      ctx,
      this.progressRect.x,
      this.progressRect.y,
      this.progressRect.w,
      this.progressRect.h,
      progress,
      hexToRgba(theme.line, 0.8),
      theme.accent
    );

    const status = this.completed
      ? this.interstitial
        ? '广告播放完成，点击下方按钮关闭'
        : '广告播放完成，点击下方按钮领取奖励'
      : '广告播放中… 完整观看后才能领取';
    drawText(ctx, status, x + w / 2, y + sz(266), {
      font: font(sz(12), '500'),
      color: this.completed ? theme.success : theme.muted,
      align: 'center',
      baseline: 'middle',
    });

    const label = PLACEMENT_LABEL[this.placement] || '奖励';
    const actionBg = this.completed ? theme.accent : hexToRgba(theme.panelSoft, 0.9);
    const actionText = this.completed
      ? this.interstitial
        ? '关闭'
        : `领取奖励 · ${label}`
      : '播放中…';
    fillRoundRect(
      ctx,
      this.actionRect.x,
      this.actionRect.y,
      this.actionRect.w,
      this.actionRect.h,
      sz(14),
      actionBg
    );
    drawText(ctx, actionText, x + w / 2, this.actionRect.y + this.actionRect.h / 2, {
      font: font(sz(15), '800'),
      color: this.completed ? contrastText(theme.accent) : theme.muted,
      align: 'center',
      baseline: 'middle',
    });

    // 关闭按钮（提前关闭用于测试失败分支）
    fillCircle(
      ctx,
      this.closeRect.x + this.closeRect.w / 2,
      this.closeRect.y + this.closeRect.h / 2,
      this.closeRect.w / 2,
      hexToRgba(theme.panelSoft, 0.95)
    );
    drawText(ctx, '×', this.closeRect.x + this.closeRect.w / 2, this.closeRect.y + this.closeRect.h / 2 - 1, {
      font: font(sz(18), '500'),
      color: theme.muted,
      align: 'center',
      baseline: 'middle',
    });

    drawText(ctx, '这是开发阶段模拟广告，不会产生真实收益', x + w / 2, y + h - sz(20), {
      font: font(sz(10), '400'),
      color: hexToRgba(theme.muted, 0.75),
      align: 'center',
      baseline: 'middle',
    });

    ctx.restore();
  }
}
