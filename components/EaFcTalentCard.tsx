'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ActorItem, CrewItem, GENRES, GenreId } from '@/lib/db-resolver';
import { formatMoney } from '@/lib/game-engine';
import { TalentOfferRecord } from '@/lib/store';
import { TalentCharacterPortraitSvg } from './CinematicGraphicsScene';
import {
  CheckCircle2,
  Clock,
  Handshake,
  Lock,
  Sparkles,
  XCircle,
  RefreshCw,
  Trash2,
  User,
  X,
  Star,
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
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const overall = talent.stats.overall;
  const displaySalary = offer?.offeredSalary ?? negotiatedSalary ?? talent.base_salary;
  const isActor = kind === 'actor';
  const actor = isActor ? (talent as ActorItem) : null;
  const crew = !isActor ? (talent as CrewItem) : null;
  const daysRemaining = offer ? Math.max(1, offer.responseDueDay - gameDay) : 0;
  const isSigned = Boolean(isSelected || offer?.status === 'accepted');
  const isBusyWithRival = Boolean(actor?.busyUntilDay && actor.busyUntilDay > gameDay && !isSigned);
  const customRoleDisplay = offer?.customRoleName || selectedRoleLabel || undefined;

  useEffect(() => setPortalReady(true), []);

  const status = isSigned
    ? 'تم التعاقد'
    : offer?.status === 'pending'
      ? `بانتظار الرد · ${daysRemaining} يوم`
      : offer?.status === 'accepted_awaiting_choice'
        ? 'موافقة مبدئية'
        : offer?.status === 'rejected'
          ? 'رفض العرض'
          : isBusyWithRival
            ? 'مرتبط بمنافس'
            : isSlotLocked
              ? 'المقعد مكتمل'
              : 'متاح للتفاوض';

  const statusColor = isSigned
    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
    : offer?.status === 'pending'
      ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
      : offer?.status === 'accepted_awaiting_choice'
        ? 'border-violet-400/40 bg-violet-400/10 text-violet-200'
        : offer?.status === 'rejected'
          ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
          : isBusyWithRival || isSlotLocked
            ? 'border-slate-500/40 bg-slate-500/10 text-slate-300'
            : 'border-amber-500/35 bg-amber-500/10 text-amber-200';

  const category = actor
    ? `ممثل · فئة ${actor.tier}`
    : crew
      ? customRoleDisplay || crew.role.replaceAll('_', ' ')
      : 'طاقم فني';

  const mastery = actor
    ? Object.entries(actor.genre_mastery)
        .filter(([, value]) => (value || 0) >= 85)
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .slice(0, 5)
        .map(([genre]) => GENRES.find((item) => item.id === (genre as GenreId))?.name || genre)
    : crew?.best_genres
        .slice(0, 5)
        .map((genre) => GENRES.find((item) => item.id === genre)?.name || genre) || [];

  const inspector = (
    <AnimatePresence>
      {inspectorOpen && (
        <motion.div
          key={`inspector-${talent.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex justify-end bg-black/65 backdrop-blur-sm"
          dir="rtl"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setInspectorOpen(false);
          }}
        >
          <motion.aside
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="flex h-full w-[min(92vw,420px)] flex-col overflow-y-auto border-l border-amber-400/25 bg-[#0c0d12]/95 p-4 text-right text-slate-100 shadow-2xl backdrop-blur-xl"
            aria-label={`تفاصيل ${talent.name}`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
              <div>
                <p className="text-[10px] font-black tracking-[0.15em] text-amber-300">TALENT INSPECTOR</p>
                <h3 className="mt-1 font-display text-lg font-black text-white">ملف الموهبة والتفاوض</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectorOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-amber-400/40 hover:text-amber-200"
                aria-label="إغلاق التفاصيل"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-white/[0.035] p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-amber-400/30 bg-slate-950">
                {talent.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={talent.image_url} alt={talent.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                ) : (
                  <TalentCharacterPortraitSvg
                    name={talent.name}
                    gender={actor ? actor.gender : 'M'}
                    role={crew ? crew.role : 'actor'}
                    tier={actor ? actor.tier : overall >= 90 ? 'S' : overall >= 84 ? 'A' : 'B'}
                    age={actor ? actor.age : 42}
                    isRising={Boolean(actor?.isRisingDiscovery || actor?.isAiGenerated)}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-display text-base font-black text-white">{talent.name}</h4>
                <p className="mt-0.5 truncate text-[11px] font-bold text-amber-200">{category}</p>
                <p className="mt-1 text-xs font-black text-emerald-300">{formatMoney(displaySalary)} ج.م</p>
              </div>
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-amber-400/35 bg-amber-400/10">
                <span className="text-2xl font-black leading-none text-amber-200">{overall}</span>
                <span className="mt-1 text-[9px] font-black tracking-wider text-amber-300">OVR</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-black text-white">تقييمات المهارة</h4>
                <span className="text-[10px] font-bold text-slate-500">تحليل الأداء</span>
              </div>
              {actor ? (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['التمثيل', actor.stats.acting],
                    ['الكاريزما', actor.stats.charisma],
                    ['قوة الشباك', actor.stats.box_office_pull],
                    ['الغرور', actor.stats.ego],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.035] p-2.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-400">
                        <span>{label}</span>
                        <span className="text-sm font-black text-amber-200">{value}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-l from-amber-300 to-amber-600" style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : crew ? (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['الرؤية', crew.stats.vision],
                    ['الإيقاع', crew.stats.pacing],
                    ['الكفاءة', crew.stats.efficiency],
                    ['السيطرة', crew.stats.dialogue || crew.stats.control || crew.stats.overall],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.035] p-2.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-400">
                        <span>{label}</span>
                        <span className="text-sm font-black text-amber-200">{value}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-l from-amber-300 to-amber-600" style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center gap-2 text-xs font-black text-white">
                <Star className="h-3.5 w-3.5 text-amber-300" /> التخصصات الفنية
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mastery.length > 0 ? mastery.map((item) => (
                  <span key={item} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-100">{item}</span>
                )) : <span className="text-[11px] text-slate-400">متعدد التخصصات</span>}
              </div>
              {actor && (
                <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                  <p className="flex items-center gap-1.5"><User className="h-3 w-3" /> العمر: {actor.age} سنة · الطابع: {actor.archetype || 'متنوع'}</p>
                  {actor.lastEvolutionNote && <p className="text-amber-200">{actor.lastEvolutionNote}</p>}
                </div>
              )}
              {crew && <p className="mt-3 text-[11px] text-slate-400">المسمى: {crew.role.replaceAll('_', ' ')}</p>}
            </div>

            {offer?.aiReason && (
              <div className={`mt-3 rounded-2xl border p-3 text-xs leading-6 ${offer.status === 'rejected' ? 'border-rose-400/25 bg-rose-500/10 text-rose-100' : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'}`}>
                <div className="mb-1 text-[10px] font-black tracking-wider text-current/70">رأي وكيل الأعمال</div>
                «{offer.aiReason}»
              </div>
            )}

            <div className="mt-auto space-y-2 pt-4">
              {offer?.status === 'pending' && (
                <div className="flex items-center justify-between rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[11px] font-bold text-amber-100">
                  <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> يدرس العرض حالياً</span>
                  <span>متبقي {daysRemaining} يوم</span>
                </div>
              )}
              {offer?.status === 'accepted_awaiting_choice' && onOpenChoiceModal && (
                <button type="button" onClick={() => { onOpenChoiceModal(); setInspectorOpen(false); }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-black text-white">
                  <Sparkles className="h-4 w-4" /> حسم الاختيار النهائي
                </button>
              )}
              {isSigned && onCancelContract && (
                <button type="button" onClick={() => { onCancelContract(); setInspectorOpen(false); }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-200">
                  <Trash2 className="h-4 w-4" /> إلغاء التعاقد
                </button>
              )}
              {!isSigned && !isSlotLocked && !isBusyWithRival && offer?.status !== 'pending' && offer?.status !== 'accepted_awaiting_choice' && onNegotiateAndPitch && (
                <button type="button" onClick={() => { onNegotiateAndPitch(); setInspectorOpen(false); }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-300/35 bg-gradient-to-r from-amber-500 to-amber-300 px-3 py-2 text-xs font-black text-[#17120a] shadow-lg shadow-amber-900/20">
                  {offer?.status === 'rejected' ? <RefreshCw className="h-4 w-4" /> : <Handshake className="h-4 w-4" />}
                  {offer?.status === 'rejected' ? 'إعادة التفاوض' : 'بدء التفاوض وتقديم العرض'}
                </button>
              )}
              {isBusyWithRival && <p className="text-center text-[11px] font-bold text-slate-400">متاح بعد {Math.max(1, (actor?.busyUntilDay || gameDay) - gameDay)} يوم</p>}
              {isSlotLocked && !isSigned && <p className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400"><Lock className="h-3.5 w-3.5" /> المقعد مكتمل؛ ألغِ عقداً للتغيير</p>}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        role="button"
        tabIndex={0}
        aria-label={`عرض تفاصيل ${talent.name}`}
        onClick={() => setInspectorOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setInspectorOpen(true);
          }
        }}
        className={`group relative flex min-h-[112px] cursor-pointer items-center gap-2.5 overflow-hidden rounded-2xl border bg-gradient-to-br from-[#20202a] via-[#11131a] to-[#0b0c11] p-2.5 text-right shadow-[0_12px_25px_rgba(0,0,0,.23)] transition ${isSigned ? 'border-emerald-400/50 ring-1 ring-emerald-400/20' : offer?.status === 'pending' ? 'border-amber-300/50 ring-1 ring-amber-300/15' : offer?.status === 'rejected' ? 'border-rose-400/40' : 'border-white/10 hover:border-amber-400/45'}`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
        <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-400/30 bg-slate-950 shadow-inner">
          {talent.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={talent.image_url} alt={talent.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <TalentCharacterPortraitSvg
              name={talent.name}
              gender={actor ? actor.gender : 'M'}
              role={crew ? crew.role : 'actor'}
              tier={actor ? actor.tier : overall >= 90 ? 'S' : overall >= 84 ? 'A' : 'B'}
              age={actor ? actor.age : 42}
              isRising={Boolean(actor?.isRisingDiscovery || actor?.isAiGenerated)}
            />
          )}
        </div>

        <div className="min-w-0 flex-1 self-stretch py-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate font-display text-sm font-black text-white">{talent.name}</h4>
              <p className="mt-0.5 truncate text-[10px] font-bold text-amber-200/80">{category}</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-amber-300/40 bg-gradient-to-br from-amber-400/20 to-amber-900/20 shadow-[0_0_18px_rgba(212,175,55,.1)]">
              <span className="text-xl font-black leading-none text-amber-200">{overall}</span>
              <span className="mt-0.5 text-[8px] font-black tracking-widest text-amber-300/70">OVR</span>
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-black tabular-nums text-emerald-300">{formatMoney(displaySalary)} ج.م</span>
            <span className={`inline-flex max-w-[58%] items-center gap-1 truncate rounded-lg border px-1.5 py-1 text-[9px] font-black ${statusColor}`}>
              {isSigned ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : offer?.status === 'pending' ? <Clock className="h-3 w-3 shrink-0" /> : offer?.status === 'rejected' ? <XCircle className="h-3 w-3 shrink-0" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
              {status}
            </span>
          </div>
        </div>
      </motion.article>
      {portalReady && typeof document !== 'undefined' ? createPortal(inspector, document.body) : null}
    </>
  );
}
