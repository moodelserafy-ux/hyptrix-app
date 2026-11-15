'use client';

import React, { useState } from 'react';
import {
  useGameStore,
  formatGameDate,
  getDaysRemainingUntilAnnualAwards,
} from '@/lib/store';
import { GENRES } from '@/lib/db-resolver';
import {
  MarketRegion,
  MARKET_CONFIGS,
  STUDIO_FACILITY_CONFIGS,
  DEFAULT_FACILITIES_LEVELS,
  getFacilityUpgradeCost,
  calculateFacilitiesBonuses,
  formatMoney,
} from '@/lib/game-engine';
import { StudioLogoSvg } from './StudioLogoSvg';
import { StudioCampus3D } from './StudioCampus3D';
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

  const [activeTab, setActiveTab] = useState<
    'facilities' | 'markets' | 'archive' | 'leaderboard'
  >('facilities');
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
      ? 'إمبراطور السينما الملياردير'
      : marketValue >= 550_000_000
      ? 'عملاق الإنتاج الدولي'
      : marketValue >= 260_000_000
      ? 'قطب الإنتاج الإقليمي'
      : 'منتج سينمائي صاعد';

  const hasActiveProject = Boolean(draft.title.trim());
  const offerList = Object.values(draft.talentOffers || {});
  const pendingOffersCount = offerList.filter((n) => n.status === 'pending').length;

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
    <div className="mx-auto max-w-4xl space-y-6 py-2">
      {/* Clean Studio Command Header (Uncluttered, Zero-Pill Metadata Discipline) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4 min-w-0">
            <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <StudioLogoSvg config={logo} size={64} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{studioRankTitle}</span>
                <span aria-hidden="true">·</span>
                <span>المدير التنفيذي: {ceoName}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{formatGameDate(gameDay, currentYear)}</span>
              </div>

              <h1 className="font-display mt-1 truncate text-2xl font-black text-slate-900 sm:text-3xl">
                {studioName}
              </h1>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
                <span>السمعة: {reputation}%</span>
                <span aria-hidden="true">·</span>
                <span>الأعمال المطروحة: {releasedProjects.length}</span>
                <span aria-hidden="true">·</span>
                <span>الجوائز: {totalAwards}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {founderPerk === 'visionary_director'
                    ? 'مخرج عبقري (+10% جودة فنية)'
                    : founderPerk === 'marketing_whale'
                    ? 'حوت تسويق (+15% افتتاحية التذاكر)'
                    : 'مفاوض شرس (-15% أجور النجوم)'}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Production CTA Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => resetDraftForNewProject('PROJECT_SETUP')}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-violet-700 whitespace-nowrap"
            >
              <Clapperboard className="h-4 w-4 shrink-0" />
              <span>إنتاج عمل جديد (فيلم / مسلسل)</span>
            </button>

            {hasActiveProject && (
              <button
                type="button"
                onClick={handleResumeActiveProject}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-800 transition hover:bg-slate-100 whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5 fill-current text-violet-600" />
                <span>
                  استكمال «{draft.title}»
                  {pendingOffersCount > 0 ? ` (${pendingOffersCount} تفاوض)` : ''}
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Dominant Visual Anchor: Interactive 3D Physical Studio Campus & Equipment */}
      <section aria-label="المدينة الإنتاجية ثلاثية الأبعاد">
        <StudioCampus3D
          studioName={studioName}
          cash={cash}
          facilitiesLevels={facilitiesLevels}
          onUpgradeFacility={(facId) => {
            const res = upgradeStudioFacility(facId);
            setStatusMessage(res.message);
            return res;
          }}
          isFilmingActive={Boolean(
            draft.filmingStartDay !== null &&
              draft.filmingDaysElapsed < draft.filmingDurationDays
          )}
        />
      </section>

      {/* Clean Segmented Navigation Tabs (1 Active Panel at a time = Zero Clutter) */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1">
          {[
            {
              id: 'facilities' as const,
              label: 'المباني والمعدات',
              icon: <Building2 className="h-3.5 w-3.5" />,
            },
            {
              id: 'markets' as const,
              label: 'خريطة التوزيع',
              icon: <Globe className="h-3.5 w-3.5" />,
            },
            {
              id: 'archive' as const,
              label: `أرشيف الأعمال (${releasedProjects.length})`,
              icon: <Film className="h-3.5 w-3.5" />,
            },
            {
              id: 'leaderboard' as const,
              label: 'ترتيب الشركات',
              icon: <Trophy className="h-3.5 w-3.5" />,
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">إعدادات وبيانات</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900">
          {statusMessage}
        </div>
      )}

      {/* TAB 1: Physical Studio Buildings & Equipment Upgrades */}
      {activeTab === 'facilities' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              طوّر مباني الاستوديو ومعدات التصوير لرفع جودة الإنتاج وزيادة القيمة السوقية لشركتك (+
              {formatMoney(facilityBonuses.physicalAssetsEquity)} ج.م قيمة أصول حالية).
            </span>
            <span className="font-bold text-slate-900 tabular-nums">
              إجمالي التطوير: {facilityBonuses.totalLevels} / 25
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {STUDIO_FACILITY_CONFIGS.map((fac) => {
              const lvl = facilitiesLevels[fac.id] || 1;
              const isMax = lvl >= fac.maxLevel;
              const cost = getFacilityUpgradeCost(fac.id, lvl);
              const canAfford = cash >= cost;

              return (
                <div
                  key={fac.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{fac.categoryLabel}</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        المستوى {lvl} / {fac.maxLevel}
                      </span>
                    </div>

                    <h3 className="font-display mt-1 text-base font-bold text-slate-900">
                      {fac.name}
                    </h3>
                    <div className="mt-0.5 text-xs font-semibold text-violet-700">
                      {fac.levelTitles[lvl - 1]}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {fac.description}
                    </p>

                    <div className="mt-3 border-t border-slate-100 pt-2.5 text-xs font-semibold text-emerald-700">
                      الأثر الحالي: {fac.impactSummary(lvl)}
                    </div>
                  </div>

                  <div className="mt-4 pt-2">
                    {isMax ? (
                      <div className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>وصل للمستوى الأقصى</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => {
                          const res = upgradeStudioFacility(fac.id);
                          setStatusMessage(res.message);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
                      >
                        <ArrowUpCircle className="h-4 w-4 shrink-0 text-amber-400" />
                        <span className="tabular-nums">
                          تطوير للمستوى {lvl + 1} · {formatMoney(cost)} ج.م
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: Global Distribution Markets */}
      {activeTab === 'markets' && (
        <section className="space-y-4">
          <p className="text-xs leading-relaxed text-slate-600">
            حدد الأسواق المفتوحة التي ترغب في توزيع فيلمك أو مسلسلك القادم فيها. كل سوق خارجي يضيف رسوم توزيع إلى ميزانية العمل مقابل مضاعفة إيرادات شباك التذاكر والمنصات.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MARKET_CONFIGS.map((cfg) => {
              const regId = cfg.id;
              const unlocked = unlockedRegions.includes(regId);
              const isSelected = activeDistMarkets.includes(regId);
              const bonusPct = Math.round(cfg.revenueBonusFactor * 100);

              return (
                <div
                  key={regId}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{unlocked ? 'سوق مفتوح للتوزيع' : 'سوق مغلق'}</span>
                      <span className="font-bold text-emerald-700 tabular-nums">
                        {regId === 'egypt' ? 'العائد الأساسي 100%' : `+${bonusPct}% عائد إضافي`}
                      </span>
                    </div>

                    <h3 className="font-display mt-1 text-base font-bold text-slate-900">
                      {cfg.name}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {cfg.description}
                    </p>

                    <div className="mt-3 text-xs text-slate-700 tabular-nums">
                      {cfg.distributionFeePerProject === 0
                        ? 'رسوم التوزيع: مشمولة بالميزانية الأساسية'
                        : `رسوم توزيع العمل الواحد: ${formatMoney(cfg.distributionFeePerProject)} ج.م`}
                    </div>
                  </div>

                  <div className="mt-4 pt-2">
                    {unlocked ? (
                      <button
                        type="button"
                        disabled={regId === 'egypt'}
                        onClick={() => toggleDraftDistributionMarket(regId)}
                        className={`w-full rounded-xl py-2.5 px-4 text-xs font-bold transition whitespace-nowrap ${
                          regId === 'egypt'
                            ? 'bg-slate-100 text-slate-600 cursor-default'
                            : isSelected
                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                            : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {regId === 'egypt'
                          ? 'مفعل دائماً كسوق أساسي'
                          : isSelected
                          ? 'مفعل للعمل القادم (اضغط للإلغاء)'
                          : 'تفعيل التوزيع في هذا السوق'}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[11px] text-slate-500 tabular-nums">
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
                                : 'الرصيد النقدي في الخزينة غير كافٍ حالياً.'
                            );
                          }}
                          className="w-full rounded-xl bg-slate-900 py-2.5 px-4 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
                        >
                          <Lock className="inline h-3.5 w-3.5 ml-1" />
                          <span>فتح رخصة مبكرة ({formatMoney(cfg.earlyLicenseCost)} ج.م)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 3: Studio Archive & Annual Awards */}
      {activeTab === 'archive' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <div className="text-xs text-slate-500">
                الحفل السنوي الكبير للجوائز · عام {currentYear}
              </div>
              <div className="font-display mt-0.5 text-base font-bold text-slate-900">
                متبقي {daysUntilAnnualAwards} يوم على انطلاق حفل جوائز نهاية العام
              </div>
              <div className="mt-1 text-xs text-slate-600 tabular-nums">
                إجمالي إيرادات تاريخ الشركة: {formatMoney(lifetimeBoxOffice)} ج.م · الجوائز المحققة: {totalAwards}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveScreen('FESTIVALS_AWARDS')}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-100 whitespace-nowrap"
            >
              <Trophy className="h-4 w-4 text-amber-500" />
              <span>سجل وترشيحات الحفل السنوي</span>
            </button>
          </div>

          {releasedProjects.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              لم تطرح أي فيلم أو مسلسل بعد. ابدأ مشروعك الأول من زر «إنتاج عمل جديد» أعلاه.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {releasedProjects.map((proj) => {
                const genreObj = GENRES.find((g) => g.id === proj.primaryGenre);
                return (
                  <div
                    key={proj.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {proj.format === 'film' ? 'فيلم سينمائي' : 'مسلسل درامي'} · {genreObj?.name} · {proj.year}
                      </span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        ★ {proj.criticScore}/10
                      </span>
                    </div>

                    <h3 className="font-display mt-1 text-base font-bold text-slate-900">
                      {proj.title}
                    </h3>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs tabular-nums">
                      <span className="text-slate-600">
                        الإيرادات: <strong className="text-slate-900">{formatMoney(proj.totalGrossRevenue)} ج.م</strong>
                      </span>
                      <span
                        className={`font-bold ${
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
        </section>
      )}

      {/* TAB 4: Leaderboard */}
      {activeTab === 'leaderboard' && <LeaderboardAndSettingsView />}
    </div>
  );
}
