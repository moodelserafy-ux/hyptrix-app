import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServerKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const isServerSupabaseReady = Boolean(
  supabaseUrl &&
    supabaseServerKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseUrl.startsWith('http')
);

const serverSupabase = isServerSupabaseReady
  ? createClient(supabaseUrl, supabaseServerKey, {
      auth: { persistSession: false },
    })
  : null;

export interface RealPlayerLeaderboardEntry {
  studio_instance_id: string;
  studio_name: string;
  ceo_name: string;
  market_value: number;
  cash: number;
  reputation: number;
  released_count: number;
  total_awards: number;
  updated_at: string;
}

const LOCAL_STORE_PATH = path.join('/tmp', 'hyptrix_real_players_leaderboard.json');

function readLocalPlayers(): RealPlayerLeaderboardEntry[] {
  try {
    if (!fs.existsSync(LOCAL_STORE_PATH)) return [];
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalPlayers(entries: RealPlayerLeaderboardEntry[]) {
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(entries), 'utf-8');
  } catch {
    // ignore transient fs errors
  }
}

function upsertLocalPlayer(entry: RealPlayerLeaderboardEntry): RealPlayerLeaderboardEntry[] {
  const existing = readLocalPlayers();
  const idx = existing.findIndex(
    (e) =>
      (entry.studio_instance_id && e.studio_instance_id === entry.studio_instance_id) ||
      e.studio_name.trim().toLowerCase() === entry.studio_name.trim().toLowerCase()
  );
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...entry };
  } else {
    existing.push(entry);
  }
  const sorted = existing.sort((a, b) => b.market_value - a.market_value);
  writeLocalPlayers(sorted);
  return sorted;
}

async function fetchLeaderboardPayload(
  studioInstanceId: string,
  studioName: string
) {
  // 1. Prefer Supabase `hyptrix_leaderboard` when configured
  if (serverSupabase) {
    try {
      const { data: top15Data, error: topError } = await serverSupabase
        .from('hyptrix_leaderboard')
        .select(
          'studio_instance_id, studio_name, ceo_name, market_value, cash, reputation, released_count, total_awards, updated_at'
        )
        .order('market_value', { ascending: false })
        .limit(15);

      if (!topError && Array.isArray(top15Data)) {
        const top15: RealPlayerLeaderboardEntry[] = top15Data.map((row: any) => ({
          studio_instance_id: String(row.studio_instance_id || row.studio_name || ''),
          studio_name: String(row.studio_name || 'استوديو'),
          ceo_name: String(row.ceo_name || 'منتج'),
          market_value: Number(row.market_value || 0),
          cash: Number(row.cash || 0),
          reputation: Number(row.reputation || 60),
          released_count: Number(row.released_count || 0),
          total_awards: Number(row.total_awards || 0),
          updated_at: String(row.updated_at || new Date().toISOString()),
        }));

        const { count: totalCount } = await serverSupabase
          .from('hyptrix_leaderboard')
          .select('*', { count: 'exact', head: true });

        let currentPlayerEntry: RealPlayerLeaderboardEntry | null =
          top15.find(
            (e) =>
              (studioInstanceId && e.studio_instance_id === studioInstanceId) ||
              (studioName &&
                e.studio_name.trim().toLowerCase() === studioName.trim().toLowerCase())
          ) || null;

        let currentPlayerRank: number | null = null;

        if (currentPlayerEntry) {
          currentPlayerRank =
            top15.findIndex(
              (e) =>
                (studioInstanceId && e.studio_instance_id === studioInstanceId) ||
                e.studio_name.trim().toLowerCase() ===
                  currentPlayerEntry!.studio_name.trim().toLowerCase()
            ) + 1;
        } else if (studioName) {
          const { data: playerRow } = await serverSupabase
            .from('hyptrix_leaderboard')
            .select(
              'studio_instance_id, studio_name, ceo_name, market_value, cash, reputation, released_count, total_awards, updated_at'
            )
            .eq('studio_name', studioName)
            .maybeSingle();

          if (playerRow) {
            currentPlayerEntry = {
              studio_instance_id: String(
                playerRow.studio_instance_id || studioInstanceId || studioName
              ),
              studio_name: String(playerRow.studio_name),
              ceo_name: String(playerRow.ceo_name || 'منتج'),
              market_value: Number(playerRow.market_value || 0),
              cash: Number(playerRow.cash || 0),
              reputation: Number(playerRow.reputation || 60),
              released_count: Number(playerRow.released_count || 0),
              total_awards: Number(playerRow.total_awards || 0),
              updated_at: String(playerRow.updated_at || new Date().toISOString()),
            };

            const { count: higherCount } = await serverSupabase
              .from('hyptrix_leaderboard')
              .select('*', { count: 'exact', head: true })
              .gt('market_value', currentPlayerEntry.market_value);

            currentPlayerRank = (higherCount ?? 0) + 1;
          }
        }

        const fifteenthMarketValue =
          top15.length >= 15 ? top15[14].market_value : 0;

        return {
          ok: true,
          source: 'cloud',
          top15,
          totalPlayers: Math.max(totalCount ?? top15.length, top15.length),
          currentPlayerRank,
          currentPlayerEntry,
          fifteenthMarketValue,
        };
      }
    } catch {
      // Fall through to server persistent registry
    }
  }

  // 2. Fallback to real players registered on this server instance
  const allPlayers = readLocalPlayers().sort(
    (a, b) => b.market_value - a.market_value
  );
  const top15 = allPlayers.slice(0, 15);
  const playerIdx = allPlayers.findIndex(
    (e) =>
      (studioInstanceId && e.studio_instance_id === studioInstanceId) ||
      (studioName &&
        e.studio_name.trim().toLowerCase() === studioName.trim().toLowerCase())
  );

  return {
    ok: true,
    source: 'server',
    top15,
    totalPlayers: allPlayers.length,
    currentPlayerRank: playerIdx >= 0 ? playerIdx + 1 : null,
    currentPlayerEntry: playerIdx >= 0 ? allPlayers[playerIdx] : null,
    fifteenthMarketValue: top15.length >= 15 ? top15[14].market_value : 0,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studioInstanceId = searchParams.get('studioInstanceId') || '';
  const studioName = searchParams.get('studioName') || '';
  const result = await fetchLeaderboardPayload(studioInstanceId, studioName);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const studioInstanceId = String(body?.studioInstanceId || '').trim();
    const studioName = String(body?.studioName || '').trim();
    const ceoName = String(body?.ceoName || 'المدير التنفيذي').trim();
    const marketValue = Math.max(0, Math.round(Number(body?.marketValue || 0)));
    const cash = Math.round(Number(body?.cash || 0));
    const reputation = Math.min(100, Math.max(0, Math.round(Number(body?.reputation || 60))));
    const releasedCount = Math.max(0, Math.round(Number(body?.releasedCount || 0)));
    const totalAwards = Math.max(0, Math.round(Number(body?.totalAwards || 0)));

    if (!studioName) {
      return NextResponse.json(
        { ok: false, error: 'Missing studioName' },
        { status: 400 }
      );
    }

    const entry: RealPlayerLeaderboardEntry = {
      studio_instance_id: studioInstanceId || studioName,
      studio_name: studioName,
      ceo_name: ceoName,
      market_value: marketValue,
      cash,
      reputation,
      released_count: releasedCount,
      total_awards: totalAwards,
      updated_at: new Date().toISOString(),
    };

    // Always persist in server registry
    upsertLocalPlayer(entry);

    // Also persist to Supabase if configured
    if (serverSupabase) {
      try {
        await serverSupabase.from('hyptrix_leaderboard').upsert(
          {
            studio_name: entry.studio_name,
            ceo_name: entry.ceo_name,
            market_value: entry.market_value,
            cash: entry.cash,
            reputation: entry.reputation,
            released_count: entry.released_count,
            total_awards: entry.total_awards,
            ledger_verified: true,
            updated_at: entry.updated_at,
          },
          { onConflict: 'studio_name' }
        );
      } catch {
        // Non-fatal; fallback registry already updated
      }
    }

    const result = await fetchLeaderboardPayload(
      entry.studio_instance_id,
      entry.studio_name
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Failed to sync leaderboard' },
      { status: 500 }
    );
  }
}
