'use client';

import React from 'react';
import { useGameStore } from '@/lib/store';
import { formatMoney, MARKET_CONFIGS, MarketRegion } from '@/lib/game-engine';
import { AnimatedCinemaPremiereGraphic } from './CinematicGraphicsScene';
import {
  TrendingUp,
  Award,
  Globe2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { playAwardFanfareSound, playClickSound } from '@/lib/game-audio';

export default function Stage5ReleaseSimulation() {
  const {
    lastReleasedProject,
    releasedProjects,
    setActiveScreen,
    triggerElectronicTrollsCampaign,
  } = useGameStore();

  const latestProject = lastReleasedProject || releasedProjects[0];

  if (!latestProject) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <p className="text-xs text-slate-400">لا يوجد عمل جاهز للعرض حالياً.</p>
      </div>
    );
  }

  const maxSteps =
    latestProject.format === 'series' ? latestProject.episodes || 15 : 10;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-12 gap-3 items-stretch">
        {/* Right 5 Columns: 3D Cinema Premiere Auditorium */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between space-y-2">
          <AnimatedCinemaPremiereGraphic
            title={latestProject.title}
            isSeries={latestProject.format === 'series'}
            currentStep={latestProject.daysTracked || maxSteps}
            maxSteps={maxSteps}
            liveRevenueFormatted={formatMoney(latestProject.totalGrossRevenue)}
            rank={latestProject.boxOfficeRank}
            criticScore={latestProject.criticScore}
          />

          {/* 4 Compact Score & Profit Tiles */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
              <span className="block text-[8px] text-slate-400">النقاد</span>
              <span className="font-mono text-xs font-black text-amber-300">
                {latestProject.criticScore}/10
              </span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
              <span className="block text-[8px] text-slate-400">الجمهور</span>
              <span className="font-mono text-xs font-black text-purple-300">
                ★{latestProject.audienceScore}
              </span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
              <span className="block text-[8px] text-slate-400">الإيراد الكلي</span>
              <span className="font-mono text-[11px] font-black text-emerald-300">
                {formatMoney(latestProject.totalGrossRevenue)}
              </span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
              <span className="block text-[8px] text-slate-400">صافي الربح</span>
              <span
                className={`font-mono text-[11px] font-black ${
                  latestProject.netProfit >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {formatMoney(latestProject.netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Left 7 Columns: Revenue Breakdown, Rivals & Critic Reviews */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-900/80 p-2.5 space-y-2">
          {/* Box Office vs Streaming + Boost Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
            <div className="flex items-center gap-3 text-[10px]">
              <div>
                <span className="text-slate-400 block text-[9px]">
                  شباك التذاكر
                </span>
                <span className="font-mono font-black text-amber-300">
                  {formatMoney(latestProject.boxOfficeRevenue)}
                </span>
              </div>
              <div className="h-5 w-px bg-slate-800" />
              <div>
                <span className="text-slate-400 block text-[9px]">
                  عوائد المنصات
                </span>
                <span className="font-mono font-black text-emerald-300">
                  {formatMoney(latestProject.streamingRevenue)}
                </span>
              </div>
              <div className="h-5 w-px bg-slate-800" />
              <div>
                <span className="text-slate-400 block text-[9px]">
                  ترتيب الموسم
                </span>
                <span className="font-mono font-black text-white">
                  المركز #{latestProject.boxOfficeRank}
                </span>
              </div>
            </div>

            {!latestProject.trollsCampaigned && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  triggerElectronicTrollsCampaign(latestProject.id);
                }}
                className="flex min-h-[28px] items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/15 px-2.5 py-1 text-[10px] font-black text-purple-300 hover:bg-purple-500/25 active:scale-95"
              >
                <Sparkles className="h-3 w-3" />
                <span>دفعة ترويج رقمي (+15% إيراد)</span>
              </button>
            )}
          </div>

          {/* Regional Breakdown Horizontal Strip */}
          {latestProject.marketRevenueBreakdown && (
            <div>
              <span className="flex items-center gap-1 text-[10px] font-black text-slate-300 mb-1">
                <Globe2 className="h-3 w-3 text-amber-400" />
                <span>توزيع الإيرادات حسب الأسواق المفتوحة</span>
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {(Object.keys(latestProject.marketRevenueBreakdown) as MarketRegion[])
                  .filter(
                    (mId) =>
                      (latestProject.marketRevenueBreakdown?.[mId] || 0) > 0
                  )
                  .map((mId) => {
                    const cfg = MARKET_CONFIGS.find((c) => c.id === mId);
                    const rev =
                      latestProject.marketRevenueBreakdown?.[mId] || 0;
                    return (
                      <div
                        key={mId}
                        className="shrink-0 rounded-lg border border-slate-800 bg-slate-950/85 px-2.5 py-1 text-[10px]"
                      >
                        <span className="block font-bold text-white">
                          {cfg?.name || mId}
                        </span>
                        <span className="font-mono text-[9px] font-black text-emerald-300">
                          {formatMoney(rev)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Rival Releases in the Same Window */}
          <div>
            <span className="flex items-center gap-1 text-[10px] font-black text-slate-300 mb-1">
              <TrendingUp className="h-3 w-3 text-amber-400" />
              <span>أعمال الشركات المنافسة في نفس الموسم</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {latestProject.rivalReleases.slice(0, 2).map((riv) => (
                <div
                  key={riv.id}
                  className="rounded-lg border border-slate-800/80 bg-slate-950/75 px-2.5 py-1.5 text-[10px]"
                >
                  <div className="flex items-center justify-between font-black text-white">
                    <span className="truncate">«{riv.title}»</span>
                    <span className="font-mono text-emerald-300 shrink-0">
                      {riv.status === 'delayed'
                        ? 'مؤجل'
                        : formatMoney(riv.boxOfficeRevenue)}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 truncate">
                    {riv.studioName} • بطولة: {riv.leadStarName}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Critic Review Snippets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {latestProject.reviews.slice(0, 2).map((rev, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-800/80 bg-slate-950/75 px-2.5 py-1.5 text-[10px]"
              >
                <div className="flex items-center justify-between text-amber-300 font-black">
                  <span className="truncate">{rev.publication}</span>
                  <span>★ {rev.score}/10</span>
                </div>
                <p className="mt-0.5 text-slate-300 truncate">{rev.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA to Festivals & Annual Awards */}
      <div className="flex items-center justify-end border-t border-slate-800/80 pt-2">
        <button
          type="button"
          onClick={() => {
            playAwardFanfareSound();
            setActiveScreen('FESTIVALS_AWARDS');
          }}
          className="flex min-h-[32px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1 text-xs font-black text-slate-950 shadow-sm hover:brightness-110 active:scale-95"
        >
          <Award className="h-3.5 w-3.5" />
          <span>الانتقال للسجادة الحمراء والمهرجانات</span>
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
