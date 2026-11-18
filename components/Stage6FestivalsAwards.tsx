'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useGameStore,
  getDaysRemainingUntilAnnualAwards,
  formatGameDate,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { AnimatedRedCarpetFestivalGraphic } from '@/components/CinematicGraphicsScene';
import {
  Award,
  Trophy,
  Sparkles,
  Check,
  Building2,
  Loader2,
  Quote,
  Calendar,
  Film,
  Tv,
  Star,
} from 'lucide-react';
import { motion } from 'motion/react';

const DAYS_PER_YEAR = 120;

export function Stage6FestivalsAwards() {
  const {
    releasedProjects,
    lastReleasedProject,
    yearlyRivalReleases,
    currentYear,
    gameDay,
    studioName,
    ceoName,
    customDbPatch,
    resetDraftForNewProject,
    triggerFestivalJuryPR,
    draft,
    showToast,
    groqApiKeyClient,
    preferredGroqModel,
  } = useGameStore();

  const db = useMemo(() => getResolvedDatabase(customDbPatch), [customDbPatch]);

  const latestProject = lastReleasedProject || releasedProjects[0] || null;
  const daysUntilAnnualGala = getDaysRemainingUntilAnnualAwards(gameDay);
  const daysElapsedInYear = Math.max(
    1,
    DAYS_PER_YEAR - daysUntilAnnualGala + 1
  );
  const yearProgressPct = Math.min(
    100,
    Math.max(5, Math.round((daysElapsedInYear / DAYS_PER_YEAR) * 100))
  );

  const [juryCommentary, setJuryCommentary] = useState<string | null>(null);
  const [isLoadingJury, setIsLoadingJury] = useState(false);

  useEffect(() => {
    if (!latestProject) return;
    let isMounted = true;
    const fetchJurySpeech = async () => {
      setIsLoadingJury(true);
      try {
        const res = await fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'evaluate_festival_ceremony',
            groqKeyOverride: groqApiKeyClient,
            preferredModel: preferredGroqModel,
            payload: {
              festivalName:
                db.festivals[0]?.name || 'مهرجان القاهرة السينمائي الدولي',
              projectTitle: latestProject.title,
              criticScore: latestProject.criticScore,
              leadActors: latestProject.leadNames,
              directorName: latestProject.directorName,
              studioName,
              ceoName,
              wonAwards: latestProject.awardsWon,
            },
          }),
        });
        const data = await res.json();
        if (isMounted && (data?.juryStatement || data?.jurySpeech)) {
          setJuryCommentary(data.juryStatement || data.jurySpeech);
        }
      } catch {
        // fallback handled silently
      } finally {
        if (isMounted) setIsLoadingJury(false);
      }
    };
    fetchJurySpeech();
    return () => {
      isMounted = false;
    };
  }, [
    latestProject,
    db.festivals,
    studioName,
    ceoName,
    groqApiKeyClient,
    preferredGroqModel,
  ]);

  const projectsThisYear = useMemo(
    () => releasedProjects.filter((p) => p.year === currentYear),
    [releasedProjects, currentYear]
  );

  const totalStudioAwards = useMemo(
    () =>
      releasedProjects.reduce((sum, p) => sum + (p.awardsWon?.length || 0), 0),
    [releasedProjects]
  );

  return (
    <div className="space-y-4 pb-28">
      {/* Glassmorphic Header */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 shadow-md">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-black text-slate-950 sm:text-base">
                المهرجانات السنوية وسجل الجوائز ({currentYear})
              </h2>
              <p className="text-[11px] font-bold text-slate-600">
                {formatGameDate(gameDay, currentYear)} · إجمالي جوائز الاستوديو:{' '}
                {totalStudioAwards} جائزة
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-2xl border border-amber-300/90 bg-amber-100/90 px-3 py-1.5 font-mono text-xs font-black text-amber-950">
            الحفل السنوي بعد {daysUntilAnnualGala} يوم
          </span>
        </div>
      </div>

      {/* Red Carpet Animated Graphic */}
      <AnimatedRedCarpetFestivalGraphic
        festivalName={db.festivals[0]?.name || 'موسم الجوائز والمهرجانات الكبرى'}
        year={currentYear}
        wonCount={totalStudioAwards}
      />

      {/* Synchronized Annual Calendar Progress Card */}
      <div className="glass-panel rounded-3xl border border-amber-300/80 bg-gradient-to-l from-amber-50/90 via-white/90 to-indigo-50/80 p-4 space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xs font-black text-slate-950 sm:text-sm">
                جدول الحفل السنوي التلقائي لنهاية عام {currentYear}
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                ينطلق الحفل تلقائياً فور اكتمال أيام السنة ({DAYS_PER_YEAR} يوم عمل) لتقييم جميع الأفلام والمسلسلات المطروحة.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-xl bg-slate-900 px-3 py-1.5 font-mono text-xs font-black text-amber-300 tabular-nums">
              اليوم {daysElapsedInYear} من {DAYS_PER_YEAR}
            </span>
          </div>
        </div>

        {/* Visual Year Timeline Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-black text-slate-600">
            <span>بداية موسم {currentYear}</span>
            <span className="text-violet-700">
              متبقي {daysUntilAnnualGala} يوم على إعلان الفائزين ({yearProgressPct}%)
            </span>
            <span>حفل جوائز ختام {currentYear} 🏆</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-indigo-100/90 p-0.5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-amber-500 via-violet-600 to-indigo-600"
              initial={false}
              animate={{ width: `${yearProgressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* AI Jury Pre-Screening Statement */}
      {latestProject && (
        <div className="glass-card rounded-3xl p-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            {isLoadingJury ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Quote className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-violet-900">
                تقرير لجنة النقاد حول أحدث أعمالك «{latestProject.title}»
              </span>
              {!draft.juryBribed && (
                <button
                  type="button"
                  onClick={() => {
                    triggerFestivalJuryPR();
                    showToast(
                      'تم تنظيم عروض خاصة للنقاد ولجان التحكيم لدعم حظوظ العمل في حفل نهاية العام!',
                      'magic'
                    );
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-100/90 px-2.5 py-1 text-[10px] font-black text-amber-950 transition hover:bg-amber-200"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>تنظيم عروض خاصة للجان التحكيم</span>
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs font-bold leading-relaxed text-slate-700">
              {juryCommentary ||
                `عمل «${latestProject.title}» بتقييم نقدي (${latestProject.criticScore}/10) يمثل إضافة قوية لقائمة ترشيحات استوديو «${studioName}» في الحفل السنوي القادم.`}
            </p>
          </div>
        </div>
      )}

      {/* Official Festivals Roster */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {db.festivals.map((fest) => (
          <div
            key={fest.id}
            className="glass-card rounded-3xl p-4 flex flex-col justify-between"
          >
            <div>
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Award className="h-5 w-5" />
                </div>
                <span className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-900">
                  هيبة {fest.prestige}/100
                </span>
              </div>
              <h3 className="font-display text-xs font-black text-slate-950 sm:text-sm">
                {fest.name}
              </h3>
              <p className="mt-1 text-[11px] font-bold leading-relaxed text-slate-600">
                منافسة رسمية على جوائز أفضل عمل، أفضل مخرج، وأفضل ممثل في ختام العام.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-indigo-100/80 pt-2.5 text-[11px] font-black text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              <span>مُدرج في التصفية السنوية ({currentYear})</span>
            </div>
          </div>
        ))}
      </div>

      {/* Current Year Contenders (Player vs Rivals) */}
      {(projectsThisYear.length > 0 || yearlyRivalReleases.length > 0) && (
        <div className="glass-panel rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xs font-black text-slate-950 sm:text-sm">
              الأعمال المتنافسة في موسم جوائز عام {currentYear}
            </h3>
            <span className="text-[11px] font-bold text-violet-700">
              أعمالك ({projectsThisYear.length}) · أعمال المنافسين ({yearlyRivalReleases.length})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {projectsThisYear.map((proj) => (
              <div
                key={proj.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-violet-300/90 bg-violet-50/80 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {proj.format === 'series' ? (
                      <Tv className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                    ) : (
                      <Film className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                    )}
                    <span className="text-xs font-black leading-snug text-slate-950">
                      «{proj.title}»
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-bold leading-relaxed text-violet-800">
                    إنتاجك ({studioName}) · إخراج: {proj.directorName}
                  </p>
                </div>
                <span className="shrink-0 rounded-xl bg-violet-600 px-2.5 py-1 font-mono text-[11px] font-black text-white">
                  ★ {proj.criticScore}
                </span>
              </div>
            ))}
            {yearlyRivalReleases.slice(0, 6).map((riv) => (
              <div
                key={riv.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-indigo-100 bg-white/80 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="text-xs font-black leading-snug text-slate-900">
                      «{riv.title}»
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-bold leading-relaxed text-slate-500">
                    منافس ({riv.studioName}) · بطولة: {riv.leadStarName}
                  </p>
                </div>
                <span className="shrink-0 rounded-xl bg-amber-100 px-2.5 py-1 font-mono text-[11px] font-black text-amber-900">
                  ★ {riv.criticScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Released Projects Awards Archive */}
      {releasedProjects.length > 0 && (
        <div className="glass-panel rounded-3xl p-4 space-y-2.5">
          <h3 className="font-display text-xs font-black text-slate-950 sm:text-sm">
            أرشيف أعمال الاستوديو والجوائز المحققة ({releasedProjects.length})
          </h3>
          <div className="space-y-2">
            {releasedProjects.map((proj) => (
              <div
                key={proj.id}
                className="flex flex-col justify-between gap-2 rounded-2xl border border-indigo-100/90 bg-white/85 p-3 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-950">
                      «{proj.title}» ({proj.year})
                    </span>
                    <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-800">
                      {proj.format === 'series' ? 'مسلسل' : 'فيلم'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold text-slate-500">
                    إخراج: {proj.directorName} · نقاد: {proj.criticScore}/10
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {proj.awardsWon && proj.awardsWon.length > 0 ? (
                    proj.awardsWon.map((aw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-2.5 py-1 text-[10px] font-black text-slate-950 shadow-2xs"
                      >
                        <Trophy className="h-3 w-3" />
                        {aw}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                      {proj.year === currentYear
                        ? `ينتظر حفل ختام عام ${proj.year} (بعد ${daysUntilAnnualGala} يوم)`
                        : `شارك في موسم ${proj.year}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FLOATING STICKY BOTTOM NAVIGATION BOX */}
      <div className="pointer-events-none fixed right-0 bottom-3 left-0 z-40 px-3">
        <div className="glass-nav pointer-events-auto mx-auto flex max-w-xl items-center justify-between rounded-2xl px-4 py-3">
          <span className="text-xs font-bold text-slate-600">
            أعمال العام الحالي: {projectsThisYear.length}
          </span>
          <button
            type="button"
            onClick={() => resetDraftForNewProject('STUDIO_HUB')}
            className="inline-flex items-center gap-1.5 rounded-xl border-b-2 border-amber-700 bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-2 text-xs font-black text-slate-950 shadow-md transition hover:from-amber-400 hover:to-amber-300"
          >
            <Building2 className="h-4 w-4" />
            <span>العودة لمقر الاستوديو وبدء عمل جديد</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Stage6FestivalsAwards;
