'use client';

import React, { useState, useMemo } from 'react';
import {
  useGameStore,
  ReleasedProjectRecord,
  DailyAiNewsItem,
  getLiveActorsWithEvolution,
} from '@/lib/store';
import { GENRES, getResolvedDatabase } from '@/lib/db-resolver';
import {
  MARKET_CONFIGS,
  calculateFinancialsAndQuality,
  generateRivalReleases,
  formatMoney,
} from '@/lib/game-engine';
import { AnimatedCinemaPremiereGraphic } from '@/components/CinematicGraphicsScene';
import {
  Megaphone,
  Tv,
  Film,
  Sparkles,
  Loader2,
  TrendingUp,
  Globe,
  Eye,
  Check,
  Zap,
  Newspaper,
  Bot,
  Trophy,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  playCashRegisterChaChing,
  playHeartbeatTick,
} from '@/lib/sound-fx';

function SpinningOdometerRevenue({ targetValue }: { targetValue: number }) {
  const [displayed, setDisplayed] = React.useState(targetValue);

  React.useEffect(() => {
    let frame = 0;
    const totalFrames = 22;
    const startVal = Math.max(0, displayed * 0.78);
    const diff = targetValue - startVal;

    playCashRegisterChaChing();

    const interval = setInterval(() => {
      frame += 1;
      if (frame % 4 === 0) {
        playHeartbeatTick();
      }
      if (frame >= totalFrames) {
        setDisplayed(targetValue);
        clearInterval(interval);
      } else {
        const progress = frame / totalFrames;
        setDisplayed(Math.round(startVal + diff * progress));
      }
    }, 45);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetValue]);

  const digits = displayed.toLocaleString('en-US').split('');

  return (
    <div
      dir="ltr"
      className="inline-flex items-center gap-0.5 bg-[#0F171E] px-3 py-1.5 rounded-xl border-2 border-[#D4AF37] shadow-inner"
    >
      {digits.map((ch, idx) => (
        <motion.span
          key={`${idx}_${ch}`}
          initial={{ y: -12, opacity: 0.4 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.16 }}
          className={`font-typewriter text-lg sm:text-2xl font-black ${
            ch === ','
              ? 'text-[#D4AF37] px-0.5'
              : 'bg-[#1A2530] text-[#4ADE80] px-1.5 py-0.5 rounded border border-[#D4AF37]/30'
          }`}
        >
          {ch}
        </motion.span>
      ))}
    </div>
  );
}

export function Stage5ReleaseSimulation() {
  const {
    draft,
    updateDraft,
    setActiveScreen,
    cash,
    currentYear,
    gameDay,
    studioName,
    ceoName,
    founderPerk,
    currentRegion,
    unlockedRegions,
    toggleDraftDistributionMarket,
    unlockMarketRegionWithCash,
    releasedProjects,
    lastReleasedProject,
    completeProjectRelease,
    advanceReleaseTrackingDay,
    triggerElectronicTrollsCampaign,
    customDbPatch,
    aiGeneratedActors,
    actorDynamicState,
    emergingCompetitors,
    aiMemoryLog,
    pushBreakingNewsModal,
    showToast,
    groqApiKeyClient,
    preferredGroqModel,
  } = useGameStore();

  const db = useMemo(() => getResolvedDatabase(customDbPatch), [customDbPatch]);

  const liveActors = useMemo(
    () =>
      getLiveActorsWithEvolution({
        baseActors: db.actors,
        aiGeneratedActors,
        actorDynamicState,
        currentYear,
        gameDay,
      }),
    [db.actors, aiGeneratedActors, actorDynamicState, currentYear, gameDay]
  );

  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isTrackingNext, setIsTrackingNext] = useState(false);
  const [episodeHighlight, setEpisodeHighlight] = useState<string | null>(null);
  const [simInsights, setSimInsights] = useState<{
    synergyLabel: string;
    chemistryBonus: number;
    twists: string[];
    viewershipMillions?: number;
  } | null>(null);

  const isSeries = draft.format === 'series';

  const streamingPlatforms = useMemo(
    () =>
      db.streaming_platforms.filter(
        (p) => p.platform_type !== 'tv_channel' && !p.id.startsWith('tv_')
      ),
    [db.streaming_platforms]
  );

  const tvChannels = useMemo(
    () =>
      db.streaming_platforms.filter(
        (p) => p.platform_type === 'tv_channel' || p.id.startsWith('tv_')
      ),
    [db.streaming_platforms]
  );

  const primaryGenreObj = useMemo(
    () => GENRES.find((g) => g.id === draft.primaryGenre),
    [draft.primaryGenre]
  );

  const handleLaunchRelease = async () => {
    setIsSimulating(true);
    try {
      const approvedDirectorIds =
        Array.isArray(draft.directorIds) && draft.directorIds.length > 0
          ? draft.directorIds.slice(0, 2)
          : draft.directorId
          ? [draft.directorId]
          : [];
      const selectedDirectors = db.crew.filter((c) =>
        approvedDirectorIds.includes(c.id)
      );
      const director =
        selectedDirectors[0] ||
        db.crew.find((c) => c.id === draft.directorId) ||
        db.crew.find((c) => c.role === 'director')!;
      const allDirectorsDisplayName =
        selectedDirectors.length > 0
          ? selectedDirectors.map((d) => d.name).join(' و')
          : director.name;
      const dop = db.crew.find((c) => c.id === draft.dopId) || null;
      const composer = db.crew.find((c) => c.id === draft.composerId) || null;
      const vfx = db.crew.find((c) => c.id === draft.vfxId) || null;

      const leads = liveActors.filter((a) => draft.leadActorIds.includes(a.id));
      const antagonist =
        liveActors.find((a) => a.id === draft.antagonistId) || null;
      const supporting = liveActors.filter((a) =>
        draft.supportingActorIds.includes(a.id)
      );
      const cameos = liveActors.filter((a) => draft.cameoActorIds.includes(a.id));

      const scriptWordCount = draft.scriptSynopsis.trim()
        ? draft.scriptSynopsis.trim().split(/\s+/).length
        : 18;

      // 1. Evaluate release via AI first (analyzing script synopsis, decisions, cast, and rival studios)
      const allCompetitors = [...db.competitor_studios, ...emergingCompetitors];
      const availableRivalStars = liveActors
        .filter(
          (a) =>
            !draft.leadActorIds.includes(a.id) &&
            a.id !== draft.antagonistId &&
            (a.tier === 'S' || a.tier === 'A')
        )
        .slice(0, 12)
        .map((a) => ({ name: a.name, tier: a.tier }));

      let aiEval: any = null;
      try {
        const res = await fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'evaluate_release',
            groqKeyOverride: groqApiKeyClient,
            preferredModel: preferredGroqModel,
            payload: {
              title: draft.title,
              synopsis: draft.scriptSynopsis,
              format: draft.format,
              episodes: draft.episodes,
              genre: primaryGenreObj?.name || 'دراما',
              directorName: director.name,
              leadName: leads.map((a) => a.name).join(' و'),
              leadActors: leads.map((a) => a.name),
              antagonistName: antagonist?.name || '',
              studioName,
              ceoName,
              hypeScore: draft.hypeScore,
              competitorStudios: allCompetitors.slice(0, 6).map((s) => ({
                name: s.name,
                specialty: s.specialty,
              })),
              availableStars: availableRivalStars,
              aiMemoryLog,
            },
          }),
        });
        aiEval = await res.json();
      } catch {
        aiEval = null;
      }

      const rawAiMult =
        typeof aiEval?.box_office_multiplier === 'number'
          ? aiEval.box_office_multiplier
          : typeof aiEval?.aiBoxOfficeMultiplier === 'number'
          ? aiEval.aiBoxOfficeMultiplier
          : 1.05;
      const aiMult = Math.max(0.65, Math.min(1.65, rawAiMult));

      // 2. Deep simulation modulated by AI multiplier
      const fin = calculateFinancialsAndQuality({
        format: draft.format,
        episodes: draft.episodes,
        seriesSeason: draft.seriesSeason,
        filmSeason: draft.filmSeason,
        primaryGenre: draft.primaryGenre,
        secondaryGenre: draft.secondaryGenre,
        ageRating: draft.ageRating,
        director,
        writers: [],
        dop,
        composer,
        vfx,
        leads,
        antagonist,
        supporting,
        cameos,
        budgetAllocation: draft.budgetAllocation,
        marketingBudget: draft.marketingBudget,
        screensCount: draft.screensCount,
        platformDealAmount:
          draft.platformDealAmount +
          (isSeries ? draft.tvChannelDealAmount : 0),
        founderPerk,
        hypeScore: draft.hypeScore,
        qualityModifier: draft.qualityModifier,
        aiBoxOfficeMultiplier: aiMult,
        marketRegion: currentRegion,
        selectedDistributionMarkets: draft.selectedDistributionMarkets,
        scriptWordCount,
        previousGenres: releasedProjects.slice(0, 3).map((p) => p.primaryGenre),
      });

      // Calculate total project cost
      const signedIds = Array.from(
        new Set(
          [
            ...approvedDirectorIds,
            draft.dopId,
            draft.composerId,
            draft.vfxId,
            ...draft.leadActorIds,
            draft.antagonistId,
            ...draft.supportingActorIds,
            ...draft.cameoActorIds,
          ].filter(Boolean) as string[]
        )
      );

      let talentCost = 0;
      for (const id of signedIds) {
        const offer = draft.talentOffers[id];
        if (offer) talentCost += offer.offeredSalary;
      }

      const deptCost =
        draft.budgetAllocation.setsAndLocations +
        draft.budgetAllocation.costumesAndMakeup +
        draft.budgetAllocation.vfxAndStunts +
        draft.budgetAllocation.extrasAndCrowds;

      const totalBudget =
        talentCost +
        deptCost +
        draft.marketingBudget +
        fin.distributionFeesTotal;

      const fallbackRivals = generateRivalReleases(
        allCompetitors,
        liveActors,
        [...draft.leadActorIds, ...(draft.antagonistId ? [draft.antagonistId] : [])],
        1.05,
        currentYear + releasedProjects.length,
        draft.format
      );

      const rawRivals =
        Array.isArray(aiEval?.rival_releases) && aiEval.rival_releases.length >= 2
          ? aiEval.rival_releases.map((r: any, idx: number) => ({
              id: `ai_riv_${Date.now()}_${idx}`,
              studioName: String(r.studioName || fallbackRivals[idx % fallbackRivals.length]?.studioName || 'استوديو منافس'),
              title: String(r.title || fallbackRivals[idx % fallbackRivals.length]?.title || 'عمل منافس'),
              genre: String(r.genre || primaryGenreObj?.name || 'دراما'),
              leadStarName: String(r.leadStarName || fallbackRivals[idx % fallbackRivals.length]?.leadStarName || 'نجم صف أول'),
              boxOfficeRevenue: Math.max(75_000_000, Number(r.boxOfficeRevenue) || 125_000_000),
              criticScore: Number(Math.min(9.6, Math.max(6.8, Number(r.criticScore) || 8.1)).toFixed(1)),
              status: r.status === 'delayed' ? ('delayed' as const) : ('released' as const),
              delayReason: r.delayReason ? String(r.delayReason) : undefined,
            }))
          : fallbackRivals;

      // Progressive Day 1 Opening: start at ~22% of target full-run revenue and grow day-by-day!
      const openingRatio = 0.22;
      const rivalReleases = rawRivals.map((r: any) => {
        const targetRev = Math.max(75_000_000, r.boxOfficeRevenue);
        const day1Rev =
          r.status === 'delayed' ? 0 : Math.max(12_500_000, Math.round(targetRev * (openingRatio + ((r.criticScore - 6.5) * 0.015))));
        return {
          ...r,
          boxOfficeRevenue: day1Rev,
          targetBoxOfficeRevenue: targetRev,
        };
      });

      const baseCritic10 = Math.min(9.8, Math.max(3.5, fin.technicalQuality / 10));
      const aiCritic10 =
        typeof aiEval?.critic_score === 'number'
          ? Math.min(9.8, Math.max(3.5, aiEval.critic_score / 10))
          : baseCritic10;
      const criticScore10 = Number((baseCritic10 * 0.45 + aiCritic10 * 0.55).toFixed(1));

      const baseAudience10 = Math.min(
        9.9,
        Math.max(4.0, (fin.commercialAppeal * 0.55 + fin.technicalQuality * 0.45) / 10)
      );
      const aiAudience10 =
        typeof aiEval?.audience_score === 'number'
          ? Math.min(9.9, Math.max(4.0, aiEval.audience_score / 10))
          : baseAudience10;
      const audienceScore10 = Number((baseAudience10 * 0.45 + aiAudience10 * 0.55).toFixed(1));

      const targetGrossRevenue = fin.totalGrossRevenue;
      const targetBoxOfficeRevenue = fin.totalBoxOfficeRevenue;
      const targetStreamingRevenue = fin.totalStreamingRevenue;

      const day1BoxOfficeRevenue = Math.max(
        2_500_000,
        Math.round(targetBoxOfficeRevenue * openingRatio)
      );
      const day1StreamingRevenue = Math.max(
        1_500_000,
        Math.round(targetStreamingRevenue * openingRatio)
      );
      const day1GrossRevenue = day1BoxOfficeRevenue + day1StreamingRevenue;

      const allRevs = [
        day1GrossRevenue,
        ...rivalReleases
          .filter((r: any) => r.status !== 'delayed')
          .map((r: any) => r.boxOfficeRevenue),
      ].sort((a, b) => b - a);
      const boxOfficeRank = Math.max(1, allRevs.indexOf(day1GrossRevenue) + 1);

      const targetViewershipMillions = isSeries
        ? Number(
            Math.max(
              3.2,
              (fin.technicalQuality * 0.38 + fin.commercialAppeal * 0.44) *
                (draft.seriesSeason === 'ramadan' ? 1.35 : 1.0) *
                aiMult
            ).toFixed(1)
          )
        : undefined;

      const viewershipMillions =
        isSeries && targetViewershipMillions
          ? Number(Math.max(0.9, targetViewershipMillions * openingRatio).toFixed(1))
          : undefined;

      const record: ReleasedProjectRecord = {
        id: `proj_${Date.now()}`,
        title: draft.title || 'عمل سينمائي',
        year: currentYear,
        format: draft.format,
        episodes: isSeries ? draft.episodes : undefined,
        seasonName: isSeries
          ? draft.seriesSeason === 'ramadan'
            ? 'موسم دراما رمضان'
            : 'موسم أوف سيزون'
          : draft.filmSeason === 'eid_adha'
          ? 'موسم عيد الأضحى'
          : draft.filmSeason === 'eid_fitr'
          ? 'موسم عيد الفطر'
          : 'موسم الصيف السينمائي',
        primaryGenre: draft.primaryGenre,
        secondaryGenre: draft.secondaryGenre,
        ageRating: draft.ageRating,
        synopsis: draft.scriptSynopsis,
        directorId: director.id,
        directorName: allDirectorsDisplayName,
        leadNames: leads.map((a) => a.name),
        antagonistName: antagonist?.name,
        cameoNames: cameos.map((a) => a.name),
        actorIdsInCast: [
          ...draft.leadActorIds,
          ...(draft.antagonistId ? [draft.antagonistId] : []),
          ...draft.supportingActorIds,
        ],
        castCustomRoles: draft.castCustomRoles,
        totalBudget,
        distributionFeesTotal: fin.distributionFeesTotal,
        selectedDistributionMarkets: draft.selectedDistributionMarkets,
        firstWeekRevenue: fin.firstWeekRevenue,
        boxOfficeRevenue: day1BoxOfficeRevenue,
        streamingRevenue: day1StreamingRevenue,
        totalGrossRevenue: day1GrossRevenue,
        targetGrossRevenue,
        targetBoxOfficeRevenue,
        targetStreamingRevenue,
        viewershipMillions,
        targetViewershipMillions,
        netProfit: day1GrossRevenue - totalBudget,
        criticScore: criticScore10,
        audienceScore: audienceScore10,
        boxOfficeRank,
        reviews: Array.isArray(aiEval?.reviews)
          ? aiEval.reviews.map((rev: any) => ({
              criticName: String(rev.criticName || 'ناقد سينمائي'),
              publication: String(rev.publication || 'الصحافة الفنية'),
              sentiment:
                rev.sentiment === 'positive' || rev.sentiment === 'negative'
                  ? rev.sentiment
                  : 'mixed',
              quote: String(rev.quote || ''),
              score: Number(
                (Number(rev.score) > 10 ? Number(rev.score) / 10 : Number(rev.score) || criticScore10).toFixed(1)
              ),
            }))
          : [
              {
                criticName: 'طارق الشناوي',
                publication: 'الشرق الأوسط',
                sentiment: criticScore10 >= 7.2 ? 'positive' : 'mixed',
                quote: `عمل فني يحمل بصمة واضحة في «${draft.title}» بقيادة المخرج ${director.name} ويقدم معالجة درامية لافتة.`,
                score: criticScore10,
              },
              {
                criticName: 'أندرو محسن',
                publication: 'في الفن',
                sentiment: audienceScore10 >= 7.5 ? 'positive' : 'mixed',
                quote: `تناغم واضح بين الأبطال (${leads.map((l) => l.name).join(' و')}) مع إقبال جماهيري قوي منذ اليوم الأول.`,
                score: audienceScore10,
              },
            ],
        socialPosts: Array.isArray(aiEval?.social_posts || aiEval?.socialPosts)
          ? (aiEval.social_posts || aiEval.socialPosts)
          : [
              {
                handle: '@CinemaLoversEG',
                platform: 'X',
                content: `#${draft.title.replace(/\s+/g, '_')} عمل متعوب عليه جداً وأداء تمثيلي خطف الأنظار من أول مشهد! 🔥👏`,
                likes: '24.5K',
              },
              {
                handle: '@DramaTrends',
                platform: 'TikTok',
                content: `مشاهد «${draft.title}» متصدرة التريند والجمهور بيشيد بقوة القصة والإخراج ✨`,
                likes: '61.2K',
              },
            ],
        viralTrendLabel:
          aiEval?.viral_trend_label ||
          aiEval?.viralTrendLabel ||
          `#${draft.title.replace(/\s+/g, '_')} يتصدر قوائم البحث`,
        rivalReleases,
        awardsWon: [],
        releaseDayStart: gameDay,
        daysTracked: 1,
        dailyNews: [],
      };

      setSimInsights({
        synergyLabel: fin.synergyReport.label,
        chemistryBonus: fin.chemistryReport.synergyBonus,
        twists: fin.simulationTwists.map((t) => t.label),
        viewershipMillions,
      });

      completeProjectRelease(record);
      setWizardStep(2);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      pushBreakingNewsModal({
        id: `modal_premiere_${record.id}`,
        day: gameDay,
        year: currentYear,
        category: 'production_news',
        badgeLabel: isSeries
          ? 'افتتاح البث التلفزيوني والرقمي'
          : 'افتتاح شباك التذاكر السينمائي',
        headline: isSeries
          ? `انطلاق بث الحلقة الأولى من «${record.title}» بـ ${viewershipMillions}M مشاهدة`
          : `افتتاح سينمائي قوي لفيلم «${record.title}» بـ ${formatMoney(record.totalGrossRevenue)} ج.م`,
        detail: isSeries
          ? `حصدت الحلقة الافتتاحية من مسلسل «${record.title}» إخراج ${allDirectorsDisplayName} تفاعلاً جماهيرياً واسعاً وتقييم ${record.criticScore}/10 من النقاد.`
          : `انطلق عرض فيلم «${record.title}» إخراج ${allDirectorsDisplayName} في قاعات السينما بالمركز #${record.boxOfficeRank} وسط منافسة محتدمة وتقييم ${record.criticScore}/10.`,
        highlightName: record.title,
        extraStatBadge: isSeries
          ? `${viewershipMillions}M مشاهدة`
          : `${formatMoney(record.totalGrossRevenue)} ج.م`,
        gameImpactLabel: `المركز #${record.boxOfficeRank} في سباق الموسم · تقييم النقاد ${record.criticScore}/10`,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  // Interactive Day-by-Day Box Office / Episode Broadcast Tracker
  const handleTrackNextBroadcastStep = async () => {
    if (!lastReleasedProject) return;
    setIsTrackingNext(true);
    try {
      const nextStep = (lastReleasedProject.daysTracked || 1) + 1;
      if (isSeries) {
        const res = await fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'evaluate_series_episode',
            groqKeyOverride: groqApiKeyClient,
            preferredModel: preferredGroqModel,
            payload: {
              title: lastReleasedProject.title,
              synopsis: lastReleasedProject.synopsis,
              episodeNumber: nextStep,
              totalEpisodes: lastReleasedProject.episodes || 15,
              leadActors: lastReleasedProject.leadNames,
              directorName: lastReleasedProject.directorName,
              studioName,
            },
          }),
        });
        const data = await res.json();
        const highlight =
          data?.episodeHighlight ||
          data?.headline ||
          `تصاعد درامي مثير في الحلقة ${nextStep} من «${lastReleasedProject.title}» يشعل تفاعل المشاهدين!`;
        setEpisodeHighlight(`الحلقة ${nextStep}: ${highlight}`);
        const playerMom =
          typeof data?.daily_revenue_multiplier === 'number'
            ? data.daily_revenue_multiplier
            : 1.06;
        const rivalMom =
          typeof data?.rival_momentum === 'number' ? data.rival_momentum : 1.0;
        const epNewsItem: DailyAiNewsItem = {
          id: `ep_news_${Date.now()}`,
          day: gameDay,
          headline: `تفاعل واسع مع الحلقة ${nextStep} من «${lastReleasedProject.title}»`,
          detail: highlight,
          impactType: 'positive',
          hypeDelta: 3,
        };
        advanceReleaseTrackingDay(epNewsItem, playerMom, rivalMom);
        pushBreakingNewsModal({
          id: `modal_${epNewsItem.id}`,
          day: gameDay,
          year: currentYear,
          category: 'production_news',
          badgeLabel: `تقرير بث الحلقات · الحلقة ${nextStep}`,
          headline: epNewsItem.headline,
          detail: epNewsItem.detail,
          highlightName: lastReleasedProject.title,
          extraStatBadge: `الحلقة ${nextStep}`,
          gameImpactLabel: `تصاعد المشاهدات وعوائد البث لمسلسل «${lastReleasedProject.title}»`,
        });
      } else {
        const res = await fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'generate_daily_news',
            groqKeyOverride: groqApiKeyClient,
            preferredModel: preferredGroqModel,
            payload: {
              phase: 'box_office',
              day: nextStep,
              title: lastReleasedProject.title,
              genre: lastReleasedProject.primaryGenre,
              leadActorName: lastReleasedProject.leadNames[0] || 'بطل العمل',
              directorName: lastReleasedProject.directorName,
              studioName,
              ceoName,
            },
          }),
        });
        const data = await res.json();
        const item: DailyAiNewsItem = {
          id: `bo_news_${Date.now()}`,
          day: gameDay,
          headline:
            data?.headline ||
            `نمو متواصل لإيرادات «${lastReleasedProject.title}» في اليوم ${nextStep} لشباك التذاكر`,
          detail:
            data?.detail ||
            `واصل الفيلم تحقيق عوائد قوية في شباك التذاكر وسط منافسة محتدمة على صدارة الموسم.`,
          impactType: data?.impactType || 'positive',
          hypeDelta: 2,
        };
        const playerMom =
          typeof data?.daily_revenue_multiplier === 'number'
            ? data.daily_revenue_multiplier
            : 1.05;
        const rivalMom =
          typeof data?.rival_momentum === 'number' ? data.rival_momentum : 1.0;
        advanceReleaseTrackingDay(item, playerMom, rivalMom);
        pushBreakingNewsModal({
          id: `modal_${item.id}`,
          day: gameDay,
          year: currentYear,
          category: 'production_news',
          badgeLabel: `نشرة شباك التذاكر · اليوم ${nextStep}`,
          headline: item.headline,
          detail: item.detail,
          highlightName: lastReleasedProject.title,
          extraStatBadge: `اليوم ${nextStep}`,
          gameImpactLabel: `نمو إيرادات شباك التذاكر لفيلم «${lastReleasedProject.title}»`,
        });
      }
    } catch {
      advanceReleaseTrackingDay();
    } finally {
      setIsTrackingNext(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Clean Single-Line Current Activity Header (No Step Numbers or Dots) */}
      <div className="glass-panel rounded-3xl px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm">
              {isSeries ? <Tv className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
            </div>
            <h2 className="font-display text-sm font-black text-slate-900 sm:text-base">
              {wizardStep === 1
                ? isSeries
                  ? `إعداد التسويق وعقود البث والفضائيات: «${draft.title}»`
                  : `إعداد الحملة الترويجية وشاشات العرض: «${draft.title}»`
                : isSeries
                ? `متابعة المشاهدات المليونية وتقييمات النقاد: «${draft.title}»`
                : `متابعة إيرادات شباك التذاكر ومنافسة الموسم: «${draft.title}»`}
            </h2>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: MARKETING, DISTRIBUTION MARKETS & PLATFORM/TV LOGOS */}
        {wizardStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Marketing & Cinema Screens Sliders */}
            <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-4 space-y-4 shadow-sm">
              <h3 className="font-display text-sm font-black text-slate-900">
                الحملة الترويجية وشاشات العرض
              </h3>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">
                    ميزانية الإعلانات والدعاية (Marketing)
                  </span>
                  <span className="font-mono text-xs font-black text-violet-700">
                    {formatMoney(draft.marketingBudget)} ج.م
                  </span>
                </div>
                <input
                  type="range"
                  min={2_000_000}
                  max={45_000_000}
                  step={1_000_000}
                  value={draft.marketingBudget}
                  onChange={(e) =>
                    updateDraft({ marketingBudget: Number(e.target.value) })
                  }
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>

              {!isSeries && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">
                      عدد قاعات وشاشات السينما المحجوزة
                    </span>
                    <span className="font-mono text-xs font-black text-amber-700">
                      {draft.screensCount} شاشة عرض
                    </span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={300}
                    step={10}
                    value={draft.screensCount}
                    onChange={(e) =>
                      updateDraft({ screensCount: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Streaming Platforms & TV Channels with Dedicated Logo Slots */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Digital Platforms */}
              <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-4 space-y-2.5 shadow-sm">
                <h3 className="flex items-center gap-1.5 text-xs font-black text-indigo-900">
                  <Globe className="h-4 w-4 text-indigo-600" />
                  منصة البث الرقمي (Streaming / VOD)
                </h3>
                <div className="space-y-2">
                  {streamingPlatforms.map((plat) => {
                    const selected = draft.selectedPlatformId === plat.id;
                    const dealVal = Math.round(plat.budget_capacity * 320_000);
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() =>
                          updateDraft({
                            selectedPlatformId: plat.id,
                            platformDealAmount: dealVal,
                          })
                        }
                        className={`flex w-full items-center justify-between gap-2.5 rounded-xl border-2 p-2.5 text-right transition ${
                          selected
                            ? 'border-indigo-600 bg-indigo-50 text-slate-900'
                            : 'border-indigo-100 bg-white text-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-indigo-200 bg-slate-900 text-white">
                            {plat.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={plat.logo_url}
                                alt={plat.name}
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <span className="text-[10px] font-black text-amber-400">
                                VOD
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-black">{plat.name}</div>
                            <div className="font-mono text-[10px] font-bold text-emerald-700">
                              عقد البث: {formatMoney(dealVal)} ج.م
                            </div>
                          </div>
                        </div>
                        {selected && (
                          <Check className="h-4 w-4 shrink-0 text-indigo-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TV Channels */}
              <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-4 space-y-2.5 shadow-sm">
                <h3 className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                  <Tv className="h-4 w-4 text-amber-600" />
                  القناة التلفزيونية الفضائية الناقلة
                </h3>
                <div className="space-y-2">
                  {tvChannels.map((tv) => {
                    const selected = draft.selectedTvChannelId === tv.id;
                    const dealVal = Math.round(tv.budget_capacity * 260_000);
                    return (
                      <button
                        key={tv.id}
                        type="button"
                        onClick={() =>
                          updateDraft({
                            selectedTvChannelId: tv.id,
                            tvChannelDealAmount: dealVal,
                          })
                        }
                        className={`flex w-full items-center justify-between gap-2.5 rounded-xl border-2 p-2.5 text-right transition ${
                          selected
                            ? 'border-amber-500 bg-amber-50 text-slate-900'
                            : 'border-indigo-100 bg-white text-slate-700 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-300 bg-slate-900 text-white">
                            {tv.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={tv.logo_url}
                                alt={tv.name}
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <span className="text-[10px] font-black text-amber-300">
                                TV
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-black">{tv.name}</div>
                            <div className="font-mono text-[10px] font-bold text-emerald-700">
                              حقوق العرض: {formatMoney(dealVal)} ج.م
                            </div>
                          </div>
                        </div>
                        {selected && (
                          <Check className="h-4 w-4 shrink-0 text-amber-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Regional Distribution Markets */}
            <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-4 space-y-3 shadow-sm">
              <h3 className="font-display text-xs font-black text-slate-900">
                أسواق التوزيع الإقليمية والدولية
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {MARKET_CONFIGS.map((m) => {
                  const isUnlocked = unlockedRegions.includes(m.id);
                  const isSelected = (
                    draft.selectedDistributionMarkets || ['egypt']
                  ).includes(m.id);
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border-2 p-3 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70'
                          : 'border-indigo-100 bg-indigo-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">
                          {m.name}
                        </span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-900">
                          +{Math.round(m.revenueBonusFactor * 100)}% عوائد
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-bold text-slate-500">
                        {m.description}
                      </p>
                      <div className="mt-2">
                        {isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => toggleDraftDistributionMarket(m.id)}
                            className={`w-full rounded-lg py-1.5 text-[11px] font-black ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isSelected ? 'سوق معتمد في التوزيع ✓' : 'تفعيل التوزيع'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const ok = unlockMarketRegionWithCash(m.id);
                              if (!ok) {
                                showToast(
                                  `يتطلب فتح ${m.name} سيولة ${formatMoney(m.earlyLicenseCost)} ج.م`,
                                  'warning'
                                );
                              }
                            }}
                            className="w-full rounded-lg bg-violet-600 py-1.5 text-[11px] font-black text-white hover:bg-violet-500"
                          >
                            فتح ترخيص السوق ({formatMoney(m.earlyLicenseCost)} ج.م)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: LIVE RELEASE RESULTS (FILM BOX OFFICE VS SERIES VIEWERSHIP) */}
        {wizardStep === 2 && lastReleasedProject && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* LIVE BOX OFFICE STOCK TICKER & SPINNING ODOMETER (شاشة بورصة شباك التذاكر وعداد الإيرادات الدوّار) */}
            <div className="rounded-3xl bg-[#1A2530] text-[#F9F6F0] p-5 border-4 border-[#D4AF37] shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#D4AF37]/30 pb-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#D91624] text-white text-[10px] font-typewriter font-black mb-1">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>مؤشر شباك التذاكر المباشر · شاشة بورصة الإيرادات</span>
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl text-[#F9F6F0]">
                    عداد إيرادات «{lastReleasedProject.title}» المباشر
                  </h3>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-bold text-[#D4AF37] mb-1">
                    إجمالي شباك التذاكر والبث (Cha-Ching Odometer):
                  </span>
                  <SpinningOdometerRevenue
                    targetValue={lastReleasedProject.totalGrossRevenue}
                  />
                </div>
              </div>

              {/* Animated Stock Chart SVG */}
              <div className="relative h-36 w-full rounded-2xl bg-[#0F171E] border border-[#D4AF37]/40 p-3 overflow-hidden">
                <svg viewBox="0 0 500 110" className="w-full h-full overflow-visible">
                  {/* Horizontal Stock Grid Lines */}
                  {[20, 50, 80].map((y) => (
                    <line
                      key={y}
                      x1={0}
                      y1={y}
                      x2={500}
                      y2={y}
                      stroke="rgba(212,175,55,0.16)"
                      strokeDasharray="4 4"
                    />
                  ))}

                  {/* Rival Studio Stock Line (Red Dashed) */}
                  <motion.polyline
                    fill="none"
                    stroke="#D91624"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                    points="10,92 85,78 165,82 245,66 330,70 415,54 490,48"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2 }}
                  />

                  {/* Player Film Stock Line (Glowing Gold & Emerald) */}
                  <motion.polyline
                    fill="none"
                    stroke="#4ADE80"
                    strokeWidth="4"
                    points="10,95 85,74 165,62 245,48 330,36 415,24 490,14"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.4 }}
                  />
                </svg>

                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-typewriter font-bold">
                  <span className="text-[#4ADE80]">
                    ▲ سهم فيلمك: متصدر المركز #{lastReleasedProject.boxOfficeRank}
                  </span>
                  <span className="text-[#D91624]">
                    ▼ سهم أفلام المنافسين
                  </span>
                </div>
              </div>
            </div>

            {/* Animated Premiere Graphic */}
            <AnimatedCinemaPremiereGraphic
              title={lastReleasedProject.title}
              isSeries={isSeries}
              currentStep={lastReleasedProject.daysTracked || 1}
              maxSteps={isSeries ? lastReleasedProject.episodes || 15 : 10}
              liveRevenueFormatted={formatMoney(lastReleasedProject.totalGrossRevenue)}
              rank={lastReleasedProject.boxOfficeRank}
              criticScore={lastReleasedProject.criticScore}
            />

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 text-center">
              <div className="rounded-2xl border-2 border-[#1A2530] bg-white p-3">
                <span className="block text-[10px] font-bold text-[#1A2530]/70">
                  {isSeries ? 'إجمالي عوائد البث والإعلانات' : 'إجمالي الإيرادات'}
                </span>
                <span className="font-typewriter text-sm font-black text-[#15803D]">
                  {formatMoney(lastReleasedProject.totalGrossRevenue)} ج.م
                </span>
              </div>

              {isSeries &&
              (lastReleasedProject.viewershipMillions ||
                simInsights?.viewershipMillions) ? (
                <div className="rounded-2xl border-2 border-indigo-300 border-b-4 border-b-indigo-500 bg-indigo-50 p-3">
                  <span className="block text-[10px] font-bold text-indigo-800">
                    المشاهدات المليونية
                  </span>
                  <span className="flex items-center justify-center gap-1 font-mono text-sm font-black text-indigo-950">
                    <Eye className="h-3.5 w-3.5 text-indigo-600" />
                    {lastReleasedProject.viewershipMillions ||
                      simInsights?.viewershipMillions}
                    M مشاهدة
                  </span>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-indigo-200 border-b-4 border-b-indigo-300 bg-white/95 p-3">
                  <span className="block text-[10px] font-bold text-slate-500">
                    صافي الربح / الخسارة
                  </span>
                  <span
                    className={`font-mono text-sm font-black ${
                      lastReleasedProject.netProfit >= 0
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}
                  >
                    {formatMoney(lastReleasedProject.netProfit)} ج.م
                  </span>
                </div>
              )}

              <div className="rounded-2xl border-2 border-indigo-200 border-b-4 border-b-indigo-300 bg-white/95 p-3">
                <span className="block text-[10px] font-bold text-slate-500">
                  تقييم النقاد
                </span>
                <span className="font-mono text-sm font-black text-amber-600">
                  {lastReleasedProject.criticScore}/10
                </span>
              </div>

              <div className="rounded-2xl border-2 border-indigo-200 border-b-4 border-b-indigo-300 bg-white/95 p-3">
                <span className="block text-[10px] font-bold text-slate-500">
                  تقييم الجمهور
                </span>
                <span className="font-mono text-sm font-black text-violet-700">
                  {lastReleasedProject.audienceScore}/10
                </span>
              </div>
            </div>

            {/* Interactive Live Tracking & Viral Electronic Trolls Boost */}
            <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-4 space-y-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <TrendingUp className="h-4 w-4 text-violet-600" />
                    {isSeries
                      ? `متابعة عرض الحلقات: الحلقة ${lastReleasedProject.daysTracked || 1} من ${lastReleasedProject.episodes || 15}`
                      : `متابعة أيام شباك التذاكر: اليوم ${lastReleasedProject.daysTracked || 1} من 10`}
                  </span>
                  <p className="mt-0.5 text-[10px] font-bold text-emerald-700">
                    تتزايد الإيرادات والمشاهدات تدريجياً مع مرور الأيام وحسب تفاعل الجمهور والنقاد
                  </p>
                  {episodeHighlight && (
                    <p className="mt-1 text-xs font-bold text-indigo-900">
                      {episodeHighlight}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTrackNextBroadcastStep}
                    disabled={
                      isTrackingNext ||
                      (lastReleasedProject.daysTracked || 1) >=
                        (isSeries ? lastReleasedProject.episodes || 15 : 10)
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-black text-white shadow-sm hover:bg-violet-500 disabled:opacity-50"
                  >
                    {isTrackingNext ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Newspaper className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {(lastReleasedProject.daysTracked || 1) >=
                      (isSeries ? lastReleasedProject.episodes || 15 : 10)
                        ? isSeries
                          ? 'اكتمل عرض جميع الحلقات ✓'
                          : 'اكتمل موسم شباك التذاكر ✓'
                        : isSeries
                        ? 'بث الحلقة التالية ورصد التفاعل'
                        : 'رصد إيرادات اليوم التالي'}
                    </span>
                  </button>

                  {!lastReleasedProject.trollsCampaigned && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerElectronicTrollsCampaign(lastReleasedProject.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-black text-purple-900 hover:bg-purple-100"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      <span>إطلاق حملة تريند إلكترونية (+15% عوائد)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-600 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((lastReleasedProject.daysTracked || 1) /
                          (isSeries ? lastReleasedProject.episodes || 15 : 10)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>

              {/* Daily Box Office / Broadcast News Feed */}
              {Array.isArray(lastReleasedProject.dailyNews) &&
                lastReleasedProject.dailyNews.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {lastReleasedProject.dailyNews.slice(0, 3).map((n) => (
                      <div
                        key={n.id}
                        className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-right"
                      >
                        <div className="text-[11px] font-black text-indigo-950">
                          {n.headline}
                        </div>
                        <div className="text-[10px] font-bold text-slate-600">
                          {n.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Season Box Office / Viewership Leaderboard vs Rivals */}
            <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-4 space-y-2.5 shadow-sm">
              <h3 className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                <Trophy className="h-4 w-4 text-amber-500" />
                جدول منافسة الموسم أمام شركات الإنتاج المنافسة
              </h3>
              <div className="space-y-2">
                {[
                  {
                    title: lastReleasedProject.title,
                    studioName,
                    leadStarName: lastReleasedProject.leadNames[0] || 'بطل العمل',
                    boxOfficeRevenue: lastReleasedProject.totalGrossRevenue,
                    criticScore: lastReleasedProject.criticScore,
                    isPlayer: true,
                  },
                  ...lastReleasedProject.rivalReleases.filter(
                    (r) => r.status !== 'delayed'
                  ),
                ]
                  .sort((a, b) => b.boxOfficeRevenue - a.boxOfficeRevenue)
                  .map((entry, idx) => (
                    <div
                      key={`${entry.title}_${idx}`}
                      className={`flex items-center justify-between rounded-xl border p-2.5 ${
                        (entry as any).isPlayer
                          ? 'border-amber-400 bg-amber-50/90 font-black'
                          : 'border-indigo-100 bg-indigo-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 font-mono text-xs font-black text-amber-400">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-black text-slate-900">
                            {entry.title}{' '}
                            {(entry as any).isPlayer && (
                              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] text-slate-950">
                                عملك
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500">
                            {entry.studioName} · بطولة: {entry.leadStarName}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-mono text-xs font-black text-emerald-700">
                          {formatMoney(entry.boxOfficeRevenue)} ج.م
                        </div>
                        <div className="text-[10px] font-bold text-amber-700">
                          نقاد {entry.criticScore}/10
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Critic Reviews & Social Reactions */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-4 space-y-2.5 shadow-sm">
                <h3 className="text-xs font-black text-slate-900">
                  مراجعات النقاد والصحافة الفنية
                </h3>
                {lastReleasedProject.reviews.map((rev, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">
                        {rev.criticName} ·{' '}
                        <span className="text-violet-700">{rev.publication}</span>
                      </span>
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-black text-amber-900">
                        {rev.score}/10
                      </span>
                    </div>
                    <p className="text-[11px] font-bold leading-relaxed text-slate-600">
                      &ldquo;{rev.quote}&rdquo;
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border-2 border-indigo-200/80 border-b-4 border-b-indigo-300 bg-white/95 p-4 space-y-2.5 shadow-sm">
                <h3 className="text-xs font-black text-slate-900">
                  نبض الجمهور والسوشيال ميديا
                </h3>
                {lastReleasedProject.socialPosts.map((post, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-black text-indigo-700">
                      <span>{post.handle}</span>
                      <span>♥ {post.likes}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-700">
                      {post.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING STICKY BOTTOM NAVIGATION BOX */}
      <div className="pointer-events-none fixed right-0 bottom-3 left-0 z-40 px-3">
        <div className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between rounded-2xl border-2 border-indigo-200/90 border-b-4 border-b-indigo-300 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-md">
          {wizardStep === 1 ? (
            <button
              type="button"
              onClick={() => setActiveScreen('PRODUCTION_CRISES')}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2 text-xs font-black text-slate-700 transition hover:bg-indigo-100"
            >
              السابق
            </button>
          ) : (
            <span className="text-xs font-black text-emerald-700">
              تم تسجيل العمل في أرشيف الاستوديو ✓
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              if (wizardStep === 1) {
                handleLaunchRelease();
              } else {
                setActiveScreen('FESTIVALS_AWARDS');
              }
            }}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 rounded-xl border-b-2 border-amber-700 bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-2 text-xs font-black text-slate-950 shadow-md transition hover:from-amber-400 hover:to-amber-300 disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري تقييم العمل وحساب النتائج...</span>
              </>
            ) : wizardStep === 1 ? (
              <>
                <Sparkles className="h-4 w-4" />
                <span>
                  {isSeries
                    ? 'بدء بث المسلسل ورصد المشاهدات'
                    : 'طرح الفيلم في السينمات الآن'}
                </span>
              </>
            ) : (
              <span>الانتقال للمهرجانات والجوائز</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Stage5ReleaseSimulation;
