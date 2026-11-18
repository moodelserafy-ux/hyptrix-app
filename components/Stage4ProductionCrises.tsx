'use client';

import React, { useState, useMemo } from 'react';
import {
  useGameStore,
  CrisisEventItem,
  DailyAiNewsItem,
  getStudioAssetBenefits,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { formatMoney } from '@/lib/game-engine';
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
    studioName,
    ceoName,
    aiMemoryLog,
    customDbPatch,
    resolveCrisisOption,
    resolveCrisisWithStudioAsset,
    ownedStudioAssets,
    pushBreakingNewsModal,
    showToast,
    groqApiKeyClient,
    preferredGroqModel,
  } = useGameStore();

  const studioAssetBenefits = useMemo(
    () => getStudioAssetBenefits(ownedStudioAssets),
    [ownedStudioAssets]
  );

  const db = useMemo(() => getResolvedDatabase(customDbPatch), [customDbPatch]);

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
      .filter(Boolean);
    return names.length > 0 ? names.join(' و') : 'مخرج العمل';
  }, [db.crew, draft.directorIds, draft.directorId]);

  const leadActorName = useMemo(
    () =>
      db.actors.find((a) => a.id === draft.leadActorIds[0])?.name ||
      'بطل العمل',
    [db.actors, draft.leadActorIds]
  );

  const generateProductionCrises = async () => {
    setIsLoadingCrises(true);
    try {
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'mid_production_crises',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            title: draft.title,
            genre: draft.primaryGenre,
            leadActorName,
            directorName,
            studioName,
            ceoName,
            aiMemoryLog,
          },
        }),
      });
      const data = await res.json();
      if (Array.isArray(data?.crises) && data.crises.length > 0) {
        updateDraft({ crises: data.crises });
      }
    } catch {
      // fallback handled silently
    } finally {
      setIsLoadingCrises(false);
    }
  };

  const generateFilmingPressNews = async () => {
    setIsLoadingNews(true);
    try {
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate_daily_news',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            phase: 'filming',
            day: draft.filmingDaysElapsed + 1,
            title: draft.title,
            genre: draft.primaryGenre,
            leadActorName,
            directorName,
            studioName,
            ceoName,
          },
        }),
      });
      const data = await res.json();
      if (data?.headline) {
        const newsItem: DailyAiNewsItem = {
          id: `film_news_${Date.now()}`,
          day: gameDay,
          headline: data.headline,
          detail: data.detail || '',
          impactType: data.impactType || 'positive',
          hypeDelta: Number(data.hypeDelta || 2),
        };
        updateDraft({
          filmingDaysElapsed: Math.min(
            draft.filmingDurationDays,
            draft.filmingDaysElapsed + 2
          ),
          hypeScore: Math.min(100, Math.max(10, draft.hypeScore + newsItem.hypeDelta)),
          productionNews: [newsItem, ...(draft.productionNews || [])].slice(0, 6),
        });
        pushBreakingNewsModal({
          id: `modal_${newsItem.id}`,
          day: gameDay,
          year: useGameStore.getState().currentYear,
          category: 'production_news',
          badgeLabel: `تغطية كواليس البلاتوه · اليوم ${gameDay}`,
          headline: newsItem.headline,
          detail: newsItem.detail,
          highlightName: draft.title,
          extraStatBadge: `ضجة ${newsItem.hypeDelta >= 0 ? `+${newsItem.hypeDelta}` : newsItem.hypeDelta}`,
          gameImpactLabel: `تفاعل الإعلام مع تصوير «${draft.title}»`,
        });
      }
    } catch {
      // ignore transient error
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
        'سيولة الخزينة الحالية لا تكفي لتغطية تكلفة هذا الخيار! يرجى اختيار الحل البديل.',
        'warning'
      );
      return;
    }
    resolveCrisisOption(crisis.id, option);
  };

  const handleFinishFilming = () => {
    if (draft.crises.length === 0) {
      showToast('يرجى بدء تصوير المشاهد ومواجهة أحداث البلاتوه أولاً!', 'warning');
      return;
    }
    if (!allCrisesResolved) {
      showToast('يرجى حسم كافة المواقف الإنتاجية العالقة في البلاتوه قبل الانتقال للعرض!', 'warning');
      return;
    }
    setActiveScreen('RELEASE_SIMULATION');
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Clean Single-Line Current Activity Header */}
      <div className="glass-panel rounded-3xl px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
              <Camera className="h-5 w-5" />
            </div>
            <h2 className="font-display text-sm font-black text-slate-900 sm:text-base">
              تصوير المشاهد وإدارة البلاتوه: «{draft.title}»
            </h2>
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
        <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-3">
          <span className="block text-[10px] font-bold text-slate-500">
            تأثير القرارات على الجودة
          </span>
          <span
            className={`font-mono text-sm font-black ${
              draft.qualityModifier >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {draft.qualityModifier >= 0 ? `+${draft.qualityModifier}` : draft.qualityModifier} نقطة
          </span>
        </div>
        <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-3">
          <span className="block text-[10px] font-bold text-slate-500">
            مؤشر الضجة الجماهيرية (Hype)
          </span>
          <span className="font-mono text-sm font-black text-amber-600">
            {draft.hypeScore}/100
          </span>
        </div>
        <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-3">
          <span className="block text-[10px] font-bold text-slate-500">
            السيولة المتاحة
          </span>
          <span className="font-mono text-sm font-black text-slate-900">
            {formatMoney(cash)} ج.م
          </span>
        </div>
      </div>

      {/* Start / Generate Crises Button if not generated yet */}
      {draft.crises.length === 0 && (
        <div className="rounded-2xl border-2 border-indigo-200 border-b-4 border-b-indigo-300 bg-white/95 p-6 text-center space-y-3 shadow-md">
          <Clapperboard className="mx-auto h-10 w-10 text-violet-600" />
          <h3 className="font-display text-base font-black text-slate-900">
            الكاميرات جاهزة للدوران في بلاتوه «{draft.title}»
          </h3>
          <p className="text-xs font-bold text-slate-600">
            اضغط لبدء التصوير الفعلي وخوض مواقف وكواليس البلاتوه الميدانية
          </p>
          <button
            type="button"
            onClick={() => {
              generateProductionCrises();
              generateFilmingPressNews();
            }}
            disabled={isLoadingCrises}
            className="mx-auto inline-flex items-center gap-2 rounded-xl border-b-2 border-violet-800 bg-violet-600 px-6 py-3 text-xs font-black text-white shadow-lg hover:bg-violet-500 disabled:opacity-50"
          >
            {isLoadingCrises ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري تجهيز مشاهد وكواليس التصوير...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>دوران الكاميرا وبدء تصوير المشاهد الآن</span>
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
          className={`rounded-2xl border-2 border-b-4 p-4 shadow-md ${
            crisis.resolved
              ? 'border-emerald-300 border-b-emerald-500 bg-emerald-50/70'
              : 'border-amber-400 border-b-amber-600 bg-white/95'
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-900">
              <AlertTriangle className="h-3.5 w-3.5" />
              موقف ميداني #{idx + 1}: {crisis.title}
            </span>
            {crisis.resolved && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white">
                <Check className="h-3 w-3" /> تم الحسم
              </span>
            )}
          </div>

          <p className="mb-3 text-xs font-bold leading-relaxed text-slate-700">
            {crisis.description}
          </p>

          {!crisis.resolved && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleResolveChoice(crisis, 'A')}
                className="flex w-full flex-col justify-between gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50/60 p-3 text-right transition hover:border-violet-500 hover:bg-white sm:flex-row sm:items-center"
              >
                <span className="text-xs font-black text-slate-900">
                  {crisis.optionA.label}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {crisis.optionA.cost > 0 && (
                    <span className="rounded-md bg-rose-100 px-2 py-0.5 font-mono text-[10px] font-black text-rose-800">
                      -{formatMoney(crisis.optionA.cost)} ج.م
                    </span>
                  )}
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-900">
                    جودة {crisis.optionA.qualityDelta >= 0 ? '+' : ''}
                    {crisis.optionA.qualityDelta}
                  </span>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
                    ضجة {crisis.optionA.hypeDelta >= 0 ? '+' : ''}
                    {crisis.optionA.hypeDelta}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleResolveChoice(crisis, 'B')}
                className="flex w-full flex-col justify-between gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50/60 p-3 text-right transition hover:border-violet-500 hover:bg-white sm:flex-row sm:items-center"
              >
                <span className="text-xs font-black text-slate-900">
                  {crisis.optionB.label}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {crisis.optionB.cost > 0 && (
                    <span className="rounded-md bg-rose-100 px-2 py-0.5 font-mono text-[10px] font-black text-rose-800">
                      -{formatMoney(crisis.optionB.cost)} ج.م
                    </span>
                  )}
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-900">
                    جودة {crisis.optionB.qualityDelta >= 0 ? '+' : ''}
                    {crisis.optionB.qualityDelta}
                  </span>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
                    ضجة {crisis.optionB.hypeDelta >= 0 ? '+' : ''}
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
                      `تم احتواء الموقف مجاناً بفضل أصول الاستوديو الثابتة (${studioAssetBenefits.ownedItems[0].name})!`,
                      'success'
                    );
                  }}
                  className="flex w-full flex-col justify-between gap-2 rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-3 text-right shadow-xs transition hover:border-emerald-600 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-xs font-black text-emerald-950">
                      درع أصول الاستوديو ({studioAssetBenefits.ownedItems[0].name}): حسم الموقف فوراً بدون تكلفة
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <span className="rounded-md bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-black text-white">
                      مجاناً (0 ج.م)
                    </span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-900">
                      جودة +4 · ضجة +4
                    </span>
                  </div>
                </button>
              )}
            </div>
          )}
        </motion.div>
      ))}

      {/* Live On-Set Press Leaks */}
      <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-black text-slate-900">
            <Newspaper className="h-4 w-4 text-violet-600" />
            تغطية الصحافة الفنية لكواليس تصوير «{draft.title}»
          </h3>
          <button
            type="button"
            onClick={generateFilmingPressNews}
            disabled={isLoadingNews}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-900 hover:bg-indigo-100"
          >
            {isLoadingNews ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 text-amber-500" />
            )}
            <span>رصد تسريبات صحفية جديدة</span>
          </button>
        </div>

        {draft.productionNews && draft.productionNews.length > 0 ? (
          <div className="space-y-2">
            {draft.productionNews.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">
                    {item.headline}
                  </span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-900">
                    ضجة {item.hypeDelta >= 0 ? `+${item.hypeDelta}` : item.hypeDelta}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-bold text-slate-600">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-bold text-slate-500">
            اضغط على «رصد تسريبات صحفية جديدة» لمتابعة تفاعل الإعلام مع كواليس التصوير.
          </p>
        )}
      </div>

      {/* FLOATING STICKY BOTTOM NAVIGATION BOX */}
      <div className="pointer-events-none fixed right-0 bottom-3 left-0 z-40 px-3">
        <div className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between rounded-2xl border-2 border-indigo-200/90 border-b-4 border-b-indigo-300 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveScreen('CREW_CAST_CARDS')}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2 text-xs font-black text-slate-700 transition hover:bg-indigo-100"
          >
            السابق
          </button>

          <span className="text-[11px] font-black text-violet-700">
            {allCrisesResolved
              ? 'اكتمل التصوير ✓'
              : `المواقف المتبقية: ${unresolvedCrises.length}`}
          </span>

          <button
            type="button"
            onClick={handleFinishFilming}
            className="rounded-xl border-b-2 border-amber-700 bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-2 text-xs font-black text-slate-950 shadow-md transition hover:from-amber-400 hover:to-amber-300"
          >
            الانتقال للتوزيع والعرض
          </button>
        </div>
      </div>
    </div>
  );
}

export default Stage4ProductionCrises;
