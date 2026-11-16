'use client';

import React, { useMemo, useState } from 'react';
import { useGameStore } from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { StudioLogoSvg } from './StudioLogoSvg';
import {
  Trophy,
  RotateCcw,
  AlertTriangle,
  Award,
} from 'lucide-react';
import {
  playClickSound,
  playTabSwitchSound,
  playAwardFanfareSound,
} from '@/lib/game-audio';

export default function LeaderboardAndSettingsView() {
  const {
    studioName,
    ceoName,
    logo,
    marketValue,
    reputation,
    releasedProjects,
    emergingCompetitors,
    competitorNetWorthDelta,
    customDbPatch,
    triggerAnnualAwardsCeremonyNow,
    resetEntireGameAndStartFresh,
  } = useGameStore();

  const [subTab, setSubTab] = useState<'ranking' | 'system'>('ranking');
  const [confirmReset, setConfirmReset] = useState(false);

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch),
    [customDbPatch]
  );

  const combinedLeaderboard = useMemo(() => {
    const playerTotalAwards = releasedProjects.reduce(
      (sum, p) => sum + p.awardsWon.length,
      0
    );

    const playerEntry = {
      id: 'player_studio',
      name: studioName || 'العقرب ستوديوز',
      ceo: ceoName || 'المدير التنفيذي',
      netWorth: marketValue,
      reputation,
      releasesCount: releasedProjects.length,
      awardsCount: playerTotalAwards,
      isPlayer: true,
    };

    const allRivals = [...db.competitor_studios, ...emergingCompetitors].map(
      (comp) => {
        const delta = competitorNetWorthDelta[comp.name] || {
          netWorthDelta: 0,
          releasesDelta: 0,
          awardsDelta: 0,
        };
        const baseWorth =
          comp.estimated_net_worth || comp.market_power * 4_500_000;
        return {
          id: comp.id,
          name: comp.name,
          ceo: comp.ceoName || comp.ceo || 'مجلس الإدارة',
          netWorth: Math.max(30_000_000, baseWorth + delta.netWorthDelta),
          reputation: comp.market_power,
          releasesCount: 4 + delta.releasesDelta,
          awardsCount: 2 + delta.awardsDelta,
          isPlayer: false,
        };
      }
    );

    return [playerEntry, ...allRivals].sort((a, b) => b.netWorth - a.netWorth);
  }, [
    studioName,
    ceoName,
    marketValue,
    reputation,
    releasedProjects,
    db.competitor_studios,
    emergingCompetitors,
    competitorNetWorthDelta,
  ]);

  return (
    <div className="space-y-2.5">
      {/* Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-900/75 px-2.5 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              playTabSwitchSound();
              setSubTab('ranking');
            }}
            className={`flex min-h-[28px] items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
              subTab === 'ranking'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Trophy className="h-3 w-3" />
            <span>تصنيف القيمة السوقية للشركات</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTabSwitchSound();
              setSubTab('system');
            }}
            className={`flex min-h-[28px] items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
              subTab === 'system'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="h-3 w-3" />
            <span>خيارات الموسم وإعادة الضبط</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            playAwardFanfareSound();
            triggerAnnualAwardsCeremonyNow();
          }}
          className="flex min-h-[28px] items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black text-amber-300 hover:bg-amber-500/25"
        >
          <Award className="h-3 w-3" />
          <span>إقامة حفل الجوائز السنوي الآن</span>
        </button>
      </div>

      {/* RANKING TABLE */}
      {subTab === 'ranking' && (
        <div className="space-y-1.5 max-h-[50dvh] overflow-y-auto scrollbar-hide">
          {combinedLeaderboard.map((studio, index) => (
            <div
              key={studio.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-all ${
                studio.isPlayer
                  ? 'border-amber-400/70 bg-amber-500/10'
                  : 'border-slate-800/90 bg-slate-900/75'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-black ${
                    index === 0
                      ? 'bg-amber-400 text-slate-950'
                      : index === 1
                      ? 'bg-slate-300 text-slate-950'
                      : index === 2
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  #{index + 1}
                </div>

                {studio.isPlayer && (
                  <StudioLogoSvg config={logo} size={22} className="shrink-0" />
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-white truncate">
                      {studio.name}
                    </h4>
                    {studio.isPlayer && (
                      <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0 text-[8px] font-black text-amber-300">
                        شركتك
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 truncate">
                    القيادة: {studio.ceo} • الأعمال: {studio.releasesCount} • الجوائز: 🏆{studio.awardsCount}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px]">
                <div className="text-center">
                  <span className="block text-[8px] text-slate-400">السمعة</span>
                  <span className="font-mono font-black text-amber-300">
                    {studio.reputation}
                  </span>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-slate-950 px-2.5 py-1 text-center">
                  <span className="block text-[8px] text-slate-400">
                    القيمة السوقية
                  </span>
                  <span className="font-mono text-[11px] font-black text-emerald-300">
                    {formatMoney(studio.netWorth)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SYSTEM & RESET */}
      {subTab === 'system' && (
        <div className="rounded-xl border border-rose-500/25 bg-slate-900/80 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black text-rose-300 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>إعادة تأسيس الاستوديو من الصفر</span>
            </h3>
            <p className="mt-1 text-[10px] text-slate-400">
              يتم حفظ تقدمك تلقائياً في المتصفح. إذا أردت البدء باستوديو جديد تماماً يمكنك مسح البيانات الحالية.
            </p>
          </div>

          <div className="shrink-0">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex min-h-[30px] items-center justify-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-[10px] font-black text-rose-300 hover:bg-rose-500/25"
              >
                <RotateCcw className="h-3 w-3" />
                <span>إعادة ضبط اللعبة</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    resetEntireGameAndStartFresh();
                    setConfirmReset(false);
                  }}
                  className="min-h-[30px] rounded-lg bg-rose-600 px-3 py-1 text-[10px] font-black text-white"
                >
                  تأكيد المسح
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[30px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-300"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
