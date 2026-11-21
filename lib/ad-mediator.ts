'use client';

import type { UiLanguageId } from './market-profiles';

/**
 * High-Yield Smart Hybrid Ad Mediation Engine
 * AdsGram Rewarded Video (Block ID: 61123) + Monetag Rewarded Interstitial (Zone: 12317990)
 *
 * Yield-Maximization Strategy:
 * 1. Environment-Aware Primary Routing:
 *    - Web / Mobile Browser / PWA: Monetag primary (highest global web fill & eCPM), AdsGram backup.
 *    - Telegram Mini App: Dynamic yield routing between AdsGram (61123) and Monetag (12317990).
 * 2. Anti-Fatigue & Fresh-Impression Ping-Pong:
 *    - Rapid consecutive placements (Star Forge locks / training) alternate strictly AdsGram <-> Monetag
 *      so every single impression lands as a fresh, high-eCPM first-view on each network.
 *    - High-value placements prefer AdsGram when fresh (>120s since last AdsGram view), then pivot
 *      to Monetag during AdsGram's frequency-cap window to avoid CPM decay, while maintaining
 *      balanced session impression share across both networks.
 * 3. Adaptive Exponential Cooldown:
 *    - No-fills trigger progressive cooldowns (45s -> 90s -> 180s), instantly reset to 0 on fill,
 *      so healthy inventory is always tried first with near-zero latency.
 * 4. Strict User-Cancel Integrity:
 *    - If the player intentionally closes an ad early, never ambush them with the backup network.
 *    - Silent instant waterfall triggers ONLY on technical load error or no-fill.
 */

export const ADSGRAM_BLOCK_ID = '61123';
export const MONETAG_ZONE_ID = '12317990';
export const IS_MONETAG_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_MONETAG !== 'false';

export type AdPlacementId =
  | 'star_forge_lock'
  | 'star_forge_training'
  | 'crisis_settlement'
  | 'intl_distribution'
  | 'syndicate_mediation'
  | 'emergency_bailout'
  | 'general';

export type AdNetworkId = 'adsgram' | 'monetag' | 'fallback';

export interface RewardedAdResult {
  completed: boolean;
  source: AdNetworkId;
  reason?: 'cancelled' | 'no_fill' | 'busy';
  attempts: AdNetworkId[];
}

interface AdsgramShowPromiseResult {
  done: boolean;
  description?: string;
  state?: 'load' | 'render' | 'playing' | 'destroy' | string;
  error?: boolean;
}

interface AdsgramAdController {
  show: () => Promise<AdsgramShowPromiseResult>;
  destroy?: () => void;
}

interface AdsgramGlobal {
  init: (config: { blockId: string; debug?: boolean }) => AdsgramAdController;
}

declare global {
  interface Window {
    show_12317990?: () => Promise<unknown>;
    Adsgram?: AdsgramGlobal;
  }
}

type LiveNetwork = 'adsgram' | 'monetag';

interface MediatorSessionState {
  lastCompletedNetwork: LiveNetwork | null;
  lastCompletedAt: Record<LiveNetwork, number>;
  cooldownUntil: Record<LiveNetwork, number>;
  impressions: Record<LiveNetwork, number>;
  consecutiveNoFills: Record<LiveNetwork, number>;
  totalNoFills: Record<LiveNetwork, number>;
}

const SESSION_STORAGE_KEY = 'neelyo_ad_mediator_v2';
const BASE_COOLDOWN_MS = 45_000;
const MAX_COOLDOWN_MS = 180_000;
const ADSGRAM_FRESH_WINDOW_MS = 120_000;
const MONETAG_FRESH_WINDOW_MS = 95_000;
const MONETAG_FAST_FAIL_MS = 1_600;

const RAPID_CONSECUTIVE_PLACEMENTS = new Set<AdPlacementId>([
  'star_forge_lock',
  'star_forge_training',
]);

let isAdBusy = false;
let cachedAdsgramController: AdsgramAdController | null = null;

function createEmptySessionState(): MediatorSessionState {
  return {
    lastCompletedNetwork: null,
    lastCompletedAt: { adsgram: 0, monetag: 0 },
    cooldownUntil: { adsgram: 0, monetag: 0 },
    impressions: { adsgram: 0, monetag: 0 },
    consecutiveNoFills: { adsgram: 0, monetag: 0 },
    totalNoFills: { adsgram: 0, monetag: 0 },
  };
}

function readSessionState(): MediatorSessionState {
  if (typeof window === 'undefined') return createEmptySessionState();
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return createEmptySessionState();
    const parsed = JSON.parse(raw) as Partial<MediatorSessionState>;
    return {
      lastCompletedNetwork:
        parsed.lastCompletedNetwork === 'adsgram' ||
        parsed.lastCompletedNetwork === 'monetag'
          ? parsed.lastCompletedNetwork
          : null,
      lastCompletedAt: {
        adsgram: Number(parsed.lastCompletedAt?.adsgram || 0),
        monetag: Number(parsed.lastCompletedAt?.monetag || 0),
      },
      cooldownUntil: {
        adsgram: Number(parsed.cooldownUntil?.adsgram || 0),
        monetag: Number(parsed.cooldownUntil?.monetag || 0),
      },
      impressions: {
        adsgram: Number(parsed.impressions?.adsgram || 0),
        monetag: Number(parsed.impressions?.monetag || 0),
      },
      consecutiveNoFills: {
        adsgram: Number(parsed.consecutiveNoFills?.adsgram || 0),
        monetag: Number(parsed.consecutiveNoFills?.monetag || 0),
      },
      totalNoFills: {
        adsgram: Number(parsed.totalNoFills?.adsgram || 0),
        monetag: Number(parsed.totalNoFills?.monetag || 0),
      },
    };
  } catch {
    return createEmptySessionState();
  }
}

function writeSessionState(state: MediatorSessionState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore private-mode storage restrictions
  }
}

function broadcastAdPlaybackState(open: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('neelyo:ad-state', { detail: { open } })
    );
  } catch {
    // No-op
  }
}

function isRunningInsideTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  const tg = (
    window as Window & {
      Telegram?: { WebApp?: { initData?: string; platform?: string } };
    }
  ).Telegram?.WebApp;

  if (!tg) return false;
  if (typeof tg.initData === 'string' && tg.initData.trim().length > 0) {
    return true;
  }
  if (
    typeof tg.platform === 'string' &&
    tg.platform.length > 0 &&
    tg.platform !== 'unknown'
  ) {
    return true;
  }
  return false;
}

function getOrCreateAdsgramController(): AdsgramAdController | null {
  if (typeof window === 'undefined') return null;
  if (cachedAdsgramController) return cachedAdsgramController;
  if (window.Adsgram && typeof window.Adsgram.init === 'function') {
    try {
      cachedAdsgramController = window.Adsgram.init({
        blockId: ADSGRAM_BLOCK_ID,
      });
      return cachedAdsgramController;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Eagerly initializes AdsGram (61123) and validates Monetag (12317990) readiness
 * right after hydration so the very first rewarded ad opens instantaneously.
 */
export function prewarmAdNetworks(): void {
  if (typeof window === 'undefined') return;
  getOrCreateAdsgramController();
  window.setTimeout(() => {
    getOrCreateAdsgramController();
  }, 1400);
}

async function waitForNetworkSdk(
  network: LiveNetwork,
  maxAttempts = 4
): Promise<boolean> {
  const isReady = () =>
    network === 'adsgram'
      ? Boolean(window.Adsgram && typeof window.Adsgram.init === 'function')
      : IS_MONETAG_ENABLED && typeof window.show_12317990 === 'function';

  if (isReady()) return true;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 160));
    if (isReady()) return true;
  }
  return false;
}

type SingleNetworkOutcome =
  | { status: 'completed' }
  | { status: 'cancelled' }
  | { status: 'no_fill' };

function isAdsgramTechnicalOrNoFill(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return true;
  const res = payload as AdsgramShowPromiseResult & { message?: string };

  if (res.error === true) return true;
  if (res.state === 'load' || res.state === 'render') return true;

  const text = `${res.description || ''} ${res.message || ''}`.toLowerCase();
  if (
    /no\s*ad|no\s*fill|not\s*available|no\s*session|network|timeout|failed|error|init|telegram|blocked/.test(
      text
    )
  ) {
    return true;
  }

  return false;
}

async function tryAdsgram(): Promise<SingleNetworkOutcome> {
  const ready = await waitForNetworkSdk('adsgram', 3);
  if (!ready) return { status: 'no_fill' };

  const controller = getOrCreateAdsgramController();
  if (!controller) return { status: 'no_fill' };

  try {
    const result = await controller.show();
    if (result?.done && !result?.error) {
      return { status: 'completed' };
    }
    if (isAdsgramTechnicalOrNoFill(result)) {
      return { status: 'no_fill' };
    }
    return { status: 'cancelled' };
  } catch (err) {
    if (isAdsgramTechnicalOrNoFill(err)) {
      return { status: 'no_fill' };
    }
    return { status: 'cancelled' };
  }
}

async function tryMonetag(): Promise<SingleNetworkOutcome> {
  if (!IS_MONETAG_ENABLED) return { status: 'no_fill' };

  const ready = await waitForNetworkSdk('monetag', 3);
  if (!ready || typeof window.show_12317990 !== 'function') {
    return { status: 'no_fill' };
  }

  const startedAt = Date.now();
  try {
    await window.show_12317990();
    return { status: 'completed' };
  } catch (err) {
    const elapsedMs = Date.now() - startedAt;
    const msg =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message || '').toLowerCase()
        : String(err || '').toLowerCase();

    const looksLikeTechnicalFailure =
      elapsedMs < MONETAG_FAST_FAIL_MS ||
      /no\s*ad|no\s*fill|network|timeout|load|blocked|failed|script|unavailable/.test(
        msg
      );

    return looksLikeTechnicalFailure
      ? { status: 'no_fill' }
      : { status: 'cancelled' };
  }
}

/**
 * Computes the highest-yield waterfall order for the current placement, platform,
 * frequency-cap window, impression balance, and adaptive no-fill health.
 */
function resolveNetworkWaterfall(
  placement: AdPlacementId,
  state: MediatorSessionState
): LiveNetwork[] {
  if (!IS_MONETAG_ENABLED) {
    return ['adsgram'];
  }

  const now = Date.now();
  const inTelegram = isRunningInsideTelegramMiniApp();
  const adsgramCooling = state.cooldownUntil.adsgram > now;
  const monetagCooling = state.cooldownUntil.monetag > now;

  // 1. Standard Web / Mobile Browser / PWA: Monetag dominates global web fill & CPM
  if (!inTelegram) {
    if (monetagCooling && !adsgramCooling) {
      return ['adsgram', 'monetag'];
    }
    return ['monetag', 'adsgram'];
  }

  // 2. Inside Telegram Mini App — Health Priority First
  if (adsgramCooling && !monetagCooling) {
    return ['monetag', 'adsgram'];
  }
  if (monetagCooling && !adsgramCooling) {
    return ['adsgram', 'monetag'];
  }

  // 3. Rapid Consecutive Placements (Star Forge locks / training) -> Strict Ping-Pong
  // Keeps every single ad as a high-eCPM fresh impression on its respective network!
  if (RAPID_CONSECUTIVE_PLACEMENTS.has(placement)) {
    return state.lastCompletedNetwork === 'adsgram'
      ? ['monetag', 'adsgram']
      : ['adsgram', 'monetag'];
  }

  // 4. Frequency-Cap Freshness & Yield Balancing
  const adsgramAgeMs = now - (state.lastCompletedAt.adsgram || 0);
  const monetagAgeMs = now - (state.lastCompletedAt.monetag || 0);
  const adsgramFresh =
    state.lastCompletedAt.adsgram === 0 || adsgramAgeMs >= ADSGRAM_FRESH_WINDOW_MS;
  const monetagFresh =
    state.lastCompletedAt.monetag === 0 || monetagAgeMs >= MONETAG_FRESH_WINDOW_MS;

  // If AdsGram was just shown within its frequency-cap window and Monetag is fresher,
  // route to Monetag first to capture fresh top-tier bid instead of diminished 2nd-view CPM.
  if (!adsgramFresh && monetagFresh) {
    return ['monetag', 'adsgram'];
  }

  // If Monetag was just shown and AdsGram is fresh, switch back to AdsGram first.
  if (!monetagFresh && adsgramFresh) {
    return ['adsgram', 'monetag'];
  }

  // Balanced RPM distribution: prevent one network from monopolizing >2 extra impressions
  const impressionDiff =
    (state.impressions.adsgram || 0) - (state.impressions.monetag || 0);
  if (impressionDiff >= 2) {
    return ['monetag', 'adsgram'];
  }
  if (impressionDiff <= -2) {
    return ['adsgram', 'monetag'];
  }

  // Tie-breaker: alternate away from the most recently completed network for maximum advertiser variety
  if (state.lastCompletedNetwork === 'adsgram') {
    return ['monetag', 'adsgram'];
  }

  // Very first Telegram Mini App impression -> AdsGram primary, instant Monetag backup
  return ['adsgram', 'monetag'];
}

/**
 * Master entry point for ALL rewarded ads across Neelyo.
 */
export async function showRewardedAd(
  placement: AdPlacementId = 'general'
): Promise<RewardedAdResult> {
  if (typeof window === 'undefined') {
    return {
      completed: false,
      source: 'fallback',
      reason: 'cancelled',
      attempts: [],
    };
  }

  if (isAdBusy) {
    return {
      completed: false,
      source: 'adsgram',
      reason: 'busy',
      attempts: [],
    };
  }

  isAdBusy = true;
  broadcastAdPlaybackState(true);

  const attempts: AdNetworkId[] = [];
  const state = readSessionState();

  try {
    const hasAnySdkInitially =
      Boolean(window.Adsgram) ||
      (IS_MONETAG_ENABLED && typeof window.show_12317990 === 'function');

    if (!hasAnySdkInitially) {
      const waitList: Promise<boolean>[] = [waitForNetworkSdk('adsgram', 4)];
      if (IS_MONETAG_ENABLED) {
        waitList.push(waitForNetworkSdk('monetag', 4));
      }
      await Promise.race(waitList);
    }

    const hasAdsgramSdk = Boolean(
      window.Adsgram && typeof window.Adsgram.init === 'function'
    );
    const hasMonetagSdk =
      IS_MONETAG_ENABLED && typeof window.show_12317990 === 'function';

    if (!hasAdsgramSdk && !hasMonetagSdk) {
      // Offline / local preview fallback when external ad scripts are unavailable
      await new Promise((resolve) => setTimeout(resolve, 420));
      attempts.push('fallback');
      return { completed: true, source: 'fallback', attempts };
    }

    const order = resolveNetworkWaterfall(placement, state);

    for (const network of order) {
      if (network === 'adsgram' && !hasAdsgramSdk) continue;
      if (network === 'monetag' && !hasMonetagSdk) continue;

      attempts.push(network);
      const outcome =
        network === 'adsgram' ? await tryAdsgram() : await tryMonetag();

      if (outcome.status === 'completed') {
        const now = Date.now();
        state.lastCompletedNetwork = network;
        state.lastCompletedAt[network] = now;
        state.cooldownUntil[network] = 0;
        state.consecutiveNoFills[network] = 0;
        state.impressions[network] = (state.impressions[network] || 0) + 1;
        writeSessionState(state);
        return { completed: true, source: network, attempts };
      }

      if (outcome.status === 'cancelled') {
        // Respect user cancellation — never ambush with secondary network
        return {
          completed: false,
          source: network,
          reason: 'cancelled',
          attempts,
        };
      }

      // Adaptive exponential backoff cooldown on no-fill (45s -> 90s -> 180s)
      const nextStreak = (state.consecutiveNoFills[network] || 0) + 1;
      state.consecutiveNoFills[network] = nextStreak;
      state.totalNoFills[network] = (state.totalNoFills[network] || 0) + 1;
      const cooldownMs = Math.min(
        MAX_COOLDOWN_MS,
        BASE_COOLDOWN_MS * Math.pow(2, nextStreak - 1)
      );
      state.cooldownUntil[network] = Date.now() + cooldownMs;
      writeSessionState(state);
    }

    return {
      completed: false,
      source: attempts[attempts.length - 1] || 'monetag',
      reason: 'no_fill',
      attempts,
    };
  } finally {
    isAdBusy = false;
    broadcastAdPlaybackState(false);
  }
}

/**
 * Returns a localized toast message (EN or AR) when a rewarded ad does not complete.
 * Returns `null` when `reason === 'busy'` (duplicate rapid click).
 */
export function getRewardedAdErrorMessage(
  reason?: RewardedAdResult['reason'],
  rewardLabelAr = 'للحصول على المكافأة',
  lang: UiLanguageId = 'en',
  rewardLabelEn = 'to claim your reward'
): string | null {
  if (reason === 'busy') return null;
  if (lang === 'en') {
    if (reason === 'no_fill') {
      return 'No ads available right now — please try again in a few moments.';
    }
    return `Ad not completed — watch the full ad ${rewardLabelEn}.`;
  }
  if (reason === 'no_fill') {
    return 'لا تتوفر إعلانات متاحة حالياً — حاول مرة أخرى بعد ثوانٍ قليلة';
  }
  return `لم يكتمل عرض الإعلان — شاهد الإعلان بالكامل ${rewardLabelAr}`;
}
