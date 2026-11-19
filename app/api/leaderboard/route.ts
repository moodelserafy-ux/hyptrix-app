import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import {
  verifyLedgerSignature,
  computePlausibleCashCeiling,
  computePlausibleMarketValueCeiling,
  LEDGER_MAX_DRIFT_TOLERANCE,
  MAX_PLAUSIBLE_CASH,
  MAX_PLAUSIBLE_MARKET_VALUE,
  getServerMemoryWallet,
} from '@/lib/ledger-security';

export const dynamic = 'force-dynamic';

const LOCAL_FALLBACK_FILE = '/tmp/neelyo_real_players_leaderboard.json';
const TOP_LIMIT = 15;

export interface RealPlayerLeaderboardRow {
  studio_instance_id: string;
  studio_name: string;
  ceo_name: string;
  market_value: number;
  cash: number;
  reputation: number;
  released_count: number;
  total_awards: number;
  ledger_verified: boolean;
  updated_at: string;
}

function getServerSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readLocalFallback(): RealPlayerLeaderboardRow[] {
  try {
    if (!fs.existsSync(LOCAL_FALLBACK_FILE)) return [];
    const raw = fs.readFileSync(LOCAL_FALLBACK_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalFallback(rows: RealPlayerLeaderboardRow[]) {
  try {
    fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify(rows, null, 2), 'utf-8');
  } catch {
    // ignore ephemeral filesystem errors
  }
}

function sortLeaderboardRows(
  rows: RealPlayerLeaderboardRow[]
): RealPlayerLeaderboardRow[] {
  return [...rows].sort((a, b) => {
    if (b.market_value !== a.market_value) {
      return b.market_value - a.market_value;
    }
    if (b.reputation !== a.reputation) {
      return b.reputation - a.reputation;
    }
    return b.total_awards - a.total_awards;
  });
}

function mapSupabaseRow(row: Record<string, unknown>): RealPlayerLeaderboardRow {
  return {
    studio_instance_id: String(row.studio_instance_id || row.id || ''),
    studio_name: String(row.studio_name || 'استوديو مستقل'),
    ceo_name: String(row.ceo_name || 'مدير تنفيذي'),
    market_value: Number(row.market_value || 0),
    cash: Number(row.cash || 0),
    reputation: Number(row.reputation || 50),
    released_count: Number(row.released_count || 0),
    total_awards: Number(row.total_awards || 0),
    ledger_verified: Boolean(row.ledger_verified),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

function buildRankedResponse(
  allRows: RealPlayerLeaderboardRow[],
  currentStudioInstanceId: string,
  currentStudioName: string,
  source: 'supabase' | 'local_fallback',
  extra?: { tamperClamped?: boolean; verified?: boolean }
) {
  const sorted = sortLeaderboardRows(allRows);
  const totalPlayers = sorted.length;

  const top15 = sorted.slice(0, TOP_LIMIT).map((row, idx) => ({
    rank: idx + 1,
    ...row,
    isCurrentPlayer: Boolean(
      (currentStudioInstanceId &&
        row.studio_instance_id &&
        row.studio_instance_id === currentStudioInstanceId) ||
        (!row.studio_instance_id &&
          currentStudioName &&
          row.studio_name.trim() === currentStudioName.trim())
    ),
  }));

  // Match strictly by studio_instance_id first to prevent studio_name collisions
  let playerIndex = currentStudioInstanceId
    ? sorted.findIndex(
        (r) =>
          r.studio_instance_id &&
          r.studio_instance_id === currentStudioInstanceId
      )
    : -1;

  if (playerIndex === -1 && currentStudioName) {
    playerIndex = sorted.findIndex(
      (r) =>
        !r.studio_instance_id &&
        r.studio_name.trim() === currentStudioName.trim()
    );
  }

  const currentPlayerRank = playerIndex >= 0 ? playerIndex + 1 : null;
  const currentPlayerRow =
    playerIndex >= 0
      ? {
          rank: playerIndex + 1,
          ...sorted[playerIndex],
          isCurrentPlayer: true,
        }
      : null;

  const fifteenthMarketValue =
    top15.length >= TOP_LIMIT
      ? top15[TOP_LIMIT - 1].market_value
      : top15.length > 0
      ? top15[top15.length - 1].market_value
      : 0;

  return {
    ok: true,
    source,
    totalPlayers,
    topLimit: TOP_LIMIT,
    top15,
    currentPlayerRank,
    currentPlayerEntry: currentPlayerRow,
    fifteenthMarketValue,
    isInTop15: currentPlayerRank !== null && currentPlayerRank <= TOP_LIMIT,
    tamperClamped: Boolean(extra?.tamperClamped),
    verified: extra?.verified ?? true,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studioInstanceId = searchParams.get('studioInstanceId') || '';
    const studioName = searchParams.get('studioName') || '';

    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('hyptrix_leaderboard')
          .select('*')
          .order('market_value', { ascending: false })
          .limit(500);

        if (!error && Array.isArray(data)) {
          const mapped = data.map((r) =>
            mapSupabaseRow(r as Record<string, unknown>)
          );
          return NextResponse.json(
            buildRankedResponse(mapped, studioInstanceId, studioName, 'supabase')
          );
        }
      } catch {
        // fall through to local fallback
      }
    }

    const fallbackRows = readLocalFallback();
    return NextResponse.json(
      buildRankedResponse(
        fallbackRows,
        studioInstanceId,
        studioName,
        'local_fallback'
      )
    );
  } catch (err) {
    console.error('leaderboard GET error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load real players leaderboard' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const studioInstanceId = String(body?.studioInstanceId || '').trim();
    const studioName = String(body?.studioName || '').trim().slice(0, 80);
    const ceoName = String(body?.ceoName || 'المدير التنفيذي')
      .trim()
      .slice(0, 80);
    const claimedMarketValue = Number.isFinite(Number(body?.marketValue))
      ? Math.max(
          0,
          Math.min(MAX_PLAUSIBLE_MARKET_VALUE, Math.round(Number(body.marketValue)))
        )
      : 110_000_000;
    const claimedCash = Number.isFinite(Number(body?.cash))
      ? Math.max(
          -500_000_000,
          Math.min(MAX_PLAUSIBLE_CASH, Math.round(Number(body.cash)))
        )
      : 75_000_000;
    const reputation = Number.isFinite(Number(body?.reputation))
      ? Math.max(0, Math.min(100, Math.round(Number(body.reputation))))
      : 60;
    const releasedCount = Number.isFinite(Number(body?.releasedCount))
      ? Math.max(0, Math.min(200, Math.round(Number(body.releasedCount))))
      : 0;
    const totalAwards = Number.isFinite(Number(body?.totalAwards))
      ? Math.max(0, Math.min(500, Math.round(Number(body.totalAwards))))
      : 0;
    const ledgerSignature =
      typeof body?.ledgerSignature === 'string' ? body.ledgerSignature : '';
    const ownedStudioAssets: string[] = Array.isArray(body?.ownedStudioAssets)
      ? body.ownedStudioAssets.filter((a: unknown): a is string => typeof a === 'string')
      : [];

    if (!studioInstanceId || !studioName) {
      return NextResponse.json(
        { ok: false, error: 'studioInstanceId and studioName are required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // Server-side anti-cheat verification:
    // 1) Cross-check authoritative wallet (Supabase or server memory vault)
    // 2) Verify HMAC ledgerSignature
    // 3) Clamp marketValue & cash against verified bounds so spoofed 999B payloads cannot top the chart
    let verifiedCash = claimedCash;
    let verifiedMarketValue = claimedMarketValue;
    let isLedgerVerified = false;
    let tamperClamped = false;

    const sigMatchesClaimed = verifyLedgerSignature(
      studioInstanceId,
      claimedCash,
      ownedStudioAssets,
      ledgerSignature
    );

    let serverWalletCash: number | null = null;
    let serverWalletMarketValue: number | null = null;
    let serverWalletAssetsCount = ownedStudioAssets.length;

    const cashCeiling = computePlausibleCashCeiling({
      releasedCount,
      totalAwards,
      reputation,
    });

    if (supabase) {
      try {
        const { data: wallet } = await supabase
          .from('hyptrix_studio_wallets')
          .select('verified_cash, verified_market_value, owned_assets')
          .eq('studio_instance_id', studioInstanceId)
          .maybeSingle();

        if (wallet) {
          serverWalletCash = Number(wallet.verified_cash ?? 0);
          serverWalletMarketValue = Number(wallet.verified_market_value ?? 0);
          if (Array.isArray(wallet.owned_assets)) {
            serverWalletAssetsCount = wallet.owned_assets.length;
          }
        }
      } catch {
        // Fallback to memory wallet below
      }
    }

    if (serverWalletCash === null) {
      const memWallet = getServerMemoryWallet(studioInstanceId);
      if (memWallet) {
        serverWalletCash = memWallet.cash;
        serverWalletMarketValue = memWallet.marketValue;
        serverWalletAssetsCount = memWallet.ownedAssets.length;
      }
    }

    if (claimedCash > cashCeiling) {
      // Impossible balance for the studio's catalog & awards -> clamp strictly
      tamperClamped = true;
      isLedgerVerified = false;
      verifiedCash =
        serverWalletCash !== null
          ? Math.min(serverWalletCash, cashCeiling)
          : cashCeiling;
    } else if (serverWalletCash !== null) {
      const cashDrift = Math.abs(claimedCash - serverWalletCash);
      if (cashDrift <= LEDGER_MAX_DRIFT_TOLERANCE) {
        isLedgerVerified = true;
        verifiedCash = sigMatchesClaimed ? claimedCash : serverWalletCash;
      } else if (sigMatchesClaimed) {
        isLedgerVerified = true;
        verifiedCash = claimedCash;
      } else if (releasedCount === 0 && claimedCash > serverWalletCash) {
        tamperClamped = true;
        isLedgerVerified = false;
        verifiedCash = serverWalletCash;
      } else {
        // Plausible earnings within ceiling awaiting next checkpoint
        isLedgerVerified = false;
        verifiedCash = claimedCash;
      }
    } else if (sigMatchesClaimed) {
      isLedgerVerified = true;
      verifiedCash = claimedCash;
    } else {
      isLedgerVerified = false;
      verifiedCash = Math.min(claimedCash, cashCeiling);
    }

    const mvCeiling = computePlausibleMarketValueCeiling({
      verifiedCash,
      reputation,
      releasedCount,
      totalAwards,
      ownedAssetsCount: serverWalletAssetsCount,
    });

    if (verifiedMarketValue > mvCeiling) {
      tamperClamped = true;
      isLedgerVerified = false;
      verifiedMarketValue =
        serverWalletMarketValue !== null
          ? Math.min(mvCeiling, Math.max(serverWalletMarketValue, 110_000_000))
          : mvCeiling;
    }

    const nowIso = new Date().toISOString();
    const rowPayload: RealPlayerLeaderboardRow = {
      studio_instance_id: studioInstanceId,
      studio_name: studioName,
      ceo_name: ceoName,
      market_value: verifiedMarketValue,
      cash: verifiedCash,
      reputation,
      released_count: releasedCount,
      total_awards: totalAwards,
      ledger_verified: isLedgerVerified,
      updated_at: nowIso,
    };

    if (supabase) {
      try {
        // Keyed strictly on studio_instance_id so duplicate studio names never overwrite each other!
        const { error: upsertErr } = await supabase
          .from('hyptrix_leaderboard')
          .upsert(
            {
              studio_instance_id: studioInstanceId,
              studio_name: studioName,
              ceo_name: ceoName,
              market_value: verifiedMarketValue,
              cash: verifiedCash,
              reputation,
              released_count: releasedCount,
              total_awards: totalAwards,
              ledger_verified: isLedgerVerified,
              updated_at: nowIso,
            },
            { onConflict: 'studio_instance_id' }
          );

        if (!upsertErr) {
          const { data, error } = await supabase
            .from('hyptrix_leaderboard')
            .select('*')
            .order('market_value', { ascending: false })
            .limit(500);

          if (!error && Array.isArray(data)) {
            const mapped = data.map((r) =>
              mapSupabaseRow(r as Record<string, unknown>)
            );
            return NextResponse.json(
              buildRankedResponse(
                mapped,
                studioInstanceId,
                studioName,
                'supabase',
                { tamperClamped, verified: isLedgerVerified }
              )
            );
          }
        }
      } catch {
        // fall through to local fallback
      }
    }

    const fallbackRows = readLocalFallback();
    // Match strictly by studio_instance_id (never collide on shared studio_name)
    const existingIdx = fallbackRows.findIndex(
      (r) => r.studio_instance_id === studioInstanceId
    );
    if (existingIdx >= 0) {
      fallbackRows[existingIdx] = rowPayload;
    } else {
      fallbackRows.push(rowPayload);
    }
    writeLocalFallback(fallbackRows);

    return NextResponse.json(
      buildRankedResponse(
        fallbackRows,
        studioInstanceId,
        studioName,
        'local_fallback',
        { tamperClamped, verified: isLedgerVerified }
      )
    );
  } catch (err) {
    console.error('leaderboard POST error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to sync real players leaderboard' },
      { status: 500 }
    );
  }
}
