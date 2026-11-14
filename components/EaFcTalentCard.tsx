'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ActorItem, CrewItem, GENRES, GenreId } from '@/lib/db-resolver';
import { getCardTierClass, formatMoney } from '@/lib/game-engine';
import { TalentOfferRecord } from '@/lib/store';
import {
  Award,
  CheckCircle2,
  Clock,
  Handshake,
  Lock,
  Sparkles,
  XCircle,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  User,
} from 'lucide-react';

export function EaFcTalentCard({
  talent,
  kind,
  selectedRoleLabel,
  isSelected,
  isSlotLocked = false,
  offer,
  gameDay = 1,
  onNegotiateAndPitch,
  onCancelContract,
  onOpenChoiceModal,
  awardCount = 0,
  negotiatedSalary,
}: {
  talent: ActorItem | CrewItem;
  kind: 'actor' | 'crew';
  selectedRoleLabel?: string;
  isSelected?: boolean;
  isSlotLocked?: boolean;
  offer?: TalentOfferRecord;
  gameDay?: number;
  onNegotiateAndPitch?: () => void;
  onCancelContract?: () => void;
  onOpenChoiceModal?: () => void;
  awardCount?: number;
  negotiatedSalary?: number;
}) {
  const overall = talent.stats.overall;
  const tier = getCardTierClass(overall);
  const displaySalary = offer?.offeredSalary ?? negotiatedSalary ?? talent.base_salary;

  const isActor = kind === 'actor';
  const actor = isActor ? (talent as ActorItem) : null;
  const crew = !isActor ? (talent as CrewItem) : null;

  const initials = talent.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  const daysRemaining = offer ? Math.max(1, offer.responseDueDay - gameDay) : 0;
  const isSigned = Boolean(isSelected || offer?.status === 'accepted');
  const isBusyWithRival = Boolean(
    actor?.busyUntilDay && actor.busyUntilDay > gameDay && !isSigned
  );
  const customRoleDisplay =
    offer?.customRoleName || selectedRoleLabel || undefined;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: (isSlotLocked || isBusyWithRival) && !isSigned ? 0 : -2 }}
      transition={{ duration: 0.16 }}
      className={`relative flex flex-col justify-between rounded-3xl border-2 bg-gradient-to-b p-4 transition-all ${
        tier.borderClass
      } ${tier.bgGradient} ${
        isSigned
          ? 'ring-3 ring-emerald-500 shadow-lg shadow-emerald-500/15'
          : offer?.status === 'accepted_awaiting_choice'
          ? 'ring-3 ring-violet-500 shadow-lg shadow-violet-500/20'
          : offer?.status === 'pending'
          ? 'ring-2 ring-amber-400 shadow-md shadow-amber-500/10'
          : offer?.status === 'rejected'
          ? 'ring-2 ring-rose-300'
          : isSlotLocked || isBusyWithRival
          ? 'opacity-80'
          : ''
      }`}
    >
      {/* Top Row: OVR + Avatar + Name, Age & Salary */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* OVR Shield + Evolution Delta */}
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-indigo-100 bg-white px-2.5 py-1.5 shadow-xs shrink-0">
            <div className="flex items-center gap-0.5">
              <span
                className={`font-display text-2xl font-black leading-none tabular-nums ${tier.textColor}`}
              >
                {overall}
              </span>
            </div>
            <span className="mt-0.5 text-[9px] font-black tracking-wider text-slate-400">
              {actor ? `فئة ${actor.tier}` : tier.tierName}
            </span>
            {actor?.overallDelta && actor.overallDelta !== 0 ? (
              <span
                className={`mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-black tabular-nums ${
                  actor.overallDelta > 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {actor.overallDelta > 0 ? (
                  <>
                    <TrendingUp className="h-2.5 w-2.5" />+{actor.overallDelta}
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-2.5 w-2.5" />
                    {actor.overallDelta}
                  </>
                )}
              </span>
            ) : null}
          </div>

          {/* Avatar + Name + Age */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-indigo-100 bg-white shadow-inner">
              {talent.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={talent.image_url}
                  alt={talent.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className={`font-display text-base font-black ${tier.textColor}`}>
                  {initials}
                </span>
              )}
              {awardCount > 0 && (
                <div className="absolute -bottom-0.5 -right-0.5 flex items-center gap-0.5 rounded-tl-md bg-amber-500 px-1 text-[9px] font-black text-white tabular-nums">
                  <Award className="h-2.5 w-2.5" />
                  {awardCount}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="font-display truncate text-sm font-black text-slate-900">
                  {talent.name}
                </h4>
                {actor?.isRisingDiscovery && (
                  <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800 border border-amber-300">
                    موهبة صاعدة ✨
                  </span>
                )}
              </div>

              {/* Age & Archetype Line */}
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-600 tabular-nums">
                {actor && (
                  <span className="inline-flex items-center gap-0.5 font-black text-slate-700">
                    <User className="h-2.5 w-2.5 text-violet-600" />
                    <span>العمر: {actor.age} سنة</span>
                  </span>
                )}
                {actor?.archetype && (
                  <span className="truncate text-indigo-700">· {actor.archetype}</span>
                )}
              </div>

              {/* Salary & Custom Role */}
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-600 tabular-nums">
                <span className="font-black text-emerald-700">
                  {formatMoney(displaySalary)} ج.م
                </span>
                {customRoleDisplay && (
                  <span className="truncate text-[10px] font-black text-violet-700">
                    · الدور: «{customRoleDisplay}»
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evolution Note Banner if actor recently leveled up or dropped */}
      {actor?.lastEvolutionNote && (
        <div
          className={`mt-2 rounded-xl px-2.5 py-1 text-[10px] font-black ${
            (actor.overallDelta || 0) >= 0
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {actor.lastEvolutionNote}
        </div>
      )}

      {/* Compact 4-Stat Grid */}
      {actor && (
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center text-[10px] tabular-nums">
          <div className="rounded-xl border border-indigo-100/80 bg-white/90 py-1 px-1">
            <div className="font-bold text-slate-400">تمثيل</div>
            <div className="text-xs font-black text-slate-900">{actor.stats.acting}</div>
          </div>
          <div className="rounded-xl border border-indigo-100/80 bg-white/90 py-1 px-1">
            <div className="font-bold text-slate-400">كاريزما</div>
            <div className="text-xs font-black text-slate-900">{actor.stats.charisma}</div>
          </div>
          <div className="rounded-xl border border-indigo-100/80 bg-white/90 py-1 px-1">
            <div className="font-bold text-slate-400">شباك</div>
            <div className="text-xs font-black text-violet-700">{actor.stats.box_office_pull}</div>
          </div>
          <div className="rounded-xl border border-indigo-100/80 bg-white/90 py-1 px-1">
            <div className="font-bold text-slate-400">غرور</div>
            <div
              className={`text-xs font-black ${
                actor.stats.ego >= 90 ? 'text-rose-600' : 'text-slate-800'
              }`}
            >
              {actor.stats.ego}
            </div>
          </div>
        </div>
      )}

      {crew && (
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center text-[10px] tabular-nums">
          <div className="rounded-xl border border-indigo-100/80 bg-white/90 py-1 px-1">
            <div className="font-bold text-slate-400">إبداع</div>
            <div className="text-xs font-black text-violet-700">{crew.stats.vision}</div>
          </div>
          <div className="rounded-xl border border-indigo-100/80 bg-white/90 py-1 px-1">
            <div className="font-bold text-slate-400">إيقاع</div>
            <div className="text-xs font-black text-slate-900">{crew.stats.pacing}</div>
          </div>
          <div className="rounded-xl border border-indigo-100/80 bg-white/90 py-1 px-1">
            <div className="font-bold text-slate-400">التزام</div>
            <div className="text-xs font-black text-slate-900">{crew.stats.efficiency}</div>
          </div>
          <div className="rounded-xl border border-indigo-100/80 bg-white/90 py-1 px-1">
            <div className="font-bold text-slate-400">سيطرة</div>
            <div className="text-xs font-black text-slate-900">
              {crew.stats.dialogue || crew.stats.control || crew.stats.overall}
            </div>
          </div>
        </div>
      )}

      {/* Unboxed Clean Specialty Line */}
      <div className="mt-2 text-[11px] font-bold text-slate-500 truncate">
        {actor && (
          <span>
            يتألق في:{' '}
            <strong className="font-black text-indigo-900">
              {Object.entries(actor.genre_mastery)
                .filter(([, val]) => (val || 0) >= 85)
                .slice(0, 3)
                .map(([gKey]) => GENRES.find((g) => g.id === (gKey as GenreId))?.name || gKey)
                .join(' · ') || 'متعدد الأدوار'}
            </strong>
          </span>
        )}
        {crew && (
          <span>
            يتألق في:{' '}
            <strong className="font-black text-indigo-900">
              {crew.best_genres
                .slice(0, 3)
                .map((gKey) => GENRES.find((g) => g.id === (gKey as GenreId))?.name || gKey)
                .join(' · ')}
            </strong>
          </span>
        )}
      </div>

      {/* State 1: Pending Multi-Day Script Reading */}
      {offer?.status === 'pending' && (
        <div className="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-3 text-xs">
          <div className="flex items-center justify-between gap-2 font-black text-amber-900">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 animate-spin text-amber-600" />
              <span>يدرس السيناريو والدور حالياً...</span>
            </span>
            <span className="text-[11px] font-black tabular-nums text-amber-950">
              الرد خلال {daysRemaining === 1 ? 'يوم واحد' : `${daysRemaining} أيام`}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-bold text-amber-800 tabular-nums">
            الدور: «{offer.customRoleName || 'بطولة'}» · الأجر: {formatMoney(offer.offeredSalary)} ج.م
          </div>
        </div>
      )}

      {/* State 2: Accepted & Awaiting Player's Multi-Offer Final Selection */}
      {offer?.status === 'accepted_awaiting_choice' && (
        <div className="mt-3 space-y-2 rounded-2xl border-2 border-violet-400 bg-violet-50/95 p-3 text-xs">
          <div className="flex items-center justify-between gap-1.5 font-black text-violet-900">
            <span className="flex items-center gap-1">
              <Sparkles className="h-4 w-4 shrink-0 text-violet-600" />
              <span>وافق على الدور! (بانتظار حسمك النهائي)</span>
            </span>
          </div>
          {offer.aiReason && (
            <p className="rounded-xl border border-violet-200 bg-white/90 p-2 text-[11px] leading-relaxed font-bold text-slate-800">
              &ldquo;{offer.aiReason}&rdquo;
            </p>
          )}
          {onOpenChoiceModal && (
            <button
              type="button"
              onClick={onOpenChoiceModal}
              className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border-b-4 border-violet-900/40 bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-black text-white shadow-xs transition active:border-b-0 active:translate-y-1"
            >
              <span>افتح شاشة حسم الاختيار النهائي</span>
            </button>
          )}
        </div>
      )}

      {/* State 3: Officially Signed */}
      {isSigned && (
        <div className="mt-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50/95 p-3 text-xs">
          <div className="flex items-center justify-between gap-1.5">
            <span className="flex items-center gap-1 font-black text-emerald-900">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                {customRoleDisplay ? `تعاقد رسمي: «${customRoleDisplay}»` : 'تم التوقيع الرسمي!'}
              </span>
            </span>
            {onCancelContract && (
              <button
                type="button"
                onClick={onCancelContract}
                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-0.5 text-[10px] font-black text-rose-600 hover:bg-rose-50"
                title="فسخ العقد وتغيير الاختيار"
              >
                <Trash2 className="h-3 w-3" />
                <span>إلغاء</span>
              </button>
            )}
          </div>
          {offer?.aiReason && (
            <p className="mt-1.5 rounded-xl border border-emerald-200/80 bg-white/85 p-2 text-[11px] leading-relaxed font-bold text-emerald-950">
              &ldquo;{offer.aiReason}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* State 4: Rejected Offer */}
      {offer?.status === 'rejected' && (
        <div className="mt-3 space-y-2 rounded-2xl border-2 border-rose-300 bg-rose-50/95 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-black text-rose-800">
            <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>اعتذر عن الدور</span>
          </div>
          {offer.aiReason && (
            <p className="rounded-xl border border-rose-200 bg-white/85 p-2 text-[11px] leading-relaxed font-bold text-rose-950">
              &ldquo;{offer.aiReason}&rdquo;
            </p>
          )}
          {!isSlotLocked && !isBusyWithRival && onNegotiateAndPitch && (
            <button
              type="button"
              onClick={onNegotiateAndPitch}
              className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border-b-4 border-violet-900/40 bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-black text-white shadow-xs transition active:border-b-0 active:translate-y-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>إعادة التفاوض وتعديل الدور أو الأجر</span>
            </button>
          )}
        </div>
      )}

      {/* State 5: Busy Filming with a Rival Studio */}
      {!isSigned && isBusyWithRival && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-100 p-2.5 text-center text-[11px] font-black text-slate-600">
          مشغول بتصوير عمل مع «{actor?.busyWithStudio}» (متاح بعد{' '}
          {Math.max(1, (actor?.busyUntilDay || gameDay) - gameDay)} يوم)
        </div>
      )}

      {/* State 6: Slot Locked */}
      {!isSigned &&
        !isBusyWithRival &&
        offer?.status !== 'pending' &&
        offer?.status !== 'accepted_awaiting_choice' &&
        isSlotLocked && (
          <button
            type="button"
            disabled
            className="mt-3 flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-500"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>مكتمل العدد (ألغِ عقداً للتغيير)</span>
          </button>
        )}

      {/* Primary Action Button: التفاوض وتحديد الدور */}
      {!isSigned &&
        !isSlotLocked &&
        !isBusyWithRival &&
        offer?.status !== 'pending' &&
        offer?.status !== 'accepted_awaiting_choice' &&
        offer?.status !== 'rejected' &&
        onNegotiateAndPitch && (
          <button
            type="button"
            onClick={onNegotiateAndPitch}
            className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-950/35 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-500/20 transition hover:brightness-105 active:border-b-0 active:translate-y-1"
          >
            <Handshake className="h-4 w-4 shrink-0" />
            <span>{isActor ? 'اختيار الممثل وتحديد دوره وأجره' : 'التفاوض وعرض فكرة العمل'}</span>
          </button>
        )}
    </motion.div>
  );
}
