'use client';

import React, { useMemo, useState } from 'react';
import { useGameStore } from '@/lib/store';
import {
  ProjectFormat,
  SeriesEpisodes,
  AgeRating,
  calculateGenreSynergy,
  formatMoney,
} from '@/lib/game-engine';
import { GENRES, GenreId, getResolvedDatabase } from '@/lib/db-resolver';
import {
  Film,
  Tv,
  Sparkles,
  Wand2,
  ArrowLeft,
  ArrowRight,
  FileText,
  Layers,
  Check,
  Loader2,
  Brain,
  PenTool,
} from 'lucide-react';
import {
  playClickSound,
  playTabSwitchSound,
  playContractSignedSound,
} from '@/lib/game-audio';

export default function Stage2ProjectSetup() {
  const {
    draft,
    updateDraft,
    setActiveScreen,
    customDbPatch,
    groqApiKeyClient,
    preferredGroqModel,
  } = useGameStore();

  const [subStep, setSubStep] = useState<1 | 2 | 3>(1);
  const [aiGeneratingIdea, setAiGeneratingIdea] = useState(false);
  const [aiAnalyzingScript, setAiAnalyzingScript] = useState(false);

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch),
    [customDbPatch]
  );

  const writersList = useMemo(
    () => db.crew.filter((c) => c.role === 'writer'),
    [db.crew]
  );

  const synergy = calculateGenreSynergy(
    draft.primaryGenre,
    draft.secondaryGenre
  );

  const primaryGenreObj = GENRES.find((g) => g.id === draft.primaryGenre);
  const secondaryGenreObj = GENRES.find((g) => g.id === draft.secondaryGenre);

  const handleGenerateAiScriptIdea = async () => {
    if (aiGeneratingIdea) return;
    playClickSound();
    setAiGeneratingIdea(true);
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
            primaryGenreName: primaryGenreObj?.name || 'أكشن',
            secondaryGenre: draft.secondaryGenre,
            secondaryGenreName: secondaryGenreObj?.name || '',
            ageRating: draft.ageRating,
            currentTitle: draft.title,
          },
        }),
      });
      const data = await res.json();
      if (data && data.title && data.synopsis) {
        playContractSignedSound();
        updateDraft({
          title: data.title,
          scriptSynopsis: data.synopsis,
          aiScriptAnalysis: null,
        });
      }
    } catch {
      // Fallback handled by server route
    } finally {
      setAiGeneratingIdea(false);
    }
  };

  const handleAnalyzeScriptWithAi = async () => {
    if (aiAnalyzingScript) return;
    playClickSound();
    setAiAnalyzingScript(true);
    try {
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'analyze_script_synopsis',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            title: draft.title || 'الفرعون الأخير',
            synopsis: draft.scriptSynopsis,
            primaryGenre: draft.primaryGenre,
            primaryGenreName: primaryGenreObj?.name || 'دراما',
            format: draft.format,
          },
        }),
      });
      const data = await res.json();
      if (data && typeof data.score === 'number') {
        playContractSignedSound();
        updateDraft({
          aiScriptAnalysis: {
            score: data.score,
            verdict: data.verdict || '',
            castingAdvice: data.castingAdvice || '',
            modelUsed: data.source || 'لجنة القراءة بالذكاء الاصطناعي',
          },
        });
      }
    } catch {
      // Handled gracefully
    } finally {
      setAiAnalyzingScript(false);
    }
  };

  const toggleWriterSelection = (writerId: string) => {
    playClickSound();
    const exists = draft.writerIds.includes(writerId);
    if (exists) {
      if (draft.writerIds.length <= 1) return;
      updateDraft({
        writerIds: draft.writerIds.filter((id) => id !== writerId),
      });
    } else {
      if (draft.writerIds.length >= 2) {
        updateDraft({
          writerIds: [draft.writerIds[1], writerId],
        });
      } else {
        updateDraft({
          writerIds: [...draft.writerIds, writerId],
        });
      }
    }
  };

  const handleProceed = () => {
    playClickSound();
    if (!draft.title.trim()) {
      updateDraft({ title: 'الفرعون الأخير' });
    }
    if (!draft.scriptSynopsis.trim()) {
      updateDraft({
        scriptSynopsis:
          'ضابط عمليات خاصة سابق يكتشف شبكة دولية لتهريب الآثار تحت شوارع القاهرة القديمة، فيخوض معركة شرسة ضد إمبراطور الجريمة لإنقاذ كنز فرعوني مفقود قبل فوات الأوان.',
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
            { id: 1, label: '1. الشكل والعنوان والمؤلف', icon: Film },
            { id: 2, label: '2. التصنيف الدرامي والعمري', icon: Layers },
            { id: 3, label: '3. السيناريو وتقييم الذكاء الاصطناعي', icon: Brain },
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

      {/* SUB-STEP 1: FORMAT (FILM / SERIES), TITLE & SCREENWRITER */}
      {subStep === 1 && (
        <div className="grid grid-cols-12 gap-2.5 items-stretch">
          {/* Format Selection + Title */}
          <div className="col-span-12 md:col-span-6 flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    id: 'film' as ProjectFormat,
                    title: 'فيلم سينمائي',
                    desc: 'شباك التذاكر ثم المنصات',
                    icon: Film,
                  },
                  {
                    id: 'series' as ProjectFormat,
                    title: 'مسلسل درامي',
                    desc: 'حلقات للمنصات والقنوات',
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
                    className={`flex items-center justify-between rounded-xl border p-2 text-right transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/15'
                        : 'border-slate-800 bg-slate-950/75 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <h3 className="text-xs font-black text-white">
                        {item.title}
                      </h3>
                      <p className="text-[9px] text-slate-400">{item.desc}</p>
                    </div>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-white">
                  عنوان العمل الفني
                </label>
                <button
                  type="button"
                  disabled={aiGeneratingIdea}
                  onClick={handleGenerateAiScriptIdea}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300 hover:bg-amber-500/25 disabled:opacity-50"
                >
                  {aiGeneratingIdea ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  <span>توليد عنوان وقصة بالذكاء الاصطناعي</span>
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
              <div>
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

          {/* Screenwriter (المؤلف والسيناريست) Selection */}
          <div className="col-span-12 md:col-span-6 rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs font-black text-white">
                <PenTool className="h-3.5 w-3.5 text-amber-400" />
                <span>المؤلف وورشة كتابة السيناريو (حتى مؤلفَين)</span>
              </span>
              <span className="text-[10px] font-bold text-amber-300">
                مختار: {draft.writerIds.length}/2
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto scrollbar-hide">
              {writersList.map((w) => {
                const selected = draft.writerIds.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWriterSelection(w.id)}
                    className={`flex items-center justify-between rounded-xl border p-2 text-right transition-all ${
                      selected
                        ? 'border-amber-400 bg-amber-500/15'
                        : 'border-slate-800 bg-slate-950/75 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block text-[11px] font-black text-white truncate">
                        {w.name}
                      </span>
                      <span className="text-[9px] text-slate-400 truncate block">
                        تقييم {w.stats.overall} • {formatMoney(w.base_salary)}
                      </span>
                    </div>
                    {selected && (
                      <span className="rounded-full bg-amber-500 p-0.5 text-slate-950 shrink-0">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-STEP 2: PRIMARY, SECONDARY GENRES & AGE RATING */}
      {subStep === 2 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto scrollbar-hide">
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

          {/* Secondary Genre Horizontal Strip + Age Rating */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 md:col-span-7 flex items-center gap-1.5 overflow-x-auto scrollbar-hide rounded-xl border border-slate-800/80 bg-slate-900/60 px-2.5 py-1.5">
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

            <div className="col-span-12 md:col-span-5 grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'G' as AgeRating, label: 'عائلي (G)' },
                  { id: '+12' as AgeRating, label: '+12 إشراف' },
                  { id: '+18' as AgeRating, label: '+18 للكبار' },
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
                    className={`rounded-xl border py-1.5 text-center text-[10px] font-black transition-all ${
                      active
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-slate-800 bg-slate-900/75 text-slate-300'
                    }`}
                  >
                    {rt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-STEP 3: SCRIPT SYNOPSIS & REAL AI SCRIPT DOCTOR EVALUATION */}
      {subStep === 3 && (
        <div className="grid grid-cols-12 gap-2.5 items-stretch">
          {/* Synopsis Editor + AI Generate */}
          <div className="col-span-12 md:col-span-7 flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-900/75 p-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="flex items-center gap-1 text-xs font-black text-white">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                <span>ملخص السيناريو والحبكة الدرامية</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={aiGeneratingIdea}
                  onClick={handleGenerateAiScriptIdea}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[9px] font-black text-amber-300 hover:bg-amber-500/25 disabled:opacity-50"
                >
                  {aiGeneratingIdea ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  <span>تأليف حبكة بالذكاء الاصطناعي</span>
                </button>

                <button
                  type="button"
                  disabled={aiAnalyzingScript}
                  onClick={handleAnalyzeScriptWithAi}
                  className="inline-flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[9px] font-black text-purple-300 hover:bg-purple-500/25 disabled:opacity-50"
                >
                  {aiAnalyzingScript ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Brain className="h-3 w-3" />
                  )}
                  <span>فحص السيناريو بالذكاء الاصطناعي</span>
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={draft.scriptSynopsis}
              onChange={(e) => updateDraft({ scriptSynopsis: e.target.value })}
              placeholder="اكتب قصة الفيلم أو المسلسل وتفاصيل الصراع والنهاية (سيقرأ الذكاء الاصطناعي هذا السيناريو لتقييم النقاد ومفاوضات النجوم)..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/90 p-2 text-[11px] text-slate-200 placeholder-slate-500 focus:border-amber-400 focus:outline-none resize-none"
            />
          </div>

          {/* AI Script Analysis Result Card */}
          <div className="col-span-12 md:col-span-5 flex flex-col justify-between rounded-xl border border-amber-500/25 bg-slate-900/80 p-2.5">
            {draft.aiScriptAnalysis ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-300 flex items-center gap-1">
                    <Brain className="h-3.5 w-3.5" />
                    <span>تقرير لجنة القراءة بالذكاء الاصطناعي</span>
                  </span>
                  <span className="rounded-lg bg-amber-500 px-2 py-0.5 font-mono text-xs font-black text-slate-950">
                    {draft.aiScriptAnalysis.score}/100
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-200">
                  {draft.aiScriptAnalysis.verdict}
                </p>
                <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-1.5 text-[9px] text-emerald-300">
                  <strong className="text-amber-300">نصيحة الكاستينج: </strong>
                  {draft.aiScriptAnalysis.castingAdvice}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-3 space-y-1.5">
                <Brain className="h-6 w-6 text-amber-400/70" />
                <p className="text-[11px] font-black text-white">
                  مستشار السيناريو بالذكاء الاصطناعي
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  اضغط على «فحص السيناريو بالذكاء الاصطناعي» لتقييم قوة الحبكة ومعرفة مدى حماس النجوم للورق قبل التفاوض معهم.
                </p>
              </div>
            )}
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
