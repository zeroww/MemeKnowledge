import assert from 'node:assert/strict';
import { QUESTIONS } from '../js/data/questions.js';

const counts = {
  total: QUESTIONS.length,
  easy: 0,
  medium: 0,
  hard: 0,
  boss: 0,
  image: 0,
  dialogue: 0,
  truefalse: 0,
  meaning: 0,
};

const ids = new Set();
const warnings = [];

for (const question of QUESTIONS) {
  assert.ok(question.id, 'question.id is required');
  assert.ok(!ids.has(question.id), `duplicate id: ${question.id}`);
  ids.add(question.id);

  assert.ok(['image', 'dialogue', 'truefalse', 'meaning'].includes(question.type), `bad type: ${question.id}`);
  assert.ok([1, 2, 3].includes(question.difficulty), `bad difficulty: ${question.id}`);
  assert.ok(typeof question.stem === 'string' && question.stem.length > 0, `empty stem: ${question.id}`);
  assert.ok(Array.isArray(question.options), `options must be array: ${question.id}`);
  assert.ok(Array.isArray(question.tags) && question.tags.length > 0, `tags required: ${question.id}`);
  assert.ok(typeof question.explanation === 'string' && question.explanation.length > 0, `explanation required: ${question.id}`);
  assert.ok(typeof question.hint === 'string' && question.hint.length > 0, `hint required: ${question.id}`);
  assert.ok(typeof question.source === 'string' && question.source.length > 0, `source required: ${question.id}`);
  assert.equal(question.status, 'live', `demo question should be live: ${question.id}`);

  const expectedOptions = question.type === 'truefalse' ? 2 : 4;
  assert.equal(question.options.length, expectedOptions, `option count mismatch: ${question.id}`);

  const optionIds = question.options.map((option) => option.id);
  assert.equal(new Set(optionIds).size, optionIds.length, `duplicate option id: ${question.id}`);
  assert.ok(optionIds.includes(question.answerKey), `answerKey not in options: ${question.id}`);

  const texts = question.options.map((option) => option.text);
  assert.ok(texts.every((text) => typeof text === 'string' && text.length > 0), `empty option text: ${question.id}`);
  assert.equal(new Set(texts).size, texts.length, `duplicate option text: ${question.id}`);

  if (question.type === 'truefalse') {
    assert.ok(['T', 'F'].includes(question.answerKey), `truefalse answer must be T/F: ${question.id}`);
  }
  if (question.type === 'image') {
    assert.ok(question.visual && Array.isArray(question.visual.emojis) && question.visual.emojis.length > 0, `image visual required: ${question.id}`);
  }
  if (question.isBoss) {
    assert.equal(question.difficulty, 3, `boss question must be difficulty 3: ${question.id}`);
  }

  if (question.stem.length > 60) warnings.push(`stem > 60 chars: ${question.id} (${question.stem.length})`);
  for (const option of question.options) {
    if (option.text.length > 20) warnings.push(`option > 20 chars: ${question.id} (${option.text.length})`);
  }
  if (question.explanation.length > 80) warnings.push(`explanation > 80 chars: ${question.id} (${question.explanation.length})`);

  counts.total = QUESTIONS.length;
  if (question.difficulty === 1) counts.easy += 1;
  if (question.difficulty === 2) counts.medium += 1;
  if (question.difficulty === 3) counts.hard += 1;
  if (question.isBoss) counts.boss += 1;
  counts[question.type] += 1;
}

assert.equal(counts.total, 150, `expected 150 questions, got ${counts.total}`);
assert.equal(counts.easy, 60, `expected 60 easy, got ${counts.easy}`);
assert.equal(counts.medium, 55, `expected 55 medium, got ${counts.medium}`);
assert.equal(counts.hard, 35, `expected 35 hard, got ${counts.hard}`);
assert.equal(counts.boss, 20, `expected 20 boss, got ${counts.boss}`);
assert.equal(counts.image, 30, `expected 30 image, got ${counts.image}`);
assert.equal(counts.dialogue, 45, `expected 45 dialogue, got ${counts.dialogue}`);
assert.equal(counts.truefalse, 35, `expected 35 truefalse, got ${counts.truefalse}`);
assert.equal(counts.meaning, 40, `expected 40 meaning, got ${counts.meaning}`);

console.log('questions.test: PASS');
console.log(JSON.stringify(counts, null, 2));
if (warnings.length) {
  console.log(`\n${warnings.length} content-length warning(s):`);
  for (const warning of warnings.slice(0, 30)) console.log(`- ${warning}`);
  if (warnings.length > 30) console.log(`... and ${warnings.length - 30} more`);
}
