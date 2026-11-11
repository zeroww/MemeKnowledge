import { AD_PLACEMENT } from '../core/types.js';
import { getBeijingDateKey } from '../core/daily.js';
import { saveProfile } from './storage.js';

/**
 * 广告适配层。
 * 业务页面只调用 showRewarded(placement)，不直接接触 wx.createRewardedVideoAd。
 * 默认 Mock；填好广告位 ID 并把 adsEnabled 设为 true 后自动走真实激励视频。
 */
export default class AdManager {
  constructor({ config, mockAd = null, analytics = null }) {
    this.config = config;
    this.mockAd = mockAd;
    this.analytics = analytics;
    this.rewardedAds = {};
    this.pendingResolve = null;
    this.showing = false;
  }

  setConfig(config) {
    this.config = config;
  }

  todayKey() {
    return getBeijingDateKey();
  }

  ensureDaily(profile) {
    const today = this.todayKey();
    if (!profile.adDaily || profile.adDaily.dateKey !== today) {
      profile.adDaily = { dateKey: today, count: 0 };
    }
    return profile.adDaily;
  }

  usageFor(run, placement) {
    if (!run) return 0;
    switch (placement) {
      case AD_PLACEMENT.REVIVE:
        return run.revivesUsed || 0;
      case AD_PLACEMENT.HINT:
        return run.hintsUsed || 0;
      case AD_PLACEMENT.EXTEND:
        return run.extendsUsed || 0;
      case AD_PLACEMENT.DOUBLE:
        return run.doubled ? 1 : 0;
      default:
        return 0;
    }
  }

  canShow(placement, { run, profile }) {
    const cfg = this.config || {};
    const caps = cfg.caps || {};

    if (cfg.killSwitches && cfg.killSwitches.disableAds) {
      return { ok: false, code: 'ADS_DISABLED' };
    }
    if (!run) return { ok: false, code: 'NO_RUN' };

    if ((run.adWatched || 0) >= (caps.rewardedPerRun || 6)) {
      return { ok: false, code: 'RUN_AD_LIMIT' };
    }

    const daily = this.ensureDaily(profile);
    if ((daily.count || 0) >= (caps.rewardedPerDay || 12)) {
      return { ok: false, code: 'DAILY_AD_LIMIT' };
    }

    const cooldown = (caps.adCooldownMs || 5000) - (Date.now() - (profile.lastAdAt || 0));
    if (cooldown > 0) {
      return { ok: false, code: 'AD_COOLDOWN', cooldownMs: cooldown };
    }

    if (placement === AD_PLACEMENT.REVIVE && (run.revivesUsed || 0) >= (caps.revivePerRun || 2)) {
      return { ok: false, code: 'REVIVE_LIMIT' };
    }
    if (placement === AD_PLACEMENT.HINT && (run.hintsUsed || 0) >= (caps.hintPerRun || 2)) {
      return { ok: false, code: 'HINT_LIMIT' };
    }
    if (placement === AD_PLACEMENT.EXTEND && (run.extendsUsed || 0) >= (caps.extendPerRun || 1)) {
      return { ok: false, code: 'EXTEND_LIMIT' };
    }
    if (placement === AD_PLACEMENT.DOUBLE && (!run.isFinished || run.doubled)) {
      return { ok: false, code: 'DOUBLE_LIMIT' };
    }

    return { ok: true };
  }

  /**
   * 展示激励视频。返回 { ok: true } 表示完整观看；失败时调用方应走金币/放弃兜底。
   */
  async showRewarded(placement, { run, profile }) {
    if (this.showing) return { ok: false, code: 'BUSY' };

    const check = this.canShow(placement, { run, profile });
    if (!check.ok) return check;

    this.showing = true;
    const useMock = !this.config.adsEnabled || this.config.mockAds;

    if (this.analytics) {
      this.analytics.track('ad_request', {
        placement,
        mock: useMock,
        runAdWatched: run.adWatched,
        dailyCount: this.ensureDaily(profile).count,
      });
    }

    let completed = false;
    try {
      if (useMock) {
        completed = this.mockAd ? await this.mockAd.show(placement) : true;
      } else {
        completed = await this.showRealRewarded(placement);
      }
    } catch (error) {
      completed = false;
    } finally {
      this.showing = false;
    }

    if (!completed) {
      if (this.analytics) this.analytics.track('ad_close', { placement, isEnded: false });
      return { ok: false, code: 'AD_NOT_COMPLETED' };
    }

    run.noteAdWatched();
    const daily = this.ensureDaily(profile);
    daily.count += 1;
    profile.lastAdAt = Date.now();
    saveProfile(profile);

    if (this.analytics) {
      this.analytics.track('ad_complete', {
        placement,
        isEnded: true,
        runAdWatched: run.adWatched,
        dailyCount: daily.count,
      });
    }

    return {
      ok: true,
      adWatched: run.adWatched,
      dailyCount: daily.count,
      mock: useMock,
    };
  }

  showRealRewarded(placement) {
    return new Promise((resolve) => {
      const ad = this.ensureRealAd(placement);
      if (!ad) {
        resolve(false);
        return;
      }

      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        this.pendingResolve = null;
        resolve(value);
      };
      this.pendingResolve = finish;

      ad.show().catch(() => {
        ad.load()
          .then(() => ad.show())
          .catch(() => finish(false));
      });
    });
  }

  ensureRealAd(placement) {
    if (this.rewardedAds[placement]) return this.rewardedAds[placement];

    const unitId = this.config.adUnits && this.config.adUnits[placement];
    if (!unitId || unitId.includes('xxxxxxxx')) return null;

    try {
      const ad = wx.createRewardedVideoAd({ adUnitId: unitId });
      ad.onClose((res) => {
        const finish = this.pendingResolve;
        this.pendingResolve = null;
        if (finish) finish(!!(res && res.isEnded));
      });
      ad.onError((error) => {
        if (this.analytics) {
          this.analytics.track('ad_error', {
            placement,
            errCode: error ? error.errCode : '',
            errMsg: error ? error.errMsg : '',
          });
        }
        const finish = this.pendingResolve;
        this.pendingResolve = null;
        if (finish) finish(false);
      });
      ad.load().catch(() => {});
      this.rewardedAds[placement] = ad;
      return ad;
    } catch (error) {
      return null;
    }
  }

  /**
   * 结算后插屏。返回是否真正展示。
   */
  async showInterstitial({ profile, runsCompleted }) {
    const cfg = this.config || {};
    const caps = cfg.caps || {};

    if (cfg.killSwitches && cfg.killSwitches.disableInterstitial) {
      return { ok: false, code: 'DISABLED' };
    }
    if (!cfg.features || cfg.features.interstitialEnabled === false) {
      return { ok: false, code: 'DISABLED' };
    }
    if (runsCompleted < (caps.interstitialSkipFirstRuns || 3)) {
      return { ok: false, code: 'FIRST_RUNS' };
    }
    if (runsCompleted % (caps.interstitialEveryRuns || 2) !== 0) {
      return { ok: false, code: 'RUN_INTERVAL' };
    }

    const now = Date.now();
    if (now - (profile.lastInterstitialAt || 0) < (caps.interstitialMinSeconds || 180) * 1000) {
      return { ok: false, code: 'COOLDOWN' };
    }

    profile.lastInterstitialAt = now;
    saveProfile(profile);

    if (!cfg.adsEnabled || cfg.mockAds) {
      if (this.mockAd) {
        await this.mockAd.show(AD_PLACEMENT.INTERSTITIAL, { interstitial: true });
      }
      return { ok: true, mock: true };
    }

    try {
      if (!wx.createInterstitialAd) return { ok: false, code: 'UNSUPPORTED' };
      const unitId = cfg.adUnits && cfg.adUnits.interstitial;
      if (!unitId || unitId.includes('xxxxxxxx')) return { ok: false, code: 'NO_AD_UNIT' };
      const ad = wx.createInterstitialAd({ adUnitId: unitId });
      ad.onError(() => {});
      await ad.show();
      return { ok: true };
    } catch (error) {
      return { ok: false, code: 'AD_ERROR' };
    }
  }
}
