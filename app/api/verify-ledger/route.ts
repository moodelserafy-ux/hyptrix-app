import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  computeLedgerSignature,
  verifyLedgerSignature,
  computePlausibleCashCeiling,
  computePlausibleMarketValueCeiling,
  LEDGER_MAX_DRIFT_TOLERANCE,
  MAX_PLAUSIBLE_CASH,
  MAX_PLAUSIBLE_MARKET_VALUE,
  getServerMemoryWallet,
  setServerMemoryWallet,
} from '@/lib/ledger-security';
import {
  STARTING_INDIE_CASH,
  STARTING_INDIE_MARKET_VALUE,
  STARTING_INDIE_REPUTATION,
} from '@/lib/progression';

export const dynamic = 'force-dynamic';

const ALLOWED_FIXED_ASSETS: Record<string, number> = {
  soundstage_complex: 28_000_000,
  vfx_post_suite: 22_000_000,
  cinema_camera_fleet: 16_000_000,
  legal_censorship_shield: 14_000_000,
  talent_academy: 19_000_000,
};

const MAX_POSITIVE_DELTA_BY_TYPE: Record<string, number> = {
  INIT_STUDIO: 100_000_000,
  PROJECT_BOX_OFFICE_REVENUE: 360_000_000,
  VIP_PACKAGE_TOPUP: 65_000_000,
  LAUNCH_PR_CAMPAIGN: 85_000_000,
  SYNC_CHECKPOINT: 40_000_000,
  PURCHASE_STUDIO_ASSET: 0,
  UNLOCK_MARKET_REGION: 0,
  PROJECT_PRODUCTION_SPEND: 0,
  RESOLVE_CRISIS_SPEND: 0,
};

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

function clampCash(val: number): number {
  return Math.max(-500_000_000, Math.min(MAX_PLAUSIBLE_CASH, Math.round(val)));
}

function clampMarketValue(val: number): number {
  return Math.max(0, Math.min(MAX_PLAUSIBLE_MARKET_VALUE, Math.round(val)));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studioInstanceId,
      studioName,
      ceoName,
      userEmail,
      transactionType,
      amountDelta,
      previousCash,
      expectedNewCash,
      marketValue,
      reputation,
      ownedAssets,
      releasedCount,
      totalAwards,
      itemId,
      itemLabel,
      previousSignature,
    } = body || {};

    if (!studioInstanceId || typeof studioInstanceId !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Missing studioInstanceId' },
        { status: 400 }
      );
    }

    const txType = String(transactionType || 'SYNC_CHECKPOINT').slice(0, 48);

    const cleanOwnedAssets: string[] = Array.isArray(ownedAssets)
      ? Array.from(
          new Set(
            ownedAssets.filter(
              (id): id is string =>
                typeof id === 'string' && id in ALLOWED_FIXED_ASSETS
            )
          )
        )
      : [];

    const safeDelta = Number.isFinite(Number(amountDelta))
      ? Math.round(Number(amountDelta))
      : 0;
    const safePrevCash = Number.isFinite(Number(previousCash))
      ? clampCash(Number(previousCash))
      : STARTING_INDIE_CASH;
    const safeExpectedCash = Number.isFinite(Number(expectedNewCash))
      ? clampCash(Number(expectedNewCash))
      : clampCash(safePrevCash + safeDelta);
    const safeMarketValue = Number.isFinite(Number(marketValue))
      ? clampMarketValue(Number(marketValue))
      : STARTING_INDIE_MARKET_VALUE;
    const safeRep = Number.isFinite(Number(reputation))
      ? Math.max(0, Math.min(100, Math.round(Number(reputation))))
      : STARTING_INDIE_REPUTATION;
    const safeReleasedCount = Number.isFinite(Number(releasedCount))
      ? Math.max(0, Math.min(200, Math.round(Number(releasedCount))))
      : 0;
    const safeTotalAwards = Number.isFinite(Number(totalAwards))
      ? Math.max(0, Math.min(500, Math.round(Number(totalAwards))))
      : 0;

    const cashCeiling = computePlausibleCashCeiling({
      releasedCount: safeReleasedCount,
      totalAwards: safeTotalAwards,
      reputation: safeRep,
    });

    // Validate transaction delta bounds strictly server-side
    let authoritativeDelta = safeDelta;
    let nextAssets = [...cleanOwnedAssets];
    let deltaTampered = false;

    if (txType === 'PURCHASE_STUDIO_ASSET' && itemId) {
      const realPrice = ALLOWED_FIXED_ASSETS[String(itemId)];
      if (!realPrice) {
        return NextResponse.json(
          { ok: false, error: 'Invalid studio fixed asset ID' },
          { status: 400 }
        );
      }
      authoritativeDelta = -realPrice;
      if (!nextAssets.includes(String(itemId))) {
        nextAssets.push(String(itemId));
      }
    } else if (authoritativeDelta > 0) {
      const maxPos = MAX_POSITIVE_DELTA_BY_TYPE[txType] ?? 40_000_000;
      if (authoritativeDelta > maxPos) {
        deltaTampered = true;
        authoritativeDelta = maxPos;
      }
    }

    const supabase = getServerSupabase();
    let authoritativeCash = safeExpectedCash;
    let tamperDetected = deltaTampered;
    let storageMode: 'supabase' | 'server_memory' = 'server_memory';

    // Shared resolution helper comparing client state vs server authoritative wallet
    const resolveAuthoritativeState = (
      serverCash: number | null,
      serverAssets: string[]
    ) => {
      if (txType === 'INIT_STUDIO') {
        return {
          finalCash: STARTING_INDIE_CASH,
          finalAssets: [] as string[],
          tampered: false,
        };
      }

      if (serverCash === null) {
        // First time seeing this studio on this server: allow up to plausible cash ceiling
        const boundedPrev = Math.min(safePrevCash, cashCeiling);
        const exceeded = safePrevCash > cashCeiling;
        const computedCash = clampCash(
          Math.min(cashCeiling, boundedPrev + authoritativeDelta)
        );
        return {
          finalCash: computedCash,
          finalAssets: nextAssets,
          tampered: exceeded || deltaTampered,
        };
      }

      const drift = Math.abs(safePrevCash - serverCash);
      const prevSigValid = verifyLedgerSignature(
        studioInstanceId,
        serverCash,
        serverAssets,
        previousSignature
      );

      // If client is synchronized within tolerance, advance cleanly from serverCash + delta
      if (drift <= LEDGER_MAX_DRIFT_TOLERANCE) {
        const computed = clampCash(
          Math.min(cashCeiling, serverCash + authoritativeDelta)
        );
        const mergedAssets =
          txType === 'PURCHASE_STUDIO_ASSET' && itemId
            ? Array.from(new Set([...serverAssets, String(itemId)]))
            : Array.from(new Set([...serverAssets, ...cleanOwnedAssets]));
        return {
          finalCash: computed,
          finalAssets: mergedAssets,
          tampered: deltaTampered,
        };
      }

      // If client exceeded plausible ceiling OR jumped upward with an invalid signature -> snap to server!
      if (
        safePrevCash > cashCeiling ||
        safeExpectedCash > cashCeiling ||
        (!prevSigValid && safePrevCash > serverCash)
      ) {
        const snapped = clampCash(serverCash + authoritativeDelta);
        const safeAssets =
          txType === 'PURCHASE_STUDIO_ASSET' && itemId && snapped >= 0
            ? Array.from(new Set([...serverAssets, String(itemId)]))
            : serverAssets;
        return {
          finalCash: snapped,
          finalAssets: safeAssets,
          tampered: true,
        };
      }

      // Otherwise (e.g., player spent money locally or has valid signature within ceiling), accept smoothly
      const accepted = clampCash(
        Math.min(cashCeiling, safePrevCash + authoritativeDelta)
      );
      const mergedAssets =
        txType === 'PURCHASE_STUDIO_ASSET' && itemId
          ? Array.from(new Set([...serverAssets, String(itemId)]))
          : Array.from(new Set([...serverAssets, ...cleanOwnedAssets]));
      return {
        finalCash: accepted,
        finalAssets: mergedAssets,
        tampered: deltaTampered,
      };
    };

    if (supabase) {
      try {
        const { data: existingWallet } = await supabase
          .from('neelyo_studio_wallets')
          .select('*')
          .eq('studio_instance_id', studioInstanceId)
          .maybeSingle();

        const serverCash = existingWallet
          ? Number(existingWallet.verified_cash ?? existingWallet.cash ?? safePrevCash)
          : null;
        const serverAssets: string[] =
          existingWallet && Array.isArray(existingWallet.owned_assets)
            ? existingWallet.owned_assets.filter(
                (id: unknown): id is string =>
                  typeof id === 'string' && id in ALLOWED_FIXED_ASSETS
              )
            : [];

        const resolved = resolveAuthoritativeState(serverCash, serverAssets);
        authoritativeCash = resolved.finalCash;
        nextAssets = resolved.finalAssets;
        tamperDetected = resolved.tampered;

        const mvCeiling = computePlausibleMarketValueCeiling({
          verifiedCash: authoritativeCash,
          reputation: safeRep,
          releasedCount: safeReleasedCount,
          totalAwards: safeTotalAwards,
          ownedAssetsCount: nextAssets.length,
        });
        const boundedMv = Math.min(safeMarketValue, mvCeiling);

        const newSig = computeLedgerSignature(
          studioInstanceId,
          authoritativeCash,
          nextAssets
        );

        // Canonical schema matching lib/supabase.ts: verified_cash, verified_market_value
        const { error: upsertErr } = await supabase
          .from('neelyo_studio_wallets')
          .upsert(
            {
              studio_instance_id: studioInstanceId,
              studio_name: String(studioName || 'Neelyo Studio').slice(0, 80),
              ceo_name: String(ceoName || 'المدير التنفيذي').slice(0, 80),
              user_email: userEmail ? String(userEmail).slice(0, 120) : null,
              verified_cash: authoritativeCash,
              verified_market_value: boundedMv,
              reputation: safeRep,
              owned_assets: nextAssets,
              ledger_signature: newSig,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'studio_instance_id' }
          );

        if (!upsertErr) {
          storageMode = 'supabase';
          await supabase.from('neelyo_ledger_transactions').insert({
            studio_instance_id: studioInstanceId,
            studio_name: String(studioName || 'Neelyo Studio').slice(0, 80),
            transaction_type: txType,
            amount_delta: authoritativeDelta,
            balance_after: authoritativeCash,
            item_id: itemId ? String(itemId).slice(0, 64) : null,
            item_label: itemLabel ? String(itemLabel).slice(0, 140) : null,
            tamper_flagged: tamperDetected,
            ledger_signature: newSig,
          });
        }
      } catch {
        // Fall through to in-memory authoritative ledger
      }
    }

    if (storageMode === 'server_memory') {
      const prev = getServerMemoryWallet(studioInstanceId);
      const resolved = resolveAuthoritativeState(
        prev ? prev.cash : null,
        prev ? prev.ownedAssets : []
      );
      authoritativeCash = resolved.finalCash;
      nextAssets = resolved.finalAssets;
      tamperDetected = resolved.tampered;

      const mvCeiling = computePlausibleMarketValueCeiling({
        verifiedCash: authoritativeCash,
        reputation: safeRep,
        releasedCount: safeReleasedCount,
        totalAwards: safeTotalAwards,
        ownedAssetsCount: nextAssets.length,
      });
      const boundedMv = Math.min(safeMarketValue, mvCeiling);

      const memSig = computeLedgerSignature(
        studioInstanceId,
        authoritativeCash,
        nextAssets
      );
      setServerMemoryWallet(studioInstanceId, {
        cash: authoritativeCash,
        marketValue: boundedMv,
        reputation: safeRep,
        ownedAssets: nextAssets,
        signature: memSig,
        updatedAt: new Date().toISOString(),
      });
    }

    const mvCeilingFinal = computePlausibleMarketValueCeiling({
      verifiedCash: authoritativeCash,
      reputation: safeRep,
      releasedCount: safeReleasedCount,
      totalAwards: safeTotalAwards,
      ownedAssetsCount: nextAssets.length,
    });
    const finalMarketValue = Math.min(safeMarketValue, mvCeilingFinal);
    const finalSignature = computeLedgerSignature(
      studioInstanceId,
      authoritativeCash,
      nextAssets
    );

    return NextResponse.json({
      ok: true,
      verified: !tamperDetected,
      storageMode,
      tamperDetected,
      correctedCash: authoritativeCash,
      correctedMarketValue: finalMarketValue,
      ownedAssets: nextAssets,
      ledgerSignature: finalSignature,
      message: tamperDetected
        ? 'تم رصد اختلاف غير مطابق في رصيد الخزينة وإعادة المزامنة مع السجل المالي الموثق على الخادم.'
        : 'تم توثيق العملية المالية بنجاح في خزينة الاستوديو.',
    });
  } catch (err) {
    console.error('verify-ledger POST error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to verify ledger transaction' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studioInstanceId = searchParams.get('studioInstanceId') || '';
    const clientCash = Number(
      searchParams.get('cash') ??
        searchParams.get('clientCash') ??
        String(STARTING_INDIE_CASH)
    );
    const clientMarketValue = Number(
      searchParams.get('marketValue') ??
        searchParams.get('clientMarketValue') ??
        String(STARTING_INDIE_MARKET_VALUE)
    );
    const clientSignature =
      searchParams.get('sig') ?? searchParams.get('signature') ?? '';
    const clientAssetsRaw = searchParams.get('assets') || '';
    const clientAssets = clientAssetsRaw
      ? clientAssetsRaw
          .split(',')
          .filter((a) => a && a in ALLOWED_FIXED_ASSETS)
      : [];
    const releasedCount = Math.max(
      0,
      Math.min(200, Math.round(Number(searchParams.get('releasedCount') || '0')))
    );
    const totalAwards = Math.max(
      0,
      Math.min(500, Math.round(Number(searchParams.get('totalAwards') || '0')))
    );
    const reputation = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          Number(
            searchParams.get('reputation') || String(STARTING_INDIE_REPUTATION)
          )
        )
      )
    );

    if (!studioInstanceId) {
      return NextResponse.json(
        { ok: false, error: 'Missing studioInstanceId' },
        { status: 400 }
      );
    }

    const cashCeiling = computePlausibleCashCeiling({
      releasedCount,
      totalAwards,
      reputation,
    });
    const mvCeiling = computePlausibleMarketValueCeiling({
      verifiedCash: Math.min(clientCash, cashCeiling),
      reputation,
      releasedCount,
      totalAwards,
      ownedAssetsCount: clientAssets.length,
    });

    const evaluateGetCheck = (
      serverCash: number,
      serverMv: number,
      serverAssets: string[]
    ) => {
      const sigValid = verifyLedgerSignature(
        studioInstanceId,
        clientCash,
        clientAssets,
        clientSignature
      );

      // Only flag tamper on GET when:
      // 1) Client exceeds the realistic gameplay ceiling (e.g. edited localStorage to billions), OR
      // 2) Client has an invalid signature AND jumped massively (> 35M) above server balance with 0 releases
      const exceedsCeiling =
        clientCash > cashCeiling || clientMarketValue > mvCeiling;
      const suspiciousUnsignedJump =
        !sigValid &&
        releasedCount === 0 &&
        clientCash > serverCash + LEDGER_MAX_DRIFT_TOLERANCE;

      const tamperDetected = exceedsCeiling || suspiciousUnsignedJump;

      if (tamperDetected) {
        return {
          tamperDetected: true,
          finalCash: Math.min(serverCash, cashCeiling),
          finalMv: Math.min(serverMv, mvCeiling),
          finalAssets: serverAssets,
        };
      }

      // Client cash is plausible (including legitimate earnings synced or earned offline)
      return {
        tamperDetected: false,
        finalCash: clampCash(clientCash),
        finalMv: clampMarketValue(clientMarketValue),
        finalAssets: Array.from(new Set([...serverAssets, ...clientAssets])),
      };
    };

    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const { data: wallet } = await supabase
          .from('neelyo_studio_wallets')
          .select('*')
          .eq('studio_instance_id', studioInstanceId)
          .maybeSingle();

        if (wallet) {
          const serverCash = Number(
            wallet.verified_cash ?? wallet.cash ?? clientCash
          );
          const serverMv = Number(
            wallet.verified_market_value ??
              wallet.market_value ??
              clientMarketValue
          );
          const serverAssets: string[] = Array.isArray(wallet.owned_assets)
            ? wallet.owned_assets
            : [];

          const check = evaluateGetCheck(serverCash, serverMv, serverAssets);
          const newSig = computeLedgerSignature(
            studioInstanceId,
            check.finalCash,
            check.finalAssets
          );

          // If legitimate progress occurred since last sync, refresh server wallet silently
          if (!check.tamperDetected && check.finalCash !== serverCash) {
            await supabase
              .from('neelyo_studio_wallets')
              .update({
                verified_cash: check.finalCash,
                verified_market_value: check.finalMv,
                owned_assets: check.finalAssets,
                ledger_signature: newSig,
                updated_at: new Date().toISOString(),
              })
              .eq('studio_instance_id', studioInstanceId);
          }

          return NextResponse.json({
            ok: true,
            verified: !check.tamperDetected,
            source: 'supabase',
            tamperDetected: check.tamperDetected,
            correctedCash: check.finalCash,
            correctedMarketValue: check.finalMv,
            ownedAssets: check.finalAssets,
            ledgerSignature: newSig,
            message: check.tamperDetected
              ? 'تمت استعادة رصيد الخزينة الموثق من الخادم حمايةً لنزاهة الترتيب العالمي.'
              : 'خزينة الاستوديو متطابقة وموثقة بالكامل.',
          });
        }
      } catch {
        // Fallback to server memory
      }
    }

    const mem = getServerMemoryWallet(studioInstanceId);
    if (mem) {
      const check = evaluateGetCheck(mem.cash, mem.marketValue, mem.ownedAssets);
      const newSig = computeLedgerSignature(
        studioInstanceId,
        check.finalCash,
        check.finalAssets
      );

      if (!check.tamperDetected && check.finalCash !== mem.cash) {
        setServerMemoryWallet(studioInstanceId, {
          ...mem,
          cash: check.finalCash,
          marketValue: check.finalMv,
          ownedAssets: check.finalAssets,
          signature: newSig,
          updatedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        ok: true,
        verified: !check.tamperDetected,
        source: 'server_memory',
        tamperDetected: check.tamperDetected,
        correctedCash: check.finalCash,
        correctedMarketValue: check.finalMv,
        ownedAssets: check.finalAssets,
        ledgerSignature: newSig,
        message: check.tamperDetected
          ? 'تمت مطابقة رصيدك مع السجل المالي الموثق على الخادم.'
          : 'خزينة الاستوديو موثقة بالكامل.',
      });
    }

    const initialTamper =
      clientCash > cashCeiling || clientMarketValue > mvCeiling;
    const safeInitialCash = initialTamper
      ? cashCeiling
      : clampCash(clientCash);
    const safeInitialMv = initialTamper
      ? mvCeiling
      : clampMarketValue(clientMarketValue);
    const initSig = computeLedgerSignature(
      studioInstanceId,
      safeInitialCash,
      clientAssets
    );

    setServerMemoryWallet(studioInstanceId, {
      cash: safeInitialCash,
      marketValue: safeInitialMv,
      reputation,
      ownedAssets: clientAssets,
      signature: initSig,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      verified: !initialTamper,
      source: 'initialized',
      tamperDetected: initialTamper,
      correctedCash: safeInitialCash,
      correctedMarketValue: safeInitialMv,
      ownedAssets: clientAssets,
      ledgerSignature: initSig,
      message: initialTamper
        ? 'تم ضبط رصيد الخزينة ضمن الحد القانوني الموثق.'
        : 'تم تفعيل سجل التوثيق المالي للاستوديو.',
    });
  } catch (err) {
    console.error('verify-ledger GET error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to read ledger' },
      { status: 500 }
    );
  }
}
