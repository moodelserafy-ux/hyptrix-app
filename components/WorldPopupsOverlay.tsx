'use client';

import React from 'react';
import { useGameStore } from '@/lib/store';
import { AnimatedRedCarpetFestivalGraphic } from './CinematicGraphicsScene';
import {
  Sparkles,
  Trophy,
  Check,
} from 'lucide-react';
import {
  playClickSound,
  playAwardFanfareSound,
} from '@/lib/game-audio';

export default function WorldPopupsOverlay() {
  const {
    breakingNewsQueue,
    dismissBreakingNewsModal,
    festivalModalQueue,
    dismissFestivalCeremonyModal,
  } = useGameStore();

  const currentCeremony = festivalModalQueue[0] || null;
  const currentNews = breakingNewsQueue[0] || null;

  // =========================================================================
  // 1. SURPRISE ANNUAL AWARDS GALA MODAL
  // =========================================================================
  if (currentCeremony) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md">
        <div className="w-[90%] max-w-4xl max-h-[86%] flex flex-col rounded-2xl border border-amber-500/40 bg-slate-950/95 p-3 sm:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-white">
                  {currentCeremony.festivalName}
                </h2>
                <p className="text-[10px] text-amber-300 font-bold">
                  {currentCeremony.festivalBuzz}
                </p>
              </div>
            </div>

            <span className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-[10px] font-black text-amber-300">
              جوائز شركتك: {currentCeremony.playerWonCount} 🏆
            </span>
          </div>

          <div className="grid grid-cols-12 gap-3 flex-1 overflow-y-auto scrollbar-hide items-center">
            <div className="col-span-12 lg:col-span-5 space-y-2">
              <AnimatedRedCarpetFestivalGraphic
                festivalName={currentCeremony.festivalName}
                year={currentCeremony.year}
                wonCount={currentCeremony.playerWonCount}
              />
              <p className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-[10px] leading-relaxed text-slate-300">
                {currentCeremony.juryStatement}
              </p>
            </div>

            <div className="col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentCeremony.awards.map((aw, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-2.5 ${
                    aw.isPlayerWinner
                      ? 'border-amber-400 bg-amber-500/15'
                      : 'border-slate-800 bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black text-amber-300">
                      {aw.category}
                    </span>
                    {aw.isPlayerWinner && (
                      <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[8px] font-black text-slate-950">
                        فوز 🏆
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1 text-xs font-black text-white truncate">
                    {aw.winner}
                  </h4>
                  <p className="text-[9px] text-slate-400 truncate">
                    «{aw.winningProjectTitle}» • {aw.winningStudioName}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end border-t border-slate-800 pt-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                playAwardFanfareSound();
                dismissFestivalCeremonyModal();
              }}
              className="flex min-h-[32px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1 text-xs font-black text-slate-950 shadow-sm hover:brightness-110 active:scale-95"
            >
              <Check className="h-3.5 w-3.5" />
              <span>استلام الجوائز ومتابعة الموسم الجديد</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. BREAKING NEWS POPUP MODAL
  // =========================================================================
  if (!currentNews) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/35 bg-slate-950/95 p-3.5 shadow-2xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300">
            <Sparkles className="h-3 w-3" />
            <span>{currentNews.badgeLabel}</span>
          </span>
          {currentNews.extraStatBadge && (
            <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
              {currentNews.extraStatBadge}
            </span>
          )}
        </div>

        <h3 className="text-xs sm:text-sm font-black text-white">
          {currentNews.headline}
        </h3>
        <p className="text-[11px] leading-relaxed text-slate-300">
          {currentNews.detail}
        </p>

        {currentNews.gameImpactLabel && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-bold text-amber-300">
            {currentNews.gameImpactLabel}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              dismissBreakingNewsModal();
            }}
            className="flex min-h-[30px] items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3.5 py-1 text-[10px] font-black text-slate-950"
          >
            <Check className="h-3 w-3" />
            <span>متابعة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
