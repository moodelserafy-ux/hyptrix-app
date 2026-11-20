'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useGameStore,
  getDaysRemainingUntilAnnualAwards,
  formatGameDate,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { getMarketAiContext } from '@/lib/market-profiles';
import { getOrCreateStudioInstanceId } from '@/lib/supabase';
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
    setProjectJuryCommentary,
    draft,
    showToast,
    groqApiKeyClient,
    preferredGroqModel,
    worldMarket,
    uiLanguage,
  } = useGameStore();

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch, worldMarket),
    [customDbPatch, worldMarket]
  );
  const defaultFestivalName = getMarketAiContext(worldMarket).defaultFestival;

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

  const [fetchedJuryCommentary, setFetchedJuryCommentary] = useState<
    string | null
  >(null);
  const [isLoadingJury, setIsLoadingJury] = useState(false);

  const latestProjectId = latestProject?.id || '';
  const cachedJuryCommentary = latestProject?.juryCommentary || '';
  const displayedJuryCommentary = cachedJuryCommentary || fetchedJuryCommentary;

  useEffect(() => {
    if (!latestProject || cachedJuryCommentary) return;
    let isMounted = true;
    const fetchJurySpeech = async () => {
      setIsLoadingJury(true);
      try {
        const res = await fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'evaluate_festival_ceremony',
            studioInstanceId: getOrCreateStudioInstanceId(),
            groqKeyOverride: groqApiKeyClient,
            preferredModel: preferredGroqModel,
            payload: {
              festivalName: db.festivals[0]?.name || defaultFestivalName,
              projectTitle: latestProject.title,
              synopsis: latestProject.synopsis,
              criticScore: latestProject.criticScore,
              leadActors: latestProject.leadNames,
              directorName: latestProject.directorName,
              studioName,
              ceoName,
              wonAwards: latestProject.awardsWon,
              worldMarket,
              uiLanguage,
            },
          }),
        });
        const data = await res.json();
        const speech = data?.juryStatement || data?.jurySpeech;
        if (isMounted && typeof speech === 'string' && speech.trim()) {
          setFetchedJuryCommentary(speech);
          setProjectJuryCommentary(latestProject.id, speech);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestProjectId, cachedJuryCommentary]);

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
    <div className="mx-auto max-w-4xl space-y-4 pb-28" dir="rtl">
      {/* Unified Royal Cinema Header */}
      <div className="rounded-3xl border-2 border-[#D4AF37] bg-[#1A2530] p-4 text-[#F9F6F0] shadow-lg sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#F9F6F0]/25 bg-[#D4AF37] text-[#1A2530] shadow-md">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-black text-[#F9F6F0] sm:text-base">
                المهرجانات السنوية وقاعة الجوائز ({currentYear})
              </h2>
              <p className="text-[11px] font-bold text-[#F9F6F0]/75">
                {formatGameDate(gameDay, currentYear)} · إجمالي جوائز الاستوديو:{' '}
                <span className="text-[#D4AF37] font-black">{totalStudioAwards} جائزة</span>
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-2xl border border-[#D4AF37] bg-[#D91624] px-3 py-1.5 font-mono text-xs font-black text-white shadow-xs">
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
      <div className="rounded-3xl border-2 border-[#D4AF37]/80 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37] bg-[#1A2530] text-[#D4AF37] shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xs font-black text-[#1A2530] sm:text-sm">
                جدول الحفل السنوي التلقائي لنهاية عام {currentYear}
              </h3>
              <p className="text-[11px] font-bold text-[#1A2530]/70">
                ينطلق الحفل تلقائياً فور اكتمال أيام السنة لتقييم جميع الأفلام والمسلسلات المطروحة.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-xl border border-[#D4AF37] bg-[#1A2530] px-3 py-1.5 font-mono text-xs font-black text-[#D4AF37] tabular-nums">
              {yearProgressPct}% من موسم {currentYear}
            </span>
          </div>
        </div>

        {/* Visual Year Timeline Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-black text-[#1A2530]/70">
            <span>بداية موسم {currentYear}</span>
            <span className="text-[#D91624]">
              متبقي {daysUntilAnnualGala} يوم على إعلان الفائزين ({yearProgressPct}%)
            </span>
            <span>حفل جوائز ختام {currentYear} 🏆</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1A2530]/10 p-0.5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-[#D91624] via-[#D4AF37] to-[#1A2530]"
              initial={false}
              animate={{ width: `${yearProgressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Jury Pre-Screening Statement */}
      {latestProject && (
        <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-[#FFF9E6] p-4 shadow-sm flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37] bg-[#1A2530] text-[#D4AF37]">
            {isLoadingJury ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Quote className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-[#1A2530]">
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
                  className="inline-flex items-center gap-1 rounded-xl border border-[#D4AF37] bg-[#D91624] px-2.5 py-1 text-[10px] font-black text-white transition hover:brightness-110"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>تنظيم عروض خاصة للجان التحكيم</span>
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs font-bold leading-relaxed text-[#1A2530]/85">
              {displayedJuryCommentary ||
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
            className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37] bg-[#FFF9E6] text-[#1A2530]">
                  <Award className="h-5 w-5 text-[#D4AF37]" />
                </div>
                <span className="rounded-xl border border-[#D4AF37]/70 bg-[#FFF9E6] px-2.5 py-0.5 text-[10px] font-black text-[#1A2530]">
                  هيبة {fest.prestige}/100
                </span>
              </div>
              <h3 className="font-display text-xs font-black text-[#1A2530] sm:text-sm">
                {fest.name}
              </h3>
              <p className="mt-1 text-[11px] font-bold leading-relaxed text-[#1A2530]/70">
                منافسة رسمية على جوائز أفضل عمل، أفضل مخرج، وأفضل ممثل في ختام العام.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-[#1A2530]/10 pt-2.5 text-[11px] font-black text-[#15803D]">
              <Check className="h-3.5 w-3.5" />
              <span>مُدرج في التصفية السنوية ({currentYear})</span>
            </div>
          </div>
        ))}
      </div>

      {/* Current Year Contenders (Player vs Rivals) */}
      {(projectsThisYear.length > 0 || yearlyRivalReleases.length > 0) && (
        <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xs font-black text-[#1A2530] sm:text-sm">
              الأعمال المتنافسة في موسم جوائز عام {currentYear}
            </h3>
            <span className="text-[11px] font-black text-[#D91624]">
              أعمالك ({projectsThisYear.length}) · أعمال المنافسين ({yearlyRivalReleases.length})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {projectsThisYear.map((proj) => (
              <div
                key={proj.id}
                className="flex items-center justify-between gap-2 rounded-2xl border-2 border-[#D4AF37] bg-[#FFF9E6] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {proj.format === 'series' ? (
                      <Tv className="h-3.5 w-3.5 shrink-0 text-[#D91624]" />
                    ) : (
                      <Film className="h-3.5 w-3.5 shrink-0 text-[#D91624]" />
                    )}
                    <span className="text-xs font-black leading-snug text-[#1A2530]">
                      «{proj.title}»
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-bold leading-relaxed text-[#1A2530]/75">
                    إنتاجك ({studioName}) · إخراج: {proj.directorName}
                  </p>
                </div>
                <span className="shrink-0 rounded-xl border border-[#D4AF37] bg-[#1A2530] px-2.5 py-1 font-mono text-[11px] font-black text-[#D4AF37]">
                  ★ {proj.criticScore}
                </span>
              </div>
            ))}
            {yearlyRivalReleases.slice(0, 6).map((riv) => (
              <div
                key={riv.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-[#1A2530]/15 bg-[#F9F6F0] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                    <span className="text-xs font-black leading-snug text-[#1A2530]">
                      «{riv.title}»
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-bold leading-relaxed text-[#1A2530]/65">
                    منافس ({riv.studioName}) · بطولة: {riv.leadStarName}
                  </p>
                </div>
                <span className="shrink-0 rounded-xl border border-[#D4AF37]/60 bg-white px-2.5 py-1 font-mono text-[11px] font-black text-[#1A2530]">
                  ★ {riv.criticScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Released Projects Awards Archive */}
      {releasedProjects.length > 0 && (
        <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-4 shadow-sm space-y-2.5">
          <h3 className="font-display text-xs font-black text-[#1A2530] sm:text-sm">
            أرشيف أعمال الاستوديو والجوائز المحققة ({releasedProjects.length})
          </h3>
          <div className="space-y-2">
            {releasedProjects.map((proj) => (
              <div
                key={proj.id}
                className="flex flex-col justify-between gap-2 rounded-2xl border border-[#1A2530]/15 bg-[#F9F6F0] p-3 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[#1A2530]">
                      «{proj.title}» ({proj.year})
                    </span>
                    <span className="rounded-lg bg-[#1A2530] px-2 py-0.5 text-[10px] font-black text-[#D4AF37]">
                      {proj.format === 'series' ? 'مسلسل' : 'فيلم'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold text-[#1A2530]/65">
                    إخراج: {proj.directorName} · نقاد: {proj.criticScore}/10
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {proj.awardsWon && proj.awardsWon.length > 0 ? (
                    proj.awardsWon.map((aw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#1A2530]/20 bg-[#D4AF37] px-2.5 py-1 text-[10px] font-black text-[#1A2530] shadow-2xs"
                      >
                        <Trophy className="h-3 w-3" />
                        {aw}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-xl border border-[#1A2530]/15 bg-white px-2.5 py-1 text-[10px] font-bold text-[#1A2530]/70">
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

      {/* FLOATING STICKY BOTTOM NAVIGATION BOX — Royal Cinema Theme */}
      <div className="pointer-events-none fixed right-0 bottom-3 left-0 z-40 px-3">
        <div className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530]/95 px-4 py-3 shadow-xl backdrop-blur-md">
          <span className="text-xs font-bold text-[#F9F6F0]/80">
            أعمال العام الحالي: <strong className="text-[#D4AF37]">{projectsThisYear.length}</strong>
          </span>
          <button
            type="button"
            onClick={() => resetDraftForNewProject('STUDIO_HUB')}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#D4AF37] bg-[#D91624] px-5 py-2 text-xs font-black text-white shadow-md transition hover:brightness-110"
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
