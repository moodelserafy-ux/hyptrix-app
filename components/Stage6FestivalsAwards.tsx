'use client';

import React, { useMemo } from 'react';
import {
  useGameStore,
  buildThreeSeasonFestivals,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { AnimatedRedCarpetFestivalGraphic } from './CinematicGraphicsScene';
import {
  Award,
  Trophy,
  CheckCircle2,
  Clapperboard,
  Building2,
} from 'lucide-react';
import {
  playClickSound,
  playAwardFanfareSound,
  playContractSignedSound,
} from '@/lib/game-audio';

export default function Stage6FestivalsAwards() {
  const {
    studioName,
    currentYear,
    lastReleasedProject,
    releasedProjects,
    customDbPatch,
    recordFestivalAwards,
    resetDraftForNewProject,
  } = useGameStore();

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

  const handleClaimAndFinish = (target: 'STUDIO_HUB' | 'PROJECT_SETUP') => {
    if (
      latestProject &&
      galaResult &&
      !latestProject.festivalsTriggered &&
      galaResult.allWonAwardLabels.length > 0
    ) {
      playAwardFanfareSound();
      recordFestivalAwards(
        galaResult.ceremonies[0]?.festivalName || 'مهرجان العام السينمائي',
        galaResult.allWonAwardLabels,
        latestProject.actorIdsInCast?.slice(0, 1) || []
      );
    } else {
      playContractSignedSound();
    }
    resetDraftForNewProject(target);
  };

  if (!latestProject || !galaResult) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <p className="text-xs text-slate-400">
          أصدر عملاً سينمائياً أولاً للمشاركة في المهرجانات.
        </p>
      </div>
    );
  }

  const primaryCeremony = galaResult.ceremonies[0];

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-12 gap-3 items-stretch">
        {/* Right 5 Columns: 3D Red Carpet & Rotating Trophy Scene */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between space-y-2">
          <AnimatedRedCarpetFestivalGraphic
            festivalName={primaryCeremony?.festivalName || 'مهرجان القاهرة السينمائي'}
            year={currentYear}
            wonCount={galaResult.allWonAwardLabels.length}
          />

          <div className="rounded-xl border border-amber-500/25 bg-slate-900/85 p-2.5">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-300">
              <span className="flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" />
                <span>بيان لجنة التحكيم</span>
              </span>
              <span>{galaResult.allWonAwardLabels.length} جوائز</span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-300">
              {primaryCeremony?.juryStatement}
            </p>
          </div>
        </div>

        {/* Left 7 Columns: Award Categories Grid */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[48dvh] overflow-y-auto scrollbar-hide">
          {primaryCeremony?.awards.map((aw, idx) => (
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
