'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  CrisisEventItem,
  DailyAiNewsItem,
  formatGameDate,
  getLiveActorsWithEvolution,
} from '@/lib/store';
import { getResolvedDatabase, GENRES } from '@/lib/db-resolver';
import { evaluateCastChemistry, formatMoney } from '@/lib/game-engine';
import {
  Camera,
  Sliders,
  AlertTriangle,
  Megaphone,
  Tv2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Calendar,
  Tv,
  Handshake,
  Radio,
} from 'lucide-react';

export function Stage4ProductionCrises() {
  const {
    draft,
    gameDay,
    currentYear,
    customDbPatch,
    aiGeneratedActors,
    actorDynamicState,
    groqApiKeyClient,
    preferredGroqModel,
    updateDraft,
    advanceGameDay,
    resolveCrisisOption,
    pushBreakingNewsModal,
    setActiveScreen,
  } = useGameStore();

  const db = getResolvedDatabase(customDbPatch);
  const [subStep, setSubStep] = useState<1 | 2>(
    draft.filmingStartDay !== null ? 2 : 1
  );
  const [maxUnlocked, setMaxUnlocked] = useState<1 | 2>(
    draft.filmingStartDay !== null ? 2 : 1
  );
  const [startOffsetDays, setStartOffsetDays] = useState<1 | 3 | 7>(1);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [selectedTvChannelId, setSelectedTvChannelId] = useState<string>('tv_1');
  const [negotiatedBroadcastBonus, setNegotiatedBroadcastBonus] =
    useState<boolean>(false);
  const [broadcastNegMessage, setBroadcastNegMessage] = useState<string | null>(
    null
  );
  const prevElapsedRef = useRef<number>(draft.filmingDaysElapsed);

  const liveActors = getLiveActorsWithEvolution({
    baseActors: db.actors,
    aiGeneratedActors,
    actorDynamicState,
    currentYear,
    gameDay,
  });
  const selectedLeads = liveActors.filter((a) =>
    draft.leadActorIds.includes(a.id)
  );
  const selectedAntagonist = liveActors.find(
    (a) => a.id === draft.antagonistId
  );
  const selectedDirector = db.crew.find((c) => c.id === draft.directorId);

  const chemistry = evaluateCastChemistry([
    ...selectedLeads,
    ...(selectedAntagonist ? [selectedAntagonist] : []),
  ]);

  const totalProdBudget =
    draft.budgetAllocation.setsAndLocations +
    draft.budgetAllocation.costumesAndMakeup +
    draft.budgetAllocation.vfxAndStunts +
    draft.budgetAllocation.extrasAndCrowds;

  const isSeries = draft.format === 'series';

  const digitalPlatforms = db.streaming_platforms.filter(
    (p) => p.platform_type === 'digital_platform' || p.id.startsWith('plat_')
  );
  const tvChannels = db.streaming_platforms.filter(
    (p) => p.platform_type === 'tv_channel' || p.id.startsWith('tv_')
  );

  const chosenDigitalPlat =
    digitalPlatforms.find((p) => p.id === draft.selectedPlatformId) ||
    digitalPlatforms[0];
  const chosenTvChannel =
    tvChannels.find((p) => p.id === selectedTvChannelId) || tvChannels[0];

  const computeCombinedDealAmount = (
    digId: string,
    tvId: string,
    hasBonus: boolean
  ) => {
    const dig =
      digitalPlatforms.find((p) => p.id === digId) || digitalPlatforms[0];
    const tv = tvChannels.find((p) => p.id === tvId) || tvChannels[0];
    const digOffer = Math.round(
      ((dig?.budget_capacity || 80) / 100) * (isSeries ? 26_000_000 : 28_000_000)
    );
    const tvOffer = isSeries
      ? Math.round(((tv?.budget_capacity || 85) / 100) * 22_000_000)
      : 0;
    const raw = digOffer + tvOffer;
    return hasBonus ? Math.round(raw * 1.15) : raw;
  };

  const handleSelectDigitalPlatform = (platId: string) => {
    const totalDeal = computeCombinedDealAmount(
      platId,
      selectedTvChannelId,
      negotiatedBroadcastBonus
    );
    updateDraft({
      selectedPlatformId: platId,
      platformDealAmount: totalDeal,
    });
  };

  const handleSelectTvChannel = (tvId: string) => {
    setSelectedTvChannelId(tvId);
    const totalDeal = computeCombinedDealAmount(
      draft.selectedPlatformId || digitalPlatforms[0]?.id || 'plat_1',
      tvId,
      negotiatedBroadcastBonus
    );
    updateDraft({
      platformDealAmount: totalDeal,
    });
  };

  const handleNegotiateBroadcastBoost = () => {
    if (negotiatedBroadcastBonus) return;
    setNegotiatedBroadcastBonus(true);
    const totalDeal = computeCombinedDealAmount(
      draft.selectedPlatformId || digitalPlatforms[0]?.id || 'plat_1',
      selectedTvChannelId,
      true
    );
    updateDraft({
      platformDealAmount: totalDeal,
    });
    setBroadcastNegMessage(
      isSeries
        ? `نجح التفاوض مع إدارة «${chosenDigitalPlat?.name}» وقناة «${chosenTvChannel?.name}» لرفع قيمة عقد العرض المشترك بنسبة +15% ليصل إلى ${formatMoney(totalDeal)} ج.م!`
        : `نجح التفاوض مع منصة «${chosenDigitalPlat?.name}» لرفع قيمة العرض الرقمي الحصري بنسبة +15% ليصل إلى ${formatMoney(totalDeal)} ج.م!`
    );
  };

  const calculatedDurationDays = isSeries
    ? draft.episodes === 30
      ? 10
      : 8
    : draft.budgetAllocation.vfxAndStunts >= 15_000_000
    ? 8
    : 6;

  const previewStartDay = draft.filmingStartDay ?? gameDay + startOffsetDays;
  const previewReleaseDay =
    draft.scheduledReleaseDay ?? previewStartDay + calculatedDurationDays;

  const triggerLiveProductionEvents = async (
    elapsedDays: number,
    currentDay: number,
    forceMilestoneNews = false
  ) => {
    if (loadingEvent) return;
    setLoadingEvent(true);
    try {
      if (draft.crises.length === 0 && elapsedDays >= 2) {
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
              leadName: selectedLeads[0]?.name || 'بطل العمل',
              antagonistName: selectedAntagonist?.name || 'الخصم الدرامي',
              ageRating: draft.ageRating,
              hasEgoClash: chemistry.hasSevereClash,
              format: draft.format,
            },
          }),
        });
        const data = await res.json();
        if (Array.isArray(data.crises)) {
          updateDraft({ crises: data.crises as CrisisEventItem[] });
        }
      }

      const isMilestoneDay =
        forceMilestoneNews ||
        elapsedDays === 2 ||
        elapsedDays === 5 ||
        elapsedDays >= calculatedDurationDays;

      const alreadyHasNewsForDay = (draft.productionNews || []).some(
        (n) => n.day === currentDay
      );

      if (
        isMilestoneDay &&
        !alreadyHasNewsForDay &&
        (draft.productionNews || []).length < 3
      ) {
        const genreAr =
          GENRES.find((g) => g.id === draft.primaryGenre)?.name ||
          draft.primaryGenre;
        const newsRes = await fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'generate_daily_news',
            groqKeyOverride: groqApiKeyClient,
            preferredModel: preferredGroqModel,
            payload: {
              phase: 'filming',
              gameDay: currentDay,
              day: elapsedDays,
              projectTitle: draft.title || 'الفرعون الأخير',
              title: draft.title || 'الفرعون الأخير',
              synopsis: draft.scriptSynopsis,
              leadName: selectedLeads[0]?.name || 'نجم العمل',
              directorName: selectedDirector?.name || 'مخرج العمل',
              primaryGenre: genreAr,
              currentHype: draft.hypeScore,
              format: draft.format,
            },
          }),
        });
        const newsData = await newsRes.json();
        if (newsData.headline) {
          const item: DailyAiNewsItem = {
            id: `news_${currentDay}_${(draft.productionNews || []).length}`,
            day: currentDay,
            headline: newsData.headline,
            detail: newsData.detail || '',
            impactType: newsData.impact_type || 'positive',
            hypeDelta: Number(newsData.hype_delta || 3),
            source: newsData.source,
          };
          updateDraft({
            hypeScore: Math.max(
              15,
              Math.min(100, draft.hypeScore + item.hypeDelta)
            ),
            productionNews: [item, ...(draft.productionNews || []).slice(0, 2)],
          });
          // Pop up sudden single-story breaking news on the main screen!
          pushBreakingNewsModal({
            id: item.id,
            day: currentDay,
            year: currentYear,
            category: 'production_news',
            badgeLabel: 'خبر عاجل من كواليس التصوير 🎬',
            headline: item.headline,
            detail: item.detail,
            highlightName: draft.title || 'الفرعون الأخير',
            extraStatBadge:
              item.hypeDelta >= 0
                ? `+${item.hypeDelta}% حماس الجمهور`
                : `${item.hypeDelta}% ترقب`,
          });
        }
      }
    } catch {
      // Fallback handled smoothly
    } finally {
      setLoadingEvent(false);
    }
  };

  // React automatically when the active-session game clock advances filmingDaysElapsed
  useEffect(() => {
    if (
      subStep === 2 &&
      draft.filmingDaysElapsed > prevElapsedRef.current &&
      !loadingEvent
    ) {
      prevElapsedRef.current = draft.filmingDaysElapsed;
      const timer = setTimeout(() => {
        void triggerLiveProductionEvents(
          draft.filmingDaysElapsed,
          gameDay,
          false
        );
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subStep, draft.filmingDaysElapsed, gameDay]);

  const handleLockPreProductionAndStartFilming = () => {
    const startDay = gameDay + startOffsetDays;
    const releaseDay = startDay + calculatedDurationDays;
    const totalDeal = computeCombinedDealAmount(
      draft.selectedPlatformId || digitalPlatforms[0]?.id || 'plat_1',
      selectedTvChannelId,
      negotiatedBroadcastBonus
    );
    updateDraft({
      filmingStartDay: startDay,
      filmingDurationDays: calculatedDurationDays,
      scheduledReleaseDay: releaseDay,
      platformDealAmount: totalDeal,
    });
    if (startOffsetDays > 0 && gameDay < startDay) {
      advanceGameDay(startOffsetDays);
    }
    setMaxUnlocked(2);
    setSubStep(2);
  };

  const firstUnresolvedIdx = draft.crises.findIndex((c) => !c.resolved);
  const activeCrisis =
    firstUnresolvedIdx !== -1 ? draft.crises[firstUnresolvedIdx] : null;

  const filmingProgressPct = Math.min(
    100,
    Math.round(
      (draft.filmingDaysElapsed / Math.max(1, draft.filmingDurationDays)) * 100
    )
  );
  const isFilmingComplete =
    draft.filmingDaysElapsed >= draft.filmingDurationDays;

  const steps = [
    { id: 1 as const, label: '1. الميزانيات وعقود المنصات والقنوات' },
    { id: 2 as const, label: '2. موقع التصوير وإدارة الأزمات' },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-4 py-2">
      {/* Locked Step Header */}
      <div className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/80 bg-white p-4 shadow-[0_12px_30px_-10px_rgba(99,102,241,0.14)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-violet-700">
              المرحلة 3 من 5 · الإنتاج والتسويق والتصوير ({subStep}/2)
            </div>
            <h2 className="font-display mt-0.5 text-lg font-black text-slate-900">
              إنتاج{' '}
              {isSeries
                ? `مسلسل «${draft.title || 'الفرعون الأخير'}» (${draft.episodes} حلقة)`
                : `فيلم «${draft.title || 'الفرعون الأخير'}»`}
            </h2>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-[#F4F7FF] px-3 py-1.5 text-left tabular-nums">
            <div className="text-[10px] font-bold text-slate-500">
              ترقب الجمهور
            </div>
            <div className="font-display text-sm font-black text-violet-700">
              {draft.hypeScore}%
            </div>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2">
          {steps.map((s) => {
            const active = subStep === s.id;
            const unlocked = s.id <= maxUnlocked;
            const done = s.id < subStep;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && setSubStep(s.id)}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 py-2.5 px-2 text-xs font-black transition-all ${
                  active
                    ? 'border-violet-600 border-b-4 border-b-violet-800 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                    : done
                    ? 'border-emerald-200 border-b-4 border-b-emerald-300 bg-emerald-50 text-emerald-700'
                    : unlocked
                    ? 'border-indigo-100 bg-indigo-50/50 text-indigo-700'
                    : 'cursor-not-allowed border-slate-100 bg-slate-100/70 text-slate-400 opacity-75'
                }`}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 shrink-0 stroke-[3]" />
                ) : !unlocked ? (
                  <Lock className="h-3 w-3 shrink-0" />
                ) : null}
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {subStep === 1 && (
          <motion.div
            key="prod-s1-all-budgets"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-5 rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-5 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.15)] sm:p-6"
          >
            {/* Section A: Production Budgets */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-violet-600" />
                  <h3 className="font-display text-base font-black text-slate-900">
                    أولاً: ميزانيات الإنتاج الفنية
                  </h3>
                </div>
                <span className="font-display text-sm font-black text-emerald-700 tabular-nums">
                  {formatMoney(totalProdBudget)} ج.م
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(
                  [
                    {
                      key: 'setsAndLocations',
                      label: 'الديكورات ومواقع التصوير',
                      max: 25_000_000,
                    },
                    {
                      key: 'costumesAndMakeup',
                      label: 'الأزياء والمكياج السينمائي',
                      max: 15_000_000,
                    },
                    {
                      key: 'vfxAndStunts',
                      label: 'الخدع البصرية ومشاهد الحركة',
                      max: 30_000_000,
                    },
                    {
                      key: 'extrasAndCrowds',
                      label: 'المجاميع الضخمة والكومبارس',
                      max: 15_000_000,
                    },
                  ] as const
                ).map((item) => {
                  const val = draft.budgetAllocation[item.key];
                  return (
                    <div
                      key={item.key}
                      className="rounded-2xl border-2 border-indigo-100 bg-[#F8FAFF] p-3"
                    >
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-slate-800">{item.label}</span>
                        <span className="text-violet-700 tabular-nums">
                          {formatMoney(val)} ج.م
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1_000_000}
                        max={item.max}
                        step={500_000}
                        value={val}
                        onChange={(e) =>
                          updateDraft({
                            budgetAllocation: {
                              ...draft.budgetAllocation,
                              [item.key]: Number(e.target.value),
                            },
                          })
                        }
                        aria-label={item.label}
                        className="mt-2 w-full accent-violet-600"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section B: Marketing & Cinema Screens OR Series Broadcast */}
            <div className="border-t border-indigo-100 pt-4">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-violet-600" />
                <h3 className="font-display text-base font-black text-slate-900">
                  {isSeries
                    ? 'ثانياً: الحملة الإعلانية للمسلسل'
                    : 'ثانياً: ميزانية التسويق وشاشات السينما'}
                </h3>
              </div>

              <div className="mt-3 rounded-2xl border-2 border-indigo-100 bg-[#F8FAFF] p-3.5">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-slate-800">
                    ميزانية الدعاية والإعلانات
                  </span>
                  <span className="text-violet-700 tabular-nums">
                    {formatMoney(draft.marketingBudget)} ج.م
                  </span>
                </div>
                <input
                  type="range"
                  min={2_000_000}
                  max={40_000_000}
                  step={1_000_000}
                  value={draft.marketingBudget}
                  onChange={(e) =>
                    updateDraft({ marketingBudget: Number(e.target.value) })
                  }
                  aria-label="ميزانية الحملة الإعلانية"
                  className="mt-2 w-full accent-violet-600"
                />

                {!isSeries && (
                  <div className="mt-3 border-t border-indigo-100 pt-3">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-slate-800">
                        عدد شاشات العرض السينمائي
                      </span>
                      <span className="text-cyan-700 tabular-nums">
                        {draft.screensCount} شاشة عرض
                      </span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={250}
                      step={10}
                      value={draft.screensCount}
                      onChange={(e) =>
                        updateDraft({ screensCount: Number(e.target.value) })
                      }
                      aria-label="عدد شاشات العرض السينمائي"
                      className="mt-2 w-full accent-cyan-600"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section C: Digital Platforms AND TV Broadcast Channels (for Series) */}
            <div className="border-t border-indigo-100 pt-4 space-y-4">
              <div>
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-black text-slate-800">
                  <Tv2 className="h-4 w-4 text-violet-600" />
                  <span>
                    {isSeries
                      ? 'ثالثاً (أ): التفاوض مع المنصة الرقمية العارضة للمسلسل (Watch IT / Shahid VIP / وغيرها):'
                      : 'ثالثاً: اختر عقد المنصة الرقمية الحصري بعد العرض السينمائي:'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {digitalPlatforms.map((plat) => {
                    const offerAmount = Math.round(
                      (plat.budget_capacity / 100) *
                        (isSeries ? 26_000_000 : 28_000_000)
                    );
                    const isChosen =
                      (draft.selectedPlatformId || digitalPlatforms[0]?.id) ===
                      plat.id;
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => handleSelectDigitalPlatform(plat.id)}
                        className={`flex flex-col justify-between rounded-2xl border-2 p-3 text-right transition ${
                          isChosen
                            ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50/80 shadow-xs'
                            : 'border-indigo-100 bg-[#F8FAFF] hover:border-violet-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-xs font-black text-slate-900">
                            {plat.name}
                          </span>
                          <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-violet-700">
                            منصة رقمية
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums">
                          <span className="text-slate-500">
                            الانتشار: {plat.budget_capacity}%
                          </span>
                          <span className="font-black text-emerald-700">
                            +{formatMoney(offerAmount)} ج.م
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isSeries && (
                <div>
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs font-black text-slate-800">
                    <Tv className="h-4 w-4 text-cyan-600" />
                    <span>
                      ثالثاً (ب): التفاوض مع القناة التلفزيونية الفضائية لبث حلقات المسلسل:
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {tvChannels.map((tv) => {
                      const tvOffer = Math.round(
                        (tv.budget_capacity / 100) * 22_000_000
                      );
                      const isChosen = selectedTvChannelId === tv.id;
                      return (
                        <button
                          key={tv.id}
                          type="button"
                          onClick={() => handleSelectTvChannel(tv.id)}
                          className={`flex flex-col justify-between rounded-2xl border-2 p-3 text-right transition ${
                            isChosen
                              ? 'border-cyan-600 border-b-4 border-b-cyan-700 bg-cyan-50/80 shadow-xs'
                              : 'border-indigo-100 bg-[#F8FAFF] hover:border-cyan-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-display text-xs font-black text-slate-900">
                              {tv.name}
                            </span>
                            <span className="rounded-md bg-cyan-100 px-1.5 py-0.5 text-[9px] font-black text-cyan-800">
                              قناة تلفزيونية
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums">
                            <span className="text-slate-500">
                              نسبة المشاهدة: {tv.budget_capacity}%
                            </span>
                            <span className="font-black text-emerald-700">
                              +{formatMoney(tvOffer)} ج.م
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Direct Negotiation Button with Platform / TV Channel */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-black text-emerald-950">
                      إجمالي حقوق البث والعرض المتفق عليها:
                    </div>
                    <div className="font-display text-base font-black text-emerald-700 tabular-nums">
                      +{formatMoney(
                        computeCombinedDealAmount(
                          draft.selectedPlatformId ||
                            digitalPlatforms[0]?.id ||
                            'plat_1',
                          selectedTvChannelId,
                          negotiatedBroadcastBonus
                        )
                      )}{' '}
                      ج.م
                    </div>
                  </div>

                  {!negotiatedBroadcastBonus ? (
                    <button
                      type="button"
                      onClick={handleNegotiateBroadcastBoost}
                      className="flex items-center gap-1.5 rounded-xl border-b-4 border-emerald-900/30 bg-emerald-600 px-3.5 py-2 text-xs font-black text-white shadow-xs transition hover:bg-emerald-700 active:translate-y-0.5"
                    >
                      <Handshake className="h-4 w-4" />
                      <span>التفاوض لرفع قيمة عقد البث (+15%)</span>
                    </button>
                  ) : (
                    <span className="rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white">
                      تم رفع العقد بنسبة +15% ✓
                    </span>
                  )}
                </div>

                {broadcastNegMessage && (
                  <p className="mt-2 text-[11px] font-bold text-emerald-800">
                    {broadcastNegMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Section D: Filming Schedule & Game-Calculated Release Date */}
            <div className="rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/90 via-indigo-50/60 to-cyan-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-violet-900">
                <Calendar className="h-4 w-4 text-violet-600" />
                <span>
                  {isSeries
                    ? 'رابعاً: موعد بدء تصوير المسلسل وموعد عرض الحلقة الأولى:'
                    : 'رابعاً: موعد بدء التصوير وموعد نزول الفيلم لدور العرض:'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { offset: 1 as const, label: 'غداً مباشرة', sub: '+1 يوم' },
                  {
                    offset: 3 as const,
                    label: 'بعد 3 أيام',
                    sub: 'تحضير اللوكيشن',
                  },
                  {
                    offset: 7 as const,
                    label: 'الأسبوع القادم',
                    sub: '+7 أيام',
                  },
                ].map((opt) => (
                  <button
                    key={opt.offset}
                    type="button"
                    onClick={() => setStartOffsetDays(opt.offset)}
                    className={`rounded-2xl border-2 p-2.5 text-center transition ${
                      startOffsetDays === opt.offset
                        ? 'border-violet-600 border-b-4 border-b-violet-800 bg-violet-600 text-white shadow-sm'
                        : 'border-indigo-100 bg-white text-slate-700 hover:border-violet-300'
                    }`}
                  >
                    <div className="text-xs font-black">{opt.label}</div>
                    <div
                      className={`mt-0.5 text-[10px] font-bold ${
                        startOffsetDays === opt.offset
                          ? 'text-violet-100'
                          : 'text-slate-400'
                      }`}
                    >
                      {opt.sub}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-indigo-100 bg-white p-3 text-center text-xs tabular-nums">
                <div>
                  <div className="text-[10px] font-bold text-slate-400">
                    بدء التصوير
                  </div>
                  <div className="mt-0.5 font-black text-slate-900">
                    {formatGameDate(gameDay + startOffsetDays, currentYear)}
                  </div>
                </div>
                <div className="border-x border-indigo-50">
                  <div className="text-[10px] font-bold text-slate-400">
                    مدة التصوير
                  </div>
                  <div className="mt-0.5 font-black text-violet-700">
                    {calculatedDurationDays} أيام
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400">
                    {isSeries ? 'بث الحلقة الأولى' : 'نزول السينمات'}
                  </div>
                  <div className="mt-0.5 font-black text-emerald-700">
                    {formatGameDate(
                      gameDay + startOffsetDays + calculatedDurationDays,
                      currentYear
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
              <button
                type="button"
                onClick={() => setActiveScreen('CREW_CAST_CARDS')}
                className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
              >
                <ArrowRight className="h-4 w-4" />
                <span>سوق الممثلين</span>
              </button>

              <button
                type="button"
                onClick={handleLockPreProductionAndStartFilming}
                className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-900/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <span>
                  {isSeries
                    ? 'اعتماد العقود وبدء تصوير المسلسل!'
                    : 'اعتماد الميزانيات وبدء تصوير الفيلم!'}
                </span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 2 && (
          <motion.div
            key="prod-s2-live-filming"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4 rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.15)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Camera className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-slate-900">
                    2. التصوير الفعلي وإدارة موقع الإنتاج
                  </h3>
                  <p className="text-xs font-bold text-slate-500 tabular-nums">
                    أيام التصوير المنجزة:{' '}
                    <span className="font-black text-violet-700">
                      {draft.filmingDaysElapsed} من {draft.filmingDurationDays}{' '}
                      يوم
                    </span>{' '}
                    ({filmingProgressPct}%)
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-left text-[11px] font-black text-emerald-800 tabular-nums">
                {isSeries ? 'الحلقة الأولى:' : 'موعد الطرح:'}{' '}
                {formatGameDate(previewReleaseDay, currentYear)}
              </div>
            </div>

            {/* Shooting Progress Bar */}
            <div className="h-4 w-full overflow-hidden rounded-full bg-indigo-100 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${filmingProgressPct}%` }}
              />
            </div>

            {/* Automatic Live Filming Status Box (No manual day skip!) */}
            {!isFilmingComplete && !activeCrisis && (
              <div className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-violet-50/70 to-cyan-50/50 p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
                  <Radio className="h-5 w-5 animate-pulse" />
                </div>
                <p className="mt-2.5 text-xs font-black text-slate-800">
                  الكاميرات تدور الآن في موقع التصوير! يتقدم التصوير تلقائياً مع مرور الأيام في أعلى الشاشة.
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  أي خبر فني عاجل من اللوكيشن أو موقف طارئ سيظهر لك فجأة على الشاشة لاتخاذ قرارك الفوري.
                </p>
              </div>
            )}

            {/* Active Crisis Flashcard */}
            {activeCrisis && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCrisis.id}
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -12 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 24 }}
                  className="rounded-3xl border-2 border-rose-200 border-b-4 border-b-rose-300 bg-gradient-to-b from-rose-50/80 to-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1 text-[10px] font-black text-white">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      موقف طارئ في موقع التصوير ({firstUnresolvedIdx + 1} من{' '}
                      {draft.crises.length})
                    </span>
                  </div>

                  <h4 className="font-display mt-2.5 text-base font-black text-slate-900">
                    {activeCrisis.title}
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed font-medium text-slate-700">
                    {activeCrisis.description}
                  </p>

                  <div className="mt-4 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => resolveCrisisOption(activeCrisis.id, 'A')}
                      className="min-h-[46px] w-full rounded-2xl border-2 border-indigo-200 border-b-4 border-b-indigo-300 bg-white p-3 text-right text-xs font-black text-slate-900 shadow-xs transition hover:border-violet-500 active:border-b-2 active:translate-y-0.5"
                    >
                      أ) {activeCrisis.optionA.label}
                    </button>

                    <button
                      type="button"
                      onClick={() => resolveCrisisOption(activeCrisis.id, 'B')}
                      className="min-h-[46px] w-full rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-slate-50 p-3 text-right text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:border-b-2 active:translate-y-0.5"
                    >
                      ب) {activeCrisis.optionB.label}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Filming Completed Banner */}
            {isFilmingComplete && !activeCrisis && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border-2 border-emerald-200 border-b-4 border-b-emerald-300 bg-emerald-50 p-5 text-center"
              >
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <h4 className="font-display mt-2 text-base font-black text-emerald-950">
                  {isSeries
                    ? `اكتمل تصوير ومونتاج حلقات المسلسل (${draft.episodes} حلقة) في الموعد المحدد!`
                    : `اكتمل تصوير ومونتاج الفيلم في موعده المحدد (${formatGameDate(
                        previewReleaseDay,
                        currentYear
                      )})!`}
                </h4>
                <p className="mt-1 text-xs font-medium text-emerald-800">
                  {isSeries
                    ? 'المسلسل جاهز الآن لبث الحلقة الأولى عبر المنصات والقنوات التلفزيونية.'
                    : 'الفيلم جاهز الآن للنزول في قاعات السينما لمتابعة إيرادات شباك التذاكر.'}
                </p>
              </motion.div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
              <button
                type="button"
                onClick={() => setSubStep(1)}
                className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
              >
                <ArrowRight className="h-4 w-4" />
                <span>الميزانيات</span>
              </button>

              <button
                type="button"
                disabled={Boolean(activeCrisis)}
                onClick={() => setActiveScreen('RELEASE_SIMULATION')}
                className="flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-900/40 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-500/25 transition active:border-b-0 active:translate-y-1 disabled:opacity-50"
              >
                <span>
                  {activeCrisis
                    ? 'اتخذ قرارك في الموقف الطارئ أولاً!'
                    : isSeries
                    ? 'بدء بث الحلقة الأولى ومتابعة عرض حلقات المسلسل!'
                    : 'نزول الفيلم للسينمات وبدء تتبع شباك التذاكر!'}
                </span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
