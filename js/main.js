import { APP_VERSION, RUN_PHASE } from './core/types.js';
import RunEngine from './core/run-engine.js';
import { getLevelById, isLevelUnlocked } from './data/levels.js';
import DataBus from './databus.js';
import { ctx, SCREEN_HEIGHT, SCREEN_WIDTH } from './render.js';
import Background from './runtime/background.js';
import CollectionScreen from './screens/collection-screen.js';
import EliminatedScreen from './screens/eliminated-screen.js';
import GameScreen from './screens/game-screen.js';
import HomeScreen from './screens/home-screen.js';
import LeaderboardScreen from './screens/leaderboard-screen.js';
import LevelIntroScreen from './screens/level-intro-screen.js';
import MapScreen from './screens/map-screen.js';
import ResultScreen from './screens/result-screen.js';
import ScreenManager from './screens/screen-manager.js';
import SettingsScreen from './screens/settings-screen.js';
import ShopScreen from './screens/shop-screen.js';
import StoryGameScreen from './screens/story-game-screen.js';
import { analytics } from './services/analytics.js';
import AdManager from './services/ad-manager.js';
import audio from './services/audio.js';
import { getConfig } from './services/config.js';
import * as api from './services/api.js';
import { shareHome as doShareHome, shareScore as doShareScore, showShareMenu } from './services/share.js';
import * as storage from './services/storage.js';
import MockAdOverlay from './ui/mock-ad-overlay.js';
import Toast from './ui/toast.js';

const MODE_CLASSIC = 'classic';

export default class Main {
  constructor() {
    this.config = getConfig();
    storage.loadMeta();
    const loadedProfile = storage.loadProfile();
    const loadedSnapshot = storage.loadSnapshot();
    this.launchOptions = wx.getLaunchOptionsSync ? wx.getLaunchOptionsSync() : {};
    this.launchQuery = (this.launchOptions && this.launchOptions.query) || {};

    this.mockAd = new MockAdOverlay();
    this.toast = new Toast();
    this.audio = audio;
    this.audio.init(loadedProfile.settings);
    this.audio.setBgmScene('home');
    this.analytics = analytics;
    this.analytics.track('app_launch', {
      scene: this.launchOptions ? this.launchOptions.scene : '',
      query: this.launchQuery,
      version: APP_VERSION,
      isFirst: !loadedProfile.totalRuns,
    });

    this.adManager = new AdManager({
      config: this.config,
      mockAd: this.mockAd,
      analytics: this.analytics,
    });

    this.databus = new DataBus({
      profile: loadedProfile,
      config: this.config,
      snapshot: loadedSnapshot,
      launchQuery: this.launchQuery,
    });
    GameGlobal.databus = this.databus;

    this.background = new Background();
    this.time = 0;
    this.lastFrameAt = 0;
    this.rafId = 0;
    this.lastTouch = null;
    this.firstInteraction = false;

    this.screens = {
      home: new HomeScreen(this),
      levelIntro: new LevelIntroScreen(this),
      map: new MapScreen(this),
      game: new GameScreen(this),
      storyGame: new StoryGameScreen(this),
      eliminated: new EliminatedScreen(this),
      result: new ResultScreen(this),
      collection: new CollectionScreen(this),
      leaderboard: new LeaderboardScreen(this),
      shop: new ShopScreen(this),
      settings: new SettingsScreen(this),
    };
    this.screenManager = new ScreenManager(this, this.screens);

    this.bindEvents();
    showShareMenu();
    this.screenManager.navigate('home');
    this.startLoop();
  }

  get profile() {
    return this.databus.profile;
  }

  get theme() {
    return this.databus.getTheme();
  }

  bindEvents() {
    wx.onTouchStart(this.handleTouchStart.bind(this));
    wx.onTouchMove(this.handleTouchMove.bind(this));
    wx.onTouchEnd(this.handleTouchEnd.bind(this));
    if (wx.onTouchCancel) wx.onTouchCancel(this.handleTouchCancel.bind(this));
    wx.onHide(this.handleHide.bind(this));
    wx.onShow(this.handleShow.bind(this));
  }

  startLoop() {
    const loop = (timestamp) => {
      const now = typeof timestamp === 'number' ? timestamp : Date.now();
      if (!this.lastFrameAt) this.lastFrameAt = now;
      const dt = Math.min(0.05, Math.max(0, (now - this.lastFrameAt) / 1000));
      this.lastFrameAt = now;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  update(dt) {
    this.time += dt;
    this.background.update(dt);
    this.mockAd.update();
    this.screenManager.update(dt);
  }

  render() {
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    const theme = this.theme;
    this.background.render(ctx, theme, this.time);

    const current = this.screenManager.current;
    const elapsed = current ? Date.now() - current.enterAt : 999;
    const alpha = Math.min(1, elapsed / 180);
    ctx.save();
    ctx.globalAlpha = alpha;
    this.screenManager.render(ctx);
    ctx.restore();

    this.toast.render(ctx, theme);
    this.mockAd.render(ctx, theme);
  }

  firstTouch(event) {
    if (!event) return null;
    const list = event.touches && event.touches.length ? event.touches : event.changedTouches;
    if (!list || !list.length) return null;
    const touch = list[0];
    return {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  handleTouchStart(event) {
    this.audio.unlock();
    this.firstInteraction = true;
    const touch = this.firstTouch(event);
    if (!touch) return;
    this.lastTouch = touch;
    if (this.mockAd.isVisible()) {
      this.mockAd.onTouchStart(touch.x, touch.y);
      return;
    }
    this.screenManager.onTouchStart(touch.x, touch.y);
  }

  handleTouchMove(event) {
    const touch = this.firstTouch(event);
    if (!touch) return;
    this.lastTouch = touch;
    if (this.mockAd.isVisible()) return;
    this.screenManager.onTouchMove(touch.x, touch.y);
  }

  handleTouchEnd(event) {
    const touch = this.firstTouch(event) || this.lastTouch;
    if (!touch) return;
    this.lastTouch = null;
    if (this.mockAd.isVisible()) {
      this.mockAd.onTouchEnd(touch.x, touch.y);
      return;
    }
    this.screenManager.onTouchEnd(touch.x, touch.y);
  }

  handleTouchCancel(event) {
    const touch = this.firstTouch(event) || this.lastTouch;
    if (!touch) return;
    this.lastTouch = null;
    if (this.mockAd.isVisible()) {
      this.mockAd.onTouchEnd(touch.x, touch.y);
      return;
    }
    this.screenManager.onTouchEnd(touch.x, touch.y);
  }

  handleHide() {
    this.screenManager.onHide();
    this.audio.pauseBgm();
    this.analytics.flush();
  }

  handleShow() {
    this.databus.ensurePeriods();
    this.audio.unlock();
    this.screenManager.onShow();
  }

  showScreen(name, params = {}) {
    this.screenManager.navigate(name, params);
  }

  goHome() {
    this.databus.ensurePeriods();
    this.showScreen('home');
  }

  async startClassicRun() {
    if (this.databus.hasSnapshot()) {
      this.databus.clearSnapshot();
    }
    const result = await api.startRun({ mode: MODE_CLASSIC, profile: this.profile });
    if (!result.ok) {
      this.toast.show('开局失败，请重试');
      return;
    }
    this.databus.setRun(result.run);
    this.databus.clearSnapshot();
    this.analytics.track('run_start', {
      mode: MODE_CLASSIC,
      runId: result.run.id,
      questionIds: result.run.questionIds,
    });
    this.audio.play('click');
    this.showScreen('game', { run: result.run });
  }

  async startLevelRun(levelId) {
    const level = getLevelById(levelId);
    if (!level || !level.available) {
      this.toast.show('该关卡暂未开放');
      return;
    }
    if (!isLevelUnlocked(level.id, this.databus.getStoryProgress())) {
      this.toast.show(level.unlockHint || '请先完成上一章');
      return;
    }

    const result = await api.startRun({
      mode: 'level',
      profile: this.profile,
      levelId: level.id,
    });
    if (!result.ok) {
      this.toast.show('关卡开局失败，请重试');
      return;
    }

    this.databus.setRun(result.run);
    this.databus.clearSnapshot();
    this.databus.markStoryStarted();
    this.analytics.track('level_start', {
      levelId: level.id,
      runId: result.run.id,
      questionIds: result.run.questionIds,
    });
    this.audio.play('click');
    this.showScreen('storyGame', { run: result.run, levelId: level.id });
  }

  resumeRun() {
    const snapshot = this.databus.getSnapshot();
    if (!snapshot || !snapshot.run) {
      this.toast.show('没有可继续的对局');
      return;
    }
    const run = RunEngine.fromJSON(snapshot.run, this.config);
    if (!run) {
      this.databus.clearSnapshot();
      this.toast.show('存档已损坏');
      return;
    }

    this.databus.setRun(run);
    this.analytics.track('run_resume', { runId: run.id, mode: run.mode });

    if (run.status === RUN_PHASE.FINISHED || run.status === RUN_PHASE.ABANDONED) {
      this.databus.clearSnapshot();
      this.showScreen('result', { run });
      return;
    }
    let wasFeedback = false;
    if (run.status === RUN_PHASE.FEEDBACK) {
      wasFeedback = true;
      run.advance();
    }
    const screenName = run.mode === 'level' || run.levelId ? 'storyGame' : 'game';
    this.showScreen(screenName, {
      run,
      // 反馈阶段恢复时直接进入下一题，不能继承上一题的剩余时间
      resumeMs: !wasFeedback && run.status === RUN_PHASE.PLAYING ? snapshot.remainingMs || 0 : 0,
    });
  }

  finishRun(run) {
    // 快照由结算页在成功领取奖励后清除；这里保留，防止结算前被系统杀掉丢失奖励
    this.showScreen('result', { run });
  }

  persistRun(run, remainingMs = 0) {
    if (!run) return;
    this.databus.setRun(run);
    this.databus.setSnapshot({
      run: run.toJSON(),
      remainingMs: Math.max(0, remainingMs || 0),
      savedAt: Date.now(),
    });
  }

  clearSnapshot() {
    this.databus.clearSnapshot();
  }

  onQuestionCorrect(questionId) {
    const unlocked = this.databus.unlockCollection(questionId);
    if (unlocked) {
      this.databus.noteUnlocked();
      this.analytics.track('collection_unlock', { qid: questionId });
    }
    return unlocked;
  }

  async maybeShowInterstitial() {
    try {
      await this.adManager.showInterstitial({
        profile: this.profile,
        runsCompleted: this.profile.firstRuns || 0,
      });
    } catch (error) {
      // ignore
    }
  }

  shareScore(score) {
    this.analytics.track('share_click', { template: 'score', score });
    return doShareScore(score);
  }

  shareHome() {
    this.analytics.track('share_click', { template: 'home' });
    return doShareHome();
  }

  clearAllData() {
    const profile = this.databus.resetAll();
    this.analytics.clear();
    this.audio.setSoundEnabled(profile.settings.sound);
    this.audio.setBgmEnabled(profile.settings.bgm);
    this.audio.setVibrationEnabled(profile.settings.vibration);
    this.toast.show('本地数据已清除');
    this.goHome();
  }
}
