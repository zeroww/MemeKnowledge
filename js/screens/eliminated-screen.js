import { SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import { drawImageContain, loadImage } from '../services/assets.js';
import Button from '../ui/button.js';
import {
  clamp,
  drawCandyPanel,
  drawPill,
  drawText,
  fillRoundRect,
  font,
  hexToRgba,
} from '../ui/draw.js';
import BaseScreen from './base-screen.js';

const REASON_TEXT = {
  revive_exhausted: '复活次数已用完，你被淘汰了',
  declined: '你选择不再复活，本局结束',
  default: '生命值耗尽，你被淘汰了',
};

/**
 * 淘汰画面：死亡且不再复活后进入，展示本局成绩，再前往结算。
 */
export default class EliminatedScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.run = null;
    this.level = null;
    this.reason = 'default';
    this.heroImage = null;
    this.enterAt = 0;
    this.layoutInfo = null;
    this.button = null;
  }

  onEnter() {
    this.run = this.params.run;
    this.level = this.params.level || null;
    this.reason = this.params.reason || 'default';
    this.heroImage = loadImage('assets/story/role1-hp1.png');
    this.enterAt = Date.now();
    this.layout();
    this.app.analytics.track('eliminated_view', {
      runId: this.run ? this.run.id : '',
      levelId: this.level ? this.level.id : null,
      score: this.run ? this.run.score : 0,
      correctCount: this.run ? this.run.correctCount : 0,
      questionIndex: this.run ? this.run.index : 0,
      reason: this.reason,
    });
  }

  layout() {
    const compact = SCREEN_HEIGHT < 640;
    const x = this.contentX + sz(18);
    const w = this.contentW - sz(36);
    const top = this.top;
    const cx = SCREEN_WIDTH / 2;

    const titleSize = compact ? sz(44) : sz(54);
    const titleY = top + sz(compact ? 30 : 40);
    const subY = titleY + titleSize + sz(compact ? 4 : 6);
    const statsH = sz(compact ? 64 : 80);
    const statsY = this.bottom - sz(compact ? 132 : 155);
    const heroSpaceTop = subY + sz(compact ? 14 : 18);
    const heroSpaceBottom = statsY - sz(10);
    const desiredHeroH = SCREEN_HEIGHT * (compact ? 0.4 : 0.42);
    const heroH = Math.min(desiredHeroH, heroSpaceBottom - heroSpaceTop);
    const heroY = heroSpaceTop + Math.max(0, (heroSpaceBottom - heroSpaceTop - heroH) / 2);
    const heroW = heroH * (274 / 640);

    this.button = new Button({
      x,
      y: this.bottom - sz(52),
      w,
      h: sz(46),
      label: '查看结算',
      style: 'danger',
      fontSize: sz(16),
      onClick: () => this.app.finishRun(this.run),
    });

    this.layoutInfo = {
      x,
      w,
      top,
      cx,
      compact,
      titleSize,
      titleY,
      subY,
      statsY,
      statsH,
      heroRect: {
        x: cx - heroW / 2,
        y: heroY,
        w: heroW,
        h: heroH,
      },
      buttonRect: { x, y: this.bottom - sz(52), w, h: sz(46) },
    };
    this.buttons = [this.button];
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx) {
    const theme = this.theme;
    const { x, w, compact, cx, titleSize, titleY, subY, statsY, statsH, heroRect } =
      this.layoutInfo;
    const enter = clamp((Date.now() - this.enterAt) / 420, 0, 1);
    const score = this.run ? this.run.score : 0;
    const correct = this.run ? this.run.correctCount : 0;
    const total = this.run ? this.run.totalQuestions : 10;
    const progress = this.run ? Math.min(this.run.index + 1, total) : 0;

    // 红色淘汰氛围
    const vignette = ctx.createRadialGradient(
      cx,
      SCREEN_HEIGHT * 0.34,
      sz(20),
      cx,
      SCREEN_HEIGHT * 0.34,
      SCREEN_HEIGHT * 0.72
    );
    vignette.addColorStop(0, 'rgba(150, 18, 28, 0.3)');
    vignette.addColorStop(0.55, 'rgba(70, 8, 14, 0.16)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 扫描线
    ctx.save();
    ctx.fillStyle = 'rgba(255, 90, 90, 0.04)';
    for (let lineY = 0; lineY < SCREEN_HEIGHT; lineY += 4) {
      ctx.fillRect(0, lineY, SCREEN_WIDTH, 1);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = enter;
    ctx.translate(0, (1 - enter) * sz(10));

    // 关卡 / 模式标签
    const tag = this.level ? this.level.title : '经典模式';
    drawPill(ctx, tag, cx, titleY - sz(compact ? 16 : 20), {
      fontStr: font(sz(9), '800'),
      color: '#ffd0d0',
      bg: 'rgba(120, 20, 28, 0.42)',
      border: 'rgba(255, 138, 138, 0.5)',
      height: sz(20),
      padX: sz(10),
      align: 'center',
    });

    // 淘汰标题
    drawText(ctx, 'ELIMINATED', cx, titleY - sz(1), {
      font: font(sz(8), '800'),
      color: 'rgba(255, 120, 120, 0.7)',
      align: 'center',
      baseline: 'bottom',
    });
    ctx.save();
    ctx.font = font(titleSize, '900');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 60, 70, 0.55)';
    ctx.shadowBlur = sz(18);
    ctx.strokeStyle = 'rgba(70, 8, 14, 0.9)';
    ctx.lineWidth = sz(5);
    ctx.strokeText('淘 汰', cx, titleY + sz(6));
    ctx.fillStyle = '#fff1f1';
    ctx.fillText('淘 汰', cx, titleY + sz(6));
    ctx.restore();

    drawText(ctx, REASON_TEXT[this.reason] || REASON_TEXT.default, cx, subY, {
      font: font(sz(11), '600'),
      color: 'rgba(255, 205, 205, 0.8)',
      align: 'center',
      baseline: 'top',
    });

    // 背景大字
    ctx.save();
    ctx.translate(cx, heroRect.y + heroRect.h * 0.5);
    ctx.rotate(-0.12);
    ctx.font = font(sz(compact ? 58 : 72), '900');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 80, 90, 0.08)';
    ctx.fillText('OUT', 0, 0);
    ctx.restore();

    // 主角（1 格血状态）
    const glow = ctx.createRadialGradient(
      cx,
      heroRect.y + heroRect.h * 0.55,
      sz(10),
      cx,
      heroRect.y + heroRect.h * 0.55,
      heroRect.w * 1.8
    );
    glow.addColorStop(0, 'rgba(255, 70, 80, 0.24)');
    glow.addColorStop(1, 'rgba(255, 70, 80, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - heroRect.w * 2, heroRect.y, heroRect.w * 4, heroRect.h + sz(20));

    ctx.save();
    ctx.globalAlpha *= 0.88;
    if (
      !drawImageContain(
        ctx,
        this.heroImage,
        heroRect.x,
        heroRect.y,
        heroRect.w,
        heroRect.h,
        0
      )
    ) {
      drawText(ctx, '你', cx, heroRect.y + heroRect.h / 2, {
        font: font(sz(24), '900'),
        color: 'rgba(255, 220, 220, 0.8)',
        align: 'center',
        baseline: 'middle',
      });
    }
    ctx.restore();

    // 成绩卡
    drawCandyPanel(ctx, x, statsY, w, statsH, sz(16), {
      fill: '#0a1626',
      fillBottom: '#0e2138',
      border: 'rgba(255, 92, 92, 0.45)',
      shadowColor: 'rgba(255, 60, 70, 0.22)',
      shadowBlur: sz(18),
      shadowOffsetY: sz(7),
      glossAlpha: 0.12,
      lineWidth: 1.5,
    });

    const colW = w / 3;
    const cols = [
      { label: '本局得分', value: String(score), color: '#ffcf6a' },
      { label: '答对题数', value: `${correct}/${total}`, color: '#e8f7ff' },
      { label: '答题进度', value: `${progress}/${total}`, color: '#9ff4ff' },
    ];
    cols.forEach((col, index) => {
      const colX = x + colW * (index + 0.5);
      drawText(ctx, col.label, colX, statsY + sz(16), {
        font: font(sz(9), '600'),
        color: 'rgba(160, 195, 220, 0.8)',
        align: 'center',
        baseline: 'middle',
      });
      drawText(ctx, col.value, colX, statsY + statsH * 0.62, {
        font: font(sz(index === 0 ? 26 : 20), '900'),
        color: col.color,
        align: 'center',
        baseline: 'middle',
      });
      if (index > 0) {
        fillRoundRect(
          ctx,
          x + colW * index,
          statsY + sz(16),
          1,
          statsH - sz(32),
          0.5,
          hexToRgba(theme.line || '#1e4a6e', 0.65)
        );
      }
    });

    // 底部提示与按钮
    if (!compact) {
      drawText(ctx, '本局梗币与图鉴奖励将在结算页发放', cx, statsY + statsH + sz(9), {
        font: font(sz(9), '500'),
        color: 'rgba(140, 175, 200, 0.75)',
        align: 'center',
        baseline: 'top',
      });
    }
    this.button.render(ctx, theme);
    ctx.restore();
  }

  onTouchStart(x, y) {
    return this.handleButtonTouchStart(x, y);
  }

  onTouchEnd(x, y) {
    return this.handleButtonTouchEnd(x, y);
  }
}
