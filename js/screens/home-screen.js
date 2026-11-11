import { LEVELS, STORY_ASSETS } from '../data/levels.js';
import { RIGHT_SAFE_X, SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import { drawImageContain, loadImage } from '../services/assets.js';
import { drawBadgeButton, drawCoinPill } from '../ui/badges.js';
import Button from '../ui/button.js';
import { renderCampusScene } from '../ui/campus-scene.js';
import { drawText, font } from '../ui/draw.js';
import BaseScreen from './base-screen.js';

/**
 * 启动首页：卡通校园场景 + 顶部圆形功能按钮 + 三枚糖果胶囊按钮。
 * 对齐参考图：主按钮绿色、次按钮蓝色、第三按钮橙色。
 */
export default class HomeScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.heroImages = [];
    this.storyButton = null;
    this.resumeButton = null;
    this.collectionButton = null;
    this.badges = [];
    this.pressedBadge = null;
  }

  onEnter() {
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

    const badgeSize = compact ? sz(32) : sz(36);
    const badgeGap = sz(9);
    const badgeCy = top + badgeSize / 2 + sz(2);
    const badgeRight = Math.min(RIGHT_SAFE_X, x + w) - badgeSize / 2;
    const badgeDefs = [
      { kind: 'trophy', onClick: () => this.app.showScreen('leaderboard') },
      { kind: 'cart', onClick: () => this.app.showScreen('shop') },
      { kind: 'gear', onClick: () => this.app.showScreen('settings') },
    ];
    this.badges = badgeDefs.map((def, index) => ({
      ...def,
      cx: badgeRight - (badgeDefs.length - 1 - index) * (badgeSize + badgeGap),
      cy: badgeCy,
      r: badgeSize / 2,
    }));

    this.coinPill = {
      x,
      y: badgeCy - sz(14),
      w: sz(78),
      h: sz(28),
    };

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

    const heroH = compact ? sz(156) : sz(186);
    const heroRect = {
      x: x + w - heroH * 0.42 + sz(4),
      y: stackTop - heroH + sz(12),
      w: heroH * 0.42,
      h: heroH,
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
      titleY: top + sz(38),
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
    const { x, w, top, compact, heroRect, stackTop } = this.layoutInfo;

    renderCampusScene(ctx, SCREEN_WIDTH, SCREEN_HEIGHT, this.time);

    // 底部轻微提亮，保证按钮区域干净
    const scrim = ctx.createLinearGradient(0, stackTop - sz(26), 0, SCREEN_HEIGHT);
    scrim.addColorStop(0, 'rgba(255,255,255,0)');
    scrim.addColorStop(0.35, 'rgba(255,255,255,0.28)');
    scrim.addColorStop(1, 'rgba(255,255,255,0.55)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, stackTop - sz(26), SCREEN_WIDTH, SCREEN_HEIGHT - stackTop + sz(26));

    // 主角站在按钮上方
    const heroCx = heroRect.x + heroRect.w / 2;
    const heroFeet = heroRect.y + heroRect.h;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    if (ctx.ellipse) {
      ctx.ellipse(heroCx, heroFeet - sz(2), heroRect.w * 0.5, sz(7), 0, 0, Math.PI * 2);
    } else {
      ctx.arc(heroCx, heroFeet - sz(2), heroRect.w * 0.42, 0, Math.PI * 2);
    }
    ctx.fillStyle = '#2c5f3a';
    ctx.fill();
    ctx.restore();

    if (
      !drawImageContain(
        ctx,
        this.heroImages[0],
        heroRect.x,
        heroRect.y,
        heroRect.w,
        heroRect.h,
        0
      )
    ) {
      drawText(ctx, '你', heroRect.x + heroRect.w / 2, heroRect.y + heroRect.h / 2, {
        font: font(sz(14), '900'),
        color: 'rgba(255,255,255,0.75)',
        align: 'center',
        baseline: 'middle',
      });
    }

    // 右上角圆形功能按钮
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

    // 左上角梗币
    drawCoinPill(
      ctx,
      this.coinPill.x,
      this.coinPill.y,
      this.coinPill.w,
      this.coinPill.h,
      this.profile.coins
    );

    // 标题
    const titleSize = compact ? sz(34) : sz(38);
    const titleY = this.layoutInfo.titleY;
    ctx.save();
    ctx.font = font(titleSize, '900');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(23, 74, 140, 0.28)';
    ctx.shadowBlur = sz(10);
    ctx.shadowOffsetY = sz(3);
    ctx.strokeStyle = '#1f5fae';
    ctx.lineWidth = sz(5);
    ctx.strokeText('梗世界', x, titleY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('梗世界', x, titleY);
    ctx.restore();

    // 副标题胶囊
    const openLevels = LEVELS.filter((level) => level.available);
    const allCleared =
      openLevels.length > 0 &&
      openLevels.every((level) => this.app.databus.isLevelCompleted(level.id));
    const subText = allCleared ? '全部通关 · 梗王归位' : '接住梗，活下去';
    ctx.font = font(sz(12), '800');
    const subW = ctx.measureText(subText).width + sz(22);
    const subH = sz(24);
    const subY = titleY + titleSize + sz(10);
    ctx.save();
    ctx.shadowColor = 'rgba(31, 94, 174, 0.22)';
    ctx.shadowBlur = sz(8);
    ctx.shadowOffsetY = sz(3);
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    const r = subH / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, subY);
    ctx.arcTo(x + subW, subY, x + subW, subY + subH, r);
    ctx.arcTo(x + subW, subY + subH, x, subY + subH, r);
    ctx.arcTo(x, subY + subH, x, subY, r);
    ctx.arcTo(x, subY, x + subW, subY, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    drawText(ctx, subText, x + subW / 2, subY + subH / 2 + 0.5, {
      font: font(sz(12), '800'),
      color: '#2b6fd6',
      align: 'center',
      baseline: 'middle',
    });

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
