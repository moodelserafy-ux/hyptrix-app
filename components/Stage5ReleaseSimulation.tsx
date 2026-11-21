'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  useGameStore,
  ReleasedProjectRecord,
  getLiveActorsWithEvolution,
  getStudioAssetBenefits,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import {
  calculateFinancialsAndQuality,
  generateRivalReleases,
  formatMoney,
} from '@/lib/game-engine';
import {
  computeStudioProgression,
  getMarketRegionRequiredLevel,
} from '@/lib/progression';
import { getOrCreateStudioInstanceId } from '@/lib/supabase';
import {
  getCurrencyLabel,
  getPrimaryMarketRegion,
  getMarketAiContext,
} from '@/lib/market-profiles';
import {
  getLocalizedExpansionMarkets,
  getLocalizedGenreInfo,
  getLocalizedMarketInfo,
  getUiDir,
  isEnglishLang,
  localizeEntityName,
  tr,
} from '@/lib/i18n';
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
  Clock,
  Bot,
  Trophy,
  Activity,
  Home,
  Star,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  playCashRegisterChaChing,
  playHeartbeatTick,
} from '@/lib/sound-fx';
import {
  showRewardedAd,
  getRewardedAdErrorMessage,
} from '@/lib/ad-mediator';

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
    marketValue,
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
    resetDraftForNewProject,
    releaseViewInitialStep,
    consumeReleaseViewInitialStep,
    triggerElectronicTrollsCampaign,
    claimInternationalDistributionAdBonus,
    customDbPatch,
    aiGeneratedActors,
    actorDynamicState,
    emergingCompetitors,
    aiMemoryLog,
    pushBreakingNewsModal,
    showToast,
    ownedStudioAssets,
    groqApiKeyClient,
    preferredGroqModel,
    worldMarket,
    uiLanguage,
  } = useGameStore();

  const progression = useMemo(
    () =>
      computeStudioProgression({
        marketValue,
        releasedProjects,
        uiLanguage,
      }),
    [marketValue, releasedProjects, uiLanguage]
  );

  const isEn = isEnglishLang(uiLanguage);
  const uiDir = getUiDir(uiLanguage);
  const localizedMarket = useMemo(
    () => getLocalizedMarketInfo(worldMarket, uiLanguage),
    [worldMarket, uiLanguage]
  );
  const marketConfigs = useMemo(
    () => getLocalizedExpansionMarkets(worldMarket, uiLanguage),
    [worldMarket, uiLanguage]
  );
  const primaryRegion = getPrimaryMarketRegion(worldMarket);
  const marketAiCtx = getMarketAiContext(worldMarket);
  const currencyLabel = getCurrencyLabel(worldMarket, uiLanguage);

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch, worldMarket),
    [customDbPatch, worldMarket]
  );

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

  const [wizardStep, setWizardStep] = useState<1 | 2>(() =>
    releaseViewInitialStep === 2 && lastReleasedProject ? 2 : 1
  );
  const [resultsTab, setResultsTab] = useState<'box_office' | 'critics'>(
    'box_office'
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [simInsights, setSimInsights] = useState<{
    synergyLabel: string;
    chemistryBonus: number;
    twists: string[];
    viewershipMillions?: number;
  } | null>(null);

  useEffect(() => {
    if (releaseViewInitialStep === 2) {
      consumeReleaseViewInitialStep();
    }
  }, [releaseViewInitialStep, consumeReleaseViewInitialStep]);

  const isSeries =
    wizardStep === 2 && lastReleasedProject
      ? lastReleasedProject.format === 'series'
      : draft.format === 'series';

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

  const effectiveSelectedPlatformId = streamingPlatforms.some(
    (p) => p.id === draft.selectedPlatformId
  )
    ? draft.selectedPlatformId
    : streamingPlatforms[0]?.id || null;

  const effectiveSelectedTvChannelId = tvChannels.some(
    (tv) => tv.id === draft.selectedTvChannelId
  )
    ? draft.selectedTvChannelId
    : tvChannels[0]?.id || null;

  const primaryGenreLocalized = useMemo(
    () => getLocalizedGenreInfo(draft.primaryGenre, uiLanguage),
    [draft.primaryGenre, uiLanguage]
  );

  const estimatedDistributionFees = useMemo(() => {
    const activeRegions =
      draft.selectedDistributionMarkets &&
      draft.selectedDistributionMarkets.length > 0
        ? draft.selectedDistributionMarkets
        : [primaryRegion];
    return activeRegions.reduce((sum, mId) => {
      if (mId === primaryRegion) return sum;
      const cfg = marketConfigs.find((m) => m.id === mId);
      return sum + (cfg?.distributionFeePerProject || 0);
    }, 0);
  }, [draft.selectedDistributionMarkets, marketConfigs, primaryRegion]);

  const assetBenefitsMemo = useMemo(
    () => getStudioAssetBenefits(ownedStudioAssets),
    [ownedStudioAssets]
  );

  const estimatedTalentCost = useMemo(() => {
    const approvedDirs =
      Array.isArray(draft.directorIds) && draft.directorIds.length > 0
        ? draft.directorIds.slice(0, 2)
        : draft.directorId
        ? [draft.directorId]
        : [];
    const signedIds = Array.from(
      new Set(
        [
          ...approvedDirs,
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
    return signedIds.reduce(
      (sum, id) => sum + (draft.talentOffers[id]?.offeredSalary || 0),
      0
    );
  }, [
    draft.directorIds,
    draft.directorId,
    draft.dopId,
    draft.composerId,
    draft.vfxId,
    draft.leadActorIds,
    draft.antagonistId,
    draft.supportingActorIds,
    draft.cameoActorIds,
    draft.talentOffers,
  ]);

  const estimatedDeptCost = useMemo(() => {
    const rawDeptCost =
      draft.budgetAllocation.setsAndLocations +
      draft.budgetAllocation.costumesAndMakeup +
      draft.budgetAllocation.vfxAndStunts +
      draft.budgetAllocation.extrasAndCrowds;
    return Math.round(rawDeptCost * assetBenefitsMemo.costMultiplier);
  }, [draft.budgetAllocation, assetBenefitsMemo.costMultiplier]);

  const totalLaunchCost =
    estimatedTalentCost +
    estimatedDeptCost +
    draft.marketingBudget +
    estimatedDistributionFees;
  const liquidityDeficit = Math.max(0, totalLaunchCost - cash);
  const isOverTotalLiquidity = totalLaunchCost > cash;

  const handleLaunchRelease = async () => {
    if (isOverTotalLiquidity) {
      showToast(
        isEn
          ? `Available cash (${formatMoney(cash)} ${currencyLabel}) cannot cover total launch cost (${formatMoney(totalLaunchCost)} ${currencyLabel}) — you need ${formatMoney(liquidityDeficit)} ${currencyLabel} more or lower marketing/distribution spend.`
          : `السيولة الحالية (${formatMoney(cash)} ${currencyLabel}) لا تكفي لتغطية التكلفة الإجمالية للعمل (${formatMoney(totalLaunchCost)} ${currencyLabel}) — تحتاج ${formatMoney(liquidityDeficit)} ${currencyLabel} إضافية أو تخفيض الدعاية/التوزيع!`,
        'warning'
      );
      return;
    }

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
      const coDirector = selectedDirectors[1] || null;
      const listJoiner = isEn ? ' & ' : ' و';
      const localizedDirectorName = localizeEntityName(director.name, uiLanguage);
      const allDirectorsDisplayName =
        selectedDirectors.length > 0
          ? selectedDirectors
              .map((d) => localizeEntityName(d.name, uiLanguage))
              .join(listJoiner)
          : localizedDirectorName;
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

      const localizedLeadNames = leads.map((a) =>
        localizeEntityName(a.name, uiLanguage)
      );
      const localizedAntagonistName = antagonist
        ? localizeEntityName(antagonist.name, uiLanguage)
        : '';
      const localizedCameoNames = cameos.map((a) =>
        localizeEntityName(a.name, uiLanguage)
      );

      const signedAllIds = Array.from(
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
      const totalBackendPointsPercent = Math.min(
        45,
        signedAllIds.reduce((sum, id) => {
          const pts =
            draft.talentOffers[id]?.backendPoints ??
            draft.negotiatedDiscounts[id]?.backendPoints ??
            0;
          return sum + Math.max(0, Number(pts || 0));
        }, 0)
      );

      const scriptWordCount = draft.scriptSynopsis.trim()
        ? draft.scriptSynopsis.trim().split(/\s+/).length
        : 18;

      // 1. Pre-compute authentic engine metrics (technical quality vs decoupled commercial appeal)
      const prelimFin = calculateFinancialsAndQuality({
        format: draft.format,
        episodes: draft.episodes,
        seriesSeason: draft.seriesSeason,
        filmSeason: draft.filmSeason,
        primaryGenre: draft.primaryGenre,
        secondaryGenre: draft.secondaryGenre,
        ageRating: draft.ageRating,
        director,
        coDirector,
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
        aiBoxOfficeMultiplier: 1.0,
        marketRegion: currentRegion,
        selectedDistributionMarkets: draft.selectedDistributionMarkets,
        scriptWordCount,
        scriptSynopsis: draft.scriptSynopsis,
        totalBackendPointsPercent,
        previousGenres: releasedProjects.slice(0, 3).map((p) => p.primaryGenre),
        worldMarket,
      });

      // 2. Evaluate release via AI using the REAL engine quality & commercial appeal
      const allCompetitors = [...db.competitor_studios, ...emergingCompetitors];
      const availableRivalStars = liveActors
        .filter(
          (a) =>
            !draft.leadActorIds.includes(a.id) &&
            a.id !== draft.antagonistId &&
            (a.tier === 'S' || a.tier === 'A')
        )
        .slice(0, 12)
        .map((a) => ({
          name: localizeEntityName(a.name, uiLanguage),
          tier: a.tier,
        }));

      let aiEval: any = null;
      try {
        const res = await fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'evaluate_release',
            studioInstanceId: getOrCreateStudioInstanceId(),
            groqKeyOverride: groqApiKeyClient,
            preferredModel: preferredGroqModel,
            payload: {
              title: draft.title,
              synopsis: draft.scriptSynopsis,
              format: draft.format,
              episodes: draft.episodes,
              genre: primaryGenreLocalized.name,
              primaryGenre: primaryGenreLocalized.name,
              directorName: allDirectorsDisplayName,
              leadName: localizedLeadNames.join(listJoiner),
              leadActors: localizedLeadNames,
              antagonistName: localizedAntagonistName,
              studioName,
              ceoName,
              hypeScore: draft.hypeScore,
              technicalQuality: prelimFin.technicalQuality,
              commercialAppeal: prelimFin.commercialAppeal,
              expectedCriticScore: prelimFin.expectedCriticScore,
              expectedAudienceScore: prelimFin.expectedAudienceScore,
              competitorStudios: allCompetitors.slice(0, 6).map((s) => ({
                name: localizeEntityName(s.name, uiLanguage),
                specialty: s.specialty,
              })),
              availableStars: availableRivalStars,
              aiMemoryLog,
              worldMarket,
              uiLanguage,
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
          : 1.02;
      const aiMult = Math.max(0.55, Math.min(1.4, rawAiMult));

      const assetBenefits = getStudioAssetBenefits(ownedStudioAssets);

      // 3. Final financial simulation modulated by AI market response
      const fin = calculateFinancialsAndQuality({
        format: draft.format,
        episodes: draft.episodes,
        seriesSeason: draft.seriesSeason,
        filmSeason: draft.filmSeason,
        primaryGenre: draft.primaryGenre,
        secondaryGenre: draft.secondaryGenre,
        ageRating: draft.ageRating,
        director,
        coDirector,
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
        qualityModifier: draft.qualityModifier + assetBenefits.totalQualityBonus,
        aiBoxOfficeMultiplier: aiMult,
        marketRegion: currentRegion,
        selectedDistributionMarkets: draft.selectedDistributionMarkets,
        scriptWordCount,
        scriptSynopsis: draft.scriptSynopsis,
        totalBackendPointsPercent,
        previousGenres: releasedProjects.slice(0, 3).map((p) => p.primaryGenre),
        worldMarket,
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

      const rawDeptCost =
        draft.budgetAllocation.setsAndLocations +
        draft.budgetAllocation.costumesAndMakeup +
        draft.budgetAllocation.vfxAndStunts +
        draft.budgetAllocation.extrasAndCrowds;
      const deptCost = Math.round(rawDeptCost * assetBenefits.costMultiplier);

      const totalBudget =
        talentCost +
        deptCost +
        draft.marketingBudget +
        fin.distributionFeesTotal;

      const marketDirectors = db.crew.filter((c) => c.role === 'director');
      const fallbackRivals = generateRivalReleases(
        allCompetitors,
        liveActors,
        [...draft.leadActorIds, ...(draft.antagonistId ? [draft.antagonistId] : [])],
        1.02,
        currentYear + releasedProjects.length,
        draft.format,
        worldMarket,
        marketDirectors,
        uiLanguage
      );

      const rawRivals =
        Array.isArray(aiEval?.rival_releases) && aiEval.rival_releases.length >= 2
          ? aiEval.rival_releases.map((r: any, idx: number) => {
              const fb = fallbackRivals[idx % fallbackRivals.length];
              const rawCrit = Number(r.criticScore ?? fb?.criticScore ?? 7.0);
              const normCrit = rawCrit > 10 ? rawCrit / 10 : rawCrit;
              const rawAud = Number(r.audienceScore ?? fb?.audienceScore ?? normCrit + 0.3);
              const normAud = rawAud > 10 ? rawAud / 10 : rawAud;
              const traj =
                r.trajectory === 'front_loaded' ||
                r.trajectory === 'sleeper' ||
                r.trajectory === 'steady'
                  ? r.trajectory
                  : fb?.trajectory || 'steady';
              return {
                id: `ai_riv_${Date.now()}_${idx}`,
                studioName: String(
                  r.studioName ||
                    fb?.studioName ||
                    (isEn ? 'Rival Studio' : 'استوديو منافس')
                ),
                title: String(
                  r.title ||
                    fb?.title ||
                    (isEn ? 'Rival Feature' : 'عمل منافس')
                ),
                genre: String(r.genre || primaryGenreLocalized.name),
                leadStarName: String(
                  r.leadStarName ||
                    fb?.leadStarName ||
                    (isEn ? 'A-List Lead' : 'نجم صف أول')
                ),
                directorName: String(
                  r.directorName ||
                    fb?.directorName ||
                    localizeEntityName(
                      marketDirectors[idx % Math.max(1, marketDirectors.length)]?.name || '',
                      uiLanguage
                    )
                ),
                boxOfficeRevenue: Math.max(
                  24_000_000,
                  Math.min(175_000_000, Number(r.boxOfficeRevenue) || fb?.boxOfficeRevenue || 76_000_000)
                ),
                criticScore: Number(Math.min(9.5, Math.max(4.2, normCrit)).toFixed(1)),
                audienceScore: Number(Math.min(9.6, Math.max(4.4, normAud)).toFixed(1)),
                trajectory: traj,
                status: r.status === 'delayed' ? ('delayed' as const) : ('released' as const),
                delayReason: r.delayReason ? String(r.delayReason) : undefined,
              };
            })
          : fallbackRivals;

      // Trajectory-based Day 1 Opening:
      // front_loaded commercial movies open hotter (~30%) then fade; sleepers open softer (~17%) then surge past rivals!
      const getOpeningShare = (traj?: string) =>
        traj === 'front_loaded' ? 0.3 : traj === 'sleeper' ? 0.17 : 0.23;

      const rivalReleases = rawRivals.map((r: any) => {
        const targetRev = Math.max(24_000_000, r.boxOfficeRevenue);
        const rOpenShare = getOpeningShare(r.trajectory);
        const day1Rev =
          r.status === 'delayed'
            ? 0
            : Math.max(5_500_000, Math.round(targetRev * rOpenShare));
        return {
          ...r,
          boxOfficeRevenue: day1Rev,
          targetBoxOfficeRevenue: targetRev,
          lastDailyDelta: day1Rev,
        };
      });

      // Normalize 10-point scores accurately (NEVER divide an already 10-point score by 10!)
      const normalizeScore10 = (raw: unknown, fallback: number, min: number, max: number) => {
        if (typeof raw !== 'number' || Number.isNaN(raw)) return fallback;
        const scaled = raw > 10 ? raw / 10 : raw;
        return Math.min(max, Math.max(min, scaled));
      };

      const baseCritic10 = fin.expectedCriticScore;
      const aiCritic10 = normalizeScore10(aiEval?.critic_score, baseCritic10, 2.4, 9.7);
      const criticScore10 = Number((baseCritic10 * 0.55 + aiCritic10 * 0.45).toFixed(1));

      const baseAudience10 = fin.expectedAudienceScore;
      const aiAudience10 = normalizeScore10(aiEval?.audience_score, baseAudience10, 2.8, 9.8);
      const audienceScore10 = Number((baseAudience10 * 0.52 + aiAudience10 * 0.48).toFixed(1));

      const targetGrossRevenue = fin.totalGrossRevenue;
      const targetBoxOfficeRevenue = fin.totalBoxOfficeRevenue;
      const targetStreamingRevenue = fin.totalStreamingRevenue;
      const playerOpenShare = getOpeningShare(fin.trajectory);

      const day1BoxOfficeRevenue = Math.max(
        2_200_000,
        Math.round(targetBoxOfficeRevenue * playerOpenShare)
      );
      const day1StreamingRevenue = Math.max(
        1_200_000,
        Math.round(targetStreamingRevenue * playerOpenShare)
      );
      const day1GrossRevenue = day1BoxOfficeRevenue + day1StreamingRevenue;

      const activeDay1Rivals = rivalReleases.filter((r: any) => r.status !== 'delayed');
      const allRevs = [
        day1GrossRevenue,
        ...activeDay1Rivals.map((r: any) => r.boxOfficeRevenue),
      ].sort((a, b) => b - a);
      const boxOfficeRank = Math.max(1, allRevs.indexOf(day1GrossRevenue) + 1);
      const topDay1Rival =
        activeDay1Rivals.length > 0
          ? Math.max(...activeDay1Rivals.map((r: any) => r.boxOfficeRevenue))
          : 0;

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
          ? Number(Math.max(0.9, targetViewershipMillions * playerOpenShare).toFixed(1))
          : undefined;

      const safeTitle =
        draft.title || (isEn ? 'Untitled Production' : 'عمل سينمائي');
      const hashtagSlug = safeTitle.replace(/\s+/g, '_');

      const fallbackReviews = isEn
        ? [
            {
              criticName:
                worldMarket === 'saudi' ? 'Faisal Al-Harbi' : 'Tarek El-Sawy',
              publication:
                worldMarket === 'saudi'
                  ? 'Riyadh Screen Review'
                  : 'Cairo Cinema Dispatch',
              sentiment: (criticScore10 >= 7.2 ? 'positive' : 'mixed') as
                | 'positive'
                | 'mixed',
              quote: `"${safeTitle}" carries a distinct directorial signature from ${allDirectorsDisplayName} with compelling dramatic craft.`,
              score: criticScore10,
            },
            {
              criticName:
                worldMarket === 'saudi' ? 'Noura Al-Qahtani' : 'Mona Abdelrahman',
              publication:
                worldMarket === 'saudi'
                  ? 'Arabian Box Office Weekly'
                  : 'Nile Arts Quarterly',
              sentiment: (audienceScore10 >= 7.5 ? 'positive' : 'mixed') as
                | 'positive'
                | 'mixed',
              quote: `Electric chemistry between ${localizedLeadNames.join(' & ') || 'the lead cast'} drives strong opening-day word of mouth.`,
              score: audienceScore10,
            },
          ]
        : [
            {
              criticName: marketAiCtx.fallbackCritics[0]?.name || 'ناقد سينمائي',
              publication:
                marketAiCtx.fallbackCritics[0]?.publication || 'الصحافة الفنية',
              sentiment: (criticScore10 >= 7.2 ? 'positive' : 'mixed') as
                | 'positive'
                | 'mixed',
              quote: `عمل فني يحمل بصمة واضحة في «${safeTitle}» بقيادة المخرج ${allDirectorsDisplayName} ويقدم معالجة درامية لافتة.`,
              score: criticScore10,
            },
            {
              criticName: marketAiCtx.fallbackCritics[1]?.name || 'محرر فني',
              publication:
                marketAiCtx.fallbackCritics[1]?.publication || 'مجلة الشاشة',
              sentiment: (audienceScore10 >= 7.5 ? 'positive' : 'mixed') as
                | 'positive'
                | 'mixed',
              quote: `تناغم واضح بين الأبطال (${localizedLeadNames.join(' و')}) مع إقبال جماهيري قوي منذ اليوم الأول.`,
              score: audienceScore10,
            },
          ];

      const fallbackSocialPosts = isEn
        ? [
            {
              handle: marketAiCtx.socialHandles[0],
              platform: 'X',
              content: `#${hashtagSlug} is a genuinely crafted release — standout performances from the very first scene!`,
              likes: '24.5K',
            },
            {
              handle: marketAiCtx.socialHandles[2],
              platform: 'TikTok',
              content: `Clips from "${safeTitle}" are dominating feeds everywhere as audiences praise the story and direction.`,
              likes: '61.2K',
            },
          ]
        : [
            {
              handle: marketAiCtx.socialHandles[0],
              platform: 'X',
              content: `#${hashtagSlug} عمل متعوب عليه جداً وأداء تمثيلي خطف الأنظار من أول مشهد! 🔥👏`,
              likes: '24.5K',
            },
            {
              handle: marketAiCtx.socialHandles[2],
              platform: 'TikTok',
              content: `مشاهد «${safeTitle}» متصدرة التريند والجمهور يشيد بقوة القصة والإخراج ✨`,
              likes: '61.2K',
            },
          ];

      const record: ReleasedProjectRecord = {
        id: `proj_${Date.now()}`,
        title: safeTitle,
        year: currentYear,
        format: draft.format,
        episodes: isSeries ? draft.episodes : undefined,
        seasonName: isSeries
          ? draft.seriesSeason === 'ramadan'
            ? localizedMarket.seriesSeasonPrimaryLabel
            : localizedMarket.seriesSeasonOffLabel
          : localizedMarket.filmSeasons.find((s) => s.id === draft.filmSeason)?.label ||
            localizedMarket.filmSeasons[0]?.label ||
            tr(uiLanguage, 'Theatrical Season', 'الموسم السينمائي'),
        primaryGenre: draft.primaryGenre,
        secondaryGenre: draft.secondaryGenre,
        ageRating: draft.ageRating,
        synopsis: draft.scriptSynopsis,
        directorId: director.id,
        directorName: allDirectorsDisplayName,
        leadNames: localizedLeadNames,
        antagonistName: localizedAntagonistName || undefined,
        cameoNames: localizedCameoNames,
        actorIdsInCast: [
          ...draft.leadActorIds,
          ...(draft.antagonistId ? [draft.antagonistId] : []),
          ...draft.supportingActorIds,
        ],
        castCustomRoles: draft.castCustomRoles,
        totalBudget,
        distributionFeesTotal: fin.distributionFeesTotal,
        selectedDistributionMarkets: draft.selectedDistributionMarkets,
        backendPointsTotalPercent: totalBackendPointsPercent,
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
        previousBoxOfficeRank: boxOfficeRank,
        lastDailyRevenueDelta: day1GrossRevenue,
        trajectory: fin.trajectory,
        revenueHistory: [
          {
            day: 1,
            playerTotal: day1GrossRevenue,
            topRivalTotal: topDay1Rival,
          },
        ],
        reviews: Array.isArray(aiEval?.reviews)
          ? aiEval.reviews.map((rev: any) => ({
              criticName: String(
                rev.criticName || (isEn ? 'Film Critic' : 'ناقد سينمائي')
              ),
              publication: String(
                rev.publication || (isEn ? 'Entertainment Press' : 'الصحافة الفنية')
              ),
              sentiment:
                rev.sentiment === 'positive' || rev.sentiment === 'negative'
                  ? rev.sentiment
                  : 'mixed',
              quote: String(rev.quote || ''),
              score: Number(
                (Number(rev.score) > 10 ? Number(rev.score) / 10 : Number(rev.score) || criticScore10).toFixed(1)
              ),
            }))
          : fallbackReviews,
        socialPosts: Array.isArray(aiEval?.social_posts || aiEval?.socialPosts)
          ? (aiEval.social_posts || aiEval.socialPosts)
          : fallbackSocialPosts,
        viralTrendLabel:
          aiEval?.viral_trend_label ||
          aiEval?.viralTrendLabel ||
          (isEn
            ? `#${hashtagSlug} trending #1 across regional searches`
            : `#${hashtagSlug} يتصدر قوائم البحث`),
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
          ? tr(uiLanguage, 'TV & Streaming Premiere', 'افتتاح البث التلفزيوني والرقمي')
          : tr(uiLanguage, 'Theatrical Box Office Opening', 'افتتاح شباك التذاكر السينمائي'),
        headline: isSeries
          ? isEn
            ? `Episode 1 of "${record.title}" premieres with ${viewershipMillions}M views`
            : `انطلاق بث الحلقة الأولى من «${record.title}» بـ ${viewershipMillions}M مشاهدة`
          : isEn
          ? `Strong theatrical opening for "${record.title}" at ${formatMoney(record.totalGrossRevenue)} ${currencyLabel}`
          : `افتتاح سينمائي قوي لفيلم «${record.title}» بـ ${formatMoney(record.totalGrossRevenue)} ${currencyLabel}`,
        detail: isSeries
          ? isEn
            ? `The premiere episode of "${record.title}" directed by ${allDirectorsDisplayName} sparked widespread buzz and earned a ${record.criticScore}/10 critic score.`
            : `حصدت الحلقة الافتتاحية من مسلسل «${record.title}» إخراج ${allDirectorsDisplayName} تفاعلاً جماهيرياً واسعاً وتقييم ${record.criticScore}/10 من النقاد.`
          : isEn
          ? `"${record.title}" directed by ${allDirectorsDisplayName} debuted in cinemas at Rank #${record.boxOfficeRank} amid fierce seasonal competition with a ${record.criticScore}/10 critic score.`
          : `انطلق عرض فيلم «${record.title}» إخراج ${allDirectorsDisplayName} في قاعات السينما بالمركز #${record.boxOfficeRank} وسط منافسة محتدمة وتقييم ${record.criticScore}/10.`,
        highlightName: record.title,
        extraStatBadge: isSeries
          ? `${viewershipMillions}M ${tr(uiLanguage, 'views', 'مشاهدة')}`
          : `${formatMoney(record.totalGrossRevenue)} ${currencyLabel}`,
        gameImpactLabel: isEn
          ? `Season Rank #${record.boxOfficeRank} · Critics ${record.criticScore}/10`
          : `المركز #${record.boxOfficeRank} في سباق الموسم · تقييم النقاد ${record.criticScore}/10`,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const releasedTitle = lastReleasedProject?.title || draft.title;

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-28" dir={uiDir}>
      {/* Unified Royal Cinema Header */}
      <div className="rounded-3xl border-2 border-[#D4AF37] bg-[#1A2530] px-4 py-3.5 text-[#F9F6F0] shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37] bg-[#D91624] text-white shadow-sm">
              {isSeries ? <Tv className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
            </div>
            <div>
              <span className="text-[10px] font-black text-[#D4AF37]">
                {tr(
                  uiLanguage,
                  'Distribution, Premiere & Box Office War Room',
                  'غرفة التوزيع والعرض وشباك التذاكر'
                )}
              </span>
              <h2 className="font-display text-sm font-black text-[#F9F6F0] sm:text-base">
                {wizardStep === 1
                  ? isSeries
                    ? isEn
                      ? `Marketing, Streaming & TV Deals: "${draft.title}"`
                      : `إعداد التسويق وعقود البث والفضائيات: «${draft.title}»`
                    : isEn
                    ? `Marketing Campaign & Theater Screens: "${draft.title}"`
                    : `إعداد الحملة الترويجية وشاشات العرض: «${draft.title}»`
                  : isSeries
                  ? isEn
                    ? `Live Viewership & Critic Reviews: "${releasedTitle}"`
                    : `متابعة المشاهدات المليونية وتقييمات النقاد: «${releasedTitle}»`
                  : isEn
                  ? `Live Box Office & Season Race: "${releasedTitle}"`
                  : `متابعة إيرادات شباك التذاكر ومنافسة الموسم: «${releasedTitle}»`}
              </h2>
            </div>
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
            <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 space-y-4 shadow-sm">
              <h3 className="font-display text-sm font-black text-[#1A2530]">
                {tr(
                  uiLanguage,
                  'Marketing Campaign & Screen Count',
                  'الحملة الترويجية وشاشات العرض'
                )}
              </h3>

              <div className="rounded-xl border border-[#1A2530]/15 bg-[#F9F6F0] p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1A2530]">
                    {tr(
                      uiLanguage,
                      'Marketing & Advertising Budget',
                      'ميزانية الإعلانات والدعاية (Marketing)'
                    )}
                  </span>
                  <span className="font-mono text-xs font-black text-[#D91624]" dir="ltr">
                    {formatMoney(draft.marketingBudget)} {currencyLabel}
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
                  className="w-full accent-[#D91624] cursor-pointer"
                />
                <div className="mt-2 rounded-lg border border-[#1A2530]/15 bg-white p-2.5 space-y-1.5 text-[10px] font-bold">
                  <div className="grid grid-cols-2 gap-1.5 text-[#1A2530]/75">
                    <div>
                      {tr(uiLanguage, 'Cast & Crew Contracts:', 'عقود النجوم والطاقم:')}{' '}
                      <span className="font-mono font-black text-[#1A2530]">
                        {formatMoney(estimatedTalentCost)}
                      </span>
                    </div>
                    <div>
                      {tr(uiLanguage, 'Production Departments:', 'الأقسام الإنتاجية:')}{' '}
                      <span className="font-mono font-black text-[#1A2530]">
                        {formatMoney(estimatedDeptCost)}
                      </span>
                    </div>
                    <div>
                      {tr(uiLanguage, 'Marketing Spend:', 'ميزانية الدعاية:')}{' '}
                      <span className="font-mono font-black text-[#D91624]">
                        {formatMoney(draft.marketingBudget)}
                      </span>
                    </div>
                    <div>
                      {tr(uiLanguage, 'Intl. Distribution Fees:', 'رسوم التوزيع الدولي:')}{' '}
                      <span className="font-mono font-black text-[#1A2530]">
                        {formatMoney(estimatedDistributionFees)}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-[#1A2530]/10 pt-1.5 flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[#1A2530]/75">
                      {tr(uiLanguage, 'Available Studio Cash:', 'السيولة المتاحة بالخزينة:')}{' '}
                      <span className="font-mono font-black text-[#1A2530]" dir="ltr">
                        {formatMoney(cash)} {currencyLabel}
                      </span>
                    </span>
                    {isOverTotalLiquidity ? (
                      <span className="text-[#D91624] font-black">
                        {isEn
                          ? `Total cost (${formatMoney(totalLaunchCost)} ${currencyLabel}) exceeds cash by ${formatMoney(liquidityDeficit)} ${currencyLabel}!`
                          : `⚠️ التكلفة الكاملة (${formatMoney(totalLaunchCost)} ${currencyLabel}) تتجاوز سيولتك بعجز ${formatMoney(liquidityDeficit)} ${currencyLabel}!`}
                      </span>
                    ) : (
                      <span className="text-[#15803D] font-black">
                        {isEn
                          ? `Total launch cost: ${formatMoney(totalLaunchCost)} ${currencyLabel} ✓`
                          : `إجمالي التكلفة عند الإطلاق: ${formatMoney(totalLaunchCost)} ${currencyLabel} ✓`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isSeries && (
                <div className="rounded-xl border border-[#1A2530]/15 bg-[#F9F6F0] p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-black text-[#1A2530]">
                      {tr(
                        uiLanguage,
                        'Booked Cinema Screens & Halls',
                        'عدد قاعات وشاشات السينما المحجوزة'
                      )}
                    </span>
                    <span className="font-mono text-xs font-black text-[#B8860B]">
                      {draft.screensCount} {tr(uiLanguage, 'screens', 'شاشة عرض')}
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
                    className="w-full accent-[#D4AF37] cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Streaming Platforms (always) & TV Channels (Series ONLY — films earn from cinema + VOD!) */}
            <div
              className={`grid grid-cols-1 gap-3 ${
                isSeries ? 'sm:grid-cols-2' : ''
              }`}
            >
              {/* Digital Platforms */}
              <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 space-y-2.5 shadow-sm">
                <h3 className="flex items-center gap-1.5 text-xs font-black text-[#1A2530]">
                  <Globe className="h-4 w-4 text-[#D91624]" />
                  {tr(
                    uiLanguage,
                    'Digital Streaming Platform (Streaming / VOD)',
                    'منصة البث الرقمي (Streaming / VOD)'
                  )}
                </h3>
                <div
                  className={`grid grid-cols-1 gap-2 ${
                    !isSeries ? 'sm:grid-cols-2' : ''
                  }`}
                >
                  {streamingPlatforms.map((plat) => {
                    const selected = effectiveSelectedPlatformId === plat.id;
                    const dealVal = Math.round(plat.budget_capacity * 320_000);
                    const localizedPlatName = localizeEntityName(
                      plat.name,
                      uiLanguage
                    );
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
                        className={`flex w-full items-center justify-between gap-2.5 rounded-xl border-2 p-2.5 text-start transition ${
                          selected
                            ? 'border-[#D91624] bg-[#FFF9E6] text-[#1A2530]'
                            : 'border-[#1A2530]/15 bg-[#F9F6F0] text-[#1A2530] hover:border-[#D4AF37]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#D4AF37] bg-[#1A2530] text-white">
                            {plat.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={plat.logo_url}
                                alt={localizedPlatName}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                                  if (next) next.style.display = 'inline';
                                }}
                                className="h-full w-full object-contain p-1"
                              />
                            ) : null}
                            <span
                              style={{ display: plat.logo_url ? 'none' : 'inline' }}
                              className="text-[10px] font-black text-[#D4AF37]"
                            >
                              VOD
                            </span>
                          </div>
                          <div>
                            <div className="text-xs font-black">
                              {localizedPlatName}
                            </div>
                            <div className="font-mono text-[10px] font-bold text-[#15803D]">
                              {tr(uiLanguage, 'Streaming deal:', 'عقد البث:')}{' '}
                              {formatMoney(dealVal)} {currencyLabel}
                            </div>
                          </div>
                        </div>
                        {selected && (
                          <Check className="h-4 w-4 shrink-0 text-[#D91624]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TV Channels — shown strictly for Series where broadcast deals apply */}
              {isSeries && (
                <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 space-y-2.5 shadow-sm">
                  <h3 className="flex items-center gap-1.5 text-xs font-black text-[#1A2530]">
                    <Tv className="h-4 w-4 text-[#D4AF37]" />
                    {tr(
                      uiLanguage,
                      'Satellite TV Broadcast Network',
                      'القناة التلفزيونية الفضائية الناقلة'
                    )}
                  </h3>
                  <div className="space-y-2">
                    {tvChannels.map((tv) => {
                      const selected = effectiveSelectedTvChannelId === tv.id;
                      const dealVal = Math.round(tv.budget_capacity * 260_000);
                      const localizedTvName = localizeEntityName(
                        tv.name,
                        uiLanguage
                      );
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
                          className={`flex w-full items-center justify-between gap-2.5 rounded-xl border-2 p-2.5 text-start transition ${
                            selected
                              ? 'border-[#D4AF37] bg-[#FFF9E6] text-[#1A2530]'
                              : 'border-[#1A2530]/15 bg-[#F9F6F0] text-[#1A2530] hover:border-[#D4AF37]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#D4AF37] bg-[#1A2530] text-white">
                              {tv.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={tv.logo_url}
                                  alt={localizedTvName}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                                    if (next) next.style.display = 'inline';
                                  }}
                                  className="h-full w-full object-contain p-1"
                                />
                              ) : null}
                              <span
                                style={{ display: tv.logo_url ? 'none' : 'inline' }}
                                className="text-[10px] font-black text-[#D4AF37]"
                              >
                                TV
                              </span>
                            </div>
                            <div>
                              <div className="text-xs font-black">
                                {localizedTvName}
                              </div>
                              <div className="font-mono text-[10px] font-bold text-[#15803D]">
                                {tr(uiLanguage, 'Broadcast rights:', 'حقوق العرض:')}{' '}
                                {formatMoney(dealVal)} {currencyLabel}
                              </div>
                            </div>
                          </div>
                          {selected && (
                            <Check className="h-4 w-4 shrink-0 text-[#D91624]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Regional Distribution Markets */}
            <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 space-y-3 shadow-sm">
              <h3 className="font-display text-xs font-black text-[#1A2530]">
                {tr(
                  uiLanguage,
                  'Regional & International Distribution Markets',
                  'أسواق التوزيع الإقليمية والدولية'
                )}
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {marketConfigs.map((m) => {
                  const isUnlocked = unlockedRegions.includes(m.id);
                  const reqLevel = getMarketRegionRequiredLevel(m.id, primaryRegion);
                  const isLevelLocked = !isUnlocked && progression.level < reqLevel;
                  const isSelected = (
                    draft.selectedDistributionMarkets || [primaryRegion]
                  ).includes(m.id);
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border-2 p-3 ${
                        isSelected
                          ? 'border-[#15803D] bg-emerald-50/70'
                          : isLevelLocked
                          ? 'border-[#1A2530]/15 bg-[#F9F6F0]/75 opacity-85'
                          : 'border-[#1A2530]/15 bg-[#F9F6F0]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-black text-[#1A2530]">
                          {isLevelLocked && <Lock className="h-3 w-3 text-[#9A7209]" />}
                          <span>{m.name}</span>
                        </span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-900">
                          {m.id === primaryRegion
                            ? tr(uiLanguage, 'Home Market', 'السوق الأساسي')
                            : `+${Math.round(m.revenueBonusFactor * 100)}% ${tr(
                                uiLanguage,
                                'revenue',
                                'عوائد'
                              )}`}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-bold text-[#1A2530]/65">
                        {m.description}
                      </p>
                      <div className="mt-2">
                        {isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => toggleDraftDistributionMarket(m.id)}
                            className={`w-full rounded-lg py-1.5 text-[11px] font-black cursor-pointer ${
                              isSelected
                                ? 'bg-[#15803D] text-white'
                                : 'bg-[#1A2530]/10 text-[#1A2530]'
                            }`}
                          >
                            {isSelected
                              ? tr(
                                  uiLanguage,
                                  'Active in Distribution ✓',
                                  'سوق معتمد في التوزيع ✓'
                                )
                              : tr(
                                  uiLanguage,
                                  'Enable Distribution',
                                  'تفعيل التوزيع'
                                )}
                          </button>
                        ) : isLevelLocked ? (
                          <button
                            type="button"
                            onClick={() => unlockMarketRegionWithCash(m.id)}
                            className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-[#D4AF37]/80 bg-[#1A2530] py-1.5 text-[11px] font-black text-[#FDE68A] cursor-pointer"
                          >
                            <Lock className="h-3 w-3 text-[#D4AF37]" />
                            <span>
                              {reqLevel === 3
                                ? tr(uiLanguage, 'Unlocks at Level 3 (250M + 1 Award)', 'يُفتح مستوى 3 (250M + جائزة)')
                                : tr(uiLanguage, 'Unlocks at Level 4 (550M + 3 Awards)', 'يُفتح مستوى 4 (550M + 3 جوائز)')}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const ok = unlockMarketRegionWithCash(m.id);
                              if (!ok) {
                                showToast(
                                  isEn
                                    ? `Unlocking ${m.name} requires ${formatMoney(m.earlyLicenseCost)} ${currencyLabel} in cash.`
                                    : `يتطلب فتح ${m.name} سيولة ${formatMoney(m.earlyLicenseCost)} ${currencyLabel}`,
                                  'warning'
                                );
                              }
                            }}
                            className="w-full rounded-lg border border-[#D4AF37] bg-[#1A2530] py-1.5 text-[11px] font-black text-[#D4AF37] hover:brightness-110 cursor-pointer"
                          >
                            {isEn
                              ? `Unlock Market License (${formatMoney(m.earlyLicenseCost)} ${currencyLabel})`
                              : `فتح ترخيص السوق (${formatMoney(m.earlyLicenseCost)} ${currencyLabel})`}
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

        {/* STEP 2: LIVE RELEASE RESULTS (MOBILE-FIRST 2-TAB SPLIT: BOX OFFICE VS CRITICS & AUDIENCE) */}
        {wizardStep === 2 && lastReleasedProject && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3.5"
          >
            {/* COMPACT MOBILE-FIRST HERO HEADER + SEGMENTED TAB SWITCHER */}
            <div className="rounded-3xl bg-[#1A2530] text-[#F9F6F0] p-4 border-2 border-[#D4AF37] shadow-xl space-y-3">
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-typewriter font-black text-[#D4AF37] uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-[#D91624] animate-pulse shrink-0" />
                    <span className="truncate">
                      {isSeries
                        ? tr(uiLanguage, 'LIVE BROADCAST RUN', 'بث المسلسل المباشر')
                        : tr(uiLanguage, 'LIVE BOX OFFICE RUN', 'شباك التذاكر المباشر')}
                    </span>
                    <span className="text-white/50">·</span>
                    <span className="text-[#4ADE80]">
                      #{lastReleasedProject.boxOfficeRank}
                    </span>
                  </div>
                  <h3 className="font-display text-lg sm:text-xl text-[#F9F6F0] truncate mt-0.5">
                    {lastReleasedProject.title}
                  </h3>
                </div>

                <div className="shrink-0 text-end">
                  <span className="block text-[9px] font-bold text-[#D4AF37]">
                    {isSeries
                      ? tr(uiLanguage, 'Total Revenue', 'إجمالي العوائد')
                      : tr(uiLanguage, 'Box Office Gross', 'إيرادات الشباك')}
                  </span>
                  <div className="mt-0.5">
                    <SpinningOdometerRevenue
                      targetValue={lastReleasedProject.totalGrossRevenue}
                    />
                  </div>
                </div>
              </div>

              {/* Clean 2-Tab Segmented Switcher: Box Office vs Critics & Audience */}
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#0F171E] p-1 border border-[#D4AF37]/30">
                <button
                  type="button"
                  onClick={() => setResultsTab('box_office')}
                  className={`min-h-[42px] rounded-xl px-3 py-2 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    resultsTab === 'box_office'
                      ? 'bg-[#D4AF37] text-[#1A2530] shadow'
                      : 'text-[#F9F6F0]/75 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span>
                    {tr(uiLanguage, 'Box Office & Run', 'الإيرادات والشباك')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setResultsTab('critics')}
                  className={`min-h-[42px] rounded-xl px-3 py-2 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    resultsTab === 'critics'
                      ? 'bg-[#D91624] text-white shadow'
                      : 'text-[#F9F6F0]/75 hover:text-white'
                  }`}
                >
                  <Star className="w-4 h-4 shrink-0" />
                  <span>
                    {tr(uiLanguage, 'Critics & Audience', 'النقاد والجمهور')}
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black tabular-nums ${
                      resultsTab === 'critics'
                        ? 'bg-black/25 text-[#FDE68A]'
                        : 'bg-white/10 text-[#D4AF37]'
                    }`}
                  >
                    {lastReleasedProject.criticScore}
                  </span>
                </button>
              </div>
            </div>

            {/* TAB 1: BOX OFFICE, REVENUE CHART, RUN TRACKER & RIVAL STANDINGS */}
            {resultsTab === 'box_office' && (
              <div className="space-y-3.5">
                {/* Compact 3-Metric Financial Strip */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border-2 border-[#1A2530]/20 bg-white p-2.5">
                    <span className="block text-[10px] font-bold text-[#1A2530]/65">
                      {isSeries &&
                      (lastReleasedProject.viewershipMillions ||
                        simInsights?.viewershipMillions)
                        ? tr(uiLanguage, 'Viewership', 'المشاهدات')
                        : tr(uiLanguage, 'Net Profit', 'صافي الربح')}
                    </span>
                    {isSeries &&
                    (lastReleasedProject.viewershipMillions ||
                      simInsights?.viewershipMillions) ? (
                      <span className="inline-flex items-center justify-center gap-1 font-mono text-xs sm:text-sm font-black text-[#1A2530] tabular-nums">
                        <Eye className="h-3.5 w-3.5 text-[#D91624]" />
                        {lastReleasedProject.viewershipMillions ||
                          simInsights?.viewershipMillions}
                        M
                      </span>
                    ) : (
                      <span
                        dir="ltr"
                        className={`font-mono text-xs sm:text-sm font-black tabular-nums ${
                          lastReleasedProject.netProfit >= 0
                            ? 'text-[#15803D]'
                            : 'text-[#D91624]'
                        }`}
                      >
                        {formatMoney(lastReleasedProject.netProfit)} {currencyLabel}
                      </span>
                    )}
                  </div>

                  <div className="rounded-2xl border-2 border-[#1A2530]/20 bg-white p-2.5">
                    <span className="block text-[10px] font-bold text-[#1A2530]/65">
                      {tr(uiLanguage, 'Total Budget', 'التكلفة الإجمالية')}
                    </span>
                    <span
                      dir="ltr"
                      className="font-mono text-xs sm:text-sm font-black text-[#1A2530] tabular-nums"
                    >
                      {formatMoney(lastReleasedProject.totalBudget)} {currencyLabel}
                    </span>
                  </div>

                  <div className="rounded-2xl border-2 border-[#D4AF37] bg-[#FFF9E6] p-2.5">
                    <span className="block text-[10px] font-bold text-[#1A2530]/70">
                      {tr(uiLanguage, 'Chart Rank', 'ترتيب الموسم')}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-black text-[#1A2530] tabular-nums">
                      #{lastReleasedProject.boxOfficeRank}
                    </span>
                  </div>
                </div>

                {Boolean(lastReleasedProject.backendPointsTotalPercent) && (
                  <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#D4AF37] bg-[#FFF9E6] px-3 py-2 text-[11px] font-bold text-[#1A2530]">
                    <span className="truncate">
                      {isEn
                        ? `Talent backend points (${lastReleasedProject.backendPointsTotalPercent}%)`
                        : `حصة نسب أرباح النجوم (${lastReleasedProject.backendPointsTotalPercent}%)`}
                    </span>
                    <span className="font-mono font-black text-[#D91624] shrink-0 tabular-nums" dir="ltr">
                      -{formatMoney(lastReleasedProject.backendRoyaltiesPaid || 0)} {currencyLabel}
                    </span>
                  </div>
                )}

                {/* Compact Live Revenue Curve vs Top Rival */}
                {(() => {
                  const activeRivals = lastReleasedProject.rivalReleases.filter(
                    (r) => r.status !== 'delayed'
                  );
                  const topRivalNow =
                    activeRivals.length > 0
                      ? Math.max(...activeRivals.map((r) => r.boxOfficeRevenue))
                      : 0;
                  const history =
                    Array.isArray(lastReleasedProject.revenueHistory) &&
                    lastReleasedProject.revenueHistory.length > 0
                      ? lastReleasedProject.revenueHistory
                      : [
                          {
                            day: 1,
                            playerTotal: lastReleasedProject.totalGrossRevenue,
                            topRivalTotal: topRivalNow,
                          },
                        ];
                  const pointsData =
                    history.length === 1
                      ? [
                          { day: 0, playerTotal: 0, topRivalTotal: 0 },
                          history[0],
                        ]
                      : history;
                  const maxRevVal = Math.max(
                    10_000_000,
                    ...pointsData.flatMap((p) => [p.playerTotal, p.topRivalTotal])
                  );
                  const toPoints = (getter: (p: typeof pointsData[number]) => number) =>
                    pointsData
                      .map((pt, i) => {
                        const x = 14 + (i / Math.max(1, pointsData.length - 1)) * 472;
                        const y = 92 - (getter(pt) / maxRevVal) * 76;
                        return `${x.toFixed(1)},${y.toFixed(1)}`;
                      })
                      .join(' ');

                  return (
                    <div className="relative h-28 w-full rounded-2xl bg-[#0F171E] border-2 border-[#D4AF37]/45 p-2.5 overflow-hidden">
                      <svg viewBox="0 0 500 105" className="w-full h-full overflow-visible">
                        {[22, 52, 82].map((y) => (
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
                        <motion.polyline
                          key={`rival_line_${pointsData.length}`}
                          fill="none"
                          stroke="#D91624"
                          strokeWidth="2.5"
                          strokeDasharray="5 4"
                          points={toPoints((p) => p.topRivalTotal)}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.7 }}
                        />
                        <motion.polyline
                          key={`player_line_${pointsData.length}`}
                          fill="none"
                          stroke="#4ADE80"
                          strokeWidth="3.5"
                          points={toPoints((p) => p.playerTotal)}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.8 }}
                        />
                      </svg>
                      <div className="absolute bottom-1.5 inset-x-3 flex items-center justify-between text-[10px] font-typewriter font-bold">
                        <span className="text-[#4ADE80]">
                          ● {tr(uiLanguage, 'Yours', 'عملك')} ({formatMoney(lastReleasedProject.totalGrossRevenue)})
                        </span>
                        <span className="text-[#F87171]">
                          ● {tr(uiLanguage, 'Top Rival', 'أعلى منافس')} ({formatMoney(topRivalNow)})
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Live Run Day/Episode Progress & Strategic Boosts */}
                {(() => {
                  const totalSteps = isSeries
                    ? lastReleasedProject.episodes || 15
                    : 10;
                  const currentStep = Math.min(
                    totalSteps,
                    lastReleasedProject.daysTracked || 1
                  );
                  const isRunComplete = currentStep >= totalSteps;
                  const progressPct = Math.min(
                    100,
                    Math.round((currentStep / totalSteps) * 100)
                  );
                  const visualMarkers = isSeries
                    ? Math.min(10, totalSteps)
                    : totalSteps;

                  return (
                    <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-3.5 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-black text-[#1A2530]">
                            {isRunComplete ? (
                              <Check className="h-4 w-4 text-[#15803D] shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-[#D91624] animate-pulse shrink-0" />
                            )}
                            <span className="truncate">
                              {isSeries
                                ? isEn
                                  ? `Episode ${currentStep} / ${totalSteps}`
                                  : `الحلقة ${currentStep} / ${totalSteps}`
                                : isEn
                                ? `Box Office Day ${currentStep} / ${totalSteps}`
                                : `شباك التذاكر: اليوم ${currentStep} / ${totalSteps}`}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-[#1A2530]/60">
                            {isRunComplete
                              ? tr(uiLanguage, 'Run finished — settled in treasury', 'اكتمل العرض وأُضيفت الإيرادات للخزينة')
                              : tr(uiLanguage, 'Updates automatically with studio clock', 'يتحدث تلقائياً مع ساعة اللعبة')}
                          </span>
                        </div>

                        {typeof lastReleasedProject.lastDailyRevenueDelta ===
                          'number' &&
                          lastReleasedProject.lastDailyRevenueDelta > 0 && (
                            <div className="rounded-xl border border-[#15803D]/30 bg-[#15803D]/10 px-2.5 py-1 text-end shrink-0">
                              <span className="block text-[9px] font-bold text-[#15803D]">
                                {tr(uiLanguage, 'Latest Day', 'آخر يوم')}
                              </span>
                              <span
                                dir="ltr"
                                className="font-typewriter text-xs font-black text-[#15803D] tabular-nums"
                              >
                                +{formatMoney(lastReleasedProject.lastDailyRevenueDelta)}
                              </span>
                            </div>
                          )}
                      </div>

                      <div className="space-y-1.5">
                        <div
                          className="grid gap-1"
                          style={{
                            gridTemplateColumns: `repeat(${visualMarkers}, minmax(0, 1fr))`,
                          }}
                        >
                          {Array.from({ length: visualMarkers }).map((_, idx) => {
                            const stepVal = isSeries
                              ? Math.round(((idx + 1) / visualMarkers) * totalSteps)
                              : idx + 1;
                            const prevVal = isSeries
                              ? Math.round((idx / visualMarkers) * totalSteps)
                              : idx;
                            const isPassed = currentStep > stepVal;
                            const isCurrent =
                              currentStep <= stepVal && currentStep > prevVal;
                            return (
                              <div
                                key={idx}
                                className={`flex flex-col items-center justify-center rounded-lg py-1 border ${
                                  isCurrent
                                    ? 'bg-[#1A2530] text-[#D4AF37] border-[#D4AF37]'
                                    : isPassed
                                    ? 'bg-[#15803D]/15 text-[#15803D] border-[#15803D]/35'
                                    : 'bg-[#F9F6F0] text-[#1A2530]/40 border-[#1A2530]/10'
                                }`}
                              >
                                <span className="font-typewriter text-[9px] font-black leading-none">
                                  {isEn
                                    ? isSeries
                                      ? `E${stepVal}`
                                      : `D${stepVal}`
                                    : isSeries
                                    ? `ح${stepVal}`
                                    : `ي${stepVal}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1A2530]/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#15803D] via-[#D4AF37] to-[#D91624] transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Compact Strategic Boosts */}
                      {(!lastReleasedProject.trollsCampaigned ||
                        !lastReleasedProject.intlDistributionAdUsed) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {!lastReleasedProject.trollsCampaigned && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerElectronicTrollsCampaign(
                                  lastReleasedProject.id
                                );
                              }}
                              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D91624] bg-[#D91624] px-3 py-2 text-xs font-black text-white hover:brightness-110 cursor-pointer"
                            >
                              <Bot className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                              <span className="truncate">
                                {isEn
                                  ? `Viral Push (2M ${currencyLabel} · +15%)`
                                  : `حملة تريند (2M ${currencyLabel} · +15%)`}
                              </span>
                            </button>
                          )}

                          {!lastReleasedProject.intlDistributionAdUsed && (
                            <button
                              type="button"
                              onClick={async () => {
                                const adResult =
                                  await showRewardedAd('intl_distribution');
                                if (adResult.completed) {
                                  claimInternationalDistributionAdBonus(
                                    lastReleasedProject.id
                                  );
                                } else {
                                  const errMsg = getRewardedAdErrorMessage(
                                    adResult.reason,
                                    'لتفعيل مكافأة التوزيع الدولي',
                                    uiLanguage,
                                    'to activate the international distribution bonus'
                                  );
                                  if (errMsg) showToast(errMsg, 'warning');
                                }
                              }}
                              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#1A2530] bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] px-3 py-2 text-xs font-black text-[#1A2530] shadow-xs hover:brightness-105 cursor-pointer"
                            >
                              <Film className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {isEn
                                  ? `Intl. Bonus +25% (+${formatMoney(
                                      Math.round(
                                        lastReleasedProject.totalGrossRevenue * 0.25
                                      )
                                    )}) · Ad`
                                  : `توزيع دولي +25% (+${formatMoney(
                                      Math.round(
                                        lastReleasedProject.totalGrossRevenue * 0.25
                                      )
                                    )}) · إعلان`}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Season Box Office Leaderboard vs Rivals */}
                <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-3.5 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-black text-[#1A2530]">
                      <Trophy className="h-4 w-4 text-[#D4AF37]" />
                      {tr(
                        uiLanguage,
                        'Season Box Office Standings',
                        'جدول منافسة شباك التذاكر'
                      )}
                    </h3>
                    <span className="text-[10px] font-bold text-[#1A2530]/60">
                      {tr(uiLanguage, 'Ranked by gross', 'الترتيب بالإيرادات')}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      {
                        title: lastReleasedProject.title,
                        studioName,
                        leadStarName:
                          lastReleasedProject.leadNames[0] ||
                          tr(uiLanguage, 'Lead Star', 'بطل العمل'),
                        boxOfficeRevenue: lastReleasedProject.totalGrossRevenue,
                        criticScore: lastReleasedProject.criticScore,
                        audienceScore: lastReleasedProject.audienceScore,
                        previousRank: lastReleasedProject.previousBoxOfficeRank,
                        lastDailyDelta: lastReleasedProject.lastDailyRevenueDelta,
                        isPlayer: true,
                      },
                      ...lastReleasedProject.rivalReleases
                        .filter((r) => r.status !== 'delayed')
                        .map((r) => ({
                          ...r,
                          studioName: localizeEntityName(r.studioName, uiLanguage),
                          leadStarName: localizeEntityName(r.leadStarName, uiLanguage),
                          isPlayer: false,
                        })),
                    ]
                      .sort((a, b) => b.boxOfficeRevenue - a.boxOfficeRevenue)
                      .map((entry, idx) => {
                        const currentRank = idx + 1;
                        const rankDelta =
                          typeof entry.previousRank === 'number' &&
                          (lastReleasedProject.daysTracked || 1) > 1
                            ? entry.previousRank - currentRank
                            : 0;
                        return (
                          <div
                            key={`${entry.title}_${entry.studioName}`}
                            className={`flex items-center justify-between gap-2 rounded-xl border p-2 ${
                              entry.isPlayer
                                ? 'border-[#D4AF37] bg-[#FFF9E6] font-black'
                                : 'border-[#1A2530]/12 bg-[#F9F6F0]'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="flex flex-col items-center shrink-0">
                                <span
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-black ${
                                    currentRank === 1
                                      ? 'bg-[#D4AF37] text-[#1A2530]'
                                      : 'bg-[#1A2530] text-[#D4AF37]'
                                  }`}
                                >
                                  #{currentRank}
                                </span>
                                {rankDelta !== 0 && (
                                  <span
                                    className={`font-mono text-[9px] font-black ${
                                      rankDelta > 0 ? 'text-[#15803D]' : 'text-[#D91624]'
                                    }`}
                                  >
                                    {rankDelta > 0 ? `▲${rankDelta}` : `▼${Math.abs(rankDelta)}`}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-xs font-black text-[#1A2530]">
                                  <span className="truncate">{entry.title}</span>
                                  {entry.isPlayer && (
                                    <span className="rounded bg-[#D91624] px-1.5 py-0.5 text-[9px] text-white shrink-0">
                                      {tr(uiLanguage, 'Yours', 'عملك')}
                                    </span>
                                  )}
                                </div>
                                <div className="truncate text-[10px] font-bold text-[#1A2530]/60">
                                  {entry.studioName} · {entry.leadStarName}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 text-end">
                              <div className="font-mono text-xs font-black text-[#15803D] tabular-nums" dir="ltr">
                                {formatMoney(entry.boxOfficeRevenue)} {currencyLabel}
                              </div>
                              {typeof entry.lastDailyDelta === 'number' &&
                                entry.lastDailyDelta > 0 &&
                                (lastReleasedProject.daysTracked || 1) > 1 && (
                                  <div className="font-mono text-[9px] font-bold text-[#15803D]/80 tabular-nums">
                                    +{formatMoney(entry.lastDailyDelta)}
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CRITICS, AUDIENCE SCORES, REVIEWS & SOCIAL PULSE */}
            {resultsTab === 'critics' && (
              <div className="space-y-3.5">
                {/* Dual Critics vs Audience Scoreboard */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-3xl border-2 border-[#D4AF37] bg-[#1A2530] p-4 text-center text-[#F9F6F0] shadow">
                    <span className="text-[10px] font-extrabold text-[#D4AF37] uppercase tracking-wider">
                      {tr(uiLanguage, 'Critics Consensus', 'تقييم النقاد')}
                    </span>
                    <div className="mt-1 font-typewriter text-3xl font-black text-[#FDE68A] tabular-nums">
                      {lastReleasedProject.criticScore}
                      <span className="text-sm text-[#F9F6F0]/60">/10</span>
                    </div>
                    <span className="mt-1 inline-block text-[10px] font-bold text-[#F9F6F0]/75">
                      {lastReleasedProject.criticScore >= 8.2
                        ? tr(uiLanguage, 'Awards Contender', 'مرشح قوي للجوائز')
                        : lastReleasedProject.criticScore >= 7.0
                        ? tr(uiLanguage, 'Favorable Reviews', 'إشادة نقدية جيدة')
                        : tr(uiLanguage, 'Mixed / Harsh Critics', 'نقد متباين وقاسٍ')}
                    </span>
                  </div>

                  <div className="rounded-3xl border-2 border-[#D91624]/50 bg-white p-4 text-center shadow">
                    <span className="text-[10px] font-extrabold text-[#D91624] uppercase tracking-wider">
                      {tr(uiLanguage, 'Audience Pulse', 'تقييم الجمهور')}
                    </span>
                    <div className="mt-1 font-typewriter text-3xl font-black text-[#1A2530] tabular-nums">
                      {lastReleasedProject.audienceScore}
                      <span className="text-sm text-[#1A2530]/45">/10</span>
                    </div>
                    <span className="mt-1 inline-block text-[10px] font-bold text-[#1A2530]/70">
                      {lastReleasedProject.audienceScore >= 8.2
                        ? tr(uiLanguage, 'Crowd Favorite', 'معشوق الجمهور')
                        : lastReleasedProject.audienceScore >= 7.0
                        ? tr(uiLanguage, 'Solid Word of Mouth', 'أصداء جماهيرية طيبة')
                        : tr(uiLanguage, 'Divided Crowds', 'تفاعل جماهيري متواضع')}
                    </span>
                  </div>
                </div>

                {/* Daily Press Headlines */}
                {Array.isArray(lastReleasedProject.dailyNews) &&
                  lastReleasedProject.dailyNews.length > 0 && (
                    <div className="rounded-3xl border-2 border-[#1A2530]/15 bg-white p-3.5 space-y-2 shadow-sm">
                      <h3 className="flex items-center gap-1.5 text-xs font-black text-[#1A2530]">
                        <Megaphone className="h-4 w-4 text-[#D91624]" />
                        {tr(uiLanguage, 'Press & Trade Headlines', 'عناوين الصحافة الفنية')}
                      </h3>
                      {lastReleasedProject.dailyNews.slice(0, 3).map((n) => (
                        <div
                          key={n.id}
                          className="rounded-xl border border-[#1A2530]/12 bg-[#F9F6F0] px-3 py-2 text-start"
                        >
                          <div className="text-[11px] font-black text-[#1A2530]">
                            {n.headline}
                          </div>
                          <div className="text-[10px] font-bold text-[#1A2530]/70">
                            {n.detail}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Critic Reviews & Social Reactions */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-3.5 space-y-2 shadow-sm">
                    <h3 className="flex items-center gap-1.5 text-xs font-black text-[#1A2530]">
                      <Star className="h-4 w-4 text-[#D4AF37]" />
                      {tr(uiLanguage, 'Critic Reviews', 'مراجعات النقاد')}
                    </h3>
                    {lastReleasedProject.reviews.map((rev, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-[#1A2530]/12 bg-[#F9F6F0] p-2.5 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-[#1A2530] truncate">
                            {rev.criticName} ·{' '}
                            <span className="text-[#D91624]">{rev.publication}</span>
                          </span>
                          <span className="rounded border border-[#D4AF37]/60 bg-[#FFF9E6] px-1.5 py-0.5 font-mono text-[10px] font-black text-[#1A2530] shrink-0 tabular-nums">
                            {rev.score}/10
                          </span>
                        </div>
                        <p className="text-[11px] font-bold leading-relaxed text-[#1A2530]/75">
                          &ldquo;{rev.quote}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-3.5 space-y-2 shadow-sm">
                    <h3 className="flex items-center gap-1.5 text-xs font-black text-[#1A2530]">
                      <MessageSquare className="h-4 w-4 text-[#D91624]" />
                      {tr(uiLanguage, 'Audience Social Pulse', 'نبض الجمهور والسوشيال')}
                    </h3>
                    {lastReleasedProject.socialPosts.map((post, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-[#1A2530]/12 bg-[#F9F6F0] p-2.5 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-[#D91624]">
                          <span dir="ltr">{post.handle}</span>
                          <span className="tabular-nums">♥ {post.likes}</span>
                        </div>
                        <p className="text-[11px] font-bold text-[#1A2530]/80">
                          {post.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING STICKY BOTTOM NAVIGATION BOX — Royal Cinema Theme (Awards button removed; Year-End Gala is automatic!) */}
      <div className="pointer-events-none fixed right-0 bottom-3 left-0 z-40 px-3">
        <div className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between gap-2 rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530]/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-md">
          {wizardStep === 1 ? (
            <button
              type="button"
              onClick={() => setActiveScreen('PRODUCTION_CRISES')}
              className="min-h-[42px] rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-[#F9F6F0] transition hover:bg-white/20 cursor-pointer"
            >
              {tr(uiLanguage, 'Back', 'السابق')}
            </button>
          ) : (
            <div className="min-w-0">
              <span className="block text-[11px] font-black text-[#4ADE80] truncate">
                {tr(uiLanguage, 'Tracked Live in Studio HQ ✓', 'قيد المتابعة من مكتبك الرئيسي ✓')}
              </span>
              <span className="block text-[9px] font-bold text-[#F9F6F0]/65 truncate">
                {tr(
                  uiLanguage,
                  'Awards Gala triggers automatically at Year-End',
                  'حفل الجوائز ينطلق تلقائياً في نهاية العام'
                )}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (wizardStep === 1) {
                handleLaunchRelease();
              } else {
                resetDraftForNewProject('STUDIO_HUB');
              }
            }}
            disabled={isSimulating || (wizardStep === 1 && isOverTotalLiquidity)}
            className={`min-h-[44px] shrink-0 inline-flex items-center gap-1.5 rounded-xl border-2 px-4 sm:px-5 py-2 text-xs font-black text-white shadow-md transition disabled:opacity-50 cursor-pointer ${
              wizardStep === 1 && isOverTotalLiquidity
                ? 'border-amber-400 bg-slate-700 cursor-not-allowed'
                : wizardStep === 2
                ? 'border-[#D4AF37] bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#1A2530] hover:brightness-105'
                : 'border-[#D4AF37] bg-[#D91624] hover:brightness-110'
            }`}
          >
            {isSimulating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {tr(
                    uiLanguage,
                    'Simulating box office...',
                    'جاري حساب الإيرادات...'
                  )}
                </span>
              </>
            ) : wizardStep === 1 ? (
              isOverTotalLiquidity ? (
                <span>
                  {isEn
                    ? `Deficit ${formatMoney(liquidityDeficit)} ${currencyLabel}`
                    : `عجز ${formatMoney(liquidityDeficit)} ${currencyLabel}`}
                </span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                  <span>
                    {isSeries
                      ? tr(
                          uiLanguage,
                          'Premiere Series Now',
                          'بدء بث المسلسل الآن'
                        )
                      : tr(
                          uiLanguage,
                          'Release Film Now',
                          'طرح الفيلم في السينمات'
                        )}
                  </span>
                </>
              )
            ) : (
              <>
                <Home className="h-4 w-4 shrink-0" />
                <span>
                  {tr(
                    uiLanguage,
                    'Return to Studio HQ',
                    'العودة لمكتب الاستوديو'
                  )}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Stage5ReleaseSimulation;
