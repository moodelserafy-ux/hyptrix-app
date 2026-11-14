'use client';

import React from 'react';
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

  return (
    <AnimatePresence>
      {/* 1. Sudden Grand Festival & Awards Ceremony Popup (Each festival appears on its own!) */}
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
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs">
                    <Trophy className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-black text-amber-50">
                      <Sparkles className="h-3 w-3" />
                      <span>بث مباشر · حفل جوائز عام {activeFestival.year}</span>
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
                  حصدت {activeFestival.playerWonCount} جوائز
                </span>
              </div>
              <p className="mt-1.5 font-bold leading-relaxed text-slate-800">
                &ldquo;{activeFestival.juryStatement}&rdquo;
              </p>
            </div>

            {/* Individual Awards List (Who won what & which project) */}
            <div className="mt-4 space-y-2.5">
              <div className="text-xs font-black text-slate-700">
                القائمة الكاملة للفائزين في جوائز {activeFestival.festivalName}:
              </div>
              {activeFestival.awards.map((award, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`rounded-2xl border-2 p-3.5 transition ${
                    award.isPlayerWinner
                      ? 'border-emerald-400 border-b-4 border-b-emerald-500 bg-gradient-to-r from-emerald-50 via-white to-teal-50 shadow-xs'
                      : 'border-indigo-100 bg-[#F8FAFF]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 font-black text-violet-800">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span>{award.category}</span>
                    </span>
                    {award.isPlayerWinner ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>فوز لشركتك!</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500">
                        شركة منافسة
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
              ))}
            </div>

            <button
              type="button"
              onClick={dismissFestivalCeremonyModal}
              className="mt-5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-amber-900/40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105 active:border-b-0 active:translate-y-1"
            >
              <Trophy className="h-4 w-4" />
              <span>
                {festivalModalQueue.length > 1
                  ? `الانتقال للمهرجان التالي (متبقي ${festivalModalQueue.length - 1})`
                  : 'اعتماد نتائج المهرجان ومتابعة اللعب'}
              </span>
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* 2. Sudden Breaking News Screen Popup (Appears one story at a time!) */}
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
            {/* Top Breaking Banner */}
            <div className="flex items-center justify-between gap-2 border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-xs ${
                    activeNews.category === 'actor_deceased' ||
                    activeNews.category === 'actor_retired'
                      ? 'bg-slate-800'
                      : activeNews.category === 'actor_evolution' ||
                        activeNews.category === 'rising_talent'
                      ? 'bg-amber-500'
                      : 'bg-violet-600'
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
                  <span className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-800">
                    <Flame className="h-3 w-3 text-violet-600" />
                    <span>{activeNews.badgeLabel}</span>
                  </span>
                  <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                    {formatGameDate(activeNews.day, activeNews.year)}
                  </div>
                </div>
              </div>
            </div>

            {/* Headline & Story */}
            <div className="mt-4">
              <h3 className="font-display text-base font-black leading-snug text-slate-900 sm:text-lg">
                {activeNews.headline}
              </h3>
              <p className="mt-2.5 rounded-2xl border border-indigo-100 bg-[#F8FAFF] p-3.5 text-xs font-medium leading-relaxed text-slate-700">
                {activeNews.detail}
              </p>

              {activeNews.extraStatBadge && (
                <div className="mt-3 flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">
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
