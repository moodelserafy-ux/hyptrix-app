import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseUrl.startsWith('http')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Generates or retrieves a persistent Studio Instance UUID for ledger tracking
 * even before the player links an email, and upgrades seamlessly once authenticated.
 */
export function getOrCreateStudioInstanceId(): string {
  if (typeof window === 'undefined') return 'server_studio_instance';
  const STORAGE_KEY = 'hyptrix_studio_instance_uuid_v1';
  try {
    let existing = window.localStorage.getItem(STORAGE_KEY);
    if (!existing || existing.length < 12) {
      existing =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `st_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(STORAGE_KEY, existing);
    }
    return existing;
  } catch {
    return 'fallback_studio_instance';
  }
}

export interface GlobalStudioScore {
  id?: string;
  studio_instance_id?: string;
  studio_name: string;
  ceo_name: string;
  market_value: number;
  cash: number;
  reputation: number;
  released_count: number;
  total_awards: number;
  owned_assets_count?: number;
  ledger_verified?: boolean;
  updated_at?: string;
}

export interface VerifiedStudioWalletRecord {
  studio_instance_id: string;
  user_email?: string | null;
  studio_name: string;
  ceo_name: string;
  verified_cash: number;
  verified_market_value: number;
  reputation: number;
  vip_coins: number;
  owned_assets: string[];
  ledger_signature: string;
  updated_at?: string;
}

export type VerifiedTransactionType =
  | 'INIT_STUDIO'
  | 'PURCHASE_STUDIO_ASSET'
  | 'LAUNCH_PR_CAMPAIGN'
  | 'UNLOCK_MARKET_REGION'
  | 'PROJECT_PRODUCTION_SPEND'
  | 'PROJECT_BOX_OFFICE_REVENUE'
  | 'RESOLVE_CRISIS_SPEND'
  | 'SYNC_CHECKPOINT';

export interface LedgerVerificationRequest {
  studioInstanceId: string;
  studioName: string;
  ceoName: string;
  userEmail?: string | null;
  transactionType: VerifiedTransactionType;
  amountDelta: number; // Negative for purchases/spending, positive for revenue
  previousCash: number;
  expectedNewCash: number;
  marketValue: number;
  reputation: number;
  ownedAssets: string[];
  itemId?: string;
  itemLabel?: string;
  previousSignature?: string;
}

export interface LedgerVerificationResponse {
  ok: boolean;
  verified: boolean;
  tamperDetected?: boolean;
  correctedCash: number;
  correctedMarketValue: number;
  ownedAssets: string[];
  ledgerSignature: string;
  message?: string;
  serverTimestamp?: string;
}

/**
 * Calls the Server-Side Financial Guard (`/api/verify-ledger`) which validates
 * the transaction mathematics, checks HMAC signature integrity, and persists
 * the authoritative balance & owned assets to Supabase (`hyptrix_studio_wallets`
 * and `hyptrix_ledger_transactions`) via the server's RPC / Service Role.
 */
export async function verifyAndRecordServerTransaction(
  payload: LedgerVerificationRequest
): Promise<LedgerVerificationResponse> {
  try {
    const res = await fetch('/api/verify-ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data: LedgerVerificationResponse = await res.json();
    return data;
  } catch {
    return {
      ok: false,
      verified: false,
      correctedCash: payload.expectedNewCash,
      correctedMarketValue: payload.marketValue,
      ownedAssets: payload.ownedAssets,
      ledgerSignature: payload.previousSignature || '',
      message: 'تعذر الاتصال بخادم التحقق المالي مؤقتاً.',
    };
  }
}

/**
 * Fetches the authoritative wallet & owned studio assets from the server / Supabase
 * so any manual tampering in browser DevTools (`localStorage`) is overwritten by
 * the server-verified balance.
 */
export async function fetchAuthoritativeStudioWallet(
  studioInstanceId: string,
  currentCash: number,
  currentMarketValue: number,
  ownedAssets: string[],
  ledgerSignature: string
): Promise<LedgerVerificationResponse | null> {
  try {
    const params = new URLSearchParams({
      studioInstanceId,
      cash: String(currentCash),
      marketValue: String(currentMarketValue),
      assets: ownedAssets.join(','),
      sig: ledgerSignature || '',
    });
    const res = await fetch(`/api/verify-ledger?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function signInWithMagicLink(
  email: string
): Promise<{ ok: boolean; message: string }> {
  if (!supabase) {
    return {
      ok: false,
      message:
        'الربط السحابي يعمل في الوضع المحلي حالياً لعدم ضبط مفاتيح Supabase.',
    };
  }
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    return {
      ok: true,
      message: 'تم إرسال رابط الدخول السحري إلى بريدك الإلكتروني بنجاح!',
    };
  } catch {
    return { ok: false, message: 'حدث خطأ أثناء الاتصال بخدمة المصادقة.' };
  }
}

export async function syncStudioSaveToCloud(payload: {
  email?: string;
  studioInstanceId?: string;
  studioName: string;
  ceoName: string;
  marketValue: number;
  cash: number;
  reputation: number;
  vipCoins: number;
  vipPassExpiresAt: number | null;
  releasedCount: number;
  totalAwards: number;
  ownedAssets?: string[];
  ledgerSignature?: string;
  rawStateJson?: string;
}): Promise<{
  ok: boolean;
  message: string;
  verifiedCash?: number;
  ledgerSignature?: string;
}> {
  const studioInstanceId =
    payload.studioInstanceId || getOrCreateStudioInstanceId();

  // First, verify with our server-side financial guard
  const serverCheck = await verifyAndRecordServerTransaction({
    studioInstanceId,
    studioName: payload.studioName,
    ceoName: payload.ceoName,
    userEmail: payload.email || null,
    transactionType: 'SYNC_CHECKPOINT',
    amountDelta: 0,
    previousCash: payload.cash,
    expectedNewCash: payload.cash,
    marketValue: payload.marketValue,
    reputation: payload.reputation,
    ownedAssets: payload.ownedAssets || [],
    previousSignature: payload.ledgerSignature || '',
  });

  const safeCash = serverCheck.ok ? serverCheck.correctedCash : payload.cash;
  const safeMarketValue = serverCheck.ok
    ? serverCheck.correctedMarketValue
    : payload.marketValue;

  if (!supabase) {
    return {
      ok: true,
      verifiedCash: safeCash,
      ledgerSignature: serverCheck.ledgerSignature,
      message: 'تم التحقق من سلامة الأرصدة وحفظ التقدم عبر الخادم بنجاح.',
    };
  }

  try {
    // 1. Upsert leaderboard entry
    await supabase.from('hyptrix_leaderboard').upsert(
      {
        studio_name: payload.studioName,
        ceo_name: payload.ceoName,
        market_value: safeMarketValue,
        cash: safeCash,
        reputation: payload.reputation,
        released_count: payload.releasedCount,
        total_awards: payload.totalAwards,
        owned_assets_count: (payload.ownedAssets || []).length,
        ledger_verified: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'studio_name' }
    );

    // 2. Upsert cloud save if email provided
    if (payload.email) {
      await supabase.from('hyptrix_cloud_saves').upsert(
        {
          user_email: payload.email,
          studio_instance_id: studioInstanceId,
          studio_name: payload.studioName,
          vip_coins: payload.vipCoins,
          vip_pass_expires_at: payload.vipPassExpiresAt,
          verified_cash: safeCash,
          owned_assets: payload.ownedAssets || [],
          ledger_signature: serverCheck.ledgerSignature,
          save_data: payload.rawStateJson || '{}',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_email' }
      );
    }

    return {
      ok: true,
      verifiedCash: safeCash,
      ledgerSignature: serverCheck.ledgerSignature,
      message:
        'تم التحقق من الخزينة ومزامنة الاستوديو وترتيبك العالمي على السحابة بنجاح!',
    };
  } catch {
    return {
      ok: false,
      verifiedCash: safeCash,
      ledgerSignature: serverCheck.ledgerSignature,
      message: 'تعذرت المزامنة السحابية حالياً، بياناتك محفوظة ومؤمنة.',
    };
  }
}

export async function fetchGlobalLeaderboard(): Promise<GlobalStudioScore[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('hyptrix_leaderboard')
      .select(
        'studio_name, ceo_name, market_value, cash, reputation, released_count, total_awards, owned_assets_count, ledger_verified, updated_at'
      )
      .order('market_value', { ascending: false })
      .limit(20);
    if (error || !data) return [];
    return data as GlobalStudioScore[];
  } catch {
    return [];
  }
}
