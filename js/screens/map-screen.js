import {
  LEVELS,
  STORY_ASSETS,
  getLevelStatus,
  isLevelUnlocked,
} from '../data/levels.js';
import {
  RIGHT_SAFE_X,
  sz,
} from '../render.js';
import { drawImageContain, drawImagePlaceholder, loadImage } from '../services/assets.js';
import { drawIcon, drawIconTile } from '../ui/icons.js';
import Button from '../ui/button.js';
import Modal from '../ui/modal.js';
import {
  drawCandyPanel,
  drawPill,
  drawText,
  fillCircle,
  fillRoundRect,
  font,
  strokeCircle,
  strokeRoundRect,
} from '../ui/draw.js';
import BaseScreen from './base-screen.js';

const NODE_ICONS = { 1: 'bed', 2: 'bowl', 3: 'school', 4: 'library' };

/**
 * 关卡地图。第一至第四章已开放，按前置章节顺序解锁。
 */
export default class MapScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.mapImage = null;
    this.modal = new Modal();
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

    const mapY = top + sz(58);
    // 与 map.jpg 保持同一宽高比，保证节点坐标与图片对齐
    const mapH = (w * 683) / 1024;
    const mapW = w;

    this.nodes = LEVELS.map((level) => {
      const nx = x + level.mapNode.x * mapW;
      const ny = mapY + level.mapNode.y * mapH;
      return {
        level,
        x: nx - sz(24),
        y: ny - sz(24),
        w: sz(48),
        h: sz(48),
        cx: nx,
        cy: ny,
      };
    });

    // 底部建筑快捷入口
    const navGap = sz(9);
    const navW = (w - navGap * 3) / 4;
    const navY = mapY + mapH + sz(34);
    this.shortcuts = LEVELS.map((level, index) => ({
      level,
      x: x + index * (navW + navGap),
      y: navY,
      w: navW,
      h: sz(74),
    }));

    this.progressCard = {
      x,
      y: navY + sz(86),
      w,
      h: sz(104),
    };

    this.buttons = [this.backButton];
    this.layoutInfo = { x, w, top, mapX: x, mapY, mapW, mapH, navY };
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
        icon: 'lock',
        buttons: [{ label: '知道了', style: 'primary' }],
      });
      return;
    }

    if (!this.isUnlocked(level)) {
      this.modal.show({
        title: level.title,
        message: level.unlockHint || '请先完成上一章。',
        icon: 'lock',
        buttons: [{ label: '知道了', style: 'primary' }],
      });
      return;
    }

    this.modal.show({
      title: level.title,
      message: completed
        ? `你已通过${level.title}。可以重玩本章，或继续后面的剧情。`
        : level.description || `${level.title}的考验正在等你。`,
      icon: completed ? 'check' : NODE_ICONS[level.id] || 'play',
      buttons: [
        {
          label: completed ? '重玩本章' : '开始本章',
          icon: '▶',
          iconName: 'play',
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
          : '第一至第四章已完成';

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

    drawPill(
      ctx,
      `${completedLevels.length}/${openLevels.length} 章`,
      RIGHT_SAFE_X,
      top + sz(16),
      {
        fontStr: font(sz(9), '800'),
        color: '#2b6fd6',
        bg: 'rgba(255,255,255,0.94)',
        border: '#cfeafb',
        height: sz(22),
        padX: sz(10),
        align: 'right',
      }
    );

    // 地图卡片
    drawCandyPanel(ctx, mapX, mapY, mapW, mapH, sz(22), {
      fill: '#ffffff',
      fillBottom: '#eaf9ff',
      border: '#bfe4f8',
      shadowColor: 'rgba(58, 122, 180, 0.24)',
      shadowBlur: sz(24),
      shadowOffsetY: sz(9),
      glossAlpha: 0.35,
    });
    if (!drawImageContain(ctx, this.mapImage, mapX, mapY, mapW, mapH, sz(22))) {
      drawImagePlaceholder(ctx, mapX, mapY, mapW, mapH, sz(22), theme, '校园地图加载中…');
    }
    strokeRoundRect(
      ctx,
      mapX,
      mapY,
      mapW,
      mapH,
      sz(22),
      'rgba(255,255,255,0.9)',
      sz(1.6)
    );

    // 建筑节点
    this.nodes.forEach((node) => {
      const level = node.level;
      const completed = this.app.databus.isLevelCompleted(level.id);
      const unlocked = this.isUnlocked(level) && level.available;
      const ringColor = completed ? '#35b84a' : unlocked ? '#3a97f7' : '#9fb3c6';
      const icon = NODE_ICONS[level.id] || 'school';

      ctx.save();
      ctx.globalAlpha = level.available ? 1 : 0.72;
      ctx.save();
      ctx.shadowColor = 'rgba(30, 80, 130, 0.35)';
      ctx.shadowBlur = sz(10);
      ctx.shadowOffsetY = sz(3);
      fillCircle(ctx, node.cx, node.cy, sz(22), 'rgba(255,255,255,0.96)');
      ctx.restore();
      strokeCircle(ctx, node.cx, node.cy, sz(22), ringColor, sz(3));
      drawIcon(ctx, icon, node.cx, node.cy + sz(1), sz(30), {
        alpha: unlocked || completed ? 1 : 0.7,
      });

      if (completed) {
        drawIcon(ctx, 'check', node.cx + sz(15), node.cy - sz(15), sz(17));
      } else if (!unlocked) {
        drawIcon(ctx, 'lock', node.cx + sz(15), node.cy - sz(15), sz(16));
      }
      ctx.restore();
    });

    // 底部建筑快捷入口
    (this.shortcuts || []).forEach((item) => {
      const completed = this.app.databus.isLevelCompleted(item.level.id);
      const unlocked = this.isUnlocked(item.level) && item.level.available;
      const size = sz(50);
      const tileX = item.x + (item.w - size) / 2;
      ctx.save();
      ctx.globalAlpha = unlocked ? 1 : 0.55;
      drawIconTile(ctx, NODE_ICONS[item.level.id] || 'school', tileX, item.y, size, size, {
        radius: sz(15),
        iconScale: 0.6,
      });
      if (completed) {
        drawIcon(ctx, 'check', tileX + size - sz(2), item.y + sz(2), sz(16));
      } else if (!unlocked) {
        drawIcon(ctx, 'lock', tileX + size - sz(2), item.y + sz(2), sz(15));
      }
      drawText(ctx, item.level.mapLabel, item.x + item.w / 2, item.y + size + sz(12), {
        font: font(sz(10.5), '800'),
        color: unlocked ? theme.text : theme.muted,
        align: 'center',
        baseline: 'middle',
      });
      ctx.restore();
    });

    // 剧情进度
    const card = this.progressCard;
    if (card) {
      drawCandyPanel(ctx, card.x, card.y, card.w, card.h, sz(18), {
        fill: '#ffffff',
        fillBottom: '#f2fbff',
        border: '#cfeafb',
        shadowColor: 'rgba(58, 122, 180, 0.16)',
        shadowBlur: sz(14),
        shadowOffsetY: sz(5),
        glossAlpha: 0.5,
      });
      drawText(ctx, '剧情进度', card.x + sz(14), card.y + sz(12), {
        font: font(sz(11), '800'),
        color: theme.text,
        baseline: 'top',
      });
      drawText(
        ctx,
        completedLevels.length === openLevels.length
          ? '全部章节已完成，梗王归位！'
          : `依次通过${openLevels.length}章，才能找到回去的路`,
        card.x + card.w - sz(14),
        card.y + sz(13),
        {
          font: font(sz(9), '500'),
          color: theme.muted,
          align: 'right',
          baseline: 'top',
        }
      );

      const segGap = sz(6);
      const segW = (card.w - sz(24) - segGap * (openLevels.length - 1)) / openLevels.length;
      openLevels.forEach((level, index) => {
        const completed = this.app.databus.isLevelCompleted(level.id);
        const unlocked = this.isUnlocked(level);
        const sx = card.x + sz(12) + index * (segW + segGap);
        const sy = card.y + sz(36);
        const segH = Math.min(sz(34), card.h - sz(50));
        const fill = completed
          ? 'rgba(53, 184, 74, 0.16)'
          : unlocked
            ? 'rgba(58, 151, 247, 0.14)'
            : 'rgba(159, 179, 198, 0.16)';
        fillRoundRect(ctx, sx, sy, segW, segH, sz(10), fill);
        drawIcon(
          ctx,
          completed ? 'check' : unlocked ? 'play' : 'lock',
          sx + sz(13),
          sy + segH / 2,
          sz(16)
        );
        drawText(ctx, level.chapter, sx + sz(24), sy + segH / 2 - sz(5), {
          font: font(sz(9), '800'),
          color: completed ? '#2a8f3a' : unlocked ? '#2b6fd6' : theme.muted,
          baseline: 'middle',
        });
        drawText(ctx, completed ? '已通关' : unlocked ? '可挑战' : '未解锁', sx + sz(24), sy + segH / 2 + sz(7), {
          font: font(sz(7.5), '500'),
          color: completed ? '#2a8f3a' : unlocked ? '#2b6fd6' : theme.muted,
          baseline: 'middle',
        });
      });
    }

    this.modal.render(ctx, theme);

    drawText(
      ctx,
      '点击地图建筑或下方图标进入关卡',
      this.contentX + this.contentW / 2,
      this.bottom - sz(16),
      {
        font: font(sz(9.5), '500'),
        color: 'rgba(127, 163, 198, 0.9)',
        align: 'center',
        baseline: 'middle',
      }
    );
  }

  findTarget(x, y) {
    // 节点优先
    for (const node of this.nodes) {
      if (x >= node.x && x <= node.x + node.w && y >= node.y && y <= node.y + node.h) {
        return { type: 'level', level: node.level };
      }
    }
    for (const item of this.shortcuts || []) {
      if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h + sz(22)) {
        return { type: 'level', level: item.level };
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
