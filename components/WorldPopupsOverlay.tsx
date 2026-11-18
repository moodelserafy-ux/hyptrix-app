'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore, formatGameDate } from '@/lib/store';
import {
  Newspaper,
  Sparkles,
  Trophy,
  Award,
  Building2,
  Check,
  Radio,
  Star,
  AlertTriangle,
  CheckCircle2,
  X,
  TrendingUp,
  Quote,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function WorldPopupsOverlay() {
  const {
    breakingNewsQueue,
    dismissBreakingNewsModal,
    festivalModalQueue,
    dismissFestivalCeremonyModal,
    studioName,
    activeToast,
    dismissToast,
  } = useGameStore();

  const currentFestival = festivalModalQueue[0] || null;
  const currentNews = !currentFestival ? breakingNewsQueue[0] || null : null;

  const [revealedCategories, setRevealedCategories] = useState<
    Record<string, boolean>
  >({});

  // Auto-dismiss floating toast after 5.2 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 5200);
    return () => clearTimeout(timer);
  }, [activeToast, dismissToast]);

  // Lock background body scroll whenever a modal popup is active
  useEffect(() => {
    if (currentFestival || currentNews) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [currentFestival, currentNews]);

  const toggleRevealCategory = (categoryName: string) => {
    if (!currentFestival) return;
    const key = `${currentFestival.id}_${categoryName}`;
    setRevealedCategories((prev) => ({
      ...prev,
      [key]: true,
    }));
  };

  const revealAllCategories = () => {
    if (!currentFestival) return;
    const updates: Record<string, boolean> = {};
    for (const aw of currentFestival.awards) {
      updates[`${currentFestival.id}_${aw.category}`] = true;
    }
    setRevealedCategories((prev) => ({ ...prev, ...updates }));
  };

  const dismissAllNews = () => {
    const count = breakingNewsQueue.length;
    for (let i = 0; i < count; i++) {
      dismissBreakingNewsModal();
    }
  };

  const allRevealed = currentFestival
    ? currentFestival.awards.every(
        (aw) => revealedCategories[`${currentFestival.id}_${aw.category}`]
      )
    : false;

  const playerWonCountInCurrentCeremony = currentFestival
    ? currentFestival.awards.filter((aw) => aw.isPlayerWinner).length
    : 0;

  return (
    <>
      {/* SLEEK FLOATING NOTIFICATION TOAST (Positioned cleanly below the Navbar) */}
      <AnimatePresence>
        {activeToast && (
          <div className="pointer-events-none fixed top-17 right-0 left-0 z-50 flex justify-center px-3">
            <motion.div
              key={activeToast.id}
              initial={{ opacity: 0, y: -20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 430, damping: 28 }}
              className={`pointer-events-auto relative flex w-full max-w-md items-start justify-between gap-3 overflow-hidden rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
                activeToast.type === 'warning'
                  ? 'border-amber-300/95 bg-white/95 text-slate-900 shadow-amber-500/15'
                  : activeToast.type === 'success'
                  ? 'border-emerald-300/95 bg-white/95 text-slate-900 shadow-emerald-500/15'
                  : 'border-violet-300/95 bg-white/95 text-slate-900 shadow-violet-500/20'
              }`}
              dir="rtl"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                    activeToast.type === 'warning'
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                      : activeToast.type === 'success'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                      : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
                  }`}
                >
                  {activeToast.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : activeToast.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black leading-snug text-slate-950">
                    {activeToast.message}
                  </p>
                  {activeToast.subtext && (
                    <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-slate-600">
                      {activeToast.subtext}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={dismissToast}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Animated auto-dismiss progress bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5.2, ease: 'linear' }}
                className={`absolute right-0 bottom-0 h-[3px] ${
                  activeToast.type === 'warning'
                    ? 'bg-amber-500'
                    : activeToast.type === 'success'
                    ? 'bg-emerald-500'
                    : 'bg-violet-600'
                }`}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL OVERLAY FOR ANNUAL AWARDS GALA OR EDITORIAL BREAKING NEWS */}
      <AnimatePresence>
        {(currentFestival || currentNews) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3.5 backdrop-blur-md"
            dir="rtl"
          >
            {/* 1. ANNUAL FESTIVAL & AWARDS CEREMONY MODAL */}
            {currentFestival && (
              <motion.div
                key={currentFestival.id}
                initial={{ scale: 0.93, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.93, y: 20, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="glass-modal relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl shadow-2xl"
              >
                {/* Royal Gold & Velvet Header */}
                <div className="relative overflow-hidden bg-gradient-to-l from-slate-950 via-indigo-950 to-slate-900 px-5 py-4 text-white">
                  <div className="pointer-events-none absolute -top-12 -left-12 h-36 w-36 rounded-full bg-amber-400/20 blur-2xl" />
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-lg">
                        <Trophy className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-black text-amber-300">
                            <Sparkles className="h-3 w-3" />
                            <span>
                              البث الرسمي لحفل جوائز نهاية العام ({currentFestival.year})
                            </span>
                          </span>
                        </div>
                        <h2 className="mt-1 font-display text-base font-black leading-snug text-white sm:text-lg">
                          {currentFestival.festivalName}
                        </h2>
                      </div>
                    </div>

                    {!allRevealed && (
                      <button
                        type="button"
                        onClick={revealAllCategories}
                        className="shrink-0 rounded-xl border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 text-[11px] font-black text-amber-200 transition hover:bg-amber-400/25"
                      >
                        فتح كل المظاريف
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3.5 p-4 sm:p-5">
                  {/* Jury Statement Banner */}
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/75 p-3.5">
                    <div className="flex items-start gap-2.5">
                      <Quote className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-relaxed text-slate-700">
                          {currentFestival.juryStatement}
                        </p>
                        {allRevealed && (
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-indigo-200/60 pt-2">
                            <span className="text-[11px] font-bold text-slate-500">
                              {currentFestival.festivalBuzz}
                            </span>
                            <span
                              className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${
                                playerWonCountInCurrentCeremony > 0
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {playerWonCountInCurrentCeremony > 0
                                ? `حصد استوديو «${studioName}» ${playerWonCountInCurrentCeremony} جوائز! 🏆`
                                : 'حسمت اللجان جوائز هذا المهرجان'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Categories Grid */}
                  <div className="space-y-3">
                    {currentFestival.awards.map((aw) => {
                      const isRevealed =
                        !!revealedCategories[`${currentFestival.id}_${aw.category}`];
                      return (
                        <div
                          key={aw.category}
                          className={`rounded-2xl border p-3.5 transition-all ${
                            isRevealed && aw.isPlayerWinner
                              ? 'border-amber-400 bg-gradient-to-l from-amber-50/95 via-yellow-50/70 to-white shadow-md'
                              : 'border-indigo-100/90 bg-white/90 shadow-2xs'
                          }`}
                        >
                          <div className="mb-2.5 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                <Award className="h-4 w-4" />
                              </div>
                              <h3 className="font-display text-xs font-black leading-snug text-slate-900 sm:text-sm">
                                {aw.category}
                              </h3>
                            </div>
                            {!isRevealed ? (
                              <button
                                type="button"
                                onClick={() => toggleRevealCategory(aw.category)}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1.5 text-[11px] font-black text-slate-950 shadow-xs transition hover:brightness-105"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>فض المظروف الذهبي</span>
                              </button>
                            ) : (
                              <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-black ${
                                  aw.isPlayerWinner
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                <Trophy className="h-3 w-3" />
                                <span>
                                  {aw.isPlayerWinner
                                    ? `فوز «${studioName}»!`
                                    : `فوز «${aw.winningStudioName}»`}
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Nominees List */}
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {aw.nominees.map((nomLabel, idx) => {
                              const isWinnerNominee =
                                isRevealed &&
                                (nomLabel.includes(aw.winner) ||
                                  nomLabel.includes(aw.winningProjectTitle));
                              return (
                                <div
                                  key={idx}
                                  className={`rounded-xl border p-2.5 transition-all ${
                                    isWinnerNominee
                                      ? 'border-amber-500 bg-amber-100/90 shadow-xs'
                                      : isRevealed
                                      ? 'border-slate-200/70 bg-slate-50/60 opacity-65'
                                      : 'border-indigo-100 bg-indigo-50/40'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-black leading-snug text-slate-900">
                                      {nomLabel}
                                    </span>
                                    {isWinnerNominee && (
                                      <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Revealed Winner Banner */}
                          {isRevealed && (
                            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/80 bg-amber-50/90 px-3 py-2">
                              <span className="text-xs font-black text-amber-950">
                                الفائز الرسمي: {aw.winner} — عن عمل «{aw.winningProjectTitle}»
                              </span>
                              <span className="text-[11px] font-bold text-amber-800">
                                إنتاج: {aw.winningStudioName}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Ceremony Footer Action */}
                  <div className="flex items-center justify-between border-t border-indigo-100 pt-3">
                    <span className="text-[11px] font-bold text-slate-500">
                      {festivalModalQueue.length > 1
                        ? `متبقي ${festivalModalQueue.length - 1} مهرجان في ختام الموسم`
                        : 'اكتملت مراسم توزيع جوائز هذا العام'}
                    </span>
                    {!allRevealed ? (
                      <button
                        type="button"
                        onClick={revealAllCategories}
                        className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2 text-xs font-black text-slate-950 shadow-md transition hover:brightness-105"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>إعلان جميع الفائزين الآن</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={dismissFestivalCeremonyModal}
                        className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-105"
                      >
                        <Check className="h-4 w-4" />
                        <span>
                          {festivalModalQueue.length > 1
                            ? 'المهرجان التالي'
                            : 'اعتماد الجوائز ومواصلة العمل'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. LUXURY EDITORIAL BREAKING NEWS CARD */}
            {currentNews && (
              <motion.div
                key={currentNews.id}
                initial={{ scale: 0.92, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.92, y: 20, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="glass-modal relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
              >
                {/* Editorial Magazine Header Ribbon */}
                <div
                  className={`relative overflow-hidden px-5 py-3.5 text-white ${
                    currentNews.category === 'rising_talent'
                      ? 'bg-gradient-to-l from-emerald-600 via-teal-600 to-emerald-700'
                      : currentNews.category === 'new_studio'
                      ? 'bg-gradient-to-l from-indigo-700 via-violet-700 to-purple-800'
                      : currentNews.category === 'actor_deceased' ||
                        currentNews.category === 'actor_retired'
                      ? 'bg-gradient-to-l from-slate-800 via-slate-900 to-indigo-950'
                      : 'bg-gradient-to-l from-violet-700 via-indigo-700 to-slate-900'
                  }`}
                >
                  <div className="pointer-events-none absolute -top-10 -left-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs">
                        <Radio className="h-4 w-4 animate-pulse text-amber-300" />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-xs font-black tracking-wide text-white">
                          {currentNews.badgeLabel}
                        </span>
                        <span className="block text-[10px] font-bold text-white/80">
                          {formatGameDate(currentNews.day, currentNews.year)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {breakingNewsQueue.length > 1 && (
                        <button
                          type="button"
                          onClick={dismissAllNews}
                          className="rounded-lg bg-white/15 px-2 py-1 text-[10px] font-black text-white transition hover:bg-white/25"
                        >
                          تخطي الكل ({breakingNewsQueue.length})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={dismissBreakingNewsModal}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editorial Body */}
                <div className="space-y-4 p-5">
                  {/* Featured Subject Pill */}
                  {currentNews.highlightName && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-100/90 bg-indigo-50/75 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${
                            currentNews.category === 'rising_talent'
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                              : currentNews.category === 'new_studio'
                              ? 'bg-gradient-to-br from-indigo-600 to-violet-700'
                              : 'bg-gradient-to-br from-amber-500 to-orange-600'
                          }`}
                        >
                          {currentNews.category === 'rising_talent' && (
                            <Star className="h-5 w-5" />
                          )}
                          {currentNews.category === 'new_studio' && (
                            <Building2 className="h-5 w-5" />
                          )}
                          {currentNews.category !== 'rising_talent' &&
                            currentNews.category !== 'new_studio' && (
                              <Newspaper className="h-5 w-5" />
                            )}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[10px] font-bold text-slate-500">
                            محور التغطية الصحفية
                          </span>
                          <span className="block font-display text-sm font-black leading-snug text-slate-950">
                            {currentNews.highlightName}
                          </span>
                        </div>
                      </div>

                      {currentNews.extraStatBadge && (
                        <span className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[10px] font-black text-amber-900">
                          {currentNews.extraStatBadge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Headline & Story Lead */}
                  <div className="space-y-2">
                    <h3 className="font-display text-base font-black leading-snug text-slate-950 sm:text-lg">
                      {currentNews.headline}
                    </h3>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                      <p className="text-xs font-bold leading-relaxed text-slate-700">
                        {currentNews.detail}
                      </p>
                    </div>
                  </div>

                  {/* Market Impact Bar */}
                  {currentNews.gameImpactLabel && (
                    <div className="flex items-center gap-2 rounded-2xl border border-violet-200/80 bg-violet-50/80 px-3.5 py-2.5 text-[11px] font-black text-violet-950">
                      <TrendingUp className="h-4 w-4 shrink-0 text-violet-600" />
                      <span>{currentNews.gameImpactLabel}</span>
                    </div>
                  )}

                  {/* Action CTA */}
                  <button
                    type="button"
                    onClick={dismissBreakingNewsModal}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-105"
                  >
                    <Check className="h-4 w-4" />
                    <span>متابعة إدارة الاستوديو</span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
export default WorldPopupsOverlay;
