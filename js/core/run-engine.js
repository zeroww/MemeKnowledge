import { RUN_PHASE, LIVES, SCORE, MODE } from './types.js';
import { questionScore, calculateBaseCoins, calculateTotalCoins, isAllCorrect } from './scoring.js';
import { shuffle, randomId } from './random.js';

/**
 * 单局规则引擎。
 *
 * 约束：
 * - 只处理规则与状态，不接触 Canvas / wx / 存储 / 广告。
 * - 状态：playing → feedback → playing；生命归零 → dead；
 *   完成第 10 题 → finished；主动放弃 → abandoned。
 * - 复活后重答当前题，选项重新洗牌，之前答错不加分。
 */
export default class RunEngine {
  constructor({ questions, mode = MODE.CLASSIC, config = {}, dailyKey = '', levelId = null }) {
    if (!Array.isArray(questions) || questions.length !== 10) {
      throw new Error('RunEngine requires exactly 10 questions');
    }

    this.id = randomId('run');
    this.mode = mode;
    this.dailyKey = dailyKey;
    this.levelId = levelId ? Number(levelId) : null;
    this.config = config || {};
    this.questionIds = questions.map((q) => q.id);
    this.questions = questions.map((q) => ({
      ...q,
      optionOrder: shuffle((q.options || []).map((o) => o.id)),
    }));

    this.index = 0;
    this.lives = LIVES;
    this.score = 0;
    this.allCorrectBonus = 0;
    this.correctCount = 0;
    this.correctMap = {};
    this.answers = [];

    this.hintsUsed = 0;
    this.hintUsedForIndex = {};
    this.hintRemovedByIndex = {};

    this.extendsUsed = 0;
    this.revivesUsed = 0;
    this.adWatched = 0;

    this.doubled = false;
    this.claimed = false;

    this.status = RUN_PHASE.PLAYING;
    this.startedAt = Date.now();
    this.endedAt = 0;
    this.lastResult = null;
  }

  get currentQuestion() {
    return this.questions[this.index] || null;
  }

  get currentOptions() {
    const q = this.currentQuestion;
    if (!q) return [];
    const optionMap = new Map((q.options || []).map((o) => [o.id, o]));
    return (q.optionOrder || []).map((id) => optionMap.get(id)).filter(Boolean);
  }

  get totalQuestions() {
    return this.questions.length;
  }

  get isPlaying() {
    return this.status === RUN_PHASE.PLAYING;
  }

  get isDead() {
    return this.status === RUN_PHASE.DEAD;
  }

  get isFinished() {
    return this.status === RUN_PHASE.FINISHED;
  }

  get isAbandoned() {
    return this.status === RUN_PHASE.ABANDONED;
  }

  get isOver() {
    return this.isFinished || this.isAbandoned;
  }

  get isWin() {
    return this.isFinished;
  }

  get allCorrect() {
    return isAllCorrect(this.questionIds, this.correctMap);
  }

  getCorrectAnswerText(question = this.currentQuestion) {
    if (!question) return '';
    const answer = (question.options || []).find((o) => o.id === question.answerKey);
    return answer ? answer.text : '';
  }

  /**
   * 提交答案。timeout=true 表示超时，optionId 应为 null。
   */
  submitAnswer(optionId, options = {}) {
    if (this.status !== RUN_PHASE.PLAYING) {
      return { ok: false, code: 'NOT_PLAYING' };
    }

    const question = this.currentQuestion;
    if (!question) {
      return { ok: false, code: 'NO_QUESTION' };
    }

    const timeout = !!options.timeout;
    const validOption = (question.options || []).some((o) => o.id === optionId);
    const correct = !timeout && validOption && optionId === question.answerKey;
    const gained = correct ? questionScore(question) : 0;

    this.score += gained;

    if (correct) {
      this.correctMap[question.id] = true;
    } else {
      this.lives = Math.max(0, this.lives - 1);
    }
    this.correctCount = Object.keys(this.correctMap).length;

    const answer = {
      qid: question.id,
      index: this.index,
      optionId: timeout ? null : validOption ? optionId : null,
      correct,
      timeout,
      elapsedMs: Math.max(0, Math.round(options.elapsedMs || 0)),
      score: gained,
      at: Date.now(),
    };
    this.answers.push(answer);

    let allCorrectBonus = 0;

    if (this.lives <= 0) {
      this.status = RUN_PHASE.DEAD;
    } else if (this.index >= this.questions.length - 1) {
      this.status = RUN_PHASE.FINISHED;
      this.endedAt = Date.now();
      if (this.allCorrect) {
        allCorrectBonus = SCORE.ALL_CORRECT_BONUS;
        this.score += allCorrectBonus;
        this.allCorrectBonus = allCorrectBonus;
      }
    } else {
      this.status = RUN_PHASE.FEEDBACK;
    }

    this.lastResult = {
      ...answer,
      answerKey: question.answerKey,
      answerText: this.getCorrectAnswerText(question),
      explanation: question.explanation || '',
      hint: question.hint || '',
      gained,
      allCorrectBonus,
      lives: this.lives,
      score: this.score,
      correctCount: this.correctCount,
      questionIndex: this.index,
      isBoss: !!question.isBoss,
      status: this.status,
    };

    return { ok: true, ...this.lastResult };
  }

  /**
   * 反馈展示结束后进入下一题。仅 feedback 状态可调用。
   */
  advance() {
    if (this.status !== RUN_PHASE.FEEDBACK) return false;
    this.index += 1;
    this.status = RUN_PHASE.PLAYING;
    this.lastResult = null;
    return true;
  }

  /**
   * 复活：恢复 1 条命，重答当前题，选项重排。
   */
  revive() {
    if (this.status !== RUN_PHASE.DEAD) {
      return { ok: false, code: 'NOT_DEAD' };
    }

    const caps = this.config.caps || {};
    const max = typeof caps.revivePerRun === 'number' ? caps.revivePerRun : 2;
    if (this.revivesUsed >= max) {
      return { ok: false, code: 'REVIVE_LIMIT' };
    }

    this.revivesUsed += 1;
    this.lives = 1;
    this.status = RUN_PHASE.PLAYING;
    this.lastResult = null;

    const question = this.currentQuestion;
    if (question) {
      question.optionOrder = shuffle((question.options || []).map((o) => o.id));
    }

    return {
      ok: true,
      lives: this.lives,
      revivesUsed: this.revivesUsed,
      revivesLeft: Math.max(0, max - this.revivesUsed),
      question,
      options: this.currentOptions,
    };
  }

  /**
   * 主动放弃本局（也可用于死亡后不复活）。
   */
  abandon() {
    if (this.isOver) return false;
    this.status = RUN_PHASE.ABANDONED;
    this.endedAt = Date.now();
    this.lastResult = null;
    return true;
  }

  /**
   * 使用提示。
   * - 四选一：移除 2 个错误项，保留正确答案 + 1 个错误项。
   * - 真假题：返回出处提示，不删选项。
   */
  useHint() {
    if (this.status !== RUN_PHASE.PLAYING) {
      return { ok: false, code: 'NOT_PLAYING' };
    }

    const question = this.currentQuestion;
    if (!question) return { ok: false, code: 'NO_QUESTION' };

    const caps = this.config.caps || {};
    const perQuestion =
      typeof caps.hintPerQuestion === 'number' ? caps.hintPerQuestion : 1;
    const perRun = typeof caps.hintPerRun === 'number' ? caps.hintPerRun : 2;
    const usedForQuestion = this.hintUsedForIndex[this.index] || 0;

    if (usedForQuestion >= perQuestion) {
      return { ok: false, code: 'HINT_QUESTION_LIMIT' };
    }
    if (this.hintsUsed >= perRun) {
      return { ok: false, code: 'HINT_RUN_LIMIT' };
    }

    this.hintsUsed += 1;
    this.hintUsedForIndex[this.index] = usedForQuestion + 1;

    if (question.type === 'truefalse') {
      return {
        ok: true,
        hintText: question.hint || '再仔细看看题目和出处。',
        removedOptionIds: [],
        hintsUsed: this.hintsUsed,
        hintsLeft: Math.max(0, perRun - this.hintsUsed),
      };
    }

    const wrongIds = (question.optionOrder || []).filter((id) => id !== question.answerKey);
    const removeCount = Math.min(2, Math.max(0, wrongIds.length - 1));
    const removedOptionIds = wrongIds.slice(0, removeCount);
    this.hintRemovedByIndex[this.index] = removedOptionIds.slice();

    return {
      ok: true,
      hintText: question.hint || '',
      removedOptionIds,
      hintsUsed: this.hintsUsed,
      hintsLeft: Math.max(0, perRun - this.hintsUsed),
    };
  }

  useExtend() {
    if (this.status !== RUN_PHASE.PLAYING) {
      return { ok: false, code: 'NOT_PLAYING' };
    }
    const caps = this.config.caps || {};
    const max = typeof caps.extendPerRun === 'number' ? caps.extendPerRun : 1;
    if (this.extendsUsed >= max) {
      return { ok: false, code: 'EXTEND_LIMIT' };
    }
    this.extendsUsed += 1;
    return {
      ok: true,
      extendsUsed: this.extendsUsed,
      extendsLeft: Math.max(0, max - this.extendsUsed),
    };
  }

  noteAdWatched() {
    this.adWatched += 1;
    return this.adWatched;
  }

  /**
   * 双倍结算：仅通关局可用，每局一次，不改变 score。
   */
  applyDouble() {
    if (!this.isFinished) {
      return { ok: false, code: 'DOUBLE_ONLY_ON_WIN' };
    }
    if (this.doubled) {
      return { ok: false, code: 'ALREADY_DOUBLED' };
    }
    this.doubled = true;
    const { baseCoins } = calculateBaseCoins(this.score, true);
    return { ok: true, doubled: true, extraCoins: baseCoins };
  }

  /**
   * 结算。重复调用只返回 ALREADY_CLAIMED，保证不会重复发奖。
   * dailyBonus 由调用方判断（每日挑战首胜 +200）。
   */
  claim(options = {}) {
    const dailyBonus = Math.max(0, Math.round(options.dailyBonus || 0));

    if (!this.isFinished && !this.isAbandoned && !this.isDead) {
      return { ok: false, code: 'RUN_NOT_DONE' };
    }
    if (this.claimed) {
      return { ok: false, code: 'ALREADY_CLAIMED' };
    }

    this.claimed = true;
    const win = this.isFinished;
    const { scoreCoins, winCoins, baseCoins } = calculateBaseCoins(this.score, win);
    const totalCoins = calculateTotalCoins(baseCoins, this.doubled, dailyBonus);

    return {
      ok: true,
      runId: this.id,
      mode: this.mode,
      result: win ? 'win' : 'fail',
      win,
      score: this.score,
      correctCount: this.correctCount,
      totalQuestions: this.questions.length,
      scoreCoins,
      winCoins,
      baseCoins,
      dailyBonus,
      totalCoins,
      doubled: this.doubled,
      allCorrectBonus: this.allCorrectBonus,
      lives: this.lives,
      revivesUsed: this.revivesUsed,
      hintsUsed: this.hintsUsed,
      extendsUsed: this.extendsUsed,
      adWatched: this.adWatched,
      durationMs: Math.max(0, (this.endedAt || Date.now()) - this.startedAt),
      collectionIds: Object.keys(this.correctMap),
      questionIds: this.questionIds.slice(),
    };
  }

  getSummary() {
    return {
      runId: this.id,
      mode: this.mode,
      score: this.score,
      correctCount: this.correctCount,
      totalQuestions: this.questions.length,
      lives: this.lives,
      status: this.status,
      revivesUsed: this.revivesUsed,
      hintsUsed: this.hintsUsed,
      extendsUsed: this.extendsUsed,
      adWatched: this.adWatched,
      doubled: this.doubled,
      claimed: this.claimed,
      allCorrect: this.allCorrect,
      durationMs: Math.max(0, (this.endedAt || Date.now()) - this.startedAt),
    };
  }

  toJSON() {
    const hintRemoved = {};
    Object.keys(this.hintRemovedByIndex).forEach((key) => {
      hintRemoved[key] = (this.hintRemovedByIndex[key] || []).slice();
    });

    return {
      id: this.id,
      mode: this.mode,
      dailyKey: this.dailyKey,
      levelId: this.levelId,
      questionIds: this.questionIds.slice(),
      questions: this.questions.map((q) => ({
        ...q,
        options: (q.options || []).map((o) => ({ ...o })),
        visual: q.visual ? { ...q.visual, emojis: (q.visual.emojis || []).slice() } : undefined,
        optionOrder: (q.optionOrder || []).slice(),
      })),
      index: this.index,
      lives: this.lives,
      score: this.score,
      allCorrectBonus: this.allCorrectBonus,
      correctCount: this.correctCount,
      correctMap: { ...this.correctMap },
      answers: this.answers.map((a) => ({ ...a })),
      hintsUsed: this.hintsUsed,
      hintUsedForIndex: { ...this.hintUsedForIndex },
      hintRemovedByIndex: hintRemoved,
      extendsUsed: this.extendsUsed,
      revivesUsed: this.revivesUsed,
      adWatched: this.adWatched,
      doubled: this.doubled,
      claimed: this.claimed,
      status: this.status,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      lastResult: this.lastResult ? { ...this.lastResult } : null,
    };
  }

  static fromJSON(data, config = {}) {
    if (!data || !Array.isArray(data.questions) || data.questions.length !== 10) {
      return null;
    }

    const run = Object.create(RunEngine.prototype);
    Object.assign(run, data);
    run.config = config || {};
    run.levelId = data.levelId ? Number(data.levelId) : null;
    run.questions = data.questions.map((q) => ({
      ...q,
      options: (q.options || []).map((o) => ({ ...o })),
      visual: q.visual ? { ...q.visual, emojis: (q.visual.emojis || []).slice() } : undefined,
      optionOrder:
        Array.isArray(q.optionOrder) && q.optionOrder.length
          ? q.optionOrder.slice()
          : (q.options || []).map((o) => o.id),
    }));
    run.questionIds = Array.isArray(data.questionIds)
      ? data.questionIds.slice()
      : run.questions.map((q) => q.id);
    run.correctMap = data.correctMap || {};
    run.answers = Array.isArray(data.answers) ? data.answers.map((a) => ({ ...a })) : [];
    run.hintUsedForIndex = data.hintUsedForIndex || {};
    run.hintRemovedByIndex = data.hintRemovedByIndex || {};
    run.correctCount = data.correctCount || Object.keys(run.correctMap).length;
    run.index = Math.min(Math.max(0, data.index || 0), run.questions.length - 1);
    run.status = data.status || RUN_PHASE.PLAYING;
    run.startedAt = data.startedAt || Date.now();
    run.endedAt = data.endedAt || 0;
    run.lastResult = data.lastResult || null;
    run.doubled = !!data.doubled;
    run.claimed = !!data.claimed;
    run.adWatched = data.adWatched || 0;
    run.hintsUsed = data.hintsUsed || 0;
    run.extendsUsed = data.extendsUsed || 0;
    run.revivesUsed = data.revivesUsed || 0;
    run.lives = typeof data.lives === 'number' ? data.lives : LIVES;
    run.score = data.score || 0;
    run.allCorrectBonus = data.allCorrectBonus || 0;
    return run;
  }
}
