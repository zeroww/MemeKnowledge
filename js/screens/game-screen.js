import {
  AD_PLACEMENT,
  COSTS,
  DEATH_REVEAL_MS,
  DIFFICULTY_LABEL,
  FEEDBACK_MS,
  RUN_PHASE,
  TYPE_ICON,
  TYPE_LABEL,
} from '../core/types.js';
import RunTimer from '../core/run-timer.js';
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
import * as api from '../services/api.js';
import Button from '../ui/button.js';
import { renderBossBanner } from '../ui/boss-banner.js';
import {
  clamp,
  drawGlassPanel,
  drawPill,
  drawText,
  fillRoundRect,
  font,
  hexToRgba,
  strokeRoundRect,
  wrapText,
} from '../ui/draw.js';
import { renderLives } from '../ui/life-bar.js';
import Modal from '../ui/modal.js';
import OptionCard from '../ui/option-card.js';
import TimerRing from '../ui/timer-ring.js';
import BaseScreen from './base-screen.js';

export default class GameScreen extends BaseScreen {
  constructor(app) {
    super(app);
    this.run = null;
    this.timer = null;
    this.remainingSec = 0;
    this.totalSec = 10;
    this.feedback = null;
    this.selectedOptionId = null;
    this.busy = false;
    this.locked = false;
    this.reviveFlowActive = false;
    this.hintText = '';
    this.removedOptionIds = [];
    this.optionCards = [];
    this.optionRects = [];
    this.floaters = [];
    this.shakeUntil = 0;
    this.flashUntil = 0;
    this.feedbackUntil = 0;
    this.deadRevealAt = 0;
    this.questionEnteredAt = 0;
    this.extendWasVisible = false;
    this.pausedByHide = false;
    this.tapToContinue = false;
    this.pressedCard = null;
    this.pressedControl = null;
    this.layout = null;

    this.modal = new Modal();
    this.timerRing = new TimerRing();
    this.pauseButton = null;
    this.hintButton = null;
    this.extendButton = null;
  }

  onEnter() {
    this.run = this.params.run;
    if (this.modal.isVisible()) this.modal.hide();
    if (!this.run) {
      this.app.toast.show('对局不存在');
      this.app.goHome();
      return;
    }

    this.feedback = null;
    this.selectedOptionId = null;
    this.busy = false;
    this.locked = false;
    this.reviveFlowActive = false;
    this.hintText = '';
    this.removedOptionIds = [];
    this.optionCards = [];
    this.floaters = [];
    this.shakeUntil = 0;
    this.flashUntil = 0;
    this.feedbackUntil = 0;
    this.deadRevealAt = 0;
    this.extendWasVisible = false;
    this.pausedByHide = false;
    this.tapToContinue = false;

    this.timer = new RunTimer(
      (sec) => this.handleTick(sec),
      () => this.handleTimeout()
    );

    this.pauseButton = new Button({
      x: 0,
      y: 0,
      w: sz(34),
      h: sz(34),
      label: 'Ⅱ',
      style: 'dark',
      fontSize: sz(13),
      onClick: () => this.openPauseModal(),
    });
    this.hintButton = new Button({
      x: 0,
      y: 0,
      w: 0,
      h: sz(42),
      label: '提示',
      subLabel: '',
      style: 'secondary',
      icon: '💡',
      onClick: () => this.openHintModal(),
    });
    this.extendButton = new Button({
      x: 0,
      y: 0,
      w: 0,
      h: sz(42),
      label: '加时 +5 秒',
      subLabel: '看广告',
      style: 'gold',
      icon: '⏱️',
      onClick: () => this.useExtendFlow(),
    });
    this.buttons = [this.pauseButton, this.hintButton];

    if (this.run.status === RUN_PHASE.FINISHED || this.run.status === RUN_PHASE.ABANDONED) {
      this.app.finishRun(this.run);
      return;
    }

    if (this.run.status === RUN_PHASE.DEAD) {
      this.rebuildOptionCards();
      this.rebuildLayout();
      this.updateActionButtons();
      this.deadRevealAt = Date.now();
      this.openReviveModal();
      return;
    }

    if (this.run.status === RUN_PHASE.FEEDBACK) {
      this.run.advance();
    }

    this.startQuestion(this.params.resumeMs || 0);
  }

  onLeave() {
    if (this.timer) this.timer.stop();
  }

  startQuestion(resumeMs = 0) {
    if (!this.run || !this.run.currentQuestion) return;

    this.feedback = null;
    this.selectedOptionId = null;
    this.busy = false;
    this.locked = false;
    this.reviveFlowActive = false;
    this.hintText = '';
    this.removedOptionIds = (this.run.hintRemovedByIndex[this.run.index] || []).slice();
    this.floaters = [];
    this.questionEnteredAt = Date.now();
    this.feedbackUntil = 0;
    this.deadRevealAt = 0;
    this.tapToContinue = false;
    this.extendWasVisible = false;

    this.rebuildOptionCards();
    this.totalSec = this.app.config.timers[this.run.index] || 10;
    this.rebuildLayout();
    this.updateActionButtons();

    if (resumeMs && resumeMs > 0) {
      this.timer.startWithMs(Math.min(resumeMs, this.totalSec * 1000));
    } else {
      this.timer.start(this.totalSec);
    }
    this.remainingSec = this.timer.getRemainingSec();

    this.app.persistRun(this.run, this.timer.getRemainingMs());
    this.app.analytics.track('question_view', {
      qid: this.run.currentQuestion.id,
      type: this.run.currentQuestion.type,
      difficulty: this.run.currentQuestion.difficulty,
      index: this.run.index,
      timerSec: this.totalSec,
    });

    if (this.run.currentQuestion.isBoss) {
      this.app.audio.play('boss');
    }
  }

  rebuildOptionCards() {
    const question = this.run ? this.run.currentQuestion : null;
    if (!question) {
      this.optionCards = [];
      return;
    }
    const options = this.run.currentOptions.filter((option) => !this.removedOptionIds.includes(option.id));
    this.optionCards = options.map((option) => {
      return new OptionCard({
        id: option.id,
        text: option.text,
        letter: option.id,
        onSelect: (id) => this.submit(id, false),
      });
    });
  }

  rebuildLayout() {
    if (!this.run) return;
    const question = this.run.currentQuestion;
    if (!question) return;

    const x = CONTENT_X + sz(16);
    const w = CONTENT_WIDTH - sz(32);
    const top = SAFE_TOP + sz(12);
    const compact = SCREEN_HEIGHT < 700;
    const isBoss = !!question.isBoss;
    const hudBottom = top + sz(72) + (isBoss ? sz(34) : 0);

    const typeRowY = hudBottom + sz(4);
    const stemSize = compact ? sz(17) : sz(20);
    const stemLineHeight = stemSize * 1.38;
    measureCtx.font = font(stemSize, '700');
    const stemLines = wrapText(measureCtx, question.stem, w, compact ? 2 : 3);
    const stemTop = typeRowY + sz(28);
    const stemBottom = stemTop + stemLines.length * stemLineHeight;

    let imageTop = stemBottom;
    let imageH = 0;
    if (question.type === 'image') {
      imageTop = stemBottom + sz(8);
      imageH = compact ? (isBoss ? sz(64) : sz(76)) : sz(126);
    }
    let cursorBottom = imageH ? imageTop + imageH : stemBottom;

    let hintTop = cursorBottom + sz(6);
    let hintLines = [];
    let hintH = 0;
    if (this.hintText) {
      measureCtx.font = font(sz(12), '500');
      hintLines = wrapText(measureCtx, this.hintText, w - sz(20), compact ? 1 : 2);
      hintH = hintLines.length * sz(17) + sz(16);
      cursorBottom = hintTop + hintH;
    }

    const actionH = sz(42);
    const actionTop = SCREEN_HEIGHT - SAFE_BOTTOM - sz(14) - actionH;
    const optionsTop = cursorBottom + sz(12);
    const optionsBottom = actionTop - sz(10);
    const available = Math.max(sz(110), optionsBottom - optionsTop);
    const cardCount = Math.max(1, this.optionCards.length);
    const gap = sz(8);
    const minCardH = compact ? sz(38) : sz(44);
    const maxCardH = sz(78);
    const cardH = clamp((available - gap * (cardCount - 1)) / cardCount, minCardH, maxCardH);
    const totalH = cardH * cardCount + gap * (cardCount - 1);
    const startY = optionsTop + Math.max(0, (available - totalH) / 2);

    this.optionRects = [];
    this.optionCards.forEach((card, index) => {
      const cardY = startY + index * (cardH + gap);
      card.setRect(x, cardY, w, cardH);
      this.optionRects.push({ x, y: cardY, w, h: cardH, card });
    });

    this.timerRing.setCenter(RIGHT_SAFE_X - sz(28), top + sz(30), sz(23));
    this.pauseButton.setRect(x, top, sz(34), sz(34));

    this.layout = {
      x,
      w,
      top,
      compact,
      isBoss,
      hudBottom,
      typeRowY,
      stemTop,
      stemLines,
      stemSize,
      stemLineHeight,
      stemBottom,
      imageTop,
      imageH,
      hintTop,
      hintH,
      hintLines,
      optionsTop,
      optionsBottom,
      actionTop,
      actionH,
      cardH,
      gap,
      startY,
    };

    this.updateActionButtons();
  }

  updateActionButtons() {
    if (!this.layout || !this.run) return;
    const { x, w, actionTop, actionH } = this.layout;
    const gap = sz(8);
    const caps = this.app.config.caps || {};
    const hintsLeft = Math.max(0, (caps.hintPerRun || 2) - this.run.hintsUsed);
    const hintUsedThisQuestion = (this.run.hintUsedForIndex[this.run.index] || 0) >= (caps.hintPerQuestion || 1);
    const canUseHint =
      !this.feedback &&
      !this.busy &&
      this.run.status === RUN_PHASE.PLAYING &&
      hintsLeft > 0 &&
      !hintUsedThisQuestion;

    const extendVisible =
      !this.feedback &&
      !this.busy &&
      this.run.status === RUN_PHASE.PLAYING &&
      this.remainingSec <= 5 &&
      (this.run.extendsUsed || 0) < (caps.extendPerRun || 1);

    if (extendVisible) {
      const half = (w - gap) / 2;
      this.hintButton.setRect(x, actionTop, half, actionH);
      this.extendButton.setRect(x + half + gap, actionTop, half, actionH);
      this.extendButton.visible = true;
    } else {
      this.hintButton.setRect(x, actionTop, w, actionH);
      this.extendButton.visible = false;
    }

    this.hintButton.setLabel('提示', `剩余 ${hintsLeft} 次`);
    this.hintButton.setDisabled(!canUseHint);
    this.extendButton.visible = extendVisible;
    this.buttons = [this.pauseButton, this.hintButton];
    if (extendVisible) this.buttons.push(this.extendButton);
  }

  handleTick(sec) {
    this.remainingSec = sec;
    if (sec <= 5 && !this.extendWasVisible && !this.feedback) {
      this.extendWasVisible = true;
      this.updateActionButtons();
    }
  }

  handleTimeout() {
    if (this.busy || this.feedback || this.run.status !== RUN_PHASE.PLAYING) return;
    this.submit(null, true);
  }

  async submit(optionId, timeout = false) {
    if (this.busy || this.feedback || this.run.status !== RUN_PHASE.PLAYING) return;

    this.busy = true;
    this.timer.pause();
    this.selectedOptionId = optionId;
    const elapsedMs = Math.max(0, this.totalSec * 1000 - this.timer.getRemainingMs());
    const question = this.run.currentQuestion;

    const result = await api.submitAnswer(this.run, optionId, { timeout, elapsedMs });
    if (!result.ok) {
      this.busy = false;
      this.timer.resume();
      this.app.toast.show('判题失败，请重试');
      return;
    }

    this.busy = false;
    this.locked = true;
    this.feedback = result;

    for (const card of this.optionCards) {
      if (card.id === result.answerKey) card.setState('correct');
      else if (card.id === optionId) card.setState('wrong');
      else card.setState('muted');
    }

    const now = Date.now();
    if (result.correct) {
      this.app.audio.play('correct');
      const unlocked = this.app.onQuestionCorrect(result.qid);
      if (unlocked) this.app.audio.play('unlock');
      this.addFloater(
        result.isBoss ? `BOSS +${result.gained}` : `+${result.gained}`,
        this.layout.x + this.layout.w - sz(44),
        this.layout.top + sz(64),
        this.theme.success
      );
      if (unlocked) {
        this.addFloater('图鉴 +1', this.layout.x + this.layout.w - sz(44), this.layout.top + sz(82), this.theme.accent);
      }
    } else {
      this.app.audio.play('wrong');
      this.app.audio.vibrate('medium');
      this.shakeUntil = now + 320;
      this.flashUntil = now + 260;
      this.addFloater('-1 ♥', this.layout.x + sz(76), this.layout.top + sz(48), this.theme.danger);
      this.app.analytics.track('life_lost', {
        qid: question.id,
        remainingLives: result.lives,
        cause: result.timeout ? 'timeout' : 'wrong',
      });
    }

    this.app.analytics.track('answer_submit', {
      qid: question.id,
      option: result.optionId,
      correct: result.correct,
      elapsedMs: result.elapsedMs,
      isTimeout: result.timeout,
      index: this.run.index,
    });

    this.feedbackUntil = now + FEEDBACK_MS;
    if (result.status === RUN_PHASE.DEAD) {
      this.deadRevealAt = now + DEATH_REVEAL_MS;
      this.app.audio.play('death');
    }

    this.updateActionButtons();
    this.app.persistRun(this.run, this.timer.getRemainingMs());
    return result;
  }

  advanceOrFinish() {
    if (!this.feedback) return;

    if (this.run.status === RUN_PHASE.DEAD) {
      if (Date.now() >= this.deadRevealAt && !this.modal.isVisible()) this.openReviveModal();
      return;
    }

    if (this.run.status === RUN_PHASE.FEEDBACK) {
      if (this.run.advance()) {
        this.feedback = null;
        this.startQuestion();
      }
      return;
    }

    if (this.run.status === RUN_PHASE.FINISHED || this.run.status === RUN_PHASE.ABANDONED) {
      // 快照保留到结算页完成领取，避免在结算动画期间被系统杀掉导致奖励丢失
      this.app.finishRun(this.run);
    }
  }

  addFloater(text, x, y, color) {
    this.floaters.push({
      text,
      x,
      y,
      color,
      startAt: Date.now(),
      duration: 900,
    });
  }

  openPauseModal() {
    if (this.modal.isVisible() || this.feedback || this.run.status !== RUN_PHASE.PLAYING) return;
    this.timer.pause();
    this.modal.show({
      title: '已暂停',
      message: '倒计时已暂停。休息一下，或者继续挑战。',
      buttons: [
        {
          label: '继续答题',
          style: 'primary',
          onClick: () => this.timer.resume(),
        },
        {
          label: '放弃本局',
          style: 'danger',
          onClick: () => this.openQuitConfirm(),
        },
      ],
    });
  }

  openQuitConfirm() {
    this.timer.pause();
    this.modal.show({
      title: '放弃本局？',
      message: `已获得 ${this.run.score} 分。放弃后按当前分数结算，不触发双倍广告。`,
      tone: 'danger',
      buttons: [
        {
          label: '继续答题',
          style: 'primary',
          onClick: () => this.timer.resume(),
        },
        {
          label: '确认放弃',
          style: 'danger',
          onClick: () => this.abandonRun(),
        },
      ],
    });
  }

  abandonRun() {
    this.modal.hide();
    this.run.abandon();
    // 快照保留到结算页领取完成；run_end 统一由结算页上报，避免重复事件
    this.app.finishRun(this.run);
  }

  reviveCost() {
    const fallback = this.app.config.fallback || {};
    return typeof fallback.reviveCoins === 'number' ? fallback.reviveCoins : COSTS.REVIVE_COINS;
  }

  hintCost() {
    const fallback = this.app.config.fallback || {};
    return typeof fallback.hintCoins === 'number' ? fallback.hintCoins : COSTS.HINT_COINS;
  }

  openReviveModal() {
    if (
      !this.run ||
      this.run.status !== RUN_PHASE.DEAD ||
      this.modal.isVisible() ||
      this.reviveFlowActive ||
      (this.app.mockAd && this.app.mockAd.isVisible())
    ) {
      return;
    }
    const caps = this.app.config.caps || {};
    const left = Math.max(0, (caps.revivePerRun || 2) - (this.run.revivesUsed || 0));
    const canAd = this.app.adManager.canShow(AD_PLACEMENT.REVIVE, {
      run: this.run,
      profile: this.profile,
    });
    const cost = this.reviveCost();
    const canCoin = (this.profile.coins || 0) >= cost;

    this.app.analytics.track('death_show', {
      runId: this.run.id,
      index: this.run.index,
      score: this.run.score,
      revivesUsed: this.run.revivesUsed,
    });

    this.modal.show({
      title: '你出局了',
      message: '生命值耗尽。复活后恢复 1 条命，并重答当前题；选项会重新洗牌。',
      tone: 'danger',
      buttons: [
        {
          label: '看广告复活',
          subLabel: canAd.ok ? `剩余 ${left} 次` : '广告暂不可用',
          style: 'primary',
          disabled: !canAd.ok || left <= 0,
          onClick: () => this.reviveByAd(),
        },
        {
          label: `花 ${cost} 梗币复活`,
          subLabel: `当前 ${this.profile.coins} 梗币`,
          style: 'gold',
          disabled: !canCoin || left <= 0,
          onClick: () => this.reviveByCoin(),
        },
        {
          label: '放弃本局',
          subLabel: '按当前分数结算',
          style: 'ghost',
          onClick: () => this.abandonRun(),
        },
      ],
    });
  }

  async reviveByAd() {
    const check = this.app.adManager.canShow(AD_PLACEMENT.REVIVE, {
      run: this.run,
      profile: this.profile,
    });
    if (!check.ok) {
      this.app.toast.show('广告暂不可用，可花梗币复活');
      this.openReviveModal();
      return;
    }

    this.app.analytics.track('revive_click', { method: 'ad' });
    this.reviveFlowActive = true;
    let result = { ok: false };
    try {
      result = await this.app.adManager.showRewarded(AD_PLACEMENT.REVIVE, {
        run: this.run,
        profile: this.profile,
      });
    } catch (error) {
      result = { ok: false };
    }
    this.reviveFlowActive = false;

    if (!result.ok) {
      this.app.toast.show('完整观看广告后才能复活');
      this.app.analytics.track('revive_result', { method: 'ad', success: false });
      this.openReviveModal();
      return;
    }

    const revived = this.run.revive();
    if (!revived.ok) {
      this.app.toast.show('复活失败');
      this.openReviveModal();
      return;
    }

    this.app.analytics.track('revive_result', { method: 'ad', success: true });
    this.app.audio.play('revive');
    this.app.toast.show('复活成功！');
    this.startQuestion();
  }

  reviveByCoin() {
    const caps = this.app.config.caps || {};
    const left = Math.max(0, (caps.revivePerRun || 2) - (this.run.revivesUsed || 0));
    if (left <= 0) {
      this.app.toast.show('本局复活次数已用完');
      this.openReviveModal();
      return;
    }
    if (!this.app.databus.spendCoins(this.reviveCost())) {
      this.app.toast.show('梗币不足');
      this.openReviveModal();
      return;
    }

    const revived = this.run.revive();
    if (!revived.ok) {
      this.app.toast.show('复活失败');
      this.openReviveModal();
      return;
    }

    this.app.analytics.track('revive_click', { method: 'coin' });
    this.app.analytics.track('revive_result', { method: 'coin', success: true });
    this.app.audio.play('revive');
    this.app.audio.play('coin');
    this.app.toast.show('复活成功！');
    this.startQuestion();
  }

  openHintModal() {
    if (this.feedback || this.busy || this.run.status !== RUN_PHASE.PLAYING) return;
    const caps = this.app.config.caps || {};
    const hintsLeft = Math.max(0, (caps.hintPerRun || 2) - this.run.hintsUsed);
    const usedThisQuestion = (this.run.hintUsedForIndex[this.run.index] || 0) >= (caps.hintPerQuestion || 1);
    if (hintsLeft <= 0) {
      this.app.toast.show('本局提示次数已用完');
      return;
    }
    if (usedThisQuestion) {
      this.app.toast.show('本题已经使用过提示');
      return;
    }

    this.timer.pause();
    const canAd = this.app.adManager.canShow(AD_PLACEMENT.HINT, {
      run: this.run,
      profile: this.profile,
    });
    const cost = this.hintCost();
    const canCoin = (this.profile.coins || 0) >= cost;

    this.modal.show({
      title: '使用提示',
      message: '四选一会移除 2 个错误项；真假题会显示出处提示。提示不会直接给出答案。',
      buttons: [
        {
          label: '看广告提示',
          subLabel: canAd.ok ? `本局剩余 ${hintsLeft} 次` : '广告暂不可用',
          style: 'primary',
          disabled: !canAd.ok,
          onClick: () => this.hintByAd(),
        },
        {
          label: `花 ${cost} 梗币提示`,
          subLabel: `当前 ${this.profile.coins} 梗币`,
          style: 'gold',
          disabled: !canCoin,
          onClick: () => this.hintByCoin(),
        },
        {
          label: '继续答题',
          style: 'ghost',
          onClick: () => this.resumeTimerIfPlaying(),
        },
      ],
    });
  }

  resumeTimerIfPlaying() {
    if (this.app.mockAd && this.app.mockAd.isVisible()) return;
    if (!this.feedback && this.run.status === RUN_PHASE.PLAYING) this.timer.resume();
  }

  async hintByAd() {
    const result = await this.app.adManager.showRewarded(AD_PLACEMENT.HINT, {
      run: this.run,
      profile: this.profile,
    });
    if (!result.ok) {
      this.app.toast.show('完整观看广告后才能获得提示');
      this.openHintModal();
      return;
    }
    this.applyHint('ad');
  }

  hintByCoin() {
    if (!this.app.databus.spendCoins(this.hintCost())) {
      this.app.toast.show('梗币不足');
      this.openHintModal();
      return;
    }
    this.app.audio.play('coin');
    this.applyHint('coin');
  }

  applyHint(method) {
    const hint = this.run.useHint();
    if (!hint.ok) {
      this.app.toast.show('提示不可用');
      this.resumeTimerIfPlaying();
      return;
    }

    this.removedOptionIds = (hint.removedOptionIds || []).slice();
    // 四选一用“移除错误项”作为提示；只有真假题展示文字提示面板
    this.hintText = this.removedOptionIds.length ? '' : (hint.hintText || '');
    this.rebuildOptionCards();
    this.rebuildLayout();
    this.resumeTimerIfPlaying();

    this.app.analytics.track('hint_use', {
      qid: this.run.currentQuestion.id,
      method,
      remaining: hint.hintsLeft,
    });
    this.app.toast.show(
      this.removedOptionIds.length ? '已移除 2 个错误选项' : '提示已显示'
    );
  }

  async useExtendFlow() {
    if (this.feedback || this.busy || this.run.status !== RUN_PHASE.PLAYING) return;
    if (this.remainingSec > 5) return;
    const caps = this.app.config.caps || {};
    if ((this.run.extendsUsed || 0) >= (caps.extendPerRun || 1)) return;

    this.timer.pause();
    const result = await this.app.adManager.showRewarded(AD_PLACEMENT.EXTEND, {
      run: this.run,
      profile: this.profile,
    });
    if (!result.ok) {
      this.app.toast.show('广告未完整播放，未增加时间');
      this.resumeTimerIfPlaying();
      return;
    }

    const extended = this.run.useExtend();
    if (!extended.ok) {
      this.resumeTimerIfPlaying();
      return;
    }

    this.timer.add(5);
    this.remainingSec = this.timer.getRemainingSec();
    this.extendWasVisible = true;
    this.updateActionButtons();
    this.resumeTimerIfPlaying();
    this.app.audio.play('coin');
    this.app.toast.show('加时 +5 秒');
    this.app.analytics.track('extend_use', {
      qid: this.run.currentQuestion.id,
      remaining: extended.extendsLeft,
    });
  }

  onHide() {
    if (this.timer && this.run && this.run.status === RUN_PHASE.PLAYING && !this.feedback) {
      this.timer.pause();
      this.pausedByHide = true;
    }
    if (this.run) this.app.persistRun(this.run, this.timer ? this.timer.getRemainingMs() : 0);
  }

  onShow() {
    const adVisible = this.app.mockAd && this.app.mockAd.isVisible();
    if (
      this.pausedByHide &&
      !adVisible &&
      !this.modal.isVisible() &&
      !this.feedback &&
      this.run.status === RUN_PHASE.PLAYING
    ) {
      this.timer.resume();
    }
    this.pausedByHide = false;
  }

  update(dt) {
    this.time += dt;
    this.floaters = this.floaters.filter((floater) => Date.now() - floater.startAt < floater.duration);

    if (this.feedback) {
      if (this.run.status === RUN_PHASE.DEAD) {
        if (
          Date.now() >= this.deadRevealAt &&
          !this.modal.isVisible() &&
          !this.reviveFlowActive &&
          !(this.app.mockAd && this.app.mockAd.isVisible())
        ) {
          this.openReviveModal();
        }
      } else if (Date.now() >= this.feedbackUntil) {
        this.advanceOrFinish();
      }
    }

    if (
      this.run &&
      this.run.status === RUN_PHASE.PLAYING &&
      !this.feedback &&
      this.remainingSec <= 5 &&
      !this.extendWasVisible
    ) {
      this.extendWasVisible = true;
      this.updateActionButtons();
    }
  }

  render(ctx) {
    const theme = this.theme;
    const now = Date.now();
    const shakePower = now < this.shakeUntil ? (this.shakeUntil - now) / 320 : 0;

    ctx.fillStyle = 'rgba(8, 9, 12, 0.36)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.save();
    if (shakePower > 0) {
      ctx.translate(
        Math.sin(this.time * 90) * sz(4) * shakePower,
        Math.cos(this.time * 70) * sz(3) * shakePower
      );
    }

    this.renderHud(ctx, theme);
    this.renderQuestion(ctx, theme);
    this.renderActionRow(ctx, theme);
    this.renderFeedback(ctx, theme);
    this.renderFloaters(ctx);
    ctx.restore();

    if (now < this.flashUntil) {
      const alpha = clamp((this.flashUntil - now) / 260, 0, 1) * 0.28;
      ctx.fillStyle = hexToRgba(theme.danger, alpha);
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    this.modal.render(ctx, theme);
  }

  renderHud(ctx, theme) {
    const { x, w, top, isBoss } = this.layout;

    this.pauseButton.render(ctx, theme);

    drawText(ctx, `题目 ${this.run.index + 1} / ${this.run.totalQuestions}`, x + sz(44), top + sz(10), {
      font: font(sz(12), '700'),
      color: theme.text,
      baseline: 'top',
    });
    renderLives(ctx, x + sz(44), top + sz(40), this.run.lives, 3, theme, sz(15), sz(6));

    this.timerRing.render(ctx, theme, this.remainingSec, this.totalSec, this.time);
    drawText(ctx, `得分 ${this.run.score}`, RIGHT_SAFE_X - sz(28), top + sz(62), {
      font: font(sz(11), '700'),
      color: theme.accent,
      align: 'center',
      baseline: 'middle',
    });

    if (isBoss) {
      renderBossBanner(ctx, theme, x, top + sz(76), w, sz(28), this.time);
    }
  }

  renderQuestion(ctx, theme) {
    const question = this.run.currentQuestion;
    const { x, w, typeRowY, stemTop, stemLines, stemSize, stemLineHeight, imageTop, imageH, hintTop, hintH, hintLines } = this.layout;

    const typeText = `${TYPE_ICON[question.type]} ${TYPE_LABEL[question.type]} · ${DIFFICULTY_LABEL[question.difficulty]}`;
    drawPill(ctx, typeText, x, typeRowY + sz(11), {
      fontStr: font(sz(10), '700'),
      color: question.isBoss ? theme.danger : theme.accent,
      bg: hexToRgba(question.isBoss ? theme.danger : theme.primary, 0.13),
      height: sz(21),
      padX: sz(8),
    });

    ctx.font = font(stemSize, '700');
    ctx.fillStyle = theme.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    stemLines.forEach((line, index) => {
      ctx.fillText(line, x, stemTop + index * stemLineHeight);
    });

    if (question.type === 'image') {
      this.renderImageCard(ctx, theme, x, imageTop, w, imageH, question);
    }

    if (this.hintText) {
      drawGlassPanel(ctx, x, hintTop, w, hintH, sz(10), theme, 0.82);
      ctx.fillStyle = theme.accent;
      ctx.fillRect(x, hintTop + sz(6), sz(2), hintH - sz(12));
      drawText(ctx, '提示', x + sz(10), hintTop + sz(9), {
        font: font(sz(10), '700'),
        color: theme.accent,
        baseline: 'top',
      });
      ctx.font = font(sz(12), '500');
      ctx.fillStyle = hexToRgba(theme.text, 0.9);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      hintLines.forEach((line, index) => {
        ctx.fillText(line, x + sz(38), hintTop + sz(8) + index * sz(17));
      });
    }

    for (const card of this.optionCards) card.render(ctx, theme);
  }

  renderImageCard(ctx, theme, x, y, w, h, question) {
    if (!h) return;
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, hexToRgba(theme.panelSoft, 0.96));
    gradient.addColorStop(1, hexToRgba(theme.panel, 0.96));
    fillRoundRect(ctx, x, y, w, h, sz(16), gradient);
    strokeRoundRect(ctx, x, y, w, h, sz(16), hexToRgba(theme.line, 0.85), 1);

    const visual = question.visual || { emojis: ['🎭'], caption: '' };
    const emojis = visual.emojis && visual.emojis.length ? visual.emojis : ['🎭'];
    const emojiSize = Math.min(sz(40), h * 0.42);
    ctx.font = font(emojiSize, '400');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const totalW = w - sz(40);
    emojis.forEach((emoji, index) => {
      const px = emojis.length === 1 ? x + w / 2 : x + sz(20) + (totalW / Math.max(1, emojis.length - 1)) * index;
      const py = y + h * 0.42 + Math.sin(this.time * 1.6 + index) * sz(2);
      ctx.fillText(emoji, px, py);
    });

    if (visual.caption) {
      ctx.font = font(sz(12), '600');
      ctx.fillStyle = theme.muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(visual.caption, x + w / 2, y + h * 0.79);
    }

    drawText(ctx, '原创抽象梗图', x + w - sz(10), y + h - sz(10), {
      font: font(sz(8), '400'),
      color: hexToRgba(theme.muted, 0.6),
      align: 'right',
      baseline: 'bottom',
    });
  }

  renderActionRow(ctx, theme) {
    this.hintButton.render(ctx, theme);
    if (this.extendButton.visible) this.extendButton.render(ctx, theme);
  }

  renderFeedback(ctx, theme) {
    if (!this.feedback) return;
    const { x, w } = this.layout;
    const isCorrect = this.feedback.correct;
    const title = isCorrect ? '答对了！' : this.feedback.timeout ? '超时了' : '答错了';
    const color = isCorrect ? theme.success : theme.danger;
    const panelH = sz(126);
    const panelY = SCREEN_HEIGHT - SAFE_BOTTOM - sz(14) - panelH;

    drawGlassPanel(ctx, x, panelY, w, panelH, sz(14), theme, 0.96);
    ctx.fillStyle = hexToRgba(color, 0.22);
    ctx.fillRect(x, panelY, sz(4), panelH);

    drawText(ctx, title, x + sz(16), panelY + sz(16), {
      font: font(sz(18), '800'),
      color,
      baseline: 'top',
    });

    if (isCorrect) {
      const gained = this.feedback.gained || 0;
      drawText(ctx, `+${gained} 分`, x + w - sz(16), panelY + sz(18), {
        font: font(sz(14), '800'),
        color: theme.accent,
        align: 'right',
        baseline: 'top',
      });
    } else {
      drawText(ctx, `正确答案：${this.feedback.answerText}`, x + sz(16), panelY + sz(42), {
        font: font(sz(12), '700'),
        color: theme.text,
        baseline: 'top',
      });
    }

    measureCtx.font = font(sz(12), '400');
    const explanationLines = wrapText(measureCtx, this.feedback.explanation || '', w - sz(32), 2);
    ctx.font = font(sz(12), '400');
    ctx.fillStyle = hexToRgba(theme.text, 0.82);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const explanationTop = isCorrect ? panelY + sz(42) : panelY + sz(64);
    explanationLines.forEach((line, index) => {
      ctx.fillText(line, x + sz(16), explanationTop + index * sz(18));
    });

    const footer = this.run.status === RUN_PHASE.DEAD
      ? '生命值耗尽'
      : this.run.status === RUN_PHASE.FINISHED
        ? '点击进入结算'
        : '点击继续';
    drawText(ctx, footer, x + w - sz(16), panelY + panelH - sz(14), {
      font: font(sz(11), '600'),
      color: hexToRgba(theme.muted, 0.95),
      align: 'right',
      baseline: 'bottom',
    });
  }

  renderFloaters(ctx) {
    const now = Date.now();
    for (const floater of this.floaters) {
      const progress = clamp((now - floater.startAt) / floater.duration, 0, 1);
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      drawText(ctx, floater.text, floater.x, floater.y - progress * sz(28), {
        font: font(sz(15), '800'),
        color: floater.color,
        align: 'center',
        baseline: 'middle',
      });
      ctx.restore();
    }
  }

  onTouchStart(x, y) {
    if (this.modal.isVisible()) {
      this.modal.onTouchStart(x, y);
      return true;
    }

    if (this.feedback) {
      this.tapToContinue = true;
      return true;
    }

    if (this.busy || this.run.status !== RUN_PHASE.PLAYING) return false;

    if (this.handleButtonTouchStart(x, y)) {
      this.pressedControl = 'button';
      return true;
    }

    for (const card of this.optionCards) {
      if (card.onTouchStart(x, y)) {
        this.pressedCard = card;
        this.pressedControl = 'card';
        return true;
      }
    }
    return false;
  }

  onTouchEnd(x, y) {
    if (this.modal.isVisible()) {
      this.modal.onTouchEnd(x, y);
      return true;
    }

    if (this.tapToContinue) {
      this.tapToContinue = false;
      this.advanceOrFinish();
      return true;
    }

    if (this.pressedControl === 'button') {
      this.pressedControl = null;
      this.handleButtonTouchEnd(x, y);
      return true;
    }

    if (this.pressedControl === 'card' && this.pressedCard) {
      const card = this.pressedCard;
      this.pressedCard = null;
      this.pressedControl = null;
      card.onTouchEnd(x, y);
      return true;
    }

    this.pressedControl = null;
    this.pressedCard = null;
    for (const card of this.optionCards) card.cancel();
    for (const button of this.buttons) if (button.cancel) button.cancel();
    return false;
  }
}
