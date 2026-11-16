'use client';

import React, { useMemo, useState } from 'react';
import {
  useGameStore,
  buildThreeSeasonFestivals,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { AnimatedRedCarpetFestivalGraphic } from './CinematicGraphicsScene';
import {
  Award,
  Trophy,
  Clapperboard,
  Building2,
  Wand2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  playClickSound,
  playAwardFanfareSound,
  playContractSignedSound,
  playTabSwitchSound,
} from '@/lib/game-audio';

export default function Stage6FestivalsAwards() {
  const {
    studioName,
    currentYear,
    draft,
    lastReleasedProject,
    releasedProjects,
    customDbPatch,
    groqApiKeyClient,
    preferredGroqModel,
    triggerFestivalJuryPR,
    triggerAnnualAwardsCeremonyNow,
    recordFestivalAwards,
    resetDraftForNewProject,
  } = useGameStore();

  const [ceremonyIdx, setCeremonyIdx] = useState(0);
  const [aiJuryText, setAiJuryText] = useState<string | null>(null);
  const [loadingJuryAi, setLoadingJuryAi] = useState(false);

  const latestProject = lastReleasedProject || releasedProjects[0];
  const db = useMemo(
    () => getResolvedDatabase(customDbPatch),
    [customDbPatch]
  );

  const galaResult = useMemo(() => {
    if (!latestProject) return null;
    return buildThreeSeasonFestivals({
      project: latestProject,
      studioName,
      currentYear,
      db,
    });
  }, [latestProject, studioName, currentYear, db]);

  const activeCeremony =
    galaResult?.ceremonies[ceremonyIdx] || galaResult?.ceremonies[0] || null;

  const handleGenerateAiJurySpeech = async () => {
    if (!latestProject || !activeCeremony || loadingJuryAi) return;
    playClickSound();
    setLoadingJuryAi(true);
    try {
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'evaluate_festival_ceremony',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            festivalName: activeCeremony.festivalName,
            title: latestProject.title,
            synopsis: latestProject.synopsis,
            directorName: latestProject.directorName,
            leadName: latestProject.leadNames[0] || 'بطل العمل',
            criticScore: latestProject.criticScore,
            wonCount: activeCeremony.playerWonCount,
          },
        }),
      });
      const data = await res.json();
      if (data && data.juryStatement) {
        playAwardFanfareSound();
        setAiJuryText(data.juryStatement);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoadingJuryAi(false);
    }
  };

  const handleClaimAndFinish = (target: 'STUDIO_HUB' | 'PROJECT_SETUP') => {
    if (
      latestProject &&
      galaResult &&
      !latestProject.festivalsTriggered &&
      galaResult.allWonAwardLabels.length > 0
    ) {
      playAwardFanfareSound();
      recordFestivalAwards(
        activeCeremony?.festivalName || 'مهرجان العام السينمائي',
        galaResult.allWonAwardLabels,
        latestProject.actorIdsInCast?.slice(0, 1) || []
      );
    } else {
      playContractSignedSound();
    }
    resetDraftForNewProject(target);
  };

  if (!latestProject || !galaResult || !activeCeremony) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <p className="text-xs text-slate-400">
          أصدر عملاً سينمائياً أولاً للمشاركة في المهرجانات.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Festival Selector + Annual Gala Trigger + Jury PR */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-900/75 px-2.5 py-1.5">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {galaResult.ceremonies.map((cer, i) => (
            <button
              key={cer.id}
              type="button"
              onClick={() => {
                playTabSwitchSound();
                setCeremonyIdx(i);
                setAiJuryText(null);
              }}
              className={`flex min-h-[28px] items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all shrink-0 ${
                ceremonyIdx === i
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Trophy className="h-3 w-3" />
              <span>{cer.festivalName}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {!draft.juryBribed && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                triggerFestivalJuryPR();
              }}
              className="flex min-h-[26px] items-center gap-1 rounded-lg border border-purple-500/35 bg-purple-500/15 px-2 py-0.5 text-[9px] font-black text-purple-300 hover:bg-purple-500/25"
            >
              <Sparkles className="h-3 w-3" />
              <span>علاقات عامة للجنة التحكيم</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playAwardFanfareSound();
              triggerAnnualAwardsCeremonyNow();
            }}
            className="flex min-h-[26px] items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[9px] font-black text-amber-300 hover:bg-amber-500/25"
          >
            <Award className="h-3 w-3" />
            <span>حفل جوائز العام الكامل 🏆</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 items-stretch">
        {/* Right 5 Columns: 3D Red Carpet & Rotating Trophy Scene + AI Jury Speech */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between space-y-2">
          <AnimatedRedCarpetFestivalGraphic
            festivalName={activeCeremony.festivalName}
            year={currentYear}
            wonCount={activeCeremony.playerWonCount}
          />

          <div className="rounded-xl border border-amber-500/25 bg-slate-900/85 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-black text-amber-300">
              <span className="flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" />
                <span>بيان لجنة التحكيم ({activeCeremony.playerWonCount} جوائز)</span>
              </span>
              <button
                type="button"
                disabled={loadingJuryAi}
                onClick={handleGenerateAiJurySpeech}
                className="inline-flex items-center gap-1 rounded border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[9px] font-black text-amber-300 hover:bg-amber-500/25 disabled:opacity-50"
              >
                {loadingJuryAi ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <Wand2 className="h-2.5 w-2.5" />
                )}
                <span>خطاب اللجنة بالذكاء الاصطناعي</span>
              </button>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-200">
              {aiJuryText || activeCeremony.juryStatement}
            </p>
          </div>
        </div>

        {/* Left 7 Columns: Award Categories Grid */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto scrollbar-hide">
          {activeCeremony.awards.map((aw, idx) => (
            <div
              key={idx}
              className={`flex flex-col justify-between rounded-xl border p-2.5 transition-all ${
                aw.isPlayerWinner
                  ? 'border-amber-400 bg-amber-500/15'
                  : 'border-slate-800/90 bg-slate-900/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black text-amber-300">
                    {aw.category}
                  </span>
                  {aw.isPlayerWinner && (
                    <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[8px] font-black text-slate-950">
                      فوز مستحق 🏆
                    </span>
                  )}
                </div>

                <h4 className="mt-1 text-xs font-black text-white truncate">
                  {aw.winner}
                </h4>
                <p className="text-[9px] text-slate-400 truncate">
                  العمل: «{aw.winningProjectTitle}» • {aw.winningStudioName}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
        <button
          type="button"
          onClick={() => handleClaimAndFinish('STUDIO_HUB')}
          className="flex min-h-[32px] items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-300 hover:border-amber-500/40 hover:text-white"
        >
          <Building2 className="h-3.5 w-3.5 text-amber-400" />
          <span>العودة لمدينة الإنتاج</span>
        </button>

        <button
          type="button"
          onClick={() => handleClaimAndFinish('PROJECT_SETUP')}
          className="flex min-h-[32px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1 text-xs font-black text-slate-950 shadow-sm hover:brightness-110 active:scale-95"
        >
          <Clapperboard className="h-3.5 w-3.5" />
          <span>اعتماد الجوائز وبدء عمل جديد</span>
        </button>
      </div>
    </div>
  );
}
