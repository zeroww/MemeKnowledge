import { SCORE } from '../core/types.js';
import { sz } from '../render.js';
import * as api from '../services/api.js';
import Button from '../ui/button.js';
import { drawGlassPanel, drawText, fillCircle, font, hexToRgba } from '../ui/draw.js';
import BaseScreen from './base-screen.js';

export default class DailyScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.daily = null;
    this.adBusy = false;
    this.buttons = [];
  }

  onEnter() {
    this.adBusy = false;
    this.daily = this.app.databus.getDailyInfo();
    if (!this.daily.questionIds || this.daily.questionIds.length !== 10) {
      const ids = api.createDailyQuestionIds(this.daily.dateKey);
      this.app.databus.setDailyQuestionIds(ids);
      this.daily = this.app.databus.getDailyInfo();
    }
    this.layout();
    this.app.analytics.track('daily_enter', {
      dateKey: this.daily.dateKey,
      attempts: this.daily.attempts,
    });
  }

  layout() {
    const x = this.contentX + sz(18);
    const w = this.contentW - sz(36);
    const top = this.top + sz(14);

    this.backButton = new Button({
      x,
      y: top,
      w: sz(34),
      h: sz(34),
      label: '←',
      style: 'dark',
      fontSize: sz(16),
      onClick: () => this.app.goHome(),
    });

    const statsY = top + sz(86);
    const statsH = sz(82);
    const rulesY = statsY + statsH + sz(14);
    const rulesH = sz(134);
    const startY = rulesY + rulesH + sz(18);
    const startH = sz(58);

    let label = '开始今日挑战';
    let subLabel = '免费 1 次';
    let disabled = false;
    if (this.daily.freeAvailable) {
      label = '开始今日挑战';
      subLabel = '免费 1 次';
    } else if (this.daily.adAvailable) {
      label = this.adBusy ? '广告加载中…' : '看广告再挑战';
      subLabel = '今日额外 1 次';
      disabled = this.adBusy;
    } else {
      label = '今日次数已用完';
      subLabel = '明天 00:00 重置';
      disabled = true;
    }

    this.startButton = new Button({
      x,
      y: startY,
      w,
      h: startH,
      label,
      subLabel,
      icon: '📅',
      style: this.daily.adAvailable && !this.daily.freeAvailable ? 'gold' : 'primary',
      disabled,
      onClick: () => this.startDaily(),
    });

    const rankY = startY + startH + sz(10);
    const features = this.app.config.features || {};
    const killSwitches = this.app.config.killSwitches || {};
    const leaderboardDisabled =
      features.leaderboardEnabled === false || killSwitches.disableLeaderboard === true;
    this.rankButton = new Button({
      x,
      y: rankY,
      w,
      h: sz(44),
      label: leaderboardDisabled ? '排行榜暂不可用' : '查看每日榜',
      icon: '🏆',
      style: 'secondary',
      disabled: leaderboardDisabled,
      onClick: () => this.app.showScreen('leaderboard', { period: 'daily' }),
    });

    this.buttons = [this.backButton, this.startButton, this.rankButton];
    this.layoutInfo = { x, w, top, statsY, statsH, rulesY, rulesH, startY, startH, rankY };
  }

  async startDaily() {
    if (this.adBusy) return;
    this.daily = this.app.databus.getDailyInfo();

    if (this.daily.freeAvailable) {
      this.app.databus.markDailyAttempt('free');
      this.app.analytics.track('daily_start', {
        dateKey: this.daily.dateKey,
        attempt: 1,
      });
      this.app.startDailyRun();
      return;
    }

    if (this.daily.adAvailable) {
      this.adBusy = true;
      this.layout();
      const result = await this.app.adManager.showDailyRetry({ profile: this.profile });
      this.adBusy = false;
      if (!result.ok) {
        this.layout();
        this.app.toast.show('完整观看广告后才能再挑战');
        return;
      }
      this.app.databus.markDailyAttempt('ad');
      this.daily = this.app.databus.getDailyInfo();
      this.app.analytics.track('daily_start', {
        dateKey: this.daily.dateKey,
        attempt: 2,
      });
      this.app.startDailyRun();
      return;
    }

    this.app.toast.show('今日挑战次数已用完');
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx) {
    const theme = this.theme;
    const { x, w, top, statsY, statsH, rulesY, rulesH } = this.layoutInfo;
    this.daily = this.app.databus.getDailyInfo();

    this.backButton.render(ctx, theme);
    drawText(ctx, '每日挑战', x + sz(46), top + sz(7), {
      font: font(sz(22), '800'),
      color: theme.text,
      baseline: 'top',
    });
    drawText(ctx, `日期 ${this.daily.dateKey} · 北京时间`, x + sz(46), top + sz(34), {
      font: font(sz(10), '500'),
      color: theme.muted,
      baseline: 'top',
    });

    drawGlassPanel(ctx, x, statsY, w, statsH, sz(15), theme, 0.86);
    const stats = [
      { label: '今日最佳', value: `${this.daily.bestScore || 0} 分`, color: theme.accent },
      { label: '首胜奖励', value: `+${SCORE.DAILY_WIN_COIN_BONUS} 币`, color: theme.success },
      { label: '今日次数', value: `${Math.min(2, this.daily.attempts)}/2`, color: theme.text },
    ];
    const colW = w / 3;
    stats.forEach((item, index) => {
      const cx = x + colW * index + colW / 2;
      drawText(ctx, item.value, cx, statsY + sz(29), {
        font: font(sz(17), '800'),
        color: item.color,
        align: 'center',
        baseline: 'middle',
      });
      drawText(ctx, item.label, cx, statsY + sz(56), {
        font: font(sz(10), '500'),
        color: theme.muted,
        align: 'center',
        baseline: 'middle',
      });
      if (index > 0) {
        ctx.fillStyle = hexToRgba(theme.line, 0.7);
        ctx.fillRect(x + colW * index, statsY + sz(20), 1, statsH - sz(40));
      }
    });

    drawGlassPanel(ctx, x, rulesY, w, rulesH, sz(15), theme, 0.82);
    drawText(ctx, '今日规则', x + sz(16), rulesY + sz(16), {
      font: font(sz(12), '800'),
      color: theme.text,
      baseline: 'top',
    });
    const rules = [
      '10 道固定题目，同一天题目不变',
      '每日 1 次免费机会 + 1 次广告机会',
      `首次通关额外 +${SCORE.DAILY_WIN_COIN_BONUS} 梗币`,
      '每日 00:00（北京时间）重置',
    ];
    ctx.font = font(sz(11), '500');
    ctx.fillStyle = theme.muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    rules.forEach((rule, index) => {
      fillCircle(ctx, x + sz(18), rulesY + sz(40) + index * sz(21), sz(2), theme.accent);
      ctx.fillText(rule, x + sz(26), rulesY + sz(36) + index * sz(21));
    });

    // 次数点
    const dotsY = rulesY + rulesH - sz(18);
    drawText(ctx, '今日进度', x + sz(16), dotsY, {
      font: font(sz(10), '500'),
      color: theme.muted,
      baseline: 'middle',
    });
    for (let i = 0; i < 2; i += 1) {
      fillCircle(
        ctx,
        x + sz(76) + i * sz(16),
        dotsY,
        sz(5),
        i < this.daily.attempts ? theme.accent : hexToRgba(theme.muted, 0.3)
      );
    }

    this.startButton.render(ctx, theme);
    this.rankButton.render(ctx, theme);

    drawText(
      ctx,
      '每日挑战为本地固定题单；正式版将由服务端在 00:05 生成',
      this.contentX + this.contentW / 2,
      this.bottom - sz(12),
      {
        font: font(sz(9), '400'),
        color: hexToRgba(theme.muted, 0.7),
        align: 'center',
        baseline: 'middle',
      }
    );
  }

  onTouchStart(x, y) {
    return this.handleButtonTouchStart(x, y);
  }

  onTouchEnd(x, y) {
    return this.handleButtonTouchEnd(x, y);
  }
}
