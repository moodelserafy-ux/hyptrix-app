'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  ReleasedProjectRecord,
  CriticReviewItem,
  SocialPostItem,
  DailyAiNewsItem,
  formatGameDate,
  getLiveActorsWithEvolution,
} from '@/lib/store';
import { getResolvedDatabase, GENRES } from '@/lib/db-resolver';
import {
  calculateFinancialsAndQuality,
  generateRivalReleases,
  calculateNegotiatedSalary,
  formatMoney,
  RivalRelease,
} from '@/lib/game-engine';
import { ViralShareCard } from './ViralShareCard';
import {
  Trophy,
  Newspaper,
  MessageSquare,
  Award,
  Sparkles,
  Flame,
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  TrendingUp,
  Radio,
  Tv,
  Calendar,
  Clock,
} from 'lucide-react';

// Realistic 10-step cumulative box-office / broadcast curve
const DAY_REVENUE_CURVE = [
  0.14, 0.28, 0.42, 0.55, 0.67, 0.77, 0.85, 0.91, 0.96, 1.0,
];

function getCumulativeFraction(step: number, maxSteps = 10): number {
  if (maxSteps <= 1) return 1;
  if (maxSteps === 10) {
    const idx = Math.max(0, Math.min(9, step - 1));
    return DAY_REVENUE_CURVE[idx];
  }
  const progress = Math.max(0, Math.min(1, step / maxSteps));
  return Number(Math.pow(progress, 0.85).toFixed(3));
}

export function Stage5ReleaseSimulation() {
  const {
    studioName,
    ceoName,
    logo,
    founderPerk,
    currentRegion,
    currentYear,
    gameDay,
    draft,
    worldHistory,
    customDbPatch,
    emergingCompetitors,
    groqApiKeyClient,
    preferredGroqModel,
    lastReleasedProject,
    completeProjectRelease,
    advanceReleaseTrackingDay,
    setActiveScreen,
  } = useGameStore();

  const db = getResolvedDatabase(customDbPatch);
  const [evaluating, setEvaluating] = useState(false);
  const [loadingDailyNews, setLoadingDailyNews] = useState(false);
  const [subStep, setSubStep] = useState<1 | 2 | 3>(1);
  const [maxUnlocked, setMaxUnlocked] = useState<1 | 2 | 3>(1);
  const prevGameDayRef = useRef<number>(gameDay);

  const unlockNext = (next: 1 | 2 | 3) => {
    if (next > maxUnlocked) setMaxUnlocked(next);
    setSubStep(next);
  };

  const fetchReleaseOrEpisodeEvent = useCallback(
    async (
      proj: ReleasedProjectRecord,
      nextStepTracked: number,
      maxSteps: number,
      currentGrossSoFar: number
    ): Promise<DailyAiNewsItem> => {
      const topRival = proj.rivalReleases.find((r) => r.status !== 'delayed');
      const genreAr =
        GENRES.find((g) => g.id === proj.primaryGenre)?.name ||
        proj.primaryGenre;
      const isSeries = proj.format === 'series';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 14000);
        const res = await fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            mode: isSeries ? 'evaluate_series_episode' : 'generate_daily_news',
            groqKeyOverride: groqApiKeyClient,
            preferredModel: preferredGroqModel,
            payload: {
              phase: isSeries ? 'series_episode' : 'release',
              episodeNumber: nextStepTracked,
              totalEpisodes: maxSteps,
              gameDay: nextStepTracked,
              day: nextStepTracked,
              projectTitle: proj.title,
              title: proj.title,
              synopsis: proj.synopsis,
              leadName: proj.leadNames[0] || 'بطل العمل',
              antagonistName: proj.antagonistName || 'الخصم الدرامي',
              directorName: proj.directorName,
              primaryGenre: genreAr,
              currentHype: 82,
              currentRevenueMillions: (currentGrossSoFar / 1_000_000).toFixed(1),
              rivalTitle: topRival?.title || 'العمل المنافس',
              rivalStudio: topRival?.studioName || 'استوديو منافس',
              criticScore: proj.criticScore,
            },
          }),
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        return {
          id: `rel_event_${nextStepTracked}_${proj.id}`,
          day: nextStepTracked,
          headline:
            data.headline ||
            (isSeries
              ? `الحلقة ${nextStepTracked} من «${proj.title}»: تصاعد مثير في الأحداث وتفاعل واسع!`
              : `اليوم ${nextStepTracked}: استمرار المنافسة في شباك التذاكر لفيلم «${proj.title}»`),
          detail:
            data.detail ||
            (isSeries
              ? `حصدت الحلقة ${nextStepTracked} نسب مشاهدة مرتفعة على المنصات والقنوات ليرتفع العائد الإجمالي إلى ${formatMoney(currentGrossSoFar)} ج.م.`
              : `وصلت إيرادات الفيلم حتى الآن إلى ${formatMoney(currentGrossSoFar)} ج.م وسط إقبال جماهيري مستمر في القاعات.`),
          impactType: data.impact_type || 'positive',
          hypeDelta: Number(data.hype_delta || 4),
          source: data.source,
        };
      } catch {
        return {
          id: `rel_event_fallback_${nextStepTracked}`,
          day: nextStepTracked,
          headline: isSeries
            ? `الحلقة ${nextStepTracked}: تفاعل جماهيري ونقدي مع أحداث «${proj.title}»`
            : `اليوم ${nextStepTracked}: استمرار الإقبال على قاعات عرض «${proj.title}»`,
          detail: isSeries
            ? `شهدت الحلقة ${nextStepTracked} تطوراً محورياً في الصراع الدرامي ووصلت عوائد العرض والإعلانات إلى ${formatMoney(currentGrossSoFar)} ج.م.`
            : `وصلت الإيرادات التراكمية إلى ${formatMoney(currentGrossSoFar)} ج.م في منافسة قوية مع «${topRival?.title || 'أعمال الموسم'}».`,
          impactType: 'positive',
          hypeDelta: 3,
        };
      }
    },
    [groqApiKeyClient, preferredGroqModel]
  );

  const handleTrackNextStep = useCallback(async () => {
    if (!lastReleasedProject) return;
    const isSeries = lastReleasedProject.format === 'series';
    const maxSteps = isSeries ? lastReleasedProject.episodes || 15 : 10;
    const currentStep = lastReleasedProject.daysTracked || 1;
    if (currentStep >= maxSteps) return;

    const nextStep = currentStep + 1;
    setLoadingDailyNews(true);

    const currentGrossSoFar = Math.round(
      lastReleasedProject.totalGrossRevenue *
        getCumulativeFraction(nextStep, maxSteps)
    );

    const newsItem = await fetchReleaseOrEpisodeEvent(
      lastReleasedProject,
      nextStep,
      maxSteps,
      currentGrossSoFar
    );
    advanceReleaseTrackingDay(newsItem);
    setLoadingDailyNews(false);
  }, [
    lastReleasedProject,
    fetchReleaseOrEpisodeEvent,
    advanceReleaseTrackingDay,
  ]);

  // Automatically advance box-office or episode broadcast when the active-session game clock increments gameDay!
  useEffect(() => {
    if (gameDay > prevGameDayRef.current) {
      prevGameDayRef.current = gameDay;
      if (!lastReleasedProject || evaluating || loadingDailyNews) return;
      const isSeries = lastReleasedProject.format === 'series';
      const maxSteps = isSeries ? lastReleasedProject.episodes || 15 : 10;
      const currentStep = lastReleasedProject.daysTracked || 1;
      if (currentStep < maxSteps) {
        const timer = setTimeout(() => {
          void handleTrackNextStep();
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [
    gameDay,
    lastReleasedProject,
    evaluating,
    loadingDailyNews,
    handleTrackNextStep,
  ]);

  const runReleaseSimulation = useCallback(async () => {
    setEvaluating(true);

    const stateSnap = useGameStore.getState();
    const liveActors = getLiveActorsWithEvolution({
      baseActors: db.actors,
      aiGeneratedActors: stateSnap.aiGeneratedActors,
      actorDynamicState: stateSnap.actorDynamicState,
      currentYear,
      gameDay,
    });
    const allCompetitors = [...db.competitor_studios, ...emergingCompetitors];

    const director =
      db.crew.find((c) => c.id === draft.directorId) || db.crew[0];
    const writers = db.crew.filter((c) => draft.writerIds.includes(c.id));
    const dop = db.crew.find((c) => c.id === draft.dopId) || null;
    const composer = db.crew.find((c) => c.id === draft.composerId) || null;
    const vfx = db.crew.find((c) => c.id === draft.vfxId) || null;

    const leads = liveActors.filter((a) => draft.leadActorIds.includes(a.id));
    const finalLeads = leads.length > 0 ? leads : [liveActors[0] || db.actors[0]];
    const antagonist =
      liveActors.find((a) => a.id === draft.antagonistId) || null;
    const supporting = liveActors.filter((a) =>
      draft.supportingActorIds.includes(a.id)
    );
    const cameos = liveActors.filter((a) => draft.cameoActorIds.includes(a.id));

    const actorIdsInCast = Array.from(
      new Set([
        ...finalLeads.map((a) => a.id),
        ...(antagonist ? [antagonist.id] : []),
        ...supporting.map((a) => a.id),
      ])
    );

    const getNegCost = (id: string, base: number) => {
      const offer = draft.talentOffers[id];
      if (offer && offer.status === 'accepted') return offer.offeredSalary;
      const neg = draft.negotiatedDiscounts[id] || {
        backendPoints: 0,
        vipDinner: false,
      };
      return calculateNegotiatedSalary(
        base,
        neg.backendPoints,
        founderPerk,
        neg.vipDinner
      );
    };

    const talentPayroll =
      [
        director,
        ...(dop ? [dop] : []),
        ...(composer ? [composer] : []),
        ...(vfx ? [vfx] : []),
        ...finalLeads,
        ...(antagonist ? [antagonist] : []),
        ...supporting,
      ].reduce((sum, t) => sum + getNegCost(t.id, t.base_salary), 0) +
      cameos.reduce(
        (s, c) =>
          s +
          (draft.talentOffers[c.id]?.offeredSalary ??
            Math.round(c.base_salary * 0.22)),
        0
      );

    const prodSpend =
      draft.budgetAllocation.setsAndLocations +
      draft.budgetAllocation.costumesAndMakeup +
      draft.budgetAllocation.vfxAndStunts +
      draft.budgetAllocation.extrasAndCrowds;

    const totalBudget = talentPayroll + prodSpend + draft.marketingBudget;

    const scriptWordCount = draft.scriptSynopsis.trim()
      ? draft.scriptSynopsis.trim().split(/\s+/).length
      : 0;

    const prelim = calculateFinancialsAndQuality({
      format: draft.format,
      episodes: draft.episodes,
      seriesSeason: draft.seriesSeason,
      filmSeason: draft.filmSeason,
      primaryGenre: draft.primaryGenre,
      secondaryGenre: draft.secondaryGenre,
      ageRating: draft.ageRating,
      director,
      writers: writers.length > 0 ? writers : [db.crew[4]],
      dop,
      composer,
      vfx,
      leads: finalLeads,
      antagonist,
      supporting,
      cameos,
      budgetAllocation: draft.budgetAllocation,
      marketingBudget: draft.marketingBudget,
      screensCount: draft.screensCount,
      platformDealAmount: draft.platformDealAmount,
      founderPerk,
      hypeScore: draft.hypeScore,
      aiBoxOfficeMultiplier: 1.0,
      marketRegion: currentRegion,
      scriptWordCount,
    });

    const isSeries = draft.format === 'series';
    const maxSteps = isSeries ? draft.episodes || 15 : 10;

    const excludedActorIds = [
      ...finalLeads.map((a) => a.id),
      ...(antagonist ? [antagonist.id] : []),
    ];

    const fallbackRivals = generateRivalReleases(
      allCompetitors,
      liveActors,
      excludedActorIds,
      1.0,
      currentYear
    );

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          mode: 'evaluate_release',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            title: draft.title || 'الفرعون الأخير',
            synopsis: draft.scriptSynopsis,
            format: draft.format,
            episodes: draft.episodes,
            primaryGenre: draft.primaryGenre,
            secondaryGenre: draft.secondaryGenre,
            ageRating: draft.ageRating,
            directorName: director.name,
            leadName: finalLeads.map((l) => l.name).join(' و '),
            antagonistName: antagonist?.name || 'الخصم الدرامي',
            cameoNames: cameos.map((c) => c.name),
            technicalQuality: prelim.technicalQuality + draft.qualityModifier,
            competitorStudios: allCompetitors.slice(0, 5).map((s) => s.name),
            availableStars: liveActors
              .filter(
                (a) =>
                  !excludedActorIds.includes(a.id) &&
                  a.status !== 'retired' &&
                  a.status !== 'deceased'
              )
              .slice(0, 8)
              .map((a) => a.name),
            world_history: worldHistory.slice(0, 6),
          },
        }),
      });
      clearTimeout(timeoutId);

      const aiData = await res.json();

      const multiplier = Number(aiData.box_office_multiplier || 0.95);
      const finalNumbers = calculateFinancialsAndQuality({
        format: draft.format,
        episodes: draft.episodes,
        seriesSeason: draft.seriesSeason,
        filmSeason: draft.filmSeason,
        primaryGenre: draft.primaryGenre,
        secondaryGenre: draft.secondaryGenre,
        ageRating: draft.ageRating,
        director,
        writers: writers.length > 0 ? writers : [db.crew[4]],
        dop,
        composer,
        vfx,
        leads: finalLeads,
        antagonist,
        supporting,
        cameos,
        budgetAllocation: draft.budgetAllocation,
        marketingBudget: draft.marketingBudget,
        screensCount: draft.screensCount,
        platformDealAmount: draft.platformDealAmount,
        founderPerk,
        hypeScore: draft.hypeScore,
        aiBoxOfficeMultiplier: multiplier,
        marketRegion: currentRegion,
        scriptWordCount,
      });

      const rivals: RivalRelease[] =
        Array.isArray(aiData.rival_releases) && aiData.rival_releases.length >= 2
          ? (aiData.rival_releases as RivalRelease[])
          : fallbackRivals;

      const playerCompareRev = finalNumbers.totalGrossRevenue;
      const betterRivals = rivals.filter(
        (r) => r.status !== 'delayed' && r.boxOfficeRevenue > playerCompareRev
      ).length;
      const boxOfficeRank = betterRivals + 1;

      const seasonLabel =
        draft.format === 'film'
          ? draft.filmSeason === 'eid_adha'
            ? 'موسم عيد الأضحى'
            : draft.filmSeason === 'eid_fitr'
            ? 'موسم عيد الفطر'
            : draft.filmSeason === 'summer'
            ? 'موسم الصيف'
            : 'إجازة نصف العام'
          : draft.seriesSeason === 'ramadan'
          ? 'موسم دراما رمضان'
          : 'موسم المنصات الحصري';

      const step1Gross = Math.round(
        finalNumbers.totalGrossRevenue * getCumulativeFraction(1, maxSteps)
      );

      const record: ReleasedProjectRecord = {
        id: `proj_${Date.now()}`,
        title: draft.title || 'الفرعون الأخير',
        year: currentYear,
        format: draft.format,
        episodes: draft.episodes,
        seasonName: seasonLabel,
        primaryGenre: draft.primaryGenre,
        secondaryGenre: draft.secondaryGenre,
        ageRating: draft.ageRating,
        synopsis: draft.scriptSynopsis,
        directorId: director.id,
        directorName: director.name,
        leadNames: finalLeads.map((l) => l.name),
        antagonistName: antagonist?.name,
        cameoNames: cameos.map((c) => c.name),
        actorIdsInCast,
        castCustomRoles: draft.castCustomRoles,
        totalBudget,
        firstWeekRevenue: finalNumbers.firstWeekRevenue,
        boxOfficeRevenue: finalNumbers.totalBoxOfficeRevenue,
        streamingRevenue: finalNumbers.totalStreamingRevenue,
        totalGrossRevenue: finalNumbers.totalGrossRevenue,
        netProfit: finalNumbers.totalGrossRevenue - totalBudget,
        criticScore: Number(aiData.critic_score || 6.8),
        audienceScore: Number(aiData.audience_score || 7.2),
        boxOfficeRank,
        reviews: (aiData.reviews as CriticReviewItem[]) || [],
        socialPosts: (aiData.social_posts as SocialPostItem[]) || [],
        viralTrendLabel:
          aiData.viral_trend_label ||
          `#${(draft.title || 'الفرعون_الأخير').replace(/\s+/g, '_')} يتصدر النقاشات الفنية!`,
        rivalReleases: rivals,
        awardsWon: [],
        releaseDayStart: gameDay,
        daysTracked: 1,
        dailyNews: [
          {
            id: `open_step_1`,
            day: 1,
            headline: isSeries
              ? `الحلقة 1 من «${draft.title || 'الفرعون الأخير'}»: انطلاقة قوية على القنوات والمنصات بعائد أولي ${formatMoney(step1Gross)} ج.م!`
              : `اليوم الأول: انطلاق عرض «${draft.title || 'الفرعون الأخير'}» في السينمات بافتتاحية ${formatMoney(step1Gross)} ج.م!`,
            detail: isSeries
              ? `خطفت الحلقة الافتتاحية الأنظار بظهور ${finalLeads[0]?.name} وتأسيس الصراع الرئيسي في القصة، وسط ترقب الجمهور لموعد الحلقة الثانية.`
              : `توافد الجمهور على قاعات العرض في ليلة الافتتاح لمشاهدة «${draft.title || 'الفرعون الأخير'}» وسط منافسة قوية في نفس الموسم.`,
            impactType: 'positive',
            hypeDelta: 4,
          },
        ],
      };

      completeProjectRelease(record);
    } catch {
      const betterRivals = fallbackRivals.filter(
        (r) =>
          r.status !== 'delayed' &&
          r.boxOfficeRevenue > prelim.totalGrossRevenue
      ).length;
      const step1Gross = Math.round(
        prelim.totalGrossRevenue * getCumulativeFraction(1, maxSteps)
      );
      const groundedCritic = Number(
        Math.min(8.6, Math.max(4.5, (prelim.technicalQuality / 10) * 0.88)).toFixed(1)
      );

      completeProjectRelease({
        id: `proj_${Date.now()}`,
        title: draft.title || 'الفرعون الأخير',
        year: currentYear,
        format: draft.format,
        episodes: draft.episodes,
        seasonName: isSeries ? 'موسم دراما رمضان' : 'موسم عيد الأضحى',
        primaryGenre: draft.primaryGenre,
        secondaryGenre: draft.secondaryGenre,
        ageRating: draft.ageRating,
        synopsis: draft.scriptSynopsis,
        directorId: director.id,
        directorName: director.name,
        leadNames: finalLeads.map((l) => l.name),
        antagonistName: antagonist?.name,
        cameoNames: cameos.map((c) => c.name),
        actorIdsInCast,
        castCustomRoles: draft.castCustomRoles,
        totalBudget,
        firstWeekRevenue: prelim.firstWeekRevenue,
        boxOfficeRevenue: prelim.totalBoxOfficeRevenue,
        streamingRevenue: prelim.totalStreamingRevenue,
        totalGrossRevenue: prelim.totalGrossRevenue,
        netProfit: prelim.totalGrossRevenue - totalBudget,
        criticScore: groundedCritic,
        audienceScore: Number(Math.min(9.0, groundedCritic + 0.3).toFixed(1)),
        boxOfficeRank: betterRivals + 1,
        reviews: [
          {
            criticName: 'طارق الشناوي',
            publication: 'الشاشة الذهبية',
            sentiment: 'positive',
            quote: `معالجة «${draft.title || 'الفرعون الأخير'}» منحت ${finalLeads[0]?.name} مساحة تمثيلية صادقة، وإدارة المخرج ${director.name} لإيقاع المشاهد الافتتاحية كانت موفقة.`,
            score: Number(Math.min(9.1, groundedCritic + 0.8).toFixed(1)),
          },
          {
            criticName: 'ماجدة خير الله',
            publication: 'بوابة الفن السابع',
            sentiment: 'negative',
            quote: `كان يمكن تطوير خطوط الصراع الفرعية في «${draft.title || 'الفرعون الأخير'}» بشكل أعمق بدلاً من الاعتماد الكامل على كاريزما البطل في النصف الثاني.`,
            score: Number(Math.max(3.8, groundedCritic - 1.5).toFixed(1)),
          },
          {
            criticName: 'أندرو محسن',
            publication: 'سينما إنسايدر',
            sentiment: 'mixed',
            quote: `عمل متوازن فنياً وتجارياً؛ التصوير والموسيقى على مستوى متميز، وإن كانت النهاية تفتح باباً لنقاش طويل بين الجمهور.`,
            score: groundedCritic,
          },
        ],
        socialPosts: [
          {
            handle: '@CinemaMasr_Fan',
            platform: 'X',
            content: `توني مخلص مشاهدة «${draft.title || 'الفرعون الأخير'}».. أداء ${finalLeads[0]?.name} قوي جداً والقفلة الدرامية غير متوقعة 🔥🎬`,
            likes: '24.4K',
          },
        ],
        viralTrendLabel: `#${(draft.title || 'الفرعون_الأخير').replace(/\s+/g, '_')} يتصدر نقاشات الجمهور!`,
        rivalReleases: fallbackRivals,
        awardsWon: [],
        releaseDayStart: gameDay,
        daysTracked: 1,
        dailyNews: [
          {
            id: `open_step_1`,
            day: 1,
            headline: isSeries
              ? `الحلقة 1 من «${draft.title || 'الفرعون الأخير'}»: بداية قوية وتحقيق ${formatMoney(step1Gross)} ج.م من عقود البث والإعلانات!`
              : `اليوم الأول: افتتاحية «${draft.title || 'الفرعون الأخير'}» تحقق ${formatMoney(step1Gross)} ج.م!`,
            detail: isSeries
              ? `انطلق عرض الحلقة الأولى وسط إشادة بتتر البداية وأداء الأبطال.`
              : `انطلق عرض الفيلم في القاعات وسط منافسة قوية مع أفلام الشركات المنافسة.`,
            impactType: 'positive',
            hypeDelta: 4,
          },
        ],
      });
    } finally {
      setEvaluating(false);
    }
  }, [
    currentRegion,
    currentYear,
    gameDay,
    groqApiKeyClient,
    preferredGroqModel,
    db.actors,
    db.competitor_studios,
    db.crew,
    draft,
    emergingCompetitors,
    founderPerk,
    worldHistory,
    completeProjectRelease,
  ]);

  useEffect(() => {
    if (
      !lastReleasedProject ||
      lastReleasedProject.title !== (draft.title || 'الفرعون الأخير')
    ) {
      const timer = setTimeout(() => {
        void runReleaseSimulation();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [draft.title, lastReleasedProject, runReleaseSimulation]);

  if (evaluating || !lastReleasedProject) {
    return (
      <div className="mx-auto flex min-h-[340px] max-w-xl flex-col items-center justify-center rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white p-8 text-center shadow-lg">
        <Sparkles className="h-12 w-12 animate-spin text-violet-600" />
        <h3 className="font-display mt-4 text-xl font-black text-slate-900">
          {draft.format === 'series'
            ? 'جاري تجهيز بث الحلقة الأولى ورصد نسب المشاهدة...'
            : 'جاري فتح قاعات العرض ورصد إيرادات شباك التذاكر...'}
        </h3>
        <p className="mt-2 max-w-sm text-xs font-medium text-slate-500">
          يتم الآن إطلاق «{draft.title || 'الفرعون الأخير'}» وتجميع تقارير النقاد والجمهور ومنافسات الموسم.
        </p>
      </div>
    );
  }

  const proj = lastReleasedProject;
  const isSeries = proj.format === 'series';
  const maxSteps = isSeries ? proj.episodes || 15 : 10;
  const currentStep = Math.max(1, Math.min(maxSteps, proj.daysTracked || 1));

  const currentFraction = getCumulativeFraction(currentStep, maxSteps);
  const prevFraction =
    currentStep > 1 ? getCumulativeFraction(currentStep - 1, maxSteps) : 0;

  const livePlayerRevenue = Math.round(proj.totalGrossRevenue * currentFraction);
  const todayPlayerGain = Math.round(
    proj.totalGrossRevenue * (currentFraction - prevFraction)
  );
  const liveNetProfit = livePlayerRevenue - proj.totalBudget;

  const activeRivals = proj.rivalReleases.filter((r) => r.status !== 'delayed');
  const delayedRivals = proj.rivalReleases.filter((r) => r.status === 'delayed');

  // Calculate live standings for competing movies/series
  const standings = [
    {
      title: proj.title,
      studio: studioName,
      lead: proj.leadNames[0] || 'بطل العمل',
      critic: proj.criticScore,
      liveRevenue: livePlayerRevenue,
      todayGain: todayPlayerGain,
      totalTarget: proj.totalGrossRevenue,
      isPlayer: true,
    },
    ...activeRivals.map((r, i) => {
      const rivalCurveBoost = i % 2 === 0 ? 1.02 : 0.97;
      const rFrac = Math.min(1, currentFraction * rivalCurveBoost);
      const rPrevFrac = Math.min(1, prevFraction * rivalCurveBoost);
      return {
        title: r.title,
        studio: r.studioName,
        lead: r.leadStarName,
        critic: r.criticScore,
        liveRevenue: Math.round(r.boxOfficeRevenue * rFrac),
        todayGain: Math.round(
          r.boxOfficeRevenue * Math.max(0.03, rFrac - rPrevFrac)
        ),
        totalTarget: r.boxOfficeRevenue,
        isPlayer: false,
      };
    }),
  ].sort((a, b) => b.liveRevenue - a.liveRevenue);

  const livePlayerRank = standings.findIndex((s) => s.isPlayer) + 1;
  const maxStandingRevenue = Math.max(...standings.map((s) => s.liveRevenue), 1);
  const latestHeadline = proj.dailyNews?.[0] || null;

  const steps = [
    {
      id: 1 as const,
      label: isSeries ? 'متابعة عرض الحلقات' : 'تتبع شباك التذاكر',
    },
    { id: 2 as const, label: 'آراء النقاد والجمهور' },
    { id: 3 as const, label: 'الملصق والمهرجانات' },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-4 py-2">
      {/* Locked Step Header */}
      <div className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/80 bg-white p-4 shadow-[0_12px_30px_-10px_rgba(99,102,241,0.14)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-violet-700">
              {isSeries
                ? `المرحلة 4 من 5 · عرض الحلقة ${currentStep} من ${maxSteps}`
                : `المرحلة 4 من 5 · اليوم ${currentStep} من 10 في دور العرض`}
            </div>
            <h2 className="font-display mt-0.5 text-lg font-black text-slate-900">
              {isSeries
                ? `بث حلقات مسلسل «${proj.title}»`
                : `شباك تذاكر فيلم «${proj.title}»`}
            </h2>
          </div>

          <div className="rounded-2xl bg-violet-600 px-3 py-1.5 text-xs font-black text-white tabular-nums shadow-xs">
            المركز #{livePlayerRank} بالموسم
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {steps.map((s) => {
            const active = subStep === s.id;
            const unlocked = s.id <= maxUnlocked;
            const done = s.id < subStep;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && setSubStep(s.id)}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 py-2 px-2 text-xs font-black transition-all ${
                  active
                    ? 'border-violet-600 border-b-4 border-b-violet-800 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                    : done
                    ? 'border-emerald-200 border-b-4 border-b-emerald-300 bg-emerald-50 text-emerald-700'
                    : unlocked
                    ? 'border-indigo-100 bg-indigo-50/50 text-indigo-700'
                    : 'cursor-not-allowed border-slate-100 bg-slate-100/70 text-slate-400 opacity-75'
                }`}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 shrink-0 stroke-[3]" />
                ) : !unlocked ? (
                  <Lock className="h-3 w-3 shrink-0" />
                ) : (
                  <span className="text-[10px] tabular-nums">{s.id}</span>
                )}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Deck */}
      <AnimatePresence mode="wait">
        {subStep === 1 && (
          <motion.div
            key="rel-s1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4 rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-5 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.15)]"
          >
            {/* Live Box Office OR Series Episode Broadcast Tracker */}
            <div className="rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-indigo-50/60 to-cyan-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
                    {isSeries ? (
                      <Tv className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Radio className="h-4 w-4 animate-pulse" />
                    )}
                  </span>
                  <div>
                    <div className="font-display text-xs font-black text-violet-950">
                      {isSeries
                        ? `جدول بث الحلقات المباشر · الحلقة ${currentStep} من ${maxSteps}`
                        : `بث مباشر لشباك التذاكر · اليوم ${currentStep} من 10`}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600">
                      {isSeries
                        ? currentStep < maxSteps
                          ? `موعد عرض الحلقة ${currentStep + 1} تلقائياً: ${formatGameDate(
                              (proj.releaseDayStart || gameDay) + currentStep,
                              currentYear
                            )}`
                          : 'تم عرض الحلقة الأخيرة واكتمل الموسم الدرامي بنجاح!'
                        : currentStep < 10
                        ? 'يتقدم عرض الفيلم تلقائياً مع مرور الأيام في أعلى الشاشة'
                        : 'اكتمل عرض الفيلم في قاعات السينما واستقرت الإيرادات!'}
                    </div>
                  </div>
                </div>
                <span className="rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-black text-white tabular-nums shadow-xs">
                  +{formatMoney(todayPlayerGain)} ج.م{' '}
                  {isSeries ? `في الحلقة ${currentStep}` : 'اليوم'}
                </span>
              </div>

              {/* Episode Grid (for Series) OR 10-Day Timeline (for Films) */}
              {isSeries ? (
                <div className="mt-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black text-indigo-900">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-violet-600" />
                      <span>خريطة حلقات المسلسل ({maxSteps} حلقة):</span>
                    </span>
                    <span>
                      عُرضت {currentStep} حلقات · متبقي {maxSteps - currentStep}{' '}
                      حلقة
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                    {Array.from({ length: maxSteps }, (_, idx) => {
                      const ep = idx + 1;
                      const aired = ep <= currentStep;
                      const current = ep === currentStep;
                      const isFinale = ep === maxSteps;
                      return (
                        <div
                          key={ep}
                          className={`flex flex-col items-center justify-center rounded-xl py-1.5 px-1 text-center text-[10px] font-black tabular-nums transition-all ${
                            current
                              ? 'scale-105 bg-violet-600 text-white ring-2 ring-violet-300 shadow-xs'
                              : aired
                              ? 'bg-emerald-500 text-white'
                              : 'border border-indigo-100 bg-white/85 text-slate-400'
                          }`}
                        >
                          <span>ح{ep}</span>
                          <span className="text-[8px] font-bold opacity-90">
                            {current
                              ? 'تُعرض'
                              : aired
                              ? '✓'
                              : isFinale
                              ? 'الأخيرة'
                              : 'قادمة'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }, (_, idx) => {
                    const d = idx + 1;
                    const passed = d <= currentStep;
                    const current = d === currentStep;
                    return (
                      <div
                        key={d}
                        className={`rounded-lg py-1 text-center text-[10px] font-black tabular-nums transition-all ${
                          current
                            ? 'scale-105 bg-violet-600 text-white ring-2 ring-violet-300'
                            : passed
                            ? 'bg-emerald-500 text-white'
                            : 'border border-indigo-100 bg-white/80 text-slate-400'
                        }`}
                      >
                        ي{d}
                      </div>
                    );
                  })}
                </div>
              )}

              {currentStep >= maxSteps && (
                <div className="mt-3 rounded-2xl bg-emerald-100/90 p-2.5 text-center text-xs font-black text-emerald-900">
                  {isSeries
                    ? `اكتمل عرض جميع حلقات المسلسل (${maxSteps} حلقة) بنجاح وتم إعلان جوائز المهرجانات!`
                    : 'اكتمل أسبوعا العرض الأساسيان (10 أيام) واستقرت الإيرادات النهائية وتم إعلان جوائز المهرجانات!'}
                </div>
              )}
            </div>

            {/* 4 Live Financial & Rating Metrics */}
            <div className="grid grid-cols-2 gap-3 tabular-nums">
              <div className="rounded-2xl border-2 border-indigo-100 bg-[#F8FAFF] p-3.5">
                <div className="text-[11px] font-bold text-slate-500">
                  {isSeries
                    ? `عوائد البث والإعلانات (ح${currentStep}/${maxSteps})`
                    : `إيرادات الشباك والمنصات (ي${currentStep}/10)`}
                </div>
                <div className="font-display mt-1 text-xl font-black text-violet-700">
                  {formatMoney(livePlayerRevenue)} ج.م
                </div>
              </div>

              <div className="rounded-2xl border-2 border-indigo-100 bg-[#F8FAFF] p-3.5">
                <div className="text-[11px] font-bold text-slate-500">
                  صافي الربح / التغطية
                </div>
                <div
                  className={`font-display mt-1 text-xl font-black ${
                    liveNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {liveNetProfit >= 0 ? '+' : ''}
                  {formatMoney(liveNetProfit)} ج.م
                </div>
              </div>

              <div className="rounded-2xl border-2 border-indigo-100 bg-[#F8FAFF] p-3.5">
                <div className="text-[11px] font-bold text-slate-500">
                  متوسط تقييم النقاد
                </div>
                <div className="font-display mt-1 text-xl font-black text-slate-900">
                  {proj.criticScore}{' '}
                  <span className="text-xs text-slate-400">/10</span>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-indigo-100 bg-[#F8FAFF] p-3.5">
                <div className="text-[11px] font-bold text-slate-500">
                  تقييم الجمهور
                </div>
                <div className="font-display mt-1 text-xl font-black text-cyan-600">
                  {proj.audienceScore}{' '}
                  <span className="text-xs text-slate-400">/10</span>
                </div>
              </div>
            </div>

            {/* Single Latest Highlight Card (Sudden Breaking News Modals handle the rest!) */}
            {latestHeadline && (
              <div className="rounded-2xl border-2 border-indigo-100 bg-[#F8FAFF] p-3.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-black text-violet-900">
                    {latestHeadline.headline}
                  </span>
                  <span className="shrink-0 rounded-lg bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700 tabular-nums">
                    {isSeries
                      ? `الحلقة ${latestHeadline.day}`
                      : `اليوم ${latestHeadline.day}`}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-600">
                  {latestHeadline.detail}
                </p>
              </div>
            )}

            {/* Competing Movies/Series Standings */}
            <div>
              <div className="mb-2.5 flex items-center justify-between text-xs font-black text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span>
                    {isSeries
                      ? `ترتيب المسلسلات المنافسة في نفس الموسم (بعد الحلقة ${currentStep}):`
                      : `سباق إيرادات الأفلام المنافسة في نفس الموسم (اليوم ${currentStep}):`}
                  </span>
                </span>
              </div>

              <div className="space-y-2.5 tabular-nums">
                {standings.map((row, idx) => {
                  const barWidth = Math.max(
                    12,
                    Math.round((row.liveRevenue / maxStandingRevenue) * 100)
                  );
                  return (
                    <motion.div
                      layout
                      key={row.title}
                      className={`rounded-2xl border-2 p-3 text-xs transition ${
                        row.isPlayer
                          ? 'border-violet-600 bg-violet-50/90 shadow-sm'
                          : 'border-indigo-100 bg-[#F8FAFF]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                              row.isPlayer
                                ? 'bg-violet-600 text-white'
                                : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <div className="truncate">
                            <div className="truncate font-black text-slate-900">
                              {row.title}{' '}
                              {row.isPlayer && (
                                <span className="mr-1 rounded-md bg-violet-600 px-1.5 py-0.5 text-[9px] text-white">
                                  {isSeries ? 'مسلسلك' : 'فيلمك'}
                                </span>
                              )}
                            </div>
                            <div className="truncate text-[10px] font-bold text-slate-500">
                              {row.studio} · بطولة {row.lead} · تقييم{' '}
                              {row.critic}/10
                            </div>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <div className="font-display text-sm font-black text-emerald-700">
                            {formatMoney(row.liveRevenue)} ج.م
                          </div>
                          <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-emerald-600">
                            <TrendingUp className="h-3 w-3" />
                            <span>+{formatMoney(row.todayGain)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100/80">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            row.isPlayer
                              ? 'bg-gradient-to-r from-violet-600 to-cyan-500'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Rival Studios That Delayed or Skipped Their Release This Season */}
              {delayedRivals.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-800">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span>شركات منافسة تأخرت أو أجلت طرح أعمالها هذا الموسم:</span>
                  </div>
                  {delayedRivals.map((dr) => (
                    <div
                      key={`${dr.studioName}_${dr.title}`}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-black text-slate-900">
                          {dr.studioName} — «{dr.title}»
                        </div>
                        <div className="text-[10px] font-bold text-amber-800">
                          {dr.delayReason ||
                            'تأجل طرح العمل للموسم القادم بسبب عدم اكتمال التصوير والمونتاج.'}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-lg bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-950">
                        تأجل عرضه
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => unlockNext(2)}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-900/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <span>التالي: قراءة المقالات النقدية ونبض الجمهور</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 2 && (
          <motion.div
            key="rel-s2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4 rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.15)]"
          >
            <div>
              <div className="mb-2.5 flex items-center justify-between text-xs font-black text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Newspaper className="h-4 w-4 text-violet-600" />
                  <span>مراجعات النقاد الفنيين حول «{proj.title}»:</span>
                </span>
              </div>
              <div className="space-y-3">
                {proj.reviews.map((rev, i) => {
                  const isPos = rev.sentiment === 'positive';
                  const isNeg = rev.sentiment === 'negative';
                  const sentimentLabel = isPos
                    ? 'إشادة نقدية'
                    : isNeg
                    ? 'نقد فني صريح'
                    : 'رأي متوازن';
                  const sentimentTextColor = isPos
                    ? 'text-emerald-700'
                    : isNeg
                    ? 'text-rose-700'
                    : 'text-amber-700';

                  return (
                    <div
                      key={i}
                      className="rounded-2xl border-2 border-indigo-100 bg-[#F8FAFF] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-display font-black text-slate-900">
                            {rev.criticName}
                          </span>
                          <span className="mr-1.5 text-[10px] font-bold text-slate-500">
                            · {rev.publication} ·{' '}
                            <strong className={sentimentTextColor}>
                              {sentimentLabel}
                            </strong>
                          </span>
                        </div>
                        <span className="font-display text-sm font-black text-slate-900 tabular-nums">
                          {rev.score}/10
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed font-medium text-slate-700">
                        &ldquo;{rev.quote}&rdquo;
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-slate-700">
                <MessageSquare className="h-4 w-4 text-rose-500" />
                <span>تعليقات الجمهور على منصات التواصل:</span>
              </div>
              <div className="space-y-2">
                {proj.socialPosts.map((post, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-indigo-100 bg-[#F8FAFF] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-black text-slate-900">
                        {post.handle}
                      </span>
                      <span>
                        {post.platform} · ♥ {post.likes}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-700">{post.content}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
              <button
                type="button"
                onClick={() => setSubStep(1)}
                className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
              >
                <ArrowRight className="h-4 w-4" />
                <span>السابق</span>
              </button>

              <button
                type="button"
                onClick={() => unlockNext(3)}
                className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-900/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <span>التالي: بطاقة التوثيق الرسمي والمهرجانات</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 3 && (
          <motion.div
            key="rel-s3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4 rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.15)]"
          >
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-500" />
              <h3 className="font-display text-lg font-black text-slate-900">
                بطاقة توثيق نتائج العمل (PNG)
              </h3>
            </div>

            <ViralShareCard
              project={proj}
              studioName={studioName}
              ceoName={ceoName}
              logo={logo}
            />

            <div className="flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
              <button
                type="button"
                onClick={() => setSubStep(2)}
                className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
              >
                <ArrowRight className="h-4 w-4" />
                <span>النقاد</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('FESTIVALS_AWARDS')}
                className="flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-900/40 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <Award className="h-5 w-5" />
                <span>سجل المهرجانات والجوائز والعودة للمقر!</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
