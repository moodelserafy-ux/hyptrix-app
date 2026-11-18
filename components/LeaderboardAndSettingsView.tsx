'use client';

import React, { useMemo, useState } from 'react';
import { useGameStore, getDaysRemainingUntilAnnualAwards } from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { StudioLogoSvg } from './StudioLogoSvg';
import {
  Trophy,
  RotateCcw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export function LeaderboardAndSettingsView() {
  const {
    studioName,
    ceoName,
    logo,
    marketValue,
    reputation,
    gameDay,
    releasedProjects,
    emergingCompetitors,
    competitorNetWorthDelta,
    customDbPatch,
    resetEntireGameAndStartFresh,
  } = useGameStore();

  const [subTab, setSubTab] = useState<'ranking' | 'system'>('ranking');
  const [confirmReset, setConfirmReset] = useState(false);
  const [page, setPage] = useState(0);

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch),
    [customDbPatch]
  );

  const daysUntilAnnualAwards = getDaysRemainingUntilAnnualAwards(gameDay);

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

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(combinedLeaderboard.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = combinedLeaderboard.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize
  );

  return (
    <div className="space-y-3" dir="rtl">
      {/* Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-100 bg-white p-2 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('ranking')}
            className={`flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
              subTab === 'ranking'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-indigo-50'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>تصنيف القيمة السوقية للشركات</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('system')}
            className={`flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
              subTab === 'system'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-rose-50'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>إعادة تأسيس الاستوديو</span>
          </button>
        </div>

        <span className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-800 tabular-nums">
          <Sparkles className="h-3 w-3 text-amber-600" />
          <span>حفل الجوائز السنوي التلقائي بعد {daysUntilAnnualAwards} يوم</span>
        </span>
      </div>

      {/* RANKING TABLE */}
      {subTab === 'ranking' && (
        <div className="space-y-2">
          {visibleRows.map((studio, idx) => {
            const rankNum = safePage * pageSize + idx + 1;
            return (
              <div
                key={studio.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-2.5 transition-all ${
                  studio.isPlayer
                    ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50/90 shadow-xs'
                    : 'border-indigo-100 bg-white'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-display text-xs font-black ${
                      rankNum === 1
                        ? 'bg-amber-400 text-slate-950'
                        : rankNum === 2
                        ? 'bg-slate-200 text-slate-900'
                        : rankNum === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    #{rankNum}
                  </div>

                  {studio.isPlayer && (
                    <StudioLogoSvg config={logo} size={28} className="shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="font-display text-xs font-black text-slate-900 sm:text-sm">
                        {studio.name}
                      </h4>
                      {studio.isPlayer && (
                        <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                          شركتك
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold leading-relaxed text-slate-500">
                      القيادة: {studio.ceo} · الأعمال: {studio.releasesCount} · الجوائز: 🏆 {studio.awardsCount}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <div className="text-center">
                    <span className="block text-[9px] font-bold text-slate-400">
                      السمعة
                    </span>
                    <span className="font-display font-black text-violet-700">
                      {studio.reputation}%
                    </span>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-center">
                    <span className="block text-[9px] font-bold text-emerald-800">
                      القيمة السوقية
                    </span>
                    <span className="font-display text-xs font-black text-emerald-700">
                      {formatMoney(studio.netWorth)} ج.م
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-indigo-100 pt-2.5">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => {
                  setPage((p) => Math.max(0, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40"
              >
                <span>السابق</span>
              </button>
              <span className="text-xs font-black text-slate-600 tabular-nums">
                صفحة {safePage + 1} من {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => {
                  setPage((p) => Math.min(totalPages - 1, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center justify-center rounded-xl bg-violet-600 px-4 py-1.5 text-xs font-black text-white disabled:opacity-40"
              >
                <span>التالي</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SYSTEM & RESET */}
      {subTab === 'system' && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border-2 border-rose-200 bg-rose-50/70 p-4 sm:flex-row">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-black text-rose-900">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>إعادة تأسيس الاستوديو من الصفر</span>
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-600">
              يتم حفظ تقدمك تلقائياً. إذا أردت البدء باستوديو جديد تماماً يمكنك مسح البيانات الحالية.
            </p>
          </div>

          <div className="shrink-0">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-xs hover:bg-rose-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>إعادة ضبط اللعبة</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetEntireGameAndStartFresh();
                    setConfirmReset(false);
                  }}
                  className="min-h-[38px] rounded-xl bg-rose-700 px-3.5 py-2 text-xs font-black text-white"
                >
                  تأكيد المسح النهائي
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[38px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700"
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

export default LeaderboardAndSettingsView;
