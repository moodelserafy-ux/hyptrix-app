'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useGameStore,
  formatGameDate,
  SOCIAL_PR_CAMPAIGNS,
  SocialPrCampaignItem,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { formatMoney } from '@/lib/game-engine';
import { computeStudioProgression } from '@/lib/progression';
import { getMarketAiContext, getCurrencyLabel } from '@/lib/market-profiles';
import {
  getUiDir,
  localizeEntityName,
  PR_CAMPAIGNS_EN,
  tr,
} from '@/lib/i18n';
import {
  Newspaper,
  Sparkles,
  Trophy,
  Award,
  Building2,
  Check,
  Radio,
  Star,
  AlertTriangle,
  CheckCircle2,
  X,
  TrendingUp,
  Quote,
  Megaphone,
  Flame,
  Heart,
  Share2,
  Loader2,
  Smartphone,
  Target,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  playSocialNotifPop,
  playCashRegisterChaChing,
} from '@/lib/sound-fx';
import {
  showRewardedAd,
  getRewardedAdErrorMessage,
} from '@/lib/ad-mediator';

export function WorldPopupsOverlay() {
  const {
    breakingNewsQueue,
    dismissBreakingNewsModal,
    festivalModalQueue,
    dismissFestivalCeremonyModal,
    studioName,
    cash,
    marketValue,
    releasedProjects,
    draft,
    lastReleasedProject,
    yearlyRivalReleases,
    socialFeedLog,
    isPrWarRoomOpen,
    setPrWarRoomOpen,
    launchSocialPrCampaign,
    activeToast,
    dismissToast,
    currentYear,
    gameDay,
    isBankruptLiquidated,
    claimEmergencyInvestorBailoutWithAd,
    liquidateAndStartNewStudioInSameWorld,
    worldMarket,
    uiLanguage,
    customDbPatch,
    showToast,
  } = useGameStore();

  const progression = useMemo(
    () =>
      computeStudioProgression({
        marketValue,
        releasedProjects,
        uiLanguage,
      }),
    [marketValue, releasedProjects, uiLanguage]
  );

  const isEn = uiLanguage !== 'ar';
  const uiDir = getUiDir(uiLanguage);
  const currencyLabel = getCurrencyLabel(worldMarket, uiLanguage);
  const marketAiCtx = getMarketAiContext(worldMarket);
  const db = useMemo(
    () => getResolvedDatabase(customDbPatch, worldMarket),
    [customDbPatch, worldMarket]
  );

  const rivalStudioOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...(lastReleasedProject?.rivalReleases?.map((r) => r.studioName) || []),
          ...(yearlyRivalReleases?.map((r) => r.studioName) || []),
          ...db.competitor_studios.slice(0, 4).map((s) => s.name),
          ...marketAiCtx.fallbackRivalStudios,
        ])
      ).slice(0, 6),
    [
      lastReleasedProject?.rivalReleases,
      yearlyRivalReleases,
      db.competitor_studios,
      marketAiCtx.fallbackRivalStudios,
    ]
  );

  const [launchingCampaignId, setLaunchingCampaignId] = useState<string | null>(
    null
  );
  const [selectedRivalTargetState, setSelectedRivalTarget] = useState<string>('');
  const [prActiveTab, setPrActiveTab] = useState<'campaigns' | 'feed'>(
    'campaigns'
  );

  const selectedRivalTarget =
    selectedRivalTargetState && rivalStudioOptions.includes(selectedRivalTargetState)
      ? selectedRivalTargetState
      : rivalStudioOptions[0] ||
        marketAiCtx.fallbackRivalStudios[0] ||
        tr(uiLanguage, 'Rival Studio', 'استوديو منافس');

  const selectedRivalTargetDisplay = localizeEntityName(
    selectedRivalTarget,
    uiLanguage
  );

  const currentFestival = festivalModalQueue[0] || null;
  const currentNews = !currentFestival ? breakingNewsQueue[0] || null : null;

  const [revealedCategories, setRevealedCategories] = useState<
    Record<string, boolean>
  >({});

  // Auto-dismiss floating toast after 5.2 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 5200);
    return () => clearTimeout(timer);
  }, [activeToast, dismissToast]);

  const toggleRevealCategory = (categoryName: string) => {
    if (!currentFestival) return;
    const key = `${currentFestival.id}_${categoryName}`;
    setRevealedCategories((prev) => ({
      ...prev,
      [key]: true,
    }));
  };

  const revealAllCategories = () => {
    if (!currentFestival) return;
    const updates: Record<string, boolean> = {};
    for (const aw of currentFestival.awards) {
      updates[`${currentFestival.id}_${aw.category}`] = true;
    }
    setRevealedCategories((prev) => ({ ...prev, ...updates }));
  };

  const dismissAllNews = () => {
    const count = breakingNewsQueue.length;
    for (let i = 0; i < count; i++) {
      dismissBreakingNewsModal();
    }
  };

  const allRevealed = currentFestival
    ? currentFestival.awards.every(
        (aw) => revealedCategories[`${currentFestival.id}_${aw.category}`]
      )
    : false;

  const playerWonCountInCurrentCeremony = currentFestival
    ? currentFestival.awards.filter((aw) => aw.isPlayerWinner).length
    : 0;

  return (
    <>
      {/* SLEEK FLOATING NOTIFICATION TOAST (Positioned cleanly below the Navbar) */}
      <AnimatePresence>
        {activeToast && (
          <div className="pointer-events-none fixed top-17 right-0 left-0 z-50 flex justify-center px-3">
            <motion.div
              key={activeToast.id}
              initial={{ opacity: 0, y: -20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 430, damping: 28 }}
              className={`pointer-events-auto relative flex w-full max-w-md items-start justify-between gap-3 overflow-hidden rounded-2xl border-2 px-4 py-3 shadow-2xl backdrop-blur-xl ${
                activeToast.type === 'warning'
                  ? 'border-[#D91624] bg-[#F9F6F0] text-[#1A2530]'
                  : activeToast.type === 'success'
                  ? 'border-[#15803D] bg-[#F9F6F0] text-[#1A2530]'
                  : 'border-[#D4AF37] bg-[#F9F6F0] text-[#1A2530]'
              }`}
              dir={uiDir}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                    activeToast.type === 'warning'
                      ? 'bg-[#D91624] text-white'
                      : activeToast.type === 'success'
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#1A2530] text-[#D4AF37] border border-[#D4AF37]'
                  }`}
                >
                  {activeToast.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : activeToast.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black leading-snug text-[#1A2530]">
                    {activeToast.message}
                  </p>
                  {activeToast.subtext && (
                    <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-[#1A2530]/75">
                      {activeToast.subtext}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={dismissToast}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1A2530]/10 text-[#1A2530] transition hover:bg-[#1A2530]/20"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Animated auto-dismiss progress bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5.2, ease: 'linear' }}
                className={`absolute right-0 bottom-0 h-[3px] ${
                  activeToast.type === 'warning'
                    ? 'bg-[#D91624]'
                    : activeToast.type === 'success'
                    ? 'bg-[#15803D]'
                    : 'bg-[#D4AF37]'
                }`}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL OVERLAY FOR ANNUAL AWARDS GALA, EDITORIAL BREAKING NEWS, PR WAR ROOM, OR BANKRUPTCY LIQUIDATION */}
      <AnimatePresence>
        {(isBankruptLiquidated || currentFestival || currentNews || isPrWarRoomOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3.5 backdrop-blur-md overscroll-contain select-none"
            dir={uiDir}
          >
            {/* 0. MANDATORY BANKRUPTCY & STUDIO LIQUIDATION MODAL */}
            {isBankruptLiquidated && (
              <motion.div
                key="bankruptcy_liquidation_modal"
                initial={{ scale: 0.92, y: 24, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.92, y: 24, opacity: 0 }}
                className="relative w-full max-w-lg rounded-3xl bg-[#F9F6F0] text-[#1A2530] border-4 border-[#D91624] shadow-[0_30px_90px_rgba(0,0,0,0.85)] overflow-hidden p-5 sm:p-6 space-y-4"
              >
                <div className="rounded-2xl bg-[#D91624] text-[#F9F6F0] p-4 border-2 border-[#D4AF37] text-center space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#1A2530] text-[#D4AF37] text-xs font-extrabold border border-[#D4AF37]">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>
                      {tr(
                        uiLanguage,
                        '3-Month Legal Grace Period Expired · Receivership Order',
                        'انتهاء مهلة السداد القانونية (3 أشهر) · قرار الحراسة القضائية'
                      )}
                    </span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl text-white">
                    {tr(
                      uiLanguage,
                      `Bankruptcy & Liquidation of "${studioName}"!`,
                      `إعلان إفلاس وتصفية «${studioName}»!`
                    )}
                  </h2>
                  <p className="text-xs font-bold text-[#F9F6F0]/90">
                    {tr(uiLanguage, 'Current Date:', 'التاريخ الحالي:')}{' '}
                    {formatGameDate(gameDay, currentYear, uiLanguage)} ·{' '}
                    {tr(uiLanguage, 'Treasury Deficit:', 'عجز الخزينة:')}{' '}
                    <span dir="ltr" className="font-typewriter font-black text-[#FFF3B0]">
                      {formatMoney(cash)} {currencyLabel}
                    </span>
                  </p>
                </div>

                <div className="rounded-2xl bg-white border-2 border-[#1A2530]/15 p-4 text-xs font-bold leading-relaxed text-[#1A2530] space-y-2">
                  <p>
                    {isEn ? (
                      <>
                        The three-month grace period to cover your studio’s treasury debt has expired. Creditor banks and the guild have placed <strong>&ldquo;{studioName}&rdquo;</strong> under receivership and put its assets up for sale.
                      </>
                    ) : (
                      <>
                        انتهت مهلة الشهور الثلاثة الممنوحة لسداد ديون الخزينة دون تغطية العجز المالي، وأصدرت النقابة والبنوك الدائنة قراراً بالحجز على أصول شركة <strong>«{studioName}»</strong> وعرضها للبيع للمستثمرين.
                      </>
                    )}
                  </p>
                  <p className="text-[#D91624] font-extrabold">
                    {tr(
                      uiLanguage,
                      'What happens if you liquidate now?',
                      'ماذا سيحدث إذا بعت الشركة الآن؟'
                    )}
                  </p>
                  <ul className={`list-disc ${isEn ? 'pl-5' : 'pr-5'} space-y-1 text-[11px]`}>
                    <li>
                      {isEn ? (
                        <>
                          You will step away from <strong>&ldquo;{studioName}&rdquo;</strong> as an investor group acquires it and operates it as a market rival.
                        </>
                      ) : (
                        <>
                          ستضطر لترك <strong>«{studioName}»</strong> وبيعها لمجموعة استثمارية تديرها كمنافس في السوق.
                        </>
                      )}
                    </li>
                    <li>
                      {isEn ? (
                        <>
                          You will immediately found a brand-new studio with fresh capital (75M {currencyLabel}) <strong>in the same living world &amp; timeline ({formatGameDate(gameDay, currentYear, uiLanguage)})</strong> with all evolved stars and rivals intact!
                        </>
                      ) : (
                        <>
                          ستبدأ فوراً بتأسيس شركة إنتاج جديدة برأس مال جديد (75M {currencyLabel}) <strong>في نفس العالم ونفس الزمن ({formatGameDate(gameDay, currentYear, uiLanguage)})</strong> مع استمرار نفس النجوم وتطورهم ونفس الشركات المنافسة!
                        </>
                      )}
                    </li>
                  </ul>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
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
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-black text-xs sm:text-sm border-2 border-[#1A2530] shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>
                      {tr(
                        uiLanguage,
                        `Last-Minute Lifeline: Emergency Investor Bailout (+${formatMoney(
                          cash < 0 ? Math.abs(cash) + 15_000_000 : 15_000_000
                        )} ${currencyLabel}) — Watch Ad`,
                        `طوق نجاة اللحظة الأخيرة: تمويل إنقاذ مستثمر (+${formatMoney(
                          cash < 0 ? Math.abs(cash) + 15_000_000 : 15_000_000
                        )} ${currencyLabel}) — مشاهدة إعلان`
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={liquidateAndStartNewStudioInSameWorld}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#1A2530] hover:bg-[#D91624] text-[#F9F6F0] font-display text-sm sm:text-base border-2 border-[#D4AF37] shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-[#D4AF37]" />
                    <span>
                      {tr(
                        uiLanguage,
                        `Liquidate "${studioName}" & Launch a New Studio (${currentYear})`,
                        `بيع وتصفية «${studioName}» وتأسيس شركة جديدة في نفس العالم (${currentYear})`
                      )}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* 1. ANNUAL FESTIVAL & AWARDS CEREMONY MODAL — MOBILE-FIRST LUXURY EDITION */}
            {!isBankruptLiquidated && currentFestival && (
              <motion.div
                key={currentFestival.id}
                initial={{ scale: 0.94, y: 18, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.94, y: 18, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="glass-modal relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl shadow-2xl"
              >
                {/* Compact Velvet & Gold Header */}
                <div className="shrink-0 border-b-2 border-[#D4AF37] bg-[#1A2530] px-4 py-3.5 text-[#F9F6F0]">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FDE68A] to-[#D4AF37] text-[#1A2530] shadow">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-[#D4AF37]">
                          <Sparkles className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {currentFestival.festivalBuzz ||
                              tr(
                                uiLanguage,
                                `Year-End Gala (${currentFestival.year})`,
                                `حفل نهاية العام (${currentFestival.year})`
                              )}
                          </span>
                        </div>
                        <h2 className="mt-0.5 font-display text-base font-black leading-tight text-white truncate">
                          {localizeEntityName(currentFestival.festivalName, uiLanguage)}
                        </h2>
                      </div>
                    </div>

                    {!allRevealed ? (
                      <button
                        type="button"
                        onClick={revealAllCategories}
                        className="shrink-0 min-h-[38px] rounded-xl border border-[#D4AF37] bg-[#D91624] px-3 py-1.5 text-[11px] font-black text-white hover:brightness-110 cursor-pointer"
                      >
                        {tr(uiLanguage, 'Open All', 'فتح الكل')}
                      </button>
                    ) : (
                      <span
                        className={`shrink-0 rounded-xl px-2.5 py-1 font-mono text-xs font-black tabular-nums ${
                          playerWonCountInCurrentCeremony > 0
                            ? 'bg-[#15803D] text-white'
                            : 'bg-white/15 text-[#FDE68A]'
                        }`}
                      >
                        {playerWonCountInCurrentCeremony}/{currentFestival.awards.length} 🏆
                      </span>
                    )}
                  </div>
                </div>

                {/* Scrollable Body — Clean & Scannable Category Cards */}
                <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y bg-[#F9F6F0] p-3.5 space-y-2.5">
                  {/* Concise Jury Statement */}
                  <div className="rounded-2xl border border-[#D4AF37]/60 bg-[#FFF9E6] px-3 py-2.5 flex items-start gap-2">
                    <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D91624]" />
                    <p className="text-[11px] font-bold leading-relaxed text-[#1A2530]/85">
                      {currentFestival.juryStatement}
                    </p>
                  </div>

                  {/* Compact Envelope Cards */}
                  <div className="space-y-2">
                    {currentFestival.awards.map((aw) => {
                      const isRevealed =
                        !!revealedCategories[`${currentFestival.id}_${aw.category}`];
                      const locCategory = localizeEntityName(aw.category, uiLanguage);
                      const locWinner = localizeEntityName(aw.winner, uiLanguage);
                      const locWinningStudio = localizeEntityName(
                        aw.winningStudioName,
                        uiLanguage
                      );
                      return (
                        <div
                          key={aw.category}
                          className={`rounded-2xl border-2 p-3 transition-all ${
                            isRevealed && aw.isPlayerWinner
                              ? 'border-[#D4AF37] bg-[#FFF9E6] shadow-sm'
                              : isRevealed
                              ? 'border-[#1A2530]/12 bg-white'
                              : 'border-[#1A2530]/15 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                  isRevealed && aw.isPlayerWinner
                                    ? 'bg-[#D4AF37] text-[#1A2530]'
                                    : 'bg-[#1A2530]/10 text-[#1A2530]'
                                }`}
                              >
                                {isRevealed && aw.isPlayerWinner ? (
                                  <Trophy className="h-4 w-4" />
                                ) : (
                                  <Award className="h-4 w-4" />
                                )}
                              </div>
                              <h3 className="font-display text-xs sm:text-sm font-black text-[#1A2530] truncate">
                                {locCategory}
                              </h3>
                            </div>

                            {!isRevealed ? (
                              <button
                                type="button"
                                onClick={() => toggleRevealCategory(aw.category)}
                                className="min-h-[36px] shrink-0 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#FDE68A] border border-[#1A2530]/20 px-3 py-1 text-[11px] font-black text-[#1A2530] shadow-2xs hover:brightness-105 cursor-pointer"
                              >
                                <Sparkles className="h-3 w-3" />
                                <span>{tr(uiLanguage, 'Unseal', 'فض المظروف')}</span>
                              </button>
                            ) : (
                              <span
                                className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-black ${
                                  aw.isPlayerWinner
                                    ? 'bg-[#15803D] text-white'
                                    : aw.playerNominated
                                    ? 'bg-amber-100 text-[#92400E] border border-amber-300'
                                    : 'bg-[#1A2530]/10 text-[#1A2530]/70'
                                }`}
                              >
                                {aw.isPlayerWinner
                                  ? tr(uiLanguage, 'YOU WON 🏆', 'فزت بالجائزة 🏆')
                                  : aw.playerNominated
                                  ? tr(uiLanguage, 'Runner-Up', 'ترشّحت وخسرت')
                                  : tr(uiLanguage, 'Rival Won', 'فاز المنافس')}
                              </span>
                            )}
                          </div>

                          {/* Pre-Reveal Nominees Preview vs Post-Reveal Winner Verdict */}
                          {!isRevealed ? (
                            <p className="mt-1.5 text-[10px] font-bold text-[#1A2530]/65 leading-snug">
                              {tr(uiLanguage, 'Nominees:', 'المرشحون:')}{' '}
                              {aw.nominees
                                .map((n) => localizeEntityName(n, uiLanguage))
                                .join(' · ')}
                            </p>
                          ) : (
                            <div className="mt-2 rounded-xl bg-[#F9F6F0] border border-[#1A2530]/10 px-2.5 py-2 space-y-1">
                              <div className="flex items-center justify-between gap-2 text-xs font-black text-[#1A2530]">
                                <span className="truncate">
                                  🏆 {locWinner}
                                </span>
                                <span className="shrink-0 text-[10px] font-extrabold text-[#D91624] truncate max-w-[44%]">
                                  {locWinningStudio}
                                </span>
                              </div>
                              {aw.marginNote && (
                                <div className="text-[10px] font-bold text-[#1A2530]/65">
                                  {aw.marginNote}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Fixed Clean Footer Action */}
                <div className="shrink-0 flex items-center justify-between gap-2 border-t-2 border-[#D4AF37]/40 bg-white px-4 py-3">
                  <span className="text-[11px] font-bold text-[#1A2530]/65 truncate">
                    {festivalModalQueue.length > 1
                      ? tr(
                          uiLanguage,
                          `${festivalModalQueue.length - 1} more gala next`,
                          `متبقي ${festivalModalQueue.length - 1} حفل آخر`
                        )
                      : tr(uiLanguage, `${currentFestival.year} Finale`, `ختام ${currentFestival.year}`)}
                  </span>

                  {!allRevealed ? (
                    <button
                      type="button"
                      onClick={revealAllCategories}
                      className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border-2 border-[#1A2530] bg-gradient-to-r from-[#D4AF37] to-[#FDE68A] px-4 py-2 text-xs font-black text-[#1A2530] shadow cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{tr(uiLanguage, 'Reveal All Winners', 'إعلان كل الفائزين')}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={dismissFestivalCeremonyModal}
                      className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border-2 border-[#D4AF37] bg-[#D91624] px-5 py-2 text-xs font-black text-white shadow hover:brightness-110 cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>
                        {festivalModalQueue.length > 1
                          ? tr(uiLanguage, 'Next Festival', 'المهرجان التالي')
                          : tr(uiLanguage, 'Accept Trophies & Continue', 'اعتماد الجوائز ومواصلة العمل')}
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* 2. LUXURY EDITORIAL BREAKING NEWS CARD */}
            {!isBankruptLiquidated && currentNews && (
              <motion.div
                key={currentNews.id}
                initial={{ scale: 0.92, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.92, y: 20, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="glass-modal relative max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain touch-pan-y rounded-3xl shadow-2xl"
              >
                {/* Editorial Magazine Header Ribbon */}
                <div
                  className={`relative overflow-hidden border-b-2 border-[#D4AF37] px-5 py-3.5 text-[#F9F6F0] ${
                    currentNews.category === 'rising_talent'
                      ? 'bg-[#15803D]'
                      : currentNews.category === 'new_studio'
                      ? 'bg-[#1A2530]'
                      : currentNews.category === 'actor_deceased' ||
                        currentNews.category === 'actor_retired'
                      ? 'bg-[#0F171E]'
                      : 'bg-[#1A2530]'
                  }`}
                >
                  <div className="pointer-events-none absolute -top-10 -left-10 h-28 w-28 rounded-full bg-[#D4AF37]/15 blur-xl" />
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs">
                        <Radio className="h-4 w-4 animate-pulse text-[#D4AF37]" />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-xs font-black tracking-wide text-[#F9F6F0]">
                          {currentNews.badgeLabel}
                        </span>
                        <span className="block text-[10px] font-bold text-[#F9F6F0]/80">
                          {formatGameDate(currentNews.day, currentNews.year, uiLanguage)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {breakingNewsQueue.length > 1 && (
                        <button
                          type="button"
                          onClick={dismissAllNews}
                          className="rounded-lg bg-white/15 px-2 py-1 text-[10px] font-black text-white transition hover:bg-white/25"
                        >
                          {tr(
                            uiLanguage,
                            `Skip All (${breakingNewsQueue.length})`,
                            `تخطي الكل (${breakingNewsQueue.length})`
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={dismissBreakingNewsModal}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editorial Body */}
                <div className="space-y-4 bg-[#F9F6F0] p-5">
                  {/* Featured Subject Pill */}
                  {currentNews.highlightName && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#D4AF37]/60 bg-white p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${
                            currentNews.category === 'rising_talent'
                              ? 'bg-[#15803D]'
                              : currentNews.category === 'new_studio'
                              ? 'bg-[#1A2530] border border-[#D4AF37]'
                              : 'bg-[#D91624]'
                          }`}
                        >
                          {currentNews.category === 'rising_talent' && (
                            <Star className="h-5 w-5 text-[#D4AF37]" />
                          )}
                          {currentNews.category === 'new_studio' && (
                            <Building2 className="h-5 w-5 text-[#D4AF37]" />
                          )}
                          {currentNews.category !== 'rising_talent' &&
                            currentNews.category !== 'new_studio' && (
                              <Newspaper className="h-5 w-5" />
                            )}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[10px] font-bold text-[#1A2530]/60">
                            {tr(uiLanguage, 'Press Spotlight', 'محور التغطية الصحفية')}
                          </span>
                          <span className="block font-display text-sm font-black leading-snug text-[#1A2530]">
                            {localizeEntityName(currentNews.highlightName, uiLanguage)}
                          </span>
                        </div>
                      </div>

                      {currentNews.extraStatBadge && (
                        <span className="shrink-0 rounded-xl border border-[#D4AF37] bg-[#FFF9E6] px-2.5 py-1 font-mono text-[10px] font-black text-[#1A2530]">
                          {currentNews.extraStatBadge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Headline & Story Lead */}
                  <div className="space-y-2">
                    <h3 className="font-display text-base font-black leading-snug text-[#1A2530] sm:text-lg">
                      {currentNews.headline}
                    </h3>
                    <div className="rounded-2xl border border-[#1A2530]/15 bg-white p-3.5">
                      <p className="text-xs font-bold leading-relaxed text-[#1A2530]/80">
                        {currentNews.detail}
                      </p>
                    </div>
                  </div>

                  {/* Market Impact Bar */}
                  {currentNews.gameImpactLabel && (
                    <div className="flex items-center gap-2 rounded-2xl border border-[#D4AF37] bg-[#FFF9E6] px-3.5 py-2.5 text-[11px] font-black text-[#1A2530]">
                      <TrendingUp className="h-4 w-4 shrink-0 text-[#D91624]" />
                      <span>{currentNews.gameImpactLabel}</span>
                    </div>
                  )}

                  {/* Contextual AI Media Response (Only triggered for controversy/rival clash) */}
                  {(() => {
                    const textBlob = `${currentNews.headline} ${currentNews.detail} ${currentNews.extraStatBadge || ''}`;
                    const isControversialOrNegative =
                      /refus|declin|reject|crisis|clash|feud|attack|rival|leak|walkout|controversy|backlash|scandal|rumor|drop|slump|رفض|أزمة|خلاف|هجوم|تحدي|منافس|تسريب|انسحاب|اعتذار|جدل|انتقاد|تراجع|كارثة|سخرية|إشاعة|-/i.test(
                        textBlob
                      );
                    const warrantsMediaResponse =
                      currentNews.category === 'rival_project' ||
                      currentNews.category === 'new_studio' ||
                      (currentNews.category === 'production_news' &&
                        isControversialOrNegative) ||
                      (currentNews.category === 'contract_reply' &&
                        isControversialOrNegative);

                    if (!warrantsMediaResponse) {
                      return (
                        <button
                          type="button"
                          onClick={dismissBreakingNewsModal}
                          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1A2530] hover:bg-[#1A2530]/90 border-2 border-[#D4AF37] px-5 py-2.5 text-xs font-black text-[#F9F6F0] shadow-md transition cursor-pointer"
                        >
                          <Check className="h-4 w-4 text-[#D4AF37]" />
                          <span>
                            {tr(uiLanguage, 'Continue Managing Studio', 'متابعة إدارة الاستوديو')}
                          </span>
                        </button>
                      );
                    }

                    return (
                      <div className="space-y-2.5 rounded-2xl border-2 border-[#D4AF37] bg-[#F9F6F0] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#D91624]">
                            <Megaphone className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {tr(
                                uiLanguage,
                                'Flashpoint requiring PR Desk action',
                                'موقف ساخن يستدعي تحركاً من المكتب الإعلامي'
                              )}
                            </span>
                          </span>
                          <span className="rounded-lg bg-[#1A2530] px-2 py-0.5 font-typewriter text-[10px] font-bold text-[#D4AF37] shrink-0" dir="ltr">
                            2.0M {currencyLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={launchingCampaignId !== null}
                            onClick={async () => {
                              setLaunchingCampaignId('contextual_ai_defense');
                              playSocialNotifPop();
                              const ok = await launchSocialPrCampaign(
                                'support_film_trolls',
                                currentNews.highlightName,
                                {
                                  headline: currentNews.headline,
                                  detail: currentNews.detail,
                                  customAngle: tr(
                                    uiLanguage,
                                    'Decisive official press statement from the studio that flips the narrative in our favor and ignites fan excitement',
                                    'بيان صحفي رسمي حاسم من الاستوديو يقلب الموقف لصالحنا ويشعل حماس الجمهور'
                                  ),
                                }
                              );
                              if (ok) playCashRegisterChaChing();
                              setLaunchingCampaignId(null);
                              dismissBreakingNewsModal();
                            }}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#15803D] hover:brightness-110 px-3 py-2 text-[11px] font-black text-white border border-[#D4AF37] shadow transition cursor-pointer disabled:opacity-50"
                          >
                            {launchingCampaignId === 'contextual_ai_defense' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                            )}
                            <span>
                              {tr(uiLanguage, 'Issue Decisive Press Statement', 'إصدار بيان صحفي حاسم للصحافة')}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={launchingCampaignId !== null}
                            onClick={() => {
                              dismissBreakingNewsModal();
                              setPrWarRoomOpen(true);
                            }}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#D91624] hover:brightness-110 px-3 py-2 text-[11px] font-black text-white border border-[#D4AF37] shadow transition cursor-pointer"
                          >
                            <Flame className="h-3.5 w-3.5 text-[#D4AF37]" />
                            <span>
                              {tr(uiLanguage, 'Open PR War Room', 'فتح غرفة اللجان والهجوم المضاد')}
                            </span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={dismissBreakingNewsModal}
                          className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-[#1A2530] hover:bg-[#1A2530]/90 px-4 py-2 text-xs font-black text-[#F9F6F0] transition cursor-pointer"
                        >
                          <Check className="h-4 w-4 text-[#D4AF37]" />
                          <span>
                            {tr(uiLanguage, 'Ignore & Continue', 'تجاهل الموقف ومتابعة العمل')}
                          </span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            {/* 3. ELECTRONIC COMMITTEES & TREND WAR ROOM */}
            {!isBankruptLiquidated &&
              !currentFestival &&
              !currentNews &&
              isPrWarRoomOpen &&
              (() => {
                const combinedFeed = [
                  ...(socialFeedLog || []),
                  {
                    id: 'default_chatter_1',
                    platform: 'X' as const,
                    authorName: tr(uiLanguage, 'Independent Film Critic', 'ناقد سينمائي مستقل'),
                    handle: marketAiCtx.socialHandles[0],
                    content: tr(
                      uiLanguage,
                      `Audiences are closely watching "${studioName}"’s next move head-to-head against "${selectedRivalTargetDisplay}" this season!`,
                      `الجمهور مترقب بشدة خطوة شركة «${studioName}» القادمة أمام أفلام «${selectedRivalTargetDisplay}» هذا الموسم!`
                    ),
                    hashtag: tr(uiLanguage, '#BoxOfficeRace', '#سباق_الإيرادات'),
                    likes: '18.4K',
                    shares: '4.2K',
                    sentiment: 'viral_boost' as const,
                    timestampLabel: tr(uiLanguage, '1m ago', 'منذ دقيقة'),
                  },
                  {
                    id: 'default_chatter_2',
                    platform: 'TikTok' as const,
                    authorName: tr(uiLanguage, 'Cinema Trends Live', 'تريندات الشارع'),
                    handle: marketAiCtx.socialHandles[2],
                    content: tr(
                      uiLanguage,
                      'An all-out showdown at the box office… who is taking the #1 crown this weekend?',
                      'منافسة تكسير عظام على شباك التذاكر.. يا ترى من سيحسم الصدارة هذا الأسبوع؟'
                    ),
                    hashtag: tr(uiLanguage, '#BoxOffice', '#شباك_التذاكر'),
                    likes: '42.1K',
                    shares: '9.8K',
                    sentiment: 'rival_attack' as const,
                    timestampLabel: tr(uiLanguage, '3m ago', 'منذ 3 دقائق'),
                  },
                ];

                const latestPost = combinedFeed[0];
                const extraCampaigns = SOCIAL_PR_CAMPAIGNS.filter(
                  (c: SocialPrCampaignItem) =>
                    c.id !== 'support_film_trolls' &&
                    c.id !== 'rival_rumor_trolls'
                ).slice(0, 2);

                const runCampaignAndFocusFeed = async (
                  campaignId: SocialPrCampaignItem['id'],
                  targetStudio?: string
                ) => {
                  setLaunchingCampaignId(campaignId);
                  playSocialNotifPop();
                  const ok = await launchSocialPrCampaign(
                    campaignId,
                    targetStudio
                  );
                  if (ok) {
                    playCashRegisterChaChing();
                    setPrActiveTab('feed');
                  }
                  setLaunchingCampaignId(null);
                };

                return (
                  <motion.div
                    key="pr_war_room_smartphone"
                    initial={{ scale: 0.94, y: 24, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.94, y: 24, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className="relative w-full max-w-md rounded-[28px] sm:rounded-[34px] border-3 sm:border-4 border-[#D4AF37] bg-[#F9F6F0] text-[#1A2530] shadow-[0_28px_80px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col max-h-[89dvh] touch-pan-y"
                  >
                    {/* Compact Luxury App Header */}
                    <div className="bg-gradient-to-l from-[#1A2530] via-[#22313F] to-[#1A2530] text-[#F9F6F0] px-4 pt-3.5 pb-3 border-b-2 border-[#D4AF37] shrink-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#D91624] flex items-center justify-center border border-[#D4AF37] shrink-0 shadow">
                            <Smartphone className="w-5 h-5 text-[#D4AF37]" />
                          </div>
                          <div className="min-w-0">
                            <h2 className="font-display text-base sm:text-lg text-[#F9F6F0] leading-tight truncate">
                              {tr(uiLanguage, 'PR & Viral Trend War Room', 'اللجان الإلكترونية والتريند')}
                            </h2>
                            <p className="text-[11px] font-bold text-[#D4AF37] truncate">
                              {tr(
                                uiLanguage,
                                'Emperor’s Phone · Public Opinion HQ',
                                'موبايل الإمبراطور · غرفة إدارة الرأي العام'
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPrWarRoomOpen(false)}
                          aria-label={tr(uiLanguage, 'Close PR War Room', 'إغلاق غرفة اللجان')}
                          className="w-10 h-10 rounded-xl bg-[#F9F6F0]/10 hover:bg-[#D91624] text-white flex items-center justify-center border border-[#D4AF37]/40 transition cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Clean 2-KPI Status Strip */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="rounded-xl bg-[#0F171E]/60 border border-[#D4AF37]/35 px-3 py-2 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#F9F6F0]/75">
                            {tr(uiLanguage, 'Available Cash', 'السيولة المتاحة')}
                          </span>
                          <span
                            dir="ltr"
                            className="font-typewriter text-xs font-black text-[#D4AF37]"
                          >
                            {formatMoney(cash)}
                          </span>
                        </div>
                        <div className="rounded-xl bg-[#0F171E]/60 border border-[#D4AF37]/35 px-3 py-2">
                          <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                            <span className="text-[#F9F6F0]/75">
                              {tr(uiLanguage, 'Project Hype', 'ضجة العمل')}
                            </span>
                            <span className="font-typewriter font-black text-[#FFF3B0]">
                              {draft.hypeScore}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-l from-[#D4AF37] to-[#D91624] transition-all duration-300"
                              style={{
                                width: `${Math.min(100, Math.max(4, draft.hypeScore))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Segmented 2-Tab Navigation */}
                    <div className="grid grid-cols-2 gap-1.5 bg-[#EFE9DC] p-2 border-b border-[#1A2530]/15 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPrActiveTab('campaigns')}
                        className={`min-h-[44px] rounded-xl px-3 py-2 text-xs sm:text-sm font-display transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                          prActiveTab === 'campaigns'
                            ? 'bg-[#1A2530] text-[#D4AF37] border-[#D4AF37] shadow-sm'
                            : 'bg-white text-[#1A2530]/80 border-[#1A2530]/10 hover:text-[#1A2530]'
                        }`}
                      >
                        <Megaphone className="w-4 h-4 shrink-0" />
                        <span>{tr(uiLanguage, 'Launch Campaigns', 'إطلاق الحملات')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrActiveTab('feed')}
                        className={`min-h-[44px] rounded-xl px-3 py-2 text-xs sm:text-sm font-display transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                          prActiveTab === 'feed'
                            ? 'bg-[#1A2530] text-[#D4AF37] border-[#D4AF37] shadow-sm'
                            : 'bg-white text-[#1A2530]/80 border-[#1A2530]/10 hover:text-[#1A2530]'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <span>
                          {tr(
                            uiLanguage,
                            `Trend Radar (${combinedFeed.length})`,
                            `رادار التريند (${combinedFeed.length})`
                          )}
                        </span>
                      </button>
                    </div>

                    {/* TAB 1: LAUNCH CAMPAIGNS & ELECTRONIC COMMITTEES */}
                    {prActiveTab === 'campaigns' && (
                      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
                        {/* Rival Studio Target Selector */}
                        <div className="rounded-2xl bg-white border border-[#1A2530]/15 p-3">
                          <div className="flex items-center gap-1.5 text-[11px] font-black text-[#1A2530] mb-2">
                            <Target className="w-3.5 h-3.5 text-[#D91624]" />
                            <span>
                              {tr(
                                uiLanguage,
                                'Target Rival Studio for Counter-PR:',
                                'الشركة المنافسة المستهدفة بالحملات المضادة:'
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {rivalStudioOptions.map((stName) => {
                              const selected = selectedRivalTarget === stName;
                              return (
                                <button
                                  key={stName}
                                  type="button"
                                  onClick={() => setSelectedRivalTarget(stName)}
                                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition cursor-pointer border ${
                                    selected
                                      ? 'bg-[#D91624] text-white border-[#D4AF37] shadow-xs'
                                      : 'bg-[#F9F6F0] text-[#1A2530] border-[#1A2530]/15 hover:border-[#D4AF37]'
                                  }`}
                                >
                                  {localizeEntityName(stName, uiLanguage)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Primary Two Hero Actions */}
                        <div className="space-y-2.5">
                          <button
                            type="button"
                            disabled={launchingCampaignId !== null}
                            onClick={() =>
                              runCampaignAndFocusFeed('support_film_trolls')
                            }
                            className="w-full min-h-[58px] p-3.5 rounded-2xl bg-[#15803D] hover:brightness-110 text-white border-2 border-[#D4AF37] shadow-md transition flex items-center justify-between gap-3 text-start cursor-pointer disabled:opacity-55"
                          >
                            <div className="min-w-0">
                              <div className="font-display text-sm sm:text-base flex items-center gap-1.5">
                                {launchingCampaignId === 'support_film_trolls' ? (
                                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                ) : (
                                  <TrendingUp className="w-4 h-4 text-[#FFF3B0] shrink-0" />
                                )}
                                <span>
                                  {tr(
                                    uiLanguage,
                                    'Activate Fan Buzz Boost',
                                    'توجيه اللجان لدعم الفيلم'
                                  )}
                                </span>
                              </div>
                              <p className="text-[11px] font-bold text-white/85 mt-0.5">
                                {tr(
                                  uiLanguage,
                                  'Ignite fan hashtags and spike public hype immediately',
                                  'إشعال هاشتاجات الدعم ورفع الضجة الجماهيرية فوراً'
                                )}
                              </p>
                            </div>
                            <span
                              dir="ltr"
                              className="shrink-0 font-typewriter text-xs font-black bg-[#1A2530]/80 text-[#D4AF37] px-2.5 py-1.5 rounded-xl border border-[#D4AF37]/50"
                            >
                              2.0M {currencyLabel}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={launchingCampaignId !== null}
                            onClick={() => {
                              if (!progression.canUseRivalRumors) {
                                showToast(
                                  tr(
                                    uiLanguage,
                                    'Rival Rumor Wars unlock at Studio Level 3 (250M valuation + 1 festival award).',
                                    'حرب الإشاعات ضد المنافسين تُفتح في المستوى 3 (قيمة سوقية 250M + جائزة مهرجان واحدة).'
                                  ),
                                  'warning'
                                );
                                return;
                              }
                              runCampaignAndFocusFeed(
                                'rival_rumor_trolls',
                                selectedRivalTarget
                              );
                            }}
                            className={`w-full min-h-[58px] p-3.5 rounded-2xl text-white border-2 border-[#D4AF37] shadow-md transition flex items-center justify-between gap-3 text-start cursor-pointer disabled:opacity-55 ${
                              progression.canUseRivalRumors
                                ? 'bg-[#D91624] hover:brightness-110'
                                : 'bg-[#1A2530]/90 opacity-90'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-display text-sm sm:text-base flex items-center gap-1.5">
                                {launchingCampaignId === 'rival_rumor_trolls' ? (
                                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                ) : !progression.canUseRivalRumors ? (
                                  <Lock className="w-4 h-4 text-[#D4AF37] shrink-0" />
                                ) : (
                                  <Flame className="w-4 h-4 text-[#FFF3B0] shrink-0" />
                                )}
                                <span>
                                  {tr(
                                    uiLanguage,
                                    'Leak Rumor on Rival Film',
                                    'نشر إشاعة عن فيلم المنافس'
                                  )}
                                </span>
                              </div>
                              <p className="text-[11px] font-bold text-white/85 mt-0.5 truncate">
                                {!progression.canUseRivalRumors
                                  ? tr(
                                      uiLanguage,
                                      'Unlocks at Level 3 (250M market value + 1 festival award)',
                                      'تُفتح في المستوى 3 (قيمة 250M + جائزة مهرجان)'
                                    )
                                  : tr(
                                      uiLanguage,
                                      `Direct PR strike against "${selectedRivalTargetDisplay}" to erode box office`,
                                      `استهداف مباشر ضد «${selectedRivalTargetDisplay}» لتقليص إيراداته`
                                    )}
                              </p>
                            </div>
                            <span
                              dir="ltr"
                              className="shrink-0 font-typewriter text-xs font-black bg-[#1A2530]/80 text-[#D4AF37] px-2.5 py-1.5 rounded-xl border border-[#D4AF37]/50"
                            >
                              {progression.canUseRivalRumors
                                ? `5.0M ${currencyLabel}`
                                : tr(uiLanguage, '🔒 Lv.3', '🔒 م3')}
                            </span>
                          </button>
                        </div>

                        {/* Additional Tactical Campaigns */}
                        {extraCampaigns.length > 0 && (
                          <div className="grid grid-cols-2 gap-2.5">
                            {extraCampaigns.map((camp) => {
                              const campTitle = isEn
                                ? PR_CAMPAIGNS_EN[camp.id]?.title || camp.title
                                : camp.title;
                              return (
                                <button
                                  key={camp.id}
                                  type="button"
                                  disabled={launchingCampaignId !== null}
                                  onClick={() =>
                                    runCampaignAndFocusFeed(
                                      camp.id,
                                      camp.type === 'attack_rival'
                                        ? selectedRivalTarget
                                        : undefined
                                    )
                                  }
                                  className="min-h-[68px] p-3 rounded-2xl bg-[#1A2530] text-[#F9F6F0] hover:bg-[#22313F] border border-[#D4AF37]/75 text-start flex flex-col justify-between gap-1.5 transition cursor-pointer disabled:opacity-55"
                                >
                                  <div className="text-xs font-extrabold leading-snug line-clamp-2">
                                    {launchingCampaignId === camp.id
                                      ? tr(uiLanguage, 'Launching...', 'جاري التنفيذ...')
                                      : campTitle}
                                  </div>
                                  <div
                                    dir="ltr"
                                    className="font-typewriter text-[11px] font-black text-[#D4AF37]"
                                  >
                                    {formatMoney(camp.cost)} {currencyLabel}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Latest Trend Pulse Mini Preview */}
                        {latestPost && (
                          <button
                            type="button"
                            onClick={() => setPrActiveTab('feed')}
                            className="w-full rounded-2xl bg-[#1A2530] text-[#F9F6F0] p-3 border border-[#D4AF37]/45 text-start hover:border-[#D4AF37] transition cursor-pointer"
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-[#D4AF37] mb-1">
                              <span>
                                {tr(
                                  uiLanguage,
                                  `Latest Trending Post (${latestPost.platform})`,
                                  `آخر منشور متداول الآن (${latestPost.platform})`
                                )}
                              </span>
                              <span>
                                {tr(uiLanguage, 'View All Posts →', 'عرض كل التعليقات ←')}
                              </span>
                            </div>
                            <p className="text-xs font-bold leading-relaxed text-[#F9F6F0]/90 line-clamp-2">
                              {tr(uiLanguage, `"${latestPost.content}"`, `«${latestPost.content}»`)}
                            </p>
                          </button>
                        )}
                      </div>
                    )}

                    {/* TAB 2: LIVE X & TIKTOK TREND RADAR */}
                    {prActiveTab === 'feed' && (
                      <div className="flex-1 flex flex-col min-h-0 bg-[#141D26] text-[#F9F6F0]">
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                          {combinedFeed.slice(0, 10).map((post, idx) => (
                            <motion.div
                              key={post.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(idx * 0.04, 0.25) }}
                              className={`rounded-2xl p-3.5 border ${
                                post.sentiment === 'viral_boost'
                                  ? 'bg-[#15803D]/18 border-[#15803D]/70'
                                  : 'bg-[#D91624]/18 border-[#D91624]/70'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 text-[10px] mb-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="px-1.5 py-0.5 rounded bg-[#D4AF37] text-[#1A2530] font-typewriter font-black shrink-0">
                                    {post.platform}
                                  </span>
                                  <span className="font-extrabold text-white truncate">
                                    {post.authorName}
                                  </span>
                                  <span
                                    dir="ltr"
                                    className="text-white/55 font-typewriter truncate hidden sm:inline"
                                  >
                                    {post.handle}
                                  </span>
                                </div>
                                <span className="text-[#D4AF37] font-bold shrink-0">
                                  {post.timestampLabel}
                                </span>
                              </div>

                              <p className="text-xs font-bold leading-relaxed text-[#F9F6F0]">
                                {post.content}
                              </p>

                              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-bold">
                                <span className="text-[#D4AF37] truncate">
                                  {post.hashtag}
                                </span>
                                <div className="flex items-center gap-3 font-typewriter text-white/80 shrink-0">
                                  <span className="inline-flex items-center gap-1">
                                    <Heart className="w-3 h-3 text-[#D91624]" />
                                    {post.likes}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Share2 className="w-3 h-3 text-[#D4AF37]" />
                                    {post.shares}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        <div className="p-3 bg-[#1A2530] border-t border-[#D4AF37]/40 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPrActiveTab('campaigns')}
                            className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-display text-sm shadow flex items-center justify-center gap-2 cursor-pointer hover:brightness-105 transition"
                          >
                            <Megaphone className="w-4 h-4" />
                            <span>
                              {tr(uiLanguage, 'Launch New Trend Campaign', 'إطلاق حملة تريند جديدة الآن')}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })()}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
export default WorldPopupsOverlay;
