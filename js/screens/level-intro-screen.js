import { getLevelById, getLevelIntro, isLevelUnlocked } from '../data/levels.js';
import {
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  ctx as measureCtx,
  sz,
} from '../render.js';
import {
  drawImageContain,
  drawImageCover,
  loadImage,
} from '../services/assets.js';
import Button from '../ui/button.js';
import { clamp, drawText, font, wrapText } from '../ui/draw.js';
import { renderLives } from '../ui/life-bar.js';
import { renderStoryBubble } from '../ui/story-bubble.js';
import BaseScreen from './base-screen.js';

/**
 * 剧情章节开场：透明对手站在当前章节背景中，通过新对话气泡与主角逐句对白。
 */
export default class LevelIntroScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.level = null;
    this.opponentName = '';
    this.steps = [];
    this.stepIndex = 0;
    this.backgroundImage = null;
    this.opponentImage = null;
    this.heroImages = [];
    this.buttons = [];
    this.opponentSeen = false;
    this.heroSeen = false;
    this.opponentRevealAt = 0;
    this.heroRevealAt = 0;
  }

  onEnter() {
    const levelId = this.params && this.params.levelId ? this.params.levelId : 1;
    this.level = getLevelById(levelId);

    if (!this.level || !this.level.available) {
      this.app.toast.show('该关卡暂未开放');
      this.app.goHome();
      return;
    }
    if (!isLevelUnlocked(this.level.id, this.app.databus.getStoryProgress())) {
      this.app.toast.show(this.level.unlockHint || '请先完成上一章');
      this.app.goHome();
      return;
    }

    this.opponentName = this.level.speaker || '？？？';
    this.steps = getLevelIntro(this.level.id);
    this.stepIndex = 0;
    this.opponentSeen = false;
    this.heroSeen = false;
    this.opponentRevealAt = 0;
    this.heroRevealAt = 0;
    this.updateReveal();
    this.backgroundImage = loadImage(this.level.background);
    this.opponentImage = loadImage(this.level.portrait);
    this.heroImages = (this.level.heroes || []).map((src) => loadImage(src));
    this.layout();
    this.app.analytics.track('level_intro_enter', {
      levelId: this.level.id,
      replay: !!(this.params && this.params.replay),
    });
  }

  layout() {
    const x = this.contentX + sz(18);
    const w = this.contentW - sz(36);
    const top = this.top + sz(12);
    const compact = SCREEN_HEIGHT < 700;

    this.backButton = new Button({
      x,
      y: top,
      w: sz(32),
      h: sz(32),
      label: '',
      icon: '←',
      iconName: 'back',
      style: 'dark',
      fontSize: sz(15),
      onClick: () => this.app.goHome(),
    });

    const bubbleH = compact ? sz(160) : sz(180);
    const bubbleX = x;
    const bubbleY = this.bottom - bubbleH - sz(22);
    const bubbleW = w;
    const bubbleRect = { x: bubbleX, y: bubbleY, w: bubbleW, h: bubbleH };

    const heroH = compact ? sz(220) : sz(260);
    const heroW = heroH * 0.5;
    const heroX = x + sz(4);
    const heroY = bubbleY + sz(26) - heroH;
    const heroRect = { x: heroX, y: heroY, w: heroW, h: heroH };

    const opponentH = compact ? sz(240) : sz(300);
    const portraitAspect = this.level && this.level.portraitAspect ? this.level.portraitAspect : 337 / 820;
    const opponentW = opponentH * portraitAspect;
    const opponentX = x + w - opponentW - sz(6);
    const opponentY = bubbleY + sz(28) - opponentH;
    const opponentRect = {
      x: opponentX,
      y: opponentY,
      w: opponentW,
      h: opponentH,
    };

    const buttonY = bubbleY + bubbleH - sz(46);
    const gap = sz(8);
    const skipW = (bubbleW - sz(32) - gap) * 0.3;
    const nextW = bubbleW - sz(32) - gap - skipW;

    this.skipButton = new Button({
      x: bubbleX + sz(16),
      y: buttonY,
      w: skipW,
      h: sz(38),
      label: '跳过',
      style: 'ghost',
      fontSize: sz(12),
      onClick: () => this.startLevel(),
    });
    this.nextButton = new Button({
      x: bubbleX + sz(16) + skipW + gap,
      y: buttonY,
      w: nextW,
      h: sz(38),
      label: this.stepIndex >= this.steps.length - 1 ? '接受挑战' : '继续',
      style: 'primary',
      fontSize: sz(14),
      onClick: () => this.nextStep(),
    });

    this.buttons = [this.backButton, this.skipButton, this.nextButton];
    this.layoutInfo = {
      x,
      w,
      top,
      compact,
      bubbleRect,
      heroRect,
      opponentRect,
      buttonY,
    };
  }

  updateReveal() {
    const step = this.steps[this.stepIndex] || {};
    if (step.speaker === this.opponentName && !this.opponentSeen) {
      this.opponentSeen = true;
      this.opponentRevealAt = Date.now();
    }
    if ((step.speaker === '你' || step.speaker === '主角') && !this.heroSeen) {
      this.heroSeen = true;
      this.heroRevealAt = Date.now();
    }
  }

  nextStep() {
    this.app.audio.play('click');
    if (this.stepIndex >= this.steps.length - 1) {
      this.startLevel();
      return;
    }
    this.stepIndex += 1;
    this.updateReveal();
    this.nextButton.setLabel(
      this.stepIndex >= this.steps.length - 1 ? '接受挑战' : '继续'
    );
  }

  startLevel() {
    if (!this.level || !this.level.available) return;
    this.app.databus.markStoryStarted();
    this.app.analytics.track('level_intro_finish', {
      levelId: this.level.id,
      skipped: this.stepIndex < this.steps.length - 1,
    });
    this.app.startLevelRun(this.level.id);
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx) {
    const theme = this.theme;
    const { x, w, top, bubbleRect, heroRect, opponentRect, buttonY } = this.layoutInfo;
    const step = this.steps[this.stepIndex] || { speaker: '旁白', text: '' };

    if (!drawImageCover(ctx, this.backgroundImage, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0)) {
      const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
      gradient.addColorStop(0, theme.bgTop);
      gradient.addColorStop(1, theme.bgBottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }
    const overlay = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    overlay.addColorStop(0, 'rgba(14, 38, 86, 0.16)');
    overlay.addColorStop(0.5, 'rgba(12, 30, 70, 0.2)');
    overlay.addColorStop(1, 'rgba(8, 18, 46, 0.58)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const topScrim = ctx.createLinearGradient(0, 0, 0, top + sz(92));
    topScrim.addColorStop(0, 'rgba(10, 26, 62, 0.58)');
    topScrim.addColorStop(1, 'rgba(10, 26, 62, 0)');
    ctx.fillStyle = topScrim;
    ctx.fillRect(0, 0, SCREEN_WIDTH, top + sz(92));

    this.backButton.render(ctx, theme);
    drawText(ctx, this.level ? this.level.title : '剧情章节', x + sz(44), top + sz(2), {
      font: font(sz(17), '800'),
      color: '#ffffff',
      baseline: 'top',
    });
    drawText(ctx, this.level ? this.level.subtitle : '', x + sz(44), top + sz(26), {
      font: font(sz(10), '500'),
      color: 'rgba(255,255,255,0.7)',
      baseline: 'top',
    });

    const now = Date.now();

    // 对手只在第一次拥有对白时登场，并做淡入上浮
    if (this.opponentSeen) {
      const alpha = clamp((now - this.opponentRevealAt) / 280, 0, 1);
      if (alpha > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const rise = (1 - alpha) * sz(12);
        if (
          !drawImageContain(
            ctx,
            this.opponentImage,
            opponentRect.x,
            opponentRect.y + rise,
            opponentRect.w,
            opponentRect.h,
            0
          )
        ) {
          drawText(
            ctx,
            this.opponentName,
            opponentRect.x + opponentRect.w / 2,
            opponentRect.y + opponentRect.h / 2,
            {
              font: font(sz(12), '600'),
              color: 'rgba(255,255,255,0.45)',
              align: 'center',
              baseline: 'middle',
            }
          );
        }
        ctx.restore();
      }
    }

    if (this.heroSeen) {
      const alpha = clamp((now - this.heroRevealAt) / 280, 0, 1);
      if (alpha > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const rise = (1 - alpha) * sz(12);
        const heroImage = this.heroImages[0];
        if (
          !drawImageContain(
            ctx,
            heroImage,
            heroRect.x,
            heroRect.y + rise,
            heroRect.w,
            heroRect.h,
            0
          )
        ) {
          drawText(ctx, '你', heroRect.x + heroRect.w / 2, heroRect.y + heroRect.h / 2, {
            font: font(sz(12), '600'),
            color: 'rgba(255,255,255,0.45)',
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
          heroRect.y - sz(8) + rise,
          3,
          3,
          theme,
          heartSize,
          heartGap
        );
        ctx.restore();
      }
    }

    // 新对话气泡：尖角指向当前说话者
    const content = renderStoryBubble(
      ctx,
      theme,
      bubbleRect.x,
      bubbleRect.y,
      bubbleRect.w,
      bubbleRect.h,
      {
        speaker: step.speaker,
        showTail: step.speaker !== '旁白',
        showName: true,
        tailSide: step.speaker === '你' ? 'left' : 'right',
      }
    );

    const textTop = content.y + sz(2);
    const textW = content.w;
    const textAvailableH = buttonY - textTop - sz(8);
    const fontSize = sz(12.5);
    const lineHeight = fontSize * 1.5;
    const maxLines = Math.max(1, Math.floor(textAvailableH / lineHeight));
    measureCtx.font = font(fontSize, '500');
    const lines = wrapText(measureCtx, step.text, textW, maxLines);
    ctx.font = font(fontSize, '500');
    ctx.fillStyle = '#1f4e9c';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => {
      ctx.fillText(line, content.x, textTop + index * lineHeight);
    });

    drawText(
      ctx,
      `${this.stepIndex + 1} / ${this.steps.length}`,
      bubbleRect.x + bubbleRect.w - sz(16),
      bubbleRect.y + sz(18),
      {
        font: font(sz(9), '600'),
        color: '#7fa3c6',
        align: 'right',
        baseline: 'middle',
      }
    );

    this.skipButton.render(ctx, theme);
    this.nextButton.render(ctx, theme);
  }

  onTouchStart(x, y) {
    return this.handleButtonTouchStart(x, y);
  }

  onTouchEnd(x, y) {
    return this.handleButtonTouchEnd(x, y);
  }
}
