'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useGameStore, getDaysRemainingUntilAnnualAwards } from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import { getResolvedDatabase, type GenreId } from '@/lib/db-resolver';
import {
  getUiDir,
  getLocalizedMarketInfo,
  getLocalizedGenreInfo,
  localizeEntityName,
  tr,
} from '@/lib/i18n';
import {
  syncAndFetchRealPlayersLeaderboard,
  RealPlayersLeaderboardResponse,
  getOrCreateStudioInstanceId,
} from '@/lib/supabase';
import { getSiteUrl } from '@/lib/site-url';
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
  Flame,
  Gift,
  Copy,
  Check,
  Share2,
  Send,
} from 'lucide-react';

interface WeeklyChallengeData {
  weekKey: string;
  title: string;
  description: string;
  requiredGenre: string;
  requiredGenreAr: string;
  maxBudget: number;
  rewardLabel: string;
  endsInDays: number;
}

interface WeeklyChallengeEntry {
  studio_instance_id: string;
  studio_name: string;
  ceo_name: string;
  project_title: string;
  world_market: string;
  score_value: number;
  budget_used: number;
  critic_score: number;
}

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
    uiLanguage,
    openMarketSelector,
    showToast,
  } = useGameStore();

  const isAr = uiLanguage === 'ar';
  const dir = getUiDir(uiLanguage);
  const marketInfo = getLocalizedMarketInfo(worldMarket, uiLanguage);
  const currencyLabel = marketInfo.currencyLabel;

  const [subTab, setSubTab] = useState<
    'real_players' | 'world_studios' | 'challenges' | 'system'
  >('real_players');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSwitchMarket, setConfirmSwitchMarket] = useState(false);
  const [page, setPage] = useState(0);

  const [realLeaderboard, setRealLeaderboard] =
    useState<RealPlayersLeaderboardResponse | null>(null);
  const [loadingReal, setLoadingReal] = useState(false);

  const [weeklyChallenge, setWeeklyChallenge] =
    useState<WeeklyChallengeData | null>(null);
  const [challengeEntries, setChallengeEntries] = useState<
    WeeklyChallengeEntry[]
  >([]);
  const [referralCount, setReferralCount] = useState(0);
  const [botUsername, setBotUsername] = useState('');
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [submittingChallengeId, setSubmittingChallengeId] = useState<
    string | null
  >(null);
  const [copiedRefLink, setCopiedRefLink] = useState(false);

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch, worldMarket),
    [customDbPatch, worldMarket]
  );

  const daysUntilAnnualAwards = getDaysRemainingUntilAnnualAwards(gameDay);

  const playerTotalAwards = useMemo(
    () => releasedProjects.reduce((sum, p) => sum + p.awardsWon.length, 0),
    [releasedProjects]
  );

  const defaultCeoFallback = tr(uiLanguage, 'Executive Producer', 'المدير التنفيذي');

  const loadRealPlayersRanking = useCallback(async () => {
    setLoadingReal(true);
    try {
      const data = await syncAndFetchRealPlayersLeaderboard({
        studioName: studioName || marketInfo.defaultStudioName,
        ceoName: ceoName || defaultCeoFallback,
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
    marketInfo.defaultStudioName,
    ceoName,
    defaultCeoFallback,
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
      studioName: studioName || marketInfo.defaultStudioName,
      ceoName: ceoName || defaultCeoFallback,
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
    marketInfo.defaultStudioName,
    ceoName,
    defaultCeoFallback,
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
      name: studioName || marketInfo.defaultStudioName,
      ceo: ceoName || defaultCeoFallback,
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
          name: localizeEntityName(comp.name, uiLanguage),
          ceo: localizeEntityName(
            comp.ceoName || comp.ceo || tr(uiLanguage, 'Executive Board', 'مجلس الإدارة'),
            uiLanguage
          ),
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
    marketInfo.defaultStudioName,
    ceoName,
    defaultCeoFallback,
    marketValue,
    reputation,
    releasedProjects.length,
    playerTotalAwards,
    db.competitor_studios,
    emergingCompetitors,
    competitorNetWorthDelta,
    uiLanguage,
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

  const loadSocialGrowthData = useCallback(async () => {
    setLoadingSocial(true);
    try {
      const res = await fetch(
        `/api/social-growth?studioInstanceId=${encodeURIComponent(
          myStudioInstanceId
        )}&lang=${encodeURIComponent(uiLanguage)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.challenge) setWeeklyChallenge(data.challenge);
        if (Array.isArray(data?.topEntries)) setChallengeEntries(data.topEntries);
        if (typeof data?.referralCount === 'number') {
          setReferralCount(data.referralCount);
        }
        if (typeof data?.botUsername === 'string') {
          setBotUsername(data.botUsername);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingSocial(false);
    }
  }, [myStudioInstanceId, uiLanguage]);

  useEffect(() => {
    if (subTab !== 'challenges') return;
    let active = true;

    fetch(
      `/api/social-growth?studioInstanceId=${encodeURIComponent(
        myStudioInstanceId
      )}&lang=${encodeURIComponent(uiLanguage)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.challenge) setWeeklyChallenge(data.challenge);
        if (Array.isArray(data.topEntries)) setChallengeEntries(data.topEntries);
        if (typeof data.referralCount === 'number') {
          setReferralCount(data.referralCount);
        }
        if (typeof data.botUsername === 'string') {
          setBotUsername(data.botUsername);
        }
      })
      .catch(() => {
        // Non-blocking
      });

    return () => {
      active = false;
    };
  }, [subTab, myStudioInstanceId, uiLanguage]);

  const qualifyingChallengeProjects = useMemo(() => {
    if (!weeklyChallenge) return [];
    return releasedProjects
      .filter((p) => {
        const genreMatches =
          p.primaryGenre === weeklyChallenge.requiredGenre ||
          (weeklyChallenge.requiredGenre === 'psychological_horror' &&
            p.primaryGenre === 'supernatural_horror') ||
          (weeklyChallenge.requiredGenre === 'comedy' &&
            p.primaryGenre === 'light_comedy');
        return genreMatches && p.totalBudget <= weeklyChallenge.maxBudget;
      })
      .sort((a, b) => b.netProfit - a.netProfit);
  }, [releasedProjects, weeklyChallenge]);

  const referralShareUrl = useMemo(() => {
    if (botUsername.trim()) {
      return `https://t.me/${botUsername.trim()}?startapp=ref_${myStudioInstanceId}`;
    }
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/?ref=${encodeURIComponent(myStudioInstanceId)}`;
    }
    return `${getSiteUrl()}/?ref=${encodeURIComponent(myStudioInstanceId)}`;
  }, [botUsername, myStudioInstanceId]);

  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralShareUrl);
      setCopiedRefLink(true);
      showToast(
        tr(uiLanguage, 'Studio invite link copied!', 'تم نسخ رابط الدعوة الخاص باستوديوك!'),
        'success'
      );
      setTimeout(() => setCopiedRefLink(false), 2200);
    } catch {
      showToast(
        tr(uiLanguage, 'Copy the invite link manually from the field.', 'انسخ الرابط يدوياً من الخانة'),
        'info'
      );
    }
  };

  const handleSubmitProjectToChallenge = async (
    project: (typeof releasedProjects)[number]
  ) => {
    if (submittingChallengeId) return;
    setSubmittingChallengeId(project.id);
    try {
      const res = await fetch('/api/social-growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_challenge',
          studioInstanceId: myStudioInstanceId,
          studioName: studioName || marketInfo.defaultStudioName,
          ceoName: ceoName || defaultCeoFallback,
          projectTitle: project.title,
          worldMarket,
          primaryGenre: project.primaryGenre,
          budgetUsed: project.totalBudget,
          netProfit: project.netProfit,
          criticScore: project.criticScore,
          lang: uiLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        showToast(
          data?.error ||
            tr(
              uiLanguage,
              'Could not submit project to the weekly challenge right now.',
              'تعذر تسجيل العمل في التحدي حالياً.'
            ),
          'warning'
        );
      } else {
        if (Array.isArray(data.topEntries)) {
          setChallengeEntries(data.topEntries);
        }
        showToast(
          tr(
            uiLanguage,
            `Submitted “${project.title}” to the Weekly Global Challenge!`,
            `تم تسجيل «${project.title}» في التحدي الأسبوعي بنجاح!`
          ),
          'success'
        );
      }
    } catch {
      showToast(
        tr(
          uiLanguage,
          'Connection error reaching the challenge server.',
          'حدث خطأ في الاتصال بخادم التحديات.'
        ),
        'warning'
      );
    } finally {
      setSubmittingChallengeId(null);
    }
  };

  const localizedChallengeGenre = weeklyChallenge
    ? isAr
      ? weeklyChallenge.requiredGenreAr
      : getLocalizedGenreInfo(
          weeklyChallenge.requiredGenre as GenreId,
          'en'
        ).name
    : tr(uiLanguage, 'Featured Genre', 'التحدي');

  return (
    <div className="space-y-4" dir={dir}>
      {/* Unified Royal Cinema Header & Tabs */}
      <div className="rounded-3xl bg-[#1A2530] text-[#F9F6F0] border-2 border-[#D4AF37] p-3.5 sm:p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#D91624] text-[#D4AF37] border border-[#D4AF37] shadow">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg text-[#F9F6F0]">
                {tr(
                  uiLanguage,
                  'Global Studio Exchange & Rankings',
                  'بورصة التصنيف العالمي وترتيب الاستوديوهات'
                )}
              </h2>
              <p className="text-[11px] font-bold text-[#D4AF37]">
                {tr(
                  uiLanguage,
                  `Annual Awards Gala in ${daysUntilAnnualAwards} days`,
                  `حفل الجوائز السنوي التلقائي بعد ${daysUntilAnnualAwards} يوم`
                )}
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
              <span>{tr(uiLanguage, 'Refresh Live Board', 'تحديث الترتيب المباشر')}</span>
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
            <span>{tr(uiLanguage, 'Real Players (Top 15)', 'ترتيب اللاعبين الحقيقيين (أفضل 15)')}</span>
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
            <span>{tr(uiLanguage, 'World Studios', 'بورصة شركات العالم')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('challenges')}
            className={`flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer whitespace-nowrap ${
              subTab === 'challenges'
                ? 'bg-[#15803D] text-white border border-[#D4AF37] shadow'
                : 'text-[#F9F6F0]/75 hover:text-[#F9F6F0]'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>{tr(uiLanguage, 'Challenges & Invites', 'التحدي والدعوات')}</span>
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
            <span>{tr(uiLanguage, 'Reset / Market', 'إعادة التأسيس')}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: REAL PLAYERS GLOBAL TOP 15 LEADERBOARD */}
      {subTab === 'real_players' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[#D4AF37] bg-[#FFF9E6] px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-black text-[#1A2530]">
              <Crown className="h-4 w-4 text-[#D91624]" />
              <span>
                {tr(
                  uiLanguage,
                  'Top 15 real player studio empires · Total registered studios:',
                  'يُعرض أفضل 15 إمبراطورية إنتاج للاعبين الحقيقيين فقط · إجمالي اللاعبين المسجلين:'
                )}{' '}
                <strong className="font-typewriter text-[#D91624] tabular-nums">
                  {realLeaderboard?.totalPlayers || top15RealPlayers.length || 1}
                </strong>
              </span>
            </div>
            {myRealRank !== null && (
              <span className="font-typewriter text-xs font-black text-[#1A2530] tabular-nums">
                {tr(uiLanguage, 'Your Rank:', 'مركزك الحالي:')}{' '}
                <strong className="text-[#D91624]">#{myRealRank}</strong>
              </span>
            )}
          </div>

          {loadingReal && top15RealPlayers.length === 0 ? (
            <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-8 text-center space-y-2">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#D91624]" />
              <p className="text-xs font-extrabold text-[#1A2530]">
                {tr(uiLanguage, 'Syncing global player rankings...', 'جاري مزامنة ترتيب اللاعبين الحقيقيين...')}
              </p>
            </div>
          ) : top15RealPlayers.length === 0 ? (
            <div className="rounded-3xl border-2 border-[#D4AF37] bg-white p-6 text-center space-y-2">
              <Trophy className="mx-auto h-8 w-8 text-[#D4AF37]" />
              <p className="text-sm font-black text-[#1A2530]">
                {tr(
                  uiLanguage,
                  'You are the first studio registered on the global board!',
                  'أنت أول شركة إنتاج مسجلة حالياً في الترتيب العالمي!'
                )}
              </p>
              <p className="text-xs font-bold text-[#1A2530]/70">
                {tr(
                  uiLanguage,
                  'Other real players will appear automatically as they launch their empires.',
                  'سيظهر باقي اللاعبين الحقيقيين هنا تلقائياً فور دخولهم وبناء استوديوهاتهم.'
                )}
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
                              {tr(uiLanguage, 'YOU', 'شركتك')}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-[#1A2530]/70">
                          {tr(uiLanguage, 'CEO', 'القيادة')}: {entry.ceo_name} ·{' '}
                          {tr(uiLanguage, 'Releases', 'الأعمال')}: {entry.released_count} ·{' '}
                          {tr(uiLanguage, 'Awards', 'الجوائز')}: {entry.total_awards}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <div className="text-center">
                        <span className="block text-[9px] font-bold text-[#1A2530]/60">
                          {tr(uiLanguage, 'Rep', 'السمعة')}
                        </span>
                        <span className="font-typewriter font-black text-[#1A2530]">
                          {entry.reputation}%
                        </span>
                      </div>
                      <div className="rounded-xl border border-[#D4AF37] bg-[#1A2530] px-3 py-1 text-center">
                        <span className="block text-[9px] font-bold text-[#D4AF37]">
                          {tr(uiLanguage, 'Valuation', 'القيمة السوقية')}
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

          {isPlayerBelowTop15 && myRealRank !== null && (
            <div className="mt-4 rounded-3xl border-3 border-[#D91624] bg-[#1A2530] p-4 text-[#F9F6F0] shadow-xl">
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#D4AF37]/30 pb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#D4AF37]">
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {tr(
                      uiLanguage,
                      'Your current position outside Top 15',
                      'موقع شركتك الحالي خارج قائمة أفضل 15 لاعباً'
                    )}
                  </span>
                </span>
                <span className="font-typewriter text-xs font-black text-white tabular-nums">
                  {tr(
                    uiLanguage,
                    `Rank #${myRealRank} of ${realLeaderboard?.totalPlayers || myRealRank}`,
                    `المركز #${myRealRank} من ${realLeaderboard?.totalPlayers || myRealRank}`
                  )}
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
                      {studioName || marketInfo.defaultStudioName}
                    </h4>
                    <p className="text-[11px] font-bold text-[#F9F6F0]/80">
                      {tr(uiLanguage, 'Currently ranked', 'أنت حالياً في المركز')}{' '}
                      <strong className="text-[#D4AF37]">#{myRealRank}</strong>{' '}
                      {tr(uiLanguage, 'globally', 'عالمياً')}
                      {gapToTop15 > 0
                        ? tr(
                            uiLanguage,
                            ` · Need +${formatMoney(gapToTop15)} ${currencyLabel} valuation to break into Top 15!`,
                            ` · تحتاج +${formatMoney(gapToTop15)} ${currencyLabel} قيمة سوقية لدخول قائمة أفضل 15!`
                          )
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#D4AF37] bg-[#F9F6F0] px-3.5 py-1.5 text-center text-[#1A2530]">
                  <span className="block text-[9px] font-extrabold text-[#1A2530]/65">
                    {tr(uiLanguage, 'Your Valuation', 'قيمتك السوقية')}
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
                          {tr(uiLanguage, 'YOU', 'شركتك')}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold leading-relaxed text-[#1A2530]/70">
                      {tr(uiLanguage, 'CEO', 'القيادة')}: {studio.ceo} ·{' '}
                      {tr(uiLanguage, 'Releases', 'الأعمال')}: {studio.releasesCount} ·
                      <Award className="inline h-3 w-3 mx-0.5 text-[#D4AF37]" />
                      {studio.awardsCount} {tr(uiLanguage, 'Awards', 'جوائز')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <div className="text-center">
                    <span className="block text-[9px] font-bold text-[#1A2530]/60">
                      {tr(uiLanguage, 'Rep', 'السمعة')}
                    </span>
                    <span className="font-typewriter font-black text-[#1A2530]">
                      {studio.reputation}%
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#D4AF37] bg-[#1A2530] px-3 py-1 text-center">
                    <span className="block text-[9px] font-bold text-[#D4AF37]">
                      {tr(uiLanguage, 'Valuation', 'القيمة السوقية')}
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
                <span>{tr(uiLanguage, 'Previous', 'السابق')}</span>
              </button>
              <span className="text-xs font-black text-[#1A2530] tabular-nums">
                {tr(
                  uiLanguage,
                  `Page ${safePage + 1} of ${totalPages}`,
                  `صفحة ${safePage + 1} من ${totalPages}`
                )}
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
                <span>{tr(uiLanguage, 'Next', 'التالي')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WEEKLY GLOBAL CHALLENGE & VIRAL REFERRALS */}
      {subTab === 'challenges' && (
        <div className="space-y-4">
          <div className="rounded-3xl border-2 border-[#D4AF37] bg-white p-4 sm:p-5 shadow-md space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#1A2530]/12 pb-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1A2530] text-[#D4AF37] border border-[#D4AF37]">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-black text-[#1A2530]">
                      {isAr
                        ? weeklyChallenge?.title || 'التحدي الأسبوعي العالمي'
                        : 'Weekly Global Box-Office Challenge'}
                    </h3>
                    {weeklyChallenge && (
                      <span className="rounded-lg bg-[#D91624] px-2 py-0.5 text-[10px] font-black text-white">
                        {tr(
                          uiLanguage,
                          `${weeklyChallenge.endsInDays}d left`,
                          `متبقي ${weeklyChallenge.endsInDays} يوم`
                        )}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-bold text-[#1A2530]/75 leading-relaxed">
                    {isAr
                      ? weeklyChallenge?.description ||
                        'أطلق عملاً يطابق شروط الأسبوع وسجّل أعلى صافي ربح لتتصدر التحدي العالمي.'
                      : `Release a ${localizedChallengeGenre} title under ${formatMoney(
                          weeklyChallenge?.maxBudget || 40_000_000
                        )} ${currencyLabel} and post the highest net profit to top the global board!`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadSocialGrowthData}
                disabled={loadingSocial}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A2530]/20 bg-[#F9F6F0] px-3 py-1.5 text-xs font-black text-[#1A2530] hover:border-[#D4AF37] cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingSocial ? 'animate-spin' : ''}`}
                />
                <span>{tr(uiLanguage, 'Refresh', 'تحديث')}</span>
              </button>
            </div>

            {weeklyChallenge && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-2xl border border-[#1A2530]/12 bg-[#F9F6F0] px-3 py-2">
                  <span className="block text-[10px] font-bold text-[#1A2530]/60">
                    {tr(uiLanguage, 'Required Genre', 'التصنيف المطلوب')}
                  </span>
                  <span className="text-xs font-black text-[#D91624]">
                    {localizedChallengeGenre}
                  </span>
                </div>
                <div className="rounded-2xl border border-[#1A2530]/12 bg-[#F9F6F0] px-3 py-2">
                  <span className="block text-[10px] font-bold text-[#1A2530]/60">
                    {tr(uiLanguage, 'Maximum Budget Cap', 'سقف الميزانية القصوى')}
                  </span>
                  <span
                    dir="ltr"
                    className="font-typewriter text-xs font-black text-[#1A2530] tabular-nums"
                  >
                    ≤ {formatMoney(weeklyChallenge.maxBudget)} {currencyLabel}
                  </span>
                </div>
                <div className="rounded-2xl border border-[#D4AF37]/60 bg-[#FFF9E6] px-3 py-2">
                  <span className="block text-[10px] font-bold text-[#9A7209]">
                    {tr(uiLanguage, 'Champion Reward', 'جائزة المتصدر')}
                  </span>
                  <span className="text-xs font-black text-[#1A2530]">
                    {isAr
                      ? weeklyChallenge.rewardLabel
                      : 'Global Prestige Crown & Spotlight'}
                  </span>
                </div>
              </div>
            )}

            {/* Qualifying Releases */}
            <div className="space-y-2">
              <span className="block text-xs font-black text-[#1A2530]">
                {tr(
                  uiLanguage,
                  'Your Qualifying Releases This Week:',
                  'أعمالك المطابقة لشروط تحدي هذا الأسبوع:'
                )}
              </span>
              {qualifyingChallengeProjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#1A2530]/25 bg-[#F9F6F0] p-3 text-xs font-bold text-[#1A2530]/70">
                  {isAr ? (
                    <>
                      لا يوجد لديك عمل مطابق بعد. أنتج عملاً بتصنيف{' '}
                      <strong className="text-[#D91624]">
                        {weeklyChallenge?.requiredGenreAr || 'التحدي'}
                      </strong>{' '}
                      بميزانية إجمالية لا تتجاوز{' '}
                      <strong className="font-typewriter">
                        {formatMoney(weeklyChallenge?.maxBudget || 40_000_000)}{' '}
                        {currencyLabel}
                      </strong>{' '}
                      ثم سجّله هنا فوراً!
                    </>
                  ) : (
                    <>
                      No qualifying release yet. Produce a{' '}
                      <strong className="text-[#D91624]">
                        {localizedChallengeGenre}
                      </strong>{' '}
                      project with a total budget at or below{' '}
                      <strong className="font-typewriter">
                        {formatMoney(weeklyChallenge?.maxBudget || 40_000_000)}{' '}
                        {currencyLabel}
                      </strong>
                      , then submit it right here!
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {qualifyingChallengeProjects.slice(0, 3).map((proj) => (
                    <div
                      key={proj.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#D4AF37]/60 bg-[#FFFDF8] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="font-display text-xs sm:text-sm font-black text-[#1A2530] truncate">
                          {proj.title}
                        </div>
                        <div className="text-[11px] font-bold text-[#1A2530]/70">
                          {tr(uiLanguage, 'Net Profit:', 'صافي الربح:')}{' '}
                          <span className="font-typewriter text-[#15803D]">
                            {formatMoney(proj.netProfit)} {currencyLabel}
                          </span>{' '}
                          · {tr(uiLanguage, 'Cost:', 'التكلفة:')}{' '}
                          <span className="font-typewriter">
                            {formatMoney(proj.totalBudget)}
                          </span>{' '}
                          · {tr(uiLanguage, 'Critics:', 'النقاد:')} {proj.criticScore}/10
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={submittingChallengeId === proj.id}
                        onClick={() => handleSubmitProjectToChallenge(proj)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#D91624] border border-[#D4AF37] px-3.5 py-1.5 text-xs font-black text-white hover:brightness-110 transition cursor-pointer disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>
                          {submittingChallengeId === proj.id
                            ? tr(uiLanguage, 'Submitting...', 'جاري التسجيل...')
                            : tr(uiLanguage, 'Enter Challenge', 'إرسال للتحدي')}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly Challenge Top 10 Board */}
            <div className="space-y-2 pt-2 border-t border-[#1A2530]/12">
              <span className="block text-xs font-black text-[#1A2530]">
                {tr(
                  uiLanguage,
                  `This Week's Leaders (${weeklyChallenge?.weekKey || 'Active Week'}):`,
                  `متصدرو التحدي هذا الأسبوع (${weeklyChallenge?.weekKey || 'الأسبوع الحالي'}):`
                )}
              </span>
              {challengeEntries.length === 0 ? (
                <p className="rounded-2xl bg-[#F9F6F0] px-3 py-3 text-center text-xs font-bold text-[#1A2530]/65">
                  {tr(
                    uiLanguage,
                    'Be the first producer to post a record score in this week’s challenge!',
                    'كن أول منتج يسجّل رقماً قياسياً في تحدي هذا الأسبوع!'
                  )}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {challengeEntries.map((row, idx) => {
                    const isMine = row.studio_instance_id === myStudioInstanceId;
                    return (
                      <div
                        key={`${row.studio_instance_id}_${idx}`}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs ${
                          isMine
                            ? 'border-[#D91624] bg-[#FFF9E6] font-black'
                            : 'border-[#1A2530]/12 bg-[#F9F6F0]/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#1A2530] font-typewriter text-[11px] font-black text-[#D4AF37]">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="block font-black text-[#1A2530] truncate">
                              {row.studio_name} — “{row.project_title}”
                            </span>
                            <span className="block text-[10px] font-bold text-[#1A2530]/65">
                              {tr(uiLanguage, 'CEO', 'المدير')}: {row.ceo_name} ·{' '}
                              {tr(uiLanguage, 'Budget', 'الميزانية')}:{' '}
                              {formatMoney(row.budget_used)} ·{' '}
                              {tr(uiLanguage, 'Critics', 'النقاد')}:{' '}
                              {row.critic_score}/10
                            </span>
                          </div>
                        </div>
                        <span
                          dir="ltr"
                          className="rounded-lg bg-[#15803D] px-2.5 py-1 font-typewriter text-[11px] font-black text-white tabular-nums"
                        >
                          +{formatMoney(row.score_value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Viral Referral Hub */}
          <div className="rounded-3xl border-2 border-[#D4AF37] bg-[#1A2530] p-4 sm:p-5 text-[#F9F6F0] shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#D4AF37] text-[#1A2530]">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-black text-[#FFF3B0]">
                    {tr(
                      uiLanguage,
                      'Invite Friends & Earn Instant Funding',
                      'ادعُ أصدقاءك واكسب تمويلاً فورياً'
                    )}
                  </h3>
                  <p className="text-xs font-bold text-[#F9F6F0]/80">
                    {tr(
                      uiLanguage,
                      'Every friend who launches a studio through your link starts with +15M bonus cash (and unlocks a Star Forge lock!).',
                      'كل صديق يؤسس استوديو عبر رابطك يحصل فوراً على +15M في خزينته (أو قفل غرفة النجوم).'
                    )}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#D4AF37]/60 bg-[#0F171E] px-3 py-1.5 text-center">
                <span className="block text-[10px] font-bold text-[#D4AF37]">
                  {tr(uiLanguage, 'Friends Joined', 'أصدقاء انضموا عبرك')}
                </span>
                <span className="font-typewriter text-base font-black text-white tabular-nums">
                  {referralCount}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                dir="ltr"
                value={referralShareUrl}
                className="flex-1 min-h-[42px] rounded-xl border border-[#D4AF37]/50 bg-[#0F171E] px-3 py-2 font-typewriter text-xs text-[#FFF3B0] outline-hidden"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyReferralLink}
                  className="inline-flex min-h-[42px] flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-black text-[#1A2530] hover:brightness-110 transition cursor-pointer"
                >
                  {copiedRefLink ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>
                    {copiedRefLink
                      ? tr(uiLanguage, 'Copied', 'تم النسخ')
                      : tr(uiLanguage, 'Copy Link', 'نسخ الرابط')}
                  </span>
                </button>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(
                    referralShareUrl
                  )}&text=${encodeURIComponent(
                    tr(
                      uiLanguage,
                      `Launch your own film studio in Neelyo, challenge "${
                        studioName || marketInfo.defaultStudioName
                      }", and claim a 15M welcome bonus!`,
                      `أسّس شركة إنتاجك السينمائي في Neelyo ونافس استوديو «${
                        studioName || marketInfo.defaultStudioName
                      }» واحصل على 15M مكافأة ترحيب!`
                    )
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37] bg-[#D91624] px-3.5 py-2 text-xs font-black text-white hover:brightness-110 transition"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{tr(uiLanguage, 'Telegram', 'تيليجرام')}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM, WORLD MARKET SWITCH & RESET */}
      {subTab === 'system' && (
        <div className="space-y-3">
          <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border-2 border-[#D4AF37] bg-[#1A2530] p-5 text-[#F9F6F0] shadow-md sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-[#D4AF37]/60 bg-white/10 p-2 shrink-0">
                <WorldFlagArt market={worldMarket} className="h-8 w-12 rounded" />
              </div>
              <div>
                <h3 className="font-display text-sm font-black text-[#D4AF37]">
                  {tr(uiLanguage, 'Active Production World:', 'عالم الإنتاج النشط:')}{' '}
                  {marketInfo.nativeTitle}
                </h3>
                <p className="mt-0.5 text-xs font-bold text-[#F9F6F0]/75">
                  {tr(
                    uiLanguage,
                    `Currency: ${marketInfo.currencyFullName} (${currencyLabel}) · Switch anytime to launch an independent career in another cinema market.`,
                    `العملة: ${marketInfo.currencyFullName} (${currencyLabel}) · يمكنك الانتقال لعالم إنتاج جديد (مثل السعودية والخليج أو مصر) بمسيرة مستقلة.`
                  )}
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
                  <span>{tr(uiLanguage, 'Switch Market', 'تغيير الدولة / السوق')}</span>
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
                    {tr(uiLanguage, 'Yes, Open Markets', 'نعم، فتح اختيار الدول')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSwitchMarket(false)}
                    className="min-h-[40px] rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-black text-white cursor-pointer"
                  >
                    {tr(uiLanguage, 'Cancel', 'إلغاء')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border-2 border-[#D91624] bg-white p-5 shadow-md sm:flex-row">
            <div>
              <h3 className="flex items-center gap-1.5 font-display text-sm font-black text-[#D91624]">
                <AlertTriangle className="h-4 w-4 text-[#D91624]" />
                <span>{tr(uiLanguage, 'Reset Studio From Scratch', 'إعادة تأسيس الاستوديو من الصفر')}</span>
              </h3>
              <p className="mt-1 text-xs font-bold text-[#1A2530]/75">
                {tr(
                  uiLanguage,
                  'Your progress is auto-saved. Wipe current data only if you want to found a brand-new studio from Year 1.',
                  'يتم حفظ تقدمك تلقائياً. إذا أردت البدء باستوديو جديد تماماً يمكنك مسح البيانات الحالية.'
                )}
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
                  <span>{tr(uiLanguage, 'Reset Game', 'إعادة ضبط اللعبة')}</span>
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
                    {tr(uiLanguage, 'Confirm Wipe', 'تأكيد المسح النهائي')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[40px] rounded-xl border-2 border-[#1A2530] bg-[#F9F6F0] px-3.5 py-2 text-xs font-black text-[#1A2530] cursor-pointer"
                  >
                    {tr(uiLanguage, 'Cancel', 'إلغاء')}
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
