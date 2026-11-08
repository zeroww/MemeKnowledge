import { SKINS } from '../data/skins.js';
import { RIGHT_SAFE_X, SCREEN_HEIGHT, SAFE_BOTTOM, sz } from '../render.js';
import Button from '../ui/button.js';
import Modal from '../ui/modal.js';
import {
  drawCoin,
  drawPill,
  drawText,
  fillCircle,
  fillRoundRect,
  font,
  hexToRgba,
  strokeRoundRect,
} from '../ui/draw.js';
import BaseScreen from './base-screen.js';

export default class ShopScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.cards = [];
    this.buttons = [];
    this.modal = null;
  }

  onEnter() {
    this.modal = new Modal();
    this.layout();
    this.app.analytics.track('shop_view', {
      coins: this.profile.coins,
      owned: this.profile.ownedSkins.length,
    });
  }

  layout() {
    const x = this.contentX + sz(18);
    const w = this.contentW - sz(36);
    const top = this.top + sz(14);
    const gridY = top + sz(86);
    const gap = sz(10);
    const cardW = (w - gap) / 2;
    const cardH = sz(128);

    this.backButton = new Button({
      x,
      y: top,
      w: sz(34),
      h: sz(34),
      label: '←',
      style: 'dark',
      fontSize: sz(16),
      onClick: () => this.app.goHome(),
    });

    this.cards = SKINS.map((skin, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      return {
        skin,
        x: x + col * (cardW + gap),
        y: gridY + row * (cardH + gap),
        w: cardW,
        h: cardH,
      };
    });

    this.buttons = [this.backButton];
    this.layoutInfo = { x, w, top, gridY, cardW, cardH, gap };
  }

  openSkinModal(skin) {
    const owned = this.profile.ownedSkins.includes(skin.id);
    const equipped = this.profile.equippedSkin === skin.id;
    const priceText = skin.price === 0 ? '免费' : `${skin.price} 梗币`;
    const buttons = [];

    if (equipped) {
      buttons.push({ label: '使用中', style: 'primary', disabled: true });
    } else if (owned) {
      buttons.push({
        label: '装备',
        style: 'primary',
        onClick: () => this.equipSkin(skin),
      });
    } else {
      buttons.push({
        label: `购买并装备 · ${priceText}`,
        style: 'gold',
        disabled: this.profile.coins < skin.price,
        onClick: () => this.buySkin(skin),
      });
    }
    buttons.push({ label: '关闭', style: 'ghost' });

    this.modal.show({
      title: `${skin.emoji} ${skin.name}`,
      message: `${skin.desc}\n\n价格：${priceText}\n\n皮肤只改变背景与强调色，不提供答题优势。`,
      buttons,
    });
  }

  buySkin(skin) {
    const result = this.app.databus.buySkin(skin, skin.price);
    if (!result.ok) {
      this.app.toast.show('梗币不足');
      return;
    }
    this.app.audio.play('coin');
    this.app.toast.show(`已解锁 ${skin.name}`);
    this.app.analytics.track('shop_buy', { skinId: skin.id, price: skin.price });
    this.layout();
  }

  equipSkin(skin) {
    if (!this.app.databus.equipSkin(skin.id)) {
      this.app.toast.show('尚未拥有这款皮肤');
      return;
    }
    this.app.audio.play('click');
    this.app.toast.show(`已装备 ${skin.name}`);
    this.app.analytics.track('skin_equip', { skinId: skin.id });
    this.layout();
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx) {
    const theme = this.theme;
    const { x, w, top, gridY } = this.layoutInfo;

    this.backButton.render(ctx, theme);
    drawText(ctx, '商店', x + sz(46), top + sz(7), {
      font: font(sz(22), '800'),
      color: theme.text,
      baseline: 'top',
    });
    drawText(ctx, '皮肤只改变视觉，不影响答题', x + sz(46), top + sz(34), {
      font: font(sz(10), '500'),
      color: theme.muted,
      baseline: 'top',
    });

    const coinW = sz(84);
    const coinX = RIGHT_SAFE_X - coinW;
    fillRoundRect(ctx, coinX, top + sz(2), coinW, sz(28), sz(14), hexToRgba(theme.panel, 0.88));
    drawCoin(ctx, coinX + sz(15), top + sz(16), sz(9), theme.accent);
    drawText(ctx, String(this.profile.coins), coinX + sz(30), top + sz(16), {
      font: font(sz(14), '800'),
      color: theme.text,
      baseline: 'middle',
    });

    drawText(ctx, '主题皮肤', x, gridY - sz(14), {
      font: font(sz(12), '700'),
      color: theme.muted,
      baseline: 'middle',
    });

    this.cards.forEach((card) => this.renderSkinCard(ctx, card));

    drawText(
      ctx,
      '梗币只能通过游玩获得 · 无内购 · 皮肤无数值加成',
      this.contentX + this.contentW / 2,
      this.bottom - sz(12),
      {
        font: font(sz(9), '400'),
        color: hexToRgba(theme.muted, 0.7),
        align: 'center',
        baseline: 'middle',
      }
    );

    this.modal.render(ctx, theme);
  }

  renderSkinCard(ctx, card) {
    const { skin } = card;
    const skinTheme = skin.theme;
    const owned = this.profile.ownedSkins.includes(skin.id);
    const equipped = this.profile.equippedSkin === skin.id;

    const gradient = ctx.createLinearGradient(card.x, card.y, card.x + card.w, card.y + card.h);
    gradient.addColorStop(0, skinTheme.bgTop);
    gradient.addColorStop(1, skinTheme.bgBottom);
    fillRoundRect(ctx, card.x, card.y, card.w, card.h, sz(14), gradient);
    strokeRoundRect(
      ctx,
      card.x,
      card.y,
      card.w,
      card.h,
      sz(14),
      equipped ? skinTheme.accent : hexToRgba(skinTheme.line, 0.9),
      equipped ? 2 : 1
    );

    fillCircle(ctx, card.x + card.w - sz(18), card.y + sz(18), sz(24), hexToRgba(skinTheme.primary, 0.18));
    fillCircle(ctx, card.x + sz(16), card.y + card.h - sz(18), sz(18), hexToRgba(skinTheme.accent, 0.12));

    drawText(ctx, skin.emoji, card.x + card.w / 2, card.y + sz(38), {
      font: font(sz(30), '400'),
      color: '#ffffff',
      align: 'center',
      baseline: 'middle',
    });
    drawText(ctx, skin.name, card.x + sz(12), card.y + sz(68), {
      font: font(sz(15), '800'),
      color: skinTheme.text,
      baseline: 'middle',
    });
    drawText(ctx, skin.desc, card.x + sz(12), card.y + sz(88), {
      font: font(sz(9), '400'),
      color: hexToRgba(skinTheme.muted, 0.95),
      baseline: 'middle',
    });

    if (equipped) {
      drawPill(ctx, '使用中', card.x + sz(12), card.y + card.h - sz(16), {
        fontStr: font(sz(9), '700'),
        color: skinTheme.accent,
        bg: hexToRgba(skinTheme.accent, 0.16),
        height: sz(17),
        padX: sz(7),
      });
    } else if (owned) {
      drawPill(ctx, '已拥有', card.x + sz(12), card.y + card.h - sz(16), {
        fontStr: font(sz(9), '700'),
        color: skinTheme.success,
        bg: hexToRgba(skinTheme.success, 0.14),
        height: sz(17),
        padX: sz(7),
      });
    } else {
      drawCoin(ctx, card.x + card.w - sz(34), card.y + card.h - sz(16), sz(8), skinTheme.accent);
      drawText(ctx, String(skin.price), card.x + card.w - sz(12), card.y + card.h - sz(16), {
        font: font(sz(12), '800'),
        color: skinTheme.text,
        align: 'right',
        baseline: 'middle',
      });
    }
  }

  findCard(x, y) {
    return this.cards.find(
      (card) => x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h
    );
  }

  onTouchStart(x, y) {
    if (this.modal.isVisible()) {
      this.modal.onTouchStart(x, y);
      return true;
    }
    if (this.handleButtonTouchStart(x, y)) {
      this.pressedControl = 'button';
      return true;
    }
    const card = this.findCard(x, y);
    if (card) {
      this.pressedCard = card;
      this.pressedControl = 'card';
      return true;
    }
    return false;
  }

  onTouchEnd(x, y) {
    if (this.modal.isVisible()) {
      this.modal.onTouchEnd(x, y);
      return true;
    }
    if (this.pressedControl === 'button') {
      this.pressedControl = null;
      return this.handleButtonTouchEnd(x, y);
    }
    if (this.pressedControl === 'card' && this.pressedCard) {
      const card = this.pressedCard;
      this.pressedCard = null;
      this.pressedControl = null;
      if (this.findCard(x, y) === card) this.openSkinModal(card.skin);
      return true;
    }
    return false;
  }
}
