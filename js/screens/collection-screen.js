import { QUESTIONS } from '../data/questions.js';
import { DIFFICULTY_LABEL, TYPE_LABEL } from '../core/types.js';
import { SCREEN_HEIGHT, SAFE_BOTTOM, sz } from '../render.js';
import Button from '../ui/button.js';
import Modal from '../ui/modal.js';
import ScrollView from '../ui/scroll-view.js';
import { drawIcon, drawIconTile } from '../ui/icons.js';
import { drawGlassPanel, drawPill, drawText, font, hexToRgba, wrapText, drawCheckMark } from '../ui/draw.js';
import BaseScreen from './base-screen.js';

const TYPE_ICON_NAME = {
  image: 'image',
  dialogue: 'chat',
  truefalse: 'quiz',
  meaning: 'book',
};

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'unlocked', label: '已解锁' },
  { key: 'locked', label: '未解锁' },
];

export default class CollectionScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.filter = 'all';
    this.filteredQuestions = [];
    this.itemRects = [];
    this.scroll = null;
    this.detailModal = null;
    this.tabs = [];
    this.buttons = [];
  }

  onEnter() {
    this.filter = 'all';
    this.scroll = new ScrollView();
    this.detailModal = new Modal();
    this.layout();
    this.app.analytics.track('collection_view', {
      count: this.app.databus.getCollectionCount(),
    });
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
    const tabW = (w - gap * 2) / 3;
    this.tabs = FILTERS.map((item, index) => {
      return new Button({
        x: x + index * (tabW + gap),
        y: tabsY,
        w: tabW,
        h: sz(34),
        label: item.label,
        style: item.key === this.filter ? 'candyBlue' : 'secondary',
        fontSize: sz(13),
        onClick: () => this.switchFilter(item.key),
      });
    });

    const scrollY = tabsY + sz(34) + sz(12);
    const scrollH = SCREEN_HEIGHT - SAFE_BOTTOM - scrollY - sz(12);
    this.scroll.setRect(x, scrollY, w, Math.max(sz(120), scrollH));

    const cardGap = sz(9);
    const cardW = (w - cardGap) / 2;
    const cardH = sz(92);
    this.cardMetrics = { cardW, cardH, cardGap };
    this.layoutInfo = { x, w, top, tabsY, scrollY, scrollH };
    this.buttons = [this.backButton, ...this.tabs];
    this.applyFilter();
  }

  switchFilter(filter) {
    if (this.filter === filter) return;
    this.filter = filter;
    this.tabs.forEach((button, index) => {
      button.style = FILTERS[index].key === filter ? 'candyBlue' : 'secondary';
    });
    this.applyFilter();
  }

  applyFilter() {
    const databus = this.app.databus;
    this.filteredQuestions = QUESTIONS.filter((question) => {
      const unlocked = databus.isUnlocked(question.id);
      if (this.filter === 'unlocked') return unlocked;
      if (this.filter === 'locked') return !unlocked;
      return true;
    });

    const { cardW, cardH, cardGap } = this.cardMetrics;
    this.itemRects = this.filteredQuestions.map((question, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      return {
        question,
        x: col * (cardW + cardGap),
        y: row * (cardH + cardGap),
        w: cardW,
        h: cardH,
      };
    });

    const rows = Math.ceil(this.filteredQuestions.length / 2);
    this.scroll.setContentHeight(rows * (cardH + cardGap));
    this.scroll.reset();
  }

  update(dt) {
    this.time += dt;
    if (this.scroll) this.scroll.update(dt);
  }

  render(ctx) {
    const theme = this.theme;
    const { x, w, top, scrollY } = this.layoutInfo;
    const collectionCount = this.app.databus.getCollectionCount();

    this.backButton.render(ctx, theme);
    drawText(ctx, '梗图鉴', x + sz(46), top + sz(7), {
      font: font(sz(22), '800'),
      color: theme.text,
      baseline: 'top',
    });
    drawText(ctx, `${collectionCount}/150 已解锁 · 答对即收录`, x + sz(46), top + sz(34), {
      font: font(sz(10), '500'),
      color: theme.muted,
      baseline: 'top',
    });

    for (const tab of this.tabs) tab.render(ctx, theme);

    if (this.filteredQuestions.length === 0) {
      drawText(
        ctx,
        this.filter === 'unlocked' ? '还没有解锁任何梗档案' : '没有符合条件的条目',
        x + w / 2,
        scrollY + sz(80),
        {
          font: font(sz(13), '500'),
          color: theme.muted,
          align: 'center',
          baseline: 'middle',
        }
      );
    }

    this.scroll.render(ctx, (drawCtx, offset) => {
      this.itemRects.forEach((item) => {
        const screenY = scrollY + item.y - offset;
        if (screenY + item.h < scrollY || screenY > SCREEN_HEIGHT) return;
        this.renderCard(drawCtx, theme, item, this.layoutInfo.x + item.x, screenY);
      });
    });

    this.detailModal.render(ctx, theme);
  }

  renderCard(ctx, theme, item, screenX, screenY) {
    const question = item.question;
    const unlocked = this.app.databus.isUnlocked(question.id);
    const { w, h } = item;

    drawGlassPanel(ctx, screenX, screenY, w, h, sz(13), theme, unlocked ? 0.9 : 0.6, unlocked ? 0.8 : 0.4);

    const rarityColor =
      question.difficulty === 3 ? '#f2544b' : question.difficulty === 2 ? '#ff9f2e' : '#3a97f7';
    drawPill(ctx, DIFFICULTY_LABEL[question.difficulty], screenX + sz(10), screenY + sz(14), {
      fontStr: font(sz(8), '800'),
      color: '#ffffff',
      bg: rarityColor,
      border: 'rgba(255,255,255,0.5)',
      height: sz(15),
      padX: sz(6),
    });

    if (unlocked) {
      drawIcon(
        ctx,
        TYPE_ICON_NAME[question.type] || 'quiz',
        screenX + w - sz(18),
        screenY + sz(17),
        sz(20)
      );
      ctx.font = font(sz(12), '600');
      const lines = wrapText(ctx, question.stem, w - sz(20), 2);
      ctx.fillStyle = theme.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      lines.forEach((line, index) => {
        ctx.fillText(line, screenX + sz(10), screenY + sz(34) + index * sz(16));
      });
      drawText(ctx, TYPE_LABEL[question.type], screenX + sz(10), screenY + h - sz(12), {
        font: font(sz(9), '500'),
        color: theme.muted,
        baseline: 'bottom',
      });
      drawCheckMark(ctx, screenX + w - sz(18), screenY + h - sz(15), sz(12), theme.success, sz(2.4));
    } else {
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawIconTile(
        ctx,
        TYPE_ICON_NAME[question.type] || 'quiz',
        screenX + w / 2 - sz(24),
        screenY + sz(22),
        sz(48),
        sz(48),
        { iconScale: 0.56, radius: sz(16) }
      );
      ctx.restore();
      drawIconTile(ctx, 'lock', screenX + w / 2 - sz(11), screenY + sz(48), sz(26), sz(26), {
        iconScale: 0.6,
        radius: sz(9),
      });
      drawText(ctx, '答对后解锁', screenX + w / 2, screenY + h - sz(14), {
        font: font(sz(9), '600'),
        color: hexToRgba(theme.muted, 0.9),
        align: 'center',
        baseline: 'middle',
      });
    }
  }

  openDetail(question) {
    const unlocked = this.app.databus.isUnlocked(question.id);
    if (unlocked) {
      const answer = question.options.find((option) => option.id === question.answerKey);
      this.detailModal.show({
        title: '梗档案',
        message: `${question.stem}\n\n正确答案：${answer ? answer.text : ''}\n\n解释：${question.explanation}\n\n出处：${question.source}\n\n标签：${question.tags.join(' / ')}`,
        buttons: [{ label: '关闭', style: 'primary' }],
      });
    } else {
      this.detailModal.show({
        title: '尚未解锁',
        message: `答对这道题即可解锁档案。\n\n类型：${TYPE_LABEL[question.type]}\n难度：${DIFFICULTY_LABEL[question.difficulty]}`,
        buttons: [{ label: '关闭', style: 'primary' }],
      });
    }
  }

  handleItemTap(x, y) {
    if (!this.scroll.contains(x, y)) return;
    const contentX = x - this.scroll.x;
    const contentY = y - this.scroll.y + this.scroll.offset;
    const found = this.itemRects.find(
      (item) =>
        contentX >= item.x &&
        contentX <= item.x + item.w &&
        contentY >= item.y &&
        contentY <= item.y + item.h
    );
    if (found) this.openDetail(found.question);
  }

  onTouchStart(x, y) {
    if (this.detailModal.isVisible()) {
      this.detailModal.onTouchStart(x, y);
      return true;
    }
    if (this.handleButtonTouchStart(x, y)) {
      this.pressedControl = 'button';
      return true;
    }
    if (this.scroll.onTouchStart(x, y)) {
      this.pressedControl = 'scroll';
      return true;
    }
    return false;
  }

  onTouchMove(x, y) {
    if (this.pressedControl === 'scroll') return this.scroll.onTouchMove(x, y);
    return false;
  }

  onTouchEnd(x, y) {
    if (this.detailModal.isVisible()) {
      this.detailModal.onTouchEnd(x, y);
      return true;
    }
    if (this.pressedControl === 'button') {
      this.pressedControl = null;
      return this.handleButtonTouchEnd(x, y);
    }
    if (this.pressedControl === 'scroll') {
      this.pressedControl = null;
      this.scroll.onTouchEnd(x, y);
      if (!this.scroll.moved) this.handleItemTap(x, y);
      return true;
    }
    return false;
  }
}
