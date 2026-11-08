import RunEngine from '../core/run-engine.js';
import { sampleQuestions, sampleDailyQuestions, questionsByIds } from '../core/sampler.js';
import { getBeijingDateKey } from '../core/daily.js';
import { getLevelById } from '../data/levels.js';
import { QUESTIONS } from '../data/questions.js';
import { getConfig } from './config.js';

/**
 * 本地 API 适配层。
 * 页面调用方式与未来 CloudBase 版本保持一致：
 *   startRun / submitAnswer / revive / claimRun / applyDouble
 */
export async function startRun({ mode = 'classic', profile = null, questionIds = null, levelId = null } = {}) {
  try {
    const config = getConfig();
    let questions = null;

    if (Array.isArray(questionIds) && questionIds.length === 10) {
      const resolved = questionsByIds(QUESTIONS, questionIds);
      if (resolved.length === 10) questions = resolved;
    }

    if (!questions) {
      if (mode === 'daily') {
        questions = sampleDailyQuestions(QUESTIONS, getBeijingDateKey());
      } else {
        const level = mode === 'level' && levelId != null ? getLevelById(levelId) : null;
        questions = sampleQuestions(QUESTIONS, {
          recentIds: profile && profile.recentQuestionIds ? profile.recentQuestionIds : [],
          seed: Date.now(),
          poolIds: level ? level.questionPool : null,
        });
      }
    }

    if (!questions || questions.length !== 10) {
      return { ok: false, code: 'NO_QUESTIONS', message: '题库暂不可用' };
    }

    // 应急开关：关闭 BOSS 时保留第 10 题的高难题，但去掉 BOSS 加成与特殊视觉
    const features = config.features || {};
    const killSwitches = config.killSwitches || {};
    if (features.bossEnabled === false || killSwitches.disableBoss === true) {
      questions = questions.map((question) =>
        question.isBoss ? { ...question, isBoss: false } : question
      );
    }

    const run = new RunEngine({ questions, mode, config, levelId });
    return { ok: true, run };
  } catch (error) {
    return { ok: false, code: 'START_FAILED', message: error.message };
  }
}

export async function submitAnswer(run, optionId, options = {}) {
  if (!run) return { ok: false, code: 'NO_RUN' };
  return run.submitAnswer(optionId, options);
}

export async function revive(run) {
  if (!run) return { ok: false, code: 'NO_RUN' };
  return run.revive();
}

export async function claimRun(run, options = {}) {
  if (!run) return { ok: false, code: 'NO_RUN' };
  return run.claim(options);
}

export async function applyDouble(run) {
  if (!run) return { ok: false, code: 'NO_RUN' };
  return run.applyDouble();
}

/**
 * 预生成每日挑战题单，便于当日固定。
 */
export function createDailyQuestionIds(dateKey = getBeijingDateKey()) {
  return sampleDailyQuestions(QUESTIONS, dateKey).map((question) => question.id);
}

export function getQuestionById(id) {
  return QUESTIONS.find((question) => question.id === id) || null;
}

export function getQuestionBankSize() {
  return QUESTIONS.length;
}
