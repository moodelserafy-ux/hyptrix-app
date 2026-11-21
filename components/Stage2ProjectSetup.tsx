'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { GENRES } from '@/lib/db-resolver';
import { getCurrencyLabel } from '@/lib/market-profiles';
import {
  getLocalizedGenreInfo,
  getLocalizedMarketInfo,
  getUiDir,
  tr,
} from '@/lib/i18n';
import { getOrCreateStudioInstanceId } from '@/lib/supabase';
import {
  AgeRating,
  GenreId,
  SeriesEpisodes,
  SeriesSeason,
} from '@/lib/game-engine';
import {
  computeStudioProgression,
  getEpisodesRequiredLevel,
  getGenreRequiredLevel,
} from '@/lib/progression';
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
  Lock,
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
    marketValue,
    releasedProjects,
  } = useGameStore();

  const progression = computeStudioProgression({
    marketValue,
    releasedProjects,
    uiLanguage,
  });

  const isEn = uiLanguage !== 'ar';
  const uiDir = getUiDir(uiLanguage);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [genrePickMode, setGenrePickMode] = useState<'primary' | 'secondary'>('primary');
  const [aiGeneratingIdea, setAiGeneratingIdea] = useState(false);

  const marketInfo = getLocalizedMarketInfo(worldMarket, uiLanguage);
  const currencyLabel = getCurrencyLabel(worldMarket, uiLanguage);

  const filmSeasons = marketInfo.filmSeasons.map((s) => ({
    id: s.id,
    label: s.label,
    desc: `${s.bonus} · ${s.risk}`,
  }));

  const seriesSeasons: { id: SeriesSeason; label: string; desc: string }[] = [
    {
      id: 'ramadan',
      label: marketInfo.seriesSeasonPrimaryLabel,
      desc: marketInfo.seriesSeasonPrimarySub,
    },
    {
      id: 'off_season',
      label: marketInfo.seriesSeasonOffLabel,
      desc: marketInfo.seriesSeasonOffSub,
    },
  ];

  const ageRatings: { id: AgeRating; label: string; desc: string }[] = [
    {
      id: 'G',
      label: tr(uiLanguage, 'General Audience (G)', 'عرض عام (عائلي)'),
      desc: tr(
        uiLanguage,
        'Opens theaters & streams to every age group (+12% audience reach)',
        'يفتح أبواب القاعات والمشاهدات لكل أفراد الأسرة (+12% جمهور)'
      ),
    },
    {
      id: '+12',
      label: tr(uiLanguage, 'PG-12 (Family Guidance)', 'إرشاد عائلي (+12)'),
      desc: tr(
        uiLanguage,
        'Balanced mainstream rating ideal for most commercial releases',
        'التصنيف القياسي المتوازن لأغلب الأعمال الجماهيرية'
      ),
    },
    {
      id: '+18',
      label: tr(uiLanguage, 'Adults Only (+18 / R)', 'للبالغين فقط (+18)'),
      desc: tr(
        uiLanguage,
        'Bold creative freedom & critical prestige with a smaller family crowd',
        'حرية فنية ونقدية عالية للمشاهد المركبة مقابل تقليص شريحة التذاكر العائلية'
      ),
    },
  ];

  const episodeCounts: { count: SeriesEpisodes; label: string; desc: string }[] = [
    {
      count: 7,
      label: tr(uiLanguage, '7 Episodes', '7 حلقات'),
      desc: tr(
        uiLanguage,
        'Tight, fast-paced streaming mini-series',
        'حكاية مكثفة سريعة الإيقاع للمنصات'
      ),
    },
    {
      count: 10,
      label: tr(uiLanguage, '10 Episodes', '10 حلقات'),
      desc: tr(
        uiLanguage,
        'Standard prestige streaming season format',
        'قالب المنصات الرقمية القياسي'
      ),
    },
    {
      count: 15,
      label: tr(uiLanguage, '15 Episodes', '15 حلقة'),
      desc: tr(
        uiLanguage,
        'Punchy half-season drama with zero filler',
        'نصف موسم رمضاني مشدود بلا مط أو تطويل'
      ),
    },
    {
      count: 30,
      label: tr(uiLanguage, '30 Episodes', '30 حلقة'),
      desc: tr(
        uiLanguage,
        'Full month-long flagship saga for maximum viewership',
        'ملحمة درامية كاملة طوال الشهر بأعلى مشاهدات'
      ),
    },
  ];

  const isSeries = draft.format === 'series';

  const handleGenerateAiScriptIdea = async () => {
    setAiGeneratingIdea(true);
    try {
      const primaryGenreInfo = getLocalizedGenreInfo(draft.primaryGenre, uiLanguage);
      const secondaryGenreInfo = draft.secondaryGenre
        ? getLocalizedGenreInfo(draft.secondaryGenre, uiLanguage)
        : null;
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate_script_idea',
          studioInstanceId: getOrCreateStudioInstanceId(),
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            format: draft.format,
            primaryGenre: draft.primaryGenre,
            primaryGenreName: primaryGenreInfo.name,
            secondaryGenre: draft.secondaryGenre || '',
            secondaryGenreName: secondaryGenreInfo?.name || '',
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
      showToast(
        tr(
          uiLanguage,
          'Could not reach the writers’ room right now — you can write your story directly.',
          'تعذر الاتصال بورشة التأليف حالياً، يمكنك الكتابة مباشرة'
        ),
        'warning'
      );
    } finally {
      setAiGeneratingIdea(false);
    }
  };

  const handleSelectGenre = (genreId: GenreId) => {
    const reqLevel = getGenreRequiredLevel(genreId);
    if (progression.level < reqLevel) {
      showToast(
        reqLevel === 2
          ? tr(
              uiLanguage,
              'This genre unlocks at Studio Level 2 (Release 2 films + 7.0+ critic score or 110M valuation).',
              'هذا التصنيف يُفتح في المستوى 2 (أنتج عملين + تقييم نقاد 7.0+ أو قيمة سوقية 110M).'
            )
          : tr(
              uiLanguage,
              'Mega-budget genres unlock at Studio Level 4 (550M valuation + 3 festival awards).',
              'التصنيفات الضخمة تُفتح في المستوى 4 (قيمة سوقية 550M + 3 جوائز مهرجانات).'
            ),
        'warning'
      );
      return;
    }
    if (genrePickMode === 'primary') {
      updateDraft({
        primaryGenre: genreId,
        secondaryGenre: draft.secondaryGenre === genreId ? null : draft.secondaryGenre,
      });
      setGenrePickMode('secondary');
    } else {
      if (draft.primaryGenre === genreId) {
        showToast(
          tr(
            uiLanguage,
            'This genre is already selected as your primary genre.',
            'هذا التصنيف مختار بالفعل كتصنيف أساسي للعمل'
          ),
          'info'
        );
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
        showToast(
          tr(
            uiLanguage,
            'Please choose a primary genre for your project first.',
            'يرجى اختيار التصنيف الدرامي الأساسي للعمل أولاً'
          ),
          'warning'
        );
        return;
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 3) {
      if (!draft.title.trim()) {
        showToast(
          tr(
            uiLanguage,
            'Please enter a project title before moving to casting & contracts.',
            'يرجى كتابة اسم العمل الفني قبل الانتقال للتعاقدات'
          ),
          'warning'
        );
        return;
      }
      if ((draft.scriptSynopsis || '').trim().split(/\s+/).length < 5) {
        showToast(
          tr(
            uiLanguage,
            'Please write a brief plot synopsis (at least 5 words).',
            'يرجى كتابة ملخص القصة والحبكة الدرامية (5 كلمات على الأقل)'
          ),
          'warning'
        );
        return;
      }
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

  const primaryGenreInfo = draft.primaryGenre
    ? getLocalizedGenreInfo(draft.primaryGenre, uiLanguage)
    : null;
  const secondaryGenreInfo = draft.secondaryGenre
    ? getLocalizedGenreInfo(draft.secondaryGenre, uiLanguage)
    : null;

  return (
    <div className="mx-auto max-w-xl space-y-3.5 pb-28" dir={uiDir}>
      {/* Unified Royal Cinema Header */}
      <div className="rounded-3xl border-2 border-[#D4AF37] bg-[#1A2530] px-4 py-3.5 text-[#F9F6F0] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37] bg-[#D91624] text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#D4AF37]">
              {tr(uiLanguage, 'Project Development Room', 'غرفة تطوير المشاريع السينمائية')}
            </span>
            <h1 className="font-display text-sm font-black text-[#F9F6F0] sm:text-base">
              {step === 1 &&
                tr(
                  uiLanguage,
                  'Choose Format, Release Season & Age Rating',
                  'تحديد نوع العمل، الموسم، والتصنيف العمري'
                )}
              {step === 2 &&
                tr(
                  uiLanguage,
                  'Select Your Project Genre Mix',
                  'اختيار التصنيف الدرامي للعمل'
                )}
              {step === 3 &&
                tr(
                  uiLanguage,
                  'Write Title & Dramatic Synopsis',
                  'كتابة عنوان العمل والسيناريو'
                )}
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
                {tr(uiLanguage, 'Production Format', 'نوع العمل الفني')}
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => updateDraft({ format: 'film' })}
                  className={`flex flex-col items-start gap-1.5 rounded-2xl border-2 p-3.5 text-start transition-all ${
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
                        {tr(uiLanguage, 'Selected ✓', 'مختار ✓')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-black text-[#1A2530]">
                    {tr(uiLanguage, 'Feature Film', 'فيلم سينمائي')}
                  </p>
                  <p className="text-[10px] leading-relaxed font-bold text-[#1A2530]/75">
                    {isEn ? (
                      <>
                        Driven by <strong className="text-[#D91624]">Box-Office Revenue ({currencyLabel})</strong> and cinema screen count
                      </>
                    ) : (
                      <>
                        يقاس بـ <strong className="text-[#D91624]">إيرادات شباك التذاكر ({currencyLabel})</strong> وعدد شاشات السينما
                      </>
                    )}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!progression.canProduceSeries) {
                      showToast(
                        tr(
                          uiLanguage,
                          'Drama Series unlock at Studio Level 2 (Release 2 films + 7.0+ critic score or 110M valuation).',
                          'المسلسلات الدرامية تُفتح في المستوى 2 (أنتج عملين + تقييم 7.0+ أو قيمة سوقية 110M).'
                        ),
                        'warning'
                      );
                      return;
                    }
                    updateDraft({
                      format: 'series',
                      episodes:
                        !progression.canProduceLongSeries && draft.episodes >= 15
                          ? 7
                          : draft.episodes,
                    });
                  }}
                  className={`flex flex-col items-start gap-1.5 rounded-2xl border-2 p-3.5 text-start transition-all ${
                    isSeries
                      ? 'border-[#D91624] border-b-4 border-b-[#9E0F19] bg-[#FFF9E6] shadow-xs'
                      : !progression.canProduceSeries
                      ? 'border-[#1A2530]/15 bg-[#F9F6F0]/75 opacity-80'
                      : 'border-[#1A2530]/15 bg-[#F9F6F0] hover:border-[#D4AF37]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        isSeries
                          ? 'border border-[#D4AF37] bg-[#D91624] text-white'
                          : 'bg-[#1A2530]/10 text-[#1A2530]'
                      }`}
                    >
                      {progression.canProduceSeries ? (
                        <Tv className="h-5 w-5" />
                      ) : (
                        <Lock className="h-4 w-4 text-[#9A7209]" />
                      )}
                    </div>
                    {isSeries ? (
                      <span className="rounded-lg bg-[#D91624] px-2 py-0.5 text-[9px] font-black text-white">
                        {tr(uiLanguage, 'Selected ✓', 'مختار ✓')}
                      </span>
                    ) : !progression.canProduceSeries ? (
                      <span className="inline-flex items-center gap-0.5 rounded-lg bg-[#1A2530] px-2 py-0.5 text-[9px] font-black text-[#D4AF37]">
                        <Lock className="h-2.5 w-2.5" />
                        <span>{tr(uiLanguage, 'Lv.2', 'مستوى 2')}</span>
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs font-black text-[#1A2530]">
                    {tr(uiLanguage, 'Drama Series', 'مسلسل درامي')}
                  </p>
                  <p className="text-[10px] leading-relaxed font-bold text-[#1A2530]/75">
                    {!progression.canProduceSeries ? (
                      <span className="text-[#9A7209]">
                        {tr(
                          uiLanguage,
                          'Unlocks at Level 2 (2 films + 7.0+ critics or 110M value)',
                          'يُفتح في المستوى 2 (عملين + تقييم 7.0+ أو قيمة 110M)'
                        )}
                      </span>
                    ) : isEn ? (
                      <>
                        Driven by <strong className="text-[#D91624]">Millions of Views</strong> plus streaming & TV broadcast deals
                      </>
                    ) : (
                      <>
                        يقاس بـ <strong className="text-[#D91624]">عدد المشاهدات بالمليون</strong> وعقود المنصات والقنوات
                      </>
                    )}
                  </p>
                </button>
              </div>

              {isSeries && (
                <div className="pt-2 border-t border-[#D4AF37]/30 space-y-2">
                  <p className="text-xs font-black text-[#1A2530]">
                    {tr(uiLanguage, 'Episode Count:', 'عدد حلقات المسلسل:')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {episodeCounts.map((ep) => {
                      const epReqLevel = getEpisodesRequiredLevel(ep.count);
                      const isEpLocked = progression.level < epReqLevel;
                      return (
                        <button
                          key={ep.count}
                          type="button"
                          onClick={() => {
                            if (isEpLocked) {
                              showToast(
                                tr(
                                  uiLanguage,
                                  '15 & 30-episode Ramadan marathons unlock at Studio Level 3 (250M valuation + 1 festival award).',
                                  'مسلسلات 15 و30 حلقة تُفتح في المستوى 3 (قيمة سوقية 250M + جائزة مهرجان).'
                                ),
                                'warning'
                              );
                              return;
                            }
                            updateDraft({ episodes: ep.count });
                          }}
                          className={`rounded-xl border-2 p-2.5 text-start transition ${
                            draft.episodes === ep.count
                              ? 'border-[#D4AF37] border-b-4 border-b-[#A6841D] bg-[#1A2530] text-[#F9F6F0]'
                              : isEpLocked
                              ? 'border-[#1A2530]/15 bg-[#F9F6F0]/75 text-[#1A2530]/65'
                              : 'border-[#1A2530]/15 bg-[#F9F6F0] text-[#1A2530] hover:border-[#D4AF37]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-black">{ep.label}</p>
                            {isEpLocked && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-[#1A2530] px-1.5 py-0.5 text-[9px] font-black text-[#D4AF37]">
                                <Lock className="h-2.5 w-2.5" />
                                <span>{tr(uiLanguage, 'Lv.3', 'م3')}</span>
                              </span>
                            )}
                          </div>
                          <p
                            className={`mt-0.5 text-[10px] ${
                              draft.episodes === ep.count ? 'text-[#F9F6F0]/75' : 'text-[#1A2530]/65'
                            }`}
                          >
                            {isEpLocked
                              ? tr(uiLanguage, 'Requires Lv.3 (250M + 1 Award)', 'يتطلب مستوى 3 (250M + جائزة)')
                              : ep.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Season Selection */}
            <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#D91624]" />
                <h2 className="font-display text-sm font-black text-[#1A2530]">
                  {isSeries
                    ? tr(uiLanguage, 'TV & Streaming Broadcast Window', 'موسم البث التلفزيوني والرقمي')
                    : tr(uiLanguage, 'Theatrical Release Season', 'موسم الطرح في شباك التذاكر')}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {!isSeries
                  ? filmSeasons.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateDraft({ filmSeason: s.id })}
                        className={`rounded-2xl border-2 p-3 text-start transition ${
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
                        className={`rounded-2xl border-2 p-3 text-start transition ${
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
                  {tr(uiLanguage, 'Content & Age Rating', 'التصنيف الرقابي والعمري')}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {ageRatings.map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => updateDraft({ ageRating: ar.id })}
                    className={`rounded-2xl border-2 p-3 text-start transition ${
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
                  className={`rounded-xl border-2 p-2.5 text-start transition ${
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
                    {tr(uiLanguage, 'Primary Genre (Required)', 'التصنيف الأساسي (إلزامي)')}
                  </span>
                  <p className="mt-0.5 text-xs font-black">
                    {primaryGenreInfo
                      ? primaryGenreInfo.name
                      : tr(uiLanguage, 'Select Now', 'اختر الآن')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setGenrePickMode('secondary')}
                  className={`rounded-xl border-2 p-2.5 text-start transition ${
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
                      {tr(uiLanguage, 'Secondary Genre (Optional)', 'التصنيف الفرعي (اختياري)')}
                    </span>
                    {draft.secondaryGenre && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          updateDraft({ secondaryGenre: null });
                        }}
                        className="cursor-pointer text-[10px] font-black text-[#D91624] hover:underline"
                      >
                        {tr(uiLanguage, 'Clear', 'إلغاء')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs font-black">
                    {secondaryGenreInfo
                      ? secondaryGenreInfo.name
                      : tr(uiLanguage, 'No Sub-Genre', 'بدون تصنيف فرعي')}
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
                  const reqLevel = getGenreRequiredLevel(g.id as GenreId);
                  const isLocked = progression.level < reqLevel;
                  const IconComp = GENRE_ICON_MAP[g.icon] || Sparkles;
                  const locGenre = getLocalizedGenreInfo(g.id as GenreId, uiLanguage);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleSelectGenre(g.id as GenreId)}
                      className={`flex flex-col items-start justify-between rounded-2xl border-2 p-3 text-start transition-all ${
                        isPrimary
                          ? 'border-[#D4AF37] border-b-4 border-b-[#9A7A16] bg-[#1A2530] text-[#F9F6F0] shadow-md'
                          : isSecondary
                          ? 'border-[#D91624] border-b-4 border-b-[#9E0F19] bg-[#FFF9E6] text-[#1A2530]'
                          : isLocked
                          ? 'border-[#1A2530]/12 bg-[#F9F6F0]/70 text-[#1A2530]/75 opacity-85'
                          : 'border-[#1A2530]/15 bg-[#F9F6F0] text-[#1A2530] hover:border-[#D4AF37]'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                            isPrimary
                              ? 'bg-[#D4AF37] text-[#1A2530]'
                              : isSecondary
                              ? 'bg-[#D91624] text-white'
                              : isLocked
                              ? 'bg-[#1A2530]/10 text-[#9A7209]'
                              : 'bg-[#1A2530]/10 text-[#1A2530]'
                          }`}
                        >
                          {isLocked ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <IconComp className="h-4 w-4" />
                          )}
                        </div>
                        {isPrimary && (
                          <span className="rounded-lg bg-[#D4AF37] px-2 py-0.5 text-[9px] font-black text-[#1A2530]">
                            {tr(uiLanguage, 'Primary ✓', 'أساسي ✓')}
                          </span>
                        )}
                        {isSecondary && (
                          <span className="rounded-lg bg-[#D91624] px-2 py-0.5 text-[9px] font-black text-white">
                            {tr(uiLanguage, 'Sub ✓', 'فرعي ✓')}
                          </span>
                        )}
                        {!isPrimary && !isSecondary && isLocked && (
                          <span className="inline-flex items-center gap-0.5 rounded-lg bg-[#1A2530] px-1.5 py-0.5 text-[9px] font-black text-[#D4AF37]">
                            <Lock className="h-2.5 w-2.5" />
                            <span>{tr(uiLanguage, `Lv.${reqLevel}`, `م${reqLevel}`)}</span>
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-black">{locGenre.name}</p>
                        <p
                          className={`mt-0.5 text-[10px] leading-relaxed ${
                            isPrimary
                              ? 'text-[#F9F6F0]/75'
                              : isLocked
                              ? 'text-[#9A7209] font-bold'
                              : 'text-[#1A2530]/65'
                          }`}
                        >
                          {isLocked
                            ? reqLevel === 2
                              ? tr(uiLanguage, 'Unlocks at Level 2 (2 Films)', 'يُفتح مستوى 2 (عملين)')
                              : tr(uiLanguage, 'Unlocks at Level 4 (550M + 3 Awards)', 'يُفتح مستوى 4 (550M + 3 جوائز)')
                            : locGenre.description}
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
                {isSeries
                  ? tr(uiLanguage, 'Series Title & Script Synopsis', 'عنوان المسلسل وملخص السيناريو')
                  : tr(uiLanguage, 'Film Title & Script Synopsis', 'عنوان الفيلم وملخص السيناريو')}
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
                <span>
                  {tr(uiLanguage, 'Pitch Story & Script Idea', 'ابتكار فكرة وسيناريو درامي')}
                </span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-black text-[#1A2530]">
                  {isSeries
                    ? tr(uiLanguage, 'Drama Series Title', 'عنوان المسلسل الدرامي')
                    : tr(uiLanguage, 'Feature Film Title', 'عنوان الفيلم السينمائي')}
                </label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => updateDraft({ title: e.target.value })}
                  placeholder={
                    isEn
                      ? isSeries
                        ? worldMarket === 'saudi'
                          ? 'e.g., Diriyah Nights / The Red Sea Heir'
                          : 'e.g., The Cairo Pact / Midnight on the Nile'
                        : worldMarket === 'saudi'
                        ? 'e.g., The Lost Road to AlUla / Boulevard Heist'
                        : 'e.g., The Bab El-Khalq Cipher / Night of Masks'
                      : isSeries
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
                  {tr(
                    uiLanguage,
                    'Story Synopsis, Central Conflict & Finale Twist',
                    'ملخص القصة والصراع الدرامي والنهاية'
                  )}
                </label>
                <textarea
                  rows={4}
                  value={draft.scriptSynopsis}
                  onChange={(e) => updateDraft({ scriptSynopsis: e.target.value })}
                  placeholder={tr(
                    uiLanguage,
                    'Describe the opening hook, the protagonist’s high-stakes conflict, and the unforgettable climax...',
                    'اكتب بداية الأحداث، الصراع الرئيسي الذي يواجه البطل، والمفاجأة الدرامية في النهاية...'
                  )}
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
            <span>
              {step === 1
                ? tr(uiLanguage, 'Back to HQ', 'عودة للمقر')
                : tr(uiLanguage, 'Previous', 'السابق')}
            </span>
          </button>

          <button
            type="button"
            onClick={handleNextStep}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-[#D4AF37] bg-[#D91624] px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-110 active:translate-y-0.5"
          >
            {step === 3 && <Check className="h-4 w-4" />}
            <span>
              {step < 3
                ? tr(uiLanguage, 'Next', 'التالي')
                : tr(uiLanguage, 'Proceed to Casting & Deals', 'الانتقال لغرفة التعاقدات')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
