'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  useGameStore,
  AutomaticFestivalCeremonyItem,
  buildAnnualAwardsGalaForYear,
  getDaysRemainingUntilAnnualAwards,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { formatMoney } from '@/lib/game-engine';
import { AnimatedRedCarpetFestivalGraphic } from './CinematicGraphicsScene';
import {
  Trophy,
  CheckCircle2,
  PlusCircle,
  MessageSquareQuote,
  Award,
  Tv,
  Sparkles,
  Calendar,
  Home,
  Film,
} from 'lucide-react';

export function Stage6FestivalsAwards() {
  const {
    studioName,
    currentYear,
    gameDay,
    releasedProjects,
    yearlyRivalReleases,
    lastAwardsGalaYear,
    customDbPatch,
    triggerAnnualAwardsCeremonyNow,
    resetDraftForNewProject,
    setActiveScreen,
  } = useGameStore();

  const db = getResolvedDatabase(customDbPatch);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const availableYears = Array.from(
    new Set([currentYear, ...releasedProjects.map((p) => p.year)])
  ).sort((a, b) => b - a);

  const playerWorksInYear = releasedProjects.filter(
    (p) => p.year === selectedYear
  );
  const rivalWorksInYear = [
    ...(yearlyRivalReleases || []),
    ...playerWorksInYear.flatMap((p) => p.rivalReleases || []),
  ];

  // Build the comprehensive Annual Grand Awards Ceremony for the selected year
  const annualGala: AutomaticFestivalCeremonyItem = React.useMemo(() => {
    const res = buildAnnualAwardsGalaForYear({
      year: selectedYear,
      playerProjectsInYear: playerWorksInYear,
      rivalReleasesInYear: rivalWorksInYear,
      studioName,
      db,
    });
    return res.ceremonies[0];
  }, [selectedYear, playerWorksInYear, rivalWorksInYear, studioName, db]);

  const daysUntilAnnualAwards = getDaysRemainingUntilAnnualAwards(gameDay);
  const isYearAlreadyCrowned = lastAwardsGalaYear >= selectedYear;

  return (
    <div className="mx-auto max-w-xl space-y-4 py-2">
      {/* Header */}
      <div className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/80 bg-white p-4 shadow-[0_12px_30px_-10px_rgba(99,102,241,0.14)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
              <Trophy className="h-3.5 w-3.5 text-amber-600" />
              الحفل السنوي الكبير لجوائز السينما والدراما · عام {selectedYear}
            </span>
            <h2 className="font-display mt-1 text-lg font-black text-slate-900">
              منافسات وترشيحات جوائز العام ({playerWorksInYear.length} أعمال لشركتك)
            </h2>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-black text-white tabular-nums shadow-xs">
            {isYearAlreadyCrowned
              ? `تُوجت بـ ${annualGala.playerWonCount} جوائز`
              : `متبقي ${daysUntilAnnualAwards} يوم للحفل`}
          </div>
        </div>

        {/* Year Switcher Tabs (if multiple years played) */}
        {availableYears.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                  selectedYear === yr
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'border border-indigo-100 bg-[#F8FAFF] text-slate-700 hover:border-violet-300'
                }`}
              >
                حفل عام {yr}
              </button>
            ))}
          </div>
        )}

        {/* Explanation of Annual Cycle & Multi-Release Per Year */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <Calendar className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              يُقام حفل الجوائز الكبير مرة واحدة في نهاية كل سنة! يمكنك إنتاج وطرح أكثر من فيلم أو مسلسل خلال العام للمنافسة على جميع الفئات.
            </span>
          </div>

          {!isYearAlreadyCrowned && selectedYear === currentYear && (
            <button
              type="button"
              onClick={triggerAnnualAwardsCeremonyNow}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border-b-4 border-amber-900/30 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:brightness-105 active:border-b-0 active:translate-y-0.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>إقامة الحفل السنوي لعام {currentYear} الآن!</span>
            </button>
          )}
        </div>
      </div>

      {/* Player's Released Works in This Year */}
      <div className="rounded-3xl border-2 border-indigo-100 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-black text-slate-800">
            <Film className="h-4 w-4 text-violet-600" />
            <span>
              أعمال شركتك الداخلة في سباق جوائز {selectedYear} ({playerWorksInYear.length}) مقابل ({rivalWorksInYear.length}) أعمال للشركات المنافسة:
            </span>
          </span>
        </div>

        {playerWorksInYear.length === 0 ? (
          <div className="mt-2.5 rounded-2xl border border-dashed border-indigo-200 bg-[#F8FAFF] p-4 text-center text-xs font-bold text-slate-500">
            لم تطرح شركتك أي عمل في عام {selectedYear} حتى الآن. أنتج فيلماً أو مسلسلاً الآن ليدخل المنافسة السنوية!
          </div>
        ) : (
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {playerWorksInYear.map((pw) => (
              <div
                key={pw.id}
                className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-[#F8FAFF] p-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate font-display font-black text-slate-900">
                    «{pw.title}»
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {pw.format === 'series' ? 'مسلسل' : 'فيلم'} · النقاد {pw.criticScore}/10
                  </div>
                </div>
                <span className="shrink-0 font-black text-emerald-700 tabular-nums">
                  {formatMoney(pw.totalGrossRevenue)} ج.م
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Annual Gala Stage & Category Winners / Frontrunners */}
      <motion.div
        key={annualGala.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.15)]"
      >
        <AnimatedRedCarpetFestivalGraphic
          festivalName={annualGala.festivalName}
          year={selectedYear}
          wonCount={annualGala.playerWonCount}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-black text-slate-900">
                {annualGala.festivalName}
              </h3>
              <p className="text-[11px] font-bold text-slate-500">
                {isYearAlreadyCrowned
                  ? 'النتائج الرسمية النهائية المعتمدة من لجنة التحكيم'
                  : 'المؤشرات والترشيحات الحالية بناءً على تقييمات النقاد والإيرادات حتى الآن'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-4 text-xs">
          <div className="flex items-center justify-between border-b border-violet-100 pb-2">
            <span className="flex items-center gap-1.5 font-black text-violet-800">
              <MessageSquareQuote className="h-4 w-4 text-violet-600" />
              <span>بيان لجنة التحكيم السنوية</span>
            </span>
          </div>
          <p className="mt-2 font-bold leading-relaxed text-slate-800">
            &ldquo;{annualGala.juryStatement}&rdquo;
          </p>
        </div>

        <div className="space-y-2.5">
          {annualGala.awards.map((res, idx) => {
            const isSeriesCat = res.category.includes('مسلسل');
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`rounded-2xl border-2 p-3.5 ${
                  res.isPlayerWinner
                    ? 'border-emerald-300 border-b-4 border-b-emerald-400 bg-emerald-50/80'
                    : 'border-indigo-100 bg-[#F8FAFF]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-black text-violet-700">
                    {isSeriesCat ? (
                      <Tv className="h-4 w-4 text-cyan-600" />
                    ) : (
                      <Award className="h-4 w-4 text-amber-500" />
                    )}
                    <span>{res.category}</span>
                  </span>
                  {res.isPlayerWinner ? (
                    <span className="flex items-center gap-1 font-black text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      {isYearAlreadyCrowned
                        ? 'فائز لشركتك! (+24M قيمة سوقية)'
                        : 'المرشح الأوفر حظاً (شركتك)'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">
                      شركة منافسة
                    </span>
                  )}
                </div>
                <div className="font-display mt-1 text-sm font-black text-slate-900">
                  {isYearAlreadyCrowned ? 'الفائز:' : 'المتصدر:'} {res.winner}
                </div>
                <div className="mt-0.5 text-[11px] font-bold text-slate-500">
                  العمل: «{res.winningProjectTitle}» · إنتاج: {res.winningStudioName}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveScreen('STUDIO_HUB')}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-3 text-xs font-black text-slate-800 transition hover:border-violet-300"
          >
            <Home className="h-4 w-4 text-violet-600" />
            <span>العودة للمقر</span>
          </button>

          <button
            type="button"
            onClick={() => resetDraftForNewProject('PROJECT_SETUP')}
            className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-900/40 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-500/25 transition active:border-b-0 active:translate-y-1"
          >
            <PlusCircle className="h-5 w-5" />
            <span>إنتاج عمل فني جديد للمنافسة في عام {currentYear}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
