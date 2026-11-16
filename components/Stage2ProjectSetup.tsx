'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import {
  ProjectFormat,
  SeriesEpisodes,
  AgeRating,
  calculateGenreSynergy,
} from '@/lib/game-engine';
import { GENRES, GenreId } from '@/lib/db-resolver';
import {
  Film,
  Tv,
  Sparkles,
  Wand2,
  ArrowLeft,
  ArrowRight,
  Users,
  FileText,
  Layers,
  Check,
} from 'lucide-react';
import { playClickSound, playTabSwitchSound } from '@/lib/game-audio';

const SAMPLE_IDEAS: Record<
  string,
  { title: string; synopsis: string }[]
> = {
  action: [
    {
      title: 'الفرعون الأخير',
      synopsis:
        'ضابط عمليات خاصة سابق يكتشف شبكة دولية لتهريب الآثار تحت شوارع القاهرة القديمة، فيخوض معركة شرسة ضد إمبراطور الجريمة لإنقاذ كنز فرعوني مفقود قبل فوات الأوان.',
    },
    {
      title: 'الرصاصة الذهبية',
      synopsis:
        'فريق نخبة سري ينطلق في مهمة عبر الحدود لاستعادة شحنة مشفرة تهدد أمن المنطقة وسط مطاردات نارية.',
    },
  ],
  popular_drama: [
    {
      title: 'سوق الذهب',
      synopsis:
        'صراع عائلي محتدم بين كبار تجار الصاغة في الحارة القديمة عندما يظهر وريث غائب يطالب بحقه التاريخي ويكشف أسرار الماضي.',
    },
  ],
  comedy: [
    {
      title: 'إفلاس خمس نجوم',
      synopsis:
        'ثلاثة أصدقاء مفلسين يرثون فندقاً قديماً مشروطاً بتشغيله وتحقيق أرباح خلال شهر واحد وإلا ضاعت الثروة للأبد.',
    },
  ],
  crime_mystery: [
    {
      title: 'لغز الغرفة 404',
      synopsis:
        'محقق جنائي مخضرم يواجه سلسلة جرائم غامضة في قصر تاريخي معزول حيث يحمل كل مدعو دافعاً خفياً للانتقام.',
    },
  ],
};

export default function Stage2ProjectSetup() {
  const { draft, updateDraft, setActiveScreen } = useGameStore();
  const [subStep, setSubStep] = useState<1 | 2 | 3>(1);

  const synergy = calculateGenreSynergy(
    draft.primaryGenre,
    draft.secondaryGenre
  );

  const handleGenerateIdea = () => {
    playClickSound();
    const list =
      SAMPLE_IDEAS[draft.primaryGenre] || SAMPLE_IDEAS.action;
    const pick = list[Math.floor(Math.random() * list.length)];
    updateDraft({
      title: pick.title,
      scriptSynopsis: pick.synopsis,
    });
  };

  const handleProceed = () => {
    playClickSound();
    if (!draft.title.trim()) {
      updateDraft({ title: 'الفرعون الأخير' });
    }
    if (!draft.scriptSynopsis.trim()) {
      updateDraft({
        scriptSynopsis: SAMPLE_IDEAS.action[0].synopsis,
      });
    }
    setActiveScreen('CREW_CAST_CARDS');
  };

  return (
    <div className="space-y-2.5">
      {/* Compact Internal Step Bar */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-900/75 px-2.5 py-1.5">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: 1, label: '1. الشكل والعنوان', icon: Film },
            { id: 2, label: '2. التصنيف الدرامي', icon: Layers },
            { id: 3, label: '3. الفئة العمرية والسيناريو', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subStep === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playTabSwitchSound();
                  setSubStep(tab.id as 1 | 2 | 3);
                }}
                className={`flex min-h-[28px] items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all shrink-0 ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-amber-300">
          <Sparkles className="h-3 w-3" />
          <span>{synergy.label}</span>
        </div>
      </div>

      {/* SUB-STEP 1: FORMAT (FILM / SERIES) & TITLE */}
      {subStep === 1 && (
        <div className="grid grid-cols-12 gap-2.5 items-stretch">
          {/* Format Selection */}
          <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-2">
            {(
              [
                {
                  id: 'film' as ProjectFormat,
                  title: 'فيلم سينمائي',
                  desc: 'عرض في صالات السينما وشباك التذاكر ثم المنصات',
                  icon: Film,
                },
                {
                  id: 'series' as ProjectFormat,
                  title: 'مسلسل درامي',
                  desc: 'حلقات ومواسم لمنصات البث الرقمي والقنوات الفضائية',
                  icon: Tv,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isSelected = draft.format === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    updateDraft({ format: item.id });
                  }}
                  className={`flex flex-col justify-between rounded-xl border p-2.5 text-right transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/15 shadow-sm'
                      : 'border-slate-800 bg-slate-900/75 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {isSelected && (
                      <span className="rounded-full bg-amber-500 p-0.5 text-slate-950">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <h3 className="text-xs font-black text-white">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-slate-400 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Title & Series Episodes */}
          <div className="col-span-12 md:col-span-7 flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-white">
                  عنوان العمل الفني
                </label>
                <button
                  type="button"
                  onClick={handleGenerateIdea}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20"
                >
                  <Wand2 className="h-3 w-3" />
                  <span>اقتراح عنوان وسيناريو</span>
                </button>
              </div>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                placeholder="اكتب اسم الفيلم أو المسلسل..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-xs font-black text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {draft.format === 'series' && (
              <div className="pt-1">
                <span className="block text-[10px] font-bold text-slate-400 mb-1">
                  عدد حلقات المسلسل
                </span>
                <div className="flex gap-1.5">
                  {([7, 10, 15, 30] as SeriesEpisodes[]).map((ep) => (
                    <button
                      key={ep}
                      type="button"
                      onClick={() => updateDraft({ episodes: ep })}
                      className={`flex-1 rounded-lg border py-1 font-mono text-[10px] font-black ${
                        draft.episodes === ep
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {ep} حلقة
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-STEP 2: PRIMARY & SECONDARY GENRES */}
      {subStep === 2 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[36dvh] overflow-y-auto scrollbar-hide">
            {GENRES.map((g) => {
              const isSelected = draft.primaryGenre === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    updateDraft({ primaryGenre: g.id as GenreId });
                  }}
                  className={`flex flex-col justify-between rounded-xl border p-2 text-right transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/15 text-white'
                      : 'border-slate-800 bg-slate-900/75 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-black">{g.name}</span>
                  <span className="text-[9px] text-slate-400 truncate mt-0.5">
                    {g.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary Genre Horizontal Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide rounded-xl border border-slate-800/80 bg-slate-900/60 px-2.5 py-1.5">
            <span className="text-[10px] font-bold text-slate-400 shrink-0">
              التصنيف الثانوي:
            </span>
            <button
              type="button"
              onClick={() => updateDraft({ secondaryGenre: null })}
              className={`rounded-lg px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                !draft.secondaryGenre
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              بدون
            </button>
            {GENRES.filter((g) => g.id !== draft.primaryGenre).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => updateDraft({ secondaryGenre: g.id })}
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                  draft.secondaryGenre === g.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SUB-STEP 3: AGE RATING & SCRIPT SYNOPSIS */}
      {subStep === 3 && (
        <div className="grid grid-cols-12 gap-2.5">
          {/* Age Rating */}
          <div className="col-span-12 md:col-span-4 space-y-1.5">
            <span className="block text-xs font-black text-white">
              التصنيف العمري للعرض
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {(
                [
                  { id: 'G' as AgeRating, label: 'عائلي للجميع (G)', bonus: '+6% جمهور' },
                  { id: '+12' as AgeRating, label: 'إشراف عائلي (+12)', bonus: 'متوازن' },
                  { id: '+18' as AgeRating, label: 'للكبار فقط (+18)', bonus: 'جرأة فنية' },
                ] as const
              ).map((rt) => {
                const active = draft.ageRating === rt.id;
                return (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      updateDraft({ ageRating: rt.id });
                    }}
                    className={`flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-right transition-all ${
                      active
                        ? 'border-amber-400 bg-amber-500/15 text-white'
                        : 'border-slate-800 bg-slate-900/75 text-slate-300'
                    }`}
                  >
                    <span className="text-[11px] font-black">{rt.label}</span>
                    <span className="text-[9px] text-amber-300 font-bold">
                      {rt.bonus}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Synopsis */}
          <div className="col-span-12 md:col-span-8 flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1 text-xs font-black text-white">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                <span>ملخص السيناريو والحبكة الدرامية</span>
              </span>
              <button
                type="button"
                onClick={handleGenerateIdea}
                className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-300"
              >
                توليد حبكة قوية
              </button>
            </div>
            <textarea
              rows={3}
              value={draft.scriptSynopsis}
              onChange={(e) => updateDraft({ scriptSynopsis: e.target.value })}
              placeholder="اكتب ملخص القصة الدرامية (كلما كانت الحبكة متماسكة ارتفع تقييم النقاد)..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/90 p-2 text-[11px] text-slate-200 placeholder-slate-500 focus:border-amber-400 focus:outline-none resize-none"
            />
          </div>
        </div>
      )}

      {/* Stage 2 Footer Navigation */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            if (subStep > 1) {
              setSubStep((prev) => (prev - 1) as 1 | 2 | 3);
            }
          }}
          disabled={subStep === 1}
          className="flex min-h-[32px] items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-40"
        >
          <ArrowRight className="h-3 w-3" />
          <span>الخطوة السابقة</span>
        </button>

        {subStep < 3 ? (
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setSubStep((prev) => (prev + 1) as 1 | 2 | 3);
            }}
            className="flex min-h-[32px] items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3.5 py-1 text-[11px] font-black text-slate-950"
          >
            <span>الخطوة التالية</span>
            <ArrowLeft className="h-3 w-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleProceed}
            className="flex min-h-[32px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1 text-xs font-black text-slate-950 shadow-sm hover:brightness-110 active:scale-95"
          >
            <span>الانتقال للتعاقد مع النجوم والمخرج</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
