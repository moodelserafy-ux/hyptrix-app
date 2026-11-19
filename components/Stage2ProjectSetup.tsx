'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { GENRES } from '@/lib/db-resolver';
import { getMarketProfile } from '@/lib/market-profiles';
import {
  AgeRating,
  GenreId,
  SeriesEpisodes,
  SeriesSeason,
} from '@/lib/game-engine';
import {
  Clapperboard,
  Tv,
  Calendar,
  ShieldAlert,
  Sparkles,
  Check,
  Wand2,
  Loader2,
  Flame,
  Users,
  Smile,
  Brain,
  Ghost,
  Search,
  Rocket,
  Heart,
  Crown,
  BookOpen,
  KeyRound,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GENRE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Users,
  Smile,
  Sparkles,
  Brain,
  Ghost,
  Search,
  Rocket,
  Heart,
  Crown,
  BookOpen,
  KeyRound,
  Wand2,
  Shield,
};

// Dynamic seasons are loaded from getMarketProfile(worldMarket) inside Stage2ProjectSetup.

const AGE_RATINGS: { id: AgeRating; label: string; desc: string }[] = [
  {
    id: 'G',
    label: 'عرض عام (عائلي)',
    desc: 'يفتح أبواب القاعات والمشاهدات لكل أفراد الأسرة (+12% جمهور)',
  },
  {
    id: '+12',
    label: 'إرشاد عائلي (+12)',
    desc: 'التصنيف القياسي المتوازن لأغلب الأعمال الجماهيرية',
  },
  {
    id: '+18',
    label: 'للبالغين فقط (+18)',
    desc: 'حرية فنية ونقدية عالية للمشاهد المركبة مقابل تقليص شريحة التذاكر العائلية',
  },
];

const EPISODE_COUNTS: { count: SeriesEpisodes; label: string; desc: string }[] = [
  { count: 7, label: '7 حلقات', desc: 'حكاية مكثفة سريعة الإيقاع للمنصات' },
  { count: 10, label: '10 حلقات', desc: 'قالب المنصات الرقمية القياسي' },
  { count: 15, label: '15 حلقة', desc: 'نصف موسم رمضاني مشدود بلا مط أو تطويل' },
  { count: 30, label: '30 حلقة', desc: 'ملحمة درامية كاملة طوال الشهر بأعلى مشاهدات' },
];

export function Stage2ProjectSetup() {
  const {
    draft,
    updateDraft,
    setActiveScreen,
    showToast,
    groqApiKeyClient,
    preferredGroqModel,
    worldMarket,
    uiLanguage,
  } = useGameStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [genrePickMode, setGenrePickMode] = useState<'primary' | 'secondary'>('primary');
  const [aiGeneratingIdea, setAiGeneratingIdea] = useState(false);

  const marketProfile = getMarketProfile(worldMarket);
  const currencyLabel = marketProfile.currencyLabel;
  const filmSeasons = marketProfile.filmSeasons.map((s) => ({
    id: s.id,
    label: s.label,
    desc: `${s.bonus} · ${s.risk}`,
  }));
  const seriesSeasons: { id: SeriesSeason; label: string; desc: string }[] = [
    {
      id: 'ramadan',
      label: marketProfile.seriesSeasonPrimaryLabel,
      desc: marketProfile.seriesSeasonPrimarySub,
    },
    {
      id: 'off_season',
      label: marketProfile.seriesSeasonOffLabel,
      desc: marketProfile.seriesSeasonOffSub,
    },
  ];

  const isSeries = draft.format === 'series';

  const handleGenerateAiScriptIdea = async () => {
    setAiGeneratingIdea(true);
    try {
      const primaryGenreObj = GENRES.find((g) => g.id === draft.primaryGenre);
      const secondaryGenreObj = GENRES.find((g) => g.id === draft.secondaryGenre);
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate_script_idea',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            format: draft.format,
            primaryGenre: draft.primaryGenre,
            primaryGenreName: primaryGenreObj?.name || 'دراما',
            secondaryGenre: draft.secondaryGenre || '',
            secondaryGenreName: secondaryGenreObj?.name || '',
            ageRating: draft.ageRating,
            currentTitle: draft.title,
            worldMarket,
            uiLanguage,
          },
        }),
      });
      const data = await res.json();
      if (data?.title && data?.synopsis) {
        updateDraft({
          title: data.title,
          scriptSynopsis: data.synopsis,
        });
      }
    } catch {
      showToast('تعذر الاتصال بورشة التأليف حالياً، يمكنك الكتابة مباشرة', 'warning');
    } finally {
      setAiGeneratingIdea(false);
    }
  };

  // Silent background AI evaluation of the player's written script (never shown to player)
  const triggerSilentAiScriptEvaluation = () => {
    const primaryGenreObj = GENRES.find((g) => g.id === draft.primaryGenre);
    fetch('/api/generate-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'analyze_script_synopsis',
        groqKeyOverride: groqApiKeyClient,
        preferredModel: preferredGroqModel,
        payload: {
          title: draft.title,
          synopsis: draft.scriptSynopsis,
          format: draft.format,
          primaryGenre: draft.primaryGenre,
          primaryGenreName: primaryGenreObj?.name || 'دراما',
          worldMarket,
          uiLanguage,
        },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.score === 'number') {
          updateDraft({
            aiScriptAnalysis: {
              score: data.score,
              verdict: String(data.verdict || ''),
              castingAdvice: String(data.castingAdvice || ''),
              modelUsed: preferredGroqModel,
            },
          });
        }
      })
      .catch(() => {});
  };

  const handleSelectGenre = (genreId: GenreId) => {
    if (genrePickMode === 'primary') {
      updateDraft({
        primaryGenre: genreId,
        secondaryGenre: draft.secondaryGenre === genreId ? null : draft.secondaryGenre,
      });
      setGenrePickMode('secondary');
    } else {
      if (draft.primaryGenre === genreId) {
        showToast('هذا التصنيف مختار بالفعل كتصنيف أساسي للعمل', 'info');
        return;
      }
      updateDraft({
        secondaryGenre: draft.secondaryGenre === genreId ? null : genreId,
      });
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 2) {
      if (!draft.primaryGenre) {
        showToast('يرجى اختيار التصنيف الدرامي الأساسي للعمل أولاً', 'warning');
        return;
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 3) {
      if (!draft.title.trim()) {
        showToast('يرجى كتابة اسم العمل الفني قبل الانتقال للتعاقدات', 'warning');
        return;
      }
      if ((draft.scriptSynopsis || '').trim().split(/\s+/).length < 5) {
        showToast('يرجى كتابة ملخص القصة والحبكة الدرامية (5 كلمات على الأقل)', 'warning');
        return;
      }
      triggerSilentAiScriptEvaluation();
      setActiveScreen('CREW_CAST_CARDS');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (step === 1) {
      setActiveScreen('STUDIO_HUB');
    } else {
      setStep((s) => (s === 3 ? 2 : 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const primaryGenreObj = GENRES.find((g) => g.id === draft.primaryGenre);
  const secondaryGenreObj = GENRES.find((g) => g.id === draft.secondaryGenre);

  return (
    <div className="mx-auto max-w-xl space-y-3.5 pb-28" dir="rtl">
      {/* Unified Royal Cinema Header */}
      <div className="rounded-3xl border-2 border-[#D4AF37] bg-[#1A2530] px-4 py-3.5 text-[#F9F6F0] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37] bg-[#D91624] text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#D4AF37]">
              غرفة تطوير المشاريع السينمائية
            </span>
            <h1 className="font-display text-sm font-black text-[#F9F6F0] sm:text-base">
              {step === 1 && 'تحديد نوع العمل، الموسم، والتصنيف العمري'}
              {step === 2 && 'اختيار التصنيف الدرامي للعمل'}
              {step === 3 && 'كتابة عنوان العمل والسيناريو'}
            </h1>
          </div>
        </div>
      </div>

      {/* Step 1: Format (Film vs Series), Season & Age Rating */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="setup-step-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {/* Format Selection: Film vs Series */}
            <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 shadow-sm space-y-3">
              <h2 className="font-display text-sm font-black text-[#1A2530]">
                نوع العمل الفني
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => updateDraft({ format: 'film' })}
                  className={`flex flex-col items-start gap-1.5 rounded-2xl border-2 p-3.5 text-right transition-all ${
                    !isSeries
                      ? 'border-[#D91624] border-b-4 border-b-[#9E0F19] bg-[#FFF9E6] shadow-xs'
                      : 'border-[#1A2530]/15 bg-[#F9F6F0] hover:border-[#D4AF37]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        !isSeries
                          ? 'border border-[#D4AF37] bg-[#D91624] text-white'
                          : 'bg-[#1A2530]/10 text-[#1A2530]'
                      }`}
                    >
                      <Clapperboard className="h-5 w-5" />
                    </div>
                    {!isSeries && (
                      <span className="rounded-lg bg-[#D91624] px-2 py-0.5 text-[9px] font-black text-white">
                        مختار ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-black text-[#1A2530]">فيلم سينمائي</p>
                  <p className="text-[10px] leading-relaxed font-bold text-[#1A2530]/75">
                    يقاس بـ <strong className="text-[#D91624]">إيرادات شباك التذاكر ({currencyLabel})</strong> وعدد شاشات السينما
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => updateDraft({ format: 'series' })}
                  className={`flex flex-col items-start gap-1.5 rounded-2xl border-2 p-3.5 text-right transition-all ${
                    isSeries
                      ? 'border-[#D91624] border-b-4 border-b-[#9E0F19] bg-[#FFF9E6] shadow-xs'
                      : 'border-[#1A2530]/15 bg-[#F9F6F0] hover:border-[#D4AF37]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        isSeries
                          ? 'border border-[#D4AF37] bg-[#D91624] text-white'
                          : 'bg-[#1A2530]/10 text-[#1A2530]'
                      }`}
                    >
                      <Tv className="h-5 w-5" />
                    </div>
                    {isSeries && (
                      <span className="rounded-lg bg-[#D91624] px-2 py-0.5 text-[9px] font-black text-white">
                        مختار ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-black text-[#1A2530]">مسلسل درامي</p>
                  <p className="text-[10px] leading-relaxed font-bold text-[#1A2530]/75">
                    يقاس بـ <strong className="text-[#D91624]">عدد المشاهدات بالمليون</strong> وعقود المنصات والقنوات
                  </p>
                </button>
              </div>

              {isSeries && (
                <div className="pt-2 border-t border-[#D4AF37]/30 space-y-2">
                  <p className="text-xs font-black text-[#1A2530]">
                    عدد حلقات المسلسل:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {EPISODE_COUNTS.map((ep) => (
                      <button
                        key={ep.count}
                        type="button"
                        onClick={() => updateDraft({ episodes: ep.count })}
                        className={`rounded-xl border-2 p-2.5 text-right transition ${
                          draft.episodes === ep.count
                            ? 'border-[#D4AF37] border-b-4 border-b-[#A6841D] bg-[#1A2530] text-[#F9F6F0]'
                            : 'border-[#1A2530]/15 bg-[#F9F6F0] text-[#1A2530] hover:border-[#D4AF37]'
                        }`}
                      >
                        <p className="text-xs font-black">{ep.label}</p>
                        <p
                          className={`mt-0.5 text-[10px] ${
                            draft.episodes === ep.count ? 'text-[#F9F6F0]/75' : 'text-[#1A2530]/65'
                          }`}
                        >
                          {ep.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Season Selection */}
            <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#D91624]" />
                <h2 className="font-display text-sm font-black text-[#1A2530]">
                  {isSeries ? 'موسم البث التلفزيوني والرقمي' : 'موسم الطرح في شباك التذاكر'}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {!isSeries
                  ? filmSeasons.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateDraft({ filmSeason: s.id })}
                        className={`rounded-2xl border-2 p-3 text-right transition ${
                          draft.filmSeason === s.id
                            ? 'border-[#D91624] border-b-4 border-b-[#9E0F19] bg-[#FFF9E6]'
                            : 'border-[#1A2530]/15 bg-[#F9F6F0] hover:border-[#D4AF37]'
                        }`}
                      >
                        <p className="text-xs font-black text-[#1A2530]">{s.label}</p>
                        <p className="mt-0.5 text-[11px] text-[#1A2530]/70">{s.desc}</p>
                      </button>
                    ))
                  : seriesSeasons.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateDraft({ seriesSeason: s.id })}
                        className={`rounded-2xl border-2 p-3 text-right transition ${
                          draft.seriesSeason === s.id
                            ? 'border-[#D91624] border-b-4 border-b-[#9E0F19] bg-[#FFF9E6]'
                            : 'border-[#1A2530]/15 bg-[#F9F6F0] hover:border-[#D4AF37]'
                        }`}
                      >
                        <p className="text-xs font-black text-[#1A2530]">{s.label}</p>
                        <p className="mt-0.5 text-[11px] text-[#1A2530]/70">{s.desc}</p>
                      </button>
                    ))}
              </div>
            </div>

            {/* Age Rating */}
            <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#D4AF37]" />
                <h2 className="font-display text-sm font-black text-[#1A2530]">
                  التصنيف الرقابي والعمري
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {AGE_RATINGS.map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => updateDraft({ ageRating: ar.id })}
                    className={`rounded-2xl border-2 p-3 text-right transition ${
                      draft.ageRating === ar.id
                        ? 'border-[#D91624] border-b-4 border-b-[#9E0F19] bg-[#FFF9E6]'
                        : 'border-[#1A2530]/15 bg-[#F9F6F0] hover:border-[#D4AF37]'
                    }`}
                  >
                    <p className="text-xs font-black text-[#1A2530]">{ar.label}</p>
                    <p className="mt-0.5 text-[10px] text-[#1A2530]/70">{ar.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Pure Genre Choice with Floating Sticky Primary/Secondary Switcher & Real Icons */}
        {step === 2 && (
          <motion.div
            key="setup-step-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {/* Floating Sticky Primary & Secondary Genre Switcher */}
            <div className="sticky top-14 z-30 rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530]/95 p-2.5 shadow-lg backdrop-blur-md">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGenrePickMode('primary')}
                  className={`rounded-xl border-2 p-2.5 text-right transition ${
                    genrePickMode === 'primary'
                      ? 'border-[#D4AF37] bg-[#FFF9E6] text-[#1A2530]'
                      : 'border-white/15 bg-white/10 text-[#F9F6F0]'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold ${
                      genrePickMode === 'primary' ? 'text-[#1A2530]/65' : 'text-[#F9F6F0]/70'
                    }`}
                  >
                    التصنيف الأساسي (إلزامي)
                  </span>
                  <p className="mt-0.5 text-xs font-black">
                    {primaryGenreObj ? primaryGenreObj.name : 'اختر الآن'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setGenrePickMode('secondary')}
                  className={`rounded-xl border-2 p-2.5 text-right transition ${
                    genrePickMode === 'secondary'
                      ? 'border-[#D4AF37] bg-[#FFF9E6] text-[#1A2530]'
                      : 'border-white/15 bg-white/10 text-[#F9F6F0]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold ${
                        genrePickMode === 'secondary' ? 'text-[#1A2530]/65' : 'text-[#F9F6F0]/70'
                      }`}
                    >
                      التصنيف الفرعي (اختياري)
                    </span>
                    {draft.secondaryGenre && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          updateDraft({ secondaryGenre: null });
                        }}
                        className="cursor-pointer text-[10px] font-black text-[#D91624] hover:underline"
                      >
                        إلغاء
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs font-black">
                    {secondaryGenreObj ? secondaryGenreObj.name : 'بدون تصنيف فرعي'}
                  </p>
                </button>
              </div>
            </div>

            {/* Genres Grid with Proper Lucide Icons */}
            <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {GENRES.map((g) => {
                  const isPrimary = draft.primaryGenre === g.id;
                  const isSecondary = draft.secondaryGenre === g.id;
                  const IconComp = GENRE_ICON_MAP[g.icon] || Sparkles;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleSelectGenre(g.id as GenreId)}
                      className={`flex flex-col items-start justify-between rounded-2xl border-2 p-3 text-right transition-all ${
                        isPrimary
                          ? 'border-[#D4AF37] border-b-4 border-b-[#9A7A16] bg-[#1A2530] text-[#F9F6F0] shadow-md'
                          : isSecondary
                          ? 'border-[#D91624] border-b-4 border-b-[#9E0F19] bg-[#FFF9E6] text-[#1A2530]'
                          : 'border-[#1A2530]/15 bg-[#F9F6F0] text-[#1A2530] hover:border-[#D4AF37]'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            isPrimary
                              ? 'bg-[#D4AF37] text-[#1A2530]'
                              : isSecondary
                              ? 'bg-[#D91624] text-white'
                              : 'bg-[#1A2530]/10 text-[#1A2530]'
                          }`}
                        >
                          <IconComp className="h-4 w-4" />
                        </div>
                        {isPrimary && (
                          <span className="rounded-lg bg-[#D4AF37] px-2 py-0.5 text-[9px] font-black text-[#1A2530]">
                            أساسي ✓
                          </span>
                        )}
                        {isSecondary && (
                          <span className="rounded-lg bg-[#D91624] px-2 py-0.5 text-[9px] font-black text-white">
                            فرعي ✓
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-black">{g.name}</p>
                        <p
                          className={`mt-0.5 text-[10px] leading-relaxed ${
                            isPrimary ? 'text-[#F9F6F0]/75' : 'text-[#1A2530]/65'
                          }`}
                        >
                          {g.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Custom Script Writing & Idea Generator */}
        {step === 3 && (
          <motion.div
            key="setup-step-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 shadow-sm space-y-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-sm font-black text-[#1A2530]">
                عنوان {isSeries ? 'المسلسل' : 'الفيلم'} وملخص السيناريو
              </h2>
              <button
                type="button"
                disabled={aiGeneratingIdea}
                onClick={handleGenerateAiScriptIdea}
                className="flex items-center gap-1.5 rounded-xl border-2 border-[#D4AF37] bg-[#FFF9E6] px-3 py-2 text-xs font-black text-[#1A2530] shadow-2xs transition hover:bg-[#FFF3B0] disabled:opacity-50"
              >
                {aiGeneratingIdea ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D91624]" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5 text-[#D91624]" />
                )}
                <span>ابتكار فكرة وسيناريو درامي</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-black text-[#1A2530]">
                  عنوان {isSeries ? 'المسلسل الدرامي' : 'الفيلم السينمائي'}
                </label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => updateDraft({ title: e.target.value })}
                  placeholder={
                    isSeries
                      ? worldMarket === 'saudi'
                        ? 'مثال: حارة البجيري / ليالي الدرعية'
                        : 'مثال: العهد السري / ليالي المحروسة'
                      : worldMarket === 'saudi'
                      ? 'مثال: طريق العلا المفقود / ليلة في بوليفارد'
                      : 'مثال: شفرة باب الخلق / ليلة سقوط القناع'
                  }
                  className="w-full rounded-2xl border-2 border-[#1A2530]/20 bg-[#F9F6F0] px-4 py-3 text-base font-bold text-[#1A2530] placeholder:text-[#1A2530]/40 focus:border-[#D4AF37] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black text-[#1A2530]">
                  ملخص القصة والصراع الدرامي والنهاية
                </label>
                <textarea
                  rows={4}
                  value={draft.scriptSynopsis}
                  onChange={(e) => updateDraft({ scriptSynopsis: e.target.value })}
                  placeholder="اكتب بداية الأحداث، الصراع الرئيسي الذي يواجه البطل، والمفاجأة الدرامية في النهاية..."
                  className="w-full rounded-2xl border-2 border-[#1A2530]/20 bg-[#F9F6F0] p-3.5 text-base leading-relaxed font-bold text-[#1A2530] placeholder:text-[#1A2530]/40 focus:border-[#D4AF37] focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Navigation Box — Royal Cinema Theme */}
      <div className="fixed bottom-3 right-0 left-0 z-30 mx-auto max-w-xl px-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530]/95 p-3 shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={handlePrevStep}
            className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-black text-[#F9F6F0] transition hover:bg-white/20"
          >
            <span>{step === 1 ? 'عودة للمقر' : 'السابق'}</span>
          </button>

          <button
            type="button"
            onClick={handleNextStep}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-[#D4AF37] bg-[#D91624] px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-110 active:translate-y-0.5"
          >
            {step === 3 && <Check className="h-4 w-4" />}
            <span>{step < 3 ? 'التالي' : 'الانتقال لغرفة التعاقدات'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
