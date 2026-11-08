import {
  LEVELS,
  STORY_ASSETS,
  getLevelStatus,
  isLevelUnlocked,
} from '../data/levels.js';
import {
  CONTENT_X,
  CONTENT_WIDTH,
  SAFE_TOP,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  sz,
} from '../render.js';
import { drawImageContain, drawImagePlaceholder, loadImage } from '../services/assets.js';
import Button from '../ui/button.js';
import Modal from '../ui/modal.js';
import {
  drawGlassPanel,
  drawPill,
  drawText,
  fillCircle,
  fillRoundRect,
  font,
  hexToRgba,
  strokeCircle,
  strokeRoundRect,
} from '../ui/draw.js';
import BaseScreen from './base-screen.js';

/**
 * 关卡地图。第一至第三章已开放，按前置章节顺序解锁；第四章保留节点。
 */
export default class MapScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.mapImage = null;
    this.modal = new Modal();
    this.rows = [];
    this.nodes = [];
    this.buttons = [];
    this.pressedTarget = null;
  }

  onEnter() {
    this.mapImage = loadImage(STORY_ASSETS.map);
    this.layout();
    this.app.analytics.track('map_view', {
      completedLevel1: this.app.databus.isLevelCompleted(1),
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
      label: '←',
      style: 'dark',
      fontSize: sz(15),
      onClick: () => this.app.goHome(),
    });

    const mapY = top + sz(58);
    // 与 map.jpg 保持同一宽高比，保证节点坐标与图片对齐
    const mapH = (w * 683) / 1024;
    const mapW = w;

    const rowH = compact ? sz(40) : sz(46);
    const rowGap = sz(5);
    const rowsY = mapY + mapH + sz(12);

    this.rows = LEVELS.map((level, index) => {
      return {
        level,
        x,
        y: rowsY + index * (rowH + rowGap),
        w,
        h: rowH,
      };
    });

    this.nodes = LEVELS.map((level) => {
      const nx = x + level.mapNode.x * mapW;
      const ny = mapY + level.mapNode.y * mapH;
      return {
        level,
        x: nx - sz(22),
        y: ny - sz(22),
        w: sz(44),
        h: sz(44),
        cx: nx,
        cy: ny,
      };
    });

    this.buttons = [this.backButton];
    this.layoutInfo = { x, w, top, compact, mapX: x, mapY, mapW, mapH, rowH, rowGap, rowsY };
  }

  statusFor(level) {
    return getLevelStatus(level.id, this.app.databus.getStoryProgress());
  }

  isUnlocked(level) {
    return isLevelUnlocked(level.id, this.app.databus.getStoryProgress());
  }

  openLevel(level) {
    if (!level) return;
    const completed = this.app.databus.isLevelCompleted(level.id);

    if (!level.available) {
      this.modal.show({
        title: level.title,
        message: '这一章尚未开放。先完成前面的关卡吧。',
        buttons: [{ label: '知道了', style: 'primary' }],
      });
      return;
    }

    if (!this.isUnlocked(level)) {
      this.modal.show({
        title: level.title,
        message: level.unlockHint || '请先完成上一章。',
        buttons: [{ label: '知道了', style: 'primary' }],
      });
      return;
    }

    this.modal.show({
      title: level.title,
      message: completed
        ? `你已通过${level.title}。可以重玩本章，或继续后面的剧情。`
        : level.description || `${level.title}的考验正在等你。`,
      buttons: [
        {
          label: completed ? '重玩本章' : '开始本章',
          style: 'primary',
          onClick: () => this.startLevel(level.id),
        },
        { label: '关闭', style: 'ghost' },
      ],
    });
  }

  startLevel(levelId) {
    this.modal.hide();
    this.app.showScreen('levelIntro', { levelId, replay: true });
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx) {
    const theme = this.theme;
    const { x, w, top, mapX, mapY, mapW, mapH } = this.layoutInfo;
    const openLevels = LEVELS.filter((level) => level.available);
    const completedLevels = openLevels.filter((level) =>
      this.app.databus.isLevelCompleted(level.id)
    );
    const nextLevel = openLevels.find(
      (level) => !this.app.databus.isLevelCompleted(level.id) && this.isUnlocked(level)
    );
    const subtitle =
      completedLevels.length === 0
        ? '从宿舍出发，选择关卡'
        : nextLevel
          ? `${completedLevels.map((level) => level.chapter).join('、')}已完成 · 下一站：${nextLevel.name}`
          : '第一至第三章已完成';

    const bg = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    bg.addColorStop(0, theme.bgTop);
    bg.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    this.backButton.render(ctx, theme);
    drawText(ctx, '校园地图', x + sz(44), top + sz(2), {
      font: font(sz(20), '800'),
      color: theme.text,
      baseline: 'top',
    });
    drawText(ctx, subtitle, x + sz(44), top + sz(28), {
      font: font(sz(10), '500'),
      color: theme.muted,
      baseline: 'top',
    });

    // 地图卡片
    fillRoundRect(
      ctx,
      mapX + sz(2),
      mapY + sz(4),
      mapW,
      mapH,
      sz(16),
      'rgba(0,0,0,0.3)'
    );
    fillRoundRect(ctx, mapX, mapY, mapW, mapH, sz(16), hexToRgba(theme.panel, 0.9));
    if (!drawImageContain(ctx, this.mapImage, mapX, mapY, mapW, mapH, sz(16))) {
      drawImagePlaceholder(ctx, mapX, mapY, mapW, mapH, sz(16), theme, '校园地图加载中…');
    }

    // 节点状态（不可见点击区域在 onTouchStart 处理）
    this.nodes.forEach((node) => {
      const level = node.level;
      const completed = this.app.databus.isLevelCompleted(level.id);
      const unlocked = this.isUnlocked(level);
      const ringColor = completed
        ? theme.success
        : unlocked
          ? theme.accent
          : 'rgba(255,255,255,0.42)';
      ctx.save();
      ctx.globalAlpha = completed || unlocked ? 0.95 : 0.55;
      strokeCircle(ctx, node.cx, node.cy, sz(17), ringColor, sz(2));
      fillCircle(
        ctx,
        node.cx + sz(12),
        node.cy - sz(14),
        sz(8),
        completed ? theme.success : unlocked ? theme.accent : 'rgba(30,32,36,0.9)'
      );
      if (completed) {
        drawText(ctx, '✓', node.cx + sz(12), node.cy - sz(14), {
          font: font(sz(9), '800'),
          color: '#ffffff',
          align: 'center',
          baseline: 'middle',
        });
      } else if (!unlocked) {
        drawText(ctx, '🔒', node.cx + sz(12), node.cy - sz(14), {
          font: font(sz(8), '400'),
          color: '#ffffff',
          align: 'center',
          baseline: 'middle',
        });
      }
      ctx.restore();
    });

    // 关卡行
    this.rows.forEach((row) => {
      const level = row.level;
      const completed = this.app.databus.isLevelCompleted(level.id);
      const unlocked = this.isUnlocked(level);
      const isNext = unlocked && !completed;
      const border = completed ? theme.success : isNext ? theme.accent : theme.line;
      drawGlassPanel(
        ctx,
        row.x,
        row.y,
        row.w,
        row.h,
        sz(11),
        theme,
        unlocked ? 0.88 : 0.62,
        unlocked ? 0.8 : 0.45
      );
      strokeRoundRect(
        ctx,
        row.x,
        row.y,
        row.w,
        row.h,
        sz(11),
        hexToRgba(border, unlocked ? 0.9 : 0.35),
        1
      );

      drawText(ctx, level.chapter, row.x + sz(14), row.y + row.h / 2 - sz(6), {
        font: font(sz(9), '600'),
        color: completed ? theme.success : theme.muted,
        baseline: 'middle',
      });
      drawText(ctx, level.name, row.x + sz(14), row.y + row.h / 2 + sz(8), {
        font: font(sz(14), '800'),
        color: unlocked ? theme.text : hexToRgba(theme.text, 0.55),
        baseline: 'middle',
      });

      const status = this.statusFor(level);
      const statusColor = completed
        ? theme.success
        : unlocked
          ? theme.accent
          : theme.muted;
      drawPill(
        ctx,
        status,
        row.x + row.w - sz(28),
        row.y + row.h / 2,
        {
          fontStr: font(sz(9), '700'),
          color: statusColor,
          bg: hexToRgba(statusColor, 0.14),
          height: sz(18),
          padX: sz(7),
          align: 'right',
        }
      );

      drawText(ctx, '›', row.x + row.w - sz(11), row.y + row.h / 2 - 1, {
        font: font(sz(17), '400'),
        color: hexToRgba(theme.muted, 0.8),
        align: 'right',
        baseline: 'middle',
      });
    });

    drawText(
      ctx,
      completedLevels.length >= openLevels.length
        ? '第一至第三章已完成；第四章「图书馆」敬请期待'
        : '第一至第三章已开放；完成前一章后解锁下一章',
      x + w / 2,
      this.bottom - sz(12),
      {
        font: font(sz(9), '400'),
        color: hexToRgba(theme.muted, 0.65),
        align: 'center',
        baseline: 'middle',
      }
    );

    this.modal.render(ctx, theme);
  }

  findTarget(x, y) {
    // 节点优先
    for (const node of this.nodes) {
      if (x >= node.x && x <= node.x + node.w && y >= node.y && y <= node.y + node.h) {
        return { type: 'level', level: node.level };
      }
    }
    for (const row of this.rows) {
      if (x >= row.x && x <= row.x + row.w && y >= row.y && y <= row.y + row.h) {
        return { type: 'level', level: row.level };
      }
    }
    return null;
  }

  onTouchStart(x, y) {
    if (this.modal.isVisible()) {
      this.modal.onTouchStart(x, y);
      return true;
    }
    if (this.backButton.onTouchStart(x, y)) {
      this.pressedButton = this.backButton;
      return true;
    }
    const target = this.findTarget(x, y);
    if (target) {
      this.pressedTarget = target;
      return true;
    }
    return false;
  }

  onTouchEnd(x, y) {
    if (this.modal.isVisible()) {
      this.modal.onTouchEnd(x, y);
      return true;
    }
    if (this.pressedButton) {
      const button = this.pressedButton;
      this.pressedButton = null;
      button.onTouchEnd(x, y);
      return true;
    }
    if (this.pressedTarget) {
      const target = this.pressedTarget;
      this.pressedTarget = null;
      const next = this.findTarget(x, y);
      if (next && next.level.id === target.level.id) this.openLevel(target.level);
      return true;
    }
    return false;
  }
}
