import { AD_PLACEMENT } from '../core/types.js';
import { SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import { drawIcon } from './icons.js';
import {
  clamp,
  drawCandyPanel,
  drawProgressBar,
  drawText,
  fillRoundRect,
  font,
  hexToRgba,
  pointInRect,
  roundRectPath,
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
    ctx.fillStyle = 'rgba(18, 52, 92, 0.58)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    drawCandyPanel(ctx, x, y, w, h, sz(26), {
      fill: '#ffffff',
      fillBottom: '#eefbff',
      border: '#bfe4f8',
      shadowColor: 'rgba(20, 60, 110, 0.34)',
      shadowBlur: sz(30),
      shadowOffsetY: sz(12),
      glossAlpha: 0.5,
    });

    drawText(
      ctx,
      this.interstitial ? '模拟广告 · 插屏' : '模拟广告 · 激励视频',
      x + w / 2,
      y + sz(28),
      {
        font: font(sz(17), '800'),
        color: '#1f4e9c',
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
    gradient.addColorStop(0, '#8fd8ff');
    gradient.addColorStop(1, '#2f8ce8');
    fillRoundRect(ctx, adX, adY, adW, adH, sz(20), gradient);
    ctx.save();
    roundRectPath(ctx, adX, adY, adW, adH, sz(20));
    ctx.clip();
    const gloss = ctx.createLinearGradient(0, adY, 0, adY + adH * 0.6);
    gloss.addColorStop(0, 'rgba(255,255,255,0.35)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(adX, adY, adW, adH * 0.6);
    ctx.restore();

    drawIcon(ctx, 'tv', adX + adW / 2, adY + adH * 0.36, sz(58));
    drawText(ctx, '广告位占位', adX + adW / 2, adY + adH * 0.65, {
      font: font(sz(17), '800'),
      color: '#ffffff',
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
        color: 'rgba(255,255,255,0.9)',
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
      '#e2f2fd',
      this.completed ? '#35b84a' : '#3a97f7'
    );

    const status = this.completed
      ? this.interstitial
        ? '广告播放完成，点击下方按钮关闭'
        : '广告播放完成，点击下方按钮领取奖励'
      : '广告播放中… 完整观看后才能领取';
    drawText(ctx, status, x + w / 2, y + sz(246), {
      font: font(sz(12), '600'),
      color: this.completed ? '#2a8f3a' : '#7fa3c6',
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

    ctx.save();
    ctx.shadowColor = this.completed ? 'rgba(47, 184, 62, 0.4)' : 'rgba(120, 150, 180, 0.2)';
    ctx.shadowBlur = sz(14);
    ctx.shadowOffsetY = sz(5);
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius);
    ctx.fillStyle = this.completed ? '#43c94f' : '#dfeaf4';
    ctx.fill();
    ctx.restore();

    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    roundRectPath(ctx, rect.x + sz(2.5), rect.y + sz(2.5), rect.w - sz(5), rect.h - sz(5), radius - sz(2));
    const body = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    if (this.completed) {
      body.addColorStop(0, '#9ceb74');
      body.addColorStop(0.55, '#4bcd55');
      body.addColorStop(1, '#2eb43d');
    } else {
      body.addColorStop(0, '#eef6fc');
      body.addColorStop(1, '#d5e6f4');
    }
    ctx.fillStyle = body;
    ctx.fill();
    drawText(ctx, actionText, rect.x + rect.w / 2, rect.y + rect.h / 2, {
      font: font(sz(15), '800'),
      color: this.completed ? '#ffffff' : '#8aa6c0',
      align: 'center',
      baseline: 'middle',
    });

    // 关闭按钮
    drawIcon(
      ctx,
      'close',
      this.closeRect.x + this.closeRect.w / 2,
      this.closeRect.y + this.closeRect.h / 2,
      this.closeRect.w
    );

    drawText(ctx, '这是开发阶段模拟广告，不会产生真实收益', x + w / 2, y + h - sz(16), {
      font: font(sz(9.5), '400'),
      color: hexToRgba('#7fa3c6', 0.9),
      align: 'center',
      baseline: 'middle',
    });

    ctx.restore();
  }
}
