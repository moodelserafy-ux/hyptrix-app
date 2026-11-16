'use client';

import React, { useState, useEffect, useRef } from 'react';
import { StepModalFrame } from './StepModalFrame';
import { FloatingToast } from './FloatingToast';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  CrisisEventItem,
  DailyAiNewsItem,
  formatGameDate,
  getLiveActorsWithEvolution,
} from '@/lib/store';
import { getResolvedDatabase, GENRES } from '@/lib/db-resolver';
import {
  evaluateCastChemistry,
  formatMoney,
  MARKET_CONFIGS,
  MarketRegion,
} from '@/lib/game-engine';
import { AnimatedFilmingSetGraphic } from './CinematicGraphicsScene';
import {
  Camera,
  Sliders,
  AlertTriangle,
  Megaphone,
  Tv2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Lock,
  Calendar,
  Tv,
  Handshake,
  Radio,
  Globe,
  Upload,
  Save,
  Image as ImageIcon,
} from 'lucide-react';

export function Stage4ProductionCrises() {
  const {
    draft,
    cash,
    marketValue,
    unlockedRegions,
    gameDay,
    currentYear,
    customDbPatch,
    importCustomDatabase,
    aiGeneratedActors,
    actorDynamicState,
    groqApiKeyClient,
    preferredGroqModel,
    updateDraft,
    toggleDraftDistributionMarket,
    unlockMarketRegionWithCash,
    advanceGameDay,
    resolveCrisisOption,
    pushBreakingNewsModal,
    setActiveScreen,
  } = useGameStore();

  const db = getResolvedDatabase(customDbPatch);
  const [subStep, setSubStep] = useState<1 | 2>(
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
  const [marketStatusMsg, setMarketStatusMsg] = useState<string | null>(null);
  const [logoTargetId, setLogoTargetId] = useState('plat_1');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [logoEditorMessage, setLogoEditorMessage] = useState<string | null>(null);
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

  const activeDistMarkets: MarketRegion[] =
    Array.isArray(draft.selectedDistributionMarkets) &&
    draft.selectedDistributionMarkets.length > 0
      ? draft.selectedDistributionMarkets
      : ['egypt'];

  const totalDistributionFee = activeDistMarkets.reduce(
    (sum, mId) =>
      sum +
      (MARKET_CONFIGS.find((c) => c.id === mId)?.distributionFeePerProject ||
        0),
    0
  );

  const digitalPlatforms = db.streaming_platforms.filter(
    (p) => p.platform_type === 'digital_platform' || p.id.startsWith('plat_')
  );
  const tvChannels = db.streaming_platforms.filter(
    (p) => p.platform_type === 'tv_channel' || p.id.startsWith('tv_')
  );
  const selectedLogoPartner = db.streaming_platforms.find((p) => p.id === logoTargetId)
    || digitalPlatforms[0]
    || tvChannels[0]
    || null;

  useEffect(() => {
    if (!selectedLogoPartner) return;
    if (selectedLogoPartner.id !== logoTargetId) setLogoTargetId(selectedLogoPartner.id);
    setLogoUrlInput(selectedLogoPartner.logo_url || '');
  }, [logoTargetId, selectedLogoPartner?.id, selectedLogoPartner?.logo_url]);

  const persistPartnerLogo = (nextLogoUrl: string) => {
    if (!selectedLogoPartner) {
      setLogoEditorMessage('لا توجد منصة أو قناة متاحة لتخصيص شعارها.');
      return;
    }
    const cleanUrl = nextLogoUrl.trim();
    const isHttpsUrl = /^https:\/\//i.test(cleanUrl);
    const isSafeImageData = /^data:image\/(png|jpeg|webp);base64,/i.test(cleanUrl);
    if (cleanUrl && !isHttpsUrl && !isSafeImageData) {
      setLogoEditorMessage('استخدم رابط HTTPS أو ملف صورة PNG / JPG / WebP.');
      return;
    }
    const updatedPlatforms = db.streaming_platforms.map((partner) =>
      partner.id === selectedLogoPartner.id ? { ...partner, logo_url: cleanUrl } : partner
    );
    importCustomDatabase({
      ...(customDbPatch || {}),
      streaming_platforms: updatedPlatforms,
    });
    setLogoUrlInput(cleanUrl);
    setLogoEditorMessage(cleanUrl ? 'تم حفظ الشعار في بيانات اللعبة.' : 'تم حذف الشعار المخصص والعودة إلى الرمز الافتراضي.');
  };

  const handlePartnerLogoFile = (file?: File) => {
    if (!file) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoEditorMessage('صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WebP.');
      return;
    }
    if (file.size > 250 * 1024) {
      setLogoEditorMessage('حجم الصورة يجب ألا يتجاوز 250 كيلوبايت حتى تظل بيانات اللعبة خفيفة.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      persistPartnerLogo(result);
    };
    reader.onerror = () => setLogoEditorMessage('تعذر قراءة الصورة. جرّب ملفاً آخر.');
    reader.readAsDataURL(file);
  };

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

      const effectiveDurationDays = draft.filmingDurationDays || calculatedDurationDays;
      const isMilestoneDay =
        forceMilestoneNews ||
        elapsedDays === 2 ||
        elapsedDays === 5 ||
        elapsedDays >= effectiveDurationDays;

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

  return (
    <StepModalFrame label="الإنتاج والتصوير">
      <div className="mx-auto max-w-4xl space-y-4 py-1">
      <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-[0_8px_28px_-14px_rgba(79,70,229,0.28)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-black text-violet-700">مرحلة الإنتاج</span>
            <h2 className="font-display truncate text-base font-black text-slate-900 sm:text-lg">
              {subStep === 1 ? 'الميزانيات والأسواق والمنصات' : 'التصوير الفعلي وإدارة موقع الإنتاج'}
            </h2>
            <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">
              {isSeries ? `مسلسل «${draft.title || 'الفرعون الأخير'}»` : `فيلم «${draft.title || 'الفرعون الأخير'}»`}
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-violet-50 px-3 py-2 text-left">
            <div className="text-[9px] font-bold text-slate-500">ترقب الجمهور</div>
            <div className="font-display text-sm font-black text-violet-700">{draft.hypeScore}%</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-l from-cyan-400 via-violet-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${(subStep / 2) * 100}%` }} />
        </div>
      </div>
      <FloatingToast
        message={marketStatusMsg || broadcastNegMessage}
        onDismiss={() => { setMarketStatusMsg(null); setBroadcastNegMessage(null); }}
        tone={marketStatusMsg && marketStatusMsg.includes('غير كاف') ? 'warning' : 'success'}
      />

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

            {/* Section B-2: Interactive Global Markets Distribution (خريطة الأسواق الإقليمية والعالمية) */}
            <div className="border-t border-indigo-100 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-cyan-600" />
                  <div>
                    <h3 className="font-display text-base font-black text-slate-900">
                      ثالثاً: خريطة الأسواق والتوزيع الدولي للعمل
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500">
                      توزيع العمل في أسواق إضافية يرفع الإيرادات العالمية مقابل رسوم توزيع ودبلجة إضافية
                    </p>
                  </div>
                </div>
                <span className="rounded-xl bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-800 tabular-nums border border-cyan-200">
                  رسوم التوزيع: {formatMoney(totalDistributionFee)} ج.م
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {MARKET_CONFIGS.map((cfg) => {
                  const mId = cfg.id;
                  const isUnlocked = unlockedRegions.includes(mId);
                  const isSelected = activeDistMarkets.includes(mId);
                  const canAffordLicense = cash >= cfg.earlyLicenseCost;
                  const bonusPct = Math.round(cfg.revenueBonusFactor * 100);

                  return (
                    <div
                      key={mId}
                      className={`flex flex-col justify-between rounded-2xl border-2 p-3 text-right transition ${
                        isSelected
                          ? 'border-cyan-600 border-b-4 border-b-cyan-700 bg-cyan-50/75 shadow-xs'
                          : isUnlocked
                          ? 'border-indigo-100 bg-[#F8FAFF] hover:border-cyan-300'
                          : 'border-slate-200 bg-slate-100/75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-display text-xs font-black text-slate-900">
                            {cfg.name}
                          </span>
                          {isSelected ? (
                            <span className="rounded-lg bg-cyan-600 px-2 py-0.5 text-[9px] font-black text-white">
                              مفعل للتوزيع ✓
                            </span>
                          ) : isUnlocked ? (
                            <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-[9px] font-black text-indigo-700">
                              متاح
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2 py-0.5 text-[9px] font-black text-slate-600">
                              <Lock className="h-2.5 w-2.5" />
                              مغلق
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-[10px] font-bold text-slate-600">
                          {cfg.description}
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[10px] font-black tabular-nums">
                          <span className="text-emerald-700">
                            {mId === 'egypt'
                              ? 'السوق الأساسي (100%)'
                              : `عائد إضافي +${bonusPct}%`}
                          </span>
                          <span className="text-slate-700">
                            {cfg.distributionFeePerProject === 0
                              ? 'مشمول بالميزانية'
                              : `تكلفة التوزيع: ${formatMoney(cfg.distributionFeePerProject)} ج.م`}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 border-t border-indigo-100/80 pt-2">
                        {isUnlocked ? (
                          <button
                            type="button"
                            disabled={mId === 'egypt'}
                            onClick={() => {
                              toggleDraftDistributionMarket(mId);
                              setMarketStatusMsg(null);
                            }}
                            className={`w-full rounded-xl py-1.5 px-2.5 text-[11px] font-black transition ${
                              mId === 'egypt'
                                ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                : isSelected
                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                : 'bg-cyan-600 text-white hover:bg-cyan-700'
                            }`}
                          >
                            {mId === 'egypt'
                              ? 'السوق المحلي مفعل دائماً'
                              : isSelected
                              ? 'إلغاء التوزيع في هذا السوق'
                              : `تفعيل التوزيع (+${formatMoney(cfg.distributionFeePerProject)} ج.م)`}
                          </button>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="text-[9px] font-bold text-slate-500">
                              يفتح تلقائياً عند قيمة سوقية {formatMoney(cfg.unlockMarketValue)} ج.م (حاليًا {formatMoney(marketValue)})
                            </div>
                            <button
                              type="button"
                              disabled={!canAffordLicense}
                              onClick={() => {
                                const ok = unlockMarketRegionWithCash(mId);
                                if (ok) {
                                  setMarketStatusMsg(`تم فتح رخصة التوزيع في ${cfg.name} وتفعيلها للعمل الحالي!`);
                                  toggleDraftDistributionMarket(mId);
                                } else {
                                  setMarketStatusMsg('الرصيد النقدي في الخزينة غير كافٍ لشراء رخصة التوزيع المبكر.');
                                }
                              }}
                              className="w-full rounded-xl bg-violet-600 py-1.5 px-2 text-[10px] font-black text-white shadow-2xs transition hover:bg-violet-700 disabled:opacity-45"
                            >
                              شراء رخصة التوزيع المبكر ({formatMoney(cfg.earlyLicenseCost)} ج.م)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Section C: Digital Platforms AND TV Broadcast Channels (for Series) */}
            <div className="border-t border-indigo-100 pt-4 space-y-4">
              <div>
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-black text-slate-800">
                  <Tv2 className="h-4 w-4 text-violet-600" />
                  <span>
                    {isSeries
                      ? 'رابعاً (أ): التفاوض مع المنصة الرقمية العارضة للمسلسل:'
                      : 'رابعاً: اختر عقد المنصة الرقمية الحصري بعد العرض السينمائي:'}
                  </span>
                </div>

                <details className="mb-4 overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/70">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-xs font-black text-violet-950">
                    <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-violet-700" /> تخصيص شعارات المنصات والقنوات التلفزيونية</span>
                    <span className="text-[10px] font-bold text-violet-700">فتح محرر الشعارات</span>
                  </summary>
                  <div className="space-y-3 border-t border-violet-100 bg-white/90 p-3.5">
                    <p className="text-[10px] leading-6 text-slate-600">أضف شعاراً مخصصاً للهوية البصرية داخل عالم لعبتك. هذه الشعارات لتخصيص المحاكاة فقط ولا تعني وجود شراكة حقيقية مع أي جهة.</p>
                    <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
                      <div>
                        <label htmlFor="partner-logo-target" className="mb-1.5 block text-[10px] font-black text-slate-700">المنصة أو القناة</label>
                        <select
                          id="partner-logo-target"
                          value={selectedLogoPartner?.id || ''}
                          onChange={(event) => { setLogoTargetId(event.target.value); setLogoEditorMessage(null); }}
                          className="w-full rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-violet-400"
                        >
                          {[...digitalPlatforms, ...tvChannels].map((partner) => (
                            <option key={partner.id} value={partner.id}>{partner.name} · {partner.platform_type === 'tv_channel' || partner.id.startsWith('tv_') ? 'قناة' : 'منصة'}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="partner-logo-url" className="mb-1.5 block text-[10px] font-black text-slate-700">رابط صورة HTTPS</label>
                        <input
                          id="partner-logo-url"
                          type="url"
                          value={logoUrlInput.startsWith('data:') ? '' : logoUrlInput}
                          onChange={(event) => setLogoUrlInput(event.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="w-full rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-violet-400"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => persistPartnerLogo(logoUrlInput)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-[11px] font-black text-white transition hover:bg-violet-700"><Save className="h-3.5 w-3.5" /> حفظ الشعار</button>
                      <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-[11px] font-black text-indigo-800 transition hover:bg-indigo-100">
                        <Upload className="h-3.5 w-3.5" /> رفع صورة
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { handlePartnerLogoFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                      </label>
                      <button type="button" onClick={() => { setLogoUrlInput(''); persistPartnerLogo(''); }} className="rounded-xl border border-rose-100 px-3 py-2 text-[10px] font-black text-rose-700 hover:bg-rose-50">إزالة الشعار</button>
                    </div>
                    {logoEditorMessage && <p role="status" className="text-[10px] font-bold text-violet-800">{logoEditorMessage}</p>}
                    {selectedLogoPartner?.logo_url && <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2"><img src={selectedLogoPartner.logo_url} alt={`معاينة شعار ${selectedLogoPartner.name}`} className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain p-1" /><span className="text-[10px] font-bold text-slate-600">معاينة الشعار المحفوظ: {selectedLogoPartner.name}</span></div>}
                  </div>
                </details>
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
                        <div className="flex items-center gap-3">
                          {plat.logo_url ? (
                            <img src={plat.logo_url} alt={`شعار ${plat.name}`} loading="lazy" className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1" />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-black text-violet-700">{plat.name.slice(0, 1)}</span>
                          )}
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="font-display text-xs font-black text-slate-900">{plat.name}</span>
                          <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-violet-700">منصة رقمية</span>
                          </div>
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
                      رابعاً (ب): التفاوض مع القناة التلفزيونية الفضائية لبث حلقات المسلسل:
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
                          <div className="flex items-center gap-3">
                            {tv.logo_url ? (
                              <img src={tv.logo_url} alt={`شعار ${tv.name}`} loading="lazy" className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1" />
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-sm font-black text-cyan-700">{tv.name.slice(0, 1)}</span>
                            )}
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className="font-display text-xs font-black text-slate-900">{tv.name}</span>
                            <span className="rounded-md bg-cyan-100 px-1.5 py-0.5 text-[9px] font-black text-cyan-800">قناة تلفزيونية</span>
                            </div>
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

              </div>
            </div>

            {/* Section D: Filming Schedule & Game-Calculated Release Date */}
            <div className="rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/90 via-indigo-50/60 to-cyan-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-violet-900">
                <Calendar className="h-4 w-4 text-violet-600" />
                <span>
                  {isSeries
                    ? 'خامساً: موعد بدء تصوير المسلسل وموعد عرض الحلقة الأولى:'
                    : 'خامساً: موعد بدء التصوير وموعد نزول الفيلم لدور العرض:'}
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

            {/* Interactive Animated Soundstage Filming Graphic */}
            <AnimatedFilmingSetGraphic
              title={draft.title || 'الفرعون الأخير'}
              genre={draft.primaryGenre}
              leadName={selectedLeads[0]?.name || 'بطل العمل'}
              directorName={selectedDirector?.name || 'مخرج العمل'}
              dayCurrent={draft.filmingDaysElapsed}
              dayTotal={draft.filmingDurationDays}
              isComplete={isFilmingComplete}
            />

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
                      disabled={cash < activeCrisis.optionA.cost}
                      onClick={() => resolveCrisisOption(activeCrisis.id, 'A')}
                      className="min-h-[46px] w-full rounded-2xl border-2 border-indigo-200 border-b-4 border-b-indigo-300 bg-white p-3 text-right text-xs font-black text-slate-900 shadow-xs transition hover:border-violet-500 active:border-b-2 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      أ) {activeCrisis.optionA.label}
                    </button>

                    <button
                      type="button"
                      disabled={cash < activeCrisis.optionB.cost}
                      onClick={() => resolveCrisisOption(activeCrisis.id, 'B')}
                      className="min-h-[46px] w-full rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-slate-50 p-3 text-right text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:border-b-2 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
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

            <div className="step-navigation mt-6 flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
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
    </StepModalFrame>
  );
}
