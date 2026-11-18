'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  useGameStore,
  OfferRoleSlot,
  SLOT_ARABIC_NAMES,
  getLiveActorsWithEvolution,
  getStudioAssetBenefits,
  TalentOfferRecord,
} from '@/lib/store';
import {
  GENRES,
  getResolvedDatabase,
  ActorItem,
  CrewItem,
} from '@/lib/db-resolver';
import {
  ROLE_BILLING_META,
  RoleBillingSize,
  VIP_DINNER_COST,
  calculateGenreSynergy,
  evaluateCastChemistry,
  evaluateTalentOfferDeep,
  formatMoney,
} from '@/lib/game-engine';
import { TalentCharacterPortraitSvg } from '@/components/CinematicGraphicsScene';
import {
  Fut3DTiltCard,
  HexagonalRadarChartSvg,
  DirectorChairIcon,
  SixRadarStats,
} from '@/components/CustomCinemaIcons';
import {
  Users,
  Clapperboard,
  Check,
  Search,
  Sparkles,
  Loader2,
  X,
  Utensils,
  MessageSquare,
  Award,
  Flame,
  Zap,
  Music,
  Camera,
  Film,
  Clock,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type WizardStepId = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_META: Record<
  WizardStepId,
  {
    currentActionLabel: string;
    crewRole?: 'director' | 'cinematographer' | 'composer' | 'editor_vfx';
    maxAllowed?: number;
  }
> = {
  1: {
    currentActionLabel: 'اختيار مخرج العمل (متاح من 1 إلى 2 مخرج كحد أقصى)',
    crewRole: 'director',
    maxAllowed: 2,
  },
  2: {
    currentActionLabel: 'اختيار مدير التصوير السينمائي (DOP)',
    crewRole: 'cinematographer',
    maxAllowed: 1,
  },
  3: {
    currentActionLabel: 'اختيار مؤلف الموسيقى التصويرية',
    crewRole: 'composer',
    maxAllowed: 1,
  },
  4: {
    currentActionLabel: 'اختيار مهندس المونتاج والمؤثرات (VFX)',
    crewRole: 'editor_vfx',
    maxAllowed: 1,
  },
  5: {
    currentActionLabel: 'التعاقد مع الممثلين وأبطال العمل',
  },
  6: {
    currentActionLabel: 'مراجعة العقود واعتماد ميزانية الإنتاج',
  },
};

export function Stage3CrewCastCards() {
  const {
    draft,
    updateDraft,
    setActiveScreen,
    cash,
    reputation,
    currentYear,
    gameDay,
    studioName,
    customDbPatch,
    aiGeneratedActors,
    actorDynamicState,
    actorAwardCounts,
    aiMemoryLog,
    submitTalentOffer,
    toggleCrewSelectionForSlot,
    confirmMultiAcceptedChoice,
    removeTalentFromDraft,
    setChildModalOpen,
    setStarForgeOpen,
    showToast,
    groqApiKeyClient,
    preferredGroqModel,
    ownedStudioAssets,
  } = useGameStore();

  const studioAssetBenefits = useMemo(
    () => getStudioAssetBenefits(ownedStudioAssets),
    [ownedStudioAssets]
  );

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

  const [wizardStep, setWizardStep] = useState<WizardStepId>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<
    'ALL' | 'S' | 'A' | 'B' | 'C' | 'RISING' | 'OFFERS'
  >('ALL');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'male' | 'female'>('ALL');

  // Negotiation Modal State
  const [negotiatingTarget, setNegotiatingTarget] = useState<
    | { kind: 'crew'; item: CrewItem }
    | { kind: 'actor'; item: ActorItem }
    | null
  >(null);

  const [offeredSalary, setOfferedSalary] = useState<number>(0);
  const [backendPoints, setBackendPoints] = useState<number>(0);
  const [vipDinner, setVipDinner] = useState<boolean>(false);
  const [roleBillingSize, setRoleBillingSize] = useState<RoleBillingSize>('lead_star');
  const [customRoleName, setCustomRoleName] = useState<string>('');
  const [isEvaluatingOffer, setIsEvaluatingOffer] = useState(false);

  // Sync negotiation modal state with central background scroll/interaction lock
  useEffect(() => {
    setChildModalOpen(Boolean(negotiatingTarget));
    return () => setChildModalOpen(false);
  }, [negotiatingTarget, setChildModalOpen]);

  const primaryGenreObj = useMemo(
    () => GENRES.find((g) => g.id === draft.primaryGenre),
    [draft.primaryGenre]
  );

  const currentStepMeta = STEP_META[wizardStep];

  const crewForCurrentStep = useMemo(() => {
    const role = currentStepMeta.crewRole;
    if (!role) return [];
    return db.crew.filter((c) => {
      if (c.role !== role) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.specialty || '').toLowerCase().includes(q)
      );
    });
  }, [db.crew, currentStepMeta.crewRole, searchQuery]);

  const activeActorsPool = useMemo(
    () =>
      liveActors.filter(
        (a) => a.status !== 'deceased' && a.status !== 'retired'
      ),
    [liveActors]
  );

  const filteredActors = useMemo(() => {
    return activeActorsPool.filter((a) => {
      const offer = draft.talentOffers[a.id];
      if (selectedTier === 'RISING' && !a.isRisingDiscovery && !a.isAiGenerated) {
        return false;
      }
      if (selectedTier === 'OFFERS' && !offer) {
        return false;
      }
      if (
        (selectedTier === 'S' ||
          selectedTier === 'A' ||
          selectedTier === 'B' ||
          selectedTier === 'C') &&
        a.tier !== selectedTier
      ) {
        return false;
      }
      if (genderFilter !== 'ALL') {
        const isFemale = a.gender === 'female' || a.gender === 'F';
        if (genderFilter === 'female' && !isFemale) return false;
        if (genderFilter === 'male' && isFemale) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        (a.archetype || '').toLowerCase().includes(q)
      );
    });
  }, [activeActorsPool, selectedTier, genderFilter, searchQuery, draft.talentOffers]);

  const directors = useMemo(
    () => db.crew.filter((c) => c.role === 'director'),
    [db.crew]
  );

  const approvedDirectorIds = useMemo(() => {
    const acceptedInOffers = Object.values(draft.talentOffers || {})
      .filter((o) => o.roleSlot === 'director' && o.status === 'accepted')
      .map((o) => o.talentId);
    return Array.from(
      new Set([
        ...(draft.directorIds || []),
        ...(draft.directorId ? [draft.directorId] : []),
        ...acceptedInOffers,
      ])
    ).slice(0, 2);
  }, [draft.directorIds, draft.directorId, draft.talentOffers]);

  const selectedDirectors = useMemo(
    () => directors.filter((d) => approvedDirectorIds.includes(d.id)),
    [directors, approvedDirectorIds]
  );

  const selectedDirector = selectedDirectors[0] || null;

  const allSignedActorIds = useMemo(
    () => [
      ...draft.leadActorIds,
      ...(draft.antagonistId ? [draft.antagonistId] : []),
      ...draft.supportingActorIds,
      ...draft.cameoActorIds,
    ],
    [
      draft.leadActorIds,
      draft.antagonistId,
      draft.supportingActorIds,
      draft.cameoActorIds,
    ]
  );

  const signedCastActors = useMemo(
    () => liveActors.filter((a) => allSignedActorIds.includes(a.id)),
    [liveActors, allSignedActorIds]
  );

  const allOffersList = useMemo(
    () => Object.values(draft.talentOffers || {}),
    [draft.talentOffers]
  );

  const pendingOffersList = useMemo(
    () => allOffersList.filter((o) => o.status === 'pending'),
    [allOffersList]
  );

  // Live Step 6 Chemistry & Synergy Reports
  const castChemistryReport = useMemo(
    () =>
      evaluateCastChemistry(
        signedCastActors,
        selectedDirector?.stats.control || 85
      ),
    [signedCastActors, selectedDirector]
  );

  const genreSynergyReport = useMemo(() => {
    const words = draft.scriptSynopsis.trim()
      ? draft.scriptSynopsis.trim().split(/\s+/).length
      : 20;
    const playerScriptCraft =
      words >= 28 ? 92 : words >= 18 ? 85 : words >= 10 ? 78 : 68;
    return calculateGenreSynergy(
      draft.primaryGenre,
      draft.secondaryGenre,
      selectedDirector?.stats.vision || 82,
      playerScriptCraft
    );
  }, [
    draft.primaryGenre,
    draft.secondaryGenre,
    draft.scriptSynopsis,
    selectedDirector,
  ]);

  const openNegotiation = (
    target: { kind: 'crew'; item: CrewItem } | { kind: 'actor'; item: ActorItem }
  ) => {
    const existingOffer = draft.talentOffers[target.item.id];
    setNegotiatingTarget(target);
    setOfferedSalary(existingOffer?.offeredSalary || target.item.base_salary);
    setBackendPoints(existingOffer?.backendPoints || 0);
    setVipDinner(false);
    const defaultBilling: RoleBillingSize =
      existingOffer?.roleBillingSize ||
      (draft.leadActorIds.length === 0
        ? 'lead_star'
        : draft.leadActorIds.length < 2
        ? 'co_lead'
        : !draft.antagonistId
        ? 'antagonist'
        : 'supporting');
    setRoleBillingSize(defaultBilling);
    setCustomRoleName(
      existingOffer?.customRoleName ||
        (target.kind === 'actor'
          ? draft.castCustomRoles[target.item.id] || ''
          : `قيادة ${SLOT_ARABIC_NAMES[target.item.role as OfferRoleSlot] || 'الطاقم الفني'} في «${draft.title}»`)
    );
  };

  // Multi-factor AI Talent Offer Submission (Wait 2–3 Game Days for Decision!)
  const handleSendOffer = async () => {
    if (!negotiatingTarget) return;

    if (vipDinner && cash < VIP_DINNER_COST) {
      showToast(
        `السيولة الحالية لا تكفي لإقامة عشاء عمل خاص (${formatMoney(VIP_DINNER_COST)} ج.م)!`,
        'warning'
      );
      return;
    }

    setIsEvaluatingOffer(true);

    const isActor = negotiatingTarget.kind === 'actor';
    const item = negotiatingTarget.item;
    const starTier: 'S' | 'A' | 'B' | 'C' = isActor
      ? (item as ActorItem).tier
      : item.stats.overall >= 90
      ? 'S'
      : item.stats.overall >= 83
      ? 'A'
      : 'B';
    const ego = isActor ? (item as ActorItem).stats.ego : 72;
    const genreMasteryScore = isActor
      ? (item as ActorItem).genre_mastery[draft.primaryGenre] || 74
      : (item as CrewItem).best_genres.includes(draft.primaryGenre)
      ? 92
      : 74;

    const slot: OfferRoleSlot = isActor
      ? roleBillingSize === 'antagonist'
        ? 'antagonist'
        : roleBillingSize === 'cameo'
        ? 'cameo'
        : roleBillingSize === 'supporting'
        ? 'supporting'
        : 'lead'
      : ((item as CrewItem).role as OfferRoleSlot);

    // 1. Run deep multi-factor baseline evaluation
    const deepEval = evaluateTalentOfferDeep({
      talentName: item.name,
      isActor,
      starTier,
      overall: item.stats.overall,
      ego,
      baseSalary: item.base_salary,
      offeredSalary,
      backendPoints,
      vipDinner,
      roleBillingSize,
      customRoleDescription: customRoleName,
      projectTitle: draft.title,
      scriptSynopsis: draft.scriptSynopsis,
      genreName: primaryGenreObj?.name || 'دراما',
      genreMasteryScore,
      studioReputation: reputation,
      directorOverall: selectedDirector?.stats.overall || null,
      directorName: selectedDirector?.name || null,
    });

    let willAccept = deepEval.willAccept;
    let reason = deepEval.detailedReason;
    let waitDays = starTier === 'S' || ego >= 85 ? 3 : 2;

    try {
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'evaluate_talent_offer',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            talentName: item.name,
            roleTitle: isActor
              ? ROLE_BILLING_META[roleBillingSize]?.label
              : SLOT_ARABIC_NAMES[(item as CrewItem).role as OfferRoleSlot],
            isActor,
            starTier,
            overall: item.stats.overall,
            ego,
            baseSalary: item.base_salary,
            offeredSalary,
            expectedMinimumSalary: deepEval.expectedMinimumSalary,
            backendPoints,
            vipDinner,
            roleBillingSize,
            roleBillingLabel: ROLE_BILLING_META[roleBillingSize]?.label,
            roleFitScore: deepEval.roleFitScore,
            roleFitVerdict: deepEval.roleFitVerdict,
            artisticFitScore: deepEval.artisticFitScore,
            customRoleDescription: customRoleName,
            projectTitle: draft.title,
            scriptSynopsis: draft.scriptSynopsis,
            genreName: primaryGenreObj?.name || 'دراما',
            genreMasteryScore,
            studioName,
            studioReputation: reputation,
            directorName: selectedDirector?.name || null,
            directorOverall: selectedDirector?.stats.overall || null,
            aiMemoryLog,
          },
        }),
      });
      const data = await res.json();
      if (typeof data?.accepted === 'boolean') {
        willAccept = data.accepted;
      } else if (typeof data?.willAccept === 'boolean') {
        willAccept = data.willAccept;
      }
      if (typeof data?.reason === 'string' && data.reason.trim()) {
        reason = data.reason.trim();
      }
      if (data?.waitDays === 2 || data?.waitDays === 3) {
        waitDays = data.waitDays;
      }
    } catch {
      // Fallback to deepEval values
    } finally {
      setIsEvaluatingOffer(false);
    }

    const responseDueDay = gameDay + waitDays;

    submitTalentOffer({
      talentId: item.id,
      talentName: item.name,
      roleSlot: slot,
      roleBillingSize: isActor ? roleBillingSize : undefined,
      customRoleName: customRoleName.trim() || undefined,
      offeredSalary,
      backendPoints,
      vipDinner,
      vipDinnerCost: vipDinner ? VIP_DINNER_COST : 0,
      submittedDay: gameDay,
      responseDueDay,
      status: 'pending',
      willAccept,
      aiReason: reason,
    });

    setNegotiatingTarget(null);
  };

  const calculateTotalEstimatedBudget = () => {
    let talentSpend = 0;
    const signedIds = Array.from(
      new Set([
        ...approvedDirectorIds,
        draft.dopId,
        draft.composerId,
        draft.vfxId,
        ...draft.leadActorIds,
        draft.antagonistId,
        ...draft.supportingActorIds,
        ...draft.cameoActorIds,
      ].filter(Boolean) as string[])
    );

    for (const id of signedIds) {
      const offer = draft.talentOffers[id];
      if (offer) {
        talentSpend += offer.offeredSalary;
      } else {
        const crewMember = db.crew.find((c) => c.id === id);
        const actorMember = liveActors.find((a) => a.id === id);
        talentSpend += crewMember?.base_salary || actorMember?.base_salary || 0;
      }
    }

    // Also include pending offers that haven't resolved yet so the player sees projected commitment
    for (const offer of pendingOffersList) {
      if (!signedIds.includes(offer.talentId)) {
        talentSpend += offer.offeredSalary;
      }
    }

    const rawDeptSpend =
      draft.budgetAllocation.setsAndLocations +
      draft.budgetAllocation.costumesAndMakeup +
      draft.budgetAllocation.vfxAndStunts +
      draft.budgetAllocation.extrasAndCrowds;

    const discountedDeptSpend = Math.round(
      rawDeptSpend * studioAssetBenefits.costMultiplier
    );

    return talentSpend + discountedDeptSpend;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [wizardStep]);

  const handleNextStep = () => {
    if (wizardStep < 6) {
      setWizardStep((prev) => (prev + 1) as WizardStepId);
      setSearchQuery('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Final Step 6 validation before starting filming
    if (approvedDirectorIds.length === 0) {
      const pendingDir = pendingOffersList.find((o) => o.roleSlot === 'director');
      if (pendingDir) {
        showToast(
          `عرض المخرج «${pendingDir.talentName}» لا يزال قيد الدراسة (الرد بعد ${Math.max(1, pendingDir.responseDueDay - gameDay)} يوم)! انتظر الرد قبل بدء التصوير.`,
          'warning'
        );
      } else {
        showToast(
          'يرجى التعاقد مع مخرج واحد على الأقل للعمل الفني وانتظار موافقته قبل بدء التصوير!',
          'warning'
        );
      }
      return;
    }

    if (draft.leadActorIds.length === 0) {
      const pendingLead = pendingOffersList.find((o) => o.roleSlot === 'lead');
      if (pendingLead) {
        showToast(
          `عرض البطولة للنجم «${pendingLead.talentName}» لا يزال قيد الدراسة (الرد بعد ${Math.max(1, pendingLead.responseDueDay - gameDay)} يوم)! انتظر الرد قبل بدء التصوير.`,
          'warning'
        );
      } else {
        showToast(
          'يرجى التعاقد مع بطل رئيسي واحد على الأقل وانتظار موافقته قبل بدء التصوير!',
          'warning'
        );
      }
      return;
    }

    const totalEstimated = calculateTotalEstimatedBudget();
    if (totalEstimated > cash) {
      showToast(
        `إجمالي تكلفة العقود والإنتاج (${formatMoney(totalEstimated)} ج.م) يتجاوز سيولة الخزينة الحالية (${formatMoney(cash)} ج.م)!`,
        'warning'
      );
      return;
    }

    updateDraft({
      filmingStartDay: gameDay,
      filmingDaysElapsed: 0,
    });
    setActiveScreen('PRODUCTION_CRISES');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    if (wizardStep > 1) {
      setWizardStep((prev) => (prev - 1) as WizardStepId);
      setSearchQuery('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveScreen('PROJECT_SETUP');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper to render offer status block on any Crew or Actor card
  const renderOfferStatusBanner = (offer?: TalentOfferRecord, isSigned = true) => {
    if (!offer) return null;
    const daysLeft = Math.max(1, offer.responseDueDay - gameDay);
    const totalWait = Math.max(1, offer.responseDueDay - offer.submittedDay);
    const elapsed = Math.min(totalWait, Math.max(0, gameDay - offer.submittedDay));
    const progressPct = Math.min(95, Math.max(20, Math.round((elapsed / totalWait) * 100)));

    if (offer.status === 'pending') {
      return (
        <div className="mt-2.5 rounded-2xl border border-amber-300/90 bg-amber-50/90 p-3 backdrop-blur-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-amber-950">
              <Clock className="h-3.5 w-3.5 text-amber-600 animate-spin" />
              <span>قيد دراسة الوكيل الفني (اليوم {offer.submittedDay} ← اليوم {offer.responseDueDay})</span>
            </span>
            <span className="rounded-lg bg-amber-500 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 tabular-nums">
              متبقي {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'} (رد في اليوم {offer.responseDueDay})
            </span>
          </div>
          <p className="mt-1 text-[11px] font-bold text-amber-900">
            العرض المقدم: {formatMoney(offer.offeredSalary)} ج.م
            {offer.backendPoints > 0 ? ` + ${offer.backendPoints}% من الأرباح` : ''}
            {offer.customRoleName ? ` · الدور: «${offer.customRoleName}»` : ''}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-violet-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      );
    }

    if (offer.status === 'accepted' && isSigned) {
      return (
        <div className="mt-2.5 rounded-2xl border border-emerald-300/90 bg-emerald-50/90 p-3 backdrop-blur-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>تم قبول العرض ومعتمد في الفريق ✓</span>
            </span>
            <span className="font-mono text-[11px] font-black text-emerald-800 tabular-nums">
              {formatMoney(offer.offeredSalary)} ج.م
            </span>
          </div>
          {offer.aiReason && (
            <p className="mt-1 text-[11px] font-bold leading-relaxed text-emerald-900">
              &ldquo;{offer.aiReason}&rdquo;
            </p>
          )}
        </div>
      );
    }

    if (
      offer.status === 'accepted_awaiting_choice' ||
      (offer.status === 'accepted' && !isSigned)
    ) {
      return (
        <div className="mt-2.5 rounded-2xl border border-violet-300/90 bg-violet-50/90 p-3 backdrop-blur-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-violet-950">
              <Check className="h-4 w-4 text-violet-600" />
              <span>وافق على العرض — بانتظار اختيارك النهائي ضمن العدد المسموح</span>
            </span>
            <span className="font-mono text-[11px] font-black text-violet-800 tabular-nums">
              {formatMoney(offer.offeredSalary)} ج.م
            </span>
          </div>
          {offer.aiReason && (
            <p className="mt-1 text-[11px] font-bold leading-relaxed text-violet-900">
              &ldquo;{offer.aiReason}&rdquo;
            </p>
          )}
        </div>
      );
    }

    if (offer.status === 'rejected') {
      return (
        <div className="mt-2.5 rounded-2xl border border-rose-300/90 bg-rose-50/90 p-3 backdrop-blur-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-rose-950">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>اعتذر عن قبول العرض السابق</span>
            </span>
          </div>
          {offer.aiReason && (
            <p className="mt-1 text-[11px] font-bold leading-relaxed text-rose-900">
              &ldquo;{offer.aiReason}&rdquo;
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  // Determine signed & accepted state for the current crew step (Steps 1..4)
  const currentCrewRole = currentStepMeta.crewRole;
  const maxAllowedForCurrentCrewRole = currentStepMeta.maxAllowed || 1;

  const currentSignedIdsForCrewStep = useMemo(() => {
    if (currentCrewRole === 'director') return approvedDirectorIds;
    if (currentCrewRole === 'cinematographer') return draft.dopId ? [draft.dopId] : [];
    if (currentCrewRole === 'composer') return draft.composerId ? [draft.composerId] : [];
    if (currentCrewRole === 'editor_vfx') return draft.vfxId ? [draft.vfxId] : [];
    return [];
  }, [currentCrewRole, approvedDirectorIds, draft.dopId, draft.composerId, draft.vfxId]);

  const acceptedOffersForCurrentCrewStep = useMemo(() => {
    if (!currentCrewRole) return [];
    return allOffersList.filter(
      (o) =>
        o.roleSlot === currentCrewRole &&
        (o.status === 'accepted' || o.status === 'accepted_awaiting_choice')
    );
  }, [allOffersList, currentCrewRole]);

  const hasExcessAcceptedCrewOffers =
    Boolean(currentCrewRole) &&
    (acceptedOffersForCurrentCrewStep.length > maxAllowedForCurrentCrewRole ||
      acceptedOffersForCurrentCrewStep.some(
        (o) => o.status === 'accepted_awaiting_choice'
      ));

  const isCurrentCrewSlotFullAndLocked =
    Boolean(currentCrewRole) &&
    currentSignedIdsForCrewStep.length >= maxAllowedForCurrentCrewRole &&
    !hasExcessAcceptedCrewOffers;

  return (
    <div className="space-y-3.5 pb-28">
      <div
        className={
          negotiatingTarget
            ? 'pointer-events-none select-none space-y-3.5 opacity-35 transition-opacity'
            : 'space-y-3.5'
        }
      >
      {/* Clean Single-Line Current Activity Header (No Step Numbers or Future Step List) */}
      <div className="glass-panel rounded-3xl px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm">
              {wizardStep === 1 && <Clapperboard className="h-5 w-5" />}
              {wizardStep === 2 && <Camera className="h-5 w-5" />}
              {wizardStep === 3 && <Music className="h-5 w-5" />}
              {wizardStep === 4 && <Film className="h-5 w-5" />}
              {wizardStep === 5 && <Users className="h-5 w-5" />}
              {wizardStep === 6 && <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="font-display text-sm font-black text-slate-900 sm:text-base">
                {currentStepMeta.currentActionLabel}
              </h2>
              {wizardStep === 1 && approvedDirectorIds.length > 0 && (
                <p className="text-[11px] font-bold text-emerald-700">
                  المخرجون المعتمدون ({approvedDirectorIds.length}/2):{' '}
                  {selectedDirectors.map((d) => d.name).join(' و')}
                </p>
              )}
            </div>
          </div>

          {pendingOffersList.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-900">
              <Clock className="h-3 w-3 text-amber-600 animate-spin" />
              <span>{pendingOffersList.length} عروض قيد الدراسة</span>
            </span>
          )}
        </div>
      </div>

      {/* Multi-Accepted Choice Banner when 3+ Directors (or 2+ DOP/Composer/VFX) Accepted */}
      {wizardStep <= 4 && currentCrewRole && hasExcessAcceptedCrewOffers && (
        <div className="rounded-3xl border-2 border-violet-400 bg-violet-50/95 p-4 shadow-md space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-xs font-black text-violet-950 sm:text-sm">
                {currentCrewRole === 'director'
                  ? `وافق ${acceptedOffersForCurrentCrewStep.length} مخرجين على عرضك! اختر مخرجاً واحداً أو مخرجين اثنين كحد أقصى (1–2):`
                  : `وافق ${acceptedOffersForCurrentCrewStep.length} مرشحين على العرض! اختر مرشحاً واحداً لاعتماده رسمياً:`}
              </h3>
              <p className="mt-0.5 text-[11px] font-bold text-violet-800">
                اضغط لتحديد من تريد اعتماده في الفريق النهائي ثم اضغط «تأكيد الاختيار النهائي» لإغلاق باقي العروض.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {acceptedOffersForCurrentCrewStep.map((off) => {
              const isChosen = currentSignedIdsForCrewStep.includes(off.talentId);
              return (
                <button
                  key={off.talentId}
                  type="button"
                  onClick={() =>
                    toggleCrewSelectionForSlot(currentCrewRole, off.talentId)
                  }
                  className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-black transition ${
                    isChosen
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                      : 'border-violet-200 bg-white text-slate-800 hover:border-violet-400'
                  }`}
                >
                  {isChosen && <Check className="h-3.5 w-3.5" />}
                  <span>{off.talentName}</span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={currentSignedIdsForCrewStep.length === 0}
              onClick={() =>
                confirmMultiAcceptedChoice(
                  currentCrewRole,
                  currentSignedIdsForCrewStep
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>
                تأكيد الاختيار النهائي ({currentSignedIdsForCrewStep.length}/
                {maxAllowedForCurrentCrewRole}) وإغلاق التعاقدات
              </span>
            </button>
          </div>
        </div>
      )}

      {/* FLOATING STICKY SEARCH & FILTER BAR FOR STEPS 1..5 */}
      {wizardStep <= 5 && (
        <div className="glass-nav sticky top-14 z-30 rounded-2xl p-3">
          <div className="flex flex-col gap-2.5">
            {wizardStep === 5 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: `الكل (${activeActorsPool.length})` },
                  { id: 'S', label: 'فئة S' },
                  { id: 'A', label: 'فئة A' },
                  { id: 'B', label: 'فئة B' },
                  { id: 'C', label: 'فئة C' },
                  { id: 'RISING', label: 'مواهب صاعدة ✨' },
                  { id: 'OFFERS', label: `العروض (${allOffersList.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedTier(tab.id as any)}
                    className={`rounded-xl px-2.5 py-1.5 text-[11px] font-black transition whitespace-nowrap ${
                      selectedTier === tab.id
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'border border-indigo-100 bg-white/80 text-slate-700 hover:bg-indigo-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                <div className="mr-auto flex items-center gap-1">
                  {[
                    { id: 'ALL', label: 'الكل' },
                    { id: 'male', label: 'ممثلون' },
                    { id: 'female', label: 'ممثلات' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGenderFilter(g.id as any)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-black transition ${
                        genderFilter === g.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-indigo-50/80 text-slate-600 hover:bg-indigo-100'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  wizardStep === 1
                    ? 'ابحث عن مخرج بالاسم أو المدرسة الإخراجية...'
                    : wizardStep === 2
                    ? 'ابحث عن مدير تصوير (DOP)...'
                    : wizardStep === 3
                    ? 'ابحث عن مؤلف موسيقى تصويرية...'
                    : wizardStep === 4
                    ? 'ابحث عن مهندس مونتاج ومؤثرات بصرية...'
                    : `ابحث في قائمة الـ ${activeActorsPool.length} ممثل وممثلة بالاسم أو اللون الفني...`
                }
                className="w-full rounded-xl border border-indigo-200/80 bg-white/85 py-2.5 pr-9 pl-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEPS 1..4: DEDICATED CREW CATEGORY SELECTION (Director -> DOP -> Composer -> VFX) */}
        {wizardStep >= 1 && wizardStep <= 4 && (
          <motion.div
            key={`crew_step_${wizardStep}`}
            initial={{ opacity: 0, scale: 0.985, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: -10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="grid grid-cols-1 gap-3"
          >
            {crewForCurrentStep.map((crewMember) => {
              const isSigned =
                (crewMember.role === 'director' &&
                  approvedDirectorIds.includes(crewMember.id)) ||
                (crewMember.role === 'cinematographer' && draft.dopId === crewMember.id) ||
                (crewMember.role === 'composer' && draft.composerId === crewMember.id) ||
                (crewMember.role === 'editor_vfx' && draft.vfxId === crewMember.id);

              const offer = draft.talentOffers[crewMember.id];
              const isPending = offer?.status === 'pending';
              const isAwaitingChoice =
                offer?.status === 'accepted_awaiting_choice' ||
                (offer?.status === 'accepted' && !isSigned);
              const masteryGenre = crewMember.best_genres.includes(draft.primaryGenre);
              const roleBadge =
                crewMember.role === 'director'
                  ? 'مخرج العمل الفني'
                  : crewMember.role === 'cinematographer'
                  ? 'مدير تصوير (DOP)'
                  : crewMember.role === 'composer'
                  ? 'موسيقار تصويري'
                  : 'مونتاج ومؤثرات VFX';

              return (
                <div
                  key={crewMember.id}
                  className={`glass-card rounded-3xl p-4 transition-all ${
                    isSigned
                      ? 'border-2 border-emerald-500 bg-emerald-50/75 shadow-md'
                      : isAwaitingChoice
                      ? 'border-2 border-violet-400 bg-violet-50/60 shadow-md'
                      : isPending
                      ? 'border-2 border-amber-400 bg-amber-50/60 shadow-md'
                      : 'hover:border-violet-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-indigo-200/80 shadow-xs">
                        <TalentCharacterPortraitSvg
                          name={crewMember.name}
                          role={crewMember.role}
                          tier={crewMember.stats.overall >= 90 ? 'S' : 'A'}
                          age={45}
                        />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-black text-slate-900">
                          {crewMember.name}
                        </h3>
                        <p className="mt-0.5 text-xs font-bold text-slate-600">
                          {crewMember.specialty}
                        </p>
                        <div className="mt-1 text-[11px] font-bold text-slate-500">
                          {masteryGenre ? (
                            <span className="text-emerald-700 font-black">
                              متخصص بارع في {primaryGenreObj?.name} ★
                            </span>
                          ) : (
                            <span>خبرة عامة في {primaryGenreObj?.name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-indigo-200/70 bg-indigo-50/80 px-3 py-1.5 text-center">
                      <div className="text-[10px] font-bold text-slate-500">التقييم</div>
                      <div className="font-mono text-sm font-black text-violet-800 tabular-nums">
                        {crewMember.stats.overall}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl border border-indigo-100/80 bg-white/75 p-2">
                      <span className="block text-[10px] font-bold text-slate-500">
                        الأجر المتوقع
                      </span>
                      <span className="font-mono text-xs font-black text-emerald-700 tabular-nums">
                        {formatMoney(crewMember.base_salary)} ج.م
                      </span>
                    </div>
                    <div className="rounded-2xl border border-indigo-100/80 bg-white/75 p-2">
                      <span className="block text-[10px] font-bold text-slate-500">
                        الرؤية البصرية
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900 tabular-nums">
                        {crewMember.stats.vision}/100
                      </span>
                    </div>
                    <div className="rounded-2xl border border-indigo-100/80 bg-white/75 p-2">
                      <span className="block text-[10px] font-bold text-slate-500">
                        ضبط الإيقاع
                      </span>
                      <span className="font-mono text-xs font-black text-indigo-700 tabular-nums">
                        {crewMember.stats.pacing}/100
                      </span>
                    </div>
                  </div>

                  {/* Offer Status Banner */}
                  {renderOfferStatusBanner(offer, isSigned)}

                  <div className="mt-3 flex items-center gap-2 border-t border-indigo-100/80 pt-2.5">
                    {isSigned ? (
                      <button
                        type="button"
                        onClick={() => removeTalentFromDraft(crewMember.id)}
                        className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-xs font-black text-white shadow-sm"
                      >
                        <Check className="h-4 w-4" />
                        <span>
                          {crewMember.role === 'director'
                            ? `معتمد في فريق الإخراج (${approvedDirectorIds.indexOf(crewMember.id) + 1}/${approvedDirectorIds.length}) · إلغاء التعاقد`
                            : 'معتمد في الفريق · إلغاء التعاقد'}
                        </span>
                      </button>
                    ) : isAwaitingChoice ? (
                      <button
                        type="button"
                        onClick={() =>
                          toggleCrewSelectionForSlot(
                            crewMember.role as OfferRoleSlot,
                            crewMember.id
                          )
                        }
                        className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-2xl bg-violet-600 py-2.5 text-xs font-black text-white shadow-sm hover:bg-violet-500"
                      >
                        <Check className="h-4 w-4" />
                        <span>اعتماد في الفريق النهائي</span>
                      </button>
                    ) : isPending ? (
                      <button
                        type="button"
                        onClick={() => removeTalentFromDraft(crewMember.id)}
                        className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-100/90 py-2.5 text-xs font-black text-amber-950"
                      >
                        <Clock className="h-4 w-4 text-amber-700" />
                        <span>بانتظار الرد الرسمي (سحب العرض)</span>
                      </button>
                    ) : isCurrentCrewSlotFullAndLocked ? (
                      <button
                        type="button"
                        disabled
                        className="flex min-h-[44px] flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-black text-slate-400"
                      >
                        <Check className="h-4 w-4" />
                        <span>
                          {crewMember.role === 'director'
                            ? 'اكتمل فريق الإخراج (تم اعتماد مخرجَين 2/2)'
                            : `تم اعتماد ${roleBadge} للعمل (1/1)`}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openNegotiation({ kind: 'crew', item: crewMember })}
                        className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-xs font-black text-white shadow-md hover:brightness-105"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>
                          {offer?.status === 'rejected'
                            ? 'تعديل الشروط وإرسال عرض جديد'
                            : 'تفاوض وإرسال عرض تعاقد'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* STEP 5: ACTORS & RISING TALENTS (180+ ACTORS + PENDING/EVALUATED OFFERS) */}
        {wizardStep === 5 && (
          <motion.div
            key="step5_actors"
            initial={{ opacity: 0, scale: 0.985, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: -10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="space-y-3"
          >
            {/* Signed & Pending Cast Summary Bar */}
            {(signedCastActors.length > 0 || pendingOffersList.length > 0) && (
              <div className="glass-panel rounded-3xl p-3.5 space-y-2">
                {signedCastActors.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-xs font-black text-emerald-900">
                      الأبطال الموقعون رسمياً ({signedCastActors.length}):
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {signedCastActors.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/90 px-2.5 py-1 text-xs font-black text-emerald-950"
                        >
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>{act.name}</span>
                          <button
                            type="button"
                            onClick={() => removeTalentFromDraft(act.id)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingOffersList.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-xs font-black text-amber-900">
                      عروض قيد الدراسة لدى النجوم ووكلاء الأعمال ({pendingOffersList.length}):
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {pendingOffersList.map((off) => (
                        <div
                          key={off.talentId}
                          className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/90 px-2.5 py-1 text-xs font-black text-amber-950"
                        >
                          <Clock className="h-3 w-3 text-amber-600 animate-spin" />
                          <span>
                            {off.talentName} (يرد بعد {Math.max(1, off.responseDueDay - gameDay)}{' '}
                            يوم)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIP Star Forge Banner inside Actor Casting */}
            <div className="rounded-2xl bg-gradient-to-r from-[#D91624] via-[#A90F1B] to-[#1A2530] p-4 text-[#F9F6F0] border-2 border-[#D4AF37] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="text-xs font-typewriter font-black text-[#D4AF37]">
                  THE STAR FORGE // كاستينج الـ VIP
                </div>
                <h3 className="font-display text-lg text-[#F9F6F0]">
                  هل تبحث عن أسطورة خاصة باستوديوك؟ اصنع نجمك بكارت ألماظ (99 OVR)!
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStarForgeOpen(true)}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#1A2530] font-display text-sm hover:brightness-110 transition cursor-pointer flex items-center gap-2 shadow"
              >
                <Lock className="w-4 h-4" />
                <span>فتح غرفة صناعة النجوم</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActors.map((actor) => {
                const isSigned = allSignedActorIds.includes(actor.id);
                const offer = draft.talentOffers[actor.id];
                const isPending = offer?.status === 'pending';
                const masteryScore = actor.genre_mastery[draft.primaryGenre] || 74;
                const awardsCount = actorAwardCounts[actor.id] || 0;

                const computedRadar: SixRadarStats = actor.radarStats || {
                  charisma: actor.stats.charisma,
                  acting: actor.stats.acting,
                  action: actor.genre_mastery.action || Math.min(95, actor.stats.overall - 2),
                  comedy: actor.genre_mastery.comedy || Math.min(92, actor.stats.charisma - 3),
                  popularity: Math.min(99, Math.round((actor.stats.charisma + actor.stats.box_office_pull) / 2)),
                  boxOffice: actor.stats.box_office_pull,
                };

                const cardTier = actor.isCustomStar ? 'DIAMOND' : actor.tier;
                const isDarkCard = actor.isCustomStar;

                return (
                  <Fut3DTiltCard
                    key={actor.id}
                    tier={cardTier}
                    className={`p-4 transition-all ${
                      isSigned
                        ? 'ring-4 ring-[#15803D]'
                        : isPending
                        ? 'ring-4 ring-[#D4AF37]'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-[#D4AF37] shadow-md bg-[#F9F6F0]">
                          {actor.isCustomStar && actor.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={actor.image_url}
                              alt={actor.name}
                              className="w-full h-full object-cover sepia-[0.12] contrast-110"
                            />
                          ) : (
                            <TalentCharacterPortraitSvg
                              name={actor.name}
                              gender={actor.gender}
                              role="actor"
                              tier={actor.tier}
                              age={actor.age}
                              isRising={actor.isRisingDiscovery || actor.isAiGenerated}
                            />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {actor.isCustomStar ? (
                              <span className="rounded-md bg-[#38BDF8] px-2 py-0.5 font-typewriter text-[10px] font-black text-[#1A2530]">
                                CUSTOM STAR · موهبة حصرية
                              </span>
                            ) : (
                              <span className="rounded-md bg-[#1A2530] px-2 py-0.5 font-typewriter text-[10px] font-black text-[#D4AF37]">
                                FUT TIER {actor.tier}
                              </span>
                            )}
                            {awardsCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-[#D91624]">
                                · <Award className="h-3.5 w-3.5" /> {awardsCount} جوائز
                              </span>
                            )}
                          </div>
                          <h3
                            className={`font-display text-lg mt-0.5 ${
                              isDarkCard ? 'text-white' : 'text-[#1A2530]'
                            }`}
                          >
                            {actor.name}
                          </h3>
                          <p
                            className={`text-xs font-bold ${
                              isDarkCard ? 'text-white/80' : 'text-[#1A2530]/75'
                            }`}
                          >
                            {actor.archetype} · {actor.age} سنة · إتقان {primaryGenreObj?.name}:{' '}
                            <span className="font-typewriter font-black">{masteryScore}%</span>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-xl border-2 border-[#D4AF37] bg-[#1A2530] px-3 py-1.5 text-center shadow">
                        <div className="text-[9px] font-typewriter text-[#D4AF37]">OVR</div>
                        <div className="font-typewriter text-lg font-black text-[#F9F6F0] tabular-nums">
                          {actor.stats.overall}
                        </div>
                      </div>
                    </div>

                    {/* Hexagonal Radar Chart + Typewriter Salary & Ruqaa Autograph */}
                    <div className="mt-3 grid grid-cols-12 gap-2 items-center rounded-2xl bg-[#F9F6F0]/95 p-2.5 border border-[#1A2530]/15 text-[#1A2530]">
                      <div className="col-span-7 flex justify-center">
                        <HexagonalRadarChartSvg
                          stats={computedRadar}
                          size={145}
                          isDiamond={actor.isCustomStar}
                        />
                      </div>
                      <div className="col-span-5 flex flex-col justify-between space-y-2 pr-1 border-r border-[#1A2530]/15">
                        <div>
                          <span className="block text-[10px] font-extrabold text-[#1A2530]/65">
                            الأجر الأساسي:
                          </span>
                          <span className="font-typewriter text-xs font-black text-[#15803D]">
                            {formatMoney(actor.base_salary)} ج.م
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-extrabold text-[#1A2530]/65">
                            شباك التذاكر:
                          </span>
                          <span className="font-typewriter text-xs font-black text-[#1A2530]">
                            {computedRadar.boxOffice}/99
                          </span>
                        </div>
                        <div className="pt-1 border-t border-dashed border-[#1A2530]/20">
                          <span className="block text-[9px] font-bold text-[#1A2530]/55">
                            توقيع النجم:
                          </span>
                          <span className="font-ruqaa text-base text-[#D91624] block -rotate-2">
                            {actor.autographSignature || actor.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Offer Status Banner */}
                    {renderOfferStatusBanner(offer)}

                    <div className="mt-3 flex items-center gap-2 pt-2">
                      {isSigned ? (
                        <button
                          type="button"
                          onClick={() => removeTalentFromDraft(actor.id)}
                          className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#15803D] py-2 text-xs font-black text-white shadow cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                          <span>تم التوقيع (إلغاء التعاقد)</span>
                        </button>
                      ) : isPending ? (
                        <button
                          type="button"
                          onClick={() => removeTalentFromDraft(actor.id)}
                          className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[#1A2530] bg-[#FFF6B3] py-2 text-xs font-black text-[#1A2530] cursor-pointer"
                        >
                          <Clock className="h-4 w-4 text-[#D91624]" />
                          <span>بانتظار الرد الرسمي (سحب العرض)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openNegotiation({ kind: 'actor', item: actor })}
                          className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#D91624] hover:brightness-110 py-2 text-xs font-black text-white border border-[#D4AF37] shadow-md cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>
                            {offer?.status === 'rejected'
                              ? 'تعديل الشروط وإرسال عرض جديد'
                              : 'عرض دور وتفاوض'}
                          </span>
                        </button>
                      )}
                    </div>
                  </Fut3DTiltCard>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 6: CHEMISTRY, CONTRACT SUMMARY & PRODUCTION BUDGET */}
        {wizardStep === 6 && (
          <motion.div
            key="step6_budget"
            initial={{ opacity: 0, scale: 0.985, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: -10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="space-y-4"
          >
            {/* Overview of All Crew & Cast Offers */}
            <div className="glass-panel rounded-3xl p-4 space-y-2.5">
              <h3 className="font-display text-sm font-black text-slate-900">
                حالة عقود الفريق الفني وأبطال العمل
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  {
                    slotLabel: 'فريق الإخراج (1–2)',
                    signedName:
                      selectedDirectors.length > 0
                        ? selectedDirectors.map((d) => d.name).join(' و')
                        : undefined,
                    pendingOffer: pendingOffersList.find((o) => o.roleSlot === 'director'),
                    stepToGo: 1 as WizardStepId,
                  },
                  {
                    slotLabel: 'مدير التصوير (DOP)',
                    signedName: db.crew.find((c) => c.id === draft.dopId)?.name,
                    pendingOffer: pendingOffersList.find(
                      (o) => o.roleSlot === 'cinematographer'
                    ),
                    stepToGo: 2 as WizardStepId,
                  },
                  {
                    slotLabel: 'الموسيقى التصويرية',
                    signedName: db.crew.find((c) => c.id === draft.composerId)?.name,
                    pendingOffer: pendingOffersList.find((o) => o.roleSlot === 'composer'),
                    stepToGo: 3 as WizardStepId,
                  },
                  {
                    slotLabel: 'المونتاج والمؤثرات (VFX)',
                    signedName: db.crew.find((c) => c.id === draft.vfxId)?.name,
                    pendingOffer: pendingOffersList.find((o) => o.roleSlot === 'editor_vfx'),
                    stepToGo: 4 as WizardStepId,
                  },
                ].map((slotInfo) => (
                  <button
                    key={slotInfo.slotLabel}
                    type="button"
                    onClick={() => setWizardStep(slotInfo.stepToGo)}
                    className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-white/80 p-3 text-right transition hover:border-indigo-300"
                  >
                    <div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {slotInfo.slotLabel}
                      </div>
                      <div className="text-xs font-black text-slate-900">
                        {slotInfo.signedName
                          ? `✓ ${slotInfo.signedName}`
                          : slotInfo.pendingOffer
                          ? `⏳ ${slotInfo.pendingOffer.talentName} (يرد بعد ${Math.max(
                              1,
                              slotInfo.pendingOffer.responseDueDay - gameDay
                            )} يوم)`
                          : 'لم يتم الاختيار بعد (اضغط للاختيار)'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cast Chemistry & Genre Synergy Reports */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="glass-panel rounded-3xl p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black text-violet-900">
                    <Flame className="h-4 w-4 text-amber-500" />
                    تقرير كيمياء الأبطال والبلاتوه
                  </span>
                  <span
                    className={`text-xs font-black ${
                      castChemistryReport.hasSevereClash
                        ? 'text-rose-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {castChemistryReport.hasSevereClash
                      ? 'صراع نجومية محتمل'
                      : `تناغم +${castChemistryReport.synergyBonus}`}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-600">
                  {castChemistryReport.warningMessage ||
                    'تناغم ممتاز بين أبطال العمل والمخرج يمنح المشاهد الدرامية مصداقية عالية.'}
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black text-violet-900">
                    <Zap className="h-4 w-4 text-indigo-600" />
                    توليفة التصنيف الدرامي
                  </span>
                  <span className="font-mono text-xs font-black text-indigo-900 tabular-nums">
                    x{genreSynergyReport.multiplier.toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-600">
                  {genreSynergyReport.label}
                </p>
              </div>
            </div>

            {/* Department Budgets */}
            <div className="glass-panel rounded-3xl p-4 space-y-4">
              <h3 className="font-display text-sm font-black text-slate-900">
                تخصيص ميزانية الأقسام الإنتاجية
              </h3>

              {[
                {
                  field: 'setsAndLocations' as const,
                  label: 'بناء الديكورات ومواقع التصوير',
                  min: 2_000_000,
                  max: 25_000_000,
                },
                {
                  field: 'costumesAndMakeup' as const,
                  label: 'الأزياء والماكياج والراكورات',
                  min: 1_000_000,
                  max: 15_000_000,
                },
                {
                  field: 'vfxAndStunts' as const,
                  label: 'المؤثرات البصرية ومشاهد الأكشن',
                  min: 2_000_000,
                  max: 30_000_000,
                },
                {
                  field: 'extrasAndCrowds' as const,
                  label: 'المجاميع والإنتاج الميداني',
                  min: 1_000_000,
                  max: 15_000_000,
                },
              ].map((dept) => {
                const val = draft.budgetAllocation[dept.field];
                return (
                  <div
                    key={dept.field}
                    className="rounded-2xl border border-indigo-100/80 bg-white/80 p-3"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800">{dept.label}</span>
                      <span className="font-mono text-xs font-black text-violet-700 tabular-nums">
                        {formatMoney(val)} ج.م
                      </span>
                    </div>
                    <input
                      type="range"
                      min={dept.min}
                      max={dept.max}
                      step={500_000}
                      value={val}
                      onChange={(e) =>
                        updateDraft({
                          budgetAllocation: {
                            ...draft.budgetAllocation,
                            [dept.field]: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>
                );
              })}

              <div className="flex items-center justify-between rounded-2xl border border-indigo-200/80 bg-indigo-50/85 p-3.5">
                <div>
                  <span className="block text-[11px] font-bold text-slate-600">
                    إجمالي تكلفة العقود والإنتاج
                  </span>
                  <span className="font-mono text-lg font-black text-emerald-700 tabular-nums">
                    {formatMoney(calculateTotalEstimatedBudget())} ج.م
                  </span>
                </div>
                <div className="text-left">
                  <span className="block text-[11px] font-bold text-slate-600">
                    السيولة المتاحة بالخزينة
                  </span>
                  <span className="font-mono text-base font-black text-slate-900 tabular-nums">
                    {formatMoney(cash)} ج.م
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* NEGOTIATION MODAL (Sends Offer for 2–3 Days AI Evaluation!) */}
      <AnimatePresence>
        {negotiatingTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md overscroll-contain touch-none select-none"
          >
            <motion.div
              initial={{ scale: 0.94, y: 18, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 18, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="glass-modal max-h-[90vh] w-full max-w-lg overflow-y-auto overscroll-contain touch-pan-y rounded-3xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-indigo-200">
                    <TalentCharacterPortraitSvg
                      name={negotiatingTarget.item.name}
                      role={
                        negotiatingTarget.kind === 'actor'
                          ? 'actor'
                          : negotiatingTarget.item.role
                      }
                      tier={
                        negotiatingTarget.kind === 'actor'
                          ? negotiatingTarget.item.tier
                          : 'A'
                      }
                    />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-black text-slate-900">
                      مفاوضات التعاقد: {negotiatingTarget.item.name}
                    </h3>
                    <p className="text-xs font-bold text-emerald-700">
                      الأجر المعتاد في السوق: {formatMoney(negotiatingTarget.item.base_salary)} ج.م
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNegotiatingTarget(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Actor Role Billing Size Selection */}
              {negotiatingTarget.kind === 'actor' && (
                <div>
                  <label className="mb-1.5 block text-xs font-black text-slate-800">
                    حجم الدور وترتيب الأفيش المعروض
                  </label>
                  <select
                    value={roleBillingSize}
                    onChange={(e) => setRoleBillingSize(e.target.value as RoleBillingSize)}
                    className="w-full rounded-2xl border border-indigo-200 bg-indigo-50/70 px-3 py-2.5 text-xs font-black text-slate-900 focus:border-violet-600 focus:outline-none"
                  >
                    {Object.values(ROLE_BILLING_META).map((meta) => (
                      <option key={meta.id} value={meta.id}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Financial Offer Sliders */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">الأجر المعروض</span>
                    <span className="font-mono text-xs font-black text-emerald-700 tabular-nums">
                      {formatMoney(offeredSalary)} ج.م
                    </span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(500_000, Math.round(negotiatingTarget.item.base_salary * 0.45))}
                    max={Math.round(negotiatingTarget.item.base_salary * 1.75)}
                    step={250_000}
                    value={offeredSalary}
                    onChange={(e) => setOfferedSalary(Number(e.target.value))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">نسبة من أرباح الشباك</span>
                    <span className="font-mono text-xs font-black text-violet-700 tabular-nums">
                      {backendPoints}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    step={1}
                    value={backendPoints}
                    onChange={(e) => setBackendPoints(Number(e.target.value))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Paid VIP Dinner Option */}
              <button
                type="button"
                onClick={() => setVipDinner(!vipDinner)}
                className={`flex w-full items-center justify-between rounded-2xl border-2 p-3 text-right transition ${
                  vipDinner
                    ? 'border-amber-500 bg-amber-50 text-amber-950'
                    : 'border-indigo-100 bg-slate-50 text-slate-700 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Utensils className="h-4 w-4 text-amber-600" />
                  <div>
                    <div className="text-xs font-black">
                      دعوة عشاء عمل خاص وقراءة سيناريو VIP
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                      يرفع حماس الفنان ويزيد فرص قبول العرض عند دراسة السيناريو
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-black text-amber-800 tabular-nums">
                  {formatMoney(VIP_DINNER_COST)} ج.م
                </span>
              </button>

              {/* Character Role Description (Written by User) */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800">
                    {negotiatingTarget.kind === 'actor'
                      ? `اكتب اسم وتفاصيل الدور والشخصية في «${draft.title}»`
                      : `مهام التعاقد في «${draft.title}»`}
                  </label>
                </div>
                <input
                  type="text"
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  placeholder={
                    negotiatingTarget.kind === 'actor'
                      ? 'اكتب اسم الشخصية وملامح الدور بنفسك لإقناع الممثل...'
                      : 'تفاصيل المهام الفنية...'
                  }
                  className="w-full rounded-2xl border border-indigo-200 bg-indigo-50/50 px-3 py-2.5 text-xs font-bold text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-indigo-100 pt-3">
                <button
                  type="button"
                  onClick={() => setNegotiatingTarget(null)}
                  className="min-h-[44px] rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSendOffer}
                  disabled={isEvaluatingOffer}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md hover:brightness-105 disabled:opacity-50"
                >
                  {isEvaluatingOffer ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>جاري إرسال العرض لوكيل الأعمال...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>إرسال العرض الرسمي (الرد خلال 2–3 أيام)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING STICKY BOTTOM NAVIGATION BOX */}
      <div
        className={`pointer-events-none fixed right-0 bottom-3 left-0 z-40 px-3 ${
          negotiatingTarget ? 'opacity-25' : ''
        }`}
      >
        <div
          className={`glass-nav mx-auto flex max-w-xl items-center justify-between rounded-2xl px-4 py-3 ${
            negotiatingTarget ? 'pointer-events-none select-none' : 'pointer-events-auto'
          }`}
        >
          <button
            type="button"
            onClick={handlePrevStep}
            className="min-h-[42px] rounded-xl border border-indigo-200/80 bg-indigo-50/90 px-5 py-2 text-xs font-black text-slate-700 transition hover:bg-indigo-100"
          >
            السابق
          </button>

          <div className="text-center">
            <span className="font-mono text-xs font-black text-violet-800 tabular-nums">
              التكلفة: {formatMoney(calculateTotalEstimatedBudget())} ج.م
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            className="min-h-[42px] rounded-xl border-b-2 border-amber-700 bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-2 text-xs font-black text-slate-950 shadow-md transition hover:from-amber-400 hover:to-amber-300"
          >
            {wizardStep === 6 ? 'اعتماد الميزانية وبدء التصوير' : 'التالي'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Stage3CrewCastCards;
