import { LEVELS, STORY_ASSETS } from '../data/levels.js';
import { SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import { drawImageContain, drawImageCover, loadImage } from '../services/assets.js';
import { drawBadgeButton, drawCoinPill } from '../ui/badges.js';
import Button from '../ui/button.js';
import { renderCampusScene } from '../ui/campus-scene.js';
import { font } from '../ui/draw.js';
import BaseScreen from './base-screen.js';

const HOME_BACKGROUND = 'assets/ui/home-bg.jpg';

/**
 * 启动首页：使用「不接梗就淘汰」竞技场背景图，中央玩家形象已合成在图中。
 * UI 只保留底部品牌、功能徽章与三枚糖果胶囊按钮，避免遮挡主视觉。
 */
export default class HomeScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.backgroundImage = null;
    this.heroImages = [];
    this.storyButton = null;
    this.resumeButton = null;
    this.collectionButton = null;
    this.badges = [];
    this.pressedBadge = null;
  }

  onEnter() {
    this.backgroundImage = loadImage(HOME_BACKGROUND);
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
    const top = this.top + sz(6);
    const compact = SCREEN_HEIGHT < 700;

    const mainH = compact ? sz(52) : sz(58);
    const secondH = compact ? sz(44) : sz(48);
    const thirdH = compact ? sz(44) : sz(48);
    const gap = sz(11);
    const stackH = mainH + secondH + thirdH + gap * 2;
    const stackBottom = this.bottom - sz(compact ? 16 : 22);
    const stackTop = stackBottom - stackH;

    this.storyButton = new Button({
      x,
      y: stackTop,
      w,
      h: mainH,
      label: '开始游戏',
      icon: '📖',
      iconName: 'book',
      style: 'candyGreen',
      fontSize: sz(compact ? 20 : 22),
      onClick: () => this.app.showScreen('map'),
    });

    this.resumeButton = new Button({
      x,
      y: stackTop + mainH + gap,
      w,
      h: secondH,
      label: '继续上一局',
      icon: '⏯️',
      iconName: 'play',
      style: 'candyBlue',
      fontSize: sz(16),
      onClick: () => this.app.resumeRun(),
    });

    this.collectionButton = new Button({
      x,
      y: stackTop + mainH + secondH + gap * 2,
      w,
      h: thirdH,
      label: '成就收集',
      icon: '🏅',
      iconName: 'trophy',
      style: 'candyOrange',
      fontSize: sz(16),
      onClick: () => this.app.showScreen('collection'),
    });

    // 品牌行：标题居中，梗币在左，功能徽章在右
    const brandTitleSize = compact ? sz(22) : sz(26);
    const brandTop = stackTop - sz(compact ? 56 : 76);
    const brandCenterY = brandTop + brandTitleSize / 2;

    const badgeSize = compact ? sz(26) : sz(30);
    const badgeGap = sz(7);
    const badgeRight = x + w - badgeSize / 2;
    const badgeDefs = [
      { kind: 'trophy', onClick: () => this.app.showScreen('leaderboard') },
      { kind: 'cart', onClick: () => this.app.showScreen('shop') },
      { kind: 'gear', onClick: () => this.app.showScreen('settings') },
    ];
    this.badges = badgeDefs.map((def, index) => ({
      ...def,
      cx: badgeRight - (badgeDefs.length - 1 - index) * (badgeSize + badgeGap),
      cy: brandCenterY,
      r: badgeSize / 2,
    }));

    this.coinPill = {
      x,
      y: this.badges[0].cy - sz(13),
      w: compact ? sz(68) : sz(74),
      h: sz(26),
    };

    // 兼容冒烟测试：主视觉中玩家角色所在的逻辑区域
    const heroRect = {
      x: (SCREEN_WIDTH - sz(64)) / 2,
      y: sz(188),
      w: sz(64),
      h: sz(176),
    };

    this.buttons = [this.storyButton, this.resumeButton, this.collectionButton];
    this.layoutInfo = {
      x,
      w,
      top,
      compact,
      badgeSize,
      stackTop,
      stackBottom,
      heroRect,
      brandTop,
      brandTitleSize,
      // 兼容旧布局测试
      mainY: stackTop,
      mainH,
      secondaryY: this.resumeButton.y,
      secondaryH: secondH,
      navY: stackBottom,
      navH: 0,
      navW: w,
      navGap: 0,
      storyY: stackTop,
      storyH: mainH,
      storyW: w,
    };
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx) {
    const theme = this.theme;
    const { x, w, compact, stackTop, brandTop, brandTitleSize } = this.layoutInfo;
    const imageDrawn = drawImageCover(
      ctx,
      this.backgroundImage,
      0,
      0,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0
    );

    if (!imageDrawn) {
      // 素材未就绪时退回卡通校园场景，避免白屏
      renderCampusScene(ctx, SCREEN_WIDTH, SCREEN_HEIGHT, this.time);
      drawImageContain(
        ctx,
        this.heroImages[0],
        this.layoutInfo.heroRect.x,
        this.layoutInfo.heroRect.y,
        this.layoutInfo.heroRect.w,
        this.layoutInfo.heroRect.h,
        0
      );
    }

    // 底部压暗，保证品牌与按钮在复杂背景上可读
    const scrim = ctx.createLinearGradient(0, stackTop - sz(96), 0, SCREEN_HEIGHT);
    scrim.addColorStop(0, 'rgba(4, 9, 20, 0)');
    scrim.addColorStop(0.55, 'rgba(4, 9, 20, 0.3)');
    scrim.addColorStop(1, 'rgba(4, 9, 20, 0.62)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, stackTop - sz(96), SCREEN_WIDTH, SCREEN_HEIGHT - stackTop + sz(96));

    // 品牌标题
    const title = '梗世界';
    const titleY = brandTop + brandTitleSize / 2;
    ctx.save();
    ctx.font = font(brandTitleSize, '900');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = sz(8);
    ctx.shadowOffsetY = sz(2);
    ctx.strokeStyle = '#0d2748';
    ctx.lineWidth = sz(4.5);
    ctx.strokeText(title, x + w / 2, titleY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, x + w / 2, titleY);
    ctx.restore();

    // 副标题 / 全通关提示
    const openLevels = LEVELS.filter((level) => level.available);
    const allCleared =
      openLevels.length > 0 &&
      openLevels.every((level) => this.app.databus.isLevelCompleted(level.id));
    const subText = allCleared ? '全部通关 · 梗王归位' : '接住梗，活下去';
    ctx.save();
    ctx.font = font(sz(compact ? 9 : 10), '700');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = sz(4);
    ctx.fillStyle = allCleared ? '#ffe6a1' : '#bfeeff';
    ctx.fillText(subText, x + w / 2, brandTop + brandTitleSize + sz(compact ? 5 : 7));
    ctx.restore();

    // 底部功能徽章
    this.badges.forEach((badge) => {
      drawBadgeButton(
        ctx,
        badge.cx,
        badge.cy,
        badge.r,
        badge.kind,
        this.pressedBadge === badge
      );
    });

    // 梗币胶囊
    drawCoinPill(
      ctx,
      this.coinPill.x,
      this.coinPill.y,
      this.coinPill.w,
      this.coinPill.h,
      this.profile.coins,
      { dark: true }
    );

    this.storyButton.render(ctx, theme);
    this.resumeButton.render(ctx, theme);
    this.collectionButton.render(ctx, theme);
  }

  hitBadge(x, y) {
    return this.badges.find((badge) => {
      const dx = x - badge.cx;
      const dy = y - badge.cy;
      return Math.sqrt(dx * dx + dy * dy) <= badge.r * 1.18;
    });
  }

  onTouchStart(x, y) {
    const badge = this.hitBadge(x, y);
    if (badge) {
      this.pressedBadge = badge;
      return true;
    }
    return this.handleButtonTouchStart(x, y);
  }

  onTouchEnd(x, y) {
    if (this.pressedBadge) {
      const badge = this.pressedBadge;
      this.pressedBadge = null;
      const hit = this.hitBadge(x, y);
      if (hit === badge) {
        this.app.audio.play('click');
        badge.onClick();
      }
      return true;
    }
    return this.handleButtonTouchEnd(x, y);
  }
}
