'use client';

import React, { useMemo, useState } from 'react';
import {
  useGameStore,
  OfferRoleSlot,
  SLOT_ARABIC_NAMES,
  SLOT_MAX_CAPACITY,
  getSignedIdsForSlot,
  getLiveActorsWithEvolution,
} from '@/lib/store';
import {
  formatMoney,
  evaluateCastChemistry,
  calculateTalentExpectedSalary,
} from '@/lib/game-engine';
import { getResolvedDatabase } from '@/lib/db-resolver';
import EaFcTalentCard, {
  UnifiedTalentCardData,
  TalentInspectorDrawer,
} from './EaFcTalentCard';
import {
  Users,
  Clapperboard,
  Camera,
  Music,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Handshake,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  playClickSound,
  playTabSwitchSound,
  playContractSignedSound,
} from '@/lib/game-audio';

const SLOT_TABS: { id: OfferRoleSlot; label: string; icon: React.ElementType }[] =
  [
    { id: 'director', label: 'المخرج (1)', icon: Clapperboard },
    { id: 'lead', label: 'البطولة (2)', icon: Users },
    { id: 'antagonist', label: 'الشرير (1)', icon: Users },
    { id: 'supporting', label: 'مساعد (4)', icon: Users },
    { id: 'cameo', label: 'ضيف شرف (2)', icon: Sparkles },
    { id: 'cinematographer', label: 'تصوير', icon: Camera },
    { id: 'composer', label: 'موسيقى', icon: Music },
    { id: 'editor_vfx', label: 'مونتاج', icon: Sparkles },
  ];

export default function Stage3CrewCastCards() {
  const {
    draft,
    updateDraft,
    removeTalentFromDraft,
    setActiveScreen,
    reputation,
    currentYear,
    gameDay,
    aiGeneratedActors,
    actorDynamicState,
    actorAwardCounts,
    customDbPatch,
  } = useGameStore();

  const [activeSlot, setActiveSlot] = useState<OfferRoleSlot>('director');
  const [inspectItem, setInspectItem] =
    useState<UnifiedTalentCardData | null>(null);
  const [negotiatingItem, setNegotiatingItem] =
    useState<UnifiedTalentCardData | null>(null);
  const [offerSalary, setOfferSalary] = useState<number>(0);
  const [offerBackend, setOfferBackend] = useState<number>(0);
  const [customRoleName, setCustomRoleName] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch),
    [customDbPatch]
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

  const isCrewSlot =
    activeSlot === 'director' ||
    activeSlot === 'cinematographer' ||
    activeSlot === 'composer' ||
    activeSlot === 'editor_vfx';

  const cardItems: UnifiedTalentCardData[] = useMemo(() => {
    if (isCrewSlot) {
      return db.crew
        .filter((c) => c.role === activeSlot)
        .map((c) => {
          const ovr = c.stats.overall;
          const tier: 'S' | 'A' | 'B' | 'C' =
            ovr >= 90 ? 'S' : ovr >= 82 ? 'A' : ovr >= 74 ? 'B' : 'C';
          return {
            id: c.id,
            name: c.name,
            roleLabel: SLOT_ARABIC_NAMES[activeSlot],
            overall: ovr,
            tier,
            salary: c.base_salary,
            stat1Label: 'رؤية',
            stat1Val: c.stats.vision,
            stat2Label: 'إيقاع',
            stat2Val: c.stats.pacing,
            stat3Label: 'كفاءة',
            stat3Val: c.stats.efficiency,
            specialtyText:
              c.specialty || 'خبير صناعة سينمائية في كبرى الاستوديوهات',
          };
        });
    }

    return liveActors
      .filter((a) => a.status !== 'retired' && a.status !== 'deceased')
      .map((a) => ({
        id: a.id,
        name: a.name,
        roleLabel: a.archetype || 'نجم تمثيل',
        overall: a.stats.overall,
        tier: a.tier,
        salary:
          activeSlot === 'cameo'
            ? Math.round(a.base_salary * 0.25)
            : a.base_salary,
        age: a.age,
        gender: a.gender,
        stat1Label: 'تمثيل',
        stat1Val: a.stats.acting,
        stat2Label: 'كاريزما',
        stat2Val: a.stats.charisma,
        stat3Label: 'شباك',
        stat3Val: a.stats.box_office_pull,
        specialtyText: a.archetype || 'نجم سينمائي ودرامي',
        awardCount: actorAwardCounts[a.id] || 0,
        isBusy: Boolean(a.busyUntilDay && a.busyUntilDay > gameDay),
        busyNote: a.busyWithStudio,
      }));
  }, [isCrewSlot, db.crew, activeSlot, liveActors, actorAwardCounts, gameDay]);

  const signedIdsInActiveSlot = getSignedIdsForSlot(draft, activeSlot);

  const isIdSignedAnywhere = (id: string) =>
    draft.directorId === id ||
    draft.dopId === id ||
    draft.composerId === id ||
    draft.vfxId === id ||
    draft.leadActorIds.includes(id) ||
    draft.antagonistId === id ||
    draft.supportingActorIds.includes(id) ||
    draft.cameoActorIds.includes(id);

  // Cast Chemistry
  const selectedCastObjects = useMemo(() => {
    const allCastIds = [
      ...draft.leadActorIds,
      ...(draft.antagonistId ? [draft.antagonistId] : []),
      ...draft.supportingActorIds,
    ];
    return liveActors.filter((a) => allCastIds.includes(a.id));
  }, [draft, liveActors]);

  const chemistry = useMemo(
    () => evaluateCastChemistry(selectedCastObjects, 85),
    [selectedCastObjects]
  );

  const handleCardAction = (item: UnifiedTalentCardData) => {
    if (isIdSignedAnywhere(item.id)) {
      removeTalentFromDraft(item.id);
      return;
    }
    setNegotiatingItem(item);
    setOfferSalary(item.salary);
    setOfferBackend(0);
    setCustomRoleName('');
    setFeedback(null);
  };

  const handleConfirmContract = () => {
    if (!negotiatingItem) return;

    const expected = calculateTalentExpectedSalary({
      baseSalary: negotiatingItem.salary,
      ego: 75,
      genreMasteryScore: 85,
      studioReputation: reputation,
      isCameo: activeSlot === 'cameo',
    });

    const effectiveOffer = offerSalary * (1 + offerBackend * 0.025);
    if (effectiveOffer < expected.expectedMinimumSalary * 0.85) {
      playClickSound();
      setFeedback(
        `رفض وكيل أعمال «${negotiatingItem.name}» العرض المالي لكونه أقل من الحد الأدنى المتوقع (${formatMoney(
          expected.expectedMinimumSalary
        )}).`
      );
      return;
    }

    playContractSignedSound();
    const id = negotiatingItem.id;
    const nextDiscounts = {
      ...draft.negotiatedDiscounts,
      [id]: { backendPoints: offerBackend, vipDinner: false },
    };
    const nextCustomRoles = customRoleName.trim()
      ? { ...draft.castCustomRoles, [id]: customRoleName.trim() }
      : draft.castCustomRoles;

    if (activeSlot === 'director') {
      updateDraft({
        directorId: id,
        negotiatedDiscounts: nextDiscounts,
        castCustomRoles: nextCustomRoles,
      });
    } else if (activeSlot === 'cinematographer') {
      updateDraft({
        dopId: id,
        negotiatedDiscounts: nextDiscounts,
      });
    } else if (activeSlot === 'composer') {
      updateDraft({
        composerId: id,
        negotiatedDiscounts: nextDiscounts,
      });
    } else if (activeSlot === 'editor_vfx') {
      updateDraft({
        vfxId: id,
        negotiatedDiscounts: nextDiscounts,
      });
    } else if (activeSlot === 'lead') {
      if (draft.leadActorIds.length >= 2) {
        setFeedback('الحد الأقصى للبطولة الأساسية هو نجمان (2).');
        return;
      }
      updateDraft({
        leadActorIds: [...draft.leadActorIds, id],
        negotiatedDiscounts: nextDiscounts,
        castCustomRoles: nextCustomRoles,
      });
    } else if (activeSlot === 'antagonist') {
      updateDraft({
        antagonistId: id,
        negotiatedDiscounts: nextDiscounts,
        castCustomRoles: nextCustomRoles,
      });
    } else if (activeSlot === 'supporting') {
      if (draft.supportingActorIds.length >= 4) {
        setFeedback('الحد الأقصى للأدوار المساعدة هو 4 ممثلين.');
        return;
      }
      updateDraft({
        supportingActorIds: [...draft.supportingActorIds, id],
        negotiatedDiscounts: nextDiscounts,
        castCustomRoles: nextCustomRoles,
      });
    } else if (activeSlot === 'cameo') {
      if (draft.cameoActorIds.length >= 2) {
        setFeedback('الحد الأقصى لضيوف الشرف هو نجمان (2).');
        return;
      }
      updateDraft({
        cameoActorIds: [...draft.cameoActorIds, id],
        negotiatedDiscounts: nextDiscounts,
        castCustomRoles: nextCustomRoles,
      });
    }

    setNegotiatingItem(null);
  };

  const canProceed = Boolean(
    draft.directorId && draft.leadActorIds.length >= 1
  );

  return (
    <div className="space-y-2">
      {/* Top Role Slot Filter Bar + Chemistry Badge */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-slate-800/90 bg-slate-900/75 px-2.5 py-1.5">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {SLOT_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeSlot === tab.id;
            const signedCount = getSignedIdsForSlot(draft, tab.id).length;
            const maxCap = SLOT_MAX_CAPACITY[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playTabSwitchSound();
                  setActiveSlot(tab.id);
                }}
                className={`flex min-h-[28px] items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all shrink-0 ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.label}</span>
                <span
                  className={`rounded px-1 text-[8px] font-black ${
                    active
                      ? 'bg-black/20 text-slate-950'
                      : signedCount > 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-amber-300'
                  }`}
                >
                  {signedCount}/{maxCap}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 shrink-0">
          <Sparkles className="h-3 w-3" />
          <span>تناغم الأبطال: {chemistry.chemistryScore}%</span>
        </div>
      </div>

      {/* Compact 3-Column Grid of EA FC Talent Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[46dvh] overflow-y-auto scrollbar-hide pr-0.5">
        {cardItems.slice(0, 36).map((item) => (
          <EaFcTalentCard
            key={item.id}
            item={item}
            isSelected={
              signedIdsInActiveSlot.includes(item.id) ||
              isIdSignedAnywhere(item.id)
            }
            onSelect={() => handleCardAction(item)}
            onInspect={() => setInspectItem(item)}
          />
        ))}
      </div>

      {/* Stage 3 Footer Bar */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setActiveScreen('PROJECT_SETUP');
          }}
          className="flex min-h-[32px] items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-300 hover:text-white"
        >
          <ArrowRight className="h-3 w-3" />
          <span>العودة لإعداد العمل</span>
        </button>

        <div className="flex items-center gap-2">
          {!canProceed && (
            <span className="text-[10px] font-bold text-amber-300 hidden sm:inline">
              اختر مخرجاً وبطل عمل واحد على الأقل للمتابعة
            </span>
          )}
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => {
              playClickSound();
              setActiveScreen('PRODUCTION_CRISES');
            }}
            className="flex min-h-[32px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1 text-xs font-black text-slate-950 shadow-sm disabled:opacity-40 hover:brightness-110 active:scale-95"
          >
            <span>الانتقال لبلاتوه التصوير والميزانية</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Inspector Drawer */}
      <TalentInspectorDrawer
        item={inspectItem}
        onClose={() => setInspectItem(null)}
        onNegotiate={() => {
          if (inspectItem) handleCardAction(inspectItem);
        }}
      />

      {/* Compact Contract Negotiation Modal */}
      {negotiatingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/35 bg-slate-950/95 p-3.5 shadow-2xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-amber-400" />
                <div>
                  <h3 className="text-xs font-black text-white">
                    مفاوضات التعاقد: {negotiatingItem.name}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    الدور: {SLOT_ARABIC_NAMES[activeSlot]} • الأجر الأساسي:{' '}
                    {formatMoney(negotiatingItem.salary)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNegotiatingItem(null)}
                className="rounded-lg border border-slate-800 bg-slate-900 p-1 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Custom Character Name */}
            {!isCrewSlot && (
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">
                  اسم الشخصية داخل العمل (اختياري)
                </label>
                <input
                  type="text"
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  placeholder="مثال: العقيد سيف / المعلم سلطان..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}

            {/* Salary Offer Presets */}
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="font-bold text-slate-300">
                  الأجر النقدي المعروض
                </span>
                <span className="font-mono font-black text-emerald-300">
                  {formatMoney(offerSalary)}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '-15% تفاوض', mult: 0.85 },
                  { label: '-5% مرن', mult: 0.95 },
                  { label: '100% الأجر', mult: 1.0 },
                  { label: '+15% إغراء', mult: 1.15 },
                ].map((preset) => {
                  const val = Math.round(negotiatingItem.salary * preset.mult);
                  const active = offerSalary === val;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setOfferSalary(val);
                      }}
                      className={`rounded-lg border py-1 text-[9px] font-bold transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-black'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Backend Profit Points */}
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="font-bold text-slate-300">
                  نسبة من أرباح شباك التذاكر (Backend Points)
                </span>
                <span className="font-mono font-black text-amber-300">
                  {offerBackend}%
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[0, 2, 5, 8, 12].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setOfferBackend(pts);
                    }}
                    className={`rounded-lg border py-1 font-mono text-[10px] font-black transition-all ${
                      offerBackend === pts
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    {pts}%
                  </button>
                ))}
              </div>
            </div>

            {feedback && (
              <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-bold text-rose-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setNegotiatingItem(null)}
                className="min-h-[32px] rounded-xl border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmContract}
                className="flex min-h-[32px] items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3.5 py-1 text-[11px] font-black text-slate-950"
              >
                <Check className="h-3.5 w-3.5" />
                <span>توقيع العقد</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
