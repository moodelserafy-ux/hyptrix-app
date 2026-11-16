'use client';

import React, { useMemo, useState } from 'react';
import {
  useGameStore,
  CrisisEventItem,
  ReleasedProjectRecord,
  getLiveActorsWithEvolution,
} from '@/lib/store';
import {
  formatMoney,
  MARKET_CONFIGS,
  FilmReleaseSeason,
  SeriesSeason,
  calculateFinancialsAndQuality,
  generateRivalReleases,
  DEFAULT_FACILITIES_LEVELS,
} from '@/lib/game-engine';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { AnimatedFilmingSetGraphic } from './CinematicGraphicsScene';
import {
  Coins,
  Megaphone,
  Globe2,
  Calendar,
  Clapperboard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Tv,
  ShieldAlert,
} from 'lucide-react';
import {
  playClickSound,
  playTabSwitchSound,
  playCrisisAlertSound,
  playContractSignedSound,
} from '@/lib/game-audio';

const DEFAULT_CRISES: CrisisEventItem[] = [
  {
    id: 'crisis_set_weather',
    title: 'عاصفة مفاجئة تهدد ديكورات التصوير الخارجي',
    description:
      'ضربت رياح شديدة موقع التصوير الخارجي الرئيسي قبل تصوير مشهد الذروة، والطاقم ينتظر قرارك الإداري الفوري.',
    optionA: {
      label: 'نقل المشهد لأحدث بلاتوه مغلق وتأمين المعدات (4M)',
      cost: 4_000_000,
      hypeDelta: 5,
      qualityDelta: 6,
    },
    optionB: {
      label: 'اختصار المشهد والتصوير بالكاميرات المحمولة فوراً (مجاناً)',
      cost: 0,
      hypeDelta: -2,
      qualityDelta: -4,
    },
  },
  {
    id: 'crisis_star_stunt',
    title: 'مطالبة بطل العمل بمشهد أكشن حقيقي خطير',
    description:
      'أصر نجم الشباك على أداء مشهد المطاردة بنفسه بدون دوبلير لزيادة مصداقية العمل أمام الجمهور.',
    optionA: {
      label: 'استقدام فريق تأمين وخدع عالمي لتنفيذ اللقطة (5M)',
      cost: 5_000_000,
      hypeDelta: 10,
      qualityDelta: 7,
    },
    optionB: {
      label: 'الاعتماد على دوبلير محترف ومونتاج سريع (1M)',
      cost: 1_000_000,
      hypeDelta: 2,
      qualityDelta: 1,
    },
  },
];

export default function Stage4ProductionCrises() {
  const {
    draft,
    cash,
    currentYear,
    gameDay,
    founderPerk,
    currentRegion,
    unlockedRegions,
    facilitiesLevels,
    releasedProjects,
    aiGeneratedActors,
    actorDynamicState,
    emergingCompetitors,
    customDbPatch,
    updateDraft,
    toggleDraftDistributionMarket,
    resolveCrisisOption,
    applyEmergencyGulfBailout,
    completeProjectRelease,
    setActiveScreen,
  } = useGameStore();

  const [phase, setPhase] = useState<'budget' | 'filming'>('budget');
  const [budgetTab, setBudgetTab] = useState<'alloc' | 'markets' | 'schedule'>(
    'alloc'
  );
  const [crisisIndex, setCrisisIndex] = useState(0);

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch),
    [customDbPatch]
  );

  const liveActors = useMemo(
    () =>
      getLiveActorsWithEvolution({
        baseActors: db.actors,
        aiGeneratedActors,
        actorDynamicState,
        currentYear,
        gameDay,
      }),
    [db.actors, aiGeneratedActors, actorDynamicState, currentYear, gameDay]
  );

  const directorObj = useMemo(
    () =>
      db.crew.find((c) => c.id === draft.directorId) ||
      db.crew.find((c) => c.role === 'director')!,
    [db.crew, draft.directorId]
  );

  const leadActorObjs = useMemo(
    () => liveActors.filter((a) => draft.leadActorIds.includes(a.id)),
    [liveActors, draft.leadActorIds]
  );

  const prodSpendTotal =
    draft.budgetAllocation.setsAndLocations +
    draft.budgetAllocation.costumesAndMakeup +
    draft.budgetAllocation.vfxAndStunts +
    draft.budgetAllocation.extrasAndCrowds;

  const totalCastSalaries = useMemo(() => {
    let sum = directorObj ? directorObj.base_salary : 0;
    leadActorObjs.forEach((a) => {
      sum += a.base_salary;
    });
    return sum;
  }, [directorObj, leadActorObjs]);

  const totalEstimatedCost =
    prodSpendTotal + draft.marketingBudget + totalCastSalaries;

  const activeCrisesList =
    draft.crises.length > 0 ? draft.crises : DEFAULT_CRISES;
  const currentCrisis = activeCrisesList[crisisIndex] || null;
  const isFilmingDone = crisisIndex >= activeCrisesList.length;

  const handleStartFilming = () => {
    playCrisisAlertSound();
    if (draft.crises.length === 0) {
      updateDraft({ crises: DEFAULT_CRISES });
    }
    setCrisisIndex(0);
    setPhase('filming');
  };

  const handleResolveChoice = (choice: 'A' | 'B' | 'VIP') => {
    if (!currentCrisis) return;
    playContractSignedSound();
    if (choice === 'VIP') {
      applyEmergencyGulfBailout(currentCrisis.id);
    } else {
      resolveCrisisOption(currentCrisis.id, choice);
    }
    setCrisisIndex((prev) => prev + 1);
  };

  const handleCompleteAndRelease = () => {
    playContractSignedSound();

    const writers = db.crew.filter((c) => draft.writerIds.includes(c.id));
    const dop = db.crew.find((c) => c.id === draft.dopId) || null;
    const composer = db.crew.find((c) => c.id === draft.composerId) || null;
    const vfx = db.crew.find((c) => c.id === draft.vfxId) || null;
    const antagonist =
      liveActors.find((a) => a.id === draft.antagonistId) || null;
    const supporting = liveActors.filter((a) =>
      draft.supportingActorIds.includes(a.id)
    );
    const cameos = liveActors.filter((a) =>
      draft.cameoActorIds.includes(a.id)
    );

    const scriptWords = draft.scriptSynopsis.trim().split(/\s+/).length;
    const prevGenres = releasedProjects.map((p) => p.primaryGenre);

    const sim = calculateFinancialsAndQuality({
      format: draft.format,
      episodes: draft.episodes,
      seriesSeason: draft.seriesSeason,
      filmSeason: draft.filmSeason,
      primaryGenre: draft.primaryGenre,
      secondaryGenre: draft.secondaryGenre,
      ageRating: draft.ageRating,
      director: directorObj,
      writers,
      dop,
      composer,
      vfx,
      leads: leadActorObjs,
      antagonist,
      supporting,
      cameos,
      budgetAllocation: draft.budgetAllocation,
      marketingBudget: draft.marketingBudget,
      screensCount: draft.screensCount,
      platformDealAmount: draft.platformDealAmount,
      founderPerk,
      hypeScore: draft.hypeScore,
      aiBoxOfficeMultiplier: 1.0,
      marketRegion: currentRegion,
      selectedDistributionMarkets: draft.selectedDistributionMarkets,
      scriptWordCount: scriptWords,
      facilitiesLevels: facilitiesLevels || DEFAULT_FACILITIES_LEVELS,
      previousGenres: prevGenres,
      entropySeed: gameDay + currentYear,
    });

    const rawCritic = Math.min(
      9.6,
      Math.max(
        4.5,
        Number(
          (
            sim.technicalQuality / 10 +
            draft.qualityModifier * 0.08 +
            sim.criticDeltaFromTwists
          ).toFixed(1)
        )
      )
    );
    const rawAudience = Math.min(
      9.7,
      Math.max(
        4.8,
        Number(
          (
            (sim.starPower * 0.45 + sim.technicalQuality * 0.55) / 10 +
            sim.audienceDeltaFromTwists
          ).toFixed(1)
        )
      )
    );

    const rivalReleases = generateRivalReleases(
      [...db.competitor_studios, ...emergingCompetitors],
      liveActors,
      draft.leadActorIds,
      1.0,
      gameDay + currentYear,
      draft.format
    );

    const higherRivalsCount = rivalReleases.filter(
      (r) => r.status !== 'delayed' && r.boxOfficeRevenue > sim.totalGrossRevenue
    ).length;

    const totalCostWithDist = totalEstimatedCost + sim.distributionFeesTotal;
    const netProfit = sim.totalGrossRevenue - totalCostWithDist;

    const newRecord: ReleasedProjectRecord = {
      id: `proj_${Date.now()}`,
      title: draft.title || 'الفرعون الأخير',
      year: currentYear,
      format: draft.format,
      episodes: draft.episodes,
      seasonName:
        draft.format === 'series'
          ? draft.seriesSeason === 'ramadan'
            ? 'موسم رمضان'
            : ' خارج الموسم'
          : draft.filmSeason === 'eid_adha'
          ? 'موسم عيد الأضحى'
          : draft.filmSeason === 'eid_fitr'
          ? 'موسم عيد الفطر'
          : 'موسم الصيف',
      primaryGenre: draft.primaryGenre,
      secondaryGenre: draft.secondaryGenre,
      ageRating: draft.ageRating,
      synopsis: draft.scriptSynopsis,
      directorId: directorObj.id,
      directorName: directorObj.name,
      leadNames: leadActorObjs.map((a) => a.name),
      antagonistName: antagonist?.name,
      cameoNames: cameos.map((a) => a.name),
      actorIdsInCast: [
        ...draft.leadActorIds,
        ...(draft.antagonistId ? [draft.antagonistId] : []),
        ...draft.supportingActorIds,
      ],
      castCustomRoles: draft.castCustomRoles,
      totalBudget: totalCostWithDist,
      distributionFeesTotal: sim.distributionFeesTotal,
      selectedDistributionMarkets: draft.selectedDistributionMarkets,
      marketRevenueBreakdown: sim.marketRevenueBreakdown,
      firstWeekRevenue: sim.firstWeekRevenue,
      boxOfficeRevenue: sim.totalBoxOfficeRevenue,
      streamingRevenue: sim.totalStreamingRevenue,
      totalGrossRevenue: sim.totalGrossRevenue,
      netProfit,
      criticScore: rawCritic,
      audienceScore: rawAudience,
      boxOfficeRank: 1 + higherRivalsCount,
      reviews: [
        {
          criticName: 'طارق الشناوي الفني',
          publication: 'مجلة الشاشة الذهبية',
          sentiment: rawCritic >= 7.5 ? 'positive' : 'mixed',
          quote:
            rawCritic >= 7.5
              ? `عمل متكامل يجمع بين رؤية ${directorObj.name} وحضور أبطاله اللافت.`
              : `إنتاج ضخم بصرياً مع بعض الملاحظات على إيقاع السيناريو.`,
          score: rawCritic,
        },
        {
          criticName: 'ماجدة خير الله النقدية',
          publication: 'بوابة السينما العربية',
          sentiment: rawAudience >= 7.5 ? 'positive' : 'mixed',
          quote: `حقق العمل صدى جماهيرياً قوياً في صالات العرض والمنصات الرقمية.`,
          score: rawAudience,
        },
      ],
      socialPosts: [],
      viralTrendLabel:
        netProfit > 20_000_000
          ? 'تصدر شباك التذاكر والتريند الأول'
          : 'نقاشات فنية واسعة على المنصات',
      rivalReleases,
      awardsWon: [],
      releaseDayStart: gameDay,
      daysTracked: 3,
      simulationTwists: sim.simulationTwists,
    };

    completeProjectRelease(newRecord);
    setActiveScreen('RELEASE_SIMULATION');
  };

  // =========================================================================
  // PHASE 1: COMPACT BUDGET, MARKETING & DISTRIBUTION SUB-TABS (NO SCROLL)
  // =========================================================================
  if (phase === 'budget') {
    return (
      <div className="space-y-2.5">
        {/* Sub-Tabs Navigation + Total Cost Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-900/75 px-2.5 py-1.5">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {[
              { id: 'alloc', label: '1. الميزانية والتسويق', icon: Coins },
              { id: 'markets', label: '2. الأسواق والمنصات', icon: Globe2 },
              { id: 'schedule', label: '3. الموسم والقاعات', icon: Calendar },
            ].map((t) => {
              const Icon = t.icon;
              const active = budgetTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    playTabSwitchSound();
                    setBudgetTab(t.id as 'alloc' | 'markets' | 'schedule');
                  }}
                  className={`flex min-h-[28px] items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all shrink-0 ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-400">إجمالي التكلفة:</span>
            <span
              className={`font-mono font-black ${
                totalEstimatedCost > cash ? 'text-rose-400' : 'text-emerald-300'
              }`}
            >
              {formatMoney(totalEstimatedCost)}
            </span>
          </div>
        </div>

        {/* SUB-TAB 1: PRODUCTION BUDGET & MARKETING */}
        {budgetTab === 'alloc' && (
          <div className="grid grid-cols-12 gap-2.5">
            {/* Production Budget Presets */}
            <div className="col-span-12 md:col-span-6 rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">
                  ميزانية الديكور والخدع البصرية
                </span>
                <span className="font-mono text-xs font-black text-amber-300">
                  {formatMoney(prodSpendTotal)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  {
                    label: 'إنتاج اقتصادي (14M)',
                    alloc: {
                      setsAndLocations: 5_000_000,
                      costumesAndMakeup: 2_000_000,
                      vfxAndStunts: 5_000_000,
                      extrasAndCrowds: 2_000_000,
                    },
                  },
                  {
                    label: 'إنتاج قياسي (25M)',
                    alloc: {
                      setsAndLocations: 8_000_000,
                      costumesAndMakeup: 4_000_000,
                      vfxAndStunts: 10_000_000,
                      extrasAndCrowds: 3_000_000,
                    },
                  },
                  {
                    label: 'إنتاج ضخم (40M)',
                    alloc: {
                      setsAndLocations: 13_000_000,
                      costumesAndMakeup: 6_000_000,
                      vfxAndStunts: 16_000_000,
                      extrasAndCrowds: 5_000_000,
                    },
                  },
                  {
                    label: 'ملحمي عالمي (60M)',
                    alloc: {
                      setsAndLocations: 20_000_000,
                      costumesAndMakeup: 8_000_000,
                      vfxAndStunts: 24_000_000,
                      extrasAndCrowds: 8_000_000,
                    },
                  },
                ].map((preset) => {
                  const sum =
                    preset.alloc.setsAndLocations +
                    preset.alloc.costumesAndMakeup +
                    preset.alloc.vfxAndStunts +
                    preset.alloc.extrasAndCrowds;
                  const active = prodSpendTotal === sum;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        updateDraft({ budgetAllocation: preset.alloc });
                      }}
                      className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-black'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Marketing Campaign Budget */}
            <div className="col-span-12 md:col-span-6 rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-black text-white">
                  <Megaphone className="h-3.5 w-3.5 text-amber-400" />
                  <span>ميزانية الحملة الإعلانية والترويج</span>
                </span>
                <span className="font-mono text-xs font-black text-emerald-300">
                  {formatMoney(draft.marketingBudget)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'حملة رقمية (8M)', val: 8_000_000, hype: 62 },
                  { label: 'إعلانات شوارع وقنوات (15M)', val: 15_000_000, hype: 74 },
                  { label: 'حملة مكثفة شاملة (25M)', val: 25_000_000, hype: 86 },
                  { label: 'طوفان إعلاني وعروض خاصة (38M)', val: 38_000_000, hype: 96 },
                ].map((m) => {
                  const active = draft.marketingBudget === m.val;
                  return (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        updateDraft({
                          marketingBudget: m.val,
                          hypeScore: m.hype,
                        });
                      }}
                      className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-black'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: TARGET MARKETS & STREAMING PLATFORMS */}
        {budgetTab === 'markets' && (
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-12 md:col-span-7 rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5">
              <span className="block text-xs font-black text-white mb-1.5">
                أسواق التوزيع المختارة للعرض ({draft.selectedDistributionMarkets.length})
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {MARKET_CONFIGS.filter((r) =>
                  unlockedRegions.includes(r.id)
                ).map((region) => {
                  const active = draft.selectedDistributionMarkets.includes(
                    region.id
                  );
                  return (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        toggleDraftDistributionMarket(region.id);
                      }}
                      className={`flex items-center justify-between rounded-xl border p-2 text-right transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-500/15'
                          : 'border-slate-800 bg-slate-950/75 opacity-70'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="block text-[11px] font-black text-white truncate">
                          {region.name}
                        </span>
                        <span className="text-[9px] text-emerald-300 font-bold">
                          {region.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="col-span-12 md:col-span-5 rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5">
              <span className="flex items-center gap-1 text-xs font-black text-white mb-1.5">
                <Tv className="h-3.5 w-3.5 text-amber-400" />
                <span>عقد منصة البث الرقمي</span>
              </span>
              <div className="space-y-1.5 max-h-[32dvh] overflow-y-auto scrollbar-hide">
                {db.streaming_platforms.slice(0, 4).map((plat) => {
                  const active = draft.selectedPlatformId === plat.id;
                  return (
                    <button
                      key={plat.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        updateDraft({
                          selectedPlatformId: plat.id,
                          platformDealAmount: plat.budget_capacity,
                        });
                      }}
                      className={`w-full flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-right transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-500/15'
                          : 'border-slate-800 bg-slate-950/80'
                      }`}
                    >
                      <span className="text-[11px] font-black text-white">
                        {plat.name}
                      </span>
                      <span className="font-mono text-[10px] font-black text-emerald-300">
                        {formatMoney(plat.budget_capacity)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: RELEASE SEASON & SCREENS COUNT */}
        {budgetTab === 'schedule' && (
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-12 md:col-span-6 rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 space-y-1.5">
              <span className="block text-xs font-black text-white">
                موسم الطرح والعرض الجماهيري
              </span>
              {draft.format === 'film' ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'eid_adha', label: 'موسم عيد الأضحى (+15%)' },
                      { id: 'eid_fitr', label: 'موسم عيد الفطر (+12%)' },
                      { id: 'summer', label: 'موسم الصيف السينمائي' },
                      { id: 'mid_year', label: 'إجازة منتصف العام' },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        updateDraft({ filmSeason: s.id as FilmReleaseSeason })
                      }
                      className={`rounded-xl border p-2 text-right text-[11px] font-black ${
                        draft.filmSeason === s.id
                          ? 'border-amber-400 bg-amber-500/15 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'ramadan', label: 'الموسم الرمضاني الكبير (+18%)' },
                      { id: 'off_season', label: 'موسم المنصات الشتوي' },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        updateDraft({ seriesSeason: s.id as SeriesSeason })
                      }
                      className={`rounded-xl border p-2 text-right text-[11px] font-black ${
                        draft.seriesSeason === s.id
                          ? 'border-amber-400 bg-amber-500/15 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-12 md:col-span-6 rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 space-y-1.5">
              <span className="block text-xs font-black text-white">
                عدد شاشات وقاعات العرض ({draft.screensCount} قاعة)
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[80, 140, 200, 280].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => updateDraft({ screensCount: cnt })}
                    className={`rounded-xl border py-2 font-mono text-xs font-black ${
                      draft.screensCount === cnt
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveScreen('CREW_CAST_CARDS');
            }}
            className="flex min-h-[32px] items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-300"
          >
            <ArrowRight className="h-3 w-3" />
            <span>العودة للطاقم</span>
          </button>

          <button
            type="button"
            onClick={handleStartFilming}
            className="flex min-h-[32px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1 text-xs font-black text-slate-950 shadow-sm hover:brightness-110 active:scale-95"
          >
            <Clapperboard className="h-3.5 w-3.5" />
            <span>بدء التصوير الفعلي في البلاتوه</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PHASE 2: WIDESCREEN 2-COLUMN 3D FILMING SET + LIVE CRISIS RESOLUTION
  // =========================================================================
  return (
    <div className="grid grid-cols-12 gap-3 items-stretch">
      {/* Right 5 Columns: Live 3D Soundstage Filming Set */}
      <div className="col-span-12 lg:col-span-5 flex flex-col justify-between space-y-2">
        <AnimatedFilmingSetGraphic
          title={draft.title || 'الفرعون الأخير'}
          genre={draft.primaryGenre}
          leadName={leadActorObjs[0]?.name || 'بطل العمل'}
          directorName={directorObj?.name || 'مخرج العمل'}
          dayCurrent={Math.min(crisisIndex + 1, activeCrisesList.length)}
          dayTotal={activeCrisesList.length}
          isComplete={isFilmingDone}
        />

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
            <span className="block text-[9px] text-slate-400">زخم الجمهور</span>
            <span className="font-mono text-xs font-black text-amber-300">
              {draft.hypeScore}%
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
            <span className="block text-[9px] text-slate-400">معدل الإتقان</span>
            <span className="font-mono text-xs font-black text-purple-300">
              {draft.qualityModifier >= 0
                ? `+${draft.qualityModifier}`
                : draft.qualityModifier}
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
            <span className="block text-[9px] text-slate-400">خزينة الاستوديو</span>
            <span className="font-mono text-xs font-black text-emerald-300">
              {formatMoney(cash)}
            </span>
          </div>
        </div>
      </div>

      {/* Left 7 Columns: Crisis Decision Panel or Completion Card */}
      <div className="col-span-12 lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-900/80 p-3">
        {!isFilmingDone && currentCrisis ? (
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-black text-rose-300">
              <ShieldAlert className="h-3 w-3" />
              <span>
                موقف طارئ في موقع التصوير ({crisisIndex + 1} /{' '}
                {activeCrisesList.length})
              </span>
            </span>

            <h3 className="text-xs sm:text-sm font-black text-white">
              {currentCrisis.title}
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-300">
              {currentCrisis.description}
            </p>

            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleResolveChoice('A')}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/85 px-3 py-2 text-right hover:border-amber-500/40 hover:bg-slate-900 transition-all active:scale-[0.99]"
              >
                <span className="text-xs font-black text-white">
                  {currentCrisis.optionA.label}
                </span>
                <span className="font-mono text-[10px] font-bold text-amber-300 shrink-0">
                  +{currentCrisis.optionA.qualityDelta} جودة
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleResolveChoice('B')}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/85 px-3 py-2 text-right hover:border-amber-500/40 hover:bg-slate-900 transition-all active:scale-[0.99]"
              >
                <span className="text-xs font-black text-white">
                  {currentCrisis.optionB.label}
                </span>
                <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">
                  {currentCrisis.optionB.qualityDelta} جودة
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleResolveChoice('VIP')}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-right hover:bg-emerald-500/20 transition-all active:scale-[0.99]"
              >
                <span className="text-[11px] font-black text-emerald-300">
                  دعم استثماري طارئ (إنقاذ الموقف + تمويل إضافي)
                </span>
                <span className="font-mono text-[10px] font-black text-emerald-300 shrink-0">
                  +6 جودة
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-4 space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                اكتمل التصوير والمونتاج بنجاح!
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400 max-w-md">
                النسخة النهائية من «{draft.title}» جاهزة الآن للعرض الأول في صالات السينما والمنصات العالمية.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCompleteAndRelease}
              className="flex min-h-[34px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-1.5 text-xs font-black text-slate-950 shadow-md hover:brightness-110 active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>إطلاق العرض الأول ومحاكاة الإيرادات</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
