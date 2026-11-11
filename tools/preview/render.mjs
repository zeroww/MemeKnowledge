/**
 * Headless UI renderer for visual review.
 *
 * Usage:
 *   node tools/preview/render.mjs <screen> [mode] [out.png]
 *
 * screens: home | map | intro | game | story | result | collection |
 *          leaderboard | shop | settings
 * modes:   pause | revive | hint | modal | toast | ad
 *
 * Requires @napi-rs/canvas (dev-only). Point CANVAS_MODULE at its entry file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const OUT_DIR = path.join(here, 'shots');

const canvasModulePath =
  process.env.CANVAS_MODULE ||
  path.join(process.env.TEMP || '', 'dsh-canvas', 'node_modules', '@napi-rs', 'canvas', 'index.js');

const { createCanvas, Image, GlobalFonts, loadImage } = await import(
  pathToFileURL(canvasModulePath).href
);

for (const [file, family] of [
  ['C:/Windows/Fonts/msyh.ttc', 'Microsoft YaHei'],
  ['C:/Windows/Fonts/msyhbd.ttc', 'Microsoft YaHei'],
  ['C:/Windows/Fonts/msyh.ttc', 'PingFang SC'],
  ['C:/Windows/Fonts/msyhbd.ttc', 'PingFang SC'],
  ['C:/Windows/Fonts/seguisb.ttf', 'Segoe UI'],
  ['C:/Windows/Fonts/seguiemj.ttf', 'Segoe UI Emoji'],
  ['C:/Windows/Fonts/seguiemj.ttf', 'Apple Color Emoji'],
]) {
  try {
    GlobalFonts.registerFromPath(file, family);
  } catch (error) {
    // optional font
  }
}

const W = Number(process.env.SCREEN_W || 375);
const H = Number(process.env.SCREEN_H || 667);
const DPR = Number(process.env.DPR || 2);

const storage = new Map();
const clone = (value) => JSON.parse(JSON.stringify(value));

globalThis.GameGlobal = globalThis;
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

let canvas = null;
const wx = {
  createCanvas() {
    if (!canvas) canvas = createCanvas(W, H);
    return canvas;
  },
  getWindowInfo() {
    return {
      screenWidth: W,
      screenHeight: H,
      windowWidth: W,
      windowHeight: H,
      pixelRatio: DPR,
      safeArea: { top: 20, bottom: H - 12, left: 0, right: W, width: W, height: H - 32 },
    };
  },
  getSystemInfoSync() {
    return wx.getWindowInfo();
  },
  getMenuButtonBoundingClientRect() {
    return { left: W - 97, right: W - 20, top: 24, bottom: 56, width: 77, height: 32 };
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
  onTouchStart() {},
  onTouchMove() {},
  onTouchEnd() {},
  onTouchCancel() {},
  onHide() {},
  onShow() {},
  showModal(options) {
    if (options && options.success) options.success({ confirm: true, content: '新昵称' });
  },
  showShareMenu() {},
  shareAppMessage() {},
  vibrateShort() {},
  setKeepScreenOn() {},
};
globalThis.wx = wx;

// ---- image bridge: game passes lightweight wrappers, canvas needs native Image ----
const wrapperToNative = new WeakMap();
const probeCtx = createCanvas(4, 4).getContext('2d');
const ctxProto = Object.getPrototypeOf(probeCtx);
const originalDrawImage = ctxProto.drawImage;
ctxProto.drawImage = function patchedDrawImage(image, ...rest) {
  return originalDrawImage.call(this, wrapperToNative.get(image) || image, ...rest);
};

const pendingImages = [];
wx.createImage = function createPreviewImage() {
  const wrapper = { width: 0, height: 0, onload: null, onerror: null };
  let currentSrc = '';
  Object.defineProperty(wrapper, 'src', {
    configurable: true,
    get() {
      return currentSrc;
    },
    set(value) {
      currentSrc = value;
      const absolute = path.isAbsolute(value) ? value : path.join(ROOT, value);
      const task = loadImage(absolute)
        .then((native) => {
          wrapperToNative.set(wrapper, native);
          wrapper.width = native.width;
          wrapper.height = native.height;
          if (wrapper.onload) wrapper.onload();
        })
        .catch((error) => {
          if (wrapper.onerror) wrapper.onerror(error);
        });
      pendingImages.push(task);
    },
  });
  return wrapper;
};

const { default: Main } = await import(pathToFileURL(path.join(ROOT, 'js/main.js')).href);
const api = await import(pathToFileURL(path.join(ROOT, 'js/services/api.js')).href);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function settle(ms = 500) {
  const started = Date.now();
  await Promise.allSettled(pendingImages.slice());
  const remain = ms - (Date.now() - started);
  if (remain > 0) await wait(remain);
}

const app = new Main();
globalThis.__app = app;

if (process.env.SKIN) {
  app.databus.profile.equippedSkin = process.env.SKIN;
}

const levelId = Number(process.env.LEVEL || 1);
if (levelId > 1) {
  const story = app.databus.ensureStory();
  for (let id = 1; id < levelId; id += 1) {
    if (!story.completedLevels[id]) {
      story.completedLevels[id] = { completedAt: Date.now(), score: 280, correct: 10 };
    }
  }
  story.currentLevel = levelId;
}

async function goto(screen, mode) {
  if (screen === 'home') {
    // default screen
  } else if (screen === 'map') {
    app.showScreen('map');
  } else if (screen === 'intro') {
    app.showScreen('levelIntro', { levelId });
  } else if (screen === 'game') {
    if (process.env.RUN_TYPE) {
      const { QUESTIONS } = await import(pathToFileURL(path.join(ROOT, 'js/data/questions.js')).href);
      const ids = QUESTIONS.filter((question) => question.type === process.env.RUN_TYPE)
        .slice(0, 10)
        .map((question) => question.id);
      const started = await api.startRun({ mode: 'classic', profile: app.profile, questionIds: ids });
      if (started.ok) {
        app.databus.setRun(started.run);
        app.showScreen('game', { run: started.run });
      } else {
        await app.startClassicRun();
      }
    } else {
      await app.startClassicRun();
    }
  } else if (screen === 'story') {
    await app.startLevelRun(levelId);
  } else if (screen === 'result') {
    const started = await api.startRun({ mode: 'classic', profile: app.profile });
    const run = started.run;
    app.databus.setRun(run);
    let guard = 0;
    while ((run.status === 'playing' || run.status === 'feedback') && guard < 40) {
      guard += 1;
      if (run.status === 'feedback') {
        run.advance();
        continue;
      }
      await api.submitAnswer(run, run.currentQuestion.answerKey, { elapsedMs: 2400 });
    }
    app.showScreen('result', { run });
  } else if (screen === 'result-level') {
    await app.startLevelRun(levelId);
    const storyGame = app.screens.storyGame;
    const run = storyGame.run;
    if (run) {
      if (run.timer) run.timer.stop?.();
      storyGame.timer?.stop?.();
      let guard = 0;
      while ((run.status === 'playing' || run.status === 'feedback') && guard < 40) {
        guard += 1;
        if (run.status === 'feedback') {
          run.advance();
          continue;
        }
        await api.submitAnswer(run, run.currentQuestion.answerKey, { elapsedMs: 2400 });
      }
      app.showScreen('result', { run });
    }
  } else {
    app.showScreen(screen);
  }

  await settle(700);

  if (mode === 'late' && screen === 'intro') {
    const intro = app.screenManager.current;
    const index = intro.steps.findIndex((step) => step.speaker === intro.opponentName);
    if (index >= 0) {
      intro.stepIndex = index;
      intro.updateReveal();
      intro.layout();
      await settle(320);
    }
  }

  if (mode === 'boss') {
    const gameScreen = app.screenManager.current;
    const run = gameScreen.run;
    if (run) {
      run.index = 9;
      run.lives = 2;
      gameScreen.startQuestion(0);
      await settle(300);
    }
  }

  if (mode === 'revive') {
    const gameScreen = app.screenManager.current;
    const run = gameScreen.run;
    if (run) {
      run.lives = 1;
      const wrong = run.currentOptions.find((option) => option.id !== run.currentQuestion.answerKey);
      await gameScreen.submit(wrong ? wrong.id : null, false);
      await settle(600);
      if (gameScreen.openReviveModal) gameScreen.openReviveModal();
      await settle(320);
    }
  }

  if (mode === 'pause' || mode === 'hint') {
    const gameScreen = app.screenManager.current;
    if (mode === 'pause' && gameScreen.openPauseModal) gameScreen.openPauseModal();
    if (mode === 'revive' && gameScreen.openReviveModal) gameScreen.openReviveModal();
    if (mode === 'hint' && gameScreen.openHintModal) gameScreen.openHintModal();
    await settle(320);
  }
  if (mode === 'modal') {
    const current = app.screenManager.current;
    if (current && current.modal) {
      current.modal.show({
        title: '确认放弃',
        message: '当前进度将不会保存，确定要放弃本局吗？',
        tone: 'danger',
        buttons: [{ label: '取消', style: 'secondary' }, { label: '确认', style: 'danger' }],
      });
      await settle(320);
    }
  }
  if (mode === 'toast') {
    app.toast.show('这是一个提示');
    await settle(240);
  }
  if (mode === 'ad') {
    app.mockAd.show('revive', {});
    await settle(320);
  }
  if (mode === 'feedback' || mode === 'feedback-ok') {
    const gameScreen = app.screenManager.current;
    const run = gameScreen.run;
    if (run && run.currentQuestion) {
      const answerKey = run.currentQuestion.answerKey;
      const optionId =
        mode === 'feedback-ok'
          ? answerKey
          : (run.currentOptions.find((option) => option.id !== answerKey) || { id: answerKey }).id;
      await gameScreen.submit(optionId, false);
      await settle(200);
    }
  }
}

function renderFrame() {
  const current = app.screenManager.current;
  if (current) current.enterAt = Date.now() - 2000;
  app.update(0.016);
  app.render();
}

const screen = process.argv[2] || 'home';
const mode = process.argv[3] || '';
const out = process.argv[4] || '';

await goto(screen, mode);
renderFrame();
fs.mkdirSync(OUT_DIR, { recursive: true });
const file = path.join(OUT_DIR, `${out || `${screen}${mode ? '-' + mode : ''}`}.png`);
fs.writeFileSync(file, canvas.toBuffer('image/png'));
console.log('saved', file);
