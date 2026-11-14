'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useGameStore, AutomaticFestivalCeremonyItem } from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import {
  Trophy,
  CheckCircle2,
  PlusCircle,
  MessageSquareQuote,
  Award,
} from 'lucide-react';

export function Stage6FestivalsAwards() {
  const {
    studioName,
    currentYear,
    draft,
    lastReleasedProject,
    customDbPatch,
    recordFestivalAwards,
    pushFestivalCeremonyModal,
    resetDraftForNewProject,
  } = useGameStore();

  const db = getResolvedDatabase(customDbPatch);
  const proj = lastReleasedProject;
  const [activeFestIdx, setActiveFestIdx] = useState(0);

  // Build all festival ceremonies automatically for the season
  const ceremonies: AutomaticFestivalCeremonyItem[] = React.useMemo(() => {
    if (!proj) return [];
    const rival1 =
      proj.rivalReleases.find((r) => r.status !== 'delayed') ||
      proj.rivalReleases[0];
    const rivalTitle = rival1?.title || 'ملوك الساحة';
    const rivalStudio = rival1?.studioName || 'المتحدة للإنتاج السينمائي';
    const rivalStar = rival1?.leadStarName || 'كريم عبد العزيز';
    const score = proj.criticScore;

    return db.festivals.slice(0, 3).map((fest, fIdx) => {
      const thresholdOffset = fIdx * 0.25;
      const winBestWork = score >= 7.5 + thresholdOffset;
      const winDirector = score >= 7.3 + thresholdOffset;
      const winActor = score >= 7.1 + thresholdOffset;
      const winScript =
        proj.synopsis.length >= 25 && score >= 7.0 + thresholdOffset;

      const awards = [
        {
          category:
            proj.format === 'film'
              ? 'جائزة أفضل فيلم سينمائي للعام'
              : 'جائزة أفضل مسلسل درامي للعام',
          nominees: [proj.title, rivalTitle],
          winner: winBestWork ? proj.title : rivalTitle,
          winningProjectTitle: winBestWork ? proj.title : rivalTitle,
          winningStudioName: winBestWork ? studioName : rivalStudio,
          isPlayerWinner: winBestWork,
        },
        {
          category: 'جائزة أفضل إخراج',
          nominees: [proj.directorName, 'مروان حامد'],
          winner: winDirector ? proj.directorName : 'مروان حامد',
          winningProjectTitle: winDirector ? proj.title : rivalTitle,
          winningStudioName: winDirector ? studioName : rivalStudio,
          isPlayerWinner: winDirector,
        },
        {
          category: 'جائزة أفضل تمثيل (دور أول)',
          nominees: [proj.leadNames[0] || 'بطل العمل', rivalStar],
          winner: winActor ? proj.leadNames[0] || 'بطل العمل' : rivalStar,
          winningProjectTitle: winActor ? proj.title : rivalTitle,
          winningStudioName: winActor ? studioName : rivalStudio,
          isPlayerWinner: winActor,
        },
        {
          category: 'جائزة أفضل سيناريو وحبكة درامية',
          nominees: [`سيناريو «${proj.title}»`, `سيناريو «${rivalTitle}»`],
          winner: winScript
            ? `سيناريو «${proj.title}»`
            : `سيناريو «${rivalTitle}»`,
          winningProjectTitle: winScript ? proj.title : rivalTitle,
          winningStudioName: winScript ? studioName : rivalStudio,
          isPlayerWinner: winScript,
        },
      ];

      return {
        id: `fest_view_${fest.id}_${proj.id}`,
        festivalId: fest.id,
        festivalName: fest.name,
        prestige: fest.prestige,
        year: currentYear,
        playerProjectTitle: proj.title,
        juryStatement:
          winBestWork || winActor
            ? `أشادت لجنة تحكيم ${fest.name} بالمعالجة الدرامية المتقنة في «${proj.title}» من إنتاج «${studioName}»، مؤكدة أن تكامل الرؤية الإخراجية لـ ${proj.directorName} مع حضور ${proj.leadNames[0] || 'بطل العمل'} صنع تجربة استثنائية هذا الموسم.`
            : `ثمنت لجنة تحكيم ${fest.name} المستوى الفني المتميز لأعمال الموسم، وذهبت الجوائز الكبرى للأعمال الأعلى تقييماً نقدياً وسط منافسة قوية.`,
        festivalBuzz: `حفاوة كبيرة بصناع الأعمال الفائزة على السجادة الحمراء في ${fest.name}!`,
        awards,
        playerWonCount: awards.filter((a) => a.isPlayerWinner).length,
      };
    });
  }, [proj, db.festivals, currentYear, studioName]);

  // Automatically record & trigger sudden sequential festival popups if not yet recorded
  useEffect(() => {
    if (!proj || ceremonies.length === 0) return;
    if (proj.awardsWon.length === 0) {
      ceremonies.forEach((c) => {
        const wonLabels = c.awards
          .filter((cat) => cat.isPlayerWinner)
          .map((cat) => cat.category);
        if (wonLabels.length > 0) {
          recordFestivalAwards(c.festivalName, wonLabels, draft.leadActorIds);
        }
        pushFestivalCeremonyModal(c);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proj?.id]);

  const currentCeremony = ceremonies[activeFestIdx] || ceremonies[0];

  return (
    <div className="mx-auto max-w-xl space-y-4 py-2">
      {/* Header */}
      <div className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/80 bg-white p-4 shadow-[0_12px_30px_-10px_rgba(99,102,241,0.14)]">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
              <Trophy className="h-3.5 w-3.5 text-amber-600" />
              النتائج الرسمية لمهرجانات وجوائز عام {currentYear}
            </span>
            <h2 className="font-display mt-1 text-lg font-black text-slate-900">
              سجل الفائزين في مهرجانات الموسم
            </h2>
          </div>
          {proj && (
            <span className="rounded-2xl bg-violet-600 px-3 py-1.5 text-xs font-black text-white tabular-nums">
              {proj.awardsWon.length} جائزة للاستوديو
            </span>
          )}
        </div>

        {/* Festival Switcher Tabs */}
        {ceremonies.length > 1 && (
          <div className="mt-3.5 grid grid-cols-3 gap-2">
            {ceremonies.map((fest, idx) => {
              const active = idx === activeFestIdx;
              const wonCount = fest.awards.filter(
                (c) => c.isPlayerWinner
              ).length;
              return (
                <button
                  key={fest.id}
                  type="button"
                  onClick={() => setActiveFestIdx(idx)}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 p-2 text-center transition ${
                    active
                      ? 'border-amber-500 border-b-4 border-b-amber-700 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                      : 'border-indigo-100 bg-[#F8FAFF] text-slate-800 hover:border-amber-300'
                  }`}
                >
                  <span className="line-clamp-1 text-[11px] font-black">
                    {fest.festivalName}
                  </span>
                  <span
                    className={`mt-0.5 text-[9px] font-bold ${
                      active ? 'text-amber-100' : 'text-emerald-700'
                    }`}
                  >
                    {wonCount > 0 ? `فزت بـ ${wonCount} جوائز` : 'منافسة الموسم'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {currentCeremony && (
        <motion.div
          key={currentCeremony.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.15)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-black text-slate-900">
                  {currentCeremony.festivalName}
                </h3>
                <p className="text-[11px] font-bold text-slate-500">
                  المكانة الدولية للمهرجان: {currentCeremony.prestige}%
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-4 text-xs">
            <div className="flex items-center justify-between border-b border-violet-100 pb-2">
              <span className="flex items-center gap-1.5 font-black text-violet-800">
                <MessageSquareQuote className="h-4 w-4 text-violet-600" />
                <span>البيان الرسمي للجنة التحكيم</span>
              </span>
            </div>
            <p className="mt-2 font-bold leading-relaxed text-slate-800">
              &ldquo;{currentCeremony.juryStatement}&rdquo;
            </p>
          </div>

          <div className="space-y-2.5">
            {currentCeremony.awards.map((res, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`rounded-2xl border-2 p-3.5 ${
                  res.isPlayerWinner
                    ? 'border-emerald-300 border-b-4 border-b-emerald-400 bg-emerald-50/80'
                    : 'border-indigo-100 bg-[#F8FAFF]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-violet-700">
                    {res.category}
                  </span>
                  {res.isPlayerWinner ? (
                    <span className="flex items-center gap-1 font-black text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      جائزة لشركتك!
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">
                      شركة منافسة
                    </span>
                  )}
                </div>
                <div className="font-display mt-1 text-sm font-black text-slate-900">
                  الفائز: {res.winner}
                </div>
                <div className="mt-0.5 text-[11px] font-bold text-slate-500">
                  العمل: «{res.winningProjectTitle}» · إنتاج: {res.winningStudioName}
                </div>
              </motion.div>
            ))}
          </div>

          <button
            type="button"
            onClick={resetDraftForNewProject}
            className="mt-4 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-900/40 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-500/25 transition active:border-b-0 active:translate-y-1"
          >
            <PlusCircle className="h-5 w-5" />
            <span>بدء مشروع سينمائي أو درامي جديد والعودة للمقر</span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
