import { getWeekKey } from '../core/daily.js';
import { buildLeaderboard } from '../core/leaderboard.js';
import { SCREEN_HEIGHT, SAFE_BOTTOM, sz } from '../render.js';
import Button from '../ui/button.js';
import ScrollView from '../ui/scroll-view.js';
import { drawIcon } from '../ui/icons.js';
import {
  drawGlassPanel,
  drawText,
  fillCircle,
  font,
  formatDuration,
  hexToRgba,
  strokeRoundRect,
} from '../ui/draw.js';
import BaseScreen from './base-screen.js';

const PERIODS = [
  { key: 'week', label: '周榜' },
  { key: 'total', label: '总榜' },
];

export default class LeaderboardScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.period = 'week';
    this.data = null;
    this.scroll = null;
    this.buttons = [];
    this.tabs = [];
    this.rows = [];
  }

  onEnter() {
    this.period = ['week', 'total'].includes(this.params.period) ? this.params.period : 'week';
    this.scroll = new ScrollView();
    this.layout();
    this.refresh();
    this.app.analytics.track('leaderboard_view', { period: this.period, myRank: this.data.playerRank });
  }

  layout() {
    const x = this.contentX + sz(18);
    const w = this.contentW - sz(36);
    const top = this.top + sz(14);
    const backSize = sz(34);
    this.backButton = new Button({
      x,
      y: top,
      w: backSize,
      h: backSize,
      label: '',
      icon: '←',
      iconName: 'back',
      style: 'dark',
      fontSize: sz(16),
      onClick: () => this.app.goHome(),
    });

    const tabsY = top + sz(52);
    const gap = sz(8);
    const tabW = (w - gap * (PERIODS.length - 1)) / PERIODS.length;
    this.tabs = PERIODS.map((item, index) => {
      return new Button({
        x: x + index * (tabW + gap),
        y: tabsY,
        w: tabW,
        h: sz(34),
        label: item.label,
        style: item.key === this.period ? 'candyBlue' : 'secondary',
        fontSize: sz(13),
        onClick: () => this.switchPeriod(item.key),
      });
    });

    const playerCardY = tabsY + sz(34) + sz(12);
    const playerCardH = sz(74);
    const listY = playerCardY + playerCardH + sz(12);
    const listH = SCREEN_HEIGHT - SAFE_BOTTOM - listY - sz(12);

    this.scroll.setRect(x, listY, w, Math.max(sz(120), listH));
    this.buttons = [this.backButton, ...this.tabs];
    this.layoutInfo = { x, w, top, tabsY, playerCardY, playerCardH, listY };
  }

  switchPeriod(period) {
    if (this.period === period) return;
    this.period = period;
    this.tabs.forEach((button, index) => {
      button.style = PERIODS[index].key === period ? 'candyBlue' : 'secondary';
    });
    this.refresh();
    this.app.analytics.track('leaderboard_view', { period, myRank: this.data.playerRank });
  }

  refresh() {
    const period = this.period;
    const player = this.app.databus.getLeaderboardProfile(period);
    const seedKey = period === 'week' ? getWeekKey() : 'all';
    this.data = buildLeaderboard({ period, player, seedKey, limit: 24 });
    this.rows = this.data.entries.map((entry, index) => ({
      entry,
      x: this.layoutInfo.x,
      y: index * sz(50),
      w: this.layoutInfo.w,
      h: sz(46),
    }));
    this.scroll.setContentHeight(this.data.entries.length * sz(50));
  }

  update(dt) {
    this.time += dt;
    if (this.scroll) this.scroll.update(dt);
  }

  render(ctx) {
    const theme = this.theme;
    const { x, w, top, playerCardY, playerCardH, listY } = this.layoutInfo;

    this.backButton.render(ctx, theme);
    drawText(ctx, '排行榜', x + sz(46), top + sz(9), {
      font: font(sz(22), '800'),
      color: theme.text,
      baseline: 'top',
    });
    drawText(ctx, '本地演示榜单 · 每周一 00:00 重置', x + sz(46), top + sz(36), {      font: font(sz(10), '500'),
      color: theme.muted,
      baseline: 'top',
    });

    for (const tab of this.tabs) tab.render(ctx, theme);

    // 我的成绩
    drawGlassPanel(ctx, x, playerCardY, w, playerCardH, sz(14), theme, 0.86);
    drawText(ctx, '我的成绩', x + sz(16), playerCardY + sz(18), {
      font: font(sz(11), '600'),
      color: theme.muted,
      baseline: 'top',
    });
    drawText(ctx, this.profile.nickname, x + sz(16), playerCardY + sz(38), {
      font: font(sz(15), '800'),
      color: theme.text,
      baseline: 'top',
    });
    const playerScore = this.data.playerScore || 0;
    drawText(ctx, playerScore > 0 ? `${playerScore} 分` : '暂无成绩', x + w - sz(16), playerCardY + sz(20), {
      font: font(sz(20), '900'),
      color: playerScore > 0 ? theme.primary : theme.muted,
      align: 'right',
      baseline: 'top',
    });
    drawText(
      ctx,
      this.data.playerRank > 0 ? `第 ${this.data.playerRank} 名` : '完成一局即可上榜',
      x + w - sz(16),
      playerCardY + sz(48),
      {
        font: font(sz(10), '500'),
        color: theme.muted,
        align: 'right',
        baseline: 'top',
      }
    );

    // 榜单
    this.scroll.render(ctx, (drawCtx, offset) => {
      if (!this.data || this.data.entries.length === 0) {
        drawText(drawCtx, '榜单还是空的', x + w / 2, listY + sz(60), {
          font: font(sz(14), '500'),
          color: theme.muted,
          align: 'center',
          baseline: 'middle',
        });
        return;
      }

      this.rows.forEach((row, index) => {
        const screenY = listY + row.y - offset;
        if (screenY + row.h < listY || screenY > SCREEN_HEIGHT) return;
        const entry = row.entry;
        const isPlayer = entry.isPlayer;
        drawGlassPanel(drawCtx, row.x, screenY, row.w, row.h, sz(12), theme, 0.94, 0.9);
        if (isPlayer) {
          strokeRoundRect(
            drawCtx,
            row.x,
            screenY,
            row.w,
            row.h,
            sz(12),
            theme.primary,
            1.5
          );
        }
        drawText(drawCtx, String(this.data.entries.indexOf(entry) + 1), row.x + sz(18), screenY + row.h / 2, {
          font: font(sz(13), '800'),
          color: isPlayer ? theme.primary : index < 3 ? '#ffcf6a' : theme.muted,
          align: 'center',
          baseline: 'middle',
        });
        fillCircle(drawCtx, row.x + sz(42), screenY + row.h / 2, sz(15), 'rgba(94, 231, 255, 0.12)');
        drawIcon(drawCtx, 'user', row.x + sz(42), screenY + row.h / 2 + sz(1), sz(22));
        drawText(drawCtx, entry.nickname, row.x + sz(64), screenY + row.h / 2 - sz(6), {
          font: font(sz(13), isPlayer ? '800' : '600'),
          color: isPlayer ? theme.text : hexToRgba(theme.text, 0.92),
          baseline: 'middle',
        });
        drawText(drawCtx, formatDuration(entry.durationMs), row.x + sz(62), screenY + row.h / 2 + sz(11), {
          font: font(sz(9), '400'),
          color: theme.muted,
          baseline: 'middle',
        });
        drawText(drawCtx, `${entry.score} 分`, row.x + row.w - sz(16), screenY + row.h / 2, {
          font: font(sz(15), '800'),
          color: isPlayer ? theme.primary : theme.text,
          align: 'right',
          baseline: 'middle',
        });
      });
    });
  }

  onTouchStart(x, y) {
    if (this.handleButtonTouchStart(x, y)) {
      this.pressedControl = 'button';
      return true;
    }
    if (this.scroll && this.scroll.onTouchStart(x, y)) {
      this.pressedControl = 'scroll';
      return true;
    }
    return false;
  }

  onTouchMove(x, y) {
    if (this.pressedControl === 'scroll' && this.scroll) return this.scroll.onTouchMove(x, y);
    return false;
  }

  onTouchEnd(x, y) {
    if (this.pressedControl === 'button') {
      this.pressedControl = null;
      return this.handleButtonTouchEnd(x, y);
    }
    if (this.pressedControl === 'scroll' && this.scroll) {
      this.pressedControl = null;
      this.scroll.onTouchEnd(x, y);
      return true;
    }
    return false;
  }
}
