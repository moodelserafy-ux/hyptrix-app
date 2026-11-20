'use client';

import React, { useState, useMemo } from 'react';
import {
  useGameStore,
  formatGameDate,
  CrisisEventItem,
  DailyAiNewsItem,
  getStudioAssetBenefits,
  getLiveActorsWithEvolution,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { getCurrencyLabel } from '@/lib/market-profiles';
import {
  getUiDir,
  localizeEntityName,
  STUDIO_ASSETS_EN,
  tr,
} from '@/lib/i18n';
import { composeProceduralFilmingNews } from '@/lib/procedural-dialogue';
import { formatMoney } from '@/lib/game-engine';
import { getOrCreateStudioInstanceId } from '@/lib/supabase';
import {
  showRewardedAd,
  getRewardedAdErrorMessage,
} from '@/lib/ad-mediator';
import { AnimatedFilmingSetGraphic } from '@/components/CinematicGraphicsScene';
import {
  Camera,
  Sparkles,
  Loader2,
  Check,
  AlertTriangle,
  Newspaper,
  Clapperboard,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';

export function Stage4ProductionCrises() {
  const {
    draft,
    updateDraft,
    setActiveScreen,
    cash,
    gameDay,
    currentYear,
    studioName,
    ceoName,
    aiMemoryLog,
    customDbPatch,
    aiGeneratedActors,
    actorDynamicState,
    resolveCrisisOption,
    resolveCrisisWithStudioAsset,
    resolveCrisisWithCash8M,
    resolveCrisisWithRewardedAd,
    ownedStudioAssets,
    pushBreakingNewsModal,
    showToast,
    groqApiKeyClient,
    preferredGroqModel,
    worldMarket,
    uiLanguage,
  } = useGameStore();

  const isEn = uiLanguage !== 'ar';
  const uiDir = getUiDir(uiLanguage);
  const currencyLabel = getCurrencyLabel(worldMarket, uiLanguage);

  const studioAssetBenefits = useMemo(
    () => getStudioAssetBenefits(ownedStudioAssets),
    [ownedStudioAssets]
  );

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch, worldMarket),
    [customDbPatch, worldMarket]
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

  const [isLoadingCrises, setIsLoadingCrises] = useState(false);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  const directorName = useMemo(() => {
    const ids =
      Array.isArray(draft.directorIds) && draft.directorIds.length > 0
        ? draft.directorIds
        : draft.directorId
        ? [draft.directorId]
        : [];
    const names = ids
      .map((id) => db.crew.find((c) => c.id === id)?.name)
      .filter((n): n is string => Boolean(n))
      .map((n) => localizeEntityName(n, uiLanguage));
    return names.length > 0
      ? names.join(isEn ? ' & ' : ' و')
      : tr(uiLanguage, 'Project Director', 'مخرج العمل');
  }, [db.crew, draft.directorIds, draft.directorId, uiLanguage, isEn]);

  const leadActorName = useMemo(() => {
    const raw = liveActors.find((a) => a.id === draft.leadActorIds[0])?.name;
    return raw
      ? localizeEntityName(raw, uiLanguage)
      : tr(uiLanguage, 'Lead Star', 'بطل العمل');
  }, [liveActors, draft.leadActorIds, uiLanguage]);

  const primaryOwnedAssetName = useMemo(() => {
    const first = studioAssetBenefits.ownedItems[0];
    if (!first) return '';
    return isEn ? STUDIO_ASSETS_EN[first.id]?.name || first.name : first.name;
  }, [studioAssetBenefits.ownedItems, isEn]);

  const generateProductionCrises = async () => {
    setIsLoadingCrises(true);
    try {
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'mid_production_crises',
          studioInstanceId: getOrCreateStudioInstanceId(),
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            title: draft.title,
            synopsis: draft.scriptSynopsis,
            genre: draft.primaryGenre,
            format: draft.format,
            leadActorName,
            directorName,
            studioName,
            ceoName,
            ageRating: draft.ageRating,
            aiMemoryLog,
            worldMarket,
            uiLanguage,
          },
        }),
      });
      const data = await res.json();
      const nextCrises =
        Array.isArray(data?.crises) && data.crises.length > 0
          ? data.crises
          : undefined;
      const mergedNewsRaw = data?.pressNews;
      if (mergedNewsRaw?.headline) {
        const newsItem: DailyAiNewsItem = {
          id: `film_news_${Date.now()}`,
          day: gameDay,
          headline: String(mergedNewsRaw.headline),
          detail: String(mergedNewsRaw.detail || ''),
          impactType: mergedNewsRaw.impactType || 'positive',
          hypeDelta: Number(mergedNewsRaw.hypeDelta || 3),
        };
        updateDraft({
          ...(nextCrises ? { crises: nextCrises } : {}),
          filmingDaysElapsed: Math.min(
            draft.filmingDurationDays,
            draft.filmingDaysElapsed + 2
          ),
          hypeScore: Math.min(100, Math.max(10, draft.hypeScore + newsItem.hypeDelta)),
          productionNews: [newsItem, ...(draft.productionNews || [])].slice(0, 6),
        });
      } else if (nextCrises) {
        updateDraft({ crises: nextCrises });
      }
    } catch {
      // fallback handled silently
    } finally {
      setIsLoadingCrises(false);
    }
  };

  // Extra filming press leak — instant 0-token procedural news composer
  const generateFilmingPressNews = async () => {
    setIsLoadingNews(true);
    try {
      const generated = composeProceduralFilmingNews({
        worldMarket,
        uiLanguage,
        projectTitle: draft.title,
        studioName,
        directorName,
        leadName: leadActorName,
        synopsis: draft.scriptSynopsis,
        format: draft.format,
        gameDay: gameDay + (draft.productionNews?.length || 0),
        hypeScore: draft.hypeScore,
      });
      const newsItem: DailyAiNewsItem = {
        id: `film_news_${Date.now()}`,
        day: gameDay,
        headline: generated.headline,
        detail: generated.detail,
        impactType: generated.impactType,
        hypeDelta: generated.hypeDelta,
      };
      updateDraft({
        filmingDaysElapsed: Math.min(
          draft.filmingDurationDays,
          draft.filmingDaysElapsed + 2
        ),
        hypeScore: Math.min(100, Math.max(10, draft.hypeScore + newsItem.hypeDelta)),
        productionNews: [newsItem, ...(draft.productionNews || [])].slice(0, 6),
      });
      const currYear = useGameStore.getState().currentYear;
      pushBreakingNewsModal({
        id: `modal_${newsItem.id}`,
        day: gameDay,
        year: currYear,
        category: 'production_news',
        badgeLabel: tr(
          uiLanguage,
          `On-Set Press Dispatch · ${formatGameDate(gameDay, currYear, uiLanguage)}`,
          `تغطية كواليس البلاتوه · ${formatGameDate(gameDay, currYear, uiLanguage)}`
        ),
        headline: newsItem.headline,
        detail: newsItem.detail,
        highlightName: draft.title,
        extraStatBadge: tr(
          uiLanguage,
          `Hype ${newsItem.hypeDelta >= 0 ? `+${newsItem.hypeDelta}` : newsItem.hypeDelta}`,
          `ضجة ${newsItem.hypeDelta >= 0 ? `+${newsItem.hypeDelta}` : newsItem.hypeDelta}`
        ),
        gameImpactLabel: tr(
          uiLanguage,
          `Media buzz around filming "${draft.title}"`,
          `تفاعل الإعلام مع تصوير «${draft.title}»`
        ),
      });
    } finally {
      setIsLoadingNews(false);
    }
  };

  const unresolvedCrises = draft.crises.filter((c) => !c.resolved);
  const allCrisesResolved =
    draft.crises.length > 0 && unresolvedCrises.length === 0;

  const handleResolveChoice = (crisis: CrisisEventItem, option: 'A' | 'B') => {
    const chosen = option === 'A' ? crisis.optionA : crisis.optionB;
    if (chosen.cost > 0 && cash < chosen.cost) {
      showToast(
        tr(
          uiLanguage,
          'Insufficient studio liquidity for this option! Use "Free PR Settlement (Watch Ad)" to save your cash.',
          'سيولة الخزينة الحالية لا تكفي لتغطية تكلفة هذا الخيار! استخدم «تسوية إعلامية مجانية (مشاهدة إعلان)» لتوفير فلوسك.'
        ),
        'warning'
      );
      return;
    }
    resolveCrisisOption(crisis.id, option);
  };

  const handleFinishFilming = () => {
    if (draft.crises.length === 0) {
      showToast(
        tr(
          uiLanguage,
          'Please roll cameras and complete on-set production events first!',
          'يرجى بدء تصوير المشاهد ومواجهة أحداث البلاتوه أولاً!'
        ),
        'warning'
      );
      return;
    }
    if (!allCrisesResolved) {
      showToast(
        tr(
          uiLanguage,
          'Please resolve all open on-set production crises before heading to release!',
          'يرجى حسم كافة المواقف الإنتاجية العالقة في البلاتوه قبل الانتقال للعرض!'
        ),
        'warning'
      );
      return;
    }
    setActiveScreen('RELEASE_SIMULATION');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-28" dir={uiDir}>
      {/* Unified Royal Cinema Header */}
      <div className="rounded-3xl border-2 border-[#D4AF37] bg-[#1A2530] px-4 py-3.5 text-[#F9F6F0] shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37] bg-[#D91624] text-white shadow-sm">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#D4AF37]">
                {tr(uiLanguage, 'Principal Photography & Soundstage', 'بلاتوه التصوير الميداني')}
              </span>
              <h2 className="font-display text-sm font-black text-[#F9F6F0] sm:text-base">
                {tr(
                  uiLanguage,
                  `On-Set Production & Crisis Control: "${draft.title}"`,
                  `تصوير المشاهد وإدارة البلاتوه: «${draft.title}»`
                )}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Filming Set Graphic */}
      <AnimatedFilmingSetGraphic
        title={draft.title}
        genre={draft.primaryGenre}
        leadName={leadActorName}
        directorName={directorName}
        dayCurrent={Math.max(1, draft.filmingDaysElapsed)}
        dayTotal={draft.filmingDurationDays}
        isComplete={allCrisesResolved}
      />

      {/* Live Stats Strip */}
      <div className="grid grid-cols-3 gap-2.5 text-center">
        <div className="rounded-2xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-3">
          <span className="block text-[10px] font-bold text-[#1A2530]/65">
            {tr(uiLanguage, 'Quality Modifier', 'تأثير القرارات على الجودة')}
          </span>
          <span
            className={`font-mono text-sm font-black ${
              draft.qualityModifier >= 0 ? 'text-[#15803D]' : 'text-[#D91624]'
            }`}
          >
            {draft.qualityModifier >= 0 ? `+${draft.qualityModifier}` : draft.qualityModifier}{' '}
            {tr(uiLanguage, 'pts', 'نقطة')}
          </span>
        </div>
        <div className="rounded-2xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-3">
          <span className="block text-[10px] font-bold text-[#1A2530]/65">
            {tr(uiLanguage, 'Public Hype Meter', 'مؤشر الضجة الجماهيرية (Hype)')}
          </span>
          <span className="font-mono text-sm font-black text-[#B8860B]">
            {draft.hypeScore}/100
          </span>
        </div>
        <div className="rounded-2xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-3">
          <span className="block text-[10px] font-bold text-[#1A2530]/65">
            {tr(uiLanguage, 'Available Treasury', 'السيولة المتاحة')}
          </span>
          <span className="font-mono text-sm font-black text-[#1A2530]" dir="ltr">
            {formatMoney(cash)} {currencyLabel}
          </span>
        </div>
      </div>

      {/* Start / Generate Crises Button if not generated yet */}
      {draft.crises.length === 0 && (
        <div className="rounded-3xl border-2 border-[#D4AF37] bg-white p-6 text-center space-y-3 shadow-md">
          <Clapperboard className="mx-auto h-10 w-10 text-[#D91624]" />
          <h3 className="font-display text-base font-black text-[#1A2530]">
            {tr(
              uiLanguage,
              `Cameras Ready to Roll on "${draft.title}"`,
              `الكاميرات جاهزة للدوران في بلاتوه «${draft.title}»`
            )}
          </h3>
          <p className="text-xs font-bold text-[#1A2530]/70">
            {tr(
              uiLanguage,
              'Start principal photography and navigate live behind-the-scenes challenges on set.',
              'اضغط لبدء التصوير الفعلي وخوض مواقف وكواليس البلاتوه الميدانية'
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              generateProductionCrises();
            }}
            disabled={isLoadingCrises}
            className="mx-auto inline-flex items-center gap-2 rounded-xl border-2 border-[#D4AF37] bg-[#D91624] px-6 py-3 text-xs font-black text-white shadow-lg hover:brightness-110 disabled:opacity-50"
          >
            {isLoadingCrises ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {tr(uiLanguage, 'Preparing soundstage & shooting schedule...', 'جاري تجهيز مشاهد وكواليس التصوير...')}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>
                  {tr(uiLanguage, 'Action! Start Filming Now', 'دوران الكاميرا وبدء تصوير المشاهد الآن')}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Active Crises Cards */}
      {draft.crises.map((crisis, idx) => (
        <motion.div
          key={crisis.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border-2 border-b-4 p-4 shadow-md ${
            crisis.resolved
              ? 'border-[#15803D]/50 border-b-[#15803D] bg-emerald-50/70'
              : 'border-[#D4AF37] border-b-[#9A7A16] bg-white'
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF9E6] border border-[#D4AF37]/70 px-2.5 py-1 text-[11px] font-black text-[#1A2530]">
              <AlertTriangle className="h-3.5 w-3.5 text-[#D91624] shrink-0" />
              {tr(uiLanguage, `On-Set Incident #${idx + 1}`, `موقف ميداني #${idx + 1}`)}: {crisis.title}
            </span>
            {crisis.resolved && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#15803D] px-2.5 py-0.5 text-[10px] font-black text-white shrink-0">
                <Check className="h-3 w-3" /> {tr(uiLanguage, 'Resolved', 'تم الحسم')}
              </span>
            )}
          </div>

          <p className="mb-3 text-xs font-bold leading-relaxed text-[#1A2530]/80">
            {crisis.description}
          </p>

          {!crisis.resolved && (
            <div className="space-y-2.5">
              {/* PRIMARY QUICK INTERVENTION OPTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-2xl bg-[#1A2530] p-3 border-2 border-[#D4AF37]">
                <button
                  type="button"
                  onClick={() => resolveCrisisWithCash8M(crisis.id)}
                  className="flex flex-col justify-between gap-1.5 rounded-xl bg-[#F9F6F0] hover:bg-white p-3 text-start transition cursor-pointer border-2 border-[#D91624]"
                >
                  <span className="text-xs font-black text-[#1A2530]">
                    {tr(
                      uiLanguage,
                      'Rapid Treasury Cash Intervention',
                      'تدخل مالي سريع لحسم الأزمة من الخزينة'
                    )}
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="rounded-md bg-[#D91624] px-2 py-0.5 font-mono text-[10px] font-black text-white" dir="ltr">
                      {tr(uiLanguage, `Pay 8.0M ${currencyLabel}`, `دفع 8.0M ${currencyLabel}`)}
                    </span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-900">
                      {tr(uiLanguage, 'Quality +3 · Hype +4', 'جودة +3 · ضجة +4')}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const adResult = await showRewardedAd('crisis_settlement');
                    if (adResult.completed) {
                      resolveCrisisWithRewardedAd(crisis.id);
                    } else {
                      const errMsg = getRewardedAdErrorMessage(
                        adResult.reason,
                        'للتسوية المجانية',
                        uiLanguage,
                        'to claim the free PR settlement'
                      );
                      if (errMsg) showToast(errMsg, 'warning');
                    }
                  }}
                  className="flex flex-col justify-between gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] hover:brightness-105 p-3 text-start transition cursor-pointer shadow-md"
                >
                  <span className="text-xs font-black text-[#1A2530]">
                    {tr(
                      uiLanguage,
                      'Free PR Settlement (Watch Ad) — Save Your Cash!',
                      'تسوية إعلامية مجانية (مشاهدة إعلان) — وفر فلوسك!'
                    )}
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="rounded-md bg-[#1A2530] px-2 py-0.5 font-mono text-[10px] font-black text-[#D4AF37]">
                      {tr(uiLanguage, `Free (0 ${currencyLabel} · Ad)`, `مجاناً (0 ${currencyLabel} · إعلان)`)}
                    </span>
                    <span className="rounded-md bg-[#15803D] px-2 py-0.5 text-[10px] font-black text-white">
                      {tr(uiLanguage, 'Quality +4 · Hype +5', 'جودة +4 · ضجة +5')}
                    </span>
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleResolveChoice(crisis, 'A')}
                className="flex w-full flex-col justify-between gap-2 rounded-xl border-2 border-[#1A2530]/20 bg-[#F9F6F0] p-3 text-start transition hover:border-[#D4AF37] hover:bg-white sm:flex-row sm:items-center"
              >
                <span className="text-xs font-black text-[#1A2530]">
                  {crisis.optionA.label}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {crisis.optionA.cost > 0 && (
                    <span className="rounded-md bg-[#D91624]/15 px-2 py-0.5 font-mono text-[10px] font-black text-[#D91624]" dir="ltr">
                      -{formatMoney(crisis.optionA.cost)} {currencyLabel}
                    </span>
                  )}
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-900">
                    {tr(uiLanguage, 'Quality', 'جودة')}{' '}
                    {crisis.optionA.qualityDelta >= 0 ? '+' : ''}
                    {crisis.optionA.qualityDelta}
                  </span>
                  <span className="rounded-md bg-[#FFF9E6] border border-[#D4AF37]/60 px-2 py-0.5 text-[10px] font-black text-[#1A2530]">
                    {tr(uiLanguage, 'Hype', 'ضجة')}{' '}
                    {crisis.optionA.hypeDelta >= 0 ? '+' : ''}
                    {crisis.optionA.hypeDelta}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleResolveChoice(crisis, 'B')}
                className="flex w-full flex-col justify-between gap-2 rounded-xl border-2 border-[#1A2530]/20 bg-[#F9F6F0] p-3 text-start transition hover:border-[#D4AF37] hover:bg-white sm:flex-row sm:items-center"
              >
                <span className="text-xs font-black text-[#1A2530]">
                  {crisis.optionB.label}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {crisis.optionB.cost > 0 && (
                    <span className="rounded-md bg-[#D91624]/15 px-2 py-0.5 font-mono text-[10px] font-black text-[#D91624]" dir="ltr">
                      -{formatMoney(crisis.optionB.cost)} {currencyLabel}
                    </span>
                  )}
                  <span className="rounded-md bg-[#1A2530]/10 px-2 py-0.5 text-[10px] font-black text-[#1A2530]">
                    {tr(uiLanguage, 'Quality', 'جودة')}{' '}
                    {crisis.optionB.qualityDelta >= 0 ? '+' : ''}
                    {crisis.optionB.qualityDelta}
                  </span>
                  <span className="rounded-md bg-[#FFF9E6] border border-[#D4AF37]/60 px-2 py-0.5 text-[10px] font-black text-[#1A2530]">
                    {tr(uiLanguage, 'Hype', 'ضجة')}{' '}
                    {crisis.optionB.hypeDelta >= 0 ? '+' : ''}
                    {crisis.optionB.hypeDelta}
                  </span>
                </div>
              </button>

              {studioAssetBenefits.ownedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    resolveCrisisWithStudioAsset(crisis.id);
                    showToast(
                      tr(
                        uiLanguage,
                        `Crisis neutralized for free thanks to your studio asset (${primaryOwnedAssetName})!`,
                        `تم احتواء الموقف مجاناً بفضل أصول الاستوديو الثابتة (${primaryOwnedAssetName})!`
                      ),
                      'success'
                    );
                  }}
                  className="flex w-full flex-col justify-between gap-2 rounded-xl border-2 border-[#15803D] bg-emerald-50 p-3 text-start shadow-xs transition hover:bg-emerald-100/70 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#15803D]" />
                    <span className="text-xs font-black text-emerald-950">
                      {tr(
                        uiLanguage,
                        `Studio Asset Shield (${primaryOwnedAssetName}): Resolve Instantly at Zero Cost`,
                        `درع أصول الاستوديو (${primaryOwnedAssetName}): حسم الموقف فوراً بدون تكلفة`
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <span className="rounded-md bg-[#15803D] px-2 py-0.5 font-mono text-[10px] font-black text-white">
                      {tr(uiLanguage, `Free (0 ${currencyLabel})`, `مجاناً (0 ${currencyLabel})`)}
                    </span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-900">
                      {tr(uiLanguage, 'Quality +4 · Hype +4', 'جودة +4 · ضجة +4')}
                    </span>
                  </div>
                </button>
              )}
            </div>
          )}
        </motion.div>
      ))}

      {/* Live On-Set Press Leaks */}
      <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-black text-[#1A2530]">
            <Newspaper className="h-4 w-4 text-[#D91624]" />
            {tr(
              uiLanguage,
              `Entertainment Press Coverage from the Set of "${draft.title}"`,
              `تغطية الصحافة الفنية لكواليس تصوير «${draft.title}»`
            )}
          </h3>
          <button
            type="button"
            onClick={generateFilmingPressNews}
            disabled={isLoadingNews}
            className="inline-flex items-center gap-1 rounded-xl border border-[#D4AF37] bg-[#FFF9E6] px-2.5 py-1 text-[10px] font-black text-[#1A2530] hover:bg-[#FFF3B0]"
          >
            {isLoadingNews ? (
              <Loader2 className="h-3 w-3 animate-spin text-[#D91624]" />
            ) : (
              <Sparkles className="h-3 w-3 text-[#D91624]" />
            )}
            <span>
              {tr(uiLanguage, 'Check Latest Set Leaks', 'رصد تسريبات صحفية جديدة')}
            </span>
          </button>
        </div>

        {draft.productionNews && draft.productionNews.length > 0 ? (
          <div className="space-y-2">
            {draft.productionNews.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#1A2530]/15 bg-[#F9F6F0] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-[#1A2530]">
                    {item.headline}
                  </span>
                  <span className="rounded border border-[#D4AF37]/60 bg-[#FFF9E6] px-1.5 py-0.5 text-[10px] font-black text-[#1A2530] shrink-0">
                    {tr(uiLanguage, 'Hype', 'ضجة')}{' '}
                    {item.hypeDelta >= 0 ? `+${item.hypeDelta}` : item.hypeDelta}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-bold text-[#1A2530]/75">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-bold text-[#1A2530]/60">
            {tr(
              uiLanguage,
              'Tap "Check Latest Set Leaks" to track media buzz during production.',
              'اضغط على «رصد تسريبات صحفية جديدة» لمتابعة تفاعل الإعلام مع كواليس التصوير.'
            )}
          </p>
        )}
      </div>

      {/* FLOATING STICKY BOTTOM NAVIGATION BOX — Royal Cinema Theme */}
      <div className="pointer-events-none fixed right-0 bottom-3 left-0 z-40 px-3">
        <div className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530]/95 px-4 py-3 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveScreen('CREW_CAST_CARDS')}
            className="rounded-xl border border-white/20 bg-white/10 px-5 py-2 text-xs font-black text-[#F9F6F0] transition hover:bg-white/20"
          >
            {tr(uiLanguage, 'Previous', 'السابق')}
          </button>

          <span className="text-[11px] font-black text-[#D4AF37]">
            {allCrisesResolved
              ? tr(uiLanguage, 'Filming Wrapped ✓', 'اكتمل التصوير ✓')
              : tr(
                  uiLanguage,
                  `Open Incidents: ${unresolvedCrises.length}`,
                  `المواقف المتبقية: ${unresolvedCrises.length}`
                )}
          </span>

          <button
            type="button"
            onClick={handleFinishFilming}
            className="rounded-xl border-2 border-[#D4AF37] bg-[#D91624] px-5 py-2 text-xs font-black text-white shadow-md transition hover:brightness-110"
          >
            {tr(uiLanguage, 'Proceed to Distribution', 'الانتقال للتوزيع والعرض')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Stage4ProductionCrises;
