'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  formatGameDate,
  getDaysRemainingUntilAnnualAwards,
} from '@/lib/store';
import { GENRES } from '@/lib/db-resolver';
import {
  MarketRegion,
  MARKET_CONFIGS,
  formatMoney,
} from '@/lib/game-engine';
import { StudioLogoSvg } from './StudioLogoSvg';
import { LeaderboardAndSettingsView } from './LeaderboardAndSettingsView';
import { AnimatedStudioLotGraphic } from './CinematicGraphicsScene';
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
  Play,
  Flame,
  Crown,
  Settings,
} from 'lucide-react';

export function StudioHubView({
  onOpenSettings,
}: {
  onOpenSettings?: () => void;
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
    worldHistory,
    unlockMarketRegionWithCash,
    toggleDraftDistributionMarket,
    resetDraftForNewProject,
    setActiveScreen,
    setChildModalOpen,
    showToast,
  } = useGameStore();

  const [activeSheet, setActiveSheet] = useState<
    null | 'markets' | 'archive' | 'history' | 'leaderboard'
  >(null);
  const [modalPage, setModalPage] = useState(0);

  useEffect(() => {
    setChildModalOpen(Boolean(activeSheet));
    return () => setChildModalOpen(false);
  }, [activeSheet, setChildModalOpen]);

  const totalAwards = releasedProjects.reduce(
    (sum, p) => sum + p.awardsWon.length,
    0
  );
  const lifetimeBoxOffice = releasedProjects.reduce(
    (sum, p) => sum + p.totalGrossRevenue,
    0
  );
  const currentYearProjectsCount = releasedProjects.filter(
    (p) => p.year === currentYear
  ).length;
  const daysUntilAnnualAwards = getDaysRemainingUntilAnnualAwards(gameDay);

  const studioRankTitle =
    marketValue >= 1_000_000_000
      ? 'إمبراطور السينما الملياردير'
      : marketValue >= 550_000_000
      ? 'عملاق الإنتاج الدولي'
      : marketValue >= 260_000_000
      ? 'قطب الإنتاج الإقليمي'
      : 'منتج سينمائي صاعد';

  const hasActiveProject = Boolean(draft.title.trim());
  const offerList = Object.values(draft.talentOffers || {});
  const pendingOffersCount = offerList.filter(
    (n) => n.status === 'pending'
  ).length;
  const awaitingChoiceCount = offerList.filter(
    (n) => n.status === 'accepted_awaiting_choice'
  ).length;

  const activeDistMarkets: MarketRegion[] =
    Array.isArray(draft.selectedDistributionMarkets) &&
    draft.selectedDistributionMarkets.length > 0
      ? draft.selectedDistributionMarkets
      : ['egypt'];

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
    sheet: 'markets' | 'archive' | 'history' | 'leaderboard'
  ) => {
    setModalPage(0);
    setActiveSheet(sheet);
  };

  // Pagination helpers for modals so there is never long vertical scrolling
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

  return (
    <div className="mx-auto max-w-xl space-y-3 py-1">
      <div
        className={
          activeSheet
            ? 'pointer-events-none select-none space-y-3 opacity-35 transition-opacity'
            : 'space-y-3'
        }
      >
      {/* Unified Compact Command Card (Studio Identity + 2.5D Lot + Dual Treasury + Primary Play CTA) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-4 shadow-[0_18px_42px_-12px_rgba(99,102,241,0.18)] sm:p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="shrink-0 rounded-2xl border-2 border-indigo-100 bg-white p-2 shadow-md shadow-indigo-500/10"
            >
              <StudioLogoSvg config={logo} size={58} />
            </motion.div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700">
                  <Crown className="h-3 w-3 text-amber-500" />
                  <span>{studioRankTitle}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-black text-cyan-800">
                  <Sparkles className="h-3 w-3" />
                  <span>{formatGameDate(gameDay, currentYear)}</span>
                </span>
              </div>

              <h1 className="font-display mt-1 text-xl font-black leading-snug text-slate-900 sm:text-2xl">
                {studioName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600">
                <span>
                  المدير: <strong className="text-indigo-700">{ceoName}</strong>
                </span>
                <span className="text-violet-600">
                  ·{' '}
                  {founderPerk === 'visionary_director'
                    ? '★ مخرج عبقري (+10% جودة)'
                    : founderPerk === 'marketing_whale'
                    ? '★ حوت تسويق (+15% إيرادات)'
                    : '★ مفاوض شرس (-15% أجور)'}
                </span>
              </div>
            </div>
          </div>

          {/* Compact Reputation Badge */}
          <div className="hidden shrink-0 flex-col items-end rounded-2xl border border-indigo-100 bg-white/90 px-3 py-2 shadow-2xs sm:flex">
            <span className="text-[10px] font-black text-slate-500">
              السمعة الفنية
            </span>
            <span className="font-display text-base font-black text-violet-700 tabular-nums">
              {reputation}%
            </span>
          </div>
        </div>

        {/* Interactive Animated 2.5D Studio Lot Graphic */}
        <div className="mt-3">
          <AnimatedStudioLotGraphic
            studioName={studioName}
            hasActiveProject={hasActiveProject}
            activeProjectTitle={draft.title}
            isFilming={Boolean(
              draft.filmingStartDay !== null &&
                draft.filmingDaysElapsed < draft.filmingDurationDays
            )}
          />
        </div>

        {/* Dual Financial Separation Row inside Command Card */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 tabular-nums">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-white px-3.5 py-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-800">
                خزينة السيولة النقدية
              </span>
              <Wallet className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            </div>
            <div
              data-testid="hub-cash-value"
              className="font-display mt-0.5 flex items-baseline gap-1 text-base font-black text-emerald-700 whitespace-nowrap sm:text-lg"
            >
              <span dir="ltr" className="font-mono tabular-nums">
                {formatMoney(cash)}
              </span>
              <span className="text-[10px] font-bold">ج.م</span>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-white px-3.5 py-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-violet-800">
                القيمة السوقية للشركة
              </span>
              <TrendingUp className="h-3.5 w-3.5 shrink-0 text-violet-600" />
            </div>
            <div
              data-testid="hub-market-value"
              className="font-display mt-0.5 flex items-baseline gap-1 text-base font-black text-violet-700 whitespace-nowrap sm:text-lg"
            >
              <span dir="ltr" className="font-mono tabular-nums">
                {formatMoney(marketValue)}
              </span>
              <span className="text-[10px] font-bold">ج.م</span>
            </div>
          </div>
        </div>

        {/* Active Project Status Ribbon (if active) */}
        {hasActiveProject && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/90 px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-black text-amber-800">
                <Flame className="h-3.5 w-3.5 text-amber-600" />
                <span>مشروع جاري: «{draft.title}»</span>
              </div>
              <div className="text-[11px] font-bold leading-relaxed text-slate-600">
                {draft.filmingStartDay !== null &&
                draft.filmingDaysElapsed >= draft.filmingDurationDays
                  ? 'اكتمل التصوير وجاهز للعرض الجماهيري!'
                  : draft.filmingStartDay !== null
                  ? `جاري التصوير الفعلي (اليوم ${draft.filmingDaysElapsed}/${draft.filmingDurationDays})`
                  : awaitingChoiceCount > 0
                  ? `${awaitingChoiceCount} نجوم وافقوا وينتظرون حسمك النهائي!`
                  : pendingOffersCount > 0
                  ? `بانتظار رد ${pendingOffersCount} نجوم على العروض...`
                  : 'مرحلة التعاقدات وتجهيز الطاقم'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleResumeActiveProject}
              className="shrink-0 rounded-xl bg-amber-500 px-3 py-1.5 text-[11px] font-black text-white shadow-2xs hover:bg-amber-600"
            >
              استئناف
            </button>
          </div>
        )}

        {/* Primary Play / Produce CTA */}
        <button
          type="button"
          onClick={() => {
            if (hasActiveProject) {
              handleResumeActiveProject();
            } else {
              resetDraftForNewProject('PROJECT_SETUP');
            }
          }}
          className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border-b-4 border-indigo-950/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-105 active:border-b-0 active:translate-y-1 sm:text-base"
        >
          <Play className="h-5 w-5 fill-current" />
          <span>
            {hasActiveProject
              ? 'متابعة إنتاج العمل الحالي'
              : `إنتاج عمل فني جديد في عام ${currentYear} (فيلم / مسلسل)`}
          </span>
        </button>
      </motion.div>

      {/* Magical 3x2 Modal & Screen Launcher Grid (Zero Scrolling Needed) */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => openModalSheet('markets')}
          className="group flex flex-col items-start justify-between rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-3.5 text-right shadow-2xs transition hover:border-cyan-400 active:border-b-2 active:translate-y-0.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 transition group-hover:scale-110">
            <Globe className="h-5 w-5" />
          </div>
          <div className="mt-2">
            <div className="font-display text-xs font-black text-slate-900 sm:text-sm">
              خريطة الأسواق العالمية
            </div>
            <div className="mt-0.5 text-[10px] font-bold text-cyan-700">
              {unlockedRegions.length} من 4 أسواق دولية
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openModalSheet('archive')}
          className="group flex flex-col items-start justify-between rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-3.5 text-right shadow-2xs transition hover:border-violet-400 active:border-b-2 active:translate-y-0.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition group-hover:scale-110">
            <Film className="h-5 w-5" />
          </div>
          <div className="mt-2">
            <div className="font-display text-xs font-black text-slate-900 sm:text-sm">
              أرشيف الأعمال
            </div>
            <div className="mt-0.5 text-[10px] font-bold text-violet-700">
              {releasedProjects.length} أعمال ({formatMoney(lifetimeBoxOffice)} ج.م)
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openModalSheet('leaderboard')}
          className="group flex flex-col items-start justify-between rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-3.5 text-right shadow-2xs transition hover:border-amber-400 active:border-b-2 active:translate-y-0.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition group-hover:scale-110">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="mt-2">
            <div className="font-display text-xs font-black text-slate-900 sm:text-sm">
              ترتيب الشركات
            </div>
            <div className="mt-0.5 text-[10px] font-bold text-amber-700">
              سباق القيمة السوقية
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openModalSheet('history')}
          className="group flex flex-col items-start justify-between rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-3.5 text-right shadow-2xs transition hover:border-rose-400 active:border-b-2 active:translate-y-0.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 transition group-hover:scale-110">
            <History className="h-5 w-5" />
          </div>
          <div className="mt-2">
            <div className="font-display text-xs font-black text-slate-900 sm:text-sm">
              السجل التاريخي
            </div>
            <div className="mt-0.5 text-[10px] font-bold text-rose-600">
              {worldHistory.length} أحداث موثقة
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveScreen('FESTIVALS_AWARDS')}
          className="group flex flex-col items-start justify-between rounded-2xl border-2 border-amber-200 border-b-4 border-b-amber-300 bg-gradient-to-br from-amber-50/90 to-white p-3.5 text-right shadow-2xs transition hover:border-amber-400 active:border-b-2 active:translate-y-0.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition group-hover:scale-110">
            <Award className="h-5 w-5" />
          </div>
          <div className="mt-2">
            <div className="font-display text-xs font-black text-slate-900 sm:text-sm">
              قاعة الجوائز السنوية
            </div>
            <div className="mt-0.5 text-[10px] font-bold text-amber-800 tabular-nums">
              أعمالك: {currentYearProjectsCount} · بعد {daysUntilAnnualAwards} يوم ({totalAwards} جائزة)
            </div>
          </div>
        </button>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="group flex flex-col items-start justify-between rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-3.5 text-right shadow-2xs transition hover:border-violet-400 active:border-b-2 active:translate-y-0.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:scale-110">
              <Settings className="h-5 w-5" />
            </div>
            <div className="mt-2">
              <div className="font-display text-xs font-black text-slate-900 sm:text-sm">
                الإعدادات والبيانات
              </div>
              <div className="mt-0.5 text-[10px] font-bold text-slate-500">
                تخصيص الحزم أو إعادة الضبط
              </div>
            </div>
          </button>
        )}
      </div>
      </div>

      {/* Magical Step-Paginated Modal Overlay */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveSheet(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-md overscroll-contain touch-none select-none sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="my-auto max-h-[88dvh] w-full max-w-2xl overflow-y-auto overscroll-contain touch-pan-y rounded-3xl border-2 border-indigo-100 bg-[#F4F7FF] p-5 shadow-2xl"
            >
              <div className="mb-3.5 flex items-center justify-between border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  <h2 className="font-display text-base font-black text-slate-900 sm:text-lg">
                    {activeSheet === 'markets' && 'خريطة التوزيع الإقليمية والعالمية'}
                    {activeSheet === 'archive' && 'أرشيف الأفلام والمسلسلات المنتجة'}
                    {activeSheet === 'history' && 'السجل التاريخي للاستوديو'}
                    {activeSheet === 'leaderboard' && 'الترتيب الرسمي لشركات الإنتاج'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs hover:bg-rose-50 hover:text-rose-600"
                  aria-label="إغلاق النافذة"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {activeSheet === 'markets' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {MARKET_CONFIGS.map((cfg) => {
                      const regId = cfg.id;
                      const unlocked = unlockedRegions.includes(regId);
                      const isSelectedForNextProject =
                        activeDistMarkets.includes(regId);
                      const bonusPct = Math.round(cfg.revenueBonusFactor * 100);

                      return (
                        <div
                          key={regId}
                          className={`flex flex-col justify-between rounded-2xl border-2 p-3.5 text-right transition ${
                            isSelectedForNextProject
                              ? 'border-cyan-600 border-b-4 border-b-cyan-700 bg-white shadow-sm'
                              : unlocked
                              ? 'border-indigo-100 bg-white'
                              : 'border-slate-200 bg-white/85'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              {unlocked ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  سوق مفتوح
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                  سوق إقليمي إضافي
                                </span>
                              )}
                              <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700">
                                {regId === 'egypt'
                                  ? 'عائد أساسي 100%'
                                  : `+${bonusPct}% إيرادات`}
                              </span>
                            </div>

                            <div className="font-display mt-1.5 text-sm font-black text-slate-900">
                              {cfg.name}
                            </div>
                            <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-600">
                              {cfg.description}
                            </p>

                            <div className="mt-1.5 text-[10px] font-black text-slate-700 tabular-nums">
                              {cfg.distributionFeePerProject === 0
                                ? 'تكلفة التوزيع: مشمولة بالميزانية'
                                : `رسوم توزيع العمل: ${formatMoney(cfg.distributionFeePerProject)} ج.م`}
                            </div>
                          </div>

                          <div className="mt-2.5 border-t border-indigo-50 pt-2.5">
                            {unlocked ? (
                              <button
                                type="button"
                                disabled={regId === 'egypt'}
                                onClick={() => {
                                  toggleDraftDistributionMarket(regId);
                                  showToast(
                                    isSelectedForNextProject
                                      ? `تم إيقاف التوزيع الدولي في «${cfg.name}» للمشروع الحالي`
                                      : `تم تفعيل التوزيع في «${cfg.name}» (+${bonusPct}% عائد إضافي)!`,
                                    isSelectedForNextProject ? 'info' : 'success'
                                  );
                                }}
                                className={`w-full rounded-xl py-2 px-3 text-[11px] font-black transition ${
                                  regId === 'egypt'
                                    ? 'cursor-default bg-emerald-100 text-emerald-800'
                                    : isSelectedForNextProject
                                    ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                                }`}
                              >
                                {regId === 'egypt'
                                  ? 'مفعل دائماً كسوق أساسي ✓'
                                  : isSelectedForNextProject
                                  ? 'مفعل لتوزيع عملك القادم ✓ (إلغاء)'
                                  : 'تفعيل التوزيع لعملك القادم'}
                              </button>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="text-[10px] font-bold text-slate-500">
                                  يتاح تلقائياً عند قيمة سوقية{' '}
                                  <strong>{formatMoney(cfg.unlockMarketValue)} ج.م</strong>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (cash < cfg.earlyLicenseCost) {
                                      showToast(
                                        'الرصيد النقدي في الخزينة غير كافٍ لفتح المكتب حالياً',
                                        'warning',
                                        `تحتاج إلى ${formatMoney(cfg.earlyLicenseCost)} ج.م لفتح ${cfg.name}`
                                      );
                                      return;
                                    }
                                    const ok = unlockMarketRegionWithCash(regId);
                                    if (ok) {
                                      showToast(
                                        `تم فتح مكتب التوزيع الإقليمي في ${cfg.name} وتفعيله لأعمالك!`,
                                        'success'
                                      );
                                    }
                                  }}
                                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2 px-3 text-[11px] font-black text-white shadow-xs transition hover:brightness-105"
                                >
                                  فتح مكتب مبكر ({formatMoney(cfg.earlyLicenseCost)} ج.م)
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeSheet === 'archive' && (
                <div className="space-y-3">
                  {releasedProjects.length === 0 ? (
                    <div className="rounded-2xl bg-white p-8 text-center text-xs font-bold text-slate-500">
                      لم تقم بإصدار أي عمل فني بعد. اضغط على «إنتاج عمل فني جديد» في الشاشة الرئيسية!
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5">
                        {visibleArchiveProjects.map((proj) => {
                          const genreName =
                            GENRES.find((g) => g.id === proj.primaryGenre)?.name ||
                            proj.primaryGenre;
                          return (
                            <div
                              key={proj.id}
                              className="rounded-2xl border-2 border-indigo-100 bg-white p-3.5"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-black text-violet-700">
                                  {proj.format === 'film' ? 'فيلم' : 'مسلسل'} ·{' '}
                                  {genreName}
                                </span>
                                <span className="font-bold text-slate-400">
                                  عام {proj.year}
                                </span>
                              </div>
                              <div className="font-display mt-1 text-base font-black text-slate-900">
                                {proj.title}
                              </div>
                              <div className="mt-1.5 flex items-center justify-between text-xs tabular-nums">
                                <span className="font-black text-emerald-600">
                                  الإيرادات: {formatMoney(proj.totalGrossRevenue)} ج.م
                                </span>
                                <span className="font-bold text-slate-700">
                                  النقاد: {proj.criticScore}/10 · الجمهور:{' '}
                                  {proj.audienceScore}/10
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {archiveTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-indigo-100 pt-3">
                          <button
                            type="button"
                            disabled={modalPage === 0}
                            onClick={() => setModalPage((p) => Math.max(0, p - 1))}
                            className="flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-40"
                          >
                            <span>السابق</span>
                          </button>
                          <span className="text-xs font-black text-slate-600 tabular-nums">
                            صفحة {modalPage + 1} من {archiveTotalPages}
                          </span>
                          <button
                            type="button"
                            disabled={modalPage >= archiveTotalPages - 1}
                            onClick={() =>
                              setModalPage((p) =>
                                Math.min(archiveTotalPages - 1, p + 1)
                              )
                            }
                            className="flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
                          >
                            <span>التالي</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeSheet === 'history' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {visibleHistoryItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-white p-3.5 text-xs"
                      >
                        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                        <div>
                          <span className="font-black text-violet-700">
                            [{item.year}]
                          </span>{' '}
                          <span className="font-medium text-slate-700">
                            {item.eventText}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {historyTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-indigo-100 pt-3">
                      <button
                        type="button"
                        disabled={modalPage === 0}
                        onClick={() => setModalPage((p) => Math.max(0, p - 1))}
                        className="flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-40"
                      >
                        <span>السابق</span>
                      </button>
                      <span className="text-xs font-black text-slate-600 tabular-nums">
                        صفحة {modalPage + 1} من {historyTotalPages}
                      </span>
                      <button
                        type="button"
                        disabled={modalPage >= historyTotalPages - 1}
                        onClick={() =>
                          setModalPage((p) =>
                            Math.min(historyTotalPages - 1, p + 1)
                          )
                        }
                        className="flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
                      >
                        <span>التالي</span>
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
