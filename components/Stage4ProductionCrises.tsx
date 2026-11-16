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
import { getResolvedDatabase, GENRES } from '@/lib/db-resolver';
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
  Loader2,
  Sliders,
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
    groqApiKeyClient,
    preferredGroqModel,
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
  const [loadingCrisesAi, setLoadingCrisesAi] = useState(false);
  const [loadingReleaseAi, setLoadingReleaseAi] = useState(false);

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

  const antagonistObj = useMemo(
    () => liveActors.find((a) => a.id === draft.antagonistId) || null,
    [liveActors, draft.antagonistId]
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
    if (antagonistObj) sum += antagonistObj.base_salary;
    return sum;
  }, [directorObj, leadActorObjs, antagonistObj]);

  const totalEstimatedCost =
    prodSpendTotal + draft.marketingBudget + totalCastSalaries;

  const activeCrisesList =
    draft.crises.length > 0 ? draft.crises : DEFAULT_CRISES;
  const currentCrisis = activeCrisesList[crisisIndex] || null;
  const isFilmingDone = crisisIndex >= activeCrisesList.length;

  const updateBudgetItemMillions = (
    key: keyof typeof draft.budgetAllocation,
    millionsVal: number
  ) => {
    const clampedM = Math.max(0.5, Math.min(80, millionsVal));
    updateDraft({
      budgetAllocation: {
        ...draft.budgetAllocation,
        [key]: Math.round(clampedM * 1_000_000),
      },
    });
  };

  const handleStartFilmingWithAi = async () => {
    if (loadingCrisesAi) return;
    playCrisisAlertSound();
    setLoadingCrisesAi(true);
    try {
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'mid_production_crises',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            title: draft.title || 'الفرعون الأخير',
            synopsis: draft.scriptSynopsis,
            leadName: leadActorObjs[0]?.name || 'بطل العمل',
            antagonistName: antagonistObj?.name || 'الخصم الدرامي',
            ageRating: draft.ageRating,
            hasEgoClash: leadActorObjs.length > 1,
          },
        }),
      });
      const data = await res.json();
      if (data && Array.isArray(data.crises) && data.crises.length >= 2) {
        updateDraft({ crises: data.crises });
      } else if (draft.crises.length === 0) {
        updateDraft({ crises: DEFAULT_CRISES });
      }
    } catch {
      if (draft.crises.length === 0) {
        updateDraft({ crises: DEFAULT_CRISES });
      }
    } finally {
      setLoadingCrisesAi(false);
      setCrisisIndex(0);
      setPhase('filming');
    }
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

  const handleCompleteAndReleaseWithAi = async () => {
    if (loadingReleaseAi) return;
    playContractSignedSound();
    setLoadingReleaseAi(true);

    const writers = db.crew.filter((c) => draft.writerIds.includes(c.id));
    const dop = db.crew.find((c) => c.id === draft.dopId) || null;
    const composer = db.crew.find((c) => c.id === draft.composerId) || null;
    const vfx = db.crew.find((c) => c.id === draft.vfxId) || null;
    const supporting = liveActors.filter((a) =>
      draft.supportingActorIds.includes(a.id)
    );
    const cameos = liveActors.filter((a) =>
      draft.cameoActorIds.includes(a.id)
    );

    const scriptWords = draft.scriptSynopsis.trim().split(/\s+/).length;
    const prevGenres = releasedProjects.map((p) => p.primaryGenre);
    const genreObj = GENRES.find((g) => g.id === draft.primaryGenre);

    const baseSim = calculateFinancialsAndQuality({
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
      antagonist: antagonistObj,
      supporting,
      cameos,
      budgetAllocation: draft.budgetAllocation,
      marketingBudget: draft.marketingBudget,
      screensCount: draft.screensCount,
      platformDealAmount:
        draft.platformDealAmount +
        (draft.format === 'series' ? draft.tvChannelDealAmount : 0),
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

    let aiEval: Record<string, unknown> | null = null;
    try {
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            title: draft.title || 'الفرعون الأخير',
            synopsis: draft.scriptSynopsis,
            directorName: directorObj?.name || 'المخرج',
            leadName: leadActorObjs[0]?.name || 'بطل العمل',
            antagonistName: antagonistObj?.name || 'الخصم الدرامي',
            primaryGenre: genreObj?.name || 'دراما',
            technicalQuality: baseSim.technicalQuality,
            format: draft.format,
            competitorStudios: [
              ...db.competitor_studios.map((s) => s.name),
              ...emergingCompetitors.map((s) => s.name),
            ],
            availableStars: liveActors.slice(0, 12).map((a) => a.name),
          },
        }),
      });
      aiEval = await res.json();
    } catch {
      aiEval = null;
    }

    const aiMultiplier =
      aiEval && typeof aiEval.box_office_multiplier === 'number'
        ? aiEval.box_office_multiplier
        : 1.0;

    const finalSim = calculateFinancialsAndQuality({
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
      antagonist: antagonistObj,
      supporting,
      cameos,
      budgetAllocation: draft.budgetAllocation,
      marketingBudget: draft.marketingBudget,
      screensCount: draft.screensCount,
      platformDealAmount:
        draft.platformDealAmount +
        (draft.format === 'series' ? draft.tvChannelDealAmount : 0),
      founderPerk,
      hypeScore: draft.hypeScore,
      aiBoxOfficeMultiplier: aiMultiplier,
      marketRegion: currentRegion,
      selectedDistributionMarkets: draft.selectedDistributionMarkets,
      scriptWordCount: scriptWords,
      facilitiesLevels: facilitiesLevels || DEFAULT_FACILITIES_LEVELS,
      previousGenres: prevGenres,
      entropySeed: gameDay + currentYear,
    });

    const finalCritic =
      aiEval && typeof aiEval.critic_score === 'number'
        ? aiEval.critic_score
        : Math.min(
            9.6,
            Math.max(
              4.5,
              Number(
                (
                  finalSim.technicalQuality / 10 +
                  draft.qualityModifier * 0.08 +
                  finalSim.criticDeltaFromTwists
                ).toFixed(1)
              )
            )
          );

    const finalAudience =
      aiEval && typeof aiEval.audience_score === 'number'
        ? aiEval.audience_score
        : Math.min(
            9.7,
            Math.max(
              4.8,
              Number(
                (
                  (finalSim.starPower * 0.45 +
                    finalSim.technicalQuality * 0.55) /
                    10 +
                  finalSim.audienceDeltaFromTwists
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
      (r) =>
        r.status !== 'delayed' && r.boxOfficeRevenue > finalSim.totalGrossRevenue
    ).length;

    const totalCostWithDist = totalEstimatedCost + finalSim.distributionFeesTotal;
    const netProfit = finalSim.totalGrossRevenue - totalCostWithDist;

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
            : 'خارج الموسم'
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
      antagonistName: antagonistObj?.name,
      cameoNames: cameos.map((a) => a.name),
      actorIdsInCast: [
        ...draft.leadActorIds,
        ...(draft.antagonistId ? [draft.antagonistId] : []),
        ...draft.supportingActorIds,
      ],
      castCustomRoles: draft.castCustomRoles,
      totalBudget: totalCostWithDist,
      distributionFeesTotal: finalSim.distributionFeesTotal,
      selectedDistributionMarkets: draft.selectedDistributionMarkets,
      marketRevenueBreakdown: finalSim.marketRevenueBreakdown,
      firstWeekRevenue: finalSim.firstWeekRevenue,
      boxOfficeRevenue: finalSim.totalBoxOfficeRevenue,
      streamingRevenue: finalSim.totalStreamingRevenue,
      totalGrossRevenue: finalSim.totalGrossRevenue,
      netProfit,
      criticScore: finalCritic,
      audienceScore: finalAudience,
      boxOfficeRank: 1 + higherRivalsCount,
      reviews:
        aiEval && Array.isArray(aiEval.reviews) && aiEval.reviews.length > 0
          ? (aiEval.reviews as ReleasedProjectRecord['reviews'])
          : [
              {
                criticName: 'طارق الشناوي الفني',
                publication: 'مجلة الشاشة الذهبية',
                sentiment: finalCritic >= 7.5 ? 'positive' : 'mixed',
                quote:
                  finalCritic >= 7.5
                    ? `عمل متكامل يجمع بين رؤية ${directorObj.name} وحضور أبطاله اللافت.`
                    : `إنتاج ضخم بصرياً مع بعض الملاحظات على إيقاع السيناريو.`,
                score: finalCritic,
              },
            ],
      socialPosts:
        aiEval && Array.isArray(aiEval.social_posts)
          ? (aiEval.social_posts as ReleasedProjectRecord['socialPosts'])
          : [],
      viralTrendLabel:
        aiEval && typeof aiEval.viral_trend_label === 'string'
          ? aiEval.viral_trend_label
          : netProfit > 20_000_000
          ? 'تصدر شباك التذاكر والتريند الأول'
          : 'نقاشات فنية واسعة على المنصات',
      rivalReleases,
      awardsWon: [],
      releaseDayStart: gameDay,
      daysTracked: 1,
      simulationTwists: finalSim.simulationTwists,
    };

    setLoadingReleaseAi(false);
    completeProjectRelease(newRecord);
    setActiveScreen('RELEASE_SIMULATION');
  };

  // =========================================================================
  // PHASE 1: FULL CUSTOM SLIDER & INPUT BUDGET + MARKETS + SCHEDULE
  // =========================================================================
  if (phase === 'budget') {
    return (
      <div className="space-y-2.5">
        {/* Sub-Tabs Navigation + Total Cost Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-900/75 px-2.5 py-1.5">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {[
              {
                id: 'alloc',
                label: '1. تحديد الميزانية الحرة والتسويق',
                icon: Sliders,
              },
              { id: 'markets', label: '2. الأسواق والمنصات والقنوات', icon: Globe2 },
              { id: 'schedule', label: '3. الموسم وعدد القاعات', icon: Calendar },
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
            <span className="text-slate-400">إجمالي التكلفة (شامل الأجور):</span>
            <span
              className={`font-mono font-black ${
                totalEstimatedCost > cash ? 'text-rose-400' : 'text-emerald-300'
              }`}
            >
              {formatMoney(totalEstimatedCost)}
            </span>
          </div>
        </div>

        {/* SUB-TAB 1: CUSTOM PRODUCTION BUDGET SLIDERS & INPUTS + MARKETING */}
        {budgetTab === 'alloc' && (
          <div className="grid grid-cols-12 gap-2.5">
            {/* 4 Custom Production Budget Sliders + Direct Inputs */}
            <div className="col-span-12 md:col-span-7 rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span>تخصيص بنود ميزانية الإنتاج (بالمليون ج.م)</span>
                </span>
                <span className="font-mono text-xs font-black text-amber-300">
                  {formatMoney(prodSpendTotal)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    {
                      key: 'setsAndLocations',
                      label: 'الديكورات ومواقع التصوير',
                      maxM: 45,
                    },
                    {
                      key: 'costumesAndMakeup',
                      label: 'الأزياء والمكياج',
                      maxM: 25,
                    },
                    {
                      key: 'vfxAndStunts',
                      label: 'المؤثرات البصرية والأكشن',
                      maxM: 50,
                    },
                    {
                      key: 'extrasAndCrowds',
                      label: 'المجاميع والكومبارس',
                      maxM: 20,
                    },
                  ] as const
                ).map((item) => {
                  const valRaw = draft.budgetAllocation[item.key];
                  const valM = Number((valRaw / 1_000_000).toFixed(1));
                  return (
                    <div
                      key={item.key}
                      className="rounded-lg border border-slate-800 bg-slate-950/85 p-2 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-200 truncate">
                          {item.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max={item.maxM}
                            value={valM}
                            onChange={(e) =>
                              updateBudgetItemMillions(
                                item.key,
                                Number(e.target.value || 1)
                              )
                            }
                            className="w-14 rounded border border-amber-500/40 bg-slate-900 px-1 py-0.5 text-center font-mono text-[10px] font-black text-amber-300 focus:outline-none"
                          />
                          <span className="text-[9px] text-slate-400">M</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={500_000}
                        max={item.maxM * 1_000_000}
                        step={500_000}
                        value={valRaw}
                        onChange={(e) =>
                          updateDraft({
                            budgetAllocation: {
                              ...draft.budgetAllocation,
                              [item.key]: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-amber-500 h-1.5 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Marketing Budget Slider + Direct Input */}
            <div className="col-span-12 md:col-span-5 rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 flex flex-col justify-between space-y-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-black text-white">
                    <Megaphone className="h-3.5 w-3.5 text-amber-400" />
                    <span>ميزانية الحملة التسويقية</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="70"
                      value={Number(
                        (draft.marketingBudget / 1_000_000).toFixed(1)
                      )}
                      onChange={(e) => {
                        const mVal = Math.max(
                          1,
                          Math.min(70, Number(e.target.value || 1))
                        );
                        const nextMkt = Math.round(mVal * 1_000_000);
                        const nextHype = Math.min(
                          98,
                          Math.max(45, Math.round(52 + mVal * 1.15))
                        );
                        updateDraft({
                          marketingBudget: nextMkt,
                          hypeScore: nextHype,
                        });
                      }}
                      className="w-16 rounded border border-emerald-500/40 bg-slate-950 px-1.5 py-0.5 text-center font-mono text-[11px] font-black text-emerald-300 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400">مليون</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={1_000_000}
                  max={60_000_000}
                  step={1_000_000}
                  value={draft.marketingBudget}
                  onChange={(e) => {
                    const nextMkt = Number(e.target.value);
                    const mVal = nextMkt / 1_000_000;
                    const nextHype = Math.min(
                      98,
                      Math.max(45, Math.round(52 + mVal * 1.15))
                    );
                    updateDraft({
                      marketingBudget: nextMkt,
                      hypeScore: nextHype,
                    });
                  }}
                  className="w-full accent-emerald-400 h-1.5 cursor-pointer"
                />

                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-[10px]">
                  <span className="text-slate-400">الترقب الجماهيري المتوقع:</span>
                  <span className="font-mono font-black text-rose-300">
                    {draft.hypeScore}% 🔥
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2 text-[10px] space-y-0.5">
                <div className="flex justify-between text-slate-400">
                  <span>أجور المخرج والنجوم:</span>
                  <span className="font-mono text-white font-bold">
                    {formatMoney(totalCastSalaries)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ميزانية التصوير والديكور:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {formatMoney(prodSpendTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>الحملة الإعلانية:</span>
                  <span className="font-mono text-emerald-300 font-bold">
                    {formatMoney(draft.marketingBudget)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: TARGET MARKETS, STREAMING PLATFORMS & TV CHANNELS */}
        {budgetTab === 'markets' && (
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-12 md:col-span-5 rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5">
              <span className="block text-xs font-black text-white mb-1.5">
                أسواق التوزيع المختارة ({draft.selectedDistributionMarkets.length})
              </span>
              <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto scrollbar-hide">
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
                      <span className="text-[11px] font-black text-white">
                        {region.name}
                      </span>
                      <span className="text-[9px] text-emerald-300 font-bold">
                        {region.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="col-span-12 md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Streaming Platforms */}
              <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5">
                <span className="flex items-center gap-1 text-xs font-black text-white mb-1.5">
                  <Tv className="h-3.5 w-3.5 text-amber-400" />
                  <span>عقد المنصة الرقمية</span>
                </span>
                <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-hide">
                  {db.streaming_platforms
                    .filter((p) => p.platform_type !== 'tv_channel')
                    .map((plat) => {
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
                          className={`w-full flex items-center justify-between rounded-xl border px-2 py-1.5 text-right transition-all ${
                            active
                              ? 'border-amber-400 bg-amber-500/15'
                              : 'border-slate-800 bg-slate-950/80'
                          }`}
                        >
                          <span className="text-[10px] font-black text-white truncate">
                            {plat.name}
                          </span>
                          <span className="font-mono text-[10px] font-black text-emerald-300 shrink-0">
                            {formatMoney(plat.budget_capacity)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* TV Channels */}
              <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5">
                <span className="flex items-center gap-1 text-xs font-black text-white mb-1.5">
                  <Tv className="h-3.5 w-3.5 text-purple-400" />
                  <span>عقد القناة الفضائية</span>
                </span>
                <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-hide">
                  {db.streaming_platforms
                    .filter((ch) => ch.platform_type === 'tv_channel')
                    .map((ch) => {
                      const active = draft.selectedTvChannelId === ch.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            updateDraft({
                              selectedTvChannelId: ch.id,
                              tvChannelDealAmount: ch.budget_capacity,
                            });
                          }}
                          className={`w-full flex items-center justify-between rounded-xl border px-2 py-1.5 text-right transition-all ${
                            active
                              ? 'border-amber-400 bg-amber-500/15'
                              : 'border-slate-800 bg-slate-950/80'
                          }`}
                        >
                          <span className="text-[10px] font-black text-white truncate">
                            {ch.name}
                          </span>
                          <span className="font-mono text-[10px] font-black text-purple-300 shrink-0">
                            {formatMoney(ch.budget_capacity)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: RELEASE SEASON & CUSTOM SCREENS SLIDER + INPUT */}
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

            <div className="col-span-12 md:col-span-6 rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">
                  عدد شاشات وقاعات السينما
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={20}
                    max={450}
                    step={10}
                    value={draft.screensCount}
                    onChange={(e) =>
                      updateDraft({
                        screensCount: Math.max(
                          20,
                          Math.min(450, Number(e.target.value || 100))
                        ),
                      })
                    }
                    className="w-16 rounded border border-amber-500/40 bg-slate-950 px-1.5 py-0.5 text-center font-mono text-xs font-black text-amber-300 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">قاعة</span>
                </div>
              </div>

              <input
                type="range"
                min={20}
                max={450}
                step={10}
                value={draft.screensCount}
                onChange={(e) =>
                  updateDraft({ screensCount: Number(e.target.value) })
                }
                className="w-full accent-amber-500 h-1.5 cursor-pointer"
              />

              <div className="grid grid-cols-4 gap-1.5">
                {[80, 140, 220, 320].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => updateDraft({ screensCount: cnt })}
                    className={`rounded-lg border py-1 font-mono text-[10px] font-black ${
                      draft.screensCount === cnt
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {cnt} قاعة
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
            disabled={loadingCrisesAi}
            onClick={handleStartFilmingWithAi}
            className="flex min-h-[32px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1 text-xs font-black text-slate-950 shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {loadingCrisesAi ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Clapperboard className="h-3.5 w-3.5" />
            )}
            <span>بدء التصوير الفعلي في البلاتوه</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PHASE 2: WIDESCREEN 2-COLUMN 3D FILMING SET + LIVE AI CRISIS RESOLUTION
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
                موقف إنتاجي في موقع التصوير ({crisisIndex + 1} /{' '}
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
                  دعم استثماري طارئ (إنقاذ الموقف + تمويل إضافي 30M)
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
                النسخة النهائية من «{draft.title}» جاهزة الآن للتقييم النقدي بالذكاء الاصطناعي والعرض الأول في صالات السينما والمنصات.
              </p>
            </div>

            <button
              type="button"
              disabled={loadingReleaseAi}
              onClick={handleCompleteAndReleaseWithAi}
              className="flex min-h-[34px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-1.5 text-xs font-black text-slate-950 shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {loadingReleaseAi ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>إطلاق العرض الأول وتقييم النقاد بالذكاء الاصطناعي</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
