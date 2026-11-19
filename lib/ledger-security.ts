import crypto from 'crypto';

const PRIMARY_HMAC_SECRET =
  process.env.LEDGER_HMAC_SECRET || 'neelyo-royal-ledger-secret-key-2026-v1';
const LEGACY_HMAC_SECRET = 'hyptrix-cinema-tycoon-secret-key-2026';

/**
 * Financial drift tolerance for server-tracked transactions.
 */
export const LEDGER_MAX_DRIFT_TOLERANCE = 5_000_000;

/**
 * Maximum plausible cash a brand-new studio with 0 released projects can hold
 * (75M starting capital + potential bailout/small bonuses).
 */
export const MAX_UNSEEDED_INITIAL_CASH = 140_000_000;

export const MAX_PLAUSIBLE_CASH = 8_000_000_000;
export const MAX_PLAUSIBLE_MARKET_VALUE = 15_000_000_000;

export interface AuthoritativeWalletRecord {
  cash: number;
  marketValue: number;
  reputation: number;
  ownedAssets: string[];
  signature: string;
  updatedAt: string;
}

const globalWalletHolder = globalThis as unknown as {
  __neelyoAuthoritativeWallets?: Map<string, AuthoritativeWalletRecord>;
};

function getWalletMap(): Map<string, AuthoritativeWalletRecord> {
  if (!globalWalletHolder.__neelyoAuthoritativeWallets) {
    globalWalletHolder.__neelyoAuthoritativeWallets = new Map();
  }
  return globalWalletHolder.__neelyoAuthoritativeWallets;
}

export function getServerMemoryWallet(
  studioInstanceId: string
): AuthoritativeWalletRecord | undefined {
  return getWalletMap().get(studioInstanceId);
}

export function setServerMemoryWallet(
  studioInstanceId: string,
  record: AuthoritativeWalletRecord
): void {
  getWalletMap().set(studioInstanceId, record);
}

export function computeLedgerSignature(
  studioInstanceId: string,
  cash: number,
  ownedAssets: string[]
): string {
  const payload = `${studioInstanceId}|${Math.round(cash)}|${[...ownedAssets]
    .sort()
    .join(',')}`;
  return crypto
    .createHmac('sha256', PRIMARY_HMAC_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 32);
}

function computeLegacyLedgerSignature(
  studioInstanceId: string,
  cash: number,
  ownedAssets: string[]
): string {
  const payload = `${studioInstanceId}|${Math.round(cash)}|${[...ownedAssets]
    .sort()
    .join(',')}`;
  return crypto
    .createHmac('sha256', LEGACY_HMAC_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 32);
}

export function verifyLedgerSignature(
  studioInstanceId: string,
  cash: number,
  ownedAssets: string[],
  providedSignature?: string | null
): boolean {
  if (!providedSignature || typeof providedSignature !== 'string') return false;
  const trimmed = providedSignature.trim();
  if (trimmed.length < 16) return false;

  const expectedPrimary = computeLedgerSignature(
    studioInstanceId,
    cash,
    ownedAssets
  );
  if (trimmed === expectedPrimary) return true;

  // Allow seamless one-time migration from legacy signatures
  const expectedLegacy = computeLegacyLedgerSignature(
    studioInstanceId,
    cash,
    ownedAssets
  );
  return trimmed === expectedLegacy;
}

/**
 * Computes a realistic upper bound on a studio's liquid cash given its actual
 * gameplay progress (starter 75M + maximum legitimate net earnings per release
 * + awards/bailout margin). Prevents false-positive wipes for real players while
 * catching fabricated balances (e.g., 999B with 0–2 films).
 */
export function computePlausibleCashCeiling(params: {
  releasedCount: number;
  totalAwards?: number;
  reputation?: number;
}): number {
  const safeReleases = Math.max(0, Math.min(200, Math.round(params.releasedCount || 0)));
  const safeAwards = Math.max(0, Math.min(500, Math.round(params.totalAwards || 0)));
  const safeRep = Math.max(0, Math.min(100, Math.round(params.reputation ?? 62)));

  const ceiling =
    MAX_UNSEEDED_INITIAL_CASH +
    safeReleases * 240_000_000 +
    safeAwards * 25_000_000 +
    safeRep * 350_000;

  return Math.min(MAX_PLAUSIBLE_CASH, ceiling);
}

/**
 * Computes a realistic upper bound on a studio's Market Value given its
 * verified cash, reputation, released catalog count, awards, and fixed assets.
 */
export function computePlausibleMarketValueCeiling(params: {
  verifiedCash: number;
  reputation: number;
  releasedCount: number;
  totalAwards: number;
  ownedAssetsCount: number;
}): number {
  const safeCash = Math.max(0, Math.min(MAX_PLAUSIBLE_CASH, params.verifiedCash));
  const safeRep = Math.max(0, Math.min(100, params.reputation));
  const safeReleases = Math.max(0, Math.min(200, params.releasedCount));
  const safeAwards = Math.max(0, Math.min(500, params.totalAwards));
  const safeAssets = Math.max(0, Math.min(10, params.ownedAssetsCount));

  const ceiling =
    140_000_000 +
    Math.round(safeCash * 1.15) +
    safeRep * 1_400_000 +
    safeReleases * 320_000_000 +
    safeAwards * 65_000_000 +
    safeAssets * 45_000_000;

  return Math.min(MAX_PLAUSIBLE_MARKET_VALUE, ceiling);
}
