import { AD_PLACEMENT, SCORE } from '../core/types.js';
import { getLevelById } from '../data/levels.js';
import { SAFE_BOTTOM, SCREEN_HEIGHT, SCREEN_WIDTH, sz } from '../render.js';
import * as api from '../services/api.js';
import Button from '../ui/button.js';
import { drawIcon } from '../ui/icons.js';
import {
  drawCandyPanel,
  drawCoin,
  drawGlassPanel,
  drawPill,
  drawStar,
  drawText,
  fillRoundRect,
  font,
  formatDuration,
  hexToRgba,
  strokeRoundRect,
} from '../ui/draw.js';
import BaseScreen from './base-screen.js';

export default class ResultScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.run = null;
    this.level = null;
    this.claim = null;
    this.baseCoins = 0;
    this.dailyBonus = 0;
    this.totalCoins = 0;
    this.unlockedCount = 0;
    this.isNewBest = false;
    this.alreadyClaimed = false;
    this.doubling = false;
    this.ready = false;
    this.buttons = [];
  }

  onEnter() {
    this.run = this.params.run;
    if (!this.run) {
      this.app.goHome();
      return;
    }
    this.level =
      this.run.mode === 'level'
        ? getLevelById(this.run.levelId) || getLevelById(1)
        : null;

    this.ready = false;
    this.claim = null;
    this.baseCoins = 0;
    this.dailyBonus = 0;
    this.totalCoins = 0;
    this.unlockedCount = 0;
    this.isNewBest = false;
    this.alreadyClaimed = false;
    this.doubling = false;
    this.buttons = [];
    this.layoutInfo = null;
    this.prepare();
  }

  applyClaimRecord(record, alreadyClaimed = true) {
    const run = this.run;
    if (record.doubled) run.doubled = true;
    this.alreadyClaimed = alreadyClaimed;
    this.claim = {
      ok: true,
      win: !!record.win,
      result: record.win ? 'win' : 'fail',
      score: record.score || 0,
      correctCount: record.correctCount || 0,
      totalQuestions: run.questions.length,
      baseCoins: record.baseCoins || 0,
      dailyBonus: record.dailyBonus || 0,
      totalCoins: record.totalCoins || 0,
      doubled: !!record.doubled,
      allCorrectBonus: run.allCorrectBonus,
      lives: run.lives,
      revivesUsed: run.revivesUsed,
      hintsUsed: run.hintsUsed,
      adWatched: run.adWatched,
      durationMs: record.durationMs || 0,
    };
    this.baseCoins = record.baseCoins || 0;
    this.dailyBonus = record.dailyBonus || 0;
    this.totalCoins = record.totalCoins || 0;
    this.unlockedCount = record.unlockedCount || 0;
    this.isNewBest = false;
  }

  applyFallbackClaim(run) {
    const win = run.isFinished;
    const baseCoins = run.score * SCORE.COIN_PER_SCORE + (win ? SCORE.WIN_COIN_BONUS : 0);
    this.claim = {
      ok: true,
      win,
      result: win ? 'win' : 'fail',
      score: run.score,
      correctCount: run.correctCount,
      totalQuestions: run.questions.length,
      baseCoins,
      dailyBonus: 0,
      totalCoins: baseCoins * (run.doubled ? 2 : 1),
      doubled: !!run.doubled,
      allCorrectBonus: run.allCorrectBonus,
      lives: run.lives,
      revivesUsed: run.revivesUsed,
      hintsUsed: run.hintsUsed,
      adWatched: run.adWatched,
      durationMs: Math.max(0, (run.endedAt || Date.now()) - run.startedAt),
    };
    this.baseCoins = baseCoins;
    this.dailyBonus = 0;
    this.totalCoins = this.claim.totalCoins;
    this.unlockedCount = run.correctCount;
  }

  async prepare() {
    const run = this.run;
    if (!run.isFinished && !run.isAbandoned && !run.isDead) {
      run.abandon();
    }

    // 先查本地账本：重复进入结算页、或上次已发奖但快照未清时，绝不重复发奖
    const prior = this.app.databus.getClaimedRun(run.id);
    if (prior) {
      this.applyClaimRecord(prior, true);
      if (run.mode === 'level' && prior.win) {
        this.app.databus.applyStoryCompletion(run, prior);
        this.app.databus.save();
      }
      this.app.databus.clearSnapshot();
      this.ready = true;
      this.layout();
      return;
    }

    const dailyBonus = 0;
    const claim = await api.claimRun(run, { dailyBonus });
    if (claim.ok) {
      this.claim = claim;
      this.baseCoins = claim.baseCoins;
      this.dailyBonus = claim.dailyBonus;
      this.totalCoins = claim.totalCoins;
      this.unlockedCount = this.app.databus.lastRunUnlockedCount;

      const grant = this.app.databus.grantRunClaim(run, claim, {
        unlockedCount: this.unlockedCount,
      });
      if (grant.ok) {
        this.isNewBest = grant.isNewBest;
      } else if (grant.code === 'ALREADY_CLAIMED' && grant.record) {
        this.applyClaimRecord(grant.record, true);
      } else {
        this.app.toast.show('结算失败，请稍后重试');
      }

      this.app.analytics.track('claim_result', {
        runId: run.id,
        mode: run.mode,
        coins: claim.totalCoins,
        doubled: claim.doubled,
        unlockedCount: this.unlockedCount,
        win: claim.win,
        newlyGranted: grant.ok,
      });
      this.app.analytics.track('run_end', {
        runId: run.id,
        mode: run.mode,
        result: claim.win ? 'win' : 'fail',
        score: claim.score,
        correct: claim.correctCount,
        durationMs: claim.durationMs,
        revives: claim.revivesUsed,
        adCount: claim.adWatched,
        abandoned: run.isAbandoned,
      });
      this.app.databus.clearSnapshot();
    } else if (claim.code === 'ALREADY_CLAIMED') {
      const record = this.app.databus.getClaimedRun(run.id);
      if (record) {
        this.applyClaimRecord(record, true);
        if (run.mode === 'level' && record.win) {
          this.app.databus.applyStoryCompletion(run, record);
          this.app.databus.save();
        }
      } else {
        this.applyFallbackClaim(run);
      }
      this.alreadyClaimed = true;
      this.app.databus.clearSnapshot();
    } else {
      this.app.toast.show('结算失败，请稍后重试');
      // 保留快照：下次进入仍可尝试结算
      this.applyFallbackClaim(run);
    }

    this.ready = true;
    this.layout();
  }

  layout() {
    const x = this.contentX + sz(18);
    const w = this.contentW - sz(36);
    const top = this.top + sz(18);
    const summaryY = top + sz(166);
    const summaryH = sz(142);
    const buttonStart = summaryY + summaryH + sz(36);
    const gap = sz(9);
    const canDouble =
      this.claim &&
      this.claim.win &&
      !this.run.doubled &&
      !!this.app.databus.getClaimedRun(this.run.id);
    const isLevel = this.run.mode === 'level' && !!this.level;

    if (isLevel) {
      let levelY = buttonStart;
      this.buttons = [];

      if (canDouble) {
        this.buttons.push(
          new Button({
            x,
            y: levelY,
            w,
            h: sz(50),
            label: '看广告 · 梗币 ×2',
            subLabel: '本关仅一次，不影响排行榜分数',
            icon: '📺',
            iconName: 'tv',
            style: 'candyBlue',
            disabled: this.doubling,
            onClick: () => this.watchDoubleAd(),
          })
        );
        levelY += sz(50) + gap;
      }

      this.buttons.push(
        new Button({
          x,
          y: levelY,
          w,
          h: sz(54),
          label: this.claim && this.claim.win ? '进入校园地图' : '查看关卡地图',
          subLabel:
            this.claim && this.claim.win
              ? `${this.level.title} 已完成`
              : `${this.level.title} · 挑战失败`,
          icon: '🗺️',
          iconName: 'map',
          style: 'candyGreen',
          onClick: () => this.app.showScreen('map'),
        })
      );
      levelY += sz(54) + gap;

      const third = (w - gap * 2) / 3;
      this.buttons.push(
        new Button({
          x,
          y: levelY,
          w: third,
          h: sz(46),
          label: '重玩本关',
          icon: '🔄',
          iconName: 'replay',
          style: 'candyOrange',
          fontSize: sz(11),
          onClick: () =>
            this.app.showScreen('levelIntro', {
              levelId: this.level.id,
              replay: true,
            }),
        })
      );
      this.buttons.push(
        new Button({
          x: x + third + gap,
          y: levelY,
          w: third,
          h: sz(46),
          label: '返回首页',
          icon: '🏠',
          iconName: 'home',
          style: 'secondary',
          fontSize: sz(11),
          onClick: () => {
            this.app.goHome();
            this.app.maybeShowInterstitial();
          },
        })
      );
      this.buttons.push(
        new Button({
          x: x + (third + gap) * 2,
          y: levelY,
          w: third,
          h: sz(46),
          label: '分享',
          icon: '📤',
          iconName: 'share',
          style: 'candyPurple',
          fontSize: sz(11),
          onClick: () => this.app.shareScore(this.run.score),
        })
      );

      this.layoutInfo = { x, w, top, summaryY, summaryH, isLevel: true };
      return;
    }

    const againLabel = '再来一局';
    const againSub = '重新抽 10 题';
    const againDisabled = false;
    const againAction = () => this.app.startClassicRun();

    let y = buttonStart;
    this.buttons = [];

    if (canDouble) {
      this.buttons.push(
        new Button({
          x,
          y,
          w,
          h: sz(50),
          label: '看广告 · 梗币 ×2',
          subLabel: '本局仅一次，不影响排行榜分数',
          icon: '📺',
          iconName: 'tv',
          style: 'candyBlue',
          disabled: this.doubling,
          onClick: () => this.watchDoubleAd(),
        })
      );
      y += sz(50) + gap;
    }

    this.buttons.push(
      new Button({
        x,
        y,
        w,
        h: sz(54),
        label: againLabel,
        subLabel: againSub,
        icon: '🔄',
        iconName: 'replay',
        style: 'candyOrange',
        disabled: againDisabled,
        onClick: againAction,
      })
    );
    y += sz(54) + gap;

    const half = (w - gap) / 2;
    this.buttons.push(
      new Button({
        x,
        y,
        w: half,
        h: sz(46),
        label: '返回首页',
        icon: '🏠',
        iconName: 'home',
        style: 'ghost',
        onClick: () => {
          this.app.goHome();
          this.app.maybeShowInterstitial();
        },
      })
    );
    this.buttons.push(
      new Button({
        x: x + half + gap,
        y,
        w: half,
        h: sz(46),
        label: '分享成绩',
        icon: '📤',
        iconName: 'share',
        style: 'candyPurple',
        onClick: () => this.app.shareScore(this.run.score),
      })
    );

    this.layoutInfo = { x, w, top, summaryY, summaryH, isLevel: false };
  }

  async watchDoubleAd() {
    if (this.doubling) return;
    const check = this.app.adManager.canShow(AD_PLACEMENT.DOUBLE, {
      run: this.run,
      profile: this.profile,
    });
    if (!check.ok) {
      this.app.toast.show('双倍广告暂不可用');
      return;
    }

    this.doubling = true;
    this.layout();
    const result = await this.app.adManager.showRewarded(AD_PLACEMENT.DOUBLE, {
      run: this.run,
      profile: this.profile,
    });
    if (!result.ok) {
      this.doubling = false;
      this.layout();
      this.app.toast.show('完整观看广告后才能翻倍');
      return;
    }

    const doubled = await api.applyDouble(this.run);
    if (!doubled.ok) {
      this.doubling = false;
      this.layout();
      if (doubled.code === 'ALREADY_DOUBLED') {
        const prior = this.app.databus.getClaimedRun(this.run.id);
        if (prior) this.applyClaimRecord(prior, true);
      }
      this.app.toast.show('本局已经翻倍过了');
      return;
    }

    const grant = this.app.databus.grantDouble(this.run.id, doubled.extraCoins);
    this.doubling = false;
    if (!grant.ok) {
      this.layout();
      if (grant.code === 'ALREADY_DOUBLED' && grant.record) {
        this.applyClaimRecord(grant.record, true);
      } else {
        this.app.toast.show('翻倍失败，请稍后重试');
      }
      return;
    }

    this.totalCoins = grant.record.totalCoins;
    if (this.claim) this.claim.doubled = true;
    this.app.audio.play('coin');
    this.app.toast.show('梗币已翻倍！');
    this.app.analytics.track('double_use', {
      placements: 'double',
      extraCoins: doubled.extraCoins,
    });
    this.layout();
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx) {
    const theme = this.theme;
    if (!this.ready || !this.claim) {
      drawText(ctx, '正在结算…', this.contentX + this.contentW / 2, SCREEN_HEIGHT / 2, {
        font: font(sz(16), '600'),
        color: theme.muted,
        align: 'center',
        baseline: 'middle',
      });
      return;
    }

    const { x, w, top, summaryY, summaryH } = this.layoutInfo;
    const win = this.claim.win;
    const isLevel = this.run.mode === 'level' && !!this.level;

    if (win) this.renderConfetti(ctx, theme);

    if (isLevel) {
      drawPill(ctx, this.level.title, x + w / 2, top + sz(8), {
        fontStr: font(sz(9), '800'),
        color: '#9ff4ff',
        bg: 'rgba(94,231,255,0.1)',
        border: 'rgba(94,231,255,0.4)',
        height: sz(18),
        padX: sz(9),
        align: 'center',
      });
    }

    drawStar(ctx, x + w / 2 - sz(54), top + sz(22), sz(7), sz(3), 5, hexToRgba(theme.accent, 0.75));
    drawStar(ctx, x + w / 2 + sz(54), top + sz(20), sz(5), sz(2), 5, hexToRgba(theme.accent, 0.55));

    drawText(ctx, win ? (isLevel ? '关卡完成' : '通关！') : isLevel ? '挑战失败' : '出局', x + w / 2, top + sz(26), {
      font: font(sz(30), '900'),
      color: win ? '#e8f7ff' : theme.danger,
      align: 'center',
      baseline: 'top',
    });
    drawText(
      ctx,
      isLevel
        ? win
          ? this.level.id === 4
            ? '图书馆的门开了，你终于找到回去的路'
            : `${this.level.title} 已通过，校园地图已解锁`
          : `${this.level.title} · 差一点就过关了`
        : win
          ? '你成功活到了最后，梗王非你莫属'
          : '差一点就接住了，不服再来一局',
      x + w / 2,
      top + sz(66),
      {
        font: font(sz(12), '500'),
        color: theme.muted,
        align: 'center',
        baseline: 'top',
      }
    );

    const scoreCardY = top + sz(92);
    drawCandyPanel(ctx, x, scoreCardY, w, sz(64), sz(20), {
      fill: '#0a1626',
      fillBottom: '#0e2138',
      border: 'rgba(94, 231, 255, 0.4)',
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowBlur: sz(18),
      shadowOffsetY: sz(7),
      glossAlpha: 0.12,
    });
    drawIcon(ctx, win ? 'trophy' : 'heart', x + sz(40), scoreCardY + sz(32), sz(46));
    drawText(ctx, String(this.claim.score), x + w / 2 + sz(16), scoreCardY + sz(25), {
      font: font(sz(36), '900'),
      color: '#ffcf6a',
      align: 'center',
      baseline: 'middle',
    });
    drawText(ctx, '得分 / 满分 280', x + w / 2 + sz(16), scoreCardY + sz(49), {
      font: font(sz(9), '600'),
      color: '#7fa6c9',
      align: 'center',
      baseline: 'middle',
    });

    if (this.isNewBest) {
      drawPill(ctx, '新纪录', x + w - sz(12), scoreCardY + sz(16), {
        fontStr: font(sz(9), '800'),
        color: '#ffcf6a',
        bg: 'rgba(255,207,106,0.12)',
        border: 'rgba(255,207,106,0.5)',
        height: sz(20),
        padX: sz(9),
        align: 'right',
      });
    }

    drawGlassPanel(ctx, x, summaryY, w, summaryH, sz(16), theme, 0.82);
    const rows = [
      { label: '正确题数', value: `${this.claim.correctCount}/${this.claim.totalQuestions}` },
      { label: '用时', value: formatDuration(this.claim.durationMs) },
      { label: '复活 / 提示', value: `${this.claim.revivesUsed} / ${this.claim.hintsUsed}` },
      { label: '图鉴解锁', value: `${this.unlockedCount} 条` },
    ];
    rows.forEach((row, index) => {
      const rowY = summaryY + sz(22) + index * sz(27);
      drawText(ctx, row.label, x + sz(16), rowY, {
        font: font(sz(12), '500'),
        color: theme.muted,
        baseline: 'middle',
      });
      drawText(ctx, row.value, x + w - sz(16), rowY, {
        font: font(sz(12), '700'),
        color: theme.text,
        align: 'right',
        baseline: 'middle',
      });
    });

    // 梗币
    const coinY = summaryY + summaryH + sz(11);
    const coinPanelH = sz(30);
    fillRoundRect(
      ctx,
      x,
      coinY - coinPanelH / 2,
      w,
      coinPanelH,
      coinPanelH / 2,
      'rgba(10, 22, 38, 0.96)'
    );
    strokeRoundRect(
      ctx,
      x,
      coinY - coinPanelH / 2,
      w,
      coinPanelH,
      coinPanelH / 2,
      'rgba(255, 207, 106, 0.4)',
      1
    );
    drawCoin(ctx, x + sz(18), coinY, sz(10), theme.accent);
    drawText(ctx, `梗币 +${this.totalCoins}`, x + sz(36), coinY, {
      font: font(sz(15), '800'),
      color: '#ffcf6a',
      baseline: 'middle',
    });
    if (this.alreadyClaimed) {
      drawText(ctx, '奖励已领取', x + w - sz(16), coinY, {
        font: font(sz(10), '600'),
        color: '#7fa6c9',
        align: 'right',
        baseline: 'middle',
      });
    }

    for (const button of this.buttons) button.render(ctx, theme);

  }

  renderConfetti(ctx, theme) {
    const colors = [theme.accent, theme.primary, '#ffffff', theme.success];
    const count = 18;
    for (let i = 0; i < count; i += 1) {
      const seed = i * 37 + 11;
      const x = (((seed * 53) % 100) / 100) * SCREEN_WIDTH;
      const y = ((seed * 71 + this.time * 22) % 190) - sz(10);
      const size = sz(2.4 + (i % 3) * 1.4);
      const alpha = 0.2 + (i % 4) * 0.07;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate((seed % 10) * 0.35 + this.time * 0.4);
      fillRoundRect(
        ctx,
        -size / 2,
        -size / 2,
        size,
        size * 2.2,
        size * 0.35,
        colors[i % colors.length]
      );
      ctx.restore();
    }
  }

  onTouchStart(x, y) {
    return this.handleButtonTouchStart(x, y);
  }

  onTouchEnd(x, y) {
    return this.handleButtonTouchEnd(x, y);
  }
}
