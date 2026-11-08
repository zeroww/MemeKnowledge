import assert from 'node:assert/strict';
import RunEngine from '../js/core/run-engine.js';
import RunTimer from '../js/core/run-timer.js';
import { sampleQuestions, sampleDailyQuestions, questionsByIds } from '../js/core/sampler.js';
import { getBeijingDateKey, getWeekKey } from '../js/core/daily.js';
import { calculateBaseCoins, questionScore } from '../js/core/scoring.js';
import { DIFFICULTY_PLAN, RUN_PHASE } from '../js/core/types.js';
import { QUESTIONS } from '../js/data/questions.js';

const CONFIG = {
  caps: {
    revivePerRun: 2,
    hintPerRun: 2,
    hintPerQuestion: 1,
    extendPerRun: 1,
    rewardedPerRun: 6,
    rewardedPerDay: 12,
    adCooldownMs: 5000,
  },
};

function makeQuestion(index, difficulty, isBoss = false, type = 'meaning') {
  const options =
    type === 'truefalse'
      ? [
          { id: 'T', text: '真的' },
          { id: 'F', text: '假的' },
        ]
      : [
          { id: 'A', text: `正确答案${index}` },
          { id: 'B', text: `干扰项B${index}` },
          { id: 'C', text: `干扰项C${index}` },
          { id: 'D', text: `干扰项D${index}` },
        ];
  return {
    id: `test_q_${index}`,
    packId: 'test',
    type,
    difficulty,
    stem: `测试题 ${index}`,
    options,
    answerKey: type === 'truefalse' ? 'T' : 'A',
    explanation: '测试解释',
    hint: '测试提示',
    source: '测试来源',
    heatPeriod: '2025-2026',
    tags: ['测试'],
    isBoss,
    status: 'live',
  };
}

const standardQuestions = DIFFICULTY_PLAN.map((difficulty, index) =>
  makeQuestion(index, difficulty, index === 9)
);

function answerAllCorrect(run) {
  for (let i = 0; i < 10; i += 1) {
    const result = run.submitAnswer('A');
    assert.equal(result.ok, true);
    assert.equal(result.correct, true);
    if (run.status === RUN_PHASE.FEEDBACK) {
      assert.equal(run.advance(), true);
    }
  }
}

// ------------------------------------------------------------
// 抽题
// ------------------------------------------------------------
{
  const picked = sampleQuestions(QUESTIONS, { seed: 'fixed-seed', recentIds: [] });
  assert.equal(picked.length, 10, 'sampler should return 10 questions');
  assert.equal(new Set(picked.map((q) => q.id)).size, 10, 'questions in a run must be unique');
  assert.deepEqual(
    picked.map((q) => q.difficulty),
    DIFFICULTY_PLAN,
    'difficulty plan must be 3 easy / 4 medium / 3 hard'
  );
  assert.equal(picked[9].isBoss, true, 'question 10 should be a boss question');

  const same = sampleDailyQuestions(QUESTIONS, '2026-11-08');
  const sameAgain = sampleDailyQuestions(QUESTIONS, '2026-11-08');
  const another = sampleDailyQuestions(QUESTIONS, '2026-11-09');
  assert.deepEqual(
    same.map((q) => q.id),
    sameAgain.map((q) => q.id),
    'daily challenge must be deterministic for the same date'
  );
  assert.notDeepEqual(
    same.map((q) => q.id),
    another.map((q) => q.id),
    'daily challenge should differ across dates'
  );
  assert.equal(same.length, 10);
  assert.equal(same[9].isBoss, true);

  const byIds = questionsByIds(QUESTIONS, same.map((q) => q.id));
  assert.deepEqual(
    byIds.map((q) => q.id),
    same.map((q) => q.id),
    'questionsByIds must preserve order'
  );
}

// ------------------------------------------------------------
// 满分：30 + 80 + 60 + 60 + 50 = 280
// ------------------------------------------------------------
{
  const run = new RunEngine({ questions: standardQuestions, config: CONFIG });
  answerAllCorrect(run);

  assert.equal(run.status, RUN_PHASE.FINISHED);
  assert.equal(run.score, 280, 'all-correct score must be 280');
  assert.equal(run.allCorrectBonus, 50);
  assert.equal(run.correctCount, 10);
  assert.equal(run.lives, 3);

  const claim = run.claim();
  assert.equal(claim.ok, true);
  assert.equal(claim.result, 'win');
  assert.equal(claim.baseCoins, 660, 'win coins = 280 * 2 + 100');
  assert.equal(claim.totalCoins, 660);
  assert.equal(claim.allCorrectBonus, 50);

  const again = run.claim();
  assert.equal(again.ok, false);
  assert.equal(again.code, 'ALREADY_CLAIMED');

  const double = run.applyDouble();
  assert.equal(double.ok, true);
  assert.equal(double.extraCoins, 660, 'double should add the same base coins again');

  const doubleAgain = run.applyDouble();
  assert.equal(doubleAgain.ok, false);
  assert.equal(doubleAgain.code, 'ALREADY_DOUBLED');
}

// ------------------------------------------------------------
// 扣命、死亡、复活、放弃
// ------------------------------------------------------------
{
  const run = new RunEngine({ questions: standardQuestions, config: CONFIG });

  assert.equal(run.submitAnswer('B').correct, false);
  assert.equal(run.lives, 2);
  assert.equal(run.status, RUN_PHASE.FEEDBACK);
  run.advance();

  assert.equal(run.submitAnswer('B').correct, false);
  assert.equal(run.lives, 1);
  run.advance();

  assert.equal(run.submitAnswer('B').correct, false);
  assert.equal(run.lives, 0);
  assert.equal(run.status, RUN_PHASE.DEAD);

  const revive1 = run.revive();
  assert.equal(revive1.ok, true);
  assert.equal(run.lives, 1);
  assert.equal(run.status, RUN_PHASE.PLAYING);
  assert.equal(run.revivesUsed, 1);

  // 复活后重答当前题，选项顺序可以被重排，但答案仍是 A
  assert.equal(run.submitAnswer('B').correct, false);
  assert.equal(run.status, RUN_PHASE.DEAD);
  const revive2 = run.revive();
  assert.equal(revive2.ok, true);
  assert.equal(run.revivesUsed, 2);
  assert.equal(run.lives, 1);

  assert.equal(run.submitAnswer('B').correct, false);
  assert.equal(run.status, RUN_PHASE.DEAD);
  const revive3 = run.revive();
  assert.equal(revive3.ok, false);
  assert.equal(revive3.code, 'REVIVE_LIMIT');

  assert.equal(run.abandon(), true);
  assert.equal(run.status, RUN_PHASE.ABANDONED);
  const claim = run.claim();
  assert.equal(claim.ok, true);
  assert.equal(claim.result, 'fail');
  assert.equal(claim.baseCoins, 0);

  const double = run.applyDouble();
  assert.equal(double.ok, false, 'failed/abandoned run cannot double');
}

// ------------------------------------------------------------
// 超时只扣 1 命
// ------------------------------------------------------------
{
  const run = new RunEngine({ questions: standardQuestions, config: CONFIG });
  const result = run.submitAnswer(null, { timeout: true, elapsedMs: 12000 });
  assert.equal(result.ok, true);
  assert.equal(result.timeout, true);
  assert.equal(result.correct, false);
  assert.equal(run.lives, 2);
  assert.equal(run.answers.length, 1);
}

// ------------------------------------------------------------
// 提示
// ------------------------------------------------------------
{
  const run = new RunEngine({ questions: standardQuestions, config: CONFIG });
  const hint = run.useHint();
  assert.equal(hint.ok, true);
  assert.equal(hint.removedOptionIds.length, 2);
  assert.equal(hint.removedOptionIds.includes('A'), false, 'hint must not remove the correct answer');
  assert.equal(hint.hintsLeft, 1);

  const hintAgain = run.useHint();
  assert.equal(hintAgain.ok, false);
  assert.equal(hintAgain.code, 'HINT_QUESTION_LIMIT');

  // 下一题仍可使用第二次提示
  run.submitAnswer('A');
  run.advance();
  const hintSecondQuestion = run.useHint();
  assert.equal(hintSecondQuestion.ok, true);
  assert.equal(hintSecondQuestion.hintsLeft, 0);

  run.submitAnswer('A');
  run.advance();
  const hintThirdQuestion = run.useHint();
  assert.equal(hintThirdQuestion.ok, false);
  assert.equal(hintThirdQuestion.code, 'HINT_RUN_LIMIT');
}

// ------------------------------------------------------------
// 真假题提示与加时
// ------------------------------------------------------------
{
  const questions = DIFFICULTY_PLAN.map((difficulty, index) =>
    makeQuestion(index, difficulty, index === 9, 'truefalse')
  );
  const run = new RunEngine({ questions, config: CONFIG });
  const hint = run.useHint();
  assert.equal(hint.ok, true);
  assert.equal(hint.removedOptionIds.length, 0);
  assert.ok(hint.hintText.length > 0);

  const extend1 = run.useExtend();
  assert.equal(extend1.ok, true);
  assert.equal(extend1.extendsLeft, 0);
  const extend2 = run.useExtend();
  assert.equal(extend2.ok, false);
  assert.equal(extend2.code, 'EXTEND_LIMIT');
}

// ------------------------------------------------------------
// 快照序列化 / 恢复
// ------------------------------------------------------------
{
  const run = new RunEngine({ questions: standardQuestions, config: CONFIG });
  run.submitAnswer('B');
  const json = run.toJSON();
  const restored = RunEngine.fromJSON(JSON.parse(JSON.stringify(json)), CONFIG);

  assert.ok(restored);
  assert.equal(restored.id, run.id);
  assert.equal(restored.index, run.index);
  assert.equal(restored.status, run.status);
  assert.equal(restored.lives, run.lives);
  assert.equal(restored.score, run.score);
  assert.equal(restored.currentQuestion.id, run.currentQuestion.id);
  assert.deepEqual(restored.currentQuestion.optionOrder, run.currentQuestion.optionOrder);

  restored.advance();
  assert.equal(restored.index, 1);
  assert.equal(restored.status, RUN_PHASE.PLAYING);
}

// ------------------------------------------------------------
// 倒计时：暂停 / 恢复 / 加时 / 超时
// ------------------------------------------------------------
{
  let now = 1000;
  let timeoutFired = 0;
  const timer = new RunTimer(
    () => {},
    () => {
      timeoutFired += 1;
    },
    {
      now: () => now,
      schedule: () => 1,
      clear: () => {},
    }
  );

  timer.start(10);
  assert.equal(timer.getRemainingSec(), 10);

  now += 3000;
  assert.equal(timer.getRemainingSec(), 7);

  timer.pause();
  const paused = timer.getRemainingSec();
  assert.equal(paused, 7);

  now += 20000;
  timer.resume();
  assert.equal(timer.getRemainingSec(), 7, 'resume must rebuild deadline, not count background time');

  timer.add(5);
  assert.equal(timer.getRemainingSec(), 12);

  now += 12000;
  timer.tick();
  assert.equal(timeoutFired, 1, 'timeout should fire exactly once');

  timer.tick();
  assert.equal(timeoutFired, 1, 'timeout must not fire twice');
}

// ------------------------------------------------------------
// 每日 / 周键
// ------------------------------------------------------------
{
  assert.equal(getBeijingDateKey(new Date('2026-11-08T16:30:00Z')), '2026-11-09');
  assert.equal(getWeekKey(new Date('2026-11-08T00:00:00Z')), '2026-11-02');
  assert.equal(getWeekKey(new Date('2024-01-03T00:00:00Z')), '2024-01-01');
}

// ------------------------------------------------------------
// 计分工具
// ------------------------------------------------------------
{
  assert.equal(questionScore({ difficulty: 1 }), 10);
  assert.equal(questionScore({ difficulty: 2 }), 20);
  assert.equal(questionScore({ difficulty: 3 }), 30);
  assert.equal(questionScore({ difficulty: 3, isBoss: true }), 60);
  assert.equal(calculateBaseCoins(280, true).baseCoins, 660);
  assert.equal(calculateBaseCoins(100, false).baseCoins, 200);
}

console.log('core.test: PASS');
