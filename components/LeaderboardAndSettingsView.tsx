'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '@/lib/store';
import {
  fetchGlobalLeaderboard,
  LeaderboardStudioEntry,
  syncStudioWithSupabase,
} from '@/lib/supabase';
import { formatMoney } from '@/lib/game-engine';
import {
  Trophy,
  ShieldCheck,
  UserCheck,
  Crown,
  Award,
  Film,
  TrendingUp,
  Medal,
  Sparkles,
  Wallet,
} from 'lucide-react';

export function LeaderboardAndSettingsView() {
  const {
    studioName,
    ceoName,
    currentRegion,
    cash,
    marketValue,
    releasedProjects,
    emergingCompetitors,
    competitorNetWorthDelta,
    supabaseUserEmail,
    setSupabaseUserEmail,
  } = useGameStore();

  const [entries, setEntries] = useState<LeaderboardStudioEntry[]>([]);
  const [emailInput, setEmailInput] = useState(supabaseUserEmail || '');
  const [authStatus, setAuthStatus] = useState<string | null>(null);

  const totalAwards = releasedProjects.reduce(
    (s, p) => s + p.awardsWon.length,
    0
  );

  useEffect(() => {
    fetchGlobalLeaderboard({
      studioName,
      ceoName,
      region: currentRegion,
      netWorth: marketValue,
      releasesCount: releasedProjects.length,
      awardsCount: totalAwards,
    }).then((baseEntries) => {
      // Merge competitor valuation deltas (hits, flops, awards) + any emerging studios
      const updated = baseEntries.map((row) => {
        if (row.isPlayer) return row;
        const delta = competitorNetWorthDelta[row.studioName];
        return {
          ...row,
          netWorth: Math.max(
            45_000_000,
            row.netWorth + (delta?.netWorthDelta || 0)
          ),
          releasesCount: row.releasesCount + (delta?.releasesDelta || 0),
          awardsCount: row.awardsCount + (delta?.awardsDelta || 0),
        };
      });

      emergingCompetitors.forEach((em) => {
        if (!updated.some((u) => u.studioName === em.name)) {
          const delta = competitorNetWorthDelta[em.name];
          updated.push({
            rank: 99,
            studioName: em.name,
            ceoName: em.ceoName || 'رئيس مجلس الإدارة',
            region: 'egypt',
            netWorth: Math.max(
              45_000_000,
              em.market_power * 2_800_000 + (delta?.netWorthDelta || 0)
            ),
            releasesCount: 2 + (delta?.releasesDelta || 0),
            awardsCount: 1 + (delta?.awardsDelta || 0),
            specialtyLabel: `شركة إنتاج صاعدة (${em.preferred_genres.join(' / ')})`,
          });
        }
      });

      updated.sort((a, b) => {
        if (b.netWorth !== a.netWorth) return b.netWorth - a.netWorth;
        if (b.awardsCount !== a.awardsCount) return b.awardsCount - a.awardsCount;
        return b.releasesCount - a.releasesCount;
      });

      setEntries(
        updated.map((item, idx) => ({
          ...item,
          rank: idx + 1,
        }))
      );
    });
  }, [
    studioName,
    ceoName,
    currentRegion,
    marketValue,
    releasedProjects.length,
    totalAwards,
    emergingCompetitors,
    competitorNetWorthDelta,
  ]);

  const playerEntry = entries.find((e) => e.isPlayer);
  const nextRivalAbove =
    playerEntry && playerEntry.rank > 1
      ? entries.find((e) => e.rank === playerEntry.rank - 1)
      : null;

  const topThree = entries.slice(0, 3);

  const handleCloudSyncLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSupabaseUserEmail(emailInput.trim());
    await syncStudioWithSupabase({
      studioName,
      ceoName,
      region: currentRegion,
      netWorth: marketValue,
      releasesCount: releasedProjects.length,
      awardsCount: totalAwards,
      email: emailInput.trim(),
    });
    setAuthStatus('تم ربط حساب الاستوديو وحفظ قيمتك السوقية وترتيبك السحابي بنجاح.');
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Player Current Official Valuation & Rank Banner */}
      {playerEntry && (
        <div className="rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold text-violet-100">
                البورصة الرسمية للقيمة السوقية لشركات الإنتاج
              </div>
              <div className="font-display mt-0.5 text-xl font-black">
                {playerEntry.studioName}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-medium text-indigo-100">
                <span>
                  القيمة السوقية:{' '}
                  <strong className="font-black text-amber-300">
                    {formatMoney(marketValue)} ج.م
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                  <Wallet className="h-3 w-3" />
                  <span>خزينة السيولة: {formatMoney(cash)} ج.م</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur-xs tabular-nums">
              <span className="text-[10px] font-bold text-violet-100">
                المركز الحالي
              </span>
              <span className="font-display text-2xl font-black text-amber-300">
                #{playerEntry.rank}
              </span>
            </div>
          </div>

          {nextRivalAbove && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-[11px] font-bold">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
                <span>
                  الهدف القادم: تخطي «{nextRivalAbove.studioName}» (#
                  {nextRivalAbove.rank})
                </span>
              </span>
              <span className="text-amber-200 tabular-nums">
                فارق القيمة السوقية{' '}
                {formatMoney(
                  Math.max(0, nextRivalAbove.netWorth - playerEntry.netWorth)
                )}{' '}
                ج.م
              </span>
            </div>
          )}
        </div>
      )}

      {/* Top 3 Championship Podium Cards */}
      {topThree.length >= 3 && (
        <div className="grid grid-cols-3 gap-2.5 tabular-nums">
          {topThree.map((studio) => {
            const isFirst = studio.rank === 1;
            const isSecond = studio.rank === 2;
            return (
              <div
                key={studio.studioName}
                className={`relative flex flex-col justify-between rounded-2xl border-2 p-3 text-center transition ${
                  isFirst
                    ? 'border-amber-300 border-b-4 border-b-amber-400 bg-gradient-to-b from-amber-50 via-white to-amber-50/40 shadow-md'
                    : isSecond
                    ? 'border-slate-300 border-b-4 border-b-slate-400 bg-gradient-to-b from-slate-50 to-white'
                    : 'border-orange-200 border-b-4 border-b-orange-300 bg-gradient-to-b from-orange-50/60 to-white'
                }`}
              >
                <div>
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-2xs">
                    {isFirst ? (
                      <Crown className="h-5 w-5 text-amber-500" />
                    ) : (
                      <Medal
                        className={`h-4 w-4 ${
                          isSecond ? 'text-slate-500' : 'text-orange-500'
                        }`}
                      />
                    )}
                  </div>
                  <div
                    className={`mt-1 text-[10px] font-black ${
                      isFirst
                        ? 'text-amber-700'
                        : isSecond
                        ? 'text-slate-600'
                        : 'text-orange-700'
                    }`}
                  >
                    المركز #{studio.rank}
                  </div>
                  <div className="font-display mt-0.5 line-clamp-1 text-xs font-black text-slate-900">
                    {studio.studioName}
                  </div>
                  <div className="truncate text-[10px] font-bold text-slate-500">
                    {studio.ceoName}
                  </div>
                </div>

                <div className="mt-2 rounded-xl bg-violet-50 px-2 py-1 font-display text-xs font-black text-violet-700">
                  {formatMoney(studio.netWorth)} ج.م
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Strictly-Sorted Studio League Table (Ranked by Market Valuation) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border-2 border-indigo-100 bg-white p-5 shadow-xs"
      >
        <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-display text-sm font-black text-slate-900">
              جدول الترتيب الرسمي لشركات الإنتاج
            </h3>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-black text-violet-700">
            مرتب حسب القيمة السوقية
          </span>
        </div>

        <div className="mt-3 space-y-2 tabular-nums">
          {entries.map((row) => {
            const isEmerging = emergingCompetitors.some(
              (em) => em.name === row.studioName
            );
            const deltaObj = competitorNetWorthDelta[row.studioName];
            const netDelta = deltaObj?.netWorthDelta || 0;

            return (
              <div
                key={row.studioName}
                className={`flex items-center justify-between gap-2 rounded-2xl border-2 p-3 text-xs transition ${
                  row.isPlayer
                    ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50/90 font-black text-slate-900 shadow-xs'
                    : 'border-indigo-50 bg-[#F8FAFF] text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black ${
                      row.rank === 1
                        ? 'bg-amber-500 text-white'
                        : row.rank === 2
                        ? 'bg-slate-600 text-white'
                        : row.rank === 3
                        ? 'bg-orange-500 text-white'
                        : row.isPlayer
                        ? 'bg-violet-600 text-white'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    #{row.rank}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate font-black text-slate-900">
                      <span className="truncate">{row.studioName}</span>
                      {row.isPlayer && (
                        <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[9px] text-white">
                          شركتك
                        </span>
                      )}
                      {isEmerging && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-cyan-600 px-1.5 py-0.5 text-[9px] text-white">
                          <Sparkles className="h-2.5 w-2.5" /> صاعدة
                        </span>
                      )}
                      {!row.isPlayer && netDelta !== 0 && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                            netDelta > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {netDelta > 0 ? '▲ صعود' : '▼ تراجع'}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
                      <span>{row.ceoName}</span>
                      <span className="inline-flex items-center gap-0.5 text-indigo-600">
                        <Film className="h-3 w-3" /> {row.releasesCount} عمل
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-amber-600">
                        <Award className="h-3 w-3" /> {row.awardsCount} جائزة
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-left">
                  <div className="font-display text-sm font-black text-violet-700">
                    {formatMoney(row.netWorth)} ج.م
                  </div>
                  <div className="text-[9px] font-bold text-slate-400">
                    القيمة السوقية
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Clean Studio Account Sync Card */}
      <div className="rounded-3xl border-2 border-indigo-100 bg-white p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-violet-600" />
          <h3 className="text-sm font-black text-slate-900">
            ربط حساب الاستوديو وحفظ الترتيب السحابي (Supabase)
          </h3>
        </div>

        <form
          onSubmit={handleCloudSyncLogin}
          className="mt-3 flex flex-col gap-2.5 sm:flex-row"
        >
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="البريد الإلكتروني لحفظ تقدم شركتك..."
            aria-label="البريد الإلكتروني لحفظ التقدم"
            className="flex-1 rounded-xl border-2 border-indigo-100 bg-[#F5F7FF] px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            className="min-h-[42px] rounded-xl border-b-4 border-indigo-950/30 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-black text-white whitespace-nowrap shrink-0"
          >
            <UserCheck className="ml-1 inline h-4 w-4" />
            حفظ الحساب
          </button>
        </form>

        {authStatus && (
          <p className="mt-2.5 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700">
            {authStatus}
          </p>
        )}
      </div>
    </div>
  );
}
