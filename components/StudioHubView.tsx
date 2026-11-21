'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  formatGameDate,
  getDaysRemainingUntilAnnualAwards,
  STUDIO_FIXED_ASSETS,
  getStudioAssetBenefits,
  STAR_FORGE_REQUIRED_LOCKS,
} from '@/lib/store';
import { MarketRegion, formatMoney } from '@/lib/game-engine';
import { getPrimaryMarketRegion } from '@/lib/market-profiles';
import {
  computeStudioProgression,
  getLevelTitle,
  getMarketRegionRequiredLevel,
  LEVEL_MONTHLY_OVERHEAD,
  type StudioLevel,
} from '@/lib/progression';
import {
  getUiDir,
  getLocalizedMarketInfo,
  getLocalizedExpansionMarkets,
  getLocalizedGenreInfo,
  STUDIO_ASSETS_EN,
  tr,
} from '@/lib/i18n';
import { StudioLogoSvg } from './StudioLogoSvg';
import { WorldFlagArt } from './WorldFlagArt';
import { LeaderboardAndSettingsView } from './LeaderboardAndSettingsView';
import {
  DirectorChairIcon,
  FilmReelSettingsIcon,
} from './CustomCinemaIcons';
import {
  Globe,
  Trophy,
  History,
  Film,
  Wallet,
  TrendingUp,
  Award,
  CheckCircle2,
  X,
  Sparkles,
  Flame,
  Crown,
  Building2,
  ShieldCheck,
  Loader2,
  Lock,
  Unlock,
  Smartphone,
  FileText,
  Pin,
  Coins,
  Star,
  Clapperboard,
  Radar,
  BookOpen,
  Shield,
  Scale,
  Mail,
  Tv,
  Activity,
  Target,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { NeelyoInfoTab } from './NeelyoInfoModal';
import {
  showRewardedAd,
  getRewardedAdErrorMessage,
} from '@/lib/ad-mediator';

export function StudioHubView({
  onOpenSettings,
  onOpenInfo,
}: {
  onOpenSettings?: () => void;
  onOpenInfo?: (tab: NeelyoInfoTab) => void;
} = {}) {
  const {
    studioName,
    ceoName,
    logo,
    founderPerk,
    unlockedRegions,
    cash,
    marketValue,
    reputation,
    currentYear,
    gameDay,
    draft,
    releasedProjects,
    lastReleasedProject,
    openLiveReleaseDashboard,
    worldHistory,
    unlockMarketRegionWithCash,
    toggleDraftDistributionMarket,
    resetDraftForNewProject,
    setActiveScreen,
    setChildModalOpen,
    setPrWarRoomOpen,
    setStarForgeOpen,
    starForgeLocksOpened,
    claimEmergencyInvestorBailoutWithAd,
    lastEmergencyBailoutDay,
    bankruptcyDeadlineDay,
    ownedStudioAssets,
    purchaseStudioAsset,
    showToast,
    worldMarket,
    uiLanguage,
  } = useGameStore();

  const isAr = uiLanguage === 'ar';
  const dir = getUiDir(uiLanguage);
  const marketInfo = getLocalizedMarketInfo(worldMarket, uiLanguage);
  const marketConfigs = getLocalizedExpansionMarkets(worldMarket, uiLanguage);
  const primaryRegion = getPrimaryMarketRegion(worldMarket);
  const currencyLabel = marketInfo.currencyLabel;
  const arrowGlyph = isAr ? '←' : '→';

  const [activeSheet, setActiveSheet] = useState<
    null | 'markets' | 'archive' | 'history' | 'leaderboard' | 'assets' | 'missions'
  >(null);
  const [modalPage, setModalPage] = useState(0);
  const [purchasingAssetId, setPurchasingAssetId] = useState<string | null>(null);

  const assetBenefits = getStudioAssetBenefits(ownedStudioAssets);
  const isInLiquidityEmergency =
    cash <= 10_000_000 || bankruptcyDeadlineDay !== null;
  const bailoutCooldownRemaining =
    lastEmergencyBailoutDay !== null
      ? Math.max(0, 30 - (gameDay - lastEmergencyBailoutDay))
      : 0;
  const canUseEmergencyBailout =
    isInLiquidityEmergency && bailoutCooldownRemaining === 0;

  const handleEmergencyBailoutAd = async () => {
    const adResult = await showRewardedAd('emergency_bailout');
    if (adResult.completed) {
      claimEmergencyInvestorBailoutWithAd();
    } else {
      const errMsg = getRewardedAdErrorMessage(
        adResult.reason,
        'لتفعيل تمويل الإنقاذ',
        uiLanguage,
        'to activate the emergency investor bailout'
      );
      if (errMsg) showToast(errMsg, 'warning');
    }
  };

  useEffect(() => {
    setChildModalOpen(Boolean(activeSheet));
    return () => setChildModalOpen(false);
  }, [activeSheet, setChildModalOpen]);

  useEffect(() => {
    if (!activeSheet) return;
    const handleTelegramBack = () => {
      setActiveSheet(null);
    };
    window.addEventListener('neelyo:telegram-back', handleTelegramBack);
    return () => {
      window.removeEventListener('neelyo:telegram-back', handleTelegramBack);
    };
  }, [activeSheet]);

  const totalAwards = releasedProjects.reduce(
    (sum, p) => sum + p.awardsWon.length,
    0
  );
  const lifetimeBoxOffice = releasedProjects.reduce(
    (sum, p) => sum + p.totalGrossRevenue,
    0
  );
  const daysUntilAnnualAwards = getDaysRemainingUntilAnnualAwards(gameDay);

  const progression = computeStudioProgression({
    marketValue,
    releasedProjects,
    uiLanguage,
  });

  const studioRankTitle = `Lv.${progression.level} · ${progression.title}`;

  const offerList = Object.values(draft.talentOffers || {});
  const isUntouchedLegacyDefault =
    releasedProjects.length === 0 &&
    draft.title.trim() === 'الفرعون الأخير' &&
    draft.filmingStartDay === null &&
    offerList.length === 0 &&
    !draft.directorId &&
    draft.leadActorIds.length === 0;
  const hasActiveProject = Boolean(draft.title.trim()) && !isUntouchedLegacyDefault;
  const pendingOffersCount = offerList.filter(
    (n) => n.status === 'pending'
  ).length;
  const awaitingChoiceCount = offerList.filter(
    (n) => n.status === 'accepted_awaiting_choice'
  ).length;
  const hasUnresolvedCrisis = (draft.crises || []).some((c) => !c.resolved);

  const activeDistMarkets: MarketRegion[] =
    Array.isArray(draft.selectedDistributionMarkets) &&
    draft.selectedDistributionMarkets.length > 0
      ? draft.selectedDistributionMarkets
      : [primaryRegion];

  const handleResumeActiveProject = () => {
    if (
      draft.filmingStartDay !== null &&
      draft.filmingDaysElapsed >= draft.filmingDurationDays
    ) {
      setActiveScreen('RELEASE_SIMULATION');
    } else if (draft.filmingStartDay !== null) {
      setActiveScreen('PRODUCTION_CRISES');
    } else if (
      offerList.length > 0 ||
      draft.directorId ||
      draft.leadActorIds.length > 0
    ) {
      setActiveScreen('CREW_CAST_CARDS');
    } else {
      setActiveScreen('PROJECT_SETUP');
    }
  };

  const openModalSheet = (
    sheet: 'markets' | 'archive' | 'history' | 'leaderboard' | 'assets' | 'missions'
  ) => {
    setModalPage(0);
    setActiveSheet(sheet);
  };

  const archivePageSize = 3;
  const archiveTotalPages = Math.max(
    1,
    Math.ceil(releasedProjects.length / archivePageSize)
  );
  const visibleArchiveProjects = releasedProjects.slice(
    modalPage * archivePageSize,
    (modalPage + 1) * archivePageSize
  );

  const historyPageSize = 4;
  const historyTotalPages = Math.max(
    1,
    Math.ceil(worldHistory.length / historyPageSize)
  );
  const visibleHistoryItems = worldHistory.slice(
    modalPage * historyPageSize,
    (modalPage + 1) * historyPageSize
  );

  const lockIndices = Array.from(
    { length: STAR_FORGE_REQUIRED_LOCKS },
    (_, idx) => idx
  );

  return (
    <div dir={dir} className="mx-auto max-w-6xl space-y-6 py-2">
      <div
        className={
          activeSheet
            ? 'pointer-events-none select-none space-y-6 opacity-35 transition-opacity'
            : 'space-y-6'
        }
      >
        {/* TOP STUDIO WALL PLAQUE */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl bg-[#1A2530] text-[#F9F6F0] border-4 border-[#D4AF37] p-4 sm:p-6 shadow-[0_20px_50px_rgba(26,37,48,0.25)]"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="shrink-0 rounded-2xl bg-[#F9F6F0] p-2.5 border-2 border-[#D4AF37] shadow-lg">
                <StudioLogoSvg config={logo} size={62} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => openModalSheet('missions')}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#D91624] hover:brightness-110 text-white text-xs font-extrabold border border-[#D4AF37]/80 transition cursor-pointer shadow-xs"
                    title={tr(uiLanguage, 'Open Promotion Missions & Career Ladder', 'فتح مهام الترقية وسلم التطور')}
                  >
                    <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{studioRankTitle}</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 text-[#F9F6F0] text-[11px] font-bold border border-[#D4AF37]/40">
                    <WorldFlagArt market={worldMarket} className="w-4 h-3 rounded-[2px] shrink-0" />
                    <span>{marketInfo.countryName}</span>
                  </span>
                  <span className="text-xs font-bold text-[#D4AF37]">
                    · {formatGameDate(gameDay, currentYear, uiLanguage)}
                  </span>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl text-[#F9F6F0] tracking-wide">
                  {tr(
                    uiLanguage,
                    `Executive Office — ${studioName}`,
                    `مكتب الإمبراطور — ${studioName}`
                  )}
                </h1>

                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-bold text-[#F9F6F0]/80">
                  <span className="inline-flex items-center gap-1.5 text-[#D4AF37]">
                    <DirectorChairIcon className="w-4 h-4 text-[#D4AF37]" />
                    <span>
                      {tr(uiLanguage, `CEO: ${ceoName}`, `الإمبراطور: ${ceoName}`)}
                    </span>
                  </span>
                  <span>
                    ·{' '}
                    {founderPerk === 'visionary_director'
                      ? tr(uiLanguage, '★ Visionary Auteur (+10 Quality)', '★ مخرج عبقري (+10% جودة)')
                      : founderPerk === 'marketing_whale'
                      ? tr(uiLanguage, '★ Box-Office Mogul (+20% Opening)', '★ حوت تسويق (+15% إيرادات)')
                      : tr(uiLanguage, '★ Shark Negotiator (-15% Salaries)', '★ مفاوض شرس (-15% أجور)')}
                  </span>
                  <span>
                    · {tr(uiLanguage, `Reputation: ${reputation}%`, `السمعة الفنية: ${reputation}%`)}
                  </span>
                </div>
              </div>
            </div>

            <div
              data-tour-id="tour-finance"
              className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end"
            >
              <div
                onClick={() => openModalSheet('assets')}
                className="px-4 py-2 rounded-2xl bg-[#F9F6F0] text-[#1A2530] border-2 border-[#D4AF37] cursor-pointer hover:scale-[1.02] transition"
              >
                <div className="text-[10px] font-extrabold text-[#1A2530]/70 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-[#D91624]" />
                  <span>{tr(uiLanguage, 'Liquid Cash Treasury', 'خزينة السيولة النقدية')}</span>
                </div>
                <div
                  data-testid="hub-cash-value"
                  className="font-typewriter text-base sm:text-lg font-black text-[#1A2530]"
                >
                  <span dir="ltr">{formatMoney(cash)}</span>{' '}
                  <span className="text-xs">{currencyLabel}</span>
                </div>
              </div>

              <div className="px-4 py-2 rounded-2xl bg-[#F9F6F0]/10 text-[#F9F6F0] border-2 border-[#D4AF37]/60">
                <div className="text-[10px] font-extrabold text-[#D4AF37] flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{tr(uiLanguage, 'Market Valuation', 'القيمة السوقية')}</span>
                </div>
                <div
                  data-testid="hub-market-value"
                  className="font-typewriter text-base sm:text-lg font-black text-[#F9F6F0]"
                >
                  <span dir="ltr">{formatMoney(marketValue)}</span>{' '}
                  <span className="text-xs text-[#D4AF37]">{currencyLabel}</span>
                </div>
              </div>

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  title={tr(uiLanguage, 'Studio Settings & Language', 'إعدادات الاستوديو واللغة')}
                  className="w-12 h-12 rounded-2xl bg-[#D4AF37] hover:brightness-110 text-[#1A2530] flex items-center justify-center border-2 border-[#F9F6F0] shadow-lg transition cursor-pointer"
                >
                  <FilmReelSettingsIcon className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          {/* INTEGRATED EXECUTIVE CAREER & PROMOTION MISSIONS STRIP */}
          <button
            type="button"
            onClick={() => openModalSheet('missions')}
            className="mt-4 pt-3 border-t border-[#D4AF37]/25 w-full text-start flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 shrink-0 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-[#1A2530] transition">
                <Target className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-black text-[#F9F6F0] group-hover:text-[#FFF3B0] transition">
                    {progression.nextLevel
                      ? tr(
                          uiLanguage,
                          `Promotion Missions → Lv.${progression.nextLevel} (${progression.nextLevelTitle})`,
                          `مهام الترقية ← المستوى ${progression.nextLevel} (${progression.nextLevelTitle})`
                        )
                      : tr(
                          uiLanguage,
                          'Career Roadmap · Max Empire Tier (Lv.4)',
                          'خريطة الترقية · وصلت لأعلى مستوى (المستوى 4)'
                        )}
                  </span>
                  <span
                    dir="ltr"
                    className="font-mono text-[10px] font-black text-[#D4AF37] tabular-nums"
                  >
                    {progression.progressPercent}%
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 max-w-xs overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D91624] via-[#D4AF37] to-[#4ADE80] transition-all duration-500"
                      style={{ width: `${progression.progressPercent}%` }}
                    />
                  </div>
                  <span className="hidden md:inline text-[11px] font-bold text-[#F9F6F0]/70 truncate">
                    {progression.headlineTask}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              <span
                dir="ltr"
                className="rounded-lg border border-rose-400/35 bg-rose-500/15 px-2 py-1 font-mono text-[10px] font-black text-rose-200 tabular-nums"
              >
                {tr(
                  uiLanguage,
                  `Overhead: -${formatMoney(progression.monthlyOverhead)}/mo`,
                  `مصاريف: -${formatMoney(progression.monthlyOverhead)}/شهر`
                )}
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-[#D4AF37] px-3 py-1.5 text-[11px] font-black text-[#1A2530] shadow group-hover:brightness-110 transition">
                <span>
                  {tr(uiLanguage, 'Missions', 'المهام')}
                </span>
                {isAr ? (
                  <ChevronLeft className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
            </div>
          </button>
        </motion.div>

        {/* SLEEK LIVE RELEASE TRACKER BANNER — Visible ONLY while a project is still actively running */}
        {(() => {
          const activeLiveProject =
            (lastReleasedProject &&
              (lastReleasedProject.daysTracked || 1) <
                (lastReleasedProject.format === 'series'
                  ? lastReleasedProject.episodes || 15
                  : 10) &&
              lastReleasedProject) ||
            releasedProjects.find(
              (p) =>
                (p.daysTracked || 1) <
                (p.format === 'series' ? p.episodes || 15 : 10)
            ) ||
            null;

          if (!activeLiveProject) return null;

          const isRelSeries = activeLiveProject.format === 'series';
          const totalSteps = isRelSeries ? activeLiveProject.episodes || 15 : 10;
          const currentStep = Math.min(totalSteps, activeLiveProject.daysTracked || 1);
          const pct = Math.min(100, Math.round((currentStep / totalSteps) * 100));

          return (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openLiveReleaseDashboard(activeLiveProject.id)}
              className="w-full text-start rounded-2xl border-2 border-[#D4AF37] bg-gradient-to-r from-[#1A2530] via-[#223242] to-[#1A2530] px-3.5 py-3 text-[#F9F6F0] shadow-lg hover:brightness-105 transition cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-[#D91624] border border-[#D4AF37] flex items-center justify-center shadow">
                    {isRelSeries ? (
                      <Tv className="w-5 h-5 text-white" />
                    ) : (
                      <Film className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-black">
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-typewriter bg-[#D91624] text-white">
                        <Activity className="w-3 h-3 animate-pulse" />
                        <span>
                          {isRelSeries
                            ? tr(uiLanguage, 'NOW AIRING', 'يُعرض الآن')
                            : tr(uiLanguage, 'LIVE IN THEATERS', 'يُعرض الآن')}
                        </span>
                      </span>
                      <span className="text-[#D4AF37] font-mono tabular-nums">
                        {isRelSeries
                          ? tr(
                              uiLanguage,
                              `Ep ${currentStep}/${totalSteps}`,
                              `حلقة ${currentStep}/${totalSteps}`
                            )
                          : tr(
                              uiLanguage,
                              `Day ${currentStep}/${totalSteps}`,
                              `يوم ${currentStep}/${totalSteps}`
                            )}
                      </span>
                      <span className="text-[#F9F6F0]/60">·</span>
                      <span className="text-[#FDE68A] font-mono tabular-nums">
                        #{activeLiveProject.boxOfficeRank}
                      </span>
                    </div>
                    <div className="font-display text-sm sm:text-base text-white truncate mt-0.5">
                      {activeLiveProject.title}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2.5">
                  <div className="text-end">
                    <div
                      dir="ltr"
                      className="font-typewriter text-xs sm:text-sm font-black text-[#4ADE80] tabular-nums"
                    >
                      {formatMoney(activeLiveProject.totalGrossRevenue)} {currencyLabel}
                    </div>
                    <div className="text-[10px] font-bold text-[#D4AF37]">
                      {tr(uiLanguage, 'Box Office', 'الشباك')} {arrowGlyph}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtle 3px live run progress strip */}
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4ADE80] via-[#D4AF37] to-[#D91624] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </motion.button>
          );
        })()}

        {/* EMERGENCY LIQUIDITY & BANKRUPTCY GRACE PERIOD BANNER */}
        {(cash <= 10_000_000 || bankruptcyDeadlineDay !== null) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl border-4 p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              cash <= 0
                ? 'bg-[#D91624] text-[#F9F6F0] border-[#D4AF37]'
                : 'bg-[#1A2530] text-[#F9F6F0] border-[#D91624]'
            }`}
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#1A2530] text-[#D4AF37] text-xs font-extrabold border border-[#D4AF37]">
                <Flame className="w-3.5 h-3.5 text-[#D91624]" />
                <span>
                  {cash <= 0 && bankruptcyDeadlineDay !== null
                    ? tr(
                        uiLanguage,
                        `Official Bankruptcy Warning · ${Math.max(1, bankruptcyDeadlineDay - gameDay)} days left before liquidation!`,
                        `إنذار إفلاس رسمي · متبقي ${Math.max(1, bankruptcyDeadlineDay - gameDay)} يوم في المهلة قبل بيع وتصفية الشركة!`
                      )
                    : tr(
                        uiLanguage,
                        'Critical Liquidity Alert · Treasury approaching zero!',
                        'تحذير سيولة حرجة · الخزينة تقترب من الصفر!'
                      )}
                </span>
              </div>
              <h3 className="font-display text-lg sm:text-xl text-[#F9F6F0]">
                {cash <= 0
                  ? tr(
                      uiLanguage,
                      `Current Deficit (${formatMoney(cash)} ${currencyLabel}) — Rescue your studio now!`,
                      `عجز الخزينة الحالي (${formatMoney(cash)} ${currencyLabel}) — أنقذ شركتك من التصفية الآن!`
                    )
                  : tr(
                      uiLanguage,
                      'Secure an emergency investor bailout to keep cameras rolling',
                      'احصل على تمويل إنقاذ عاجل من مستثمر سينمائي لتفادي الإفلاس'
                    )}
              </h3>
              <p className="text-xs font-bold text-[#F9F6F0]/85">
                {cash <= 0
                  ? tr(
                      uiLanguage,
                      'If the 3-month grace period expires with negative cash, creditors will liquidate the studio and force a fresh start.',
                      'إذا انتهت مهلة الـ 3 أشهر دون سداد المديونية ستُجبر على بيع الشركة للمستثمرين وتأسيس شركة جديدة في نفس العالم.'
                    )
                  : tr(
                      uiLanguage,
                      'Instead of risking bankruptcy, trigger an instant investor liquidity injection via a short sponsored reel.',
                      'بدلاً من تعريض الاستوديو للإفلاس، يمكنك تفعيل صفقة تمويل إنقاذ فوري مقابل إعلان ممول.'
                    )}
              </p>
            </div>

            <button
              type="button"
              onClick={handleEmergencyBailoutAd}
              className="w-full sm:w-auto shrink-0 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-black text-xs sm:text-sm shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Film className="w-4 h-4 shrink-0" />
              <span>
                {tr(
                  uiLanguage,
                  `Investor Bailout (+${formatMoney(
                    cash < 0 ? Math.abs(cash) + 15_000_000 : 15_000_000
                  )} ${currencyLabel}) — Watch Ad`,
                  `تمويل إنقاذ من مستثمر (+${formatMoney(
                    cash < 0 ? Math.abs(cash) + 15_000_000 : 15_000_000
                  )} ${currencyLabel}) — مشاهدة إعلان`
                )}
              </span>
            </button>
          </motion.div>
        )}

        {/* THE STUDIO WALL (Corkboard + Wall Safe) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div
            data-tour-id="tour-corkboard"
            whileHover={{ y: -4, scale: 1.008 }}
            onClick={() => setActiveScreen('CREW_CAST_CARDS')}
            className="lg:col-span-7 relative rounded-[28px] border-[10px] border-[#5B371C] p-4 sm:p-5 shadow-[inset_0_6px_26px_rgba(32,16,4,0.45),0_18px_38px_rgba(26,37,48,0.22)] cursor-pointer overflow-hidden group"
            style={{
              backgroundColor: '#C4925A',
              backgroundImage:
                'radial-gradient(rgba(91,55,28,0.22) 1.2px, transparent 1.2px), radial-gradient(rgba(255,236,196,0.22) 1px, transparent 1px), linear-gradient(135deg, rgba(160,108,58,0.35) 0%, rgba(196,146,90,0.12) 50%, rgba(124,78,38,0.3) 100%)',
              backgroundSize: '14px 14px, 21px 21px, 100% 100%',
              backgroundPosition: '0 0, 7px 7px, 0 0',
            }}
          >
            <span className="pointer-events-none absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#FFF3B0] to-[#9A7210] shadow-xs" />
            <span className="pointer-events-none absolute top-2 left-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#FFF3B0] to-[#9A7210] shadow-xs" />
            <span className="pointer-events-none absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#FFF3B0] to-[#9A7210] shadow-xs" />
            <span className="pointer-events-none absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#FFF3B0] to-[#9A7210] shadow-xs" />

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1A2530] text-[#F9F6F0] border-2 border-[#D4AF37] text-xs font-extrabold shadow-md">
                <Pin className="w-3.5 h-3.5 text-[#D91624] fill-[#D91624]" />
                <span>{tr(uiLanguage, 'Casting & Talent Corkboard', 'سبورة الكاستينج والنجوم')}</span>
              </div>
              <span className="px-3 py-1 rounded-lg bg-[#D91624] text-white border border-[#D4AF37]/80 font-display text-xs tracking-wide shadow-md group-hover:brightness-110 transition">
                {tr(
                  uiLanguage,
                  `Open Talent & Crew Files ${arrowGlyph}`,
                  `افتح ملفات الممثلين والمخرجين ${arrowGlyph}`
                )}
              </span>
            </div>

            <div className="relative my-2 pt-2">
              <svg
                aria-hidden="true"
                viewBox="0 0 600 90"
                className="pointer-events-none absolute -top-2 inset-x-0 w-full h-16 z-20 hidden sm:block"
                preserveAspectRatio="none"
              >
                <path
                  d="M 105 16 Q 210 56 300 18 Q 395 52 495 15"
                  fill="none"
                  stroke="#B91C1C"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </svg>

              <div className="relative z-10 grid grid-cols-3 gap-2.5 sm:gap-4">
                {[
                  {
                    title: tr(uiLanguage, 'Box-Office Stars', 'نجوم الشباك'),
                    sub:
                      worldMarket === 'saudi'
                        ? tr(uiLanguage, '100+ Gulf Stars', '100+ نجم ونجمة خليجية')
                        : tr(uiLanguage, '180+ Screen Stars', '180+ ممثل وممثلة'),
                    note: tr(uiLanguage, 'GOLD S-TIER', 'فئة S الذهبية'),
                    rot: '-rotate-2',
                    pinColor: 'from-[#FF5C67] via-[#D91624] to-[#7A0912]',
                    frameBg: 'from-[#1E2C3A] to-[#111921]',
                    icon: Star,
                    iconColor: 'text-[#D4AF37]',
                  },
                  {
                    title: tr(uiLanguage, 'Directors & Crew', 'المخرجين والطاقم'),
                    sub: tr(uiLanguage, 'Directors · DOP · Score', 'مخرجين + تصوير وموسيقى'),
                    note: tr(uiLanguage, 'ON-SET MASTERS', 'قيادة البلاتوه'),
                    rot: 'rotate-2',
                    pinColor: 'from-[#FFF3B0] via-[#D4AF37] to-[#8C670C]',
                    frameBg: 'from-[#2A1D1F] to-[#1A2530]',
                    icon: Clapperboard,
                    iconColor: 'text-[#FFF3B0]',
                  },
                  {
                    title: tr(uiLanguage, 'Custom Stars', 'الرادار والنجوم الخاصة'),
                    sub: tr(uiLanguage, 'Diamond 99 Cards', 'كروت الألماظ 99'),
                    note: tr(uiLanguage, 'VIP EXCLUSIVE', 'عقود حصرية'),
                    rot: '-rotate-1',
                    pinColor: 'from-[#FF5C67] via-[#D91624] to-[#7A0912]',
                    frameBg: 'from-[#162735] to-[#0D1821]',
                    icon: Radar,
                    iconColor: 'text-[#4ADE80]',
                  },
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={i}
                      className={`relative bg-[#FDFBF7] p-2 sm:p-2.5 pb-3 rounded-md shadow-[0_10px_18px_rgba(32,16,4,0.34)] border border-[#E5DEC9] ${card.rot} group-hover:rotate-0 transition-transform duration-300`}
                    >
                      <div className="relative mx-auto -mt-4 mb-1.5 flex items-center justify-center">
                        <span className="absolute top-2.5 h-2.5 w-2.5 rounded-full bg-black/35 blur-[2px]" />
                        <span
                          className={`relative z-10 block h-4 w-4 rounded-full bg-gradient-to-br ${card.pinColor} border border-white/75 shadow-sm`}
                        >
                          <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-white/70" />
                        </span>
                      </div>

                      <div
                        className={`relative h-16 sm:h-20 w-full rounded-xs bg-gradient-to-br ${card.frameBg} border border-[#1A2530]/20 flex flex-col items-center justify-center overflow-hidden mb-2`}
                      >
                        <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${card.iconColor} drop-shadow`} />
                        <span className="mt-1 px-1.5 py-0.5 rounded bg-black/45 text-[9px] font-typewriter font-black text-[#D4AF37]">
                          {card.note}
                        </span>
                      </div>

                      <div className="text-center">
                        <div className="font-display text-xs sm:text-sm text-[#1A2530] leading-tight truncate">
                          {card.title}
                        </div>
                        <div className="font-ruqaa text-[11px] sm:text-xs text-[#D91624] leading-tight mt-0.5 truncate">
                          {card.sub}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#FEF08A] border border-[#CA8A04]/70 px-3.5 py-2 text-[#1A2530] text-xs font-extrabold shadow-[2px_4px_10px_rgba(32,16,4,0.22)] -rotate-[0.4deg]">
              <span>
                {awaitingChoiceCount > 0
                  ? tr(
                      uiLanguage,
                      `⚠️ ${awaitingChoiceCount} accepted offer(s) awaiting your final signature on the board!`,
                      `⚠️ لديك ${awaitingChoiceCount} عروض مقبولة تنتظر اختيارك النهائي على السبورة!`
                    )
                  : pendingOffersCount > 0
                  ? tr(
                      uiLanguage,
                      `⏳ Awaiting replies from ${pendingOffersCount} star(s) on your pending offers...`,
                      `⏳ بانتظار رد ${pendingOffersCount} من النجوم على عقودك المرسلة...`
                    )
                  : tr(
                      uiLanguage,
                      '📌 Tap to scout actors & directors and send contract offers for your next release',
                      '📌 اضغط لتصفح كروت الممثلين والمخرجين وإرسال عروض التعاقد لفيلمك القادم'
                    )}
              </span>
              <span className="font-display text-[#D91624] underline shrink-0">
                {tr(uiLanguage, 'Inspect Roster', 'فحص الكاستينج')}
              </span>
            </div>
          </motion.div>

          {/* 2. Wall Safe (Unlocks at Level 2) */}
          <motion.div
            data-tour-id="tour-vault-shelf"
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => {
              if (!progression.canUseStudioVault) {
                showToast(
                  tr(
                    uiLanguage,
                    'Permanent Soundstages Vault unlocks at Level 2 (Release 2 films + 7.0+ critic score or 110M valuation).',
                    'خزنة البلاتوهات الثابتة تُفتح في المستوى 2 (أنتج عملين + تقييم 7.0+ أو قيمة 110M).'
                  ),
                  'warning'
                );
                return;
              }
              openModalSheet('assets');
            }}
            className={`lg:col-span-5 relative rounded-3xl bg-gradient-to-br from-[#2C3A47] via-[#1A2530] to-[#111921] border-8 border-[#D4AF37] p-5 sm:p-6 text-[#F9F6F0] shadow-[0_18px_40px_rgba(26,37,48,0.3)] cursor-pointer flex flex-col justify-between group ${
              !progression.canUseStudioVault ? 'opacity-90' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#D4AF37] text-[#1A2530] text-xs font-black">
                {progression.canUseStudioVault ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>{tr(uiLanguage, 'Executive Wall Safe', 'خزنة الإمبراطور في الحائط')}</span>
              </span>
              <span className="font-typewriter text-xs font-black text-[#D4AF37]">
                {progression.canUseStudioVault
                  ? tr(uiLanguage, 'ARMORED VAULT', 'خزنة مصفحة')
                  : tr(uiLanguage, '🔒 LV.2 UNLOCK', '🔒 يُفتح مستوى 2')}
              </span>
            </div>

            <div className="my-4 flex items-center gap-4">
              <div className="w-20 h-20 shrink-0 rounded-full border-4 border-[#D4AF37] bg-[#1A2530] flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.35)] group-hover:rotate-90 transition-transform duration-500">
                <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] bg-[#D91624] flex items-center justify-center">
                  {progression.canUseStudioVault ? (
                    <Coins className="w-5 h-5 text-[#D4AF37]" />
                  ) : (
                    <Lock className="w-5 h-5 text-[#D4AF37]" />
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-display text-xl text-[#F9F6F0]">
                  {tr(uiLanguage, 'Treasury, Soundstages & Assets', 'الميزانية والبلاتوهات والأصول الثابتة')}
                </h3>
                <p className="text-xs text-[#F9F6F0]/80 font-bold mt-1 leading-relaxed">
                  {progression.canUseStudioVault
                    ? tr(
                        uiLanguage,
                        `Acquire permanent soundstages to slash production costs (-${assetBenefits.totalDiscountPercent}%), shield against set crises, and unlock emergency bailouts.`,
                        `شراء البلاتوهات الثابتة لتقليل تكاليف الإنتاج (خصم -${assetBenefits.totalDiscountPercent}%) والحماية من أزمات التصوير وتمويل الإنقاذ العاجل`
                      )
                    : tr(
                        uiLanguage,
                        'Unlocks at Level 2 (Release 2 films + 7.0+ critic score or 110M valuation) to buy permanent soundstages & cut production costs.',
                        'تُفتح في المستوى 2 (بعد إنتاج عملين + تقييم 7.0+ أو قيمة 110M) لشراء بلاتوهات دائمة وخفض التكاليف.'
                      )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#D4AF37]/30 text-xs font-extrabold text-[#D4AF37]">
              <span>
                {progression.canUseStudioVault
                  ? tr(
                      uiLanguage,
                      `Owned Assets: ${(ownedStudioAssets || []).length}/5 Facilities`,
                      `الأصول المملوكة: ${(ownedStudioAssets || []).length}/5 بلاتوهات`
                    )
                  : tr(uiLanguage, 'Requirement: Studio Level 2', 'الشرط: مستوى الاستوديو 2')}
              </span>
              <span className="px-3 py-1 rounded-lg bg-[#D4AF37] text-[#1A2530]">
                {progression.canUseStudioVault
                  ? tr(uiLanguage, `Open Vault ${arrowGlyph}`, `فتح الخزنة ${arrowGlyph}`)
                  : tr(uiLanguage, 'Locked · Lv.2', 'مغلق · مستوى 2')}
              </span>
            </div>
          </motion.div>
        </div>

        {/* THE 3D EMPEROR'S WOODEN DESK SURFACE */}
        <div className="relative rounded-[32px] bg-gradient-to-b from-[#5C3A21] via-[#4A2E19] to-[#362010] border-8 border-[#D4AF37] p-5 sm:p-8 shadow-[0_28px_70px_rgba(26,37,48,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-3 border-b-2 border-[#D4AF37]/40">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-display text-base sm:text-lg shadow-md">
              <DirectorChairIcon className="w-5 h-5 text-[#1A2530]" />
              <span>
                {tr(
                  uiLanguage,
                  'Interactive Executive Desk — Pick Your Tool',
                  'سطح مكتب الإمبراطور التفاعلي — اختر الأداة من فوق المكتب'
                )}
              </span>
            </div>
            <span className="text-xs font-bold text-[#F9F6F0]/85">
              {tr(
                uiLanguage,
                'Tap the Script Stack, Top Secret Red Folder, or Executive Phone directly',
                'اضغط مباشرة على ورق السيناريو أو الملف السري الأحمر أو الموبايل'
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PROP 1: Script Paper Stack */}
            <motion.div
              data-tour-id="tour-script"
              whileHover={{ y: -6, rotate: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (hasActiveProject) {
                  handleResumeActiveProject();
                } else {
                  resetDraftForNewProject('PROJECT_SETUP');
                }
              }}
              className="relative rounded-2xl bg-[#F9F6F0] text-[#1A2530] p-5 border-4 border-[#1A2530] shadow-[8px_12px_0px_#1A2530] cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded bg-[#1A2530] text-[#F9F6F0] font-typewriter text-[11px] font-black">
                    {tr(uiLanguage, `SCRIPT DRAFT · ${currentYear}`, `مسودة سيناريو · ${currentYear}`)}
                  </span>
                  <FileText className="w-6 h-6 text-[#D91624]" />
                </div>

                <h3 className="font-display text-2xl text-[#1A2530] mb-1">
                  {hasActiveProject
                    ? tr(uiLanguage, `Script “${draft.title}”`, `سيناريو «${draft.title}»`)
                    : tr(uiLanguage, 'New Production Script', 'ورق السيناريو (مشروع جديد)')}
                </h3>

                <p className="font-typewriter text-xs font-bold text-[#1A2530]/80 leading-relaxed">
                  {hasActiveProject
                    ? draft.filmingStartDay !== null
                      ? tr(
                          uiLanguage,
                          `Principal photography in progress (${draft.filmingDaysElapsed}/${draft.filmingDurationDays})`,
                          `التصوير جاري في البلاتوه (${draft.filmingDaysElapsed}/${draft.filmingDurationDays})`
                        )
                      : tr(
                          uiLanguage,
                          'Tap to continue casting contracts and filming prep for this script',
                          'اضغط لاستكمال التعاقدات والتصوير على ورق السيناريو'
                        )
                    : tr(
                        uiLanguage,
                        'Tap to open a fresh typewritten script and greenlight a blockbuster film or TV series',
                        'اضغط لفتح ورق السيناريو المطبوع بالآلة الكاتبة وبدء فيلم أو مسلسل جديد'
                      )}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t-2 border-dashed border-[#1A2530]/20 flex items-center justify-between">
                <span className="font-ruqaa text-base sm:text-lg text-[#D91624]">
                  {tr(uiLanguage, 'Director’s Cut', 'نسخة المخرج المعتمدة')}
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-[#D91624] text-white font-extrabold text-xs shadow">
                  {hasActiveProject
                    ? tr(uiLanguage, `Resume ${arrowGlyph}`, `متابعة العمل ${arrowGlyph}`)
                    : tr(uiLanguage, `New Project ${arrowGlyph}`, `إنشاء مشروع ${arrowGlyph}`)}
                </span>
              </div>
            </motion.div>

            {/* PROP 2: Top Secret Red Folder (2 Golden Locks -> The Star Forge) */}
            <motion.div
              data-tour-id="tour-starforge"
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStarForgeOpen(true)}
              className="relative rounded-2xl bg-gradient-to-br from-[#D91624] via-[#B3121E] to-[#7D0912] text-[#F9F6F0] p-5 border-4 border-[#D4AF37] shadow-[8px_12px_0px_#1A2530] cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded bg-[#1A2530] text-[#D4AF37] font-typewriter text-[11px] font-black border border-[#D4AF37]">
                  {tr(uiLanguage, 'TOP SECRET · VIP', 'ملف سري للغاية · خاص')}
                </span>
                <span className="text-xs font-extrabold text-[#D4AF37]">
                  {starForgeLocksOpened >= STAR_FORGE_REQUIRED_LOCKS
                    ? tr(
                        uiLanguage,
                        `All ${STAR_FORGE_REQUIRED_LOCKS} Locks Open ✓`,
                        `القفلان مفتوحان ✓`
                      )
                    : tr(
                        uiLanguage,
                        `${starForgeLocksOpened}/${STAR_FORGE_REQUIRED_LOCKS} Locks`,
                        `${starForgeLocksOpened}/${STAR_FORGE_REQUIRED_LOCKS} أقفال`
                      )}
                </span>
              </div>

              <div>
                <h3 className="font-display text-2xl text-[#F9F6F0] mb-1">
                  {tr(uiLanguage, 'Top Secret (The Star Forge)', 'الملف السري (غرفة صناعة النجوم)')}
                </h3>
                <p className="text-xs font-bold text-[#F9F6F0]/90 leading-relaxed">
                  {tr(
                    uiLanguage,
                    `Unlock the ${STAR_FORGE_REQUIRED_LOCKS} golden vault locks and enter the Royal Casting Cabin to craft your own Diamond-tier superstar!`,
                    `افتح القفلين الذهبيين (${STAR_FORGE_REQUIRED_LOCKS}) وادخل كابينة الكاستينج لتصميم نجمك الخاص بالرادار السداسي والكارت الألماظ!`
                  )}
                </p>

                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  {lockIndices.map((idx) => {
                    const unlocked = idx < (starForgeLocksOpened || 0);
                    return (
                      <div
                        key={idx}
                        className={`py-2 rounded-lg flex items-center justify-center gap-1.5 border text-[11px] font-black ${
                          unlocked
                            ? 'bg-[#D4AF37] text-[#1A2530] border-white'
                            : 'bg-[#1A2530]/80 text-[#D4AF37] border-[#D4AF37]/50'
                        }`}
                      >
                        {unlocked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>{tr(uiLanguage, 'Open', 'مفتوح')}</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>#{idx + 1}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#D4AF37]/40 flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#D4AF37]">
                  {tr(uiLanguage, 'Royal Casting Cabin', 'كابينة الكاستينج الملكية')}
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-[#1A2530] font-extrabold text-xs shadow">
                  {tr(uiLanguage, `Open Vault ${arrowGlyph}`, `فتح الملف السري ${arrowGlyph}`)}
                </span>
              </div>
            </motion.div>

            {/* PROP 3: Executive Smartphone (Unlocks at Level 2; Rival Rumors at Level 3) */}
            <motion.div
              data-tour-id="tour-phone"
              whileHover={{ y: -6, rotate: 1 }}
              whileTap={{ scale: 0.98 }}
              animate={
                hasUnresolvedCrisis && progression.canUsePrPhone
                  ? { rotate: [-1.5, 1.5, -1.5, 1.5, 0] }
                  : undefined
              }
              transition={{ duration: 0.5, repeat: hasUnresolvedCrisis && progression.canUsePrPhone ? Infinity : 0 }}
              onClick={() => {
                if (!progression.canUsePrPhone) {
                  showToast(
                    tr(
                      uiLanguage,
                      'PR War Room & Fan Campaigns unlock at Level 2 (Release 2 films + 7.0+ critic score or 110M valuation).',
                      'موبايل اللجان الإلكترونية وحملات الدعم يُفتح في المستوى 2 (أنتج عملين + تقييم 7.0+ أو قيمة 110M).'
                    ),
                    'warning'
                  );
                  return;
                }
                setPrWarRoomOpen(true);
              }}
              className={`relative rounded-[28px] bg-[#1A2530] text-[#F9F6F0] p-5 border-4 border-[#D4AF37] shadow-[8px_12px_0px_#0F171E] cursor-pointer flex flex-col justify-between ${
                !progression.canUsePrPhone ? 'opacity-90' : ''
              }`}
            >
              <div className="w-16 h-1.5 rounded-full bg-[#D4AF37]/40 mx-auto mb-3" />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D91624] text-white text-[10px] font-extrabold">
                    {progression.canUsePrPhone ? (
                      <Flame className="w-3 h-3" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                    <span>
                      {progression.canUsePrPhone
                        ? tr(uiLanguage, 'Executive Direct Line', 'موبايل الإمبراطور المباشر')
                        : tr(uiLanguage, 'Unlocks at Level 2', 'يُفتح في المستوى 2')}
                    </span>
                  </span>
                  <Smartphone className="w-5 h-5 text-[#D4AF37]" />
                </div>

                <h3 className="font-display text-2xl text-[#F9F6F0] mb-1">
                  {tr(uiLanguage, 'PR War Room & Trends', 'اللجان الإلكترونية والتريند')}
                </h3>
                <p className="text-xs font-bold text-[#F9F6F0]/80 leading-relaxed">
                  {progression.canUsePrPhone
                    ? tr(
                        uiLanguage,
                        'Live social buzz radar — launch fan waves to boost your release (2M) or leak set rumors against rivals (Lv.3)!',
                        'شاشة موبايل حية لمتابعة تعليقات الجمهور، توجيه اللجان لدعم الفيلم (2M) أو حرب الإشاعات ضد المنافسين (المستوى 3)!'
                      )
                    : tr(
                        uiLanguage,
                        'Promote to Level 2 (Rising Production House) to activate Fan Buzz Campaigns, and Level 3 for Rival Rumor Wars.',
                        'ترقَّ إلى المستوى 2 (شركة إنتاج صاعدة) لتفعيل لجان دعم أفلامك، والمستوى 3 لحرب الإشاعات ضد المنافسين.'
                      )}
                </p>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-[#F9F6F0]/10 border border-[#D4AF37]/30 text-[11px] font-bold text-[#D4AF37]">
                {progression.canUsePrPhone
                  ? tr(
                      uiLanguage,
                      '💬 “Audiences are buzzing about your studio on X and TikTok right now...”',
                      '💬 «الجمهور بيتكلم عن أعمالك على X وتيك توك الآن...»'
                    )
                  : tr(
                      uiLanguage,
                      '🔒 Complete 2 films + 7.0+ critic review (or 110M value) to unlock PR Phone',
                      '🔒 أنتج عملين + تقييم 7.0+ (أو قيمة 110M) لفتح موبايل اللجان'
                    )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="font-typewriter text-xs text-[#F9F6F0]/70">
                  {progression.canUsePrPhone
                    ? tr(uiLanguage, 'LIVE · TREND RADAR', 'بث مباشر · رادار التريند')
                    : tr(uiLanguage, 'LOCKED · LV.2', 'مغلق · مستوى 2')}
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-[#D91624] text-white font-extrabold text-xs border border-[#D4AF37]">
                  {progression.canUsePrPhone
                    ? tr(uiLanguage, `Open Phone ${arrowGlyph}`, `فتح شاشة الموبايل ${arrowGlyph}`)
                    : tr(uiLanguage, '🔒 Level 2', '🔒 مستوى 2')}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* TROPHY & ARCHIVE SHELF */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => setActiveScreen('FESTIVALS_AWARDS')}
            className={`flex items-center gap-3 p-4 rounded-2xl bg-[#F9F6F0] border-2 border-[#1A2530] shadow-[4px_6px_0px_#1A2530] hover:bg-[#FFF9E6] transition ${
              isAr ? 'text-right' : 'text-left'
            } cursor-pointer`}
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#D4AF37] text-[#1A2530] flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display text-sm sm:text-base text-[#1A2530]">
                {tr(uiLanguage, `Awards Hall (${totalAwards})`, `قاعة الجوائز (${totalAwards})`)}
              </div>
              <div className="text-[11px] font-bold text-[#1A2530]/70">
                {tr(
                  uiLanguage,
                  `Gala in ${daysUntilAnnualAwards}d`,
                  `الحفل بعد ${daysUntilAnnualAwards} يوم`
                )}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openModalSheet('archive')}
            className={`flex items-center gap-3 p-4 rounded-2xl bg-[#F9F6F0] border-2 border-[#1A2530] shadow-[4px_6px_0px_#1A2530] hover:bg-[#FFF9E6] transition ${
              isAr ? 'text-right' : 'text-left'
            } cursor-pointer`}
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#D91624] text-white flex items-center justify-center">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display text-sm sm:text-base text-[#1A2530]">
                {tr(
                  uiLanguage,
                  `Film Archive (${releasedProjects.length})`,
                  `أرشيف الأفلام (${releasedProjects.length})`
                )}
              </div>
              <div className="font-typewriter text-[11px] font-bold text-[#1A2530]/70">
                {formatMoney(lifetimeBoxOffice)} {currencyLabel}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openModalSheet('markets')}
            className={`flex items-center gap-3 p-4 rounded-2xl bg-[#F9F6F0] border-2 border-[#1A2530] shadow-[4px_6px_0px_#1A2530] hover:bg-[#FFF9E6] transition ${
              isAr ? 'text-right' : 'text-left'
            } cursor-pointer`}
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#1A2530] text-[#D4AF37] flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display text-sm sm:text-base text-[#1A2530]">
                {tr(uiLanguage, 'Global Markets', 'الأسواق العالمية')}
              </div>
              <div className="text-[11px] font-bold text-[#1A2530]/70">
                {tr(
                  uiLanguage,
                  `${unlockedRegions.length} of 4 Unlocked`,
                  `${unlockedRegions.length} من 4 أسواق مفتوحة`
                )}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openModalSheet('leaderboard')}
            className={`flex items-center gap-3 p-4 rounded-2xl bg-[#F9F6F0] border-2 border-[#1A2530] shadow-[4px_6px_0px_#1A2530] hover:bg-[#FFF9E6] transition ${
              isAr ? 'text-right' : 'text-left'
            } cursor-pointer`}
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#1A2530] text-[#F9F6F0] flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <div className="font-display text-sm sm:text-base text-[#1A2530]">
                {tr(uiLanguage, 'Rankings', 'ترتيب الشركات')}
              </div>
              <div className="text-[11px] font-bold text-[#1A2530]/70">
                {tr(uiLanguage, 'Valuation Exchange', 'بورصة القيمة السوقية')}
              </div>
            </div>
          </button>
        </div>

        {/* OFFICIAL FOOTER */}
        {onOpenInfo && (
          <footer className="rounded-2xl bg-[#1A2530] text-[#F9F6F0] border-2 border-[#D4AF37]/60 px-4 py-3.5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9A7210] text-[#1A2530] shadow">
                <Crown className="w-4 h-4" />
              </span>
              <div>
                <span className="font-display text-sm text-[#D4AF37] block leading-tight">
                  Neelyo — Cinema &amp; TV Tycoon
                </span>
                <a
                  href="mailto:neelyotycoon@gmail.com"
                  dir="ltr"
                  className="font-typewriter text-[11px] font-bold text-[#F9F6F0]/75 hover:text-[#D4AF37] transition"
                >
                  neelyotycoon@gmail.com
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onOpenInfo('about')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F9F6F0]/10 hover:bg-[#F9F6F0]/20 border border-[#D4AF37]/40 text-xs font-extrabold text-[#F9F6F0] cursor-pointer transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{tr(uiLanguage, 'About', 'معلومات عنا')}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenInfo('privacy')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F9F6F0]/10 hover:bg-[#F9F6F0]/20 border border-[#D4AF37]/40 text-xs font-extrabold text-[#F9F6F0] cursor-pointer transition"
              >
                <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{tr(uiLanguage, 'Privacy', 'سياسة الخصوصية')}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenInfo('terms')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F9F6F0]/10 hover:bg-[#F9F6F0]/20 border border-[#D4AF37]/40 text-xs font-extrabold text-[#F9F6F0] cursor-pointer transition"
              >
                <Scale className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{tr(uiLanguage, 'Terms', 'شروط الاستخدام')}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenInfo('contact')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D91624] hover:brightness-110 border border-[#D4AF37] text-xs font-extrabold text-white cursor-pointer transition"
              >
                <Mail className="w-3.5 h-3.5 text-[#FFF3B0]" />
                <span>{tr(uiLanguage, 'Contact', 'تواصل معنا')}</span>
              </button>
            </div>
          </footer>
        )}
      </div>

      {/* Modal Sheets */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveSheet(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2530]/80 p-3 backdrop-blur-md overscroll-contain sm:p-4"
            dir={dir}
          >
            <motion.div
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="my-auto max-h-[88dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border-4 border-[#D4AF37] bg-[#F9F6F0] p-5 sm:p-6 text-[#1A2530] shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b-2 border-[#1A2530]/15 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#D91624]" />
                  <h2 className="font-display text-xl text-[#1A2530]">
                    {activeSheet === 'markets' &&
                      tr(uiLanguage, 'Regional & Global Distribution Map', 'خريطة التوزيع الإقليمية والعالمية')}
                    {activeSheet === 'archive' &&
                      tr(uiLanguage, 'Released Films & Series Archive', 'أرشيف الأفلام والمسلسلات المنتجة')}
                    {activeSheet === 'history' &&
                      tr(uiLanguage, 'Studio Chronicle', 'السجل التاريخي للاستوديو')}
                    {activeSheet === 'leaderboard' &&
                      tr(uiLanguage, 'Official Studio Rankings', 'الترتيب الرسمي لشركات الإنتاج')}
                    {activeSheet === 'assets' &&
                      tr(uiLanguage, 'Executive Vault — Fixed Assets & Liquidity', 'خزنة الإمبراطور — البلاتوهات الثابتة والسيولة')}
                    {activeSheet === 'missions' &&
                      tr(uiLanguage, 'Studio Career Ladder & Promotion Missions', 'سلم التطور ومهام ترقية الاستوديو')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A2530] text-[#F9F6F0] hover:bg-[#D91624] transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {activeSheet === 'missions' && (
                <div className="space-y-4">
                  {/* Current Level Executive Summary */}
                  <div className="rounded-2xl bg-[#1A2530] text-[#F9F6F0] p-4 sm:p-5 border-2 border-[#D4AF37] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#9A7209] font-typewriter text-sm font-black text-[#1A2530] shadow-md">
                          Lv.{progression.level}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-black text-[#D4AF37] uppercase tracking-wider">
                            {tr(uiLanguage, 'Current Studio Rank', 'المستوى الحالي للاستوديو')}
                          </div>
                          <h3 className="font-display text-lg sm:text-xl text-[#F9F6F0] truncate">
                            {progression.title}
                          </h3>
                          <p className="text-[11px] font-bold text-[#F9F6F0]/75">
                            {progression.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span
                          dir="ltr"
                          className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 font-mono text-xs font-black text-rose-200 tabular-nums"
                        >
                          {tr(
                            uiLanguage,
                            `Overhead: -${formatMoney(progression.monthlyOverhead)} / 10d`,
                            `المصاريف: -${formatMoney(progression.monthlyOverhead)} / 10 أيام`
                          )}
                        </span>
                        <span className="rounded-xl bg-[#D4AF37] px-3 py-1.5 font-typewriter text-xs font-black text-[#1A2530] tabular-nums">
                          {progression.progressPercent}%
                        </span>
                      </div>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#D91624] via-[#D4AF37] to-[#4ADE80] transition-all duration-500"
                        style={{ width: `${progression.progressPercent}%` }}
                      />
                    </div>

                    <p className="text-xs font-bold text-[#FFF3B0]">
                      {progression.headlineTask}
                    </p>
                  </div>

                  {/* Active Promotion Checklist */}
                  <div className="rounded-2xl border-2 border-[#1A2530]/15 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-display text-sm sm:text-base text-[#1A2530] flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-[#D91624]" />
                        <span>
                          {progression.nextLevel
                            ? tr(
                                uiLanguage,
                                `Requirements for Level ${progression.nextLevel} (${progression.nextLevelTitle})`,
                                `شروط الترقية إلى المستوى ${progression.nextLevel} (${progression.nextLevelTitle})`
                              )
                            : tr(
                                uiLanguage,
                                'All Studio Promotions Completed',
                                'تم إنجاز جميع ترقيات الاستوديو'
                              )}
                        </span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {progression.checklist.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between gap-2 rounded-xl border-2 p-3 ${
                            item.done
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                              : 'border-[#1A2530]/15 bg-[#F9F6F0] text-[#1A2530]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {item.done ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Lock className="h-4 w-4 text-[#D4AF37] shrink-0" />
                            )}
                            <span className="text-xs font-black leading-snug">
                              {item.label}
                            </span>
                          </div>
                          <span
                            dir="ltr"
                            className={`shrink-0 rounded-lg px-2 py-0.5 font-mono text-[11px] font-black tabular-nums ${
                              item.done
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#1A2530] text-[#D4AF37]'
                            }`}
                          >
                            {item.progressText}
                          </span>
                        </div>
                      ))}
                    </div>

                    {progression.nextUnlocksSummary && (
                      <div className="rounded-xl border border-[#D4AF37]/50 bg-[#FFF9E6] px-3.5 py-2.5 text-xs font-extrabold text-[#7C5A08]">
                        <span className="text-[#D91624]">★ </span>
                        {progression.nextUnlocksSummary}
                      </div>
                    )}
                  </div>

                  {/* Full 4-Tier Studio Career Roadmap */}
                  <div className="space-y-2.5">
                    <h4 className="font-display text-sm sm:text-base text-[#1A2530] px-1">
                      {tr(
                        uiLanguage,
                        'Full 4-Level Empire Roadmap (100% Gameplay Unlocked)',
                        'خريطة الصعود الكاملة (4 مستويات تُفتح باللعب فقط)'
                      )}
                    </h4>
                    <div className="space-y-2">
                      {([1, 2, 3, 4] as StudioLevel[]).map((tierLevel) => {
                        const info = getLevelTitle(tierLevel, uiLanguage);
                        const isUnlocked = progression.level >= tierLevel;
                        const isCurrent = progression.level === tierLevel;
                        const isNext = progression.nextLevel === tierLevel;
                        const reqCopy =
                          tierLevel === 1
                            ? tr(uiLanguage, 'Starting Tier (25M Cash · 30% Rep)', 'نقطة البداية (25M كاش · 30% سمعة)')
                            : tierLevel === 2
                            ? tr(uiLanguage, '2 Releases + (110M Value OR 7.0+ Critics)', 'إنتاج عملين + (قيمة 110M أو تقييم 7.0+)')
                            : tierLevel === 3
                            ? tr(uiLanguage, '250M Valuation + 1 Festival Award', 'قيمة سوقية 250M + جائزة مهرجان واحدة')
                            : tr(uiLanguage, '550M+ Valuation + 3 Festival Awards', 'قيمة سوقية 550M+ + 3 جوائز مهرجانات');

                        return (
                          <div
                            key={tierLevel}
                            className={`rounded-2xl border-2 p-3.5 transition ${
                              isCurrent
                                ? 'border-[#D4AF37] bg-[#FFFBEB] shadow-xs'
                                : isUnlocked
                                ? 'border-emerald-300 bg-white'
                                : isNext
                                ? 'border-[#D91624]/45 bg-white'
                                : 'border-[#1A2530]/15 bg-white/75 opacity-85'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-typewriter text-xs font-black ${
                                    isUnlocked
                                      ? 'bg-[#15803D] text-white'
                                      : isNext
                                      ? 'bg-[#D91624] text-white'
                                      : 'bg-[#1A2530]/15 text-[#1A2530]'
                                  }`}
                                >
                                  Lv.{tierLevel}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-display text-sm text-[#1A2530]">
                                      {info.title}
                                    </span>
                                    {isCurrent && (
                                      <span className="rounded bg-[#1A2530] px-1.5 py-0.5 text-[10px] font-black text-[#D4AF37]">
                                        {tr(uiLanguage, 'CURRENT', 'مستواك الحالي')}
                                      </span>
                                    )}
                                    {isNext && (
                                      <span className="rounded bg-[#D91624] px-1.5 py-0.5 text-[10px] font-black text-white">
                                        {tr(uiLanguage, 'NEXT TARGET', 'الهدف القادم')}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-bold text-[#1A2530]/75 mt-0.5">
                                    {info.subtitle}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  dir="ltr"
                                  className="rounded-lg bg-[#F9F6F0] border border-[#1A2530]/15 px-2 py-0.5 font-mono text-[10px] font-black text-[#1A2530]/80 tabular-nums"
                                >
                                  -{formatMoney(LEVEL_MONTHLY_OVERHEAD[tierLevel])}/mo
                                </span>
                                {isUnlocked ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <Lock className="h-4 w-4 text-[#1A2530]/40" />
                                )}
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-[#1A2530]/10 text-[11px] font-extrabold text-[#1A2530]/75">
                              {tr(uiLanguage, 'Unlock:', 'شرط الفتح:')} {reqCopy}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeSheet === 'assets' && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#1A2530] text-[#F9F6F0] p-4 border-2 border-[#D4AF37]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg text-[#D4AF37]">
                          {tr(uiLanguage, 'Treasury & Emergency Liquidity', 'خزينة السيولة والتمويل الطارئ')}
                        </h3>
                        <p className="text-xs text-[#F9F6F0]/80 mt-0.5">
                          {tr(uiLanguage, 'Available Cash:', 'السيولة المتاحة:')}{' '}
                          <strong dir="ltr" className="font-typewriter text-[#D4AF37]">
                            {formatMoney(cash)}
                          </strong>{' '}
                          {currencyLabel} · {tr(uiLanguage, 'Asset Cost Discount:', 'خصم الأصول الثابتة:')}{' '}
                          <strong className="text-emerald-400">
                            -{assetBenefits.totalDiscountPercent}%
                          </strong>
                        </p>
                      </div>

                      {canUseEmergencyBailout ? (
                        <button
                          type="button"
                          onClick={handleEmergencyBailoutAd}
                          className="shrink-0 px-4 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] hover:brightness-105 font-black text-xs transition cursor-pointer text-center shadow"
                        >
                          <div className="font-display text-sm text-[#1A2530]">
                            {tr(uiLanguage, 'Investor Bailout (Watch Ad)', 'تمويل إنقاذ من مستثمر (إعلان)')}
                          </div>
                          <div>
                            +
                            {formatMoney(
                              cash < 0 ? Math.abs(cash) + 15_000_000 : 15_000_000
                            )}{' '}
                            {currencyLabel} {tr(uiLanguage, 'Instant Cash', 'سيولة فورية')}
                          </div>
                        </button>
                      ) : (
                        <div
                          className={`shrink-0 rounded-xl border border-[#D4AF37]/35 bg-white/5 px-3.5 py-2.5 text-center ${
                            isAr ? 'sm:text-right' : 'sm:text-left'
                          } max-w-[240px]`}
                        >
                          <div className="text-[11px] font-black text-[#D4AF37]">
                            {bailoutCooldownRemaining > 0
                              ? tr(
                                  uiLanguage,
                                  `Bailout available in ${bailoutCooldownRemaining}d`,
                                  `الإنقاذ متاح بعد ${bailoutCooldownRemaining} يوماً`
                                )
                              : tr(uiLanguage, 'Studio Treasury Healthy', 'خزينة الاستوديو مستقرة')}
                          </div>
                          <p className="text-[10px] font-bold text-[#F9F6F0]/75 mt-0.5 leading-snug">
                            {bailoutCooldownRemaining > 0
                              ? tr(
                                  uiLanguage,
                                  'Emergency investor bailout can be triggered once every 30 in-game days.',
                                  'تمويل الإنقاذ العاجل يُستخدم مرة واحدة كل 30 يوماً.'
                                )
                              : tr(
                                  uiLanguage,
                                  `Emergency bailout unlocks automatically if cash drops to 10M ${currencyLabel} or below.`,
                                  `يُفتح تمويل الإنقاذ الطارئ تلقائياً فقط عند انخفاض السيولة إلى 10M ${currencyLabel} أو أقل.`
                                )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {STUDIO_FIXED_ASSETS.map((asset) => {
                      const isOwned = (ownedStudioAssets || []).includes(asset.id);
                      const isBusy = purchasingAssetId === asset.id;
                      const enAsset = STUDIO_ASSETS_EN[asset.id];
                      const displayCategory = isAr
                        ? asset.categoryLabel
                        : enAsset?.categoryLabel || asset.categoryLabel;
                      const displayName = isAr
                        ? asset.name
                        : enAsset?.name || asset.name;
                      const displayDesc = isAr
                        ? asset.description
                        : enAsset?.description || asset.description;
                      const displayShield = isAr
                        ? asset.crisisShieldLabel
                        : enAsset?.crisisShieldLabel || asset.crisisShieldLabel;

                      return (
                        <div
                          key={asset.id}
                          className={`rounded-2xl border-2 p-4 transition ${
                            isOwned
                              ? 'border-[#15803D] bg-white'
                              : 'border-[#1A2530]/20 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-block rounded bg-[#1A2530] px-2.5 py-0.5 text-[10px] font-bold text-[#D4AF37]">
                                {displayCategory}
                              </span>
                              <h3 className="mt-1 font-display text-base text-[#1A2530]">
                                {displayName}
                              </h3>
                            </div>
                            <span className="shrink-0 rounded-xl bg-[#1A2530] px-3 py-1 font-typewriter text-xs font-black text-[#D4AF37]">
                              {formatMoney(asset.price)} {currencyLabel}
                            </span>
                          </div>

                          <p className="mt-1.5 text-xs font-bold leading-relaxed text-[#1A2530]/80">
                            {displayDesc}
                          </p>

                          <div className="mt-2 flex items-center gap-1.5 text-xs font-extrabold text-[#15803D]">
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            <span>{displayShield}</span>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-[#1A2530]/10">
                            {isOwned ? (
                              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-[#15803D] py-2 text-xs font-black text-white">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>
                                  {tr(
                                    uiLanguage,
                                    'Owned & Certified in Studio Vault ✓',
                                    'أصل ثابت مملوك وموثق في خزنة الاستوديو ✓'
                                  )}
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={async () => {
                                  setPurchasingAssetId(asset.id);
                                  await purchaseStudioAsset(asset.id);
                                  setPurchasingAssetId(null);
                                }}
                                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#D91624] py-2.5 px-4 text-xs font-black text-white border border-[#D4AF37] shadow transition hover:brightness-110 cursor-pointer disabled:opacity-50"
                              >
                                {isBusy ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>
                                      {tr(uiLanguage, 'Certifying Deed...', 'جاري توثيق الملكية...')}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Building2 className="h-4 w-4" />
                                    <span>
                                      {tr(
                                        uiLanguage,
                                        `Acquire & Certify Asset (${formatMoney(asset.price)} ${currencyLabel})`,
                                        `شراء وتوثيق الأصل (${formatMoney(asset.price)} ${currencyLabel})`
                                      )}
                                    </span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeSheet === 'markets' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {marketConfigs.map((cfg) => {
                    const regId = cfg.id;
                    const unlocked = unlockedRegions.includes(regId);
                    const reqLevel = getMarketRegionRequiredLevel(regId, primaryRegion);
                    const isLevelLocked = !unlocked && progression.level < reqLevel;
                    const isSelectedForNextProject = activeDistMarkets.includes(regId);
                    const bonusPct = Math.round(cfg.revenueBonusFactor * 100);

                    return (
                      <div
                        key={regId}
                        className={`flex flex-col justify-between rounded-2xl border-2 border-[#1A2530]/20 bg-white p-4 ${
                          isAr ? 'text-right' : 'text-left'
                        } ${isLevelLocked ? 'opacity-85' : ''}`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-extrabold ${
                                unlocked
                                  ? 'text-[#15803D]'
                                  : isLevelLocked
                                  ? 'text-amber-800'
                                  : 'text-[#D91624]'
                              }`}
                            >
                              {isLevelLocked && <Lock className="h-3 w-3" />}
                              <span>
                                {unlocked
                                  ? tr(uiLanguage, 'Market Unlocked ✓', 'سوق مفتوح ✓')
                                  : isLevelLocked
                                  ? tr(
                                      uiLanguage,
                                      `Requires Studio Lv.${reqLevel}`,
                                      `يتطلب مستوى الاستوديو ${reqLevel}`
                                    )
                                  : tr(uiLanguage, 'Ready to License', 'جاهز لفتح الترخيص')}
                              </span>
                            </span>
                            <span className="rounded bg-[#1A2530] px-2 py-0.5 font-typewriter text-[10px] font-black text-[#D4AF37]">
                              {regId === primaryRegion
                                ? tr(uiLanguage, '100% Home Base', '100% أساسي')
                                : tr(uiLanguage, `+${bonusPct}% Revenue`, `+${bonusPct}% إيرادات`)}
                            </span>
                          </div>
                          <div className="font-display mt-1.5 text-base text-[#1A2530]">
                            {cfg.name}
                          </div>
                          <p className="mt-1 text-xs font-bold text-[#1A2530]/75">
                            {cfg.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#1A2530]/10">
                          {unlocked ? (
                            <button
                              type="button"
                              disabled={regId === primaryRegion}
                              onClick={() => toggleDraftDistributionMarket(regId)}
                              className="w-full rounded-xl py-2 px-3 text-xs font-black bg-[#1A2530] text-[#F9F6F0] cursor-pointer"
                            >
                              {regId === primaryRegion
                                ? tr(uiLanguage, 'Always Active (Home Market) ✓', 'مفعل دائماً كسوق أساسي ✓')
                                : isSelectedForNextProject
                                ? tr(uiLanguage, 'Active for Next Release ✓', 'مفعل لتوزيع عملك القادم ✓')
                                : tr(uiLanguage, 'Enable for Next Release', 'تفعيل التوزيع لعملك القادم')}
                            </button>
                          ) : isLevelLocked ? (
                            <button
                              type="button"
                              onClick={() => unlockMarketRegionWithCash(regId)}
                              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37] bg-[#1A2530] py-2 px-3 text-xs font-black text-[#FDE68A] cursor-pointer"
                            >
                              <Lock className="h-3.5 w-3.5 text-[#D4AF37]" />
                              <span>
                                {reqLevel === 3
                                  ? tr(uiLanguage, 'Unlock at Lv.3 (250M + 1 Award)', 'يُفتح مستوى 3 (250M + جائزة)')
                                  : tr(uiLanguage, 'Unlock at Lv.4 (550M + 3 Awards)', 'يُفتح مستوى 4 (550M + 3 جوائز)')}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => unlockMarketRegionWithCash(regId)}
                              className="w-full rounded-xl bg-[#D91624] py-2 px-3 text-xs font-black text-white cursor-pointer"
                            >
                              {tr(
                                uiLanguage,
                                `Open Early Office (${formatMoney(cfg.earlyLicenseCost)} ${currencyLabel})`,
                                `فتح مكتب مبكر (${formatMoney(cfg.earlyLicenseCost)} ${currencyLabel})`
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeSheet === 'archive' && (
                <div className="space-y-3">
                  {releasedProjects.length === 0 ? (
                    <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-[#1A2530]/70">
                      {tr(
                        uiLanguage,
                        'No releases in your catalog yet. Tap the Script Stack on your Executive Desk to greenlight your debut hit!',
                        'لم تقم بإصدار أي عمل فني بعد. اضغط على «ورق السيناريو» فوق مكتب الإمبراطور للبدء!'
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5">
                        {visibleArchiveProjects.map((proj) => {
                          const genreName = getLocalizedGenreInfo(
                            proj.primaryGenre,
                            uiLanguage
                          ).name;
                          return (
                            <div
                              key={proj.id}
                              className="rounded-2xl border-2 border-[#1A2530]/20 bg-white p-4"
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-[#D91624]">
                                  {proj.format === 'film'
                                    ? tr(uiLanguage, 'Feature Film', 'فيلم')
                                    : tr(uiLanguage, 'TV Series', 'مسلسل')}{' '}
                                  · {genreName}
                                </span>
                                <span className="font-typewriter">
                                  {tr(uiLanguage, `Year ${proj.year}`, `عام ${proj.year}`)}
                                </span>
                              </div>
                              <div className="font-display mt-1 text-lg text-[#1A2530]">
                                {proj.title}
                              </div>
                              <div className="mt-1.5 flex items-center justify-between text-xs font-typewriter font-bold">
                                <span className="text-[#15803D]">
                                  {tr(uiLanguage, 'Revenue:', 'الإيرادات:')}{' '}
                                  {formatMoney(proj.totalGrossRevenue)} {currencyLabel}
                                </span>
                                <span>
                                  {tr(
                                    uiLanguage,
                                    `Critics: ${proj.criticScore}/10 · Audience: ${proj.audienceScore}/10`,
                                    `النقاد: ${proj.criticScore}/10 · الجمهور: ${proj.audienceScore}/10`
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {archiveTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-3">
                          <button
                            type="button"
                            disabled={modalPage === 0}
                            onClick={() => setModalPage((p) => Math.max(0, p - 1))}
                            className="px-4 py-2 rounded-xl bg-white border border-[#1A2530] text-xs font-bold cursor-pointer disabled:opacity-40"
                          >
                            {tr(uiLanguage, 'Previous', 'السابق')}
                          </button>
                          <span className="text-xs font-bold">
                            {tr(
                              uiLanguage,
                              `Page ${modalPage + 1} of ${archiveTotalPages}`,
                              `صفحة ${modalPage + 1} من ${archiveTotalPages}`
                            )}
                          </span>
                          <button
                            type="button"
                            disabled={modalPage >= archiveTotalPages - 1}
                            onClick={() =>
                              setModalPage((p) => Math.min(archiveTotalPages - 1, p + 1))
                            }
                            className="px-4 py-2 rounded-xl bg-[#D91624] text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                          >
                            {tr(uiLanguage, 'Next', 'التالي')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeSheet === 'history' && (
                <div className="space-y-2.5">
                  {visibleHistoryItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-2xl border border-[#1A2530]/20 bg-white p-3.5 text-xs font-bold"
                    >
                      <History className="w-4 h-4 text-[#D91624] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-typewriter text-[#D91624]">[{item.year}]</span>{' '}
                        <span>{item.eventText}</span>
                      </div>
                    </div>
                  ))}
                  {historyTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        disabled={modalPage === 0}
                        onClick={() => setModalPage((p) => Math.max(0, p - 1))}
                        className="px-4 py-1.5 rounded-xl bg-white border border-[#1A2530] text-xs font-bold cursor-pointer disabled:opacity-40"
                      >
                        {tr(uiLanguage, 'Previous', 'السابق')}
                      </button>
                      <button
                        type="button"
                        disabled={modalPage >= historyTotalPages - 1}
                        onClick={() =>
                          setModalPage((p) => Math.min(historyTotalPages - 1, p + 1))
                        }
                        className="px-4 py-1.5 rounded-xl bg-[#D91624] text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                      >
                        {tr(uiLanguage, 'Next', 'التالي')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeSheet === 'leaderboard' && <LeaderboardAndSettingsView />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
