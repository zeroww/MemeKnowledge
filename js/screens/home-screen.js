import { APP_VERSION } from '../core/types.js';
import { LEVELS, STORY_ASSETS, STORY_PREMISE, isLevelUnlocked } from '../data/levels.js';
import { SCREEN_HEIGHT, SCREEN_WIDTH, sz, ctx as measureCtx } from '../render.js';
import {
  drawImageContain,
  drawImageCover,
  loadImage,
} from '../services/assets.js';
import Button from '../ui/button.js';
import {
  drawPill,
  drawText,
  fillRoundRect,
  font,
  hexToRgba,
  strokeRoundRect,
  wrapText,
} from '../ui/draw.js';
import { renderLives } from '../ui/life-bar.js';
import BaseScreen from './base-screen.js';

/**
 * 剧情模式开始界面：世界背景说明、剧情入口（第一章或校园地图）、日常功能入口。
 */
export default class HomeScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.backgroundImage = null;
    this.heroImages = [];
    this.storyButton = null;
    this.dailyButton = null;
    this.resumeButton = null;
    this.navButtons = [];
  }

  onEnter() {
    this.backgroundImage = loadImage(STORY_ASSETS.background);
    this.heroImages = (STORY_ASSETS.heroes || []).map((src) => loadImage(src));
    this.layout();
    this.app.analytics.track('home_view', {
      coins: this.profile.coins,
      bestScore: this.profile.bestScore,
      collectionCount: this.app.databus.getCollectionCount(),
      level1Completed: this.app.databus.isLevelCompleted(1),
      hasSnapshot: this.app.databus.hasSnapshot(),
    });
  }

  layout() {
    const x = this.contentX + sz(18);
    const w = this.contentW - sz(36);
    const top = this.top + sz(14);
    const compact = SCREEN_HEIGHT < 700;
    const storyY = top + (compact ? sz(74) : sz(82));
    const storyH = compact ? sz(150) : sz(168);
    const storyButtonY = storyY + storyH + sz(12);
    const storyButtonH = compact ? sz(52) : sz(56);
    const secondaryY = storyButtonY + storyButtonH + sz(10);
    const secondaryH = compact ? sz(44) : sz(48);
    const routeY = secondaryY + secondaryH + sz(22);
    const navY = this.bottom - sz(compact ? 62 : 68);
    const navH = compact ? sz(48) : sz(52);
    const navGap = sz(7);
    const navW = (w - navGap * 3) / 4;

    const storyProgress = this.app.databus.getStoryProgress();
    const completedCount = LEVELS.filter(
      (level) => level.available && !!storyProgress.completedLevels[level.id]
    ).length;
    const hasProgress = completedCount > 0;
    const nextLevel = LEVELS.find(
      (level) => level.available && !storyProgress.completedLevels[level.id]
    );
    const storySub = hasProgress
      ? nextLevel
        ? `已完成 ${completedCount} 章 · 下一站 ${nextLevel.name}`
        : '第一至第三章 已完成'
      : '第一章 · 宿舍';
    const dailyInfo = this.app.databus.getDailyInfo();
    let dailySub = '免费 1 次';
    if (dailyInfo.adAvailable) dailySub = '可看广告再挑战';
    if (dailyInfo.exhausted) dailySub = '今日次数已用完';

    const features = this.app.config.features || {};
    const killSwitches = this.app.config.killSwitches || {};
    const dailyDisabled = features.dailyEnabled === false;
    const leaderboardDisabled =
      features.leaderboardEnabled === false || killSwitches.disableLeaderboard === true;
    const shopDisabled = features.shopEnabled === false;
    const collectionDisabled = features.collectionEnabled === false;

    this.storyButton = new Button({
      x,
      y: storyButtonY,
      w,
      h: storyButtonH,
      label: hasProgress ? '进入校园地图' : '开始故事',
      subLabel: storySub,
      icon: hasProgress ? '🗺️' : '📖',
      style: 'primary',
      fontSize: sz(18),
      subFontSize: sz(10),
      onClick: () =>
        hasProgress
          ? this.app.showScreen('map')
          : this.app.showScreen('levelIntro', { levelId: 1 }),
    });

    this.dailyButton = new Button({
      x,
      y: secondaryY,
      w: (w - navGap) / 2,
      h: secondaryH,
      label: '每日挑战',
      subLabel: dailyDisabled ? '暂不可用' : dailySub,
      icon: '📅',
      style: 'secondary',
      disabled: dailyDisabled,
      onClick: () => this.app.showScreen('daily'),
    });

    this.resumeButton = new Button({
      x: x + (w - navGap) / 2 + navGap,
      y: secondaryY,
      w: (w - navGap) / 2,
      h: secondaryH,
      label: '继续上一局',
      subLabel: this.app.databus.hasSnapshot() ? '本地存档 · 24 小时' : '暂无进行中的对局',
      icon: '⏯️',
      style: 'secondary',
      disabled: !this.app.databus.hasSnapshot(),
      onClick: () => this.app.resumeRun(),
    });

    this.navButtons = [
      new Button({
        x,
        y: navY,
        w: navW,
        h: navH,
        label: '图鉴',
        icon: '📚',
        style: 'secondary',
        fontSize: sz(12),
        disabled: collectionDisabled,
        onClick: () => this.app.showScreen('collection'),
      }),
      new Button({
        x: x + navW + navGap,
        y: navY,
        w: navW,
        h: navH,
        label: '排行',
        icon: '🏆',
        style: 'secondary',
        fontSize: sz(12),
        disabled: leaderboardDisabled,
        onClick: () => this.app.showScreen('leaderboard'),
      }),
      new Button({
        x: x + (navW + navGap) * 2,
        y: navY,
        w: navW,
        h: navH,
        label: '商店',
        icon: '🛍️',
        style: 'secondary',
        fontSize: sz(12),
        disabled: shopDisabled,
        onClick: () => this.app.showScreen('shop'),
      }),
      new Button({
        x: x + (navW + navGap) * 3,
        y: navY,
        w: navW,
        h: navH,
        label: '设置',
        icon: '⚙️',
        style: 'secondary',
        fontSize: sz(12),
        onClick: () => this.app.showScreen('settings'),
      }),
    ];

    // 主角只有剧情开始后才出现在首页；首次登场由开场对白触发
    const story = this.app.databus.getStoryProgress();
    const showHero = !!story.started;
    const heroH = compact ? sz(120) : sz(140);
    const heroW = showHero ? heroH * 0.5 : 0;
    const storyW = showHero ? w - heroW - sz(10) : w;
    const heroRect = showHero
      ? {
          x: x + w - heroW,
          y: storyY + storyH - heroH,
          w: heroW,
          h: heroH,
        }
      : null;

    this.buttons = [this.storyButton, this.dailyButton, this.resumeButton, ...this.navButtons];
    this.layoutInfo = {
      x,
      w,
      top,
      compact,
      storyY,
      storyH,
      storyW,
      showHero,
      heroRect,
      storyButtonY,
      storyButtonH,
      secondaryY,
      secondaryH,
      routeY,
      navY,
      navH,
      navW,
      navGap,
      hasProgress,
      completedCount,
    };
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx) {
    const theme = this.theme;
    const {
      x,
      w,
      top,
      compact,
      storyY,
      storyH,
      storyW,
      showHero,
      heroRect,
      routeY,
      hasProgress,
      completedCount,
    } = this.layoutInfo;

    if (!drawImageCover(ctx, this.backgroundImage, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0)) {
      const bg = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
      bg.addColorStop(0, theme.bgTop);
      bg.addColorStop(1, theme.bgBottom);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    const overlay = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    overlay.addColorStop(0, 'rgba(6, 8, 12, 0.58)');
    overlay.addColorStop(0.55, 'rgba(6, 8, 12, 0.68)');
    overlay.addColorStop(1, 'rgba(6, 8, 12, 0.92)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    drawText(ctx, 'MEME OR DIE · 校园生存篇', x, top, {
      font: font(sz(9), '700'),
      color: theme.accent,
      baseline: 'top',
    });
    drawText(ctx, '梗世界', x, top + sz(14), {
      font: font(sz(34), '900'),
      color: '#ffffff',
      baseline: 'top',
    });
    drawText(ctx, '不接住梗，就会被世界淘汰', x, top + sz(54), {
      font: font(sz(13), '700'),
      color: '#f2c14e',
      baseline: 'top',
    });

    // 世界背景说明卡
    fillRoundRect(
      ctx,
      x + sz(3),
      storyY + sz(4),
      storyW,
      storyH,
      sz(16),
      'rgba(0,0,0,0.34)'
    );
    fillRoundRect(ctx, x, storyY, storyW, storyH, sz(16), 'rgba(250, 247, 239, 0.96)');
    strokeRoundRect(ctx, x, storyY, storyW, storyH, sz(16), 'rgba(42, 36, 28, 0.26)', 1);
    ctx.fillStyle = theme.danger;
    ctx.fillRect(x, storyY + sz(8), sz(3), storyH - sz(16));

    drawPill(
      ctx,
      hasProgress ? `剧情进度 · ${completedCount}/3 章` : '序章 · 穿越',
      x + sz(14),
      storyY + sz(18),
      {
        fontStr: font(sz(9), '700'),
        color: theme.danger,
        bg: 'rgba(225, 58, 47, 0.12)',
        height: sz(18),
        padX: sz(8),
      }
    );

    const textX = x + sz(16);
    const textW = storyW - sz(32);
    const textTop = storyY + sz(38);
    const fontSize = compact ? sz(11.5) : sz(12.5);
    const lineHeight = fontSize * 1.5;
    measureCtx.font = font(fontSize, '500');
    const premiseLines = wrapText(measureCtx, STORY_PREMISE.join('\n'), textW, 5);
    ctx.font = font(fontSize, '500');
    ctx.fillStyle = 'rgba(40, 34, 26, 0.88)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    premiseLines.forEach((line, index) => {
      ctx.fillText(line, textX, textTop + index * lineHeight);
    });

    // 主角 3 格血立绘：剧情开始后才出现
    if (showHero && heroRect) {
      const heroImage = this.heroImages[0];
      if (!drawImageContain(ctx, heroImage, heroRect.x, heroRect.y, heroRect.w, heroRect.h, 0)) {
        drawText(ctx, '你', heroRect.x + heroRect.w / 2, heroRect.y + heroRect.h / 2, {
          font: font(sz(12), '700'),
          color: 'rgba(255,255,255,0.5)',
          align: 'center',
          baseline: 'middle',
        });
      }
      const heartSize = sz(6);
      const heartGap = sz(2);
      const heartsW = 3 * (heartSize * 1.45 + heartGap);
      renderLives(
        ctx,
        heroRect.x + Math.max(0, (heroRect.w - heartsW) / 2),
        heroRect.y - sz(7),
        3,
        3,
        theme,
        heartSize,
        heartGap
      );
    }

    drawText(
      ctx,
      `最佳 ${this.profile.bestScore || 0} · 图鉴 ${this.app.databus.getCollectionCount()}/150 · 梗币 ${this.profile.coins}`,
      textX,
      storyY + storyH - sz(12),
      {
        font: font(sz(8), '500'),
        color: 'rgba(40, 34, 26, 0.55)',
        baseline: 'bottom',
      }
    );

    this.storyButton.render(ctx, theme);
    this.dailyButton.render(ctx, theme);
    this.resumeButton.render(ctx, theme);

    this.renderRoute(ctx, theme, x, w, routeY);

    for (const button of this.navButtons) button.render(ctx, theme);

    drawText(
      ctx,
      `本地 Demo v${APP_VERSION} · 广告为模拟 · 分享无奖励`,
      this.contentX + this.contentW / 2,
      this.bottom - sz(10),
      {
        font: font(sz(9), '400'),
        color: 'rgba(255,255,255,0.48)',
        align: 'center',
        baseline: 'middle',
      }
    );
  }

  renderRoute(ctx, theme, x, w, routeY) {
    const story = this.app.databus.getStoryProgress();
    const items = LEVELS.slice(0, 3).map((level) => {
      const completed = this.app.databus.isLevelCompleted(level.id);
      const active = !completed && isLevelUnlocked(level.id, story);
      return {
        label: level.name,
        color: completed ? theme.success : active ? theme.accent : theme.muted,
        text: completed ? `${level.name} ✓` : level.name,
      };
    });

    ctx.font = font(sz(10), '700');
    const arrowW = sz(16);
    const pillPad = sz(9);
    const widths = items.map(
      (item) => ctx.measureText(item.text).width + pillPad * 2
    );
    const total =
      widths.reduce((sum, value) => sum + value, 0) + arrowW * (items.length - 1);
    let cursor = x + (w - total) / 2;

    items.forEach((item, index) => {
      drawPill(ctx, item.text, cursor, routeY, {
        fontStr: font(sz(10), '700'),
        color: item.color,
        bg: hexToRgba(item.color, 0.12),
        height: sz(20),
        padX: pillPad,
      });
      cursor += widths[index];
      if (index < items.length - 1) {
        drawText(ctx, '→', cursor + arrowW / 2, routeY, {
          font: font(sz(11), '700'),
          color: hexToRgba(theme.muted, 0.7),
          align: 'center',
          baseline: 'middle',
        });
        cursor += arrowW;
      }
    });
  }

  onTouchStart(x, y) {
    return this.handleButtonTouchStart(x, y);
  }

  onTouchEnd(x, y) {
    return this.handleButtonTouchEnd(x, y);
  }
}
