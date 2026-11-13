import { RUN_PHASE } from '../core/types.js';
import { getLevelById } from '../data/levels.js';
import {
  CONTENT_X,
  CONTENT_WIDTH,
  RIGHT_SAFE_X,
  SAFE_BOTTOM,
  SAFE_TOP,
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
import {
  clamp,
  drawCandyPanel,
  drawCheckMark,
  drawCrossMark,
  drawPill,
  drawText,
  drawTopSheen,
  fillRoundRect,
  fillRoundRectGradient,
  font,
  hexToRgba,
  strokeRoundRect,
  wrapText,
} from '../ui/draw.js';
import { renderLives } from '../ui/life-bar.js';
import { renderStoryBubble } from '../ui/story-bubble.js';
import GameScreen from './game-screen.js';

/**
 * 剧情关卡答题界面：当前章节背景 + 透明对手提问像 + 新对话气泡 + 2×2 选项。
 * 复用 GameScreen 的规则与弹窗逻辑。
 */
export default class StoryGameScreen extends GameScreen {
  constructor(app) {
    super(app);
    this.level = null;
    this.opponentName = '';
    this.backgroundImage = null;
    this.opponentAskImage = null;
    this.heroImages = [];
  }

  onEnter() {
    const run = this.params && this.params.run;
    this.level = getLevelById(run && run.levelId ? run.levelId : 1) || getLevelById(1);
    this.opponentName = (this.level && this.level.speaker) || '？？？';
    this.backgroundImage = loadImage(this.level && this.level.background);
    this.opponentAskImage = loadImage(
      this.level && (this.level.ask || this.level.portrait)
    );
    this.heroImages = ((this.level && this.level.heroes) || []).map((src) => loadImage(src));
    super.onEnter();
  }

  rebuildLayout() {
    if (!this.run) return;
    const question = this.run.currentQuestion;
    if (!question) return;

    const x = CONTENT_X + sz(12);
    const w = CONTENT_WIDTH - sz(24);
    const top = SAFE_TOP + sz(10);
    const compact = SCREEN_HEIGHT < 700;
    const hudBottom = top + (compact ? sz(76) : sz(78));
    const actionH = compact ? sz(38) : sz(42);
    const actionTop = SCREEN_HEIGHT - SAFE_BOTTOM - sz(12) - actionH;

    const optionCount = Math.max(1, this.optionCards.length);
    const cols = optionCount <= 2 ? optionCount : 2;
    const rows = Math.ceil(optionCount / cols);
    const gap = sz(6);
    const colGap = sz(7);
    const cardH = compact
      ? rows > 1
        ? sz(44)
        : sz(52)
      : rows > 1
        ? sz(52)
        : sz(58);
    const cardW = (w - colGap * (cols - 1)) / cols;
    const optionsTotal = rows * cardH + (rows - 1) * gap;
    const optionsBottom = actionTop - sz(8);
    const optionsTop = optionsBottom - optionsTotal;

    this.optionRects = [];
    this.optionCards.forEach((card, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cardX = x + col * (cardW + colGap);
      const cardY = optionsTop + row * (cardH + gap);
      card.setRect(cardX, cardY, cardW, cardH);
      this.optionRects.push({ x: cardX, y: cardY, w: cardW, h: cardH, card });
    });

    const textFontSize = clamp((w - sz(32)) * 0.05, sz(11.5), sz(14.5));
    const textLineHeight = textFontSize * 1.42;
    measureCtx.font = font(textFontSize, '700');
    const stemLines = wrapText(measureCtx, question.stem, w - sz(34), 4);
    const visualH = question.type === 'image' && question.visual ? sz(42) : 0;
    const neededH = sz(50) + stemLines.length * textLineHeight + visualH + sz(8);
    const bubbleH = clamp(
      neededH,
      compact ? sz(112) : sz(120),
      compact ? sz(160) : sz(180)
    );
    const bubbleY = optionsTop - bubbleH - sz(8);
    const bubbleRect = { x, y: bubbleY, w, h: bubbleH };

    const hudReserve = top + sz(76);
    const heroMaxH = compact ? sz(230) : sz(240);
    const heroH = Math.max(
      sz(160),
      Math.min(heroMaxH, bubbleY + sz(28) - hudReserve)
    );
    const heroW = heroH * 0.5;
    const heroRect = {
      x: x + sz(4),
      y: bubbleY + sz(28) - heroH,
      w: heroW,
      h: heroH,
    };

    const opponentMaxH = compact ? sz(180) : sz(210);
    const opponentH = Math.max(
      sz(120),
      Math.min(opponentMaxH, bubbleY + sz(28) - hudReserve)
    );
    const askAspect = this.level && this.level.askAspect ? this.level.askAspect : 639 / 598;
    const opponentW = opponentH * askAspect;
    const opponentRect = {
      x: x + w - opponentW - sz(4),
      y: bubbleY + sz(28) - opponentH,
      w: opponentW,
      h: opponentH,
    };

    this.timerRing.setCenter(RIGHT_SAFE_X - sz(24), top + sz(30), sz(21));
    this.pauseButton.setRect(x - sz(1), top - sz(2), sz(30), sz(30));

    this.layout = {
      x,
      w,
      top,
      compact,
      hudBottom,
      actionTop,
      actionH,
      optionsTop,
      optionsBottom,
      cardH,
      cardW,
      cols,
      rows,
      gap,
      colGap,
      bubbleRect,
      heroRect,
      opponentRect,
      question,
      level: this.level,
    };

    this.updateActionButtons();
  }

  getHeroFrame(lives = this.run ? this.run.lives : 3) {
    const hp = clamp(lives, 0, 3);
    return hp >= 3 ? 0 : hp === 2 ? 1 : 2;
  }

  render(ctx) {
    if (!this.run || !this.layout) return;
    const theme = this.theme;
    const now = Date.now();
    const shakePower = now < this.shakeUntil ? (this.shakeUntil - now) / 320 : 0;

    if (
      !drawImageCover(ctx, this.backgroundImage, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0)
    ) {
      const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
      gradient.addColorStop(0, theme.bgTop);
      gradient.addColorStop(1, theme.bgBottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    const overlay = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    overlay.addColorStop(0, 'rgba(14, 38, 86, 0.14)');
    overlay.addColorStop(0.5, 'rgba(12, 30, 70, 0.18)');
    overlay.addColorStop(1, 'rgba(8, 18, 46, 0.56)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.save();
    if (shakePower > 0) {
      ctx.translate(
        Math.sin(this.time * 90) * sz(4) * shakePower,
        Math.cos(this.time * 70) * sz(3) * shakePower
      );
    }

    this.renderStoryHud(ctx, theme);
    this.renderCharacters(ctx, theme);
    this.renderQuestionBubble(ctx, theme);
    for (const card of this.optionCards) card.render(ctx, theme);
    this.renderActionRow(ctx, theme);
    this.renderFloaters(ctx);
    ctx.restore();

    if (now < this.flashUntil) {
      const alpha = clamp((this.flashUntil - now) / 260, 0, 1) * 0.26;
      ctx.fillStyle = hexToRgba(theme.danger, alpha);
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    this.renderFeedback(ctx, theme);
    this.modal.render(ctx, theme);
  }

  renderStoryHud(ctx, theme) {
    const { x, w, top } = this.layout;
    const hud = {
      x: x - sz(4),
      y: top - sz(5),
      w: w + sz(8),
      h: sz(80),
    };

    drawCandyPanel(ctx, hud.x, hud.y, hud.w, hud.h, sz(22), {
      headerHeight: sz(30),
      headerColor: 'rgba(12, 32, 52, 0.95)',
      border: 'rgba(94, 231, 255, 0.45)',
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowBlur: sz(18),
      shadowOffsetY: sz(6),
      glossAlpha: 0.14,
    });

    this.pauseButton.render(ctx, theme);

    drawText(
      ctx,
      this.level ? this.level.title : '剧情关卡',
      x + sz(44),
      top + sz(8),
      {
        font: font(sz(13), '800'),
        color: theme.text,
        baseline: 'top',
      }
    );
    drawText(
      ctx,
      `第 ${this.run.index + 1} / ${this.run.totalQuestions} 题`,
      x + sz(44),
      top + sz(38),
      {
        font: font(sz(10), '700'),
        color: '#9ff4ff',
        baseline: 'top',
      }
    );

    const barX = x + sz(44);
    const barY = top + sz(54);
    const barW = Math.min(sz(90), w * 0.32);
    fillRoundRect(ctx, barX, barY, barW, sz(5), sz(2.5), '#12304a');
    fillRoundRect(
      ctx,
      barX,
      barY,
      Math.max(sz(5), (barW * (this.run.index + 1)) / this.run.totalQuestions),
      sz(5),
      sz(2.5),
      '#5ee7ff'
    );
    renderLives(ctx, x + sz(44), top + sz(66), this.run.lives, 3, theme, sz(11), sz(4));

    this.timerRing.render(ctx, theme, this.remainingSec, this.totalSec, this.time);

    const scoreW = sz(70);
    const scoreX = RIGHT_SAFE_X - scoreW;
    const scoreY = top + sz(54);
    fillRoundRect(
      ctx,
      scoreX,
      scoreY,
      scoreW,
      sz(18),
      sz(9),
      'rgba(255, 207, 106, 0.14)'
    );
    drawText(ctx, `得分 ${this.run.score}`, scoreX + scoreW / 2, scoreY + sz(9), {
      font: font(sz(10.5), '800'),
      color: '#ffcf6a',
      align: 'center',
      baseline: 'middle',
    });
  }

  renderCharacters(ctx, theme) {
    const { heroRect, opponentRect } = this.layout;

    // 当前章节对手：透明提问半身像
    if (
      !drawImageContain(
        ctx,
        this.opponentAskImage,
        opponentRect.x,
        opponentRect.y,
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

    // 主角：放大后的透明立绘，按血量切换
    const lives = clamp(this.run.lives, 0, 3);
    const frame = this.getHeroFrame(lives);
    const heroImage = this.heroImages[frame];
    if (
      !drawImageContain(ctx, heroImage, heroRect.x, heroRect.y, heroRect.w, heroRect.h, 0)
    ) {
      drawText(ctx, '你', heroRect.x + heroRect.w / 2, heroRect.y + heroRect.h / 2, {
        font: font(sz(12), '600'),
        color: 'rgba(255,255,255,0.45)',
        align: 'center',
        baseline: 'middle',
      });
    }

    const heartSize = sz(7);
    const heartGap = sz(2);
    const heartsW = 3 * (heartSize * 1.45 + heartGap);
    renderLives(
      ctx,
      heroRect.x + Math.max(0, (heroRect.w - heartsW) / 2),
      heroRect.y - sz(8),
      lives,
      3,
      theme,
      heartSize,
      heartGap
    );
  }

  renderQuestionBubble(ctx, theme) {
    const { bubbleRect, question } = this.layout;
    const content = renderStoryBubble(
      ctx,
      theme,
      bubbleRect.x,
      bubbleRect.y,
      bubbleRect.w,
      bubbleRect.h,
      { speaker: this.opponentName, showTail: true, showName: true }
    );

    if (question.isBoss) {
      drawPill(ctx, 'BOSS · 双倍', bubbleRect.x + sz(64), bubbleRect.y + sz(18), {
        fontStr: font(sz(8), '800'),
        color: '#ffffff',
        bg: hexToRgba(theme.danger, 0.92),
        height: sz(17),
        padX: sz(7),
      });
    }

    const fontSize = clamp(content.w * 0.05, sz(11.5), sz(14.5));
    const lineHeight = fontSize * 1.42;
    const isImage = question.type === 'image' && question.visual;
    const visualH = isImage ? Math.min(sz(42), content.h * 0.4) : 0;
    const hasHint = !!this.hintText;
    const hintH = hasHint ? Math.min(sz(40), content.h * 0.36) : 0;
    const maxLines = Math.max(
      1,
      Math.floor((content.h - visualH - hintH - sz(4)) / lineHeight)
    );

    measureCtx.font = font(fontSize, '700');
    const lines = wrapText(measureCtx, question.stem, content.w, maxLines);
    ctx.font = font(fontSize, '700');
    ctx.fillStyle = theme.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => {
      ctx.fillText(line, content.x, content.y + index * lineHeight);
    });

    if (hasHint) {
      const hintY = content.y + content.h - hintH;
      fillRoundRect(ctx, content.x, hintY, content.w, hintH, sz(6), 'rgba(43, 33, 10, 0.94)');
      ctx.fillStyle = '#ffcf6a';
      ctx.fillRect(content.x, hintY + sz(4), sz(2), hintH - sz(8));
      drawText(ctx, '提示', content.x + sz(7), hintY + sz(4), {
        font: font(sz(8), '800'),
        color: '#ffe08a',
        baseline: 'top',
      });
      const hintFont = Math.max(8, fontSize * 0.8);
      measureCtx.font = font(hintFont, '500');
      const hintLines = wrapText(
        measureCtx,
        this.hintText,
        content.w - sz(14),
        Math.max(1, Math.floor((hintH - sz(14)) / (hintFont * 1.3)))
      );
      ctx.font = font(hintFont, '500');
      ctx.fillStyle = 'rgba(243, 226, 176, 0.88)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      hintLines.forEach((line, index) => {
        ctx.fillText(line, content.x + sz(7), hintY + sz(14) + index * hintFont * 1.3);
      });
    }

    if (isImage) {
      const visualY = content.y + content.h - visualH;
      fillRoundRect(ctx, content.x, visualY, content.w, visualH, sz(6), 'rgba(10, 26, 42, 0.9)');
      const visual = question.visual;
      const emojiSize = Math.min(sz(24), content.w * 0.08);
      const emojis = visual.emojis && visual.emojis.length ? visual.emojis : ['🎭'];
      ctx.font = font(emojiSize, '400');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      emojis.forEach((emoji, index) => {
        const px =
          emojis.length === 1
            ? content.x + content.w / 2
            : content.x + sz(12) + ((content.w - sz(24)) / Math.max(1, emojis.length - 1)) * index;
        ctx.fillText(emoji, px, visualY + visualH * 0.4);
      });
      if (visual.caption) {
        ctx.font = font(Math.max(8, fontSize * 0.7), '500');
        ctx.fillStyle = '#9ff4ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(visual.caption, content.x + content.w / 2, visualY + visualH * 0.76);
      }
    }
  }

  /**
   * 剧情反馈面板覆盖在问题气泡上，选项颜色保持可见。
   */
  renderFeedback(ctx, theme) {
    if (!this.feedback) return;
    const { bubbleRect } = this.layout;
    const isCorrect = this.feedback.correct;
    const title = isCorrect ? '答对了！' : this.feedback.timeout ? '超时了' : '答错了';
    const color = isCorrect ? theme.success : theme.danger;

    drawCandyPanel(ctx, bubbleRect.x, bubbleRect.y, bubbleRect.w, bubbleRect.h, sz(20), {
      fill: '#0a1626',
      fillBottom: '#0e2138',
      border: color,
      borderAlpha: 0.6,
      shadowColor: hexToRgba(color, 0.3),
      shadowBlur: sz(18),
      shadowOffsetY: sz(7),
      glossAlpha: 0.12,
      lineWidth: 2,
    });

    fillRoundRect(
      ctx,
      bubbleRect.x + sz(12),
      bubbleRect.y + sz(12),
      sz(28),
      sz(28),
      sz(10),
      color
    );
    if (isCorrect) {
      drawCheckMark(ctx, bubbleRect.x + sz(26), bubbleRect.y + sz(26), sz(15), '#ffffff', sz(3));
    } else {
      drawCrossMark(ctx, bubbleRect.x + sz(26), bubbleRect.y + sz(26), sz(14), '#ffffff', sz(3));
    }

    drawText(ctx, title, bubbleRect.x + sz(48), bubbleRect.y + sz(14), {
      font: font(sz(17), '900'),
      color,
      baseline: 'top',
    });
    if (isCorrect) {
      drawText(ctx, `+${this.feedback.gained || 0} 分`, bubbleRect.x + bubbleRect.w - sz(14), bubbleRect.y + sz(16), {
        font: font(sz(13), '900'),
        color: '#ffcf6a',
        align: 'right',
        baseline: 'top',
      });
    } else {
      drawText(ctx, `正确答案：${this.feedback.answerText}`, bubbleRect.x + sz(14), bubbleRect.y + sz(44), {
        font: font(sz(10.5), '800'),
        color: theme.text,
        baseline: 'top',
      });
    }

    measureCtx.font = font(sz(10.5), '500');
    const explanationLines = wrapText(
      measureCtx,
      this.feedback.explanation || '',
      bubbleRect.w - sz(28),
      2
    );
    ctx.font = font(sz(10.5), '500');
    ctx.fillStyle = 'rgba(190, 225, 245, 0.72)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const explanationTop = isCorrect ? bubbleRect.y + sz(44) : bubbleRect.y + sz(64);
    explanationLines.forEach((line, index) => {
      ctx.fillText(line, bubbleRect.x + sz(14), explanationTop + index * sz(15));
    });

    const footer =
      this.run.status === RUN_PHASE.DEAD
        ? '生命值耗尽'
        : this.run.status === RUN_PHASE.FINISHED
          ? '点击进入结算'
          : '点击继续';
    drawPill(
      ctx,
      footer,
      bubbleRect.x + bubbleRect.w - sz(12),
      bubbleRect.y + bubbleRect.h - sz(15),
      {
        fontStr: font(sz(9.5), '800'),
        color,
        bg: 'rgba(4, 10, 18, 0.5)',
        border: hexToRgba(color, 0.6),
        height: sz(21),
        padX: sz(9),
        align: 'right',
      }
    );
  }
}
