'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore, formatGameDate } from '@/lib/store';
import {
  Newspaper,
  Trophy,
  Sparkles,
  Flame,
  Film,
  CheckCircle2,
  Crown,
  Star,
  HeartCrack,
  Award,
  TrendingUp,
  Tv,
} from 'lucide-react';

export function WorldPopupsOverlay() {
  const {
    breakingNewsQueue,
    festivalModalQueue,
    dismissBreakingNewsModal,
    dismissFestivalCeremonyModal,
  } = useGameStore();

  // Prioritize Festival Ceremony Popup if one is queued; otherwise show the current Breaking News Popup
  const activeFestival = festivalModalQueue[0] || null;
  const activeNews = !activeFestival ? breakingNewsQueue[0] || null : null;

  // Step-by-step animated envelope reveal for festival awards keyed by festival ID
  const [revealState, setRevealState] = useState<{
    festId: string;
    count: number;
  }>({ festId: '', count: 1 });

  const revealedCount =
    activeFestival && revealState.festId === activeFestival.id
      ? revealState.count
      : 1;

  useEffect(() => {
    if (!activeFestival) return;
    const festId = activeFestival.id;
    const total = activeFestival.awards.length;
    const interval = setInterval(() => {
      setRevealState((prev) => {
        const currentCount = prev.festId === festId ? prev.count : 1;
        if (currentCount >= total) {
          clearInterval(interval);
          return { festId, count: total };
        }
        return { festId, count: currentCount + 1 };
      });
    }, 650);
    return () => clearInterval(interval);
  }, [activeFestival]);

  const festivalStepNumber = activeFestival
    ? Math.max(1, 4 - festivalModalQueue.length)
    : 1;

  return (
    <AnimatePresence>
      {/* 1. Sudden Grand Festival & Awards Ceremony Popup (Strictly 3 festivals per season, animated envelope reveal) */}
      {activeFestival && (
        <motion.div
          key={activeFestival.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          dir="rtl"
        >
          <motion.div
            initial={{ scale: 0.88, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-amber-300 border-b-4 border-b-amber-500 bg-gradient-to-b from-[#FFFDF5] via-white to-[#F5F3FF] p-5 shadow-[0_24px_60px_-12px_rgba(245,158,11,0.35)] sm:p-6"
          >
            {/* Festival Red Carpet Header */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-4 text-white shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs"
                  >
                    <Trophy className="h-7 w-7 text-white" />
                  </motion.div>
                  <div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-black text-amber-50">
                      <Sparkles className="h-3 w-3" />
                      <span>
                        المهرجان {festivalStepNumber} من 3 · موسم جوائز {activeFestival.year}
                      </span>
                    </div>
                    <h2 className="font-display mt-1 text-lg font-black sm:text-xl">
                      {activeFestival.festivalName}
                    </h2>
                  </div>
                </div>
                <div className="shrink-0 rounded-xl bg-white/20 px-2.5 py-1.5 text-center tabular-nums">
                  <div className="text-[9px] font-bold text-amber-100">هيبة المهرجان</div>
                  <div className="font-display text-sm font-black">{activeFestival.prestige}%</div>
                </div>
              </div>
            </div>

            {/* Jury Official Verdict */}
            <div className="mt-3.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs">
              <div className="flex items-center justify-between font-black text-amber-950">
                <span className="flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-600" />
                  <span>بيان لجنة التحكيم العليا</span>
                </span>
                <span className="rounded-lg bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                  حصدت شركتك {activeFestival.playerWonCount} من {activeFestival.awards.length} جوائز
                </span>
              </div>
              <p className="mt-1.5 font-bold leading-relaxed text-slate-800">
                &ldquo;{activeFestival.juryStatement}&rdquo;
              </p>
            </div>

            {/* Animated Envelope-by-Envelope Awards List (Includes Best Film & Best Series) */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black text-slate-700">
                <span>إعلان الفائزين رسمياً على المسرح:</span>
                {revealedCount < activeFestival.awards.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setRevealState({
                        festId: activeFestival.id,
                        count: activeFestival.awards.length,
                      })
                    }
                    className="text-[11px] font-black text-violet-600 hover:underline"
                  >
                    كشف جميع الجوائز فوراً ({activeFestival.awards.length})
                  </button>
                )}
              </div>

              {activeFestival.awards.slice(0, revealedCount).map((award, idx) => {
                const isSeriesCat = award.category.includes('مسلسل');
                return (
                  <motion.div
                    key={`${activeFestival.id}_award_${idx}`}
                    initial={{ opacity: 0, scale: 0.92, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                    className={`rounded-2xl border-2 p-3.5 transition ${
                      award.isPlayerWinner
                        ? 'border-emerald-400 border-b-4 border-b-emerald-500 bg-gradient-to-r from-emerald-50 via-white to-teal-50 shadow-xs'
                        : 'border-indigo-100 bg-[#F8FAFF]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 font-black text-violet-800">
                        {isSeriesCat ? (
                          <Tv className="h-4 w-4 text-cyan-600" />
                        ) : (
                          <Award className="h-4 w-4 text-amber-500" />
                        )}
                        <span>{award.category}</span>
                      </span>
                      {award.isPlayerWinner ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-2xs">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>فوز لشركتك! (+18M قيمة سوقية)</span>
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          حسمتها شركة منافسة
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="font-display text-sm font-black text-slate-900">
                        الفائز: <span className="text-indigo-950">{award.winner}</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-600">
                        العمل: «{award.winningProjectTitle}» ({award.winningStudioName})
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={dismissFestivalCeremonyModal}
              className="mt-5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-amber-900/40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105 active:border-b-0 active:translate-y-1"
            >
              <Trophy className="h-4 w-4" />
              <span>
                {festivalModalQueue.length > 1
                  ? `الانتقال للمهرجان التالي (متبقي ${festivalModalQueue.length - 1} من 3)`
                  : 'اعتماد الجوائز ومتابعة اللعب'}
              </span>
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* 2. Sudden Journalistic Breaking News Screen Popup (With Real Gameplay Impact Badge) */}
      {activeNews && (
        <motion.div
          key={activeNews.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
          dir="rtl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="w-full max-w-md rounded-3xl border-2 border-indigo-200 border-b-4 border-b-indigo-400 bg-white p-5 shadow-2xl sm:p-6"
          >
            {/* Top Journalistic Breaking Banner */}
            <div className="flex items-center justify-between gap-2 border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-xs ${
                    activeNews.category === 'actor_deceased' ||
                    activeNews.category === 'actor_retired'
                      ? 'bg-slate-800'
                      : activeNews.category === 'actor_evolution' ||
                        activeNews.category === 'rising_talent'
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-br from-violet-600 to-indigo-600'
                  }`}
                >
                  {activeNews.category === 'actor_deceased' ||
                  activeNews.category === 'actor_retired' ? (
                    <HeartCrack className="h-5 w-5" />
                  ) : activeNews.category === 'actor_evolution' ||
                    activeNews.category === 'rising_talent' ? (
                    <Star className="h-5 w-5" />
                  ) : activeNews.category === 'new_studio' ||
                    activeNews.category === 'rival_project' ? (
                    <Film className="h-5 w-5" />
                  ) : (
                    <Newspaper className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-0.5 text-[10px] font-black text-violet-800">
                    <Flame className="h-3 w-3 text-violet-600" />
                    <span>{activeNews.badgeLabel}</span>
                  </span>
                  <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                    نشرة أخبار الفن السابع · {formatGameDate(activeNews.day, activeNews.year)}
                  </div>
                </div>
              </div>
            </div>

            {/* Journalistic Headline & Story */}
            <div className="mt-4">
              <h3 className="font-display text-base font-black leading-snug text-slate-900 sm:text-lg">
                {activeNews.headline}
              </h3>
              <p className="mt-2.5 rounded-2xl border border-indigo-100 bg-[#F8FAFF] p-3.5 text-xs font-medium leading-relaxed text-slate-700">
                {activeNews.detail}
              </p>

              {/* Direct Gameplay Impact Pill */}
              {activeNews.gameImpactLabel && (
                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl border-2 border-violet-200 bg-violet-50/90 px-3 py-2 text-xs font-black text-violet-900">
                  <TrendingUp className="h-4 w-4 shrink-0 text-violet-600" />
                  <span>التأثير الفعلي: {activeNews.gameImpactLabel}</span>
                </div>
              )}

              {activeNews.extraStatBadge && (
                <div className="mt-2.5 flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">
                  ✨ {activeNews.extraStatBadge}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={dismissBreakingNewsModal}
              className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-950/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-5 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-105 active:border-b-0 active:translate-y-1"
            >
              <span>متابعة اللعب</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
