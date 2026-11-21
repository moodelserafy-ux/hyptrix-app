'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useGameStore,
  getDaysRemainingUntilAnnualAwards,
  formatGameDate,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { getMarketAiContext } from '@/lib/market-profiles';
import { getUiDir, localizeEntityName, tr } from '@/lib/i18n';
import { getOrCreateStudioInstanceId } from '@/lib/supabase';
import {
  Award,
  Trophy,
  Sparkles,
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

  const uiDir = getUiDir(uiLanguage);
  const [activeTab, setActiveTab] = useState<'race' | 'trophies'>('race');

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch, worldMarket),
    [customDbPatch, worldMarket]
  );
  const defaultFestivalName = localizeEntityName(
    getMarketAiContext(worldMarket).defaultFestival,
    uiLanguage
  );
  const primaryFestivalDisplay = localizeEntityName(
    db.festivals[0]?.name || defaultFestivalName,
    uiLanguage
  );

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
              festivalName: primaryFestivalDisplay,
              projectTitle: latestProject.title,
              synopsis: latestProject.synopsis,
              criticScore: latestProject.criticScore,
              leadActors: latestProject.leadNames.map((n) =>
                localizeEntityName(n, uiLanguage)
              ),
              directorName: localizeEntityName(
                latestProject.directorName,
                uiLanguage
              ),
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
        // Silent fallback
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
    <div className="mx-auto max-w-3xl space-y-3.5 pb-24" dir={uiDir}>
      {/* Compact Mobile-First Awards Header + Embedded Countdown + Segmented Tabs */}
      <div className="rounded-3xl border-2 border-[#D4AF37] bg-[#1A2530] p-4 text-[#F9F6F0] shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#F9F6F0]/25 bg-gradient-to-br from-[#FDE68A] to-[#D4AF37] text-[#1A2530] shadow">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-black text-[#F9F6F0] truncate">
                {tr(
                  uiLanguage,
                  `Awards Hall · ${currentYear}`,
                  `قاعة الجوائز · ${currentYear}`
                )}
              </h2>
              <p className="text-[11px] font-bold text-[#F9F6F0]/75 truncate">
                {formatGameDate(gameDay, currentYear, uiLanguage)} ·{' '}
                <span className="text-[#FDE68A] font-black tabular-nums">
                  {totalStudioAwards} {tr(uiLanguage, 'Trophies', 'جائزة')}
                </span>
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-[#D4AF37] bg-[#D91624] px-3 py-1.5 text-center shadow-xs">
            <div className="font-mono text-xs font-black text-white leading-none tabular-nums">
              {daysUntilAnnualGala}d
            </div>
            <div className="text-[9px] font-bold text-[#FDE68A] mt-0.5">
              {tr(uiLanguage, 'To Gala', 'للحفل')}
            </div>
          </div>
        </div>

        {/* Integrated Year-End Gala Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#F9F6F0]/70">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#D4AF37]" />
              {tr(
                uiLanguage,
                'Automatic Year-End Gala (Day 120)',
                'الحفل السنوي ينطلق تلقائياً (يوم 120)'
              )}
            </span>
            <span className="font-mono font-black text-[#D4AF37] tabular-nums">
              {yearProgressPct}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] via-[#FDE68A] to-[#D91624]"
              initial={false}
              animate={{ width: `${yearProgressPct}%` }}
              transition={{ duration: 0.45 }}
            />
          </div>
        </div>

        {/* Clean 2-Tab Segmented Switcher */}
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#0F171E] p-1 border border-[#D4AF37]/30">
          <button
            type="button"
            onClick={() => setActiveTab('race')}
            className={`min-h-[42px] rounded-xl px-3 py-2 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'race'
                ? 'bg-[#D4AF37] text-[#1A2530] shadow'
                : 'text-[#F9F6F0]/75 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4 shrink-0" />
            <span>
              {tr(uiLanguage, `${currentYear} Race`, `سباق ${currentYear}`)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trophies')}
            className={`min-h-[42px] rounded-xl px-3 py-2 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'trophies'
                ? 'bg-[#D91624] text-white shadow'
                : 'text-[#F9F6F0]/75 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>
              {tr(uiLanguage, 'Trophy Cabinet', 'خزانة الجوائز')}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black tabular-nums ${
                activeTab === 'trophies'
                  ? 'bg-black/25 text-[#FDE68A]'
                  : 'bg-white/10 text-[#D4AF37]'
              }`}
            >
              {totalStudioAwards}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: CURRENT SEASON RACE */}
      {activeTab === 'race' && (
        <div className="space-y-3">
          {/* Compact Jury Report & Private Screening PR */}
          {latestProject && (
            <div className="rounded-3xl border-2 border-[#D4AF37]/70 bg-[#FFF9E6] p-3.5 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1A2530] text-[#D4AF37]">
                    {isLoadingJury ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Quote className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-xs font-black text-[#1A2530] truncate">
                    {tr(uiLanguage, 'Jury Buzz:', 'صدى اللجنة:')} {latestProject.title}
                  </span>
                </div>

                {!draft.juryBribed && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerFestivalJuryPR();
                      showToast(
                        tr(
                          uiLanguage,
                          'Private jury screenings hosted — awards momentum boosted!',
                          'تم تنظيم عروض خاصة للجان التحكيم لدعم حظوظك في الحفل السنوي!'
                        ),
                        'magic'
                      );
                    }}
                    className="shrink-0 min-h-[36px] inline-flex items-center gap-1 rounded-xl border border-[#D4AF37] bg-[#D91624] px-2.5 py-1 text-[10px] font-black text-white hover:brightness-110 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{tr(uiLanguage, 'Jury PR', 'عروض للنقاد')}</span>
                  </button>
                )}
              </div>

              <p className="text-xs font-bold leading-relaxed text-[#1A2530]/85">
                {displayedJuryCommentary ||
                  tr(
                    uiLanguage,
                    `"${latestProject.title}" (${latestProject.criticScore}/10 critics) faces a strict year-end jury alongside top rival studios.`,
                    `عمل «${latestProject.title}» (${latestProject.criticScore}/10 نقاد) يدخل سباقاً شرساً أمام لجنة تحكيم صارمة ومنافسين أقوياء.`
                  )}
              </p>
            </div>
          )}

          {/* Official Contenders Leaderboard */}
          <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xs sm:text-sm font-black text-[#1A2530]">
                {tr(uiLanguage, `${currentYear} Contenders`, `المتنافسون في ${currentYear}`)}
              </h3>
              <span className="text-[10px] font-black text-[#D91624]">
                {tr(
                  uiLanguage,
                  `Yours (${projectsThisYear.length}) · Rivals (${yearlyRivalReleases.length})`,
                  `أعمالك (${projectsThisYear.length}) · المنافسون (${yearlyRivalReleases.length})`
                )}
              </span>
            </div>

            {projectsThisYear.length === 0 && yearlyRivalReleases.length === 0 ? (
              <div className="rounded-2xl bg-[#F9F6F0] p-4 text-center text-xs font-bold text-[#1A2530]/70">
                {tr(
                  uiLanguage,
                  'Release a film or series this year to qualify for the Year-End Gala.',
                  'اطرح فيلماً أو مسلسلاً هذا العام للتأهل لسباق الجوائز السنوية.'
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {projectsThisYear.map((proj) => (
                  <div
                    key={proj.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border-2 border-[#D4AF37] bg-[#FFF9E6] p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {proj.format === 'series' ? (
                          <Tv className="h-3.5 w-3.5 shrink-0 text-[#D91624]" />
                        ) : (
                          <Film className="h-3.5 w-3.5 shrink-0 text-[#D91624]" />
                        )}
                        <span className="text-xs font-black text-[#1A2530] truncate">
                          {proj.title}
                        </span>
                        <span className="rounded bg-[#D91624] px-1.5 py-0.5 text-[9px] font-black text-white shrink-0">
                          {tr(uiLanguage, 'Yours', 'عملك')}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] font-bold text-[#1A2530]/70 truncate">
                        {studioName} · {localizeEntityName(proj.directorName, uiLanguage)}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-xl bg-[#1A2530] px-2.5 py-1 text-center">
                      <span className="font-mono text-xs font-black text-[#FDE68A] tabular-nums">
                        ★ {proj.criticScore}
                      </span>
                    </div>
                  </div>
                ))}

                {yearlyRivalReleases.slice(0, 5).map((riv) => (
                  <div
                    key={riv.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-[#1A2530]/12 bg-[#F9F6F0] p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                        <span className="text-xs font-black text-[#1A2530] truncate">
                          {riv.title}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] font-bold text-[#1A2530]/60 truncate">
                        {localizeEntityName(riv.studioName, uiLanguage)} ·{' '}
                        {localizeEntityName(riv.leadStarName, uiLanguage)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-xl border border-[#D4AF37]/50 bg-white px-2.5 py-1 font-mono text-xs font-black text-[#1A2530] tabular-nums">
                      ★ {riv.criticScore}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TROPHY CABINET & FESTIVALS */}
      {activeTab === 'trophies' && (
        <div className="space-y-3">
          {/* Compact 2 Major Annual Festivals Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {db.festivals.slice(0, 2).map((fest, idx) => (
              <div
                key={fest.id}
                className="rounded-2xl border-2 border-[#D4AF37]/60 bg-white p-3 flex items-center justify-between gap-2.5 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1A2530] text-[#D4AF37]">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-xs font-black text-[#1A2530] truncate">
                      {localizeEntityName(fest.name, uiLanguage)}
                    </h3>
                    <p className="text-[10px] font-bold text-[#1A2530]/65 truncate">
                      {idx === 0
                        ? tr(uiLanguage, 'Critics & Craft Jury', 'لجنة النقاد والصنعة الفنية')
                        : tr(uiLanguage, 'Audience & Box Office Gala', 'جوائز الجمهور وشباك التذاكر')}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-[#FFF9E6] border border-[#D4AF37] px-2 py-0.5 font-mono text-[10px] font-black text-[#1A2530] tabular-nums">
                  {fest.prestige}/100
                </span>
              </div>
            ))}
          </div>

          {/* Studio Trophy Archive */}
          <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-3.5 shadow-sm space-y-2.5">
            <h3 className="font-display text-xs sm:text-sm font-black text-[#1A2530]">
              {tr(
                uiLanguage,
                `Studio Trophy Archive (${releasedProjects.length})`,
                `أرشيف الجوائز والأعمال (${releasedProjects.length})`
              )}
            </h3>

            {releasedProjects.length === 0 ? (
              <div className="rounded-2xl bg-[#F9F6F0] p-4 text-center text-xs font-bold text-[#1A2530]/65">
                {tr(uiLanguage, 'No studio releases yet.', 'لم تطرح أي أعمال بعد.')}
              </div>
            ) : (
              <div className="space-y-2">
                {releasedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="rounded-2xl border border-[#1A2530]/12 bg-[#F9F6F0] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-[#1A2530] truncate">
                            {proj.title}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[#1A2530]/55">
                            ({proj.year})
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-[#1A2530]/65">
                          {localizeEntityName(proj.directorName, uiLanguage)} ·{' '}
                          {tr(uiLanguage, 'Critics', 'نقاد')} {proj.criticScore}/10
                        </div>
                      </div>
                      <span className="shrink-0 rounded-lg bg-[#1A2530] px-2 py-0.5 text-[10px] font-black text-[#D4AF37]">
                        {proj.format === 'series'
                          ? tr(uiLanguage, 'Series', 'مسلسل')
                          : tr(uiLanguage, 'Film', 'فيلم')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {proj.awardsWon && proj.awardsWon.length > 0 ? (
                        proj.awardsWon.map((aw, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#D4AF37] px-2 py-0.5 text-[10px] font-black text-[#1A2530]"
                          >
                            <Trophy className="h-3 w-3 shrink-0" />
                            <span>{localizeEntityName(aw, uiLanguage)}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] font-bold text-[#1A2530]/60">
                          {proj.year === currentYear
                            ? tr(
                                uiLanguage,
                                `Awaiting ${proj.year} Year-End Gala (${daysUntilAnnualGala}d)`,
                                `بانتظار حفل ختام ${proj.year} (بعد ${daysUntilAnnualGala} يوم)`
                              )
                            : tr(
                                uiLanguage,
                                `Entered in ${proj.year} — No trophies won`,
                                `شارك في ${proj.year} — لم يحصد جوائز`
                              )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING STICKY BOTTOM BAR */}
      <div className="pointer-events-none fixed right-0 bottom-3 left-0 z-40 px-3">
        <div className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between gap-2 rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530]/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
          <span className="text-xs font-bold text-[#F9F6F0]/80">
            {tr(uiLanguage, `${currentYear} Slate:`, `أعمال ${currentYear}:`)}{' '}
            <strong className="text-[#D4AF37] tabular-nums">{projectsThisYear.length}</strong>
          </span>
          <button
            type="button"
            onClick={() => resetDraftForNewProject('STUDIO_HUB')}
            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border-2 border-[#D4AF37] bg-[#D91624] px-4 py-2 text-xs font-black text-white shadow-md transition hover:brightness-110 cursor-pointer"
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span>{tr(uiLanguage, 'Back to Studio HQ', 'العودة لمكتب الاستوديو')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Stage6FestivalsAwards;
