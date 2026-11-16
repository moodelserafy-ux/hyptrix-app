'use client';

import React, { useState } from 'react';
import { StepModalFrame } from './StepModalFrame';
import { FloatingToast } from './FloatingToast';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/lib/store';
import { GENRES, GenreId } from '@/lib/db-resolver';
import {
  calculateGenreSynergy,
  ProjectFormat,
  SeriesEpisodes,
  SeriesSeason,
  FilmReleaseSeason,
  AgeRating,
} from '@/lib/game-engine';
import {
  Film,
  Tv,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  FileText,
  Check,
  Calendar,
  Layers,
  Flame,
  Laugh,
  Skull,
  Search,
  Rocket,
  Drama,
  Heart,
  Crown,
  KeyRound,
  Compass,
  Ban,
} from 'lucide-react';

const PRESET_SCRIPTS: { title: string; primary: GenreId; secondary: GenreId; synopsis: string }[] = [
  {
    title: 'الفرعون الأخير',
    primary: 'action',
    secondary: 'popular_drama',
    synopsis:
      'ضابط عمليات خاصة سابق يكتشف شبكة دولية لتهريب الآثار تحت شوارع القاهرة القديمة، فيخوض معركة شرسة ضد إمبراطور الجريمة لإنقاذ كنز فرعوني مفقود قبل فوات الأوان.',
  },
  {
    title: 'همس الغرفة 404',
    primary: 'crime_mystery',
    secondary: 'psychological_horror',
    synopsis:
      'طبيب نفسي جنائي يحقق في سلسلة جرائم غامضة داخل فندق مهجور بالإسكندرية، ليكتشف في النهاية أن القاتل يترك رسائل مشفرة مرتبطة بماضي الطبيب نفسه.',
  },
  {
    title: 'خزينة المليار',
    primary: 'heist',
    secondary: 'comedy',
    synopsis:
      'مهندس عبقري مفلس يجمع فريقاً من الهواة غريبي الأطوار لتنفيذ أكبر عملية سطو ذكية على خزينة رقمية، لكن الخطة تنقلب إلى مطاردات كوميدية ومفاجأة غير متوقعة في المشهد الأخير.',
  },
];

const GENRE_VISUAL_META: Record<
  GenreId,
  {
    subtitle: string;
    accentBg: string;
    accentText: string;
    activeBorder: string;
    activeBg: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  action: {
    subtitle: 'مطاردات وإثارة جماهيرية',
    accentBg: 'bg-rose-100',
    accentText: 'text-rose-700',
    activeBorder: 'border-rose-500 border-b-4 border-b-rose-700',
    activeBg: 'bg-gradient-to-br from-rose-50 via-white to-orange-50',
    icon: Flame,
  },
  popular_drama: {
    subtitle: 'صراعات الحارة والواقع',
    accentBg: 'bg-emerald-100',
    accentText: 'text-emerald-700',
    activeBorder: 'border-emerald-600 border-b-4 border-b-emerald-800',
    activeBg: 'bg-gradient-to-br from-emerald-50 via-white to-teal-50',
    icon: Drama,
  },
  comedy: {
    subtitle: 'كوميديا ساخرة وذكية',
    accentBg: 'bg-amber-100',
    accentText: 'text-amber-700',
    activeBorder: 'border-amber-500 border-b-4 border-b-amber-700',
    activeBg: 'bg-gradient-to-br from-amber-50 via-white to-yellow-50',
    icon: Laugh,
  },
  light_comedy: {
    subtitle: 'ضحك عائلي لجميع الأعمار',
    accentBg: 'bg-orange-100',
    accentText: 'text-orange-700',
    activeBorder: 'border-orange-500 border-b-4 border-b-orange-700',
    activeBg: 'bg-gradient-to-br from-orange-50 via-white to-amber-50',
    icon: Laugh,
  },
  psychological_horror: {
    subtitle: 'توتر نفسي وأجواء غامضة',
    accentBg: 'bg-purple-100',
    accentText: 'text-purple-700',
    activeBorder: 'border-purple-600 border-b-4 border-b-purple-800',
    activeBg: 'bg-gradient-to-br from-purple-50 via-white to-fuchsia-50',
    icon: Skull,
  },
  supernatural_horror: {
    subtitle: 'أساطير مرعبة وما وراء الطبيعة',
    accentBg: 'bg-fuchsia-100',
    accentText: 'text-fuchsia-700',
    activeBorder: 'border-fuchsia-600 border-b-4 border-b-fuchsia-800',
    activeBg: 'bg-gradient-to-br from-fuchsia-50 via-white to-purple-50',
    icon: Skull,
  },
  crime_mystery: {
    subtitle: 'تحقيقات بوليسية وألغاز',
    accentBg: 'bg-indigo-100',
    accentText: 'text-indigo-700',
    activeBorder: 'border-indigo-600 border-b-4 border-b-indigo-800',
    activeBg: 'bg-gradient-to-br from-indigo-50 via-white to-blue-50',
    icon: Search,
  },
  sci_fi: {
    subtitle: 'عوالم مستقبلية وتقنيات',
    accentBg: 'bg-cyan-100',
    accentText: 'text-cyan-700',
    activeBorder: 'border-cyan-500 border-b-4 border-b-cyan-700',
    activeBg: 'bg-gradient-to-br from-cyan-50 via-white to-sky-50',
    icon: Rocket,
  },
  romance: {
    subtitle: 'مشاعر إنسانية وقصص حب',
    accentBg: 'bg-pink-100',
    accentText: 'text-pink-700',
    activeBorder: 'border-pink-500 border-b-4 border-b-pink-700',
    activeBg: 'bg-gradient-to-br from-pink-50 via-white to-rose-50',
    icon: Heart,
  },
  historical: {
    subtitle: 'ملاحم تاريخية وحربية ضخمة',
    accentBg: 'bg-yellow-100',
    accentText: 'text-yellow-800',
    activeBorder: 'border-yellow-600 border-b-4 border-b-yellow-800',
    activeBg: 'bg-gradient-to-br from-yellow-50 via-white to-amber-50',
    icon: Crown,
  },
  biography: {
    subtitle: 'قصص شخصيات استثنائية',
    accentBg: 'bg-sky-100',
    accentText: 'text-sky-700',
    activeBorder: 'border-sky-600 border-b-4 border-b-sky-800',
    activeBg: 'bg-gradient-to-br from-sky-50 via-white to-indigo-50',
    icon: Crown,
  },
  heist: {
    subtitle: 'خطط ذكية وعمليات سطو',
    accentBg: 'bg-violet-100',
    accentText: 'text-violet-700',
    activeBorder: 'border-violet-600 border-b-4 border-b-violet-800',
    activeBg: 'bg-gradient-to-br from-violet-50 via-white to-indigo-50',
    icon: KeyRound,
  },
  fantasy: {
    subtitle: 'عوالم سحرية وأساطير قديمة',
    accentBg: 'bg-teal-100',
    accentText: 'text-teal-700',
    activeBorder: 'border-teal-600 border-b-4 border-b-teal-800',
    activeBg: 'bg-gradient-to-br from-teal-50 via-white to-cyan-50',
    icon: Compass,
  },
  superhero: {
    subtitle: 'قوى خارقة ومعارك ملحمية',
    accentBg: 'bg-blue-100',
    accentText: 'text-blue-700',
    activeBorder: 'border-blue-600 border-b-4 border-b-blue-800',
    activeBg: 'bg-gradient-to-br from-blue-50 via-white to-cyan-50',
    icon: Flame,
  },
};

export function Stage2ProjectSetup() {
  const {
    draft,
    updateDraft,
    setActiveScreen,
    groqApiKeyClient,
    preferredGroqModel,
  } = useGameStore();
  const [subStep, setSubStep] = useState<1 | 2 | 3 | 4>(1);
  const [genrePickTab, setGenrePickTab] = useState<'primary' | 'secondary'>('primary');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  const [analyzingScript, setAnalyzingScript] = useState(false);

  const synergy = calculateGenreSynergy(draft.primaryGenre, draft.secondaryGenre, 88, 88);

  const primaryGenreName =
    GENRES.find((g) => g.id === draft.primaryGenre)?.name || draft.primaryGenre;
  const secondaryGenreName = draft.secondaryGenre
    ? GENRES.find((g) => g.id === draft.secondaryGenre)?.name || ''
    : '';

  const unlockNext = (next: 1 | 2 | 3 | 4) => {
    setValidationError(null);
    setSubStep(next);
  };

  const handleGenerateScriptIdea = async () => {
    setGeneratingIdea(true);
    setValidationError(null);
    try {
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
            primaryGenreName,
            secondaryGenreName,
            ageRating: draft.ageRating,
            currentTitle: draft.title,
          },
        }),
      });
      const data = await res.json();
      if (data.title && data.synopsis) {
        updateDraft({
          title: data.title,
          scriptSynopsis: data.synopsis,
          aiScriptAnalysis: null,
        });
      }
    } catch {
      // Fallback handled
    } finally {
      setGeneratingIdea(false);
    }
  };

  const handleAnalyzeScriptSynopsis = async () => {
    if (!draft.title.trim() || draft.scriptSynopsis.trim().length < 15) {
      setValidationError(
        'اكتب اسم العمل وملخص القصة أولاً (15 حرفاً على الأقل) لتقييم قوة السيناريو.'
      );
      return;
    }
    setAnalyzingScript(true);
    setValidationError(null);
    try {
      const res = await fetch('/api/generate-event', {
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
            primaryGenreName,
          },
        }),
      });
      const data = await res.json();
      if (data.verdict) {
        updateDraft({
          aiScriptAnalysis: {
            score: Number(data.score || 78),
            verdict: data.verdict,
            castingAdvice: data.castingAdvice || '',
            modelUsed: 'لجنة القراءة الدرامية',
          },
        });
      }
    } catch {
      // Fallback handled
    } finally {
      setAnalyzingScript(false);
    }
  };

  const handleProceedToCrew = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draft.title.trim()) {
      setValidationError('يرجى كتابة اسم الفيلم أو المسلسل أولاً.');
      return;
    }
    if (draft.scriptSynopsis.trim().length < 15) {
      setValidationError(
        'يرجى كتابة ملخص القصة والحبكة وتفاصيل النهاية (15 حرفاً على الأقل) قبل الانتقال للتفاوض مع النجوم.'
      );
      return;
    }
    setValidationError(null);
    setActiveScreen('CREW_CAST_CARDS');
  };

  return (
    <StepModalFrame label="إعداد المشروع الفني">
      <div className="mx-auto max-w-3xl space-y-4 py-1">
      <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-[0_8px_28px_-14px_rgba(79,70,229,0.28)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-black text-violet-700">غرفة تطوير المشروع</span>
            <h2 className="font-display truncate text-base font-black text-slate-900 sm:text-lg">
              {['شكل العمل الفني', 'موعد العرض', 'التصنيف العمري', 'السيناريو'][subStep - 1]}
            </h2>
          </div>
          <span className="shrink-0 rounded-xl bg-violet-50 px-3 py-2 text-[11px] font-black tabular-nums text-violet-800">
            {subStep} / 4
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-l from-cyan-400 via-violet-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${(subStep / 4) * 100}%` }} />
        </div>
      </div>
      <FloatingToast message={validationError} onDismiss={() => setValidationError(null)} />

      {/* Focused Step Deck */}
      <AnimatePresence mode="wait">
        {subStep === 1 && (
          <motion.div
            key="proj-s1"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.16)]"
          >
            <span className="text-[11px] font-black text-violet-600">الخطوة 1 من 4</span>
            <h3 className="font-display mt-0.5 text-xl font-black text-slate-900">
              اختر شكل العمل الفني القادم
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => updateDraft({ format: 'film' as ProjectFormat })}
                className={`flex flex-col items-start rounded-3xl border-2 p-5 text-right transition-all ${
                  draft.format === 'film'
                    ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50/70 shadow-sm'
                    : 'border-indigo-100 bg-[#F8FAFF] hover:border-violet-300'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
                  <Film className="h-6 w-6" />
                </div>
                <div className="font-display mt-3 text-base font-black text-slate-900">
                  فيلم سينمائي (Feature Film)
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  منافسة أسبوعية في شباك التذاكر السينمائي ثم بيع حقوق البث للمنصات.
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateDraft({ format: 'series' as ProjectFormat })}
                className={`flex flex-col items-start rounded-3xl border-2 p-5 text-right transition-all ${
                  draft.format === 'series'
                    ? 'border-cyan-500 border-b-4 border-b-cyan-600 bg-cyan-50/70 shadow-sm'
                    : 'border-indigo-100 bg-[#F8FAFF] hover:border-cyan-300'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500 text-white shadow-sm">
                  <Tv className="h-6 w-6" />
                </div>
                <div className="font-display mt-3 text-base font-black text-slate-900">
                  مسلسل درامي (TV Series)
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  عرض درامي حلقة بحلقة عبر القنوات والمنصات مع متابعة تفاعل الجمهور مع كل حلقة.
                </p>
              </button>
            </div>

            {draft.format === 'series' && (
              <div className="mt-4 rounded-2xl border-2 border-indigo-100 bg-[#F5F7FF] p-4">
                <label className="block text-xs font-black text-slate-700">عدد حلقات المسلسل</label>
                <div className="mt-2 grid grid-cols-4 gap-2 tabular-nums">
                  {([7, 10, 15, 30] as SeriesEpisodes[]).map((ep) => (
                    <button
                      key={ep}
                      type="button"
                      onClick={() => updateDraft({ episodes: ep })}
                      className={`min-h-[42px] rounded-xl border-2 text-xs font-black transition ${
                        draft.episodes === ep
                          ? 'border-violet-600 bg-violet-600 text-white'
                          : 'border-indigo-100 bg-white text-slate-700'
                      }`}
                    >
                      {ep} حلقة
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
              <button
                type="button"
                onClick={() => setActiveScreen('STUDIO_HUB')}
                className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
              >
                <ArrowRight className="h-4 w-4" />
                <span>العودة للمقر</span>
              </button>
              <button
                type="button"
                onClick={() => unlockNext(2)}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-900/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <span>تأكيد والانتقال لموسم الطرح والرقابة</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 2 && (
          <motion.div
            key="proj-s2"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.16)]"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-600" />
              <div>
                <span className="text-[11px] font-black text-violet-600">الخطوة 2 من 4</span>
                <h3 className="font-display text-lg font-black text-slate-900">
                  توقيت العرض والتصنيف العمري
                </h3>
              </div>
            </div>

            {draft.format === 'series' ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateDraft({ seriesSeason: 'ramadan' as SeriesSeason })}
                  className={`rounded-2xl border-2 p-4 text-right text-xs font-black transition ${
                    draft.seriesSeason === 'ramadan'
                      ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50 text-violet-900'
                      : 'border-indigo-100 bg-[#F8FAFF] text-slate-700'
                  }`}
                >
                  <div className="text-sm font-black">موسم دراما رمضان</div>
                  <div className="mt-1 text-[11px] font-medium text-slate-500">عرض يومي وإعلانات ضخمة</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateDraft({ seriesSeason: 'off_season' as SeriesSeason })}
                  className={`rounded-2xl border-2 p-4 text-right text-xs font-black transition ${
                    draft.seriesSeason === 'off_season'
                      ? 'border-cyan-500 border-b-4 border-b-cyan-600 bg-cyan-50 text-cyan-900'
                      : 'border-indigo-100 bg-[#F8FAFF] text-slate-700'
                  }`}
                >
                  <div className="text-sm font-black">أعمال المنصات الأصلية</div>
                  <div className="mt-1 text-[11px] font-medium text-slate-500">عرض أسبوعي/حصري للمشتركين</div>
                </button>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'eid_adha', label: 'موسم عيد الأضحى', sub: 'ذروة شباك التذاكر' },
                    { id: 'eid_fitr', label: 'موسم عيد الفطر', sub: 'إقبال عائلي وشبابي' },
                    { id: 'summer', label: 'موسم الصيف', sub: 'عروض طويلة المدى' },
                    { id: 'mid_year', label: 'إجازة نصف العام', sub: 'فرصة للأعمال المبتكرة' },
                  ] as { id: FilmReleaseSeason; label: string; sub: string }[]
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => updateDraft({ filmSeason: s.id })}
                    className={`rounded-2xl border-2 p-3.5 text-right transition ${
                      draft.filmSeason === s.id
                        ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50 text-slate-900'
                        : 'border-indigo-100 bg-[#F8FAFF] text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-black">{s.label}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{s.sub}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5">
              <label className="block text-xs font-black text-slate-700">
                التصنيف العمري والرقابة
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2.5">
                {(
                  [
                    { id: 'G', title: 'عائلي (G)', desc: '+15% تذاكر' },
                    { id: '+12', title: 'شبابي (+12)', desc: 'توازن مثالي' },
                    { id: '+18', title: 'للكبار (+18)', desc: 'جرأة نقدية' },
                  ] as { id: AgeRating; title: string; desc: string }[]
                ).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => updateDraft({ ageRating: r.id })}
                    className={`rounded-2xl border-2 p-3 text-center transition ${
                      draft.ageRating === r.id
                        ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50'
                        : 'border-indigo-100 bg-[#F8FAFF]'
                    }`}
                  >
                    <div className="font-display text-xs font-black text-slate-900">{r.title}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-violet-600">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
              <button
                type="button"
                onClick={() => setSubStep(1)}
                className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
              >
                <ArrowRight className="h-4 w-4" />
                <span>السابق</span>
              </button>

              <button
                type="button"
                onClick={() => unlockNext(3)}
                className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-900/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <span>التالي: تحديد التصنيف الدرامي</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 3 && (
          <motion.div
            key="proj-s3"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.16)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-violet-600" />
                <div>
                  <span className="text-[11px] font-black text-violet-600">الخطوة 3 من 4</span>
                  <h3 className="font-display text-lg font-black text-slate-900">
                    اختيار التصنيف الدرامي والدمج الفني
                  </h3>
                </div>
              </div>
            </div>

            {/* Interactive Switcher between Primary Genre and Secondary Genre */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#F2F5FF] p-1.5">
              <button
                type="button"
                onClick={() => setGenrePickTab('primary')}
                className={`flex flex-col items-center justify-center rounded-xl py-2 px-2 text-xs font-black transition ${
                  genrePickTab === 'primary'
                    ? 'border-2 border-violet-600 bg-white text-violet-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-[10px] text-slate-400">النوع الرئيسي (إجباري)</span>
                <span className="mt-0.5 truncate max-w-full font-display text-xs text-violet-700">
                  {primaryGenreName}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGenrePickTab('secondary')}
                className={`flex flex-col items-center justify-center rounded-xl py-2 px-2 text-xs font-black transition ${
                  genrePickTab === 'secondary'
                    ? 'border-2 border-cyan-500 bg-white text-cyan-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-[10px] text-slate-400">النوع الفرعي (دمج اختياري)</span>
                <span className="mt-0.5 truncate max-w-full font-display text-xs text-cyan-700">
                  {secondaryGenreName || 'بدون تصنيف فرعي'}
                </span>
              </button>
            </div>

            {/* Visual Genre Card Grid (Replaces native black <select> menu!) */}
            <div
              data-testid="visual-genre-card-grid"
              className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-2"
            >
              {genrePickTab === 'secondary' && (
                <button
                  type="button"
                  onClick={() => updateDraft({ secondaryGenre: null })}
                  className={`col-span-2 flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-right transition ${
                    draft.secondaryGenre === null
                      ? 'border-slate-700 border-b-4 border-b-slate-900 bg-slate-100 text-slate-900'
                      : 'border-indigo-100 bg-[#F8FAFF] text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                      <Ban className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-display text-xs font-black">بدون تصنيف فرعي</div>
                      <div className="text-[10px] font-bold text-slate-500">
                        التركيز الكامل على التصنيف الأساسي فقط
                      </div>
                    </div>
                  </div>
                  {draft.secondaryGenre === null && (
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-black text-white">
                      مُختار ✓
                    </span>
                  )}
                </button>
              )}

              {GENRES.map((g) => {
                const visual = GENRE_VISUAL_META[g.id];
                const IconComp = visual.icon;
                const isSelected =
                  genrePickTab === 'primary'
                    ? draft.primaryGenre === g.id
                    : draft.secondaryGenre === g.id;
                const isDisabledInSecondary =
                  genrePickTab === 'secondary' && draft.primaryGenre === g.id;

                return (
                  <button
                    key={g.id}
                    type="button"
                    disabled={isDisabledInSecondary}
                    onClick={() => {
                      if (genrePickTab === 'primary') {
                        updateDraft({
                          primaryGenre: g.id,
                          secondaryGenre:
                            draft.secondaryGenre === g.id ? null : draft.secondaryGenre,
                        });
                      } else {
                        updateDraft({
                          secondaryGenre: draft.secondaryGenre === g.id ? null : g.id,
                        });
                      }
                    }}
                    className={`relative flex flex-col justify-between rounded-2xl border-2 p-3.5 text-right transition-all ${
                      isSelected
                        ? `${visual.activeBorder} ${visual.activeBg} shadow-sm`
                        : isDisabledInSecondary
                        ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-45'
                        : 'border-indigo-100 bg-[#F8FAFF] hover:border-violet-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${visual.accentBg} ${visual.accentText}`}
                      >
                        <IconComp className="h-4 w-4" />
                      </div>
                      {isSelected && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-black text-white">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                          <span>{genrePickTab === 'primary' ? 'أساسي' : 'فرعي'}</span>
                        </span>
                      )}
                      {isDisabledInSecondary && (
                        <span className="text-[9px] font-black text-slate-400">مختار كأساسي</span>
                      )}
                    </div>

                    <div className="mt-2.5">
                      <div className="font-display text-xs font-black text-slate-900">
                        {g.name}
                      </div>
                      <div className="mt-0.5 text-[10px] font-bold text-slate-500">
                        {visual.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Synergy Indicator */}
            <div
              className={`mt-4 flex items-center gap-3 rounded-2xl border-2 p-4 text-xs ${
                synergy.isHarmonious
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              {synergy.isHarmonious ? (
                <Sparkles className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
              )}
              <div>
                <div className="font-black">
                  مؤشر التناغم الدرامي ({primaryGenreName}
                  {secondaryGenreName ? ` + ${secondaryGenreName}` : ''}):
                </div>
                <div className="mt-0.5 font-medium">{synergy.label}</div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
              <button
                type="button"
                onClick={() => setSubStep(2)}
                className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
              >
                <ArrowRight className="h-4 w-4" />
                <span>السابق</span>
              </button>

              <button
                type="button"
                onClick={() => unlockNext(4)}
                className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-900/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <span>التالي: كتابة فكرة العمل والسيناريو</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 4 && (
          <motion.div
            key="proj-s4"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.16)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-600" />
                <div>
                  <span className="text-[11px] font-black text-violet-600">الخطوة 4 من 4</span>
                  <h3 className="font-display text-lg font-black text-slate-900">
                    عنوان العمل وتطوير السيناريو
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateScriptIdea}
                disabled={generatingIdea}
                className="flex items-center gap-1.5 rounded-xl border-b-4 border-indigo-900/30 bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:brightness-105 active:border-b-0 active:translate-y-0.5 disabled:opacity-60"
              >
                <Sparkles className={`h-3.5 w-3.5 ${generatingIdea ? 'animate-spin' : ''}`} />
                <span>
                  {generatingIdea
                    ? 'جاري صياغة معالجة درامية جديدة...'
                    : 'اقتراح فكرة وسيناريو من ورشة الكتابة'}
                </span>
              </button>
            </div>

            {/* 1-Tap Quick Script Chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PRESET_SCRIPTS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    updateDraft({
                      title: preset.title,
                      primaryGenre: preset.primary,
                      secondaryGenre: preset.secondary,
                      scriptSynopsis: preset.synopsis,
                      aiScriptAnalysis: null,
                    })
                  }
                  className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-black text-violet-700 transition hover:bg-violet-100"
                >
                  ✨ سيناريو جاهز: {preset.title}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="project-title-input" className="block text-xs font-black text-slate-700">
                  اسم الفيلم / المسلسل
                </label>
                <input
                  id="project-title-input"
                  type="text"
                  value={draft.title}
                  onChange={(e) => updateDraft({ title: e.target.value })}
                  placeholder="مثال: الفرعون الأخير"
                  className="mt-1.5 w-full rounded-2xl border-2 border-indigo-100 bg-[#F5F7FF] px-4 py-3 text-sm font-black text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="script-synopsis-input" className="block text-xs font-black text-slate-700">
                    ملخص القصة والصراع الدرامي وتفاصيل النهاية
                  </label>
                  <button
                    type="button"
                    onClick={handleAnalyzeScriptSynopsis}
                    disabled={analyzingScript}
                    className="rounded-lg bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-800 border border-cyan-200 hover:bg-cyan-100 disabled:opacity-50"
                  >
                    {analyzingScript ? 'جاري التقييم...' : 'تقييم قوة السيناريو والحبكة'}
                  </button>
                </div>
                <textarea
                  id="script-synopsis-input"
                  rows={3}
                  value={draft.scriptSynopsis}
                  onChange={(e) => updateDraft({ scriptSynopsis: e.target.value })}
                  placeholder="اكتب قصة العمل، الصراع الدرامي، والمفاجأة في النهاية..."
                  className="mt-1.5 w-full rounded-2xl border-2 border-indigo-100 bg-[#F5F7FF] p-3.5 text-xs leading-relaxed font-medium text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Script Consultant Evaluation Card */}
            {draft.aiScriptAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-4 text-xs"
              >
                <div className="flex items-center justify-between border-b border-violet-100 pb-2">
                  <span className="font-black text-violet-800">
                    تقرير مستشار السيناريو ولجنة القراءة
                  </span>
                  <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-black text-white tabular-nums">
                    قوة الورق: {draft.aiScriptAnalysis.score}/100
                  </span>
                </div>
                <p className="mt-2 font-bold leading-relaxed text-slate-800">
                  {draft.aiScriptAnalysis.verdict}
                </p>
                {draft.aiScriptAnalysis.castingAdvice && (
                  <p className="mt-1.5 text-[11px] font-semibold text-indigo-700">
                    💡 توصية اختيار الأبطال: {draft.aiScriptAnalysis.castingAdvice}
                  </p>
                )}
              </motion.div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
              <button
                type="button"
                onClick={() => setSubStep(3)}
                className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
              >
                <ArrowRight className="h-4 w-4" />
                <span>السابق</span>
              </button>

              <button
                type="button"
                onClick={() => handleProceedToCrew()}
                className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-900/40 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <span>اعتماد السيناريو وفتح سوق النجوم والمخرجين</span>
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
