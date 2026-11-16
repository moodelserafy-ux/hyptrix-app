'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  getDaysRemainingUntilAnnualAwards,
} from '@/lib/store';
import { GENRES } from '@/lib/db-resolver';
import {
  MarketRegion,
  MARKET_CONFIGS,
  STUDIO_FACILITY_CONFIGS,
  DEFAULT_FACILITIES_LEVELS,
  StudioFacilityId,
  getFacilityUpgradeCost,
  calculateFacilitiesBonuses,
  formatMoney,
} from '@/lib/game-engine';
import { StudioLogoSvg } from './StudioLogoSvg';
import { LeaderboardAndSettingsView } from './LeaderboardAndSettingsView';
import {
  Clapperboard,
  Globe,
  Trophy,
  Film,
  Lock,
  CheckCircle2,
  Play,
  Building2,
  ArrowUpCircle,
  Sparkles,
  X,
  Eye,
  Crown,
  Compass,
  Video,
  Star,
} from 'lucide-react';

export interface StudioHubViewProps {
  onOpenSettings?: () => void;
  selectedFacility: StudioFacilityId | null;
  onSelectFacility: (id: StudioFacilityId | null) => void;
  cameraMode: 'overview' | 'focus';
  onChangeCameraMode: (mode: 'overview' | 'focus') => void;
}

export function StudioHubView({
  selectedFacility,
  onSelectFacility,
  cameraMode,
  onChangeCameraMode,
}: StudioHubViewProps) {
  const {
    studioName,
    ceoName,
    logo,
    founderPerk,
    unlockedRegions,
    facilitiesLevels = DEFAULT_FACILITIES_LEVELS,
    cash,
    marketValue,
    reputation,
    currentYear,
    gameDay,
    draft,
    releasedProjects,
    upgradeStudioFacility,
    unlockMarketRegionWithCash,
    toggleDraftDistributionMarket,
    resetDraftForNewProject,
    setActiveScreen,
  } = useGameStore();

  const [openModal, setOpenModal] = useState<'markets' | 'archive' | 'leaderboard' | null>(null);
  const [showFacilitiesBar, setShowFacilitiesBar] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const totalAwards = releasedProjects.reduce(
    (sum, p) => sum + p.awardsWon.length,
    0
  );
  const lifetimeBoxOffice = releasedProjects.reduce(
    (sum, p) => sum + p.totalGrossRevenue,
    0
  );
  const daysUntilAnnualAwards = getDaysRemainingUntilAnnualAwards(gameDay);
  const facilityBonuses = calculateFacilitiesBonuses(facilitiesLevels);

  const studioRankTitle =
    marketValue >= 1_000_000_000
      ? 'عملاق الإنتاج العالمي'
      : marketValue >= 550_000_000
      ? 'قطب السينما والدراما'
      : marketValue >= 260_000_000
      ? 'استوديو إنتاج رائد'
      : 'منتج سينمائي صاعد';

  const hasActiveProject = Boolean(draft.title.trim());
  const offerList = Object.values(draft.talentOffers || {});
  const pendingOffersCount = offerList.filter((n) => n.status === 'pending').length;

  const activeDistMarkets: MarketRegion[] =
    Array.isArray(draft.selectedDistributionMarkets) &&
    draft.selectedDistributionMarkets.length > 0
      ? draft.selectedDistributionMarkets
      : ['egypt'];

  const activeFacilityId: StudioFacilityId = selectedFacility || 'soundstage';
  const activeFacilityConfig =
    STUDIO_FACILITY_CONFIGS.find((f) => f.id === activeFacilityId) ||
    STUDIO_FACILITY_CONFIGS[0];
  const activeFacLevel = facilitiesLevels[activeFacilityConfig.id] || 1;
  const activeFacIsMax = activeFacLevel >= activeFacilityConfig.maxLevel;
  const activeFacCost = getFacilityUpgradeCost(activeFacilityConfig.id, activeFacLevel);
  const canAffordActiveFac = cash >= activeFacCost;

  const isFacilityInspectorOpen = showFacilitiesBar || selectedFacility !== null;

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

  const handleSelectBuildingForInspect = (id: StudioFacilityId) => {
    onSelectFacility(id);
    onChangeCameraMode('focus');
    setShowFacilitiesBar(true);
    setOpenModal(null);
  };

  const handleResetOverview = () => {
    onSelectFacility(null);
    onChangeCameraMode('overview');
    setShowFacilitiesBar(false);
  };

  return (
    <div className="hyptrix-hub pointer-events-none relative flex h-full w-full flex-col justify-between overflow-hidden px-3 pb-2 pt-1 sm:px-5">
      {/* TOP LANDSCAPE HUD STRIP: Compact Studio Card (Right) + Quick Camera & Active Project Controls (Left) */}
      <div className="hyptrix-hub-top pointer-events-auto flex flex-wrap items-center justify-between gap-2">
        {/* Studio Identity Pill (Light Theme) */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md"
        >
          <div className="shrink-0 rounded-xl border border-indigo-100 bg-indigo-50/70 p-1">
            <StudioLogoSvg config={logo} size={34} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-violet-700">
              <span>{studioRankTitle}</span>
              <span>·</span>
              <span>المدير: {ceoName}</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-display truncate text-xs font-black text-slate-900 sm:text-sm">
                {studioName}
              </h1>
              <span className="inline-flex items-center gap-0.5 rounded-lg bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800 tabular-nums">
                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                السمعة {reputation}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Quick Camera & Active Work Controls (Left) */}
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveProject && (
            <motion.button
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              type="button"
              onClick={handleResumeActiveProject}
              className="flex items-center gap-1.5 rounded-2xl border-b-4 border-amber-700/40 bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-black text-white shadow-md transition hover:brightness-105 active:border-b-0 active:translate-y-0.5"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>
                استكمال «{draft.title}»
                {pendingOffersCount > 0 ? ` (${pendingOffersCount} تفاوض)` : ''}
              </span>
            </motion.button>
          )}

          <button
            type="button"
            onClick={() => {
              if (cameraMode === 'focus' || isFacilityInspectorOpen) {
                handleResetOverview();
              } else {
                handleSelectBuildingForInspect('soundstage');
              }
            }}
            className="flex items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white/95 px-3 py-1.5 text-xs font-black text-slate-800 shadow-sm backdrop-blur-md transition hover:border-violet-300"
          >
            <Eye className="h-3.5 w-3.5 text-violet-600" />
            <span>
              {cameraMode === 'focus' ? 'رؤية شاملة للمدينة' : 'تقريب الكاميرا للمباني'}
            </span>
          </button>
        </div>
      </div>

      {/* Status Toast Banner */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="pointer-events-auto mx-auto mt-1 flex max-w-md items-center justify-between gap-3 rounded-2xl border-2 border-emerald-300 bg-white/95 px-4 py-2 text-xs font-black text-emerald-900 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTER AREA IS 100% OPEN TO VIEW AND CLICK THE STUDIO CITY */}
      <div className="hyptrix-hub-hint pointer-events-none my-auto flex items-center justify-center">
        {!isFacilityInspectorOpen && !openModal && (
          <div className="rounded-full border border-indigo-100 bg-white/85 px-3.5 py-1 text-[11px] font-bold text-slate-700 shadow-xs backdrop-blur-xs">
            اضغط على أي مبنى في المدينة لتطويره أو اسحب الشاشة لتحريك الكاميرا
          </div>
        )}
      </div>

      {/* BOTTOM AREA: Horizontal Building Upgrade Strip + Main Landscape Game Dock */}
      <div className="hyptrix-hub-bottom pointer-events-none flex flex-col items-center gap-2">
        {/* Compact Horizontal Building Inspector (Light Theme, Widescreen Fitted) */}
        <AnimatePresence>
          {isFacilityInspectorOpen && !openModal && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="pointer-events-auto mx-auto w-full max-w-4xl rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white/95 p-3 text-slate-900 shadow-xl backdrop-blur-md sm:p-3.5"
            >
              {/* Top Row: 5 Horizontal Building Selector Pills + Close Button */}
              <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-indigo-50 pb-2">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {STUDIO_FACILITY_CONFIGS.map((fac) => {
                    const lvl = facilitiesLevels[fac.id] || 1;
                    const isSelected = activeFacilityConfig.id === fac.id;
                    return (
                      <button
                        key={fac.id}
                        type="button"
                        onClick={() => handleSelectBuildingForInspect(fac.id)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition whitespace-nowrap shrink-0 ${
                          isSelected
                            ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                            : 'border-indigo-100 bg-[#F5F7FF] text-slate-700 hover:border-violet-300'
                        }`}
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{fac.shortLabel}</span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          م{lvl}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleResetOverview}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                  title="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Bottom Row: Widescreen Side-by-Side Info & 1-Tap Upgrade CTA */}
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-800">
                      {activeFacilityConfig.categoryLabel}
                    </span>
                    <span className="font-display text-sm font-black text-slate-900 sm:text-base">
                      {activeFacilityConfig.name}
                    </span>
                    <span className="text-xs font-bold text-indigo-700 tabular-nums">
                      (المستوى {activeFacLevel}/{activeFacilityConfig.maxLevel} ·{' '}
                      {activeFacilityConfig.levelTitles[activeFacLevel - 1]})
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-slate-600">
                      {activeFacilityConfig.description}
                    </span>
                    <span className="font-black text-emerald-700">
                      الأثر: {activeFacilityConfig.impactSummary(activeFacLevel)}
                    </span>
                  </div>
                </div>

                <div className="w-full shrink-0 sm:w-auto">
                  {activeFacIsMax ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>الحد الأقصى للتطوير</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAffordActiveFac}
                      onClick={() => {
                        const res = upgradeStudioFacility(activeFacilityConfig.id);
                        setStatusMessage(res.message);
                      }}
                      className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-950/30 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-5 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-105 active:border-b-0 active:translate-y-0.5 disabled:opacity-40 whitespace-nowrap"
                    >
                      <ArrowUpCircle className="h-4 w-4 shrink-0 text-amber-300" />
                      <span className="tabular-nums">
                        تطوير للمستوى {activeFacLevel + 1} · {formatMoney(activeFacCost)} ج.م
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN LANDSCAPE BOTTOM ICON DOCK (Light Theme, Crisp Tactile Buttons) */}
        <div className="hyptrix-hub-legacy-dock pointer-events-auto mx-auto flex w-full max-w-4xl items-center justify-between gap-1.5 rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white/95 p-1.5 shadow-xl backdrop-blur-md sm:gap-2 sm:p-2">
          {/* Primary Action: New Movie / Series Production */}
          <button
            type="button"
            onClick={() => resetDraftForNewProject('PROJECT_SETUP')}
            className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-950/30 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-105 active:border-b-0 active:translate-y-0.5 whitespace-nowrap"
          >
            <Clapperboard className="h-4 w-4 shrink-0" />
            <span>إنتاج عمل جديد</span>
          </button>

          {/* Icon 1: Studio Buildings & Equipment */}
          <button
            type="button"
            onClick={() => {
              setOpenModal(null);
              if (isFacilityInspectorOpen) {
                handleResetOverview();
              } else {
                handleSelectBuildingForInspect(selectedFacility || 'soundstage');
              }
            }}
            className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2 text-xs font-black transition whitespace-nowrap ${
              isFacilityInspectorOpen && !openModal
                ? 'border-violet-600 bg-violet-50 text-violet-900 shadow-2xs'
                : 'border-indigo-100 bg-[#F8FAFF] text-slate-700 hover:border-violet-300'
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0 text-violet-600" />
            <span>تطوير المباني ({facilityBonuses.totalLevels}/25)</span>
          </button>

          {/* Icon 2: Global Distribution Markets */}
          <button
            type="button"
            onClick={() => {
              setShowFacilitiesBar(false);
              setOpenModal(openModal === 'markets' ? null : 'markets');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2 text-xs font-black transition whitespace-nowrap ${
              openModal === 'markets'
                ? 'border-cyan-600 bg-cyan-50 text-cyan-900 shadow-2xs'
                : 'border-indigo-100 bg-[#F8FAFF] text-slate-700 hover:border-cyan-300'
            }`}
          >
            <Compass className="h-4 w-4 shrink-0 text-cyan-600" />
            <span>الأسواق</span>
          </button>

          {/* Icon 3: Studio Filmography Archive */}
          <button
            type="button"
            onClick={() => {
              setShowFacilitiesBar(false);
              setOpenModal(openModal === 'archive' ? null : 'archive');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2 text-xs font-black transition whitespace-nowrap ${
              openModal === 'archive'
                ? 'border-violet-600 bg-violet-50 text-violet-900 shadow-2xs'
                : 'border-indigo-100 bg-[#F8FAFF] text-slate-700 hover:border-violet-300'
            }`}
          >
            <Video className="h-4 w-4 shrink-0 text-indigo-600" />
            <span>الأرشيف ({releasedProjects.length})</span>
          </button>

          {/* Icon 4: Annual Festival & Awards Hall */}
          <button
            type="button"
            onClick={() => {
              setOpenModal(null);
              setActiveScreen('FESTIVALS_AWARDS');
            }}
            className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-indigo-100 bg-[#F8FAFF] px-3 py-2 text-xs font-black text-slate-700 transition hover:border-amber-300 whitespace-nowrap"
          >
            <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
            <span>المهرجان</span>
          </button>

          {/* Icon 5: Rival Studios Leaderboard */}
          <button
            type="button"
            onClick={() => {
              setShowFacilitiesBar(false);
              setOpenModal(openModal === 'leaderboard' ? null : 'leaderboard');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2 text-xs font-black transition whitespace-nowrap ${
              openModal === 'leaderboard'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                : 'border-indigo-100 bg-[#F8FAFF] text-slate-700 hover:border-emerald-300'
            }`}
          >
            <Crown className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>المتصدرين</span>
          </button>
        </div>
      </div>

      {/* WIDESCREEN LANDSCAPE MODALS (Light Theme, Clean 2-Column Grids) */}
      <AnimatePresence>
        {openModal && (
          <motion.div
            key={openModal}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 330, damping: 28 }}
            className="hyptrix-hub-modal pointer-events-auto absolute inset-x-3 top-12 bottom-3 z-30 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-950/90 text-slate-100 shadow-2xl backdrop-blur-xl sm:inset-x-6"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-indigo-100 bg-[#F8FAFF] px-5 py-3">
              <div className="flex items-center gap-2.5">
                {openModal === 'markets' && <Globe className="h-5 w-5 text-cyan-600" />}
                {openModal === 'archive' && <Film className="h-5 w-5 text-violet-600" />}
                {openModal === 'leaderboard' && <Crown className="h-5 w-5 text-amber-500" />}
                <h2 className="font-display text-sm font-black text-slate-900 sm:text-base">
                  {openModal === 'markets'
                    ? 'خريطة أسواق التوزيع السينمائي والرقمي'
                    : openModal === 'archive'
                    ? `أرشيف أفلام ومسلسلات ${studioName} (${releasedProjects.length})`
                    : 'تصنيف الشركات المنافسة والقيمة السوقية'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setOpenModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200/70 text-slate-700 transition hover:bg-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Widescreen Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {openModal === 'markets' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {MARKET_CONFIGS.map((cfg) => {
                    const regId = cfg.id;
                    const unlocked = unlockedRegions.includes(regId);
                    const isSelected = activeDistMarkets.includes(regId);
                    const bonusPct = Math.round(cfg.revenueBonusFactor * 100);

                    return (
                      <div
                        key={regId}
                        className={`flex flex-col justify-between rounded-2xl border-2 p-4 ${
                          unlocked
                            ? 'border-cyan-200 bg-[#F8FAFF]'
                            : 'border-slate-200 bg-slate-50 opacity-85'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={unlocked ? 'font-black text-cyan-700' : 'font-bold text-slate-500'}>
                              {unlocked ? 'سوق مفتوح' : 'سوق مغلق'}
                            </span>
                            <span className="rounded-lg bg-emerald-100 px-2 py-0.5 font-black text-emerald-800 tabular-nums">
                              {regId === 'egypt' ? 'أساسي 100%' : `+${bonusPct}% عائد`}
                            </span>
                          </div>

                          <h3 className="font-display mt-1.5 text-sm font-black text-slate-900">
                            {cfg.name}
                          </h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                            {cfg.description}
                          </p>
                          <div className="mt-2 text-[11px] font-black text-indigo-700 tabular-nums">
                            {cfg.distributionFeePerProject === 0
                              ? 'رسوم التوزيع: مشمولة بالميزانية'
                              : `تكلفة التوزيع: ${formatMoney(cfg.distributionFeePerProject)} ج.م`}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-indigo-100/60">
                          {unlocked ? (
                            <button
                              type="button"
                              disabled={regId === 'egypt'}
                              onClick={() => toggleDraftDistributionMarket(regId)}
                              className={`w-full rounded-xl py-2 px-3 text-xs font-black transition ${
                                regId === 'egypt'
                                  ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                  : isSelected
                                  ? 'bg-violet-600 text-white shadow-xs'
                                  : 'border border-indigo-200 bg-white text-slate-800 hover:bg-indigo-50'
                              }`}
                            >
                              {regId === 'egypt'
                                ? 'مفعل دائماً'
                                : isSelected
                                ? '✓ مفعل للعمل القادم'
                                : 'تفعيل التوزيع'}
                            </button>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="text-[10px] font-bold text-slate-500 tabular-nums">
                                يفتح تلقائياً عند قيمة سوقية {formatMoney(cfg.unlockMarketValue)} ج.م
                              </div>
                              <button
                                type="button"
                                disabled={cash < cfg.earlyLicenseCost}
                                onClick={() => {
                                  const ok = unlockMarketRegionWithCash(regId);
                                  setStatusMessage(
                                    ok
                                      ? `تم افتتاح مكتب التوزيع الإقليمي في «${cfg.name}»!`
                                      : 'الرصيد النقدي في الخزينة غير كافٍ.'
                                  );
                                }}
                                className="w-full rounded-xl bg-violet-600 py-2 px-3 text-[11px] font-black text-white transition hover:bg-violet-700 disabled:opacity-40"
                              >
                                <Lock className="inline h-3 w-3 ml-1" />
                                <span>رخصة مبكرة ({formatMoney(cfg.earlyLicenseCost)} ج.م)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {openModal === 'archive' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-4">
                    <div>
                      <div className="text-xs font-black text-amber-800">
                        الحفل السنوي الكبير للجوائز · عام {currentYear}
                      </div>
                      <div className="font-display mt-0.5 text-sm font-black text-slate-900">
                        متبقي {daysUntilAnnualAwards} يوم على انطلاق المهرجان السنوي
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-slate-600 tabular-nums">
                        إجمالي إيرادات الشركة: {formatMoney(lifetimeBoxOffice)} ج.م · الجوائز: {totalAwards}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenModal(null);
                        setActiveScreen('FESTIVALS_AWARDS');
                      }}
                      className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-white shadow-xs transition hover:bg-amber-600"
                    >
                      <Trophy className="h-4 w-4" />
                      <span>قاعة المهرجانات والجوائز</span>
                    </button>
                  </div>

                  {releasedProjects.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-[#F8FAFF] p-8 text-center text-xs font-bold text-slate-500">
                      لم تطرح أي فيلم أو مسلسل بعد. اضغط على زر «إنتاج عمل جديد» من الشريط السفلي للبدء.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {releasedProjects.map((proj) => {
                        const genreObj = GENRES.find((g) => g.id === proj.primaryGenre);
                        return (
                          <div
                            key={proj.id}
                            className="rounded-2xl border-2 border-indigo-100 bg-[#F8FAFF] p-3.5"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                              <span className="font-bold">
                                {proj.format === 'film' ? 'فيلم سينمائي' : 'مسلسل درامي'} · {genreObj?.name} · {proj.year}
                              </span>
                              <span className="font-black text-amber-600 tabular-nums">
                                ★ {proj.criticScore}/10
                              </span>
                            </div>
                            <h3 className="font-display mt-1 text-sm font-black text-slate-900">
                              {proj.title}
                            </h3>
                            <div className="mt-2 flex items-center justify-between border-t border-indigo-100 pt-2 text-xs tabular-nums">
                              <span className="text-slate-600">
                                الإيرادات: <strong className="text-slate-900">{formatMoney(proj.totalGrossRevenue)} ج.م</strong>
                              </span>
                              <span
                                className={`font-black ${
                                  proj.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                الصافي: {proj.netProfit >= 0 ? '+' : ''}
                                {formatMoney(proj.netProfit)} ج.م
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {openModal === 'leaderboard' && <LeaderboardAndSettingsView />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
