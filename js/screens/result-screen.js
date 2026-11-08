import { AD_PLACEMENT, SCORE } from '../core/types.js';
import { getLevelById, getNextLevel } from '../data/levels.js';
import { SAFE_BOTTOM, SCREEN_HEIGHT, sz } from '../render.js';
import * as api from '../services/api.js';
import Button from '../ui/button.js';
import {
  drawCoin,
  drawGlassPanel,
  drawStar,
  drawText,
  fillRoundRect,
  font,
  formatDuration,
  hexToRgba,
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

    const daily = this.app.databus.ensureDaily();
    const dailyBonus =
      run.mode === 'daily' && run.isFinished && !daily.rewarded ? SCORE.DAILY_WIN_COIN_BONUS : 0;

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
      if (run.mode === 'daily') {
        this.app.analytics.track('daily_finish', {
          dateKey: daily.dateKey,
          attempt: daily.attempts,
          score: claim.score,
          win: claim.win,
          coins: claim.totalCoins,
        });
      }
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
    const buttonStart = summaryY + summaryH + sz(16);
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
            style: 'gold',
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
          style: 'primary',
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
          style: 'secondary',
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
          style: 'ghost',
          fontSize: sz(11),
          onClick: () => this.app.shareScore(this.run.score),
        })
      );

      this.layoutInfo = { x, w, top, summaryY, summaryH, isLevel: true };
      return;
    }

    const dailyInfo = this.app.databus.getDailyInfo();
    let againLabel = '再来一局';
    let againSub = this.run.mode === 'daily' ? '继续每日挑战' : '重新抽 10 题';
    let againDisabled = false;
    let againAction = () => this.app.startClassicRun();

    if (this.run.mode === 'daily') {
      if (dailyInfo.exhausted) {
        againLabel = '今日挑战已完成';
        againSub = '明天再来';
        againDisabled = true;
        againAction = () => {};
      } else {
        againLabel = '再挑战';
        againSub = dailyInfo.freeAvailable ? '免费 1 次' : '看广告 1 次';
        againAction = () => this.app.requestDailyRun();
      }
    }

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
          style: 'gold',
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
        style: 'primary',
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
        style: 'secondary',
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
        style: 'ghost',
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

    if (isLevel) {
      drawText(ctx, this.level.title, x + w / 2, top + sz(2), {
        font: font(sz(10), '700'),
        color: theme.accent,
        align: 'center',
        baseline: 'top',
      });
    }

    drawStar(ctx, x + w / 2, top + sz(20), sz(7), sz(3), 5, hexToRgba(theme.accent, 0.6));

    drawText(ctx, win ? (isLevel ? '关卡完成' : '通关！') : isLevel ? '挑战失败' : '出局', x + w / 2, top + sz(26), {
      font: font(sz(32), '900'),
      color: win ? theme.accent : theme.danger,
      align: 'center',
      baseline: 'top',
    });
    drawText(
      ctx,
      isLevel
        ? win
          ? `${this.level.title} 已通过，校园地图已解锁`
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

    drawGlassPanel(ctx, x, top + sz(92), w, sz(62), sz(16), theme, 0.86);
    drawText(ctx, String(this.claim.score), x + w / 2, top + sz(114), {
      font: font(sz(40), '900'),
      color: theme.text,
      align: 'center',
      baseline: 'middle',
    });
    drawText(ctx, '得分 / 满分 280', x + w / 2, top + sz(142), {
      font: font(sz(10), '500'),
      color: theme.muted,
      align: 'center',
      baseline: 'middle',
    });

    if (this.isNewBest) {
      const badgeW = sz(82);
      fillRoundRect(ctx, x + w - badgeW - sz(8), top + sz(98), badgeW, sz(20), sz(10), hexToRgba(theme.accent, 0.2));
      drawText(ctx, '新纪录', x + w - badgeW / 2 - sz(8), top + sz(108), {
        font: font(sz(10), '800'),
        color: theme.accent,
        align: 'center',
        baseline: 'middle',
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
    const coinY = summaryY + summaryH + sz(12);
    drawCoin(ctx, x + sz(14), coinY, sz(10), theme.accent);
    drawText(ctx, `梗币 +${this.totalCoins}`, x + sz(30), coinY, {
      font: font(sz(15), '800'),
      color: theme.accent,
      baseline: 'middle',
    });
    if (this.dailyBonus > 0) {
      drawText(ctx, `含每日首胜 +${this.dailyBonus}`, x + w - sz(16), coinY, {
        font: font(sz(10), '500'),
        color: theme.success,
        align: 'right',
        baseline: 'middle',
      });
    }
    if (this.alreadyClaimed) {
      drawText(ctx, '奖励已领取', x + w - sz(16), coinY - sz(16), {
        font: font(sz(10), '500'),
        color: theme.muted,
        align: 'right',
        baseline: 'middle',
      });
    }

    for (const button of this.buttons) button.render(ctx, theme);

    const nextLevel = isLevel ? getNextLevel(this.level.id) : null;
    let footer = '分享仅用于晒成绩，不提供任何奖励';
    if (isLevel) {
      if (!win) {
        footer = '关卡进度与梗币已保存；可在地图中重试本章';
      } else if (nextLevel && nextLevel.available) {
        footer = `下一章「${nextLevel.name}」已解锁，可在地图继续`;
      } else {
        footer = '关卡进度与梗币已保存；更多章节敬请期待';
      }
    }
    drawText(
      ctx,
      footer,
      this.contentX + this.contentW / 2,
      this.bottom - sz(14),
      {
        font: font(sz(10), '400'),
        color: hexToRgba(theme.muted, 0.7),
        align: 'center',
        baseline: 'middle',
      }
    );
  }

  onTouchStart(x, y) {
    return this.handleButtonTouchStart(x, y);
  }

  onTouchEnd(x, y) {
    return this.handleButtonTouchEnd(x, y);
  }
}
