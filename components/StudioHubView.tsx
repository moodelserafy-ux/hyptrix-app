'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import {
  formatMoney,
  StudioFacilityId,
  STUDIO_FACILITY_CONFIGS,
  getFacilityUpgradeCost,
  MARKET_CONFIGS,
  DEFAULT_FACILITIES_LEVELS,
} from '@/lib/game-engine';
import {
  Clapperboard,
  Building2,
  Globe2,
  Film,
  Trophy,
  Newspaper,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowUpCircle,
  X,
  Calendar,
  Award,
  Tv,
} from 'lucide-react';
import {
  playClickSound,
  playTabSwitchSound,
  playContractSignedSound,
} from '@/lib/game-audio';

type HubDrawerTab = 'none' | 'facilities' | 'markets' | 'archive';

interface StudioHubViewProps {
  selectedFacility: StudioFacilityId | null;
  onSelectFacility: (id: StudioFacilityId | null) => void;
}

export default function StudioHubView({
  selectedFacility,
  onSelectFacility,
}: StudioHubViewProps) {
  const {
    cash,
    marketValue,
    facilitiesLevels,
    upgradeStudioFacility,
    unlockedRegions,
    unlockMarketRegionWithCash,
    releasedProjects,
    worldHistory,
    activeScreen,
    setActiveScreen,
    resetDraftForNewProject,
    advanceGameDay,
  } = useGameStore();

  const [hubModalTab, setHubModalTab] = useState<HubDrawerTab>('none');
  const [showNewsDrawer, setShowNewsDrawer] = useState(false);

  const lvls = facilitiesLevels || DEFAULT_FACILITIES_LEVELS;
  const selectedFacilityMeta = selectedFacility
    ? STUDIO_FACILITY_CONFIGS.find((f) => f.id === selectedFacility) || null
    : null;
  const currentFacilityLevel = selectedFacility ? lvls[selectedFacility] || 1 : 1;
  const nextFacilityCost =
    selectedFacility && selectedFacilityMeta && currentFacilityLevel < selectedFacilityMeta.maxLevel
      ? getFacilityUpgradeCost(selectedFacility, currentFacilityLevel)
      : null;

  const handleUpgrade = (facId: StudioFacilityId) => {
    const res = upgradeStudioFacility(facId);
    if (res.ok) {
      playContractSignedSound();
    } else {
      playClickSound();
    }
  };

  return (
    <>
      {/* ===================================================================
          BUILDING INSPECTOR DRAWER (Left Side Floating Drawer over 3D City)
      =================================================================== */}
      {selectedFacility && selectedFacilityMeta && activeScreen === 'STUDIO_HUB' && (
        <div className="fixed left-3 top-11 z-20 w-64 rounded-2xl border border-amber-500/30 bg-slate-950/85 p-3 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.85)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                {selectedFacilityMeta.categoryLabel} • م{currentFacilityLevel}/{selectedFacilityMeta.maxLevel}
              </span>
              <h3 className="mt-1 text-xs font-black text-white">
                {selectedFacilityMeta.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onSelectFacility(null)}
              className="rounded-lg border border-slate-800 bg-slate-900 p-1 text-slate-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <p className="mt-1 text-[10px] leading-relaxed text-slate-300">
            {selectedFacilityMeta.description}
          </p>

          <p className="mt-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[9px] font-bold text-amber-300">
            {selectedFacilityMeta.impactSummary(currentFacilityLevel)}
          </p>

          {/* Level Bars */}
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <div
                key={lvl}
                className={`h-1.5 flex-1 rounded-full ${
                  lvl <= currentFacilityLevel
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>

          <div className="mt-2.5">
            {currentFacilityLevel >= selectedFacilityMeta.maxLevel ? (
              <div className="flex min-h-[32px] items-center justify-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>الحد الأقصى للتطوير مكتمل</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={nextFacilityCost !== null && cash < nextFacilityCost}
                onClick={() => handleUpgrade(selectedFacility)}
                className="flex min-h-[32px] w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1.5 text-[10px] font-black text-slate-950 shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
                <span>ترقية للمستوى {currentFacilityLevel + 1}</span>
                {nextFacilityCost !== null && (
                  <span className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[9px]">
                    {formatMoney(nextFacilityCost)}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          QUICK 3D BUILDING SELECTOR PILLS (Right Top Floating Strip in City Mode)
      =================================================================== */}
      {activeScreen === 'STUDIO_HUB' && hubModalTab === 'none' && (
        <div className="fixed right-2.5 top-11 z-20 flex flex-col gap-1">
          {STUDIO_FACILITY_CONFIGS.map((cfg) => {
            const lvl = lvls[cfg.id] || 1;
            const isSelected = selectedFacility === cfg.id;
            return (
              <button
                key={cfg.id}
                type="button"
                onClick={() => onSelectFacility(isSelected ? null : cfg.id)}
                className={`flex items-center gap-1.5 rounded-xl border px-2 py-1 text-[10px] font-bold backdrop-blur-md transition-all active:scale-95 ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/20 text-white shadow-sm'
                    : 'border-slate-800/80 bg-slate-950/75 text-slate-300 hover:border-amber-500/40'
                }`}
              >
                <span className="rounded bg-amber-500/20 px-1 py-0.2 font-mono text-[9px] font-black text-amber-300">
                  L{lvl}
                </span>
                <span className="hidden sm:inline truncate max-w-[110px]">
                  {cfg.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ===================================================================
          CENTER MODAL FOR FACILITIES / MARKETS / ARCHIVE
      =================================================================== */}
      {hubModalTab !== 'none' && activeScreen === 'STUDIO_HUB' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center pt-9 pb-11 px-2 sm:px-4 pointer-events-none">
          <div className="pointer-events-auto flex flex-col w-[88%] sm:w-[85%] max-w-5xl max-h-[80dvh] rounded-2xl border border-amber-500/25 bg-slate-950/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-3 py-1.5 shrink-0">
              <div className="flex items-center gap-2">
                {hubModalTab === 'facilities' && (
                  <>
                    <Building2 className="h-3.5 w-3.5 text-amber-400" />
                    <h2 className="text-xs font-black text-white">
                      تطوير مباني ومعدات مدينة الإنتاج
                    </h2>
                  </>
                )}
                {hubModalTab === 'markets' && (
                  <>
                    <Globe2 className="h-3.5 w-3.5 text-amber-400" />
                    <h2 className="text-xs font-black text-white">
                      خريطة أسواق التوزيع السينمائي العالمية
                    </h2>
                  </>
                )}
                {hubModalTab === 'archive' && (
                  <>
                    <Film className="h-3.5 w-3.5 text-amber-400" />
                    <h2 className="text-xs font-black text-white">
                      أرشيف الأفلام والمسلسلات المنتجة ({releasedProjects.length})
                    </h2>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setHubModalTab('none')}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:border-amber-500/40 hover:text-white"
              >
                <span>العودة للمدينة</span>
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-2.5 sm:p-3">
              {/* TAB: FACILITIES */}
              {hubModalTab === 'facilities' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {STUDIO_FACILITY_CONFIGS.map((cfg) => {
                    const lvl = lvls[cfg.id] || 1;
                    const nextCost =
                      lvl < cfg.maxLevel
                        ? getFacilityUpgradeCost(cfg.id, lvl)
                        : null;
                    const canAfford = nextCost !== null && cash >= nextCost;

                    return (
                      <div
                        key={cfg.id}
                        className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 hover:border-amber-500/30 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5">
                            <h3 className="text-xs font-black text-white">
                              {cfg.name}
                            </h3>
                            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-black text-amber-300">
                              Lv.{lvl}/{cfg.maxLevel}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                            {cfg.description}
                          </p>
                          <p className="mt-1 text-[9px] font-bold text-amber-300">
                            {cfg.impactSummary(lvl)}
                          </p>
                          <div className="mt-2 flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full ${
                                  i <= lvl ? 'bg-amber-400' : 'bg-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectFacility(cfg.id);
                              setHubModalTab('none');
                            }}
                            className="min-h-[30px] rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-amber-500/30 hover:text-white"
                          >
                            معاينة
                          </button>

                          {lvl >= cfg.maxLevel ? (
                            <div className="flex-1 text-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-1 text-[10px] font-black text-emerald-300">
                              مكتمل (Max)
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!canAfford}
                              onClick={() => handleUpgrade(cfg.id)}
                              className="flex-1 flex min-h-[30px] items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-2.5 py-1 text-[10px] font-black text-slate-950 disabled:opacity-40 active:scale-95 transition-all"
                            >
                              <ArrowUpCircle className="h-3 w-3" />
                              <span>ترقية ({formatMoney(nextCost || 0)})</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB: GLOBAL MARKETS */}
              {hubModalTab === 'markets' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MARKET_CONFIGS.map((region) => {
                    const isUnlocked = unlockedRegions.includes(region.id);
                    const meetsVal = marketValue >= region.unlockMarketValue;
                    const meetsCash = cash >= region.earlyLicenseCost;
                    const canUnlock = !isUnlocked && (meetsVal || meetsCash);

                    return (
                      <div
                        key={region.id}
                        className={`flex flex-col justify-between rounded-xl border p-2.5 transition-all ${
                          isUnlocked
                            ? 'border-amber-500/35 bg-slate-900/85'
                            : 'border-slate-800/80 bg-slate-900/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5">
                            <h3 className="text-xs font-black text-white">
                              {region.name}
                            </h3>
                            <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">
                              {region.badge}
                            </span>
                          </div>

                          <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                            {region.description}
                          </p>

                          <div className="mt-1.5 flex flex-wrap gap-1 text-[9px] font-bold">
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
                              قيمة سوقية للفتح المجاني: {formatMoney(region.unlockMarketValue)}
                            </span>
                            {region.distributionFeePerProject > 0 && (
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">
                                رسوم التوزيع للفيلم: {formatMoney(region.distributionFeePerProject)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2">
                          {isUnlocked ? (
                            <div className="flex min-h-[30px] items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-black text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>سوق مفتوح للتوزيع السينمائي</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!canUnlock}
                              onClick={() => {
                                playContractSignedSound();
                                unlockMarketRegionWithCash(region.id);
                              }}
                              className="flex min-h-[30px] w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-2.5 py-1 text-[10px] font-black text-slate-950 disabled:opacity-40 active:scale-95 transition-all"
                            >
                              <Lock className="h-3 w-3" />
                              <span>
                                {meetsVal
                                  ? 'فتح السوق مجاناً'
                                  : `ترخيص مبكر (${formatMoney(region.earlyLicenseCost)})`}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB: ARCHIVE */}
              {hubModalTab === 'archive' && (
                <div>
                  {releasedProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-8 text-center">
                      <Film className="h-7 w-7 text-slate-600 mb-2" />
                      <p className="text-xs font-bold text-slate-300">
                        لم يقم الاستوديو بإصدار أي أعمال بعد
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        ابدأ إنتاج عملك الأول ليظهر في الأرشيف السينمائي
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {releasedProjects.map((proj) => (
                        <div
                          key={proj.id}
                          className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-2.5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                                {proj.format === 'film' ? (
                                  <Film className="h-2.5 w-2.5" />
                                ) : (
                                  <Tv className="h-2.5 w-2.5" />
                                )}
                                {proj.format === 'film' ? 'فيلم' : 'مسلسل'} • #{proj.boxOfficeRank}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">
                                عام {proj.year}
                              </span>
                            </div>

                            <h3 className="mt-1 text-xs font-black text-white truncate">
                              {proj.title}
                            </h3>

                            <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px]">
                              <div className="rounded-lg bg-slate-950/70 px-2 py-1">
                                <span className="text-slate-400 block text-[9px]">
                                  النقاد / الجمهور
                                </span>
                                <span className="font-mono font-black text-amber-300">
                                  {proj.criticScore}/10 • ★{proj.audienceScore}
                                </span>
                              </div>
                              <div className="rounded-lg bg-slate-950/70 px-2 py-1">
                                <span className="text-slate-400 block text-[9px]">
                                  إجمالي الإيراد
                                </span>
                                <span className="font-mono font-black text-emerald-300">
                                  {formatMoney(proj.totalGrossRevenue)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {proj.awardsWon.length > 0 && (
                            <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-300 truncate">
                              <Award className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {proj.awardsWon.join(' • ')}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          COMPACT NEWS POPOVER (Optional Mini Drawer from Bottom Dock)
      =================================================================== */}
      {showNewsDrawer && (
        <div className="fixed bottom-12 left-3 z-30 w-72 sm:w-80 rounded-2xl border border-amber-500/30 bg-slate-950/90 p-2.5 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-300">
              <Newspaper className="h-3.5 w-3.5" />
              <span>سجل أحداث الصناعة</span>
            </div>
            <button
              type="button"
              onClick={() => setShowNewsDrawer(false)}
              className="rounded p-0.5 text-slate-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="max-h-36 space-y-1.5 overflow-y-auto scrollbar-hide">
            {worldHistory.slice(0, 6).map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-800/80 bg-slate-900/75 px-2 py-1 text-[10px] text-slate-300 leading-relaxed"
              >
                <span className="text-amber-400 font-mono font-bold ml-1">
                  [{item.year}]
                </span>
                {item.eventText}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================
          LAYER 3: FLOATING BOTTOM GAME DOCK (z-20)
      =================================================================== */}
      <nav className="fixed bottom-1.5 inset-x-0 z-20 flex items-center justify-center px-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 rounded-2xl border border-amber-500/25 bg-slate-950/80 px-2 py-1 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] overflow-x-auto scrollbar-hide max-w-full">
          {/* Primary CTA: Start / Continue Production */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setHubModalTab('none');
              if (activeScreen === 'STUDIO_HUB') {
                setActiveScreen('PROJECT_SETUP');
              } else {
                resetDraftForNewProject('PROJECT_SETUP');
              }
            }}
            className="flex min-h-[32px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1 text-[10px] sm:text-xs font-black text-slate-950 shadow-sm transition-all hover:brightness-110 active:scale-95 shrink-0"
          >
            <Clapperboard className="h-3.5 w-3.5" />
            <span>إنتاج عمل جديد</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5 shrink-0" />

          {/* Studio 3D Map Tab */}
          <button
            type="button"
            onClick={() => {
              playTabSwitchSound();
              setHubModalTab('none');
              setActiveScreen('STUDIO_HUB');
            }}
            className={`flex min-h-[32px] items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95 shrink-0 ${
              activeScreen === 'STUDIO_HUB' && hubModalTab === 'none'
                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>المدينة</span>
          </button>

          {/* Facilities Tab */}
          <button
            type="button"
            onClick={() => {
              playTabSwitchSound();
              setActiveScreen('STUDIO_HUB');
              setHubModalTab(hubModalTab === 'facilities' ? 'none' : 'facilities');
            }}
            className={`flex min-h-[32px] items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95 shrink-0 ${
              hubModalTab === 'facilities' && activeScreen === 'STUDIO_HUB'
                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <Building2 className="h-3 w-3 text-amber-400" />
            <span>المرافق</span>
          </button>

          {/* Markets Tab */}
          <button
            type="button"
            onClick={() => {
              playTabSwitchSound();
              setActiveScreen('STUDIO_HUB');
              setHubModalTab(hubModalTab === 'markets' ? 'none' : 'markets');
            }}
            className={`flex min-h-[32px] items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95 shrink-0 ${
              hubModalTab === 'markets' && activeScreen === 'STUDIO_HUB'
                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <Globe2 className="h-3 w-3 text-emerald-400" />
            <span>الأسواق ({unlockedRegions.length})</span>
          </button>

          {/* Archive Tab */}
          <button
            type="button"
            onClick={() => {
              playTabSwitchSound();
              setActiveScreen('STUDIO_HUB');
              setHubModalTab(hubModalTab === 'archive' ? 'none' : 'archive');
            }}
            className={`flex min-h-[32px] items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95 shrink-0 ${
              hubModalTab === 'archive' && activeScreen === 'STUDIO_HUB'
                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <Film className="h-3 w-3 text-purple-400" />
            <span>الأرشيف ({releasedProjects.length})</span>
          </button>

          {/* Leaderboard Tab */}
          <button
            type="button"
            onClick={() => {
              playTabSwitchSound();
              setHubModalTab('none');
              setActiveScreen('LEADERBOARD_SETTINGS');
            }}
            className={`flex min-h-[32px] items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95 shrink-0 ${
              activeScreen === 'LEADERBOARD_SETTINGS'
                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <Trophy className="h-3 w-3 text-amber-400" />
            <span>التصنيف</span>
          </button>

          {/* Advance Days Button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              advanceGameDay(5);
            }}
            className="flex min-h-[32px] items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:border-amber-500/40 hover:text-amber-300 active:scale-95 shrink-0"
            title="تقدم 5 أيام في التقويم"
          >
            <Calendar className="h-3 w-3 text-amber-400" />
            <span className="hidden md:inline">+5 أيام</span>
          </button>

          {/* News Toggle Button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowNewsDrawer(!showNewsDrawer);
            }}
            className={`flex min-h-[32px] items-center gap-1 rounded-xl border px-2 py-1 text-[10px] font-bold transition-all active:scale-95 shrink-0 ${
              showNewsDrawer
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white'
            }`}
            title="سجل الأخبار"
          >
            <Newspaper className="h-3 w-3 text-amber-400" />
          </button>
        </div>
      </nav>
    </>
  );
}
