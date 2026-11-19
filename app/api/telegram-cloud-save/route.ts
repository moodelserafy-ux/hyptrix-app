import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Automatic Telegram Mini App Cloud Save (/api/telegram-cloud-save)
 *
 * Verifies Telegram WebApp `initData` cryptographically using HMAC-SHA256
 * with `TELEGRAM_BOT_TOKEN` (official Telegram Mini Apps validation spec),
 * then loads or saves the player's studio snapshot in `hyptrix_cloud_saves`
 * keyed by `telegram_user_id` — zero login screens required!
 */

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('your-project')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface VerifiedTelegramUser {
  id: string;
  firstName?: string;
  username?: string;
}

function verifyTelegramInitData(initData: string): VerifiedTelegramUser | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken || botToken.includes('your-telegram-bot-token')) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');
    if (!receivedHash) return null;

    // Optional freshness check (allow up to 24h old auth_date)
    const authDate = Number(params.get('auth_date') || 0);
    if (authDate > 0) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec - authDate > 86400) return null;
    }

    const pairs: string[] = [];
    params.forEach((value, key) => {
      if (key !== 'hash') {
        pairs.push(`${key}=${value}`);
      }
    });
    pairs.sort();
    const dataCheckString = pairs.join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(receivedHash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const userJson = params.get('user');
    if (!userJson) return null;
    const parsedUser = JSON.parse(userJson);
    if (!parsedUser?.id) return null;

    return {
      id: String(parsedUser.id),
      firstName: parsedUser.first_name ? String(parsedUser.first_name) : undefined,
      username: parsedUser.username ? String(parsedUser.username) : undefined,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action === 'save' ? 'save' : 'load';
    const initData = typeof body?.initData === 'string' ? body.initData : '';

    if (!initData) {
      return NextResponse.json(
        { ok: false, reason: 'missing_init_data' },
        { status: 400 }
      );
    }

    const tgUser = verifyTelegramInitData(initData);
    if (!tgUser) {
      return NextResponse.json(
        { ok: false, reason: 'telegram_auth_unverified_or_unconfigured' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        ok: false,
        reason: 'supabase_unconfigured',
        telegramUserId: tgUser.id,
      });
    }

    const syncCode = `TG-${tgUser.id}`;

    if (action === 'load') {
      const { data, error } = await supabase
        .from('hyptrix_cloud_saves')
        .select('state_json, studio_name, game_day, updated_at')
        .or(`telegram_user_id.eq.${tgUser.id},sync_code.eq.${syncCode}`)
        .maybeSingle();

      if (error || !data?.state_json) {
        return NextResponse.json({
          ok: true,
          found: false,
          telegramUserId: tgUser.id,
        });
      }

      return NextResponse.json({
        ok: true,
        found: true,
        telegramUserId: tgUser.id,
        updatedAt: data.updated_at,
        state: data.state_json,
      });
    }

    // action === 'save'
    const stateSnapshot = body?.state;
    if (!stateSnapshot || typeof stateSnapshot !== 'object') {
      return NextResponse.json(
        { ok: false, reason: 'missing_state' },
        { status: 400 }
      );
    }

    const row = {
      sync_code: syncCode,
      telegram_user_id: tgUser.id,
      studio_name: String(stateSnapshot.studioName || 'Neelyo Studio').slice(0, 80),
      ceo_name: String(stateSnapshot.ceoName || tgUser.firstName || 'المنتج').slice(0, 80),
      market_value: Math.round(Number(stateSnapshot.marketValue || 75_000_000)),
      game_day: Math.max(1, Math.round(Number(stateSnapshot.gameDay || 1))),
      state_json: stateSnapshot,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('hyptrix_cloud_saves')
      .upsert(row, { onConflict: 'sync_code' });

    if (error) {
      return NextResponse.json(
        { ok: false, reason: 'db_write_error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      saved: true,
      telegramUserId: tgUser.id,
      updatedAt: row.updated_at,
    });
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'internal_error' },
      { status: 500 }
    );
  }
}
