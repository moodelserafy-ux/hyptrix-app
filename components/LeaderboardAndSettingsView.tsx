'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useGameStore, getDaysRemainingUntilAnnualAwards } from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { getMarketProfile } from '@/lib/market-profiles';
import {
  syncAndFetchRealPlayersLeaderboard,
  RealPlayersLeaderboardResponse,
  getOrCreateStudioInstanceId,
} from '@/lib/supabase';
import { StudioLogoSvg } from './StudioLogoSvg';
import { WorldFlagArt } from './WorldFlagArt';
import {
  Trophy,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Globe,
  Building2,
  RefreshCw,
  Crown,
  Award,
} from 'lucide-react';

export function LeaderboardAndSettingsView() {
  const {
    studioName,
    ceoName,
    logo,
    cash,
    marketValue,
    reputation,
    gameDay,
    releasedProjects,
    emergingCompetitors,
    competitorNetWorthDelta,
    customDbPatch,
    ledgerSignature,
    ownedStudioAssets,
    resetEntireGameAndStartFresh,
    worldMarket,
    openMarketSelector,
  } = useGameStore();

  const marketProfile = getMarketProfile(worldMarket);
  const currencyLabel = marketProfile.currencyLabel;

  const [subTab, setSubTab] = useState<'real_players' | 'world_studios' | 'system'>(
    'real_players'
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSwitchMarket, setConfirmSwitchMarket] = useState(false);
  const [page, setPage] = useState(0);

  // Real Players Top 15 Global Leaderboard State
  const [realLeaderboard, setRealLeaderboard] =
    useState<RealPlayersLeaderboardResponse | null>(null);
  const [loadingReal, setLoadingReal] = useState(false);

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch, worldMarket),
    [customDbPatch, worldMarket]
  );

  const daysUntilAnnualAwards = getDaysRemainingUntilAnnualAwards(gameDay);

  const playerTotalAwards = useMemo(
    () => releasedProjects.reduce((sum, p) => sum + p.awardsWon.length, 0),
    [releasedProjects]
  );

  const loadRealPlayersRanking = useCallback(async () => {
    setLoadingReal(true);
    try {
      const data = await syncAndFetchRealPlayersLeaderboard({
        studioName: studioName || marketProfile.defaultStudioName,
        ceoName: ceoName || 'المدير التنفيذي',
        marketValue,
        cash,
        reputation,
        releasedCount: releasedProjects.length,
        totalAwards: playerTotalAwards,
        ledgerSignature,
        ownedStudioAssets,
      });
      if (data) {
        setRealLeaderboard(data);
      }
    } finally {
      setLoadingReal(false);
    }
  }, [
    studioName,
    marketProfile.defaultStudioName,
    ceoName,
    marketValue,
    cash,
    reputation,
    releasedProjects.length,
    playerTotalAwards,
    ledgerSignature,
    ownedStudioAssets,
  ]);

  useEffect(() => {
    if (subTab !== 'real_players') return;
    let active = true;

    syncAndFetchRealPlayersLeaderboard({
      studioName: studioName || marketProfile.defaultStudioName,
      ceoName: ceoName || 'المدير التنفيذي',
      marketValue,
      cash,
      reputation,
      releasedCount: releasedProjects.length,
      totalAwards: playerTotalAwards,
      ledgerSignature,
      ownedStudioAssets,
    }).then((data) => {
      if (active && data) {
        setRealLeaderboard(data);
      }
    });

    return () => {
      active = false;
    };
  }, [
    subTab,
    studioName,
    marketProfile.defaultStudioName,
    ceoName,
    marketValue,
    cash,
    reputation,
    releasedProjects.length,
    playerTotalAwards,
    ledgerSignature,
    ownedStudioAssets,
  ]);

  const combinedWorldLeaderboard = useMemo(() => {
    const playerEntry = {
      id: 'player_studio',
      name: studioName || marketProfile.defaultStudioName,
      ceo: ceoName || 'المدير التنفيذي',
      netWorth: marketValue,
      reputation,
      releasesCount: releasedProjects.length,
      awardsCount: playerTotalAwards,
      isPlayer: true,
    };

    const allRivals = [...db.competitor_studios, ...emergingCompetitors].map(
      (comp) => {
        const delta = competitorNetWorthDelta[comp.name] || {
          netWorthDelta: 0,
          releasesDelta: 0,
          awardsDelta: 0,
        };
        const baseWorth =
          comp.estimated_net_worth || comp.market_power * 4_500_000;
        return {
          id: comp.id,
          name: comp.name,
          ceo: comp.ceoName || comp.ceo || 'مجلس الإدارة',
          netWorth: Math.max(30_000_000, baseWorth + delta.netWorthDelta),
          reputation: comp.market_power,
          releasesCount: 4 + delta.releasesDelta,
          awardsCount: 2 + delta.awardsDelta,
          isPlayer: false,
        };
      }
    );

    return [playerEntry, ...allRivals].sort((a, b) => b.netWorth - a.netWorth);
  }, [
    studioName,
    marketProfile.defaultStudioName,
    ceoName,
    marketValue,
    reputation,
    releasedProjects.length,
    playerTotalAwards,
    db.competitor_studios,
    emergingCompetitors,
    competitorNetWorthDelta,
  ]);

  const pageSize = 6;
  const totalPages = Math.max(
    1,
    Math.ceil(combinedWorldLeaderboard.length / pageSize)
  );
  const safePage = Math.min(page, totalPages - 1);
  const visibleWorldRows = combinedWorldLeaderboard.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize
  );

  const myStudioInstanceId = useMemo(() => getOrCreateStudioInstanceId(), []);
  const top15RealPlayers = (realLeaderboard?.top15 || []).slice(0, 15);
  const myRealRank = realLeaderboard?.currentPlayerRank ?? null;
  const isPlayerBelowTop15 = myRealRank !== null && myRealRank > 15;
  const gapToTop15 =
    isPlayerBelowTop15 && realLeaderboard?.fifteenthMarketValue
      ? Math.max(0, realLeaderboard.fifteenthMarketValue - marketValue + 1_000_000)
      : 0;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Unified Royal Cinema Header & Tabs */}
      <div className="rounded-3xl bg-[#1A2530] text-[#F9F6F0] border-2 border-[#D4AF37] p-3.5 sm:p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#D91624] text-[#D4AF37] border border-[#D4AF37] shadow">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg text-[#F9F6F0]">
                بورصة التصنيف العالمي وترتيب الاستوديوهات
              </h2>
              <p className="text-[11px] font-bold text-[#D4AF37]">
                حفل الجوائز السنوي التلقائي بعد {daysUntilAnnualAwards} يوم
              </p>
            </div>
          </div>

          {subTab === 'real_players' && (
            <button
              type="button"
              onClick={loadRealPlayersRanking}
              disabled={loadingReal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] hover:brightness-110 px-3 py-1.5 text-xs font-black text-[#1A2530] transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingReal ? 'animate-spin' : ''}`}
              />
              <span>تحديث الترتيب المباشر</span>
            </button>
          )}
        </div>

        {/* Segmented Filter Controls */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-[#0F171E] p-1.5 border border-[#D4AF37]/30">
          <button
            type="button"
            onClick={() => setSubTab('real_players')}
            className={`flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer whitespace-nowrap ${
              subTab === 'real_players'
                ? 'bg-[#D91624] text-white border border-[#D4AF37] shadow'
                : 'text-[#F9F6F0]/75 hover:text-[#F9F6F0]'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>ترتيب اللاعبين الحقيقيين (أفضل 15)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('world_studios')}
            className={`flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer whitespace-nowrap ${
              subTab === 'world_studios'
                ? 'bg-[#D4AF37] text-[#1A2530] shadow'
                : 'text-[#F9F6F0]/75 hover:text-[#F9F6F0]'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>بورصة شركات العالم</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('system')}
            className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer whitespace-nowrap ${
              subTab === 'system'
                ? 'bg-[#D91624] text-white shadow'
                : 'text-[#F9F6F0]/75 hover:text-[#F9F6F0]'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>إعادة التأسيس</span>
          </button>
        </div>
      </div>

      {/* TAB 1: REAL PLAYERS GLOBAL TOP 15 LEADERBOARD */}
      {subTab === 'real_players' && (
        <div className="space-y-3">
          {/* Quick Status Header showing exact player rank */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[#D4AF37] bg-[#FFF9E6] px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-black text-[#1A2530]">
              <Crown className="h-4 w-4 text-[#D91624]" />
              <span>
                يُعرض أفضل 15 إمبراطورية إنتاج للاعبين الحقيقيين فقط · إجمالي اللاعبين المسجلين:{' '}
                <strong className="font-typewriter text-[#D91624] tabular-nums">
                  {realLeaderboard?.totalPlayers || top15RealPlayers.length || 1}
                </strong>
              </span>
            </div>
            {myRealRank !== null && (
              <span className="font-typewriter text-xs font-black text-[#1A2530] tabular-nums">
                مركزك الحالي:{' '}
                <strong className="text-[#D91624]">#{myRealRank}</strong>
              </span>
            )}
          </div>

          {loadingReal && top15RealPlayers.length === 0 ? (
            <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-8 text-center space-y-2">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#D91624]" />
              <p className="text-xs font-extrabold text-[#1A2530]">
                جاري مزامنة ترتيب اللاعبين الحقيقيين...
              </p>
            </div>
          ) : top15RealPlayers.length === 0 ? (
            <div className="rounded-3xl border-2 border-[#D4AF37] bg-white p-6 text-center space-y-2">
              <Trophy className="mx-auto h-8 w-8 text-[#D4AF37]" />
              <p className="text-sm font-black text-[#1A2530]">
                أنت أول شركة إنتاج مسجلة حالياً في الترتيب العالمي!
              </p>
              <p className="text-xs font-bold text-[#1A2530]/70">
                سيظهر باقي اللاعبين الحقيقيين هنا تلقائياً فور دخولهم وبناء استوديوهاتهم.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {top15RealPlayers.map((entry, idx) => {
                const rankNum = idx + 1;
                const isMe =
                  entry.isCurrentPlayer === true ||
                  (Boolean(entry.studio_instance_id) &&
                    entry.studio_instance_id === myStudioInstanceId);
                return (
                  <div
                    key={`${entry.studio_instance_id || entry.studio_name}_${idx}`}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-2.5 transition-all ${
                      isMe
                        ? 'border-[#D91624] bg-[#FFF9E6] shadow-md ring-2 ring-[#D4AF37]'
                        : 'border-[#1A2530]/20 bg-white'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-typewriter text-xs font-black tabular-nums ${
                          rankNum === 1
                            ? 'bg-[#D4AF37] text-[#1A2530] border border-[#1A2530]'
                            : rankNum === 2
                            ? 'bg-[#1A2530] text-[#F9F6F0] border border-[#D4AF37]'
                            : rankNum === 3
                            ? 'bg-[#D91624] text-white border border-[#D4AF37]'
                            : 'bg-[#F9F6F0] text-[#1A2530] border border-[#1A2530]/25'
                        }`}
                      >
                        #{rankNum}
                      </div>

                      {isMe && (
                        <StudioLogoSvg
                          config={logo}
                          size={30}
                          className="shrink-0"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="font-display text-xs font-black text-[#1A2530] sm:text-sm">
                            {entry.studio_name}
                          </h4>
                          {isMe && (
                            <span className="rounded bg-[#D91624] px-1.5 py-0.5 text-[9px] font-black text-white">
                              شركتك
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-[#1A2530]/70">
                          القيادة: {entry.ceo_name} · الأعمال: {entry.released_count} ·
                          الجوائز: {entry.total_awards}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <div className="text-center">
                        <span className="block text-[9px] font-bold text-[#1A2530]/60">
                          السمعة
                        </span>
                        <span className="font-typewriter font-black text-[#1A2530]">
                          {entry.reputation}%
                        </span>
                      </div>
                      <div className="rounded-xl border border-[#D4AF37] bg-[#1A2530] px-3 py-1 text-center">
                        <span className="block text-[9px] font-bold text-[#D4AF37]">
                          القيمة السوقية
                        </span>
                        <span className="font-typewriter text-xs font-black text-[#F9F6F0]">
                          {formatMoney(entry.market_value)} {currencyLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PINNED CURRENT PLAYER RANK CARD WHEN RANKED BELOW #15 */}
          {isPlayerBelowTop15 && myRealRank !== null && (
            <div className="mt-4 rounded-3xl border-3 border-[#D91624] bg-[#1A2530] p-4 text-[#F9F6F0] shadow-xl">
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#D4AF37]/30 pb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#D4AF37]">
                  <Sparkles className="h-4 w-4" />
                  <span>موقع شركتك الحالي خارج قائمة أفضل 15 لاعباً</span>
                </span>
                <span className="font-typewriter text-xs font-black text-white tabular-nums">
                  المركز #{myRealRank} من {realLeaderboard?.totalPlayers || myRealRank}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#D91624] font-typewriter text-sm font-black text-[#FFF3B0] border-2 border-[#D4AF37] tabular-nums">
                    #{myRealRank}
                  </div>
                  <div className="rounded-xl bg-[#F9F6F0] p-1 border border-[#D4AF37]">
                    <StudioLogoSvg config={logo} size={32} />
                  </div>
                  <div>
                    <h4 className="font-display text-sm sm:text-base text-[#F9F6F0]">
                      {studioName || marketProfile.defaultStudioName}
                    </h4>
                    <p className="text-[11px] font-bold text-[#F9F6F0]/80">
                      أنت حالياً في المركز{' '}
                      <strong className="text-[#D4AF37]">#{myRealRank}</strong> عالمياً
                      {gapToTop15 > 0
                        ? ` · تحتاج +${formatMoney(gapToTop15)} ${currencyLabel} قيمة سوقية لدخول قائمة أفضل 15!`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#D4AF37] bg-[#F9F6F0] px-3.5 py-1.5 text-center text-[#1A2530]">
                  <span className="block text-[9px] font-extrabold text-[#1A2530]/65">
                    قيمتك السوقية
                  </span>
                  <span className="font-typewriter text-xs font-black text-[#15803D] tabular-nums">
                    {formatMoney(marketValue)} {currencyLabel}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IN-GAME WORLD STUDIOS RANKING */}
      {subTab === 'world_studios' && (
        <div className="space-y-2.5">
          {visibleWorldRows.map((studio, idx) => {
            const rankNum = safePage * pageSize + idx + 1;
            return (
              <div
                key={studio.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-2.5 transition-all ${
                  studio.isPlayer
                    ? 'border-[#D91624] bg-[#FFF9E6] shadow-md ring-2 ring-[#D4AF37]'
                    : 'border-[#1A2530]/20 bg-white'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-typewriter text-xs font-black tabular-nums ${
                      rankNum === 1
                        ? 'bg-[#D4AF37] text-[#1A2530] border border-[#1A2530]'
                        : rankNum === 2
                        ? 'bg-[#1A2530] text-[#F9F6F0] border border-[#D4AF37]'
                        : rankNum === 3
                        ? 'bg-[#D91624] text-white border border-[#D4AF37]'
                        : 'bg-[#F9F6F0] text-[#1A2530] border border-[#1A2530]/25'
                    }`}
                  >
                    #{rankNum}
                  </div>

                  {studio.isPlayer && (
                    <StudioLogoSvg config={logo} size={28} className="shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="font-display text-xs font-black text-[#1A2530] sm:text-sm">
                        {studio.name}
                      </h4>
                      {studio.isPlayer && (
                        <span className="rounded bg-[#D91624] px-1.5 py-0.5 text-[9px] font-black text-white">
                          شركتك
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold leading-relaxed text-[#1A2530]/70">
                      القيادة: {studio.ceo} · الأعمال: {studio.releasesCount} ·
                      <Award className="inline h-3 w-3 mx-0.5 text-[#D4AF37]" />
                      {studio.awardsCount} جوائز
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <div className="text-center">
                    <span className="block text-[9px] font-bold text-[#1A2530]/60">
                      السمعة
                    </span>
                    <span className="font-typewriter font-black text-[#1A2530]">
                      {studio.reputation}%
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#D4AF37] bg-[#1A2530] px-3 py-1 text-center">
                    <span className="block text-[9px] font-bold text-[#D4AF37]">
                      القيمة السوقية
                    </span>
                    <span className="font-typewriter text-xs font-black text-[#F9F6F0]">
                      {formatMoney(studio.netWorth)} {currencyLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t-2 border-[#D4AF37]/30 pt-3">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => {
                  setPage((p) => Math.max(0, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center justify-center rounded-xl border-2 border-[#1A2530] bg-[#F9F6F0] px-4 py-1.5 text-xs font-black text-[#1A2530] disabled:opacity-40 cursor-pointer"
              >
                <span>السابق</span>
              </button>
              <span className="text-xs font-black text-[#1A2530] tabular-nums">
                صفحة {safePage + 1} من {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => {
                  setPage((p) => Math.min(totalPages - 1, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center justify-center rounded-xl bg-[#D91624] border border-[#D4AF37] px-4 py-1.5 text-xs font-black text-white disabled:opacity-40 cursor-pointer"
              >
                <span>التالي</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SYSTEM, WORLD MARKET SWITCH & RESET */}
      {subTab === 'system' && (
        <div className="space-y-3">
          {/* Active World Market Switcher */}
          <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border-2 border-[#D4AF37] bg-[#1A2530] p-5 text-[#F9F6F0] shadow-md sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-[#D4AF37]/60 bg-white/10 p-2 shrink-0">
                <WorldFlagArt market={worldMarket} className="h-8 w-12 rounded" />
              </div>
              <div>
                <h3 className="font-display text-sm font-black text-[#D4AF37]">
                  عالم الإنتاج النشط: {marketProfile.nativeTitle}
                </h3>
                <p className="mt-0.5 text-xs font-bold text-[#F9F6F0]/75">
                  العملة: {marketProfile.currencyFullName} ({currencyLabel}) · يمكنك الانتقال لعالم إنتاج جديد (مثل السعودية والخليج أو مصر) بمسيرة مستقلة.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {!confirmSwitchMarket ? (
                <button
                  type="button"
                  onClick={() => setConfirmSwitchMarket(true)}
                  className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-black text-[#1A2530] shadow hover:brightness-110 cursor-pointer"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>تغيير الدولة / السوق</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      openMarketSelector();
                      setConfirmSwitchMarket(false);
                    }}
                    className="min-h-[40px] rounded-xl bg-[#D91624] border border-[#D4AF37] px-3.5 py-2 text-xs font-black text-white cursor-pointer"
                  >
                    نعم، فتح اختيار الدول
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSwitchMarket(false)}
                    className="min-h-[40px] rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-black text-white cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border-2 border-[#D91624] bg-white p-5 shadow-md sm:flex-row">
            <div>
              <h3 className="flex items-center gap-1.5 font-display text-sm font-black text-[#D91624]">
                <AlertTriangle className="h-4 w-4 text-[#D91624]" />
                <span>إعادة تأسيس الاستوديو من الصفر</span>
              </h3>
              <p className="mt-1 text-xs font-bold text-[#1A2530]/75">
                يتم حفظ تقدمك تلقائياً. إذا أردت البدء باستوديو جديد تماماً يمكنك مسح البيانات الحالية.
              </p>
            </div>

            <div className="shrink-0">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-[#D91624] border border-[#D4AF37] px-4 py-2 text-xs font-black text-white shadow hover:brightness-110 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>إعادة ضبط اللعبة</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetEntireGameAndStartFresh();
                      setConfirmReset(false);
                    }}
                    className="min-h-[40px] rounded-xl bg-[#D91624] px-3.5 py-2 text-xs font-black text-white cursor-pointer"
                  >
                    تأكيد المسح النهائي
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[40px] rounded-xl border-2 border-[#1A2530] bg-[#F9F6F0] px-3.5 py-2 text-xs font-black text-[#1A2530] cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaderboardAndSettingsView;
