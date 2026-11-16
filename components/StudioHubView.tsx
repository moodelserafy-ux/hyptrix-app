'use client';

import React, { useState } from 'react';
import { StepModalFrame } from './StepModalFrame';
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
  Clapperboard,
  Globe,
  Trophy,
  History,
  Film,
  Wallet,
  TrendingUp,
  Award,
  Lock,
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
  } = useGameStore();

  const [activeSheet, setActiveSheet] = useState<
    null | 'markets' | 'archive' | 'history' | 'leaderboard'
  >(null);
  const [marketBannerMsg, setMarketBannerMsg] = useState<string | null>(null);

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

  return (
    <StepModalFrame label="المقر الرئيسي للاستوديو">
      <div className="mx-auto max-w-4xl space-y-4 py-1">
      {/* Main Mobile Game Lobby Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5 shadow-[0_20px_48px_-12px_rgba(99,102,241,0.2)] sm:p-6"
      >
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-3xl border-2 border-indigo-100 bg-white p-2.5 shadow-lg shadow-indigo-500/15"
          >
            <StudioLogoSvg config={logo} size={76} />
          </motion.div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-black text-violet-700">
                <Crown className="h-3 w-3 text-amber-500" />
                <span>{studioRankTitle}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-black text-cyan-800">
                <Sparkles className="h-3 w-3" />
                <span>{formatGameDate(gameDay, currentYear)}</span>
              </span>
            </div>

            <h1 className="font-display mt-1.5 truncate text-2xl font-black text-slate-900 sm:text-3xl">
              {studioName}
            </h1>
            <p className="mt-0.5 text-xs font-bold text-slate-600">
              المدير التنفيذي: <span className="text-indigo-700">{ceoName}</span>
            </p>
            <div className="mt-1 text-[11px] font-black text-violet-600">
              {founderPerk === 'visionary_director'
                ? '★ مخرج عبقري (+10% جودة فنية وتقدير نقدي)'
                : founderPerk === 'marketing_whale'
                ? '★ حوت تسويق (+15% إيرادات شباك التذاكر)'
                : '★ مفاوض شرس (خصم 15% على أجور النجوم)'}
            </div>
          </div>
        </div>

        {/* Interactive Animated 2.5D Studio Lot Graphic */}
        <div className="mt-4">
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

        {/* Reputation Level Bar */}
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-white/95 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-600">هيبة الاستوديو والسمعة الفنية بالسوق</span>
            <span className="text-violet-700 tabular-nums">{reputation}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-indigo-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, reputation)}%` }}
              transition={{ duration: 0.6 }}
              className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400"
            />
          </div>
        </div>

        {/* Active Project Live Radar Banner (if a film/series is currently in progress) */}
        {hasActiveProject && (
          <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 via-white to-violet-50 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-700">
                  <Flame className="h-3.5 w-3.5 text-amber-600" />
                  <span>عمل قيد الإنتاج حالياً</span>
                </div>
                <div className="font-display mt-0.5 truncate text-sm font-black text-slate-900">
                  « {draft.title} »
                </div>
                <div className="mt-0.5 text-[11px] font-bold text-slate-600">
                  {draft.filmingStartDay !== null &&
                  draft.filmingDaysElapsed >= draft.filmingDurationDays
                    ? 'اكتمل التصوير وجاهز للعرض الجماهيري!'
                    : draft.filmingStartDay !== null
                    ? `جاري التصوير الفعلي (اليوم ${draft.filmingDaysElapsed}/${draft.filmingDurationDays})`
                    : awaitingChoiceCount > 0
                    ? `يوجد ${awaitingChoiceCount} نجوم وافقوا وينتظرون حسمك النهائي!`
                    : pendingOffersCount > 0
                    ? `بانتظار رد ${pendingOffersCount} نجوم على العروض المرسلة...`
                    : 'مرحلة التعاقدات وتجهيز الطاقم'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleResumeActiveProject}
                className="flex shrink-0 items-center justify-center rounded-xl border-b-4 border-amber-800/30 bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-xs transition hover:bg-amber-600 active:border-b-0 active:translate-y-0.5"
              >
                <span>متابعة العمل</span>
              </button>
            </div>
          </div>
        )}

        {/* Giant Tactile 3D Mobile Play CTA Button */}
        <button
          type="button"
          onClick={() => {
            if (hasActiveProject) {
              handleResumeActiveProject();
            } else {
              resetDraftForNewProject('PROJECT_SETUP');
            }
          }}
          className="mt-4 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl border-b-4 border-indigo-950/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-4 text-base font-black text-white shadow-xl shadow-indigo-500/30 transition hover:brightness-105 active:border-b-0 active:translate-y-1"
        >
          <Play className="h-5 w-5 fill-current" />
          <span>
            {hasActiveProject
              ? 'متابعة إنتاج العمل الحالي'
              : `إنتاج عمل فني جديد في عام ${currentYear} (فيلم / مسلسل)`}
          </span>
        </button>
      </motion.div>

      {/* Dual Financial Separation Row: Liquid Treasury Cash vs Studio Market Valuation */}
      <div className="grid grid-cols-2 gap-3 tabular-nums">
        <div className="rounded-3xl border-2 border-emerald-200 border-b-4 border-b-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-800">
              خزينة السيولة النقدية
            </span>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
          <div
            data-testid="hub-cash-value"
            className="font-display mt-1.5 text-xl font-black text-emerald-700 whitespace-nowrap"
          >
            {formatMoney(cash)} <span className="text-xs font-bold">ج.م</span>
          </div>
          <div className="mt-0.5 text-[10px] font-bold text-slate-500">
            متاحة لتمويل الأفلام وأجور النجوم
          </div>
        </div>

        <div className="rounded-3xl border-2 border-violet-200 border-b-4 border-b-violet-300 bg-gradient-to-br from-violet-50/70 via-white to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-violet-800">
              القيمة السوقية للشركة
            </span>
            <TrendingUp className="h-4 w-4 text-violet-600" />
          </div>
          <div
            data-testid="hub-market-value"
            className="font-display mt-1.5 text-xl font-black text-violet-700 whitespace-nowrap"
          >
            {formatMoney(marketValue)} <span className="text-xs font-bold">ج.م</span>
          </div>
          <div className="mt-0.5 text-[10px] font-bold text-slate-500">
            الأصول الفنية + السمعة + الجوائز
          </div>
        </div>
      </div>

      {/* Annual Grand Awards Gala Banner Card */}
      <div className="rounded-3xl border-2 border-amber-200 border-b-4 border-b-amber-300 bg-gradient-to-r from-amber-50/90 via-white to-violet-50/80 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-xs font-black text-amber-950">
                الحفل السنوي الكبير لجوائز السينما والدراما · {currentYear}
              </div>
              <div className="mt-0.5 text-[11px] font-bold text-slate-600 tabular-nums">
                أعمالك المطروحة هذا العام: <strong>{currentYearProjectsCount}</strong> · ينطلق الحفل تلقائياً بعد{' '}
                <strong className="text-violet-700">{daysUntilAnnualAwards} يوم</strong> ({totalAwards} جائزة بتاريخك)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveScreen('FESTIVALS_AWARDS')}
            className="rounded-2xl border-b-4 border-amber-800/30 bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-black text-white shadow-xs transition hover:brightness-105 active:border-b-0 active:translate-y-0.5"
          >
            قاعة الجوائز السنوية
          </button>
        </div>
      </div>

      {/* Secondary Studio Achievements Row */}
      <div className="grid grid-cols-2 gap-3 tabular-nums">
        <div className="flex items-center justify-between rounded-2xl border-2 border-indigo-100 bg-white px-4 py-3 shadow-2xs">
          <div>
            <div className="text-[10px] font-bold text-slate-500">
              إجمالي أعمال الاستوديو
            </div>
            <div className="font-display text-sm font-black text-slate-900">
              {releasedProjects.length} أعمال ({formatMoney(lifetimeBoxOffice)} ج.م)
            </div>
          </div>
          <Clapperboard className="h-5 w-5 text-violet-600 shrink-0" />
        </div>

        <div className="flex items-center justify-between rounded-2xl border-2 border-indigo-100 bg-white px-4 py-3 shadow-2xs">
          <div>
            <div className="text-[10px] font-bold text-slate-500">
              أسواق التوزيع المفتوحة
            </div>
            <div className="font-display text-sm font-black text-cyan-700">
              {unlockedRegions.length} من 4 أسواق دولية
            </div>
          </div>
          <Globe className="h-5 w-5 text-cyan-600 shrink-0" />
        </div>
      </div>

      {/* 2x2 Tactile Mobile Game Launcher Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        <button
          type="button"
          onClick={() => setActiveSheet('markets')}
          className="group flex flex-col items-start justify-between rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-5 text-right shadow-sm transition hover:border-cyan-400 active:border-b-2 active:translate-y-0.5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 transition group-hover:scale-110">
            <Globe className="h-6 w-6" />
          </div>
          <div className="mt-3">
            <div className="font-display text-sm font-black text-slate-900">
              خريطة الأسواق العالمية
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-cyan-700">
              فتح الأسواق وتفعيل التوزيع الدولي
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSheet('archive')}
          className="group flex flex-col items-start justify-between rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-5 text-right shadow-sm transition hover:border-violet-400 active:border-b-2 active:translate-y-0.5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 transition group-hover:scale-110">
            <Film className="h-6 w-6" />
          </div>
          <div className="mt-3">
            <div className="font-display text-sm font-black text-slate-900">
              أرشيف الأفلام والمسلسلات
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-violet-700">
              سجل الإيرادات ({releasedProjects.length} أعمال)
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSheet('leaderboard')}
          className="group flex flex-col items-start justify-between rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-5 text-right shadow-sm transition hover:border-amber-400 active:border-b-2 active:translate-y-0.5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 transition group-hover:scale-110">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="mt-3">
            <div className="font-display text-sm font-black text-slate-900">
              ترتيب شركات الإنتاج
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-amber-700">
              المنافسة حسب القيمة السوقية
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSheet('history')}
          className="group flex flex-col items-start justify-between rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-5 text-right shadow-sm transition hover:border-rose-400 active:border-b-2 active:translate-y-0.5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 transition group-hover:scale-110">
            <History className="h-6 w-6" />
          </div>
          <div className="mt-3">
            <div className="font-display text-sm font-black text-slate-900">
              السجل التاريخي للاستوديو
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-rose-600">
              {worldHistory.length} أحداث فنية موثقة
            </div>
          </div>
        </button>
      </div>

      {/* Quick Settings, JSON Import & Reset Bar (No website arrows) */}
      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex w-full items-center justify-between rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-5 py-3.5 text-right shadow-xs transition hover:border-violet-400 active:border-b-2 active:translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-xs font-black text-slate-900">
                الإعدادات · استيراد ملف JSON · مسح البيانات والبدء من جديد
              </div>
              <div className="text-[11px] font-bold text-slate-500">
                تخصيص قاعدة البيانات بالصور والشعارات أو إعادة ضبط اللعبة بالكامل
              </div>
            </div>
          </div>
          <span className="rounded-xl bg-violet-50 px-3 py-1 text-[11px] font-black text-violet-700">
            فتح
          </span>
        </button>
      )}

      {/* Focused Slide-Up Mobile Game Modal Sheet */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-2 border-indigo-100 bg-[#F4F7FF] p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between border-b border-indigo-100 pb-3">
                <h2 className="font-display text-lg font-black text-slate-900">
                  {activeSheet === 'markets' && 'خريطة التوزيع الإقليمية والعالمية'}
                  {activeSheet === 'archive' && 'أرشيف الأفلام والمسلسلات المنتجة'}
                  {activeSheet === 'history' && 'السجل التاريخي للاستوديو'}
                  {activeSheet === 'leaderboard' && 'الترتيب الرسمي لشركات الإنتاج'}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs hover:bg-slate-100"
                  aria-label="إغلاق النافذة"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {activeSheet === 'markets' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-indigo-100 bg-white p-3.5 text-xs font-bold text-slate-600">
                    🌍 تتيح لك خريطة الأسواق نشر أفلامك ومسلسلاتك في دول الخليج وأوروبا وهوليوود لمضاعفة شباك التذاكر وعقود المنصات، مقابل تكلفة توزيع ودبلجة إضافية لكل عمل.
                  </div>

                  {marketBannerMsg && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black text-emerald-800">
                      {marketBannerMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {MARKET_CONFIGS.map((cfg) => {
                      const regId = cfg.id;
                      const unlocked = unlockedRegions.includes(regId);
                      const isSelectedForNextProject =
                        activeDistMarkets.includes(regId);
                      const bonusPct = Math.round(cfg.revenueBonusFactor * 100);

                      return (
                        <div
                          key={regId}
                          className={`flex flex-col justify-between rounded-2xl border-2 p-4 text-right transition ${
                            isSelectedForNextProject
                              ? 'border-cyan-600 border-b-4 border-b-cyan-700 bg-white shadow-sm'
                              : unlocked
                              ? 'border-indigo-100 bg-white'
                              : 'border-slate-200 bg-white/80'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              {unlocked ? (
                                <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  سوق مفتوح
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                                  <Lock className="h-4 w-4 text-slate-400" />
                                  مغلق حالياً
                                </span>
                              )}
                              <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-xs font-black text-violet-700">
                                {regId === 'egypt'
                                  ? 'عائد أساسي 100%'
                                  : `+${bonusPct}% إيرادات إضافية`}
                              </span>
                            </div>

                            <div className="font-display mt-2 text-base font-black text-slate-900">
                              {cfg.name}
                            </div>
                            <p className="mt-1 text-[11px] font-medium text-slate-600">
                              {cfg.description}
                            </p>

                            <div className="mt-2 text-[11px] font-black text-slate-700 tabular-nums">
                              {cfg.distributionFeePerProject === 0
                                ? 'تكلفة التوزيع للعمل: مشمولة بالميزانية'
                                : `رسوم توزيع العمل الواحد: ${formatMoney(cfg.distributionFeePerProject)} ج.م`}
                            </div>
                          </div>

                          <div className="mt-3 border-t border-indigo-50 pt-3">
                            {unlocked ? (
                              <button
                                type="button"
                                disabled={regId === 'egypt'}
                                onClick={() => {
                                  toggleDraftDistributionMarket(regId);
                                  setMarketBannerMsg(
                                    isSelectedForNextProject
                                      ? `تم إيقاف التوزيع الدولي في «${cfg.name}» للمشروع الحالي.`
                                      : `تم تفعيل التوزيع في «${cfg.name}» للمشروع الحالي (+${bonusPct}% عائد إضافي)!`
                                  );
                                }}
                                className={`w-full rounded-xl py-2 px-3 text-xs font-black transition ${
                                  regId === 'egypt'
                                    ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                    : isSelectedForNextProject
                                    ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                                }`}
                              >
                                {regId === 'egypt'
                                  ? 'مفعل دائماً كسوق أساسي ✓'
                                  : isSelectedForNextProject
                                  ? 'مفعل لتوزيع عملك القادم ✓ (اضغط للإلغاء)'
                                  : 'تفعيل التوزيع في هذا السوق لعملك القادم'}
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <div className="text-[10px] font-bold text-slate-500">
                                  يفتح تلقائياً عند وصول القيمة السوقية إلى{' '}
                                  <strong>{formatMoney(cfg.unlockMarketValue)} ج.م</strong>
                                </div>
                                <button
                                  type="button"
                                  disabled={cash < cfg.earlyLicenseCost}
                                  onClick={() => {
                                    const ok = unlockMarketRegionWithCash(regId);
                                    setMarketBannerMsg(
                                      ok
                                        ? `تم فتح مكتب التوزيع الإقليمي في ${cfg.name} وتفعيله لأعمالك القادمة!`
                                        : 'الرصيد النقدي في الخزينة غير كافٍ لفتح المكتب حالياً.'
                                    );
                                  }}
                                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2 px-3 text-xs font-black text-white shadow-xs transition hover:brightness-105 disabled:opacity-45"
                                >
                                  فتح مكتب توزيع مبكر ({formatMoney(cfg.earlyLicenseCost)} ج.م من الخزينة)
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
                    releasedProjects.map((proj) => {
                      const genreName =
                        GENRES.find((g) => g.id === proj.primaryGenre)?.name || proj.primaryGenre;
                      return (
                        <div
                          key={proj.id}
                          className="rounded-2xl border-2 border-indigo-100 bg-white p-4"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-violet-700">
                              {proj.format === 'film' ? 'فيلم' : 'مسلسل'} · {genreName}
                            </span>
                            <span className="font-bold text-slate-400">{proj.year}</span>
                          </div>
                          <div className="font-display mt-1 text-base font-black text-slate-900">
                            {proj.title}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs tabular-nums">
                            <span className="font-black text-emerald-600">
                              الإيرادات: {formatMoney(proj.totalGrossRevenue)} ج.م
                            </span>
                            <span className="font-bold text-slate-700">
                              النقاد: {proj.criticScore}/10 · الجمهور: {proj.audienceScore}/10
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeSheet === 'history' && (
                <div className="space-y-2.5">
                  {worldHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-white p-3.5 text-xs"
                    >
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                      <div>
                        <span className="font-black text-violet-700">[{item.year}]</span>{' '}
                        <span className="font-medium text-slate-700">{item.eventText}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSheet === 'leaderboard' && <LeaderboardAndSettingsView embedded />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </StepModalFrame>
  );
}
