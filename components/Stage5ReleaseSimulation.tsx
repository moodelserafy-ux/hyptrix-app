'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { formatMoney, MARKET_CONFIGS, MarketRegion } from '@/lib/game-engine';
import { AnimatedCinemaPremiereGraphic } from './CinematicGraphicsScene';
import {
  TrendingUp,
  Award,
  Globe2,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Newspaper,
  Play,
  Loader2,
  Clapperboard,
} from 'lucide-react';
import {
  playAwardFanfareSound,
  playClickSound,
  playTabSwitchSound,
} from '@/lib/game-audio';

export default function Stage5ReleaseSimulation() {
  const {
    lastReleasedProject,
    releasedProjects,
    groqApiKeyClient,
    preferredGroqModel,
    setActiveScreen,
    advanceReleaseTrackingDay,
    triggerElectronicTrollsCampaign,
    resetDraftForNewProject,
  } = useGameStore();

  const [detailTab, setDetailTab] = useState<'boxoffice' | 'critics'>('boxoffice');
  const [loadingStepAi, setLoadingStepAi] = useState(false);

  const latestProject = lastReleasedProject || releasedProjects[0];

  if (!latestProject) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <p className="text-xs text-slate-400">لا يوجد عمل جاهز للعرض حالياً.</p>
      </div>
    );
  }

  const isSeries = latestProject.format === 'series';
  const maxSteps = isSeries ? latestProject.episodes || 15 : 10;
  const currentTracked = latestProject.daysTracked || 1;
  const progressRatio = Math.min(1, currentTracked / Math.max(1, maxSteps));
  const displayedGross = Math.round(
    latestProject.firstWeekRevenue +
      (latestProject.totalGrossRevenue - latestProject.firstWeekRevenue) *
        progressRatio
  );

  const handleAdvanceStepWithAi = async () => {
    if (loadingStepAi || currentTracked >= maxSteps) return;
    playClickSound();
    setLoadingStepAi(true);
    const nextStepNum = currentTracked + 1;
    try {
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isSeries ? 'evaluate_series_episode' : 'generate_daily_news',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            phase: 'box_office',
            day: nextStepNum,
            episodeNumber: nextStepNum,
            totalEpisodes: maxSteps,
            projectTitle: latestProject.title,
            synopsis: latestProject.synopsis,
            leadName: latestProject.leadNames[0] || 'بطل العمل',
            antagonistName: latestProject.antagonistName || 'الخصم الدرامي',
            directorName: latestProject.directorName,
            rivalTitle:
              latestProject.rivalReleases[0]?.title || 'العمل المنافس',
            currentRevenueMillions: (displayedGross / 1_000_000).toFixed(1),
          },
        }),
      });
      const data = await res.json();
      advanceReleaseTrackingDay(
        data && data.headline
          ? {
              id: `step_news_${Date.now()}`,
              day: nextStepNum,
              headline: data.headline,
              detail: data.detail || '',
              impactType: data.impact_type || 'positive',
              hypeDelta: Number(data.hype_delta || 4),
              source: data.source || 'مرصد شباك التذاكر',
            }
          : undefined
      );
    } catch {
      advanceReleaseTrackingDay();
    } finally {
      setLoadingStepAi(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-12 gap-3 items-stretch">
        {/* Right 5 Columns: 3D Cinema Premiere Auditorium + Live Day/Episode Tracker */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between space-y-2">
          <AnimatedCinemaPremiereGraphic
            title={latestProject.title}
            isSeries={isSeries}
            currentStep={currentTracked}
            maxSteps={maxSteps}
            liveRevenueFormatted={formatMoney(displayedGross)}
            rank={latestProject.boxOfficeRank}
            criticScore={latestProject.criticScore}
          />

          {/* Live Step Progression Bar */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-slate-900/85 px-2.5 py-1.5">
            <div className="text-[10px]">
              <span className="font-black text-white">
                {isSeries
                  ? `عرض الحلقة ${currentTracked} من ${maxSteps}`
                  : `أسبوع/يوم العرض ${currentTracked} من ${maxSteps}`}
              </span>
              <span className="block text-[9px] text-amber-300 font-bold">
                {latestProject.viralTrendLabel}
              </span>
            </div>

            {currentTracked < maxSteps ? (
              <button
                type="button"
                disabled={loadingStepAi}
                onClick={handleAdvanceStepWithAi}
                className="flex min-h-[28px] items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-2.5 py-1 text-[10px] font-black text-slate-950 shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
              >
                {loadingStepAi ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                <span>
                  {isSeries ? 'عرض الحلقة التالية' : 'اليوم التالي بالذكاء الاصطناعي'}
                </span>
              </button>
            ) : (
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-300 shrink-0">
                اكتمل الموسم ✓
              </span>
            )}
          </div>

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

        {/* Left 7 Columns: Sub-Tabbed Revenue/Rivals vs AI Critics/Social/Daily News */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-900/80 p-2.5 space-y-2">
          {/* Sub-Tab Switcher */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  playTabSwitchSound();
                  setDetailTab('boxoffice');
                }}
                className={`flex min-h-[26px] items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-black transition-all ${
                  detailTab === 'boxoffice'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                <span>شباك التذاكر والأسواق والمنافسون</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTabSwitchSound();
                  setDetailTab('critics');
                }}
                className={`flex min-h-[26px] items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-black transition-all ${
                  detailTab === 'critics'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="h-3 w-3" />
                <span>النقاد والسوشيال ميديا وتقارير AI</span>
              </button>
            </div>

            {!latestProject.trollsCampaigned && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  triggerElectronicTrollsCampaign(latestProject.id);
                }}
                className="flex min-h-[26px] items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[9px] font-black text-purple-300 hover:bg-purple-500/25 active:scale-95"
              >
                <Sparkles className="h-3 w-3" />
                <span>دفعة ترويج رقمي (+15%)</span>
              </button>
            )}
          </div>

          {detailTab === 'boxoffice' ? (
            <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-hide">
              {/* Box Office vs Streaming Summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-[10px]">
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
                    عوائد المنصات والقنوات
                  </span>
                  <span className="font-mono font-black text-emerald-300">
                    {formatMoney(latestProject.streamingRevenue)}
                  </span>
                </div>
                <div className="h-5 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 block text-[9px]">
                    التكلفة الكلية
                  </span>
                  <span className="font-mono font-black text-slate-200">
                    {formatMoney(latestProject.totalBudget)}
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

              {/* Regional Breakdown Horizontal Strip */}
              {latestProject.marketRevenueBreakdown && (
                <div>
                  <span className="flex items-center gap-1 text-[10px] font-black text-slate-300 mb-1">
                    <Globe2 className="h-3 w-3 text-amber-400" />
                    <span>توزيع الإيرادات حسب الأسواق المفتوحة</span>
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                    {(
                      Object.keys(
                        latestProject.marketRevenueBreakdown
                      ) as MarketRegion[]
                    )
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
                  {latestProject.rivalReleases.map((riv, idx) => (
                    <div
                      key={riv.id || idx}
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
                        {riv.studioName} • بطولة: {riv.leadStarName} • ★
                        {riv.criticScore}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-hide">
              {/* Live Daily / Episode AI News Feed */}
              {latestProject.dailyNews && latestProject.dailyNews.length > 0 && (
                <div className="space-y-1">
                  <span className="flex items-center gap-1 text-[10px] font-black text-amber-300">
                    <Newspaper className="h-3 w-3" />
                    <span>تقارير المتابعة اليومية بالذكاء الاصطناعي</span>
                  </span>
                  {latestProject.dailyNews.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px]"
                    >
                      <p className="font-black text-white">{item.headline}</p>
                      <p className="text-[9px] text-slate-300 mt-0.5">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Critic Reviews */}
              <div className="grid grid-cols-1 gap-1.5">
                {latestProject.reviews.map((rev, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-800/80 bg-slate-950/75 px-2.5 py-1.5 text-[10px]"
                  >
                    <div className="flex items-center justify-between text-amber-300 font-black">
                      <span>
                        {rev.criticName} — {rev.publication}
                      </span>
                      <span>★ {rev.score}/10</span>
                    </div>
                    <p className="mt-0.5 text-slate-300 leading-relaxed">
                      {rev.quote}
                    </p>
                  </div>
                ))}
              </div>

              {/* Social Media Posts */}
              {latestProject.socialPosts &&
                latestProject.socialPosts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {latestProject.socialPosts.map((post, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-800 bg-slate-950/80 p-2 text-[9px]"
                      >
                        <div className="flex justify-between font-bold text-amber-300">
                          <span>
                            {post.handle} ({post.platform})
                          </span>
                          <span>❤️ {post.likes}</span>
                        </div>
                        <p className="mt-0.5 text-slate-300">{post.content}</p>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Footer CTAs: Produce Another Project in the Same Year OR Go to Festivals */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            resetDraftForNewProject('PROJECT_SETUP');
          }}
          className="flex min-h-[32px] items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-[10px] font-black text-amber-300 hover:bg-amber-500/20 active:scale-95"
        >
          <Clapperboard className="h-3.5 w-3.5" />
          <span>إنتاج فيلم أو مسلسل آخر في نفس العام</span>
        </button>

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
