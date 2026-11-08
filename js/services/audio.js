/**
 * 音频服务：
 * - 短音效使用 WebAudio 合成。
 * - 背景音乐同样程序化合成，不依赖外部音频文件：
 *   - 对话/首页/地图等场景：轻松、慢节奏的铺底和弦 + 琶音。
 *   - 答题场景（game / storyGame）：低音脉冲 + 心跳 + 高频提示音。
 * - 浏览器/微信自动播放限制：第一次用户交互后 unlock 再启动 BGM。
 */

const TENSE_SCENES = ['game', 'storyGame'];

const RELAXED_CHORDS = [
  { root: 130.81, notes: [261.63, 329.63, 392.0, 493.88] }, // Cmaj7
  { root: 110.0, notes: [220.0, 261.63, 329.63, 392.0] }, // Am7
  { root: 87.31, notes: [174.61, 220.0, 261.63, 349.23] }, // Fmaj7
  { root: 98.0, notes: [196.0, 246.94, 293.66, 392.0] }, // G6
];

const TENSE_CHORDS = [
  { root: 110.0, notes: [110.0, 164.81, 220.0] }, // Am
  { root: 87.31, notes: [87.31, 130.81, 174.61] }, // F
  { root: 130.81, notes: [130.81, 164.81, 196.0] }, // C
  { root: 98.0, notes: [98.0, 146.83, 196.0] }, // G
];

class AudioService {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.bgmEnabled = true;
    this.vibrationEnabled = true;
    this.initialized = false;
    this.unlocked = false;

    this.currentScene = 'home';
    this.bgmMode = '';
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmGain = null;
    this.bgmToken = 0;
    this.bgmBarIndex = 0;
  }

  init(settings = {}) {
    this.soundEnabled = settings.sound !== false;
    this.bgmEnabled = settings.bgm !== false;
    this.vibrationEnabled = settings.vibration !== false;
    this.initialized = true;
    this.ensureContext();
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    try {
      if (wx.createWebAudioContext) {
        this.ctx = wx.createWebAudioContext();
      }
    } catch (error) {
      this.ctx = null;
    }
    return this.ctx;
  }

  unlock() {
    this.ensureContext();
    this.unlocked = true;
    if (this.ctx && this.ctx.state === 'suspended' && this.ctx.resume) {
      try {
        const resumed = this.ctx.resume();
        if (resumed && typeof resumed.catch === 'function') {
          resumed.catch(() => {});
        }
      } catch (error) {
        // ignore
      }
    }
    if (this.bgmEnabled && !this.bgmPlaying) {
      this.startBgm(this.getBgmMode());
    }
  }

  modeForScene(scene) {
    return TENSE_SCENES.includes(scene) ? 'tense' : 'relaxed';
  }

  getBgmMode() {
    return this.modeForScene(this.currentScene);
  }

  setBgmScene(scene) {
    this.currentScene = scene || 'home';
    if (this.bgmEnabled && this.unlocked) {
      this.startBgm(this.getBgmMode());
    }
  }

  // ------------------------------------------------------------
  // 短音效
  // ------------------------------------------------------------
  tone({ freq = 440, duration = 0.1, type = 'sine', volume = 0.04, delay = 0, slideTo = null }) {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !ctx.createOscillator || !ctx.createGain) return;
    try {
      const start = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, start);
      if (slideTo) {
        oscillator.frequency.linearRampToValueAtTime(slideTo, start + duration);
      }

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    } catch (error) {
      // 音频失败静默降级
    }
  }

  play(name) {
    if (!this.soundEnabled) return;
    this.unlock();
    switch (name) {
      case 'click':
        this.tone({ freq: 520, duration: 0.05, type: 'triangle', volume: 0.025 });
        break;
      case 'correct':
        this.tone({ freq: 660, duration: 0.1, type: 'sine', volume: 0.05 });
        this.tone({ freq: 880, duration: 0.12, type: 'sine', volume: 0.045, delay: 0.08 });
        break;
      case 'wrong':
        this.tone({ freq: 190, duration: 0.22, type: 'sawtooth', volume: 0.05, slideTo: 110 });
        break;
      case 'coin':
        this.tone({ freq: 980, duration: 0.06, type: 'square', volume: 0.025 });
        this.tone({ freq: 1380, duration: 0.08, type: 'square', volume: 0.02, delay: 0.06 });
        break;
      case 'unlock':
        this.tone({ freq: 523, duration: 0.1, type: 'sine', volume: 0.04 });
        this.tone({ freq: 659, duration: 0.1, type: 'sine', volume: 0.04, delay: 0.08 });
        this.tone({ freq: 784, duration: 0.14, type: 'sine', volume: 0.04, delay: 0.16 });
        break;
      case 'death':
        this.tone({ freq: 320, duration: 0.4, type: 'sawtooth', volume: 0.045, slideTo: 95 });
        break;
      case 'boss':
        this.tone({ freq: 120, duration: 0.35, type: 'square', volume: 0.035 });
        this.tone({ freq: 90, duration: 0.35, type: 'square', volume: 0.03, delay: 0.18 });
        break;
      case 'revive':
        this.tone({ freq: 440, duration: 0.15, type: 'triangle', volume: 0.04, slideTo: 880 });
        break;
      case 'ad':
        this.tone({ freq: 360, duration: 0.12, type: 'triangle', volume: 0.03 });
        break;
      default:
        this.tone({ freq: 440, duration: 0.06, type: 'triangle', volume: 0.025 });
        break;
    }
  }

  vibrate(type = 'light') {
    if (!this.vibrationEnabled) return;
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type });
    } catch (error) {
      // ignore
    }
  }

  // ------------------------------------------------------------
  // 背景音乐
  // ------------------------------------------------------------
  setSoundEnabled(enabled) {
    this.soundEnabled = !!enabled;
  }

  setBgmEnabled(enabled) {
    this.bgmEnabled = !!enabled;
    if (this.bgmEnabled) {
      if (this.unlocked) this.startBgm(this.getBgmMode());
    } else {
      this.stopBgm();
    }
  }

  setVibrationEnabled(enabled) {
    this.vibrationEnabled = !!enabled;
  }

  /**
   * 旧设置页兼容：music 开关映射到 BGM。
   */
  setMusicEnabled(enabled) {
    this.setBgmEnabled(enabled);
  }

  bgmTone(master, { freq, duration = 0.5, type = 'sine', volume = 0.015, delay = 0, attack = 0.08, release = 0.2 }) {
    if (!master || !this.ctx || !this.ctx.createOscillator || !this.ctx.createGain) return;
    try {
      const ctx = this.ctx;
      const start = ctx.currentTime + delay;
      const dur = Math.max(0.06, duration);
      const attackTime = Math.min(dur * 0.4, Math.max(0.005, attack));
      const releaseTime = Math.min(dur * 0.7, Math.max(0.02, release));
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(Math.max(0.0002, volume), start + attackTime);
      gain.gain.setValueAtTime(
        Math.max(0.0002, volume),
        Math.max(start + attackTime, start + dur - releaseTime)
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + dur + 0.05);
      // 长循环 BGM 需要回收节点，避免连接数持续累积
      const cleanupMs = Math.max(0, (start + dur + 0.12 - ctx.currentTime) * 1000);
      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (error) {
          // ignore
        }
      }, cleanupMs);
    } catch (error) {
      // ignore
    }
  }

  startBgm(mode = this.getBgmMode()) {
    if (!this.bgmEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !ctx.createGain) return;
    if (this.bgmPlaying && this.bgmMode === mode) return;

    this.stopBgmTimersAndFade();
    this.bgmMode = mode;
    this.bgmPlaying = true;
    this.bgmToken += 1;
    this.bgmBarIndex = 0;
    const token = this.bgmToken;

    try {
      const master = ctx.createGain();
      master.gain.value = mode === 'tense' ? 0.8 : 0.9;
      master.connect(ctx.destination);
      this.bgmGain = master;
    } catch (error) {
      this.bgmPlaying = false;
      this.bgmGain = null;
      return;
    }

    const playBar = () => {
      if (!this.bgmPlaying || token !== this.bgmToken || !this.bgmGain) return;
      if (mode === 'tense') this.playTenseBar(this.bgmGain);
      else this.playRelaxedBar(this.bgmGain);
    };

    playBar();
    const barMs = mode === 'tense' ? 1600 : 3200;
    this.bgmTimer = setInterval(() => {
      if (!this.bgmPlaying || token !== this.bgmToken) return;
      this.bgmBarIndex = (this.bgmBarIndex + 1) % 4;
      playBar();
    }, barMs);
  }

  playRelaxedBar(master) {
    const chord = RELAXED_CHORDS[this.bgmBarIndex % RELAXED_CHORDS.length];
    if (!chord) return;

    chord.notes.forEach((freq) => {
      this.bgmTone(master, {
        freq,
        duration: 3.0,
        type: 'sine',
        volume: 0.014,
        attack: 0.35,
        release: 1.1,
      });
    });
    this.bgmTone(master, {
      freq: chord.root,
      duration: 1.8,
      type: 'triangle',
      volume: 0.02,
      attack: 0.03,
      release: 0.7,
    });
    chord.notes.forEach((freq, index) => {
      this.bgmTone(master, {
        freq: freq * 2,
        duration: 0.55,
        type: 'triangle',
        volume: 0.009,
        delay: index * 0.8 + 0.2,
        attack: 0.015,
        release: 0.4,
      });
    });
  }

  playTenseBar(master) {
    const chord = TENSE_CHORDS[this.bgmBarIndex % TENSE_CHORDS.length];
    if (!chord) return;

    // 低频持续音
    this.bgmTone(master, {
      freq: chord.root,
      duration: 1.5,
      type: 'triangle',
      volume: 0.018,
      attack: 0.03,
      release: 0.5,
    });
    this.bgmTone(master, {
      freq: chord.root / 2,
      duration: 1.45,
      type: 'sine',
      volume: 0.012,
      attack: 0.03,
      release: 0.6,
    });

    // 心跳：两次低频重击
    this.bgmTone(master, {
      freq: 62,
      duration: 0.12,
      type: 'sine',
      volume: 0.026,
      attack: 0.005,
      release: 0.08,
    });
    this.bgmTone(master, {
      freq: 55,
      duration: 0.1,
      type: 'sine',
      volume: 0.02,
      delay: 0.18,
      attack: 0.005,
      release: 0.07,
    });

    // 紧张脉冲
    for (let i = 0; i < 4; i += 1) {
      this.bgmTone(master, {
        freq: i % 2 === 0 ? chord.root * 2 : chord.notes[1] * 2,
        duration: 0.1,
        type: 'square',
        volume: 0.008,
        delay: i * 0.4,
        attack: 0.005,
        release: 0.06,
      });
    }

    // 高频提示音
    this.bgmTone(master, {
      freq: 880,
      duration: 0.04,
      type: 'triangle',
      volume: 0.006,
      delay: 0.8,
      attack: 0.005,
      release: 0.03,
    });
    this.bgmTone(master, {
      freq: 1174.66,
      duration: 0.035,
      type: 'triangle',
      volume: 0.004,
      delay: 1.2,
      attack: 0.005,
      release: 0.03,
    });
  }

  stopBgmTimersAndFade() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    const oldGain = this.bgmGain;
    this.bgmGain = null;
    if (oldGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(Math.max(0.0001, oldGain.gain.value), now);
        oldGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
      } catch (error) {
        // ignore
      }
      setTimeout(() => {
        try {
          oldGain.disconnect();
        } catch (error) {
          // ignore
        }
      }, 600);
    }
  }

  stopBgm() {
    this.bgmPlaying = false;
    this.bgmToken += 1;
    this.stopBgmTimersAndFade();
  }

  pauseBgm() {
    if (!this.bgmPlaying) return;
    this.stopBgm();
  }
}

export const audio = new AudioService();
export default audio;
