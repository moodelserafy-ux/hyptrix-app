'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  OfferRoleSlot,
  TalentOfferRecord,
  SLOT_ARABIC_NAMES,
  formatGameDate,
  getLiveActorsWithEvolution,
} from '@/lib/store';
import {
  getResolvedDatabase,
  ActorItem,
  CrewItem,
  GENRES,
} from '@/lib/db-resolver';
import {
  evaluateCastChemistry,
  calculateNegotiatedSalary,
  calculateTalentExpectedSalary,
  formatMoney,
} from '@/lib/game-engine';
import { EaFcTalentCard } from './EaFcTalentCard';
import {
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  Clock,
  FileText,
  Flame,
  Handshake,
  Search,
  Sparkles,
  Users,
  X,
  ChevronDown,
  Clapperboard,
  PenLine,
} from 'lucide-react';

type MainMarketSection = 'actors_market' | 'crew_market';
type ActorTierFilter = 'ALL' | 'S' | 'A' | 'B' | 'C' | 'RISING' | 'EVOLVED';

interface ActiveNegotiationTarget {
  talent: ActorItem | CrewItem;
  kind: 'actor' | 'crew';
  roleSlot: OfferRoleSlot;
}

export function Stage3CrewCastCards() {
  const {
    draft,
    founderPerk,
    reputation,
    gameDay,
    currentYear,
    actorAwardCounts,
    actorDynamicState,
    aiGeneratedActors,
    customDbPatch,
    groqApiKeyClient,
    preferredGroqModel,
    submitTalentOffer,
    removeTalentFromDraft,
    setActiveScreen,
  } = useGameStore();

  const db = getResolvedDatabase(customDbPatch);

  // Live actors with age progression, stat evolution/drop, AI rising discoveries, and retirement/death filter
  const allLiveActors = getLiveActorsWithEvolution({
    baseActors: db.actors,
    aiGeneratedActors,
    actorDynamicState,
    currentYear,
    gameDay,
  }).filter((a) => a.status !== 'retired' && a.status !== 'deceased');

  const [marketSection, setMarketSection] =
    useState<MainMarketSection>('actors_market');
  const [crewFilter, setCrewFilter] = useState<
    'director' | 'cinematographer' | 'composer' | 'editor_vfx'
  >('director');
  const [actorSearchQuery, setActorSearchQuery] = useState<string>('');
  const [actorTierFilter, setActorTierFilter] =
    useState<ActorTierFilter>('ALL');
  const [visibleActorCount, setVisibleActorCount] = useState<number>(16);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pitch, Free-Text Role & Contract Negotiation Modal State
  const [negotiationTarget, setNegotiationTarget] =
    useState<ActiveNegotiationTarget | null>(null);
  const [customRoleInput, setCustomRoleInput] = useState<string>('');
  const [offeredSalary, setOfferedSalary] = useState<number>(0);
  const [backendPoints, setBackendPoints] = useState<number>(0);
  const [vipDinner, setVipDinner] = useState<boolean>(false);
  const [sendingOffer, setSendingOffer] = useState<boolean>(false);

  const getNegotiatedCost = (id: string, baseSalary: number) => {
    const offer = draft.talentOffers[id];
    if (offer && offer.status === 'accepted') {
      return offer.offeredSalary;
    }
    const neg = draft.negotiatedDiscounts[id] || {
      backendPoints: 0,
      vipDinner: false,
    };
    return calculateNegotiatedSalary(
      baseSalary,
      neg.backendPoints,
      founderPerk,
      neg.vipDinner
    );
  };

  const selectedDirector =
    db.crew.find((c) => c.id === draft.directorId) || null;
  const selectedDop = db.crew.find((c) => c.id === draft.dopId) || null;
  const selectedComposer =
    db.crew.find((c) => c.id === draft.composerId) || null;
  const selectedVfx = db.crew.find((c) => c.id === draft.vfxId) || null;

  const signedActorIds = [
    ...draft.leadActorIds,
    ...(draft.antagonistId ? [draft.antagonistId] : []),
    ...draft.supportingActorIds,
    ...draft.cameoActorIds,
  ];

  const allSelectedActors = allLiveActors.filter((a) =>
    signedActorIds.includes(a.id)
  );

  const chemistry = evaluateCastChemistry(
    allSelectedActors,
    selectedDirector?.stats.control || 80
  );

  const totalTalentPayroll = [
    ...(selectedDirector ? [selectedDirector] : []),
    ...(selectedDop ? [selectedDop] : []),
    ...(selectedComposer ? [selectedComposer] : []),
    ...(selectedVfx ? [selectedVfx] : []),
    ...allSelectedActors,
  ].reduce((sum, item) => sum + getNegotiatedCost(item.id, item.base_salary), 0);

  const pendingOffersList = Object.values(draft.talentOffers).filter(
    (o) => o.status === 'pending'
  );

  const unlockedRisingTalents = allLiveActors.filter(
    (a) => a.isRisingDiscovery && (a.unlockDay ?? 1) <= gameDay
  );

  const openNegotiationModal = (
    talent: ActorItem | CrewItem,
    kind: 'actor' | 'crew',
    roleSlot: OfferRoleSlot
  ) => {
    const existingOffer = draft.talentOffers[talent.id];
    const defaultBase = talent.base_salary;

    setNegotiationTarget({ talent, kind, roleSlot });
    setCustomRoleInput(
      existingOffer?.customRoleName ||
        (draft.castCustomRoles || {})[talent.id] ||
        ''
    );
    setOfferedSalary(
      existingOffer && existingOffer.status === 'rejected'
        ? Math.round(defaultBase * 1.12)
        : Math.round(defaultBase * 0.94)
    );
    setBackendPoints(existingOffer?.backendPoints ?? 0);
    setVipDinner(existingOffer?.vipDinner ?? false);
    setErrorMsg(null);
  };

  const handleSendPitchAndOffer = async () => {
    if (!negotiationTarget) return;
    const { talent, kind, roleSlot } = negotiationTarget;
    const isActor = kind === 'actor';

    if (isActor && !customRoleInput.trim()) {
      setErrorMsg(
        'يرجى كتابة الدور المطلوب للممثل في العمل أولاً (مثال: البطل الرئيسي ضابط المخابرات، أو زعيم العصابة، إلخ).'
      );
      return;
    }

    setSendingOffer(true);
    setErrorMsg(null);

    const actorItem = isActor ? (talent as ActorItem) : null;
    const crewItem = !isActor ? (talent as CrewItem) : null;

    const genreMasteryScore = actorItem
      ? actorItem.genre_mastery[draft.primaryGenre] || 74
      : crewItem?.best_genres.includes(draft.primaryGenre)
      ? 92
      : 75;

    const egoScore = actorItem ? actorItem.stats.ego : 76;

    const { expectedMinimumSalary } = calculateTalentExpectedSalary({
      baseSalary: talent.base_salary,
      ego: egoScore,
      genreMasteryScore,
      studioReputation: reputation,
      isCameo: false,
    });

    const genreName =
      GENRES.find((g) => g.id === draft.primaryGenre)?.name ||
      draft.primaryGenre;

    const roleDescription = isActor
      ? customRoleInput.trim()
      : SLOT_ARABIC_NAMES[roleSlot];

    // Actors take 2 to 3 game days to study the script & reply!
    const waitDays = egoScore >= 88 ? 3 : 2;

    try {
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'evaluate_talent_offer',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            talentName: talent.name,
            roleLabel: roleDescription,
            ego: egoScore,
            baseSalary: talent.base_salary,
            expectedMinSalary: expectedMinimumSalary,
            offeredSalary,
            backendPoints,
            vipDinner,
            projectTitle: draft.title || 'الفرعون الأخير',
            title: draft.title || 'الفرعون الأخير',
            synopsis: draft.scriptSynopsis,
            primaryGenre: genreName,
            genreName,
            genreMasteryScore,
            studioReputation: reputation,
          },
        }),
      });
      const data = await res.json();

      const newOffer: TalentOfferRecord = {
        talentId: talent.id,
        talentName: talent.name,
        roleSlot,
        customRoleName: isActor ? roleDescription : undefined,
        offeredSalary,
        backendPoints,
        vipDinner,
        submittedDay: gameDay,
        responseDueDay: gameDay + waitDays,
        status: 'pending',
        willAccept: Boolean(data.accepted),
        aiReason:
          data.reason ||
          (data.accepted
            ? `أعجبتني تفاصيل دور «${roleDescription}» في سيناريو «${draft.title || 'الفرعون الأخير'}»، موافق على التوقيع!`
            : `العرض المالي المقدم لدور «${roleDescription}» أقل من أجري السوقي الحالي ولا يناسب حجم التفرغ المطلوب.`),
        aiSource: 'وكيل أعمال الفنان',
      };

      submitTalentOffer(newOffer);
      setNegotiationTarget(null);
    } catch {
      const fallbackAccept = offeredSalary >= expectedMinimumSalary * 0.95;
      submitTalentOffer({
        talentId: talent.id,
        talentName: talent.name,
        roleSlot,
        customRoleName: isActor ? roleDescription : undefined,
        offeredSalary,
        backendPoints,
        vipDinner,
        submittedDay: gameDay,
        responseDueDay: gameDay + waitDays,
        status: 'pending',
        willAccept: fallbackAccept,
        aiReason: fallbackAccept
          ? `دور «${roleDescription}» في «${draft.title || 'الفرعون الأخير'}» مكتوب بذكاء والعرض المالي مناسب، جاهز للتوقيع!`
          : `الأجر المعروض لدور «${roleDescription}» أقل من المتوقع في السوق (${formatMoney(expectedMinimumSalary)} ج.م).`,
      });
      setNegotiationTarget(null);
    } finally {
      setSendingOffer(false);
    }
  };

  const handleProceedToProduction = () => {
    if (!draft.directorId) {
      setErrorMsg(
        'يرجى التعاقد مع مخرج العمل أولاً من قائمة «المخرج والطاقم الفني» قبل بدء التصوير!'
      );
      return;
    }
    if (signedActorIds.length === 0) {
      setErrorMsg(
        'يرجى التعاقد مع ممثل واحد على الأقل من «سوق الممثلين» وانتظار موافقته قبل الانتقال للتصوير!'
      );
      return;
    }
    setErrorMsg(null);
    setActiveScreen('PRODUCTION_CRISES');
  };

  // Filter & sort actors for the unified Actor Market
  const query = actorSearchQuery.trim().toLowerCase();
  const filteredActors = allLiveActors.filter((actor) => {
    if ((actor.unlockDay ?? 1) > gameDay) return false;

    if (actorTierFilter === 'RISING') {
      if (!actor.isRisingDiscovery) return false;
    } else if (actorTierFilter === 'EVOLVED') {
      if (!actor.overallDelta || actor.overallDelta === 0) return false;
    } else if (actorTierFilter !== 'ALL') {
      if (actor.tier !== actorTierFilter) return false;
    }

    if (query) {
      const matchName = actor.name.toLowerCase().includes(query);
      const matchArch = (actor.archetype || '').toLowerCase().includes(query);
      if (!matchName && !matchArch) return false;
    }
    return true;
  });

  const sortedActors = [...filteredActors].sort((a, b) => {
    const aSigned = signedActorIds.includes(a.id) ? 1 : 0;
    const bSigned = signedActorIds.includes(b.id) ? 1 : 0;
    if (aSigned !== bSigned) return bSigned - aSigned;

    const aPending = draft.talentOffers[a.id]?.status === 'pending' ? 1 : 0;
    const bPending = draft.talentOffers[b.id]?.status === 'pending' ? 1 : 0;
    if (aPending !== bPending) return bPending - aPending;

    return b.stats.overall - a.stats.overall;
  });

  const displayedActors = sortedActors.slice(0, visibleActorCount);
  const canProceedToProduction =
    Boolean(draft.directorId) && signedActorIds.length >= 1;

  return (
    <div className="mx-auto max-w-xl space-y-4 py-2">
      {/* Clean Top Header + 2-List Switcher (سوق الممثلين | المخرج والطاقم الفني) */}
      <div className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/80 bg-white p-4 shadow-[0_12px_30px_-10px_rgba(99,102,241,0.14)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-black text-violet-700">
              المرحلة 2 من 5 · التعاقدات وتشكيل فريق العمل
            </div>
            <h2 className="font-display mt-0.5 text-base font-black text-slate-900 sm:text-lg">
              سوق النجوم لعمل «{draft.title || 'الفرعون الأخير'}»
            </h2>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-[#F4F7FF] px-3 py-1.5 text-left tabular-nums">
            <div className="text-[10px] font-bold text-slate-500">إجمالي العقود الموقعة</div>
            <div className="font-display text-sm font-black text-emerald-700">
              {formatMoney(totalTalentPayroll)} ج.م
            </div>
          </div>
        </div>

        {/* Two Main Market Lists Switcher */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-2xl bg-[#F2F5FF] p-1.5">
          <button
            type="button"
            onClick={() => setMarketSection('actors_market')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-black transition-all ${
              marketSection === 'actors_market'
                ? 'border-2 border-violet-600 bg-white text-violet-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4 text-violet-600" />
            <span>سوق الممثلين ({signedActorIds.length} موقعين)</span>
          </button>

          <button
            type="button"
            onClick={() => setMarketSection('crew_market')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-black transition-all ${
              marketSection === 'crew_market'
                ? 'border-2 border-cyan-500 bg-white text-cyan-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clapperboard className="h-4 w-4 text-cyan-600" />
            <span>
              المخرج والطاقم الفني ({selectedDirector ? 'المخرج ✓' : 'اختر المخرج'})
            </span>
          </button>
        </div>

        {/* Compact Signed Team Summary Strip */}
        {(selectedDirector || allSelectedActors.length > 0 || pendingOffersList.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-indigo-100 pt-3 text-[11px]">
            {selectedDirector && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-black text-emerald-800">
                🎬 المخرج: {selectedDirector.name}
              </span>
            )}
            {allSelectedActors.map((act) => (
              <span
                key={act.id}
                className="inline-flex items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1 font-black text-violet-800"
              >
                ⭐ {act.name}
                {(draft.castCustomRoles || {})[act.id]
                  ? ` (${(draft.castCustomRoles || {})[act.id]})`
                  : ''}
              </span>
            ))}
            {pendingOffersList.map((pend) => (
              <span
                key={pend.talentId}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 font-bold text-amber-900"
              >
                <Clock className="h-3 w-3 animate-spin text-amber-600" />
                {pend.talentName} (يرد يوم {pend.responseDueDay})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ego Clash or Validation Error */}
      {chemistry.warningMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
          <AlertOctagon className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{chemistry.warningMessage}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-3 text-xs font-black text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* Main Content Area: Either Unified Actor Market OR Director & Crew List */}
      <AnimatePresence mode="wait">
        {marketSection === 'actors_market' ? (
          <motion.div
            key="actors-market-list"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-4 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.14)] sm:p-5"
          >
            {/* Search & Filter Bar */}
            <div className="mb-4 space-y-2.5 rounded-2xl border border-indigo-100 bg-[#F8FAFF] p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={actorSearchQuery}
                  onChange={(e) => {
                    setActorSearchQuery(e.target.value);
                    setVisibleActorCount(16);
                  }}
                  placeholder="ابحث عن اسم ممثل أو ممثلة في السوق..."
                  className="w-full rounded-xl border border-indigo-100 bg-white py-2 pr-9 pl-3 text-xs font-bold text-slate-900 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: 'الكل' },
                    { id: 'S', label: 'فئة S الأساطير' },
                    { id: 'A', label: 'فئة A النجوم' },
                    { id: 'B', label: 'فئة B المحترفون' },
                    { id: 'C', label: 'فئة C البرونزية' },
                    {
                      id: 'RISING',
                      label: `✨ مواهب صاعدة (${unlockedRisingTalents.length})`,
                    },
                    { id: 'EVOLVED', label: '🔥 تطوروا مؤخراً' },
                  ] as { id: ActorTierFilter; label: string }[]
                ).map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => {
                      setActorTierFilter(tf.id);
                      setVisibleActorCount(16);
                    }}
                    className={`rounded-xl px-2.5 py-1 text-[10px] font-black transition ${
                      actorTierFilter === tf.id
                        ? 'bg-violet-600 text-white shadow-2xs'
                        : 'border border-indigo-100 bg-white text-slate-600 hover:border-violet-300'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
                <span className="mr-auto text-[10px] font-black text-slate-500 tabular-nums">
                  متاح: {sortedActors.length} ممثل
                </span>
              </div>
            </div>

            {/* Unified Actor Cards Grid */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {displayedActors.map((actor) => {
                const isSelected = signedActorIds.includes(actor.id);
                const customRole =
                  (draft.castCustomRoles || {})[actor.id] ||
                  draft.talentOffers[actor.id]?.customRoleName;
                const offer = draft.talentOffers[actor.id];
                const salary = getNegotiatedCost(actor.id, actor.base_salary);

                return (
                  <EaFcTalentCard
                    key={actor.id}
                    talent={actor}
                    kind="actor"
                    selectedRoleLabel={customRole}
                    isSelected={isSelected}
                    isSlotLocked={false}
                    offer={offer}
                    gameDay={gameDay}
                    awardCount={actorAwardCounts[actor.id] || 0}
                    negotiatedSalary={salary}
                    onNegotiateAndPitch={() =>
                      openNegotiationModal(actor, 'actor', 'lead')
                    }
                    onCancelContract={() => removeTalentFromDraft(actor.id)}
                  />
                );
              })}
            </div>

            {/* Load More Button */}
            {sortedActors.length > visibleActorCount && (
              <button
                type="button"
                onClick={() => setVisibleActorCount((prev) => prev + 20)}
                className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-indigo-200 bg-[#F4F7FF] px-4 py-2.5 text-xs font-black text-violet-700 transition hover:bg-violet-100"
              >
                <ChevronDown className="h-4 w-4" />
                <span>
                  عرض المزيد من الممثلين (متبقي{' '}
                  {sortedActors.length - visibleActorCount} ممثل)
                </span>
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="crew-market-list"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-4 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.14)] sm:p-5"
          >
            {/* Crew Sub-Role Tabs */}
            <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-[#F2F5FF] p-1.5 sm:grid-cols-4">
              {[
                {
                  id: 'director' as const,
                  label: `مخرج العمل (${selectedDirector ? '✓' : 'مطلوب'})`,
                },
                {
                  id: 'cinematographer' as const,
                  label: `مدير التصوير (${selectedDop ? '✓' : 'اختياري'})`,
                },
                {
                  id: 'composer' as const,
                  label: `الموسيقى (${selectedComposer ? '✓' : 'اختياري'})`,
                },
                {
                  id: 'editor_vfx' as const,
                  label: `المونتاج (${selectedVfx ? '✓' : 'اختياري'})`,
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCrewFilter(t.id)}
                  className={`min-h-[38px] rounded-xl px-2 text-xs font-black transition ${
                    crewFilter === t.id
                      ? 'border border-indigo-100 bg-white text-violet-700 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {db.crew
                .filter((c) => c.role === crewFilter)
                .map((member) => {
                  const isSelected =
                    (crewFilter === 'director' && draft.directorId === member.id) ||
                    (crewFilter === 'cinematographer' && draft.dopId === member.id) ||
                    (crewFilter === 'composer' && draft.composerId === member.id) ||
                    (crewFilter === 'editor_vfx' && draft.vfxId === member.id);

                  const isRoleFull =
                    (crewFilter === 'director' && Boolean(draft.directorId)) ||
                    (crewFilter === 'cinematographer' && Boolean(draft.dopId)) ||
                    (crewFilter === 'composer' && Boolean(draft.composerId)) ||
                    (crewFilter === 'editor_vfx' && Boolean(draft.vfxId));

                  const offer = draft.talentOffers[member.id];

                  return (
                    <EaFcTalentCard
                      key={member.id}
                      talent={member}
                      kind="crew"
                      selectedRoleLabel={SLOT_ARABIC_NAMES[crewFilter]}
                      isSelected={isSelected}
                      isSlotLocked={isRoleFull && !isSelected}
                      offer={offer}
                      gameDay={gameDay}
                      onNegotiateAndPitch={() =>
                        openNegotiationModal(member, 'crew', crewFilter)
                      }
                      onCancelContract={() => removeTalentFromDraft(member.id)}
                      negotiatedSalary={getNegotiatedCost(
                        member.id,
                        member.base_salary
                      )}
                    />
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Action Bar to Proceed to Production & Marketing */}
      <div className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white p-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600 mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" />
            <span>
              تم التوقيع مع: المخرج ({draft.directorId ? '1/1' : '0/1'}) · الممثلين الموقعين ({signedActorIds.length})
              {pendingOffersList.length > 0
                ? ` · قيد انتظار الرد (${pendingOffersList.length})`
                : ''}
            </span>
          </div>
          <span className="font-black text-emerald-700 tabular-nums">
            مجموع الأجور: {formatMoney(totalTalentPayroll)} ج.م
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveScreen('PROJECT_SETUP')}
            className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
          >
            <ArrowRight className="h-4 w-4" />
            <span>السيناريو</span>
          </button>

          <button
            type="button"
            onClick={handleProceedToProduction}
            className={`flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 px-5 py-3 text-sm font-black text-white shadow-lg transition active:border-b-0 active:translate-y-1 ${
              canProceedToProduction
                ? 'border-emerald-900/40 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-500/25'
                : 'border-indigo-900/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 shadow-indigo-500/20'
            }`}
          >
            <span>
              {canProceedToProduction
                ? 'اكتمال التعاقدات! الانتقال للميزانيات والتصوير'
                : 'اعتماد الفريق والانتقال للميزانيات والتسويق'}
            </span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Negotiation Modal with Free-Text Role Input (No Pre-set Role Dropdowns!) */}
      <AnimatePresence>
        {negotiationTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-300 bg-white p-5 shadow-2xl"
              dir="rtl"
            >
              {(() => {
                const { talent, kind, roleSlot } = negotiationTarget;
                const isActor = kind === 'actor';
                const actorItem = isActor ? (talent as ActorItem) : null;
                const crewItem = !isActor ? (talent as CrewItem) : null;
                const genreMasteryScore = actorItem
                  ? actorItem.genre_mastery[draft.primaryGenre] || 74
                  : crewItem?.best_genres.includes(draft.primaryGenre)
                  ? 92
                  : 75;
                const egoScore = actorItem ? actorItem.stats.ego : 76;
                const waitDays = egoScore >= 88 ? 3 : 2;

                const {
                  expectedMinimumSalary,
                  acceptanceDifficultyLabel,
                } = calculateTalentExpectedSalary({
                  baseSalary: talent.base_salary,
                  ego: egoScore,
                  genreMasteryScore,
                  studioReputation: reputation,
                  isCameo: false,
                });

                const minSal = Math.max(
                  500_000,
                  Math.round(expectedMinimumSalary * 0.55)
                );
                const maxSal = Math.round(expectedMinimumSalary * 1.45);

                return (
                  <>
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                          <Handshake className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-display text-base font-black text-slate-900">
                            عرض السيناريو والتفاوض مع {talent.name}
                          </h3>
                          <p className="text-[11px] font-bold text-violet-700">
                            {isActor
                              ? `العمر: ${actorItem?.age} سنة · تقييم ${talent.stats.overall}`
                              : SLOT_ARABIC_NAMES[roleSlot]}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNegotiationTarget(null)}
                        className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Script Pitch Preview Card */}
                    <div className="mt-3.5 rounded-2xl border-2 border-indigo-100 bg-[#F6F8FF] p-3">
                      <div className="flex items-center justify-between text-[11px] font-black text-indigo-800">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-violet-600" />
                          <span>سيناريو: «{draft.title || 'الفرعون الأخير'}»</span>
                        </span>
                        <span className="text-[10px] font-black text-emerald-700">
                          ملاءمة التصنيف: {genreMasteryScore}%
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed font-medium text-slate-600">
                        {draft.scriptSynopsis}
                      </p>
                      <div className="mt-1 text-[10px] font-bold text-slate-500">
                        مستوى التفاوض:{' '}
                        <strong className="text-slate-800">
                          {acceptanceDifficultyLabel}
                        </strong>
                      </div>
                    </div>

                    {/* Free-Text Custom Role Input for Actors (Player writes the exact role!) */}
                    {isActor && (
                      <div className="mt-3.5 rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-3.5">
                        <label
                          htmlFor="custom-actor-role-input"
                          className="flex items-center gap-1.5 text-xs font-black text-violet-950"
                        >
                          <PenLine className="h-4 w-4 text-violet-600" />
                          <span>اكتب الدور والشخصية المطلوبة للممثل في العمل:</span>
                        </label>
                        <input
                          id="custom-actor-role-input"
                          type="text"
                          value={customRoleInput}
                          onChange={(e) => setCustomRoleInput(e.target.value)}
                          placeholder="مثال: الضابط يحيى قائد الفرقة / زعيم العصابة الخفي..."
                          className="mt-2 w-full rounded-xl border-2 border-indigo-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-900 focus:border-violet-600 focus:outline-none"
                        />
                        <p className="mt-1 text-[10px] font-bold text-slate-500">
                          سيقرأ الممثل تفاصيل الدور الذي كتبته مع ملخص السيناريو ليقرر قبوله أو اعتذاره.
                        </p>
                      </div>
                    )}

                    {/* Financial Offer Controls */}
                    <div className="mt-3.5 space-y-3">
                      <div className="rounded-2xl border-2 border-indigo-100 bg-white p-3.5">
                        <div className="flex items-center justify-between text-xs font-black">
                          <span className="text-slate-700">الأجر المالي المعروض:</span>
                          <span className="text-base text-emerald-700 tabular-nums">
                            {formatMoney(offeredSalary)} ج.م
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between text-[10px] font-bold text-slate-400 tabular-nums">
                          <span>أجره الأساسي: {formatMoney(talent.base_salary)} ج.م</span>
                          <span className="text-indigo-700">
                            طلبه المتوقع: ~{formatMoney(expectedMinimumSalary)} ج.م
                          </span>
                        </div>

                        <input
                          type="range"
                          min={minSal}
                          max={maxSal}
                          step={500_000}
                          value={offeredSalary}
                          onChange={(e) => setOfferedSalary(Number(e.target.value))}
                          className="mt-2.5 w-full accent-violet-600"
                        />
                      </div>

                      <div className="rounded-2xl border-2 border-indigo-100 bg-white p-3.5">
                        <div className="flex items-center justify-between text-xs font-black">
                          <span className="text-slate-700">
                            نسبة من أرباح العرض (تقنع النجوم الكبار):
                          </span>
                          <span className="text-violet-700 tabular-nums">
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
                          className="mt-2 w-full accent-violet-600"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setVipDinner(!vipDinner)}
                        className={`flex min-h-[42px] w-full items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2 text-xs font-black transition ${
                          vipDinner
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                            : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                        }`}
                      >
                        <Flame className="h-4 w-4" />
                        <span>
                          {vipDinner
                            ? 'تم تفعيل جلسة عمل وعشاء خاص (+فرصة قبول أعلى)'
                            : 'إضافة جلسة قراءة خاصة وعشاء عمل لإقناع النجم'}
                        </span>
                      </button>
                    </div>

                    {errorMsg && (
                      <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs font-black text-rose-700">
                        {errorMsg}
                      </div>
                    )}

                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-center text-[11px] font-bold text-amber-900">
                      ⏳ سيدرس النجم الدور والسيناريو ويرد عليك خلال{' '}
                      <strong>
                        {waitDays} أيام في اللعبة (
                        {formatGameDate(gameDay + waitDays, currentYear)})
                      </strong>
                    </div>

                    <button
                      type="button"
                      disabled={sendingOffer}
                      onClick={handleSendPitchAndOffer}
                      className="mt-3.5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-950/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:border-b-0 active:translate-y-1 disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {sendingOffer
                          ? 'جاري إرسال الدور والسيناريو والعقد...'
                          : 'إرسال الدور والعرض الرسمي الآن'}
                      </span>
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
