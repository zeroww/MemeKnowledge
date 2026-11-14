import { APP_VERSION } from '../core/types.js';
import { sz } from '../render.js';
import Button from '../ui/button.js';
import { drawIcon } from '../ui/icons.js';
import Modal from '../ui/modal.js';
import {
  drawGlassPanel,
  drawText,
  fillCircle,
  fillRoundRect,
  font,
  hexToRgba,
} from '../ui/draw.js';
import BaseScreen from './base-screen.js';

export default class SettingsScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.rows = [];
    this.buttons = [];
    this.modal = null;
    this.pressedRow = null;
  }

  onEnter() {
    this.modal = new Modal();
    this.buildRows();
    this.app.analytics.track('settings_view');
  }

  buildRows() {
    const x = this.contentX + sz(18);
    const w = this.contentW - sz(36);
    const top = this.top + sz(14);
    const startY = top + sz(78);
    const rowH = sz(46);
    const gap = sz(7);

    this.backButton = new Button({
      x,
      y: top,
      w: sz(34),
      h: sz(34),
      label: '',
      icon: '←',
      iconName: 'back',
      style: 'dark',
      fontSize: sz(16),
      onClick: () => this.app.goHome(),
    });

    const definitions = [
      { key: 'sound', label: '音效', icon: 'volume', type: 'toggle', value: this.profile.settings.sound },
      { key: 'bgm', label: '背景音乐', icon: 'music', type: 'toggle', value: this.profile.settings.bgm },
      { key: 'vibration', label: '振动', icon: 'vibrate', type: 'toggle', value: this.profile.settings.vibration },
      { key: 'nickname', label: '昵称', icon: 'user', type: 'value', value: this.profile.nickname },
      { key: 'privacy', label: '隐私说明', icon: 'shield', type: 'link' },
      { key: 'about', label: '关于', icon: 'info', type: 'value', value: `v${APP_VERSION}` },
      { key: 'feedback', label: '意见反馈', icon: 'chat', type: 'link' },
      { key: 'clear', label: '清除我的数据', icon: 'trash', type: 'danger' },
    ];

    this.rows = definitions.map((definition, index) => ({
      ...definition,
      x,
      y: startY + index * (rowH + gap),
      w,
      h: rowH,
    }));
    this.buttons = [this.backButton];
    this.layoutInfo = { x, w, top, startY, rowH, gap };
  }

  handleRow(row) {
    if (!row) return;
    if (row.type === 'toggle') {
      const value = !this.profile.settings[row.key];
      this.profile.settings[row.key] = value;
      if (row.key === 'sound') this.app.audio.setSoundEnabled(value);
      if (row.key === 'bgm') this.app.audio.setBgmEnabled(value);
      if (row.key === 'vibration') this.app.audio.setVibrationEnabled(value);
      this.app.databus.setSetting(row.key, value);
      this.app.analytics.track('settings_toggle', { key: row.key, value });
      if (row.key !== 'sound' || value) this.app.audio.play('click');
      this.buildRows();
      return;
    }

    if (row.key === 'nickname') {
      this.openNicknameModal();
      return;
    }
    if (row.key === 'privacy') {
      this.modal.show({
        title: '隐私说明',
        icon: 'shield',
        message:
          '本 Demo 只在本机保存昵称、梗币、图鉴、排行榜、皮肤与设置。\n\n不采集手机号、位置、通讯录、相册；不接入真实广告、云开发或支付；分享不提供奖励。\n\n设置页提供“清除我的数据”，会删除全部本地记录。正式上线前需补充并配置完整的微信隐私保护指引。',
        buttons: [{ label: '知道了', style: 'primary' }],
      });
      return;
    }
    if (row.key === 'about') {
      this.modal.show({
        title: '关于梗世界',
        icon: 'info',
        message: `版本 v${APP_VERSION}\n\n一款 3～5 分钟一局的网络热梗知识答题游戏。\n\n本轮为本地单机 Demo：广告为模拟、排行榜为本地演示数据、题库需人工复核。\n\n150 道题 · 4 类题型 · 6 款皮肤 · 4 章剧情 · 10 题一局`,
        buttons: [{ label: '知道了', style: 'primary' }],
      });
      return;
    }
    if (row.key === 'feedback') {
      this.modal.show({
        title: '意见反馈',
        icon: 'chat',
        message:
          '开发阶段：请把问题记录在项目 README 或提交给开发者。\n\n正式上线前应接入微信客服/反馈入口，并建立内容投诉 24 小时响应流程。',
        buttons: [{ label: '关闭', style: 'primary' }],
      });
      return;
    }
    if (row.key === 'clear') {
      this.modal.show({
        title: '清除我的数据？',
        icon: 'trash',
        message: '将删除昵称、梗币、图鉴、排行榜、皮肤、设置和当前对局快照。此操作不可恢复。',
        tone: 'danger',
        buttons: [
          { label: '取消', style: 'secondary' },
          {
            label: '确认清除',
            icon: '🗑️',
            iconName: 'trash',
            style: 'danger',
            onClick: () => this.app.clearAllData(),
          },
        ],
      });
    }
  }

  openNicknameModal() {
    if (!wx.showModal) {
      this.app.toast.show('当前环境不支持修改昵称');
      return;
    }
    try {
      wx.showModal({
        title: '修改昵称',
        editable: true,
        placeholderText: '2～12 个字符',
        content: this.profile.nickname,
        success: (res) => {
          if (!res.confirm) return;
          const nickname = String(res.content || '').trim();
          if (nickname.length < 2 || nickname.length > 12) {
            this.app.toast.show('昵称需为 2～12 个字符');
            return;
          }
          if (!this.app.databus.setNickname(nickname)) {
            this.app.toast.show('昵称保存失败');
            return;
          }
          this.app.analytics.track('profile_set', { hasNickname: true });
          this.app.toast.show('昵称已更新');
          this.buildRows();
        },
      });
    } catch (error) {
      this.app.toast.show('当前环境不支持修改昵称');
    }
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx) {
    const theme = this.theme;
    const { x, w, top } = this.layoutInfo;

    this.backButton.render(ctx, theme);
    drawText(ctx, '设置', x + sz(46), top + sz(7), {
      font: font(sz(22), '800'),
      color: theme.text,
      baseline: 'top',
    });
    drawText(ctx, '本地数据 · 无内购 · 广告为模拟', x + sz(46), top + sz(34), {
      font: font(sz(10), '500'),
      color: theme.muted,
      baseline: 'top',
    });

    this.rows.forEach((row) => {
      const isDanger = row.type === 'danger';
      drawGlassPanel(
        ctx,
        row.x,
        row.y,
        row.w,
        row.h,
        sz(12),
        theme,
        isDanger ? 0.55 : 0.82
      );
      const iconEntry = row.icon;
      if (iconEntry) {
        drawIcon(ctx, iconEntry, row.x + sz(28), row.y + row.h / 2, sz(27));
      }
      drawText(ctx, row.label, row.x + sz(50), row.y + row.h / 2, {
        font: font(sz(14), row.type === 'link' || row.type === 'value' ? '600' : '500'),
        color: isDanger ? theme.danger : theme.text,
        baseline: 'middle',
      });

      if (row.type === 'toggle') {
        const trackW = sz(42);
        const trackH = sz(23);
        const tx = row.x + row.w - sz(14) - trackW;
        const ty = row.y + (row.h - trackH) / 2;
        const track = ctx.createLinearGradient(tx, ty, tx, ty + trackH);
        if (row.value) {
          track.addColorStop(0, '#1c8a4a');
          track.addColorStop(1, '#35d27a');
        } else {
          track.addColorStop(0, '#0a1626');
          track.addColorStop(1, '#12304a');
        }
        fillRoundRect(ctx, tx, ty, trackW, trackH, trackH / 2, track);
        ctx.save();
        ctx.strokeStyle = row.value
          ? 'rgba(93, 242, 160, 0.65)'
          : 'rgba(94, 231, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx + trackH / 2, ty + 1);
        ctx.lineTo(tx + trackW - trackH / 2, ty + 1);
        ctx.stroke();
        ctx.restore();
        const knobR = trackH / 2 - sz(2);
        const knobX = row.value ? tx + trackW - trackH / 2 : tx + trackH / 2;
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = sz(5);
        ctx.shadowOffsetY = sz(1.5);
        fillCircle(ctx, knobX, ty + trackH / 2, knobR, row.value ? '#ffffff' : '#7fa6c9');
        ctx.restore();
      } else if (row.type === 'value') {
        drawText(ctx, row.value, row.x + row.w - sz(28), row.y + row.h / 2, {
          font: font(sz(11), '500'),
          color: theme.muted,
          align: 'right',
          baseline: 'middle',
        });
        drawText(ctx, '›', row.x + row.w - sz(14), row.y + row.h / 2 - 1, {
          font: font(sz(18), '400'),
          color: theme.muted,
          align: 'right',
          baseline: 'middle',
        });
      } else if (row.type === 'link') {
        drawText(ctx, '›', row.x + row.w - sz(14), row.y + row.h / 2 - 1, {
          font: font(sz(18), '400'),
          color: theme.muted,
          align: 'right',
          baseline: 'middle',
        });
      }
    });

    drawText(
      ctx,
      `梗世界 v${APP_VERSION} · 本地 Demo · 题库需人工复核`,
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

  findRow(x, y) {
    return this.rows.find(
      (row) => x >= row.x && x <= row.x + row.w && y >= row.y && y <= row.y + row.h
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
    const row = this.findRow(x, y);
    if (row) {
      this.pressedRow = row;
      this.pressedControl = 'row';
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
    if (this.pressedControl === 'row' && this.pressedRow) {
      const row = this.pressedRow;
      this.pressedRow = null;
      this.pressedControl = null;
      if (this.findRow(x, y) === row) this.handleRow(row);
      return true;
    }
    return false;
  }
}
