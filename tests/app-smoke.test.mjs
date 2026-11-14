import assert from 'node:assert/strict';

/**
 * 无头冒烟测试：模拟微信小游戏运行环境，跑通主要页面与关键交互。
 * 这不是像素级测试，但能发现导入错误、空指针、页面渲染崩溃与流程死锁。
 */

const TEST_SCREEN_W = Number(process.env.SCREEN_W || 375);
const TEST_SCREEN_H = Number(process.env.SCREEN_H || 667);

const storage = new Map();
const touchHandlers = { start: [], move: [], end: [], cancel: [] };
const hideHandlers = [];
const showHandlers = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeGradient() {
  return { addColorStop() {} };
}

function makeContext() {
  const ctx = {
    font: '10px sans-serif',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    scale() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    arcTo() {},
    bezierCurveTo() {},
    quadraticCurveTo() {},
    rect() {},
    clip() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    fillText() {},
    strokeText() {},
    setLineDash() {},
    drawImage() {},
    createLinearGradient: makeGradient,
    createRadialGradient: makeGradient,
    measureText(text) {
      return { width: Array.from(String(text || '')).length * 7.5 };
    },
  };
  return ctx;
}

const canvasContext = makeContext();
const fakeCanvas = {
  width: 750,
  height: 1334,
  getContext() {
    return canvasContext;
  },
};

const fakeWx = {
  createCanvas() {
    return fakeCanvas;
  },
  getWindowInfo() {
    return {
      screenWidth: TEST_SCREEN_W,
      screenHeight: TEST_SCREEN_H,
      windowWidth: TEST_SCREEN_W,
      windowHeight: TEST_SCREEN_H,
      pixelRatio: 2,
      safeArea: {
        top: 20,
        bottom: TEST_SCREEN_H - 20,
        left: 0,
        right: TEST_SCREEN_W,
      },
    };
  },
  getSystemInfoSync() {
    return this.getWindowInfo();
  },
  getMenuButtonBoundingClientRect() {
    return {
      left: TEST_SCREEN_W - 107,
      right: TEST_SCREEN_W - 20,
      top: 26,
      bottom: 58,
      width: 87,
      height: 32,
    };
  },
  getLaunchOptionsSync() {
    return { scene: 1001, query: {} };
  },
  getStorageSync(key) {
    return storage.has(key) ? clone(storage.get(key)) : '';
  },
  setStorageSync(key, value) {
    storage.set(key, clone(value));
  },
  removeStorageSync(key) {
    storage.delete(key);
  },
  getStorageInfoSync() {
    return { keys: Array.from(storage.keys()) };
  },
  onTouchStart(handler) {
    touchHandlers.start.push(handler);
  },
  onTouchMove(handler) {
    touchHandlers.move.push(handler);
  },
  onTouchEnd(handler) {
    touchHandlers.end.push(handler);
  },
  onTouchCancel(handler) {
    touchHandlers.cancel.push(handler);
  },
  onHide(handler) {
    hideHandlers.push(handler);
  },
  onShow(handler) {
    showHandlers.push(handler);
  },
  showModal(options) {
    if (options && options.success) {
      options.success({ confirm: true, content: '新昵称' });
    }
  },
  showShareMenu() {},
  shareAppMessage() {},
  vibrateShort() {},
  createImage() {
    const img = { width: 0, height: 0, onload: null, onerror: null };
    let src = '';
    Object.defineProperty(img, 'src', {
      get() {
        return src;
      },
      set(value) {
        src = value;
        const path = String(value);
        if (path.includes('role2-1')) {
          img.width = 560;
          img.height = 434;
        } else if (path.includes('role2')) {
          img.width = 408;
          img.height = 680;
        } else if (path.includes('role3-1')) {
          img.width = 560;
          img.height = 464;
        } else if (path.includes('role3')) {
          img.width = 359;
          img.height = 680;
        } else if (path.includes('role0-1')) {
          img.width = 639;
          img.height = 598;
        } else if (path.includes('role0')) {
          img.width = 337;
          img.height = 820;
        } else if (path.includes('role1-hp3')) {
          img.width = 216;
          img.height = 640;
        } else if (path.includes('role1-hp2')) {
          img.width = 243;
          img.height = 640;
        } else if (path.includes('role1-hp1')) {
          img.width = 274;
          img.height = 640;
        } else {
          img.width = 1024;
          img.height = 683;
        }
        setTimeout(() => {
          if (img.onload) img.onload();
        }, 0);
      },
    });
    return img;
  },
  createInnerAudioContext() {
    return {
      src: '',
      loop: false,
      autoplay: false,
      volume: 1,
      onError() {},
      play() {},
      pause() {},
    };
  },
};

global.GameGlobal = {};
global.wx = fakeWx;
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

const { default: Main } = await import('../js/main.js');
const { QUESTIONS } = await import('../js/data/questions.js');
const { SKINS } = await import('../js/data/skins.js');
const { RUN_PHASE } = await import('../js/core/types.js');
const { default: RunEngine } = await import('../js/core/run-engine.js');
const { LEVELS, LEVEL2_INTRO, LEVEL3_INTRO, LEVEL4_INTRO } = await import('../js/data/levels.js');
const { SCREEN_WIDTH, SCREEN_HEIGHT } = await import('../js/render.js');

function tick(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertInside(rect, label) {
  assert.ok(rect, `${label} rect required`);
  assert.ok(rect.x >= -0.5, `${label} x should be inside screen`);
  assert.ok(rect.x + rect.w <= SCREEN_WIDTH + 0.5, `${label} right edge should be inside screen`);
  assert.ok(rect.y >= -0.5, `${label} y should be inside screen`);
  assert.ok(rect.y + rect.h <= SCREEN_HEIGHT + 0.5, `${label} bottom edge should be inside screen`);
}

function assertGameOptionsLayout(gameScreen, label) {
  const layout = gameScreen.layout;
  assert.ok(layout, `${label} layout required`);
  assert.ok(gameScreen.optionCards.length >= 2, `${label} should have options`);
  for (const rect of gameScreen.optionRects) {
    assertInside(rect, `${label} option`);
    assert.ok(rect.y >= layout.optionsTop - 1, `${label} option should start below content`);
    assert.ok(
      rect.y + rect.h <= layout.actionTop + 1,
      `${label} option should not overlap the action row`
    );
  }
  assertInside(
    { x: gameScreen.hintButton.x, y: gameScreen.hintButton.y, w: gameScreen.hintButton.w, h: gameScreen.hintButton.h },
    `${label} hint button`
  );
}

async function completeMockAd(app, delay = 5) {
  await tick(delay);
  assert.equal(app.mockAd.isVisible(), true, 'mock ad should be visible');
  app.mockAd.startAt = Date.now() - 5000;
  app.mockAd.update();
  const rect = app.mockAd.actionRect;
  app.mockAd.onTouchStart(rect.x + 2, rect.y + 2);
  app.mockAd.onTouchEnd(rect.x + 2, rect.y + 2);
}

const app = new Main();
assert.equal(app.screenManager.currentName, 'home', 'app should start at home');
assert.equal(app.audio.currentScene, 'home');
assert.equal(app.audio.getBgmMode(), 'relaxed', 'home should use relaxed BGM');
app.update(0.016);
app.render();

// ------------------------------------------------------------
// 首页 → 剧情开场 → 第一章 宿舍 → 完整 10 题全对 → 结算
// ------------------------------------------------------------
const startButton = app.screens.home.storyButton;
assert.ok(startButton, 'home should have a story start button');
assertInside(startButton, 'home story button');
for (const button of app.screens.home.buttons) assertInside(button, 'home button');
const homeLayout = app.screens.home.layoutInfo;
assertInside(
  { x: homeLayout.x, y: homeLayout.storyY, w: homeLayout.storyW, h: homeLayout.storyH },
  'home story card'
);
assert.ok(
  homeLayout.heroRect,
  'home should always show the cartoon hero as the main visual'
);
assertInside(homeLayout.heroRect, 'home cartoon hero');
assert.equal(startButton.label, '开始游戏');
assert.equal(startButton.icon, '📖');
const startX = startButton.x + startButton.w / 2;
const startY = startButton.y + startButton.h / 2;
touchHandlers.start.forEach((handler) => handler({ touches: [{ clientX: startX, clientY: startY }] }));
touchHandlers.end.forEach((handler) =>
  handler({ touches: [], changedTouches: [{ clientX: startX, clientY: startY }] })
);
await tick(10);
assert.equal(app.screenManager.currentName, 'map', 'home CTA should open the campus map');
app.screens.map.startLevel(1);
await tick(10);
assert.equal(app.screenManager.currentName, 'levelIntro', 'map level 1 should open story intro');
assert.equal(app.audio.getBgmMode(), 'relaxed', 'dialogue intro should use relaxed BGM');
app.update(0.016);
app.render();

const intro = app.screens.levelIntro;
assert.ok(intro.steps.length >= 5, 'level intro should have dialogue steps');
assertInside(intro.layoutInfo.bubbleRect, 'intro bubble');
assertInside(intro.layoutInfo.heroRect, 'intro hero');
assertInside(intro.layoutInfo.opponentRect, 'intro opponent');
assert.ok(intro.layoutInfo.heroRect.h >= 160, 'intro hero should be large');
assert.ok(
  intro.layoutInfo.heroRect.y + intro.layoutInfo.heroRect.h >= intro.layoutInfo.bubbleRect.y,
  'intro hero should overlap the top of the dialogue bubble'
);
assert.ok(
  intro.layoutInfo.opponentRect.y + intro.layoutInfo.opponentRect.h >=
    intro.layoutInfo.bubbleRect.y,
  'intro opponent should overlap the top of the dialogue bubble'
);

// 人物只在第一次有对白时登场
assert.equal(intro.opponentSeen, false, 'opponent should be hidden during narration');
assert.equal(intro.heroSeen, false, 'hero should be hidden during narration');
intro.nextStep(); // 第二句旁白
assert.equal(intro.opponentSeen, false);
assert.equal(intro.heroSeen, false);
intro.nextStep(); // 嘉豪第一次开口
assert.equal(intro.opponentSeen, true, 'opponent should appear on their first line');
assert.equal(intro.heroSeen, false, 'hero should still be hidden before their line');
intro.nextStep(); // 主角第一次开口
assert.equal(intro.heroSeen, true, 'hero should appear on their first line');

while (intro.stepIndex < intro.steps.length - 1) intro.nextStep();
intro.nextStep();
await tick(20);
assert.equal(app.screenManager.currentName, 'storyGame', 'intro should start level 1');
assert.equal(app.audio.getBgmMode(), 'tense', 'quiz scenes should use tense BGM');
app.update(0.016);
app.render();

const game = app.screens.storyGame;
assert.ok(game.run, 'story game should hold a run');
assert.equal(game.run.mode, 'level');
assert.equal(game.run.levelId, 1);
assertGameOptionsLayout(game, 'story level run');
assertInside(game.layout.bubbleRect, 'story question bubble');
assertInside(game.layout.heroRect, 'story hero');
assertInside(game.layout.opponentRect, 'story opponent');
assert.ok(game.layout.heroRect.h >= 160, 'story hero should be large');
assert.ok(
  game.layout.bubbleRect.y >= game.layout.hudBottom - 1,
  'story question bubble should start below the HUD'
);
assert.ok(
  game.layout.bubbleRect.y + game.layout.bubbleRect.h <= game.layout.optionsTop + 1,
  'story question bubble should end before the options'
);
assert.ok(
  game.layout.heroRect.y + game.layout.heroRect.h >= game.layout.bubbleRect.y,
  'story hero should overlap the top of the question bubble'
);
assert.ok(
  game.layout.opponentRect.y + game.layout.opponentRect.h >= game.layout.bubbleRect.y,
  'story opponent should overlap the top of the question bubble'
);
assert.ok(
  game.layout.heroRect.x + game.layout.heroRect.w <= game.layout.opponentRect.x + 1,
  'story hero should stay to the left of the opponent'
);
assert.equal(game.getHeroFrame(3), 0, '3 HP should use the left sprite frame');
assert.equal(game.getHeroFrame(2), 1, '2 HP should use the middle sprite frame');
assert.equal(game.getHeroFrame(1), 2, '1 HP should use the right sprite frame');

// 剧情问题框内的提示渲染分支
game.hintText = '提示：这是一条测试提示，用于验证剧情问题框内的提示展示。';
app.render();
game.hintText = '';

// 回归：剧情页必须把选项卡真正绘制出来
let renderedOptions = 0;
const originalOptionRender = game.optionCards[0].render;
game.optionCards[0].render = function patchedRender(...args) {
  renderedOptions += 1;
  return originalOptionRender.apply(this, args);
};
app.render();
game.optionCards[0].render = originalOptionRender;
assert.ok(renderedOptions > 0, 'story screen must render option cards');

// 必须能通过触摸选项完成答题，而不是只能直接调用 submit
const firstQuestion = game.run.currentQuestion;
const correctCard = game.optionCards.find((card) => card.id === firstQuestion.answerKey);
assert.ok(correctCard, 'a correct option card should exist');
const optionX = correctCard.x + correctCard.w / 2;
const optionY = correctCard.y + correctCard.h / 2;
touchHandlers.start.forEach((handler) =>
  handler({ touches: [{ clientX: optionX, clientY: optionY }] })
);
touchHandlers.end.forEach((handler) =>
  handler({ touches: [], changedTouches: [{ clientX: optionX, clientY: optionY }] })
);
await tick(10);
assert.ok(game.feedback, 'tapping a visible option card should submit an answer');
assert.equal(game.feedback.correct, true);
game.advanceOrFinish();
app.render();

for (let i = 1; i < 10; i += 1) {
  const question = game.run.currentQuestion;
  const result = await game.submit(question.answerKey);
  assert.equal(result.ok, true);
  assert.equal(result.correct, true);
  app.render();
  game.advanceOrFinish();
  if (app.screenManager.currentName === 'result') break;
  app.update(0.016);
  app.render();
}

assert.equal(app.screenManager.currentName, 'result', 'all-correct run should reach result');
assert.equal(app.audio.getBgmMode(), 'relaxed', 'result should return to relaxed BGM');
await tick(10);
app.render();

const result = app.screens.result;
assert.ok(result.claim, 'result should have a claim');
assert.equal(result.claim.score, 280, 'all-correct score must be 280');
assert.equal(result.claim.baseCoins, 660);
assert.equal(result.unlockedCount, 10);
assert.equal(app.databus.getCollectionCount(), 10);
assert.equal(app.profile.coins, 960, 'initial 300 + 660');
assert.equal(app.profile.bestScore, 280);
assert.equal(app.profile.leaderboard.weekBest, 280);
assert.equal(result.isNewBest, true);
assert.equal(result.level && result.level.id, 1, 'level result should know its level');
assert.equal(app.databus.isLevelCompleted(1), true, 'level 1 should be marked completed');
assert.equal(app.databus.getStoryProgress().currentLevel, 2);
assert.equal(result.layoutInfo.isLevel, true);
for (const button of result.buttons) assertInside(button, 'result button');

// 结算幂等：重复 grant 不重复发奖
const coinsBeforeDuplicateClaim = app.profile.coins;
const duplicateClaim = app.databus.grantRunClaim(result.run, result.claim, {
  unlockedCount: result.unlockedCount,
});
assert.equal(duplicateClaim.ok, false);
assert.equal(duplicateClaim.code, 'ALREADY_CLAIMED');
assert.equal(app.profile.coins, coinsBeforeDuplicateClaim);

// 双倍广告
app.profile.lastAdAt = 0;
const doublePromise = result.watchDoubleAd();
await completeMockAd(app);
await doublePromise;
assert.equal(result.run.doubled, true);
assert.equal(result.totalCoins, 1320, 'base 660 doubled');
assert.equal(app.profile.coins, 1620, '960 + another 660');
app.render();
for (const button of result.buttons) assertInside(button, 'result button after double');

// 双倍幂等 + 重复进入结算页
const coinsAfterDouble = app.profile.coins;
const duplicateDouble = app.databus.grantDouble(result.run.id, 660);
assert.equal(duplicateDouble.ok, false);
assert.equal(duplicateDouble.code, 'ALREADY_DOUBLED');
assert.equal(app.profile.coins, coinsAfterDouble);

const coinsBeforeReenter = app.profile.coins;
result.enter({ run: result.run });
await tick(10);
app.render();
assert.equal(app.profile.coins, coinsBeforeReenter, 're-enter result must not grant coins twice');
assert.equal(result.alreadyClaimed, true);
assert.equal(result.totalCoins, 1320, 're-enter should display the stored claim record');

// ------------------------------------------------------------
// 关卡地图：第一章已完成，第二章可挑战，第三章未解锁
// ------------------------------------------------------------
app.showScreen('map');
app.update(0.016);
app.render();
const map = app.screens.map;
assert.equal(map.nodes.length, LEVELS.length);
assert.equal(app.databus.isLevelCompleted(1), true);
assert.equal(map.statusFor(LEVELS[1]), '可挑战', 'level 2 should unlock after level 1');
assert.equal(map.statusFor(LEVELS[2]), '未解锁', 'level 3 should stay locked until level 2');
assertInside(
  {
    x: map.layoutInfo.mapX,
    y: map.layoutInfo.mapY,
    w: map.layoutInfo.mapW,
    h: map.layoutInfo.mapH,
  },
  'map image card'
);
map.openLevel(LEVELS[1]);
app.render();
assert.equal(map.modal.isVisible(), true, 'level 2 should offer a start dialog');
assert.ok(
  map.modal.buttons.some((button) => String(button.label).includes('开始本章')),
  'level 2 dialog should have a start button'
);
map.modal.hide();
map.openLevel(LEVELS[2]);
app.render();
assert.equal(map.modal.isVisible(), true, 'locked level 3 should show an unlock hint');
map.modal.hide();
map.openLevel(LEVELS[0]);
app.render();
assert.equal(map.modal.isVisible(), true, 'level 1 should offer replay');
map.modal.hide();

app.showScreen('home');
app.render();
assert.equal(app.screens.home.storyButton.label, '开始游戏');
const homeAfterStory = app.screens.home.layoutInfo;
assert.ok(homeAfterStory.heroRect, 'home should show the hero after the story has started');
assertInside(homeAfterStory.heroRect, 'home hero after story start');

// ------------------------------------------------------------
// 其他页面渲染
// ------------------------------------------------------------
app.showScreen('collection');
app.update(0.016);
app.render();
const collection = app.screens.collection;
collection.switchFilter('unlocked');
app.render();
assert.equal(collection.filteredQuestions.length, 10);
collection.openDetail(QUESTIONS[0]);
app.render();
assert.equal(collection.detailModal.isVisible(), true);
collection.detailModal.hide();
assertInside(
  { x: collection.scroll.x, y: collection.scroll.y, w: collection.scroll.w, h: collection.scroll.h },
  'collection scroll'
);

app.showScreen('leaderboard', { period: 'week' });
app.update(0.016);
app.render();
assert.equal(app.screens.leaderboard.period, 'week');
assert.ok(app.screens.leaderboard.data.entries.length > 0);

app.showScreen('shop');
app.update(0.016);
app.render();
const shop = app.screens.shop;
app.databus.profile.coins = 5000;
shop.buySkin(SKINS[1]);
assert.ok(app.profile.ownedSkins.includes(SKINS[1].id));
assert.equal(app.profile.equippedSkin, SKINS[1].id);
shop.openSkinModal(SKINS[2]);
app.render();
shop.modal.hide();
for (const card of shop.cards) {
  assertInside({ x: card.x, y: card.y, w: card.w, h: card.h }, 'shop card');
}

app.showScreen('settings');
app.update(0.016);
app.render();
const settings = app.screens.settings;
const soundRow = settings.rows.find((row) => row.key === 'sound');
settings.handleRow(soundRow);
assert.equal(app.profile.settings.sound, false);
const bgmRow = settings.rows.find((row) => row.key === 'bgm');
assert.equal(app.profile.settings.bgm, true, 'background music should be on by default');
settings.handleRow(bgmRow);
assert.equal(app.profile.settings.bgm, false);
settings.openNicknameModal();
assert.equal(app.profile.nickname, '新昵称');
const privacyRow = settings.rows.find((row) => row.key === 'privacy');
settings.handleRow(privacyRow);
app.render();
assert.equal(settings.modal.isVisible(), true);
settings.modal.hide();
for (const row of settings.rows) assertInside(row, 'settings row');

app.showScreen('home');
app.render();

// ------------------------------------------------------------
// 提示 / 死亡 / 广告复活 / 加时
// ------------------------------------------------------------
await app.startClassicRun();
assert.equal(app.screenManager.currentName, 'game');
assert.equal(app.audio.getBgmMode(), 'tense', 'classic quiz should use tense BGM');
const game2 = app.screens.game;
app.databus.profile.coins = 1000;

const coinsBeforeHint = app.profile.coins;
game2.openHintModal();
app.render();
assert.equal(game2.modal.isVisible(), true);
game2.hintByCoin();
assert.equal(game2.run.hintsUsed, 1);
assert.equal(app.profile.coins, coinsBeforeHint - 100, 'coin hint should cost 100');
// 实际流程中提示弹窗由按钮 wrapper 关闭；这里直接调用方法后手动关闭
game2.modal.hide();
app.render();

let loops = 0;
while (game2.run.status !== RUN_PHASE.DEAD && loops < 10) {
  const question = game2.run.currentQuestion;
  const wrong = question.options.find((option) => option.id !== question.answerKey);
  assert.ok(wrong, 'should have a wrong option');
  await game2.submit(wrong.id);
  if (game2.run.status === RUN_PHASE.DEAD) break;
  game2.advanceOrFinish();
  loops += 1;
}
assert.equal(game2.run.status, RUN_PHASE.DEAD, 'three wrong answers should end the run');
// 复活弹窗在创建按钮时就会判断广告是否可用，所以先清除冷却再打开
app.profile.lastAdAt = 0;
game2.openReviveModal();
app.render();
assert.equal(game2.modal.isVisible(), true);

// 走真实的“点击弹窗中的看广告复活按钮”流程
const adReviveButton = game2.modal.buttons.find((button) =>
  String(button.label).includes('看广告复活')
);
assert.ok(adReviveButton, 'revive modal should have an ad revive button');
const btnX = adReviveButton.x + adReviveButton.w / 2;
const btnY = adReviveButton.y + adReviveButton.h / 2;
touchHandlers.start.forEach((handler) =>
  handler({ touches: [{ clientX: btnX, clientY: btnY }] })
);
touchHandlers.end.forEach((handler) =>
  handler({ touches: [], changedTouches: [{ clientX: btnX, clientY: btnY }] })
);
await tick(10);
assert.equal(app.mockAd.isVisible(), true, 'mock ad should be showing');
// 广告播放期间，答题页帧循环不应把复活弹窗重新打开
app.update(0.016);
assert.equal(
  game2.modal.isVisible(),
  false,
  'revive modal must stay closed while the ad is playing'
);

await completeMockAd(app);
await tick(10);
assert.equal(
  game2.modal.isVisible(),
  false,
  'revive modal must remain closed after a successful ad revive'
);
assert.equal(game2.run.revivesUsed, 1);
assert.equal(game2.run.lives, 1);
assert.equal(game2.run.status, RUN_PHASE.PLAYING);
app.render();

// 加时：先人为把当前计时器设为 4 秒，再完整看完广告
app.profile.lastAdAt = 0;
game2.timer.start(4);
game2.remainingSec = 4;
game2.extendWasVisible = false;
game2.updateActionButtons();
const beforeExtend = game2.timer.getRemainingSec();
const extendPromise = game2.useExtendFlow();
await completeMockAd(app);
await extendPromise;
assert.equal(game2.run.extendsUsed, 1);
assert.ok(game2.timer.getRemainingSec() > beforeExtend, 'extend should add 5 seconds');

// 暂停弹窗
game2.openPauseModal();
app.render();
assert.equal(game2.modal.isVisible(), true);
game2.modal.hide();
game2.resumeTimerIfPlaying();

// ------------------------------------------------------------
// 隐藏 / 显示生命周期
// ------------------------------------------------------------
if (game2.timer) game2.timer.pause();
hideHandlers.forEach((handler) => handler());
showHandlers.forEach((handler) => handler());
app.render();

// ------------------------------------------------------------
// 快照恢复：中断后首页“继续上一局”
// ------------------------------------------------------------
app.persistRun(game2.run, 5000);
const runIdBeforeResume = game2.run.id;
app.showScreen('home');
app.render();
app.resumeRun();
app.render();
assert.equal(app.screenManager.currentName, 'game', 'resume should return to game');
assert.equal(app.screens.game.run.id, runIdBeforeResume, 'resume should restore the same run');
if (app.screens.game.timer) app.screens.game.timer.stop();

// ------------------------------------------------------------
// 最坏布局：BOSS 图片题（小屏重点验证选项不与底部按钮重叠）
// ------------------------------------------------------------
if (game2.timer) game2.timer.stop();
const bossImage = QUESTIONS.find((question) => question.type === 'image' && question.isBoss);
assert.ok(bossImage, 'question bank should have a boss image question');
const filler = QUESTIONS.filter((question) => question.id !== bossImage.id).slice(0, 9);
const stressRun = new RunEngine({
  questions: [...filler, bossImage],
  config: app.config,
});
stressRun.index = 9;
game2.run = stressRun;
game2.feedback = null;
game2.busy = false;
game2.startQuestion();
app.render();
assert.equal(game2.run.currentQuestion.type, 'image');
assert.equal(game2.run.currentQuestion.isBoss, true);
assertGameOptionsLayout(game2, 'boss image layout');
if (game2.timer) game2.timer.stop();
app.databus.clearSnapshot();

// ------------------------------------------------------------
// 剧情关卡快照恢复：应回到 storyGame 而不是普通 game
// ------------------------------------------------------------
await app.startLevelRun(1);
assert.equal(app.screenManager.currentName, 'storyGame');
const storyRunForResume = app.screens.storyGame.run;
app.persistRun(storyRunForResume, 5000);
app.showScreen('home');
app.resumeRun();
app.render();
assert.equal(app.screenManager.currentName, 'storyGame', 'story resume should use storyGame');
assert.equal(app.screens.storyGame.run.id, storyRunForResume.id);
if (app.screens.storyGame.timer) app.screens.storyGame.timer.stop();
app.databus.clearSnapshot();

// ------------------------------------------------------------
// 清除数据
// ------------------------------------------------------------
app.clearAllData();
assert.equal(app.profile.coins, 300);
assert.equal(app.databus.getCollectionCount(), 0);
assert.equal(app.screenManager.currentName, 'home');
app.render();

// ------------------------------------------------------------
// 第二、三章：剧情、专属题池、顺序解锁与通关
// ------------------------------------------------------------
async function finishStoryLevel(gameScreen) {
  for (let i = 0; i < 10; i += 1) {
    const question = gameScreen.run.currentQuestion;
    const answerResult = await gameScreen.submit(question.answerKey);
    assert.equal(answerResult.correct, true);
    gameScreen.advanceOrFinish();
    if (app.screenManager.currentName === 'result') break;
    app.update(0.016);
    app.render();
  }
  assert.equal(app.screenManager.currentName, 'result', 'story level should reach result');
  await tick(10);
  app.render();
  return app.screens.result;
}

function advanceIntro(intro) {
  while (intro.stepIndex < intro.steps.length - 1) intro.nextStep();
  intro.nextStep();
}

// 第一章已完成进度（模拟历史存档），第二章应解锁、第三章仍锁定
const story = app.databus.ensureStory();
story.completedLevels[1] = {
  completedAt: Date.now(),
  score: 280,
  correct: 10,
  durationMs: 0,
  bestScore: 280,
};
story.currentLevel = 2;
app.databus.save();

app.showScreen('map');
app.update(0.016);
app.render();
const mapAfterLevel1 = app.screens.map;
assert.equal(mapAfterLevel1.statusFor(LEVELS[1]), '可挑战');
assert.equal(mapAfterLevel1.statusFor(LEVELS[2]), '未解锁');
assert.equal(mapAfterLevel1.statusFor(LEVELS[3]), '未解锁', 'library should stay locked until chapter 3');
mapAfterLevel1.openLevel(LEVELS[1]);
app.render();
assert.equal(mapAfterLevel1.modal.isVisible(), true);
assert.ok(
  mapAfterLevel1.modal.buttons.some((button) => String(button.label).includes('开始本章')),
  'level 2 dialog should have a start button'
);
mapAfterLevel1.modal.hide();
mapAfterLevel1.openLevel(LEVELS[2]);
app.render();
assert.equal(mapAfterLevel1.modal.isVisible(), true, 'locked level 3 should show a hint');
mapAfterLevel1.modal.hide();

// 第二章开场：芬姨登场
app.showScreen('levelIntro', { levelId: 2 });
await tick(10);
const intro2 = app.screens.levelIntro;
assert.equal(intro2.level.id, 2);
assert.equal(intro2.opponentName, '芬姨');
assert.equal(intro2.steps.length, LEVEL2_INTRO.length);
assert.equal(intro2.heroSeen, false);
assert.equal(intro2.opponentSeen, false);
intro2.nextStep();
assert.equal(intro2.opponentSeen, false);
intro2.nextStep();
assert.equal(intro2.opponentSeen, true, 'Fen Yi should appear on her first line');
intro2.nextStep();
assert.equal(intro2.heroSeen, true, 'hero should appear on their first line');
assertInside(intro2.layoutInfo.opponentRect, 'level 2 intro portrait');
advanceIntro(intro2);
await tick(20);

assert.equal(app.screenManager.currentName, 'storyGame');
assert.equal(app.audio.getBgmMode(), 'tense');
const level2Game = app.screens.storyGame;
assert.equal(level2Game.run.levelId, 2);
assert.equal(level2Game.level.speaker, '芬姨');
assert.equal(level2Game.opponentName, '芬姨');
assertInside(level2Game.layout.opponentRect, 'level 2 question portrait');
assert.deepEqual(
  level2Game.run.questions.map((question) => question.difficulty),
  [1, 1, 1, 2, 2, 2, 2, 3, 3, 3],
  'level 2 should follow the 3/4/3 plan'
);
assert.equal(level2Game.run.questions[9].isBoss, true, 'level 2 last question should be BOSS');
for (const question of level2Game.run.questions) {
  assert.ok(
    LEVELS[1].questionPool.includes(question.id),
    `level 2 question ${question.id} should come from its pool`
  );
}
app.render();

const result2 = await finishStoryLevel(level2Game);
assert.equal(result2.level.id, 2);
assert.equal(result2.claim.score, 280);
assert.equal(app.databus.isLevelCompleted(2), true);
assert.equal(app.databus.getStoryProgress().currentLevel, 3);

app.showScreen('map');
app.render();
assert.equal(app.screens.map.statusFor(LEVELS[2]), '可挑战', 'level 3 should unlock after level 2');
app.screens.map.openLevel(LEVELS[2]);
app.render();
assert.equal(app.screens.map.modal.isVisible(), true);
assert.ok(
  app.screens.map.modal.buttons.some((button) => String(button.label).includes('开始本章')),
  'level 3 dialog should have a start button'
);
app.screens.map.modal.hide();

// 第三章开场：李老师登场
app.showScreen('levelIntro', { levelId: 3 });
await tick(10);
const intro3 = app.screens.levelIntro;
assert.equal(intro3.level.id, 3);
assert.equal(intro3.opponentName, '李老师');
assert.equal(intro3.steps.length, LEVEL3_INTRO.length);
intro3.nextStep();
assert.equal(intro3.opponentSeen, false);
intro3.nextStep();
assert.equal(intro3.opponentSeen, true, 'Teacher Li should appear on his first line');
intro3.nextStep();
assert.equal(intro3.heroSeen, true);
assertInside(intro3.layoutInfo.opponentRect, 'level 3 intro portrait');
advanceIntro(intro3);
await tick(20);

assert.equal(app.screenManager.currentName, 'storyGame');
const level3Game = app.screens.storyGame;
assert.equal(level3Game.run.levelId, 3);
assert.equal(level3Game.level.speaker, '李老师');
assert.equal(level3Game.opponentName, '李老师');
assertInside(level3Game.layout.opponentRect, 'level 3 question portrait');
assert.deepEqual(
  level3Game.run.questions.map((question) => question.difficulty),
  [1, 1, 1, 2, 2, 2, 2, 3, 3, 3],
  'level 3 should follow the 3/4/3 plan'
);
assert.equal(level3Game.run.questions[9].isBoss, true, 'level 3 last question should be BOSS');
for (const question of level3Game.run.questions) {
  assert.ok(
    LEVELS[2].questionPool.includes(question.id),
    `level 3 question ${question.id} should come from its pool`
  );
}
app.render();

const result3 = await finishStoryLevel(level3Game);
assert.equal(result3.level.id, 3);
assert.equal(result3.claim.score, 280);
assert.equal(app.databus.isLevelCompleted(3), true);
assert.equal(app.databus.getStoryProgress().currentLevel, 4);

app.showScreen('map');
app.render();
assert.equal(app.screens.map.statusFor(LEVELS[2]), '已通关');
assert.equal(app.screens.map.statusFor(LEVELS[3]), '可挑战', 'library should unlock after chapter 3');
app.screens.map.openLevel(LEVELS[3]);
app.render();
assert.equal(app.screens.map.modal.isVisible(), true);
assert.ok(
  app.screens.map.modal.buttons.some((button) => String(button.label).includes('开始本章')),
  'level 4 dialog should have a start button'
);
app.screens.map.modal.hide();

// 第四章开场：馆长登场
assert.equal(LEVELS[3].available, true, 'library chapter should be available');
assert.ok(
  LEVELS[3].questionPool.length >= 10,
  'level 4 pool should have enough questions for the 3/4/3 plan'
);
for (const id of LEVELS[3].questionPool) {
  assert.ok(
    !LEVELS[1].questionPool.includes(id) && !LEVELS[2].questionPool.includes(id),
    `level 4 question ${id} should not repeat earlier chapter pools`
  );
}
app.showScreen('levelIntro', { levelId: 4 });
await tick(10);
const intro4 = app.screens.levelIntro;
assert.equal(intro4.level.id, 4);
assert.equal(intro4.opponentName, '馆长');
assert.equal(intro4.steps.length, LEVEL4_INTRO.length);
assert.equal(intro4.heroSeen, false);
assert.equal(intro4.opponentSeen, false);
intro4.nextStep();
assert.equal(intro4.opponentSeen, false);
intro4.nextStep();
assert.equal(intro4.opponentSeen, false);
intro4.nextStep();
assert.equal(intro4.opponentSeen, true, 'curator should appear on his first line');
intro4.nextStep();
assert.equal(intro4.heroSeen, true, 'hero should appear on their first line');
assertInside(intro4.layoutInfo.opponentRect, 'level 4 intro portrait');
advanceIntro(intro4);
await tick(20);

assert.equal(app.screenManager.currentName, 'storyGame');
const level4Game = app.screens.storyGame;
assert.equal(level4Game.run.levelId, 4);
assert.equal(level4Game.level.speaker, '馆长');
assert.equal(level4Game.opponentName, '馆长');
assertInside(level4Game.layout.opponentRect, 'level 4 question portrait');
assert.deepEqual(
  level4Game.run.questions.map((question) => question.difficulty),
  [1, 1, 1, 2, 2, 2, 2, 3, 3, 3],
  'level 4 should follow the 3/4/3 plan'
);
assert.equal(level4Game.run.questions[9].isBoss, true, 'level 4 last question should be BOSS');
for (const question of level4Game.run.questions) {
  assert.ok(
    LEVELS[3].questionPool.includes(question.id),
    `level 4 question ${question.id} should come from its pool`
  );
}
app.render();

const result4 = await finishStoryLevel(level4Game);
assert.equal(result4.level.id, 4);
assert.equal(result4.claim.score, 280);
assert.equal(app.databus.isLevelCompleted(4), true);
assert.equal(app.databus.getStoryProgress().currentLevel, 5);

app.showScreen('map');
app.render();
assert.equal(app.screens.map.statusFor(LEVELS[3]), '已通关');

app.showScreen('home');
app.render();
assert.equal(app.screens.home.storyButton.label, '开始游戏');

// ------------------------------------------------------------
// 淘汰画面：死亡后选择不复活，先进入淘汰页，再进入结算
// ------------------------------------------------------------
await app.startClassicRun();
const eliminatedGame = app.screens.game;
let eliminatedLoops = 0;
while (eliminatedGame.run.status !== RUN_PHASE.DEAD && eliminatedLoops < 10) {
  const question = eliminatedGame.run.currentQuestion;
  const wrong = question.options.find((option) => option.id !== question.answerKey);
  await eliminatedGame.submit(wrong.id);
  if (eliminatedGame.run.status === RUN_PHASE.DEAD) break;
  eliminatedGame.advanceOrFinish();
  eliminatedLoops += 1;
}
assert.equal(eliminatedGame.run.status, RUN_PHASE.DEAD);
eliminatedGame.deadRevealAt = 0;
app.profile.lastAdAt = 0;
eliminatedGame.openReviveModal();
app.render();
const declineButton = eliminatedGame.modal.buttons.find((button) =>
  String(button.label).includes('放弃复活')
);
assert.ok(declineButton, 'revive modal should offer decline');
const declineX = declineButton.x + declineButton.w / 2;
const declineY = declineButton.y + declineButton.h / 2;
touchHandlers.start.forEach((handler) =>
  handler({ touches: [{ clientX: declineX, clientY: declineY }] })
);
touchHandlers.end.forEach((handler) =>
  handler({ touches: [], changedTouches: [{ clientX: declineX, clientY: declineY }] })
);
await tick(10);
assert.equal(app.screenManager.currentName, 'eliminated', 'declining revive should open elimination screen');
app.render();
const eliminated = app.screens.eliminated;
assert.ok(eliminated.layoutInfo.heroRect, 'elimination screen should have a hero');
assertInside(eliminated.layoutInfo.heroRect, 'elimination hero');
assertInside(eliminated.layoutInfo.buttonRect, 'elimination button');
const reviewButton = eliminated.button;
const reviewX = reviewButton.x + reviewButton.w / 2;
const reviewY = reviewButton.y + reviewButton.h / 2;
touchHandlers.start.forEach((handler) =>
  handler({ touches: [{ clientX: reviewX, clientY: reviewY }] })
);
touchHandlers.end.forEach((handler) =>
  handler({ touches: [], changedTouches: [{ clientX: reviewX, clientY: reviewY }] })
);
await tick(10);
assert.equal(app.screenManager.currentName, 'result', 'elimination review should lead to result');

console.log('app-smoke.test: PASS');
console.log(
  JSON.stringify(
    {
      initialCoins: 300,
      allCorrectScore: 280,
      unlocked: 10,
      pagesRendered: ['home', 'levelIntro', 'storyGame', 'eliminated', 'result', 'map', 'collection', 'leaderboard', 'shop', 'settings'],
      storyLevel1: true,
      storyLevel2: true,
      storyLevel3: true,
      storyLevel4: true,
      levelMap: true,
      hintCoinFlow: true,
      adReviveFlow: true,
      eliminationFlow: true,
      extendFlow: true,
      doubleFlow: true,
      snapshotResume: true,
      bgmScenes: true,
      clearData: true,
    },
    null,
    2
  )
);

process.exit(0);
