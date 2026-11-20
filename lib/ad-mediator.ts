'use client';

import type { UiLanguageId } from './market-profiles';

/**
 * Rewarded Ad Mediation Engine — AdsGram (60901) + Optional Monetag (12307661)
 *
 * Review-Safe Architecture:
 * - While `NEXT_PUBLIC_ENABLE_MONETAG !== 'true'` (default during AdsGram review),
 *   ONLY the clean standalone AdsGram SDK (Block ID: 60901) is invoked — zero Monetag
 *   scripts, zero cascading overlays, 100% policy-compliant opt-in rewarded video.
 * - Once `NEXT_PUBLIC_ENABLE_MONETAG="true"` is enabled after approval, full hybrid
 *   AdsGram <-> Monetag anti-fatigue rotation and instant waterfall failover activates automatically.
 */

export const ADSGRAM_BLOCK_ID = '60901';
export const MONETAG_ZONE_ID = '12307661';
export const IS_MONETAG_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_MONETAG === 'true';

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
    show_12307661?: () => Promise<unknown>;
    Adsgram?: AdsgramGlobal;
  }
}

interface MediatorSessionState {
  lastCompletedNetwork: 'adsgram' | 'monetag' | null;
  lastCompletedAt: Record<'adsgram' | 'monetag', number>;
  cooldownUntil: Record<'adsgram' | 'monetag', number>;
  impressions: Record<'adsgram' | 'monetag', number>;
}

const SESSION_STORAGE_KEY = 'neelyo_ad_mediator_v1';
const NETWORK_COOLDOWN_MS = 90_000;
const HIGH_VALUE_ADSGRAM_FRESH_WINDOW_MS = 150_000;
const MONETAG_FAST_FAIL_MS = 1_800;

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
 * Eagerly initializes the AdsGram controller once scripts hydrate so the
 * player's very first rewarded ad tap opens smoothly.
 */
export function prewarmAdNetworks(): void {
  if (typeof window === 'undefined') return;
  if (isRunningInsideTelegramMiniApp() || !IS_MONETAG_ENABLED) {
    getOrCreateAdsgramController();
    window.setTimeout(() => {
      getOrCreateAdsgramController();
    }, 1500);
  }
}

async function waitForNetworkSdk(
  network: 'adsgram' | 'monetag',
  maxAttempts = 4
): Promise<boolean> {
  const isReady = () =>
    network === 'adsgram'
      ? Boolean(window.Adsgram && typeof window.Adsgram.init === 'function')
      : IS_MONETAG_ENABLED && typeof window.show_12307661 === 'function';

  if (isReady()) return true;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 180));
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
  const ready = await waitForNetworkSdk('adsgram', 4);
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

  const ready = await waitForNetworkSdk('monetag', 4);
  if (!ready || typeof window.show_12307661 !== 'function') {
    return { status: 'no_fill' };
  }

  const startedAt = Date.now();
  try {
    await window.show_12307661();
    return { status: 'completed' };
  } catch (err) {
    const elapsedMs = Date.now() - startedAt;
    const msg =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message || '').toLowerCase()
        : String(err || '').toLowerCase();

    const looksLikeTechnicalFailure =
      elapsedMs < MONETAG_FAST_FAIL_MS ||
      /no\s*ad|no\s*fill|network|timeout|load|blocked|failed|script/.test(msg);

    return looksLikeTechnicalFailure
      ? { status: 'no_fill' }
      : { status: 'cancelled' };
  }
}

function resolveNetworkWaterfall(
  placement: AdPlacementId,
  state: MediatorSessionState
): ('adsgram' | 'monetag')[] {
  // Clean AdsGram-only mode during AdsGram review (Monetag completely off)
  if (!IS_MONETAG_ENABLED) {
    return ['adsgram'];
  }

  const now = Date.now();
  const inTelegram = isRunningInsideTelegramMiniApp();
  const adsgramCooling = state.cooldownUntil.adsgram > now;
  const monetagCooling = state.cooldownUntil.monetag > now;

  if (!inTelegram) {
    return ['monetag', 'adsgram'];
  }

  if (adsgramCooling && !monetagCooling) {
    return ['monetag', 'adsgram'];
  }
  if (monetagCooling && !adsgramCooling) {
    return ['adsgram', 'monetag'];
  }

  if (RAPID_CONSECUTIVE_PLACEMENTS.has(placement)) {
    return state.lastCompletedNetwork === 'adsgram'
      ? ['monetag', 'adsgram']
      : ['adsgram', 'monetag'];
  }

  const adsgramRecentlyShown =
    state.lastCompletedNetwork === 'adsgram' &&
    now - state.lastCompletedAt.adsgram < HIGH_VALUE_ADSGRAM_FRESH_WINDOW_MS;

  return adsgramRecentlyShown
    ? ['monetag', 'adsgram']
    : ['adsgram', 'monetag'];
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
      (IS_MONETAG_ENABLED && typeof window.show_12307661 === 'function');

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
      IS_MONETAG_ENABLED && typeof window.show_12307661 === 'function';

    if (!hasAdsgramSdk && !hasMonetagSdk) {
      // Offline / local preview fallback when external ad script is blocked
      await new Promise((resolve) => setTimeout(resolve, 450));
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
        state.impressions[network] = (state.impressions[network] || 0) + 1;
        writeSessionState(state);
        return { completed: true, source: network, attempts };
      }

      if (outcome.status === 'cancelled') {
        return {
          completed: false,
          source: network,
          reason: 'cancelled',
          attempts,
        };
      }

      state.cooldownUntil[network] = Date.now() + NETWORK_COOLDOWN_MS;
      writeSessionState(state);
    }

    return {
      completed: false,
      source: attempts[attempts.length - 1] || 'adsgram',
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
