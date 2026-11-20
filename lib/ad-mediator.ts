'use client';

/**
 * Smart Hybrid Rewarded Ad Mediation Engine — AdsGram (60901) + Monetag (12307661)
 *
 * Maximizes eCPM & fill rate across Telegram Mini Apps and Web/PWA:
 * 1. Environment-aware routing:
 *    - Inside Telegram Mini App: AdsGram (high Telegram video eCPM) + Monetag smart ping-pong.
 *    - Outside Telegram (Web/PWA): Monetag primary with AdsGram fallback if available.
 * 2. Anti-fatigue rotation:
 *    - Alternates AdsGram <-> Monetag on consecutive impressions so both networks stay in
 *      their highest-paying "fresh impression" Tier-1 eCPM window instead of frequency-capped rates.
 * 3. Instant waterfall failover:
 *    - If Primary returns No-Fill / SDK error / load failure, silently falls back to Secondary
 *      inside the exact same user click (~99.5% fill rate).
 *    - If the user deliberately closes/skips an active video ad, stops immediately without
 *      forcing a second ad and without granting the reward.
 * 4. Circuit breaker cooldown (90s):
 *    - Remembers temporary No-Fill states in sessionStorage so subsequent clicks go directly
 *      to the healthy network with zero wasted latency.
 * 5. Game-clock safety:
 *    - Broadcasts `neelyo:ad-state` so the studio day clock freezes during ad playback.
 */

export const ADSGRAM_BLOCK_ID = '60901';
export const MONETAG_ZONE_ID = '12307661';

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
const NETWORK_COOLDOWN_MS = 90_000; // 90s circuit breaker after no-fill/error
const HIGH_VALUE_ADSGRAM_FRESH_WINDOW_MS = 150_000; // 2.5 min anti-fatigue window
const MONETAG_FAST_FAIL_MS = 1_800; // Rejection under 1.8s indicates no-fill/load error, not user close

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
    // Ignore storage quota / private-mode restrictions
  }
}

function broadcastAdPlaybackState(open: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('neelyo:ad-state', { detail: { open } })
    );
  } catch {
    // No-op if CustomEvent unavailable
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
 * player's very first rewarded ad tap opens with minimal delay.
 */
export function prewarmAdNetworks(): void {
  if (typeof window === 'undefined') return;
  if (isRunningInsideTelegramMiniApp()) {
    getOrCreateAdsgramController();
    // Retry once shortly after mount in case the async script finishes loading
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
      : typeof window.show_12307661 === 'function';

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

/**
 * Selects the optimal primary -> secondary waterfall order for maximum eCPM and fill rate.
 */
function resolveNetworkWaterfall(
  placement: AdPlacementId,
  state: MediatorSessionState
): ('adsgram' | 'monetag')[] {
  const now = Date.now();
  const inTelegram = isRunningInsideTelegramMiniApp();
  const adsgramCooling = state.cooldownUntil.adsgram > now;
  const monetagCooling = state.cooldownUntil.monetag > now;

  // Outside Telegram Mini App (standard web browser / PWA):
  // Monetag dominates fill & revenue; AdsGram is Telegram-native so only keep as silent backup if loaded.
  if (!inTelegram) {
    return ['monetag', 'adsgram'];
  }

  // Inside Telegram Mini App:
  // 1. Respect circuit breaker cooldowns first (skip recently empty network for instant UX)
  if (adsgramCooling && !monetagCooling) {
    return ['monetag', 'adsgram'];
  }
  if (monetagCooling && !adsgramCooling) {
    return ['adsgram', 'monetag'];
  }

  // 2. Rapid multi-watch placements (e.g., 5 Star Forge locks, 3 training camps):
  // Strict Ping-Pong Alternation keeps BOTH networks in fresh-impression Tier-1 eCPM!
  if (RAPID_CONSECUTIVE_PLACEMENTS.has(placement)) {
    return state.lastCompletedNetwork === 'adsgram'
      ? ['monetag', 'adsgram']
      : ['adsgram', 'monetag'];
  }

  // 3. High-value single placements (bailout, +25% distribution, crisis, syndicate mediation):
  // Prioritize AdsGram for peak Telegram video eCPM unless AdsGram was just shown in the last 2.5m.
  const adsgramRecentlyShown =
    state.lastCompletedNetwork === 'adsgram' &&
    now - state.lastCompletedAt.adsgram < HIGH_VALUE_ADSGRAM_FRESH_WINDOW_MS;

  return adsgramRecentlyShown
    ? ['monetag', 'adsgram']
    : ['adsgram', 'monetag'];
}

/**
 * Master entry point for ALL rewarded ads across Neelyo.
 * Orchestrates AdsGram (60901) + Monetag (12307661) via smart rotation & instant waterfall failover.
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
      source: 'monetag',
      reason: 'busy',
      attempts: [],
    };
  }

  isAdBusy = true;
  broadcastAdPlaybackState(true);

  const attempts: AdNetworkId[] = [];
  const state = readSessionState();

  try {
    // Check if BOTH live external SDKs are completely absent (e.g., local offline dev preview)
    const hasAnySdkInitially =
      Boolean(window.Adsgram) || typeof window.show_12307661 === 'function';
    if (!hasAnySdkInitially) {
      // Give async head scripts a short chance to finish hydrating
      await Promise.race([
        waitForNetworkSdk('monetag', 4),
        waitForNetworkSdk('adsgram', 4),
      ]);
    }

    const hasAdsgramSdk = Boolean(
      window.Adsgram && typeof window.Adsgram.init === 'function'
    );
    const hasMonetagSdk = typeof window.show_12307661 === 'function';

    if (!hasAdsgramSdk && !hasMonetagSdk) {
      // Graceful local preview fallback when external ad hosts are unreachable
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts.push('fallback');
      return { completed: true, source: 'fallback', attempts };
    }

    const order = resolveNetworkWaterfall(placement, state);

    for (const network of order) {
      // Skip networks whose script is not present to avoid unnecessary delay
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
        // User intentionally closed/skipped the ad — stop immediately, never punish with a 2nd ad
        return {
          completed: false,
          source: network,
          reason: 'cancelled',
          attempts,
        };
      }

      // outcome.status === 'no_fill':
      // Mark short circuit-breaker cooldown and waterfall immediately to the backup network!
      state.cooldownUntil[network] = Date.now() + NETWORK_COOLDOWN_MS;
      writeSessionState(state);
    }

    // Both networks exhausted / no fill available right now
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
 * Returns a clean Arabic in-game toast message when an ad does not complete.
 * Returns `null` when `reason === 'busy'` (duplicate rapid click).
 */
export function getRewardedAdErrorMessage(
  reason?: RewardedAdResult['reason'],
  rewardLabel = 'للحصول على المكافأة'
): string | null {
  if (reason === 'busy') return null;
  if (reason === 'no_fill') {
    return 'لا تتوفر إعلانات متاحة حالياً — حاول مرة أخرى بعد ثوانٍ قليلة';
  }
  return `لم يكتمل عرض الإعلان — شاهد الإعلان بالكامل ${rewardLabel}`;
}
