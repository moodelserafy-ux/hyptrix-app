import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type {
  LedgerVerificationRequest,
  LedgerVerificationResponse,
} from '@/lib/supabase';

const LEDGER_SECRET =
  process.env.LEDGER_HMAC_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'hyptrix-cinema-tycoon-vault-hmac-2026';

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

// Authoritative server-side catalog of Fixed Studio Assets & their official prices
const OFFICIAL_STUDIO_ASSET_PRICES: Record<string, number> = {
  soundstage_complex: 28_000_000,
  vfx_post_suite: 22_000_000,
  cinema_camera_fleet: 16_000_000,
  legal_censorship_shield: 14_000_000,
  talent_academy: 19_000_000,
};

// Authoritative server-side catalog of PR & Electronic Committees campaigns
const OFFICIAL_PR_CAMPAIGN_PRICES: Record<string, number> = {
  tiktok_viral_wave: 4_500_000,
  x_hashtag_storm: 6_000_000,
  rival_smear_campaign: 8_500_000,
  critics_vip_screening: 5_500_000,
};

// In-memory server vault fallback when Supabase env vars are not yet connected
const serverMemoryVault = new Map<
  string,
  {
    cash: number;
    marketValue: number;
    reputation: number;
    ownedAssets: string[];
    signature: string;
    updatedAt: string;
  }
>();

function computeLedgerSignature(
  studioInstanceId: string,
  cash: number,
  ownedAssets: string[]
): string {
  const normalizedAssets = [...ownedAssets].sort().join(',');
  const raw = `${studioInstanceId}:${Math.round(cash)}:${normalizedAssets}`;
  return crypto
    .createHmac('sha256', LEDGER_SECRET)
    .update(raw)
    .digest('hex')
    .slice(0, 32);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studioInstanceId =
    searchParams.get('studioInstanceId') || 'default_studio';
  const clientCash = Number(searchParams.get('cash') || 75_000_000);
  const clientMarketValue = Number(
    searchParams.get('marketValue') || 110_000_000
  );
  const clientAssetsRaw = searchParams.get('assets') || '';
  const clientAssets = clientAssetsRaw
    ? clientAssetsRaw.split(',').filter(Boolean)
    : [];
  const clientSig = searchParams.get('sig') || '';

  // 1. Check Supabase authoritative wallet if configured
  if (serverSupabase) {
    try {
      const { data } = await serverSupabase
        .from('hyptrix_studio_wallets')
        .select('*')
        .eq('studio_instance_id', studioInstanceId)
        .maybeSingle();

      if (data) {
        const dbCash = Number(data.verified_cash ?? clientCash);
        const dbMarketVal = Number(
          data.verified_market_value ?? clientMarketValue
        );
        const dbAssets: string[] = Array.isArray(data.owned_assets)
          ? data.owned_assets
          : clientAssets;
        const freshSig = computeLedgerSignature(
          studioInstanceId,
          dbCash,
          dbAssets
        );
        const tamperDetected =
          Boolean(clientSig) &&
          Math.abs(clientCash - dbCash) > 50_000_000 &&
          clientSig !== freshSig;

        return NextResponse.json({
          ok: true,
          verified: true,
          tamperDetected,
          correctedCash: tamperDetected ? dbCash : clientCash,
          correctedMarketValue: tamperDetected
            ? dbMarketVal
            : clientMarketValue,
          ownedAssets: dbAssets,
          ledgerSignature: computeLedgerSignature(
            studioInstanceId,
            tamperDetected ? dbCash : clientCash,
            dbAssets
          ),
          serverTimestamp: new Date().toISOString(),
        } satisfies LedgerVerificationResponse);
      }
    } catch {
      // Fallback to HMAC signature check
    }
  }

  // 2. Check in-memory server vault & HMAC signature
  const cached = serverMemoryVault.get(studioInstanceId);
  const expectedSigForClient = computeLedgerSignature(
    studioInstanceId,
    clientCash,
    clientAssets
  );

  // If the client had a previous signature that doesn't match and jumped by > 150M without a server transaction, revert to cached
  if (
    cached &&
    clientSig &&
    clientSig !== expectedSigForClient &&
    clientCash - cached.cash > 150_000_000
  ) {
    return NextResponse.json({
      ok: true,
      verified: true,
      tamperDetected: true,
      correctedCash: cached.cash,
      correctedMarketValue: cached.marketValue,
      ownedAssets: cached.ownedAssets,
      ledgerSignature: cached.signature,
      message:
        'تم رصد تعديل غير مصرح به في الرصيد المحلي؛ تمت استعادة الرصيد الموثق من الخادم.',
      serverTimestamp: new Date().toISOString(),
    } satisfies LedgerVerificationResponse);
  }

  const newSig = computeLedgerSignature(
    studioInstanceId,
    clientCash,
    clientAssets
  );
  serverMemoryVault.set(studioInstanceId, {
    cash: clientCash,
    marketValue: clientMarketValue,
    reputation: 62,
    ownedAssets: clientAssets,
    signature: newSig,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    verified: true,
    tamperDetected: false,
    correctedCash: clientCash,
    correctedMarketValue: clientMarketValue,
    ownedAssets: clientAssets,
    ledgerSignature: newSig,
    serverTimestamp: new Date().toISOString(),
  } satisfies LedgerVerificationResponse);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LedgerVerificationRequest;
    const studioInstanceId = body.studioInstanceId || 'default_studio';
    const previousCash = Number(body.previousCash ?? 75_000_000);
    let amountDelta = Number(body.amountDelta ?? 0);
    const ownedAssets = Array.isArray(body.ownedAssets)
      ? [...body.ownedAssets]
      : [];

    // Enforce authoritative server pricing on Fixed Studio Asset purchases
    if (body.transactionType === 'PURCHASE_STUDIO_ASSET' && body.itemId) {
      const officialPrice = OFFICIAL_STUDIO_ASSET_PRICES[body.itemId];
      if (!officialPrice) {
        return NextResponse.json(
          {
            ok: false,
            verified: false,
            correctedCash: previousCash,
            correctedMarketValue: body.marketValue,
            ownedAssets,
            ledgerSignature: body.previousSignature || '',
            message: 'أصل الاستوديو المطلوب غير مسجل في السجل الرسمي.',
          } satisfies LedgerVerificationResponse,
          { status: 400 }
        );
      }
      if (previousCash < officialPrice) {
        return NextResponse.json(
          {
            ok: false,
            verified: false,
            correctedCash: previousCash,
            correctedMarketValue: body.marketValue,
            ownedAssets,
            ledgerSignature: computeLedgerSignature(
              studioInstanceId,
              previousCash,
              ownedAssets
            ),
            message: 'الرصيد الموثق على الخادم لا يكفي لشراء هذا الأصل الثابت.',
          } satisfies LedgerVerificationResponse,
          { status: 400 }
        );
      }
      amountDelta = -officialPrice;
      if (!ownedAssets.includes(body.itemId)) {
        ownedAssets.push(body.itemId);
      }
    }

    // Enforce authoritative server pricing on Social Media & PR Campaigns
    if (body.transactionType === 'LAUNCH_PR_CAMPAIGN' && body.itemId) {
      const officialPrPrice = OFFICIAL_PR_CAMPAIGN_PRICES[body.itemId];
      if (officialPrPrice) {
        if (previousCash < officialPrPrice) {
          return NextResponse.json(
            {
              ok: false,
              verified: false,
              correctedCash: previousCash,
              correctedMarketValue: body.marketValue,
              ownedAssets,
              ledgerSignature: computeLedgerSignature(
                studioInstanceId,
                previousCash,
                ownedAssets
              ),
              message: 'الرصيد الموثق في الخزينة لا يكفي لتمويل هذه الحملة.',
            } satisfies LedgerVerificationResponse,
            { status: 400 }
          );
        }
        amountDelta = -officialPrPrice;
      }
    }

    const verifiedNewCash = Math.max(0, Math.round(previousCash + amountDelta));
    const verifiedMarketValue = Math.max(
      25_000_000,
      Math.round(Number(body.marketValue || 110_000_000))
    );
    const ledgerSignature = computeLedgerSignature(
      studioInstanceId,
      verifiedNewCash,
      ownedAssets
    );

    // Update in-memory server vault
    serverMemoryVault.set(studioInstanceId, {
      cash: verifiedNewCash,
      marketValue: verifiedMarketValue,
      reputation: Number(body.reputation || 62),
      ownedAssets,
      signature: ledgerSignature,
      updatedAt: new Date().toISOString(),
    });

    // Persist to Supabase if configured
    if (serverSupabase) {
      try {
        await serverSupabase.from('hyptrix_studio_wallets').upsert(
          {
            studio_instance_id: studioInstanceId,
            user_email: body.userEmail || null,
            studio_name: body.studioName,
            ceo_name: body.ceoName,
            verified_cash: verifiedNewCash,
            verified_market_value: verifiedMarketValue,
            reputation: Number(body.reputation || 62),
            owned_assets: ownedAssets,
            ledger_signature: ledgerSignature,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'studio_instance_id' }
        );

        if (amountDelta !== 0 || body.transactionType !== 'SYNC_CHECKPOINT') {
          await serverSupabase.from('hyptrix_ledger_transactions').insert({
            studio_instance_id: studioInstanceId,
            studio_name: body.studioName,
            transaction_type: body.transactionType,
            item_id: body.itemId || null,
            item_label: body.itemLabel || null,
            amount_delta: amountDelta,
            balance_before: previousCash,
            balance_after: verifiedNewCash,
            ledger_signature: ledgerSignature,
          });
        }
      } catch {
        // Non-blocking if tables are not yet created by the user in Supabase
      }
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      tamperDetected: false,
      correctedCash: verifiedNewCash,
      correctedMarketValue: verifiedMarketValue,
      ownedAssets,
      ledgerSignature,
      serverTimestamp: new Date().toISOString(),
    } satisfies LedgerVerificationResponse);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        verified: false,
        correctedCash: 75_000_000,
        correctedMarketValue: 110_000_000,
        ownedAssets: [],
        ledgerSignature: '',
        message: 'خطأ في معالجة التحقق المالي.',
      } satisfies LedgerVerificationResponse,
      { status: 500 }
    );
  }
}
