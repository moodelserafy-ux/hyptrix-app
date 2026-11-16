'use client';

import React from 'react';
import { formatMoney } from '@/lib/game-engine';
import { TalentCharacterPortraitSvg } from './CinematicGraphicsScene';
import {
  Star,
  Flame,
  Award,
  Check,
  Info,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import { playClickSound } from '@/lib/game-audio';

export interface UnifiedTalentCardData {
  id: string;
  name: string;
  roleLabel: string;
  overall: number;
  tier: 'S' | 'A' | 'B' | 'C';
  salary: number;
  age?: number;
  gender?: 'male' | 'female' | 'M' | 'F';
  stat1Label: string;
  stat1Val: number;
  stat2Label: string;
  stat2Val: number;
  stat3Label: string;
  stat3Val: number;
  specialtyText: string;
  awardCount?: number;
  isBusy?: boolean;
  busyNote?: string;
}

interface EaFcTalentCardProps {
  item: UnifiedTalentCardData;
  isSelected?: boolean;
  isPendingOffer?: boolean;
  agreedSalary?: number;
  onSelect: () => void;
  onInspect?: () => void;
  actionLabel?: string;
  disabled?: boolean;
}

export default function EaFcTalentCard({
  item,
  isSelected = false,
  isPendingOffer = false,
  agreedSalary,
  onSelect,
  onInspect,
  actionLabel,
  disabled = false,
}: EaFcTalentCardProps) {
  const ovr = item.overall;

  const tierStyle =
    ovr >= 88
      ? {
          border: isSelected
            ? 'border-amber-400 ring-1 ring-amber-400/50'
            : 'border-amber-500/35 hover:border-amber-400/70',
          badge: 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950',
        }
      : ovr >= 80
      ? {
          border: isSelected
            ? 'border-purple-400 ring-1 ring-purple-400/50'
            : 'border-purple-500/30 hover:border-purple-400/60',
          badge: 'bg-gradient-to-br from-purple-400 to-indigo-600 text-white',
        }
      : {
          border: isSelected
            ? 'border-emerald-400 ring-1 ring-emerald-400/50'
            : 'border-slate-800 hover:border-slate-600',
          badge: 'bg-slate-800 text-slate-200',
        };

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-xl border bg-slate-900/85 p-2 transition-all ${tierStyle.border}`}
    >
      {/* Top Row: OVR + Avatar + Identity + Inspect Button */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* OVR Badge */}
          <div
            className={`flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-lg font-mono leading-none shadow-sm ${tierStyle.badge}`}
          >
            <span className="text-[11px] font-black">{ovr}</span>
            <span className="text-[7px] font-bold uppercase opacity-80">
              {item.tier}
            </span>
          </div>

          {/* Portrait */}
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950">
            <TalentCharacterPortraitSvg
              name={item.name}
              gender={item.gender || 'male'}
              role={item.roleLabel}
              tier={item.tier}
              age={item.age || 38}
            />
          </div>

          {/* Name & Specialty */}
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h4 className="truncate text-xs font-black text-white">
                {item.name}
              </h4>
              {isSelected && (
                <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
              )}
              {item.awardCount && item.awardCount > 0 ? (
                <span className="rounded bg-amber-500/20 px-1 text-[8px] font-black text-amber-300">
                  🏆{item.awardCount}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-400 truncate">
              <span className="text-amber-300/90 font-bold truncate">
                {item.roleLabel}
              </span>
              {item.age && (
                <>
                  <span>•</span>
                  <span className="shrink-0">{item.age} سنة</span>
                </>
              )}
            </div>
          </div>
        </div>

        {onInspect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playClickSound();
              onInspect();
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/80 text-slate-400 hover:border-amber-500/40 hover:text-amber-300"
            title="تفاصيل السيرة والمهارات"
          >
            <Info className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Middle Compact Stats Bar */}
      <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-slate-950/75 px-1.5 py-1 text-[9px]">
        <div className="flex items-center justify-between gap-0.5">
          <span className="text-slate-400 truncate">{item.stat1Label}</span>
          <span className="font-mono font-black text-amber-300">
            {item.stat1Val}
          </span>
        </div>
        <div className="flex items-center justify-between gap-0.5 border-x border-slate-800/80 px-1">
          <span className="text-slate-400 truncate">{item.stat2Label}</span>
          <span className="font-mono font-black text-purple-300">
            {item.stat2Val}
          </span>
        </div>
        <div className="flex items-center justify-between gap-0.5">
          <span className="text-slate-400 truncate">{item.stat3Label}</span>
          <span className="font-mono font-black text-emerald-300">
            {item.stat3Val}
          </span>
        </div>
      </div>

      {/* Bottom Row: Salary & Action CTA */}
      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <div className="leading-tight">
          <span className="block text-[8px] text-slate-500">
            {agreedSalary ? 'العرض المالي' : 'الأجر الأساسي'}
          </span>
          <span className="font-mono text-[10px] font-black text-emerald-300">
            {formatMoney(agreedSalary ?? item.salary)}
          </span>
        </div>

        <button
          type="button"
          disabled={disabled || item.isBusy}
          onClick={() => {
            playClickSound();
            onSelect();
          }}
          className={`flex min-h-[28px] items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black transition-all active:scale-95 disabled:opacity-40 ${
            isSelected
              ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-rose-500/20 hover:text-rose-300'
              : isPendingOffer
              ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
              : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110'
          }`}
        >
          {item.isBusy ? (
            <span>مشغول بتصوير</span>
          ) : isSelected ? (
            <>
              <Check className="h-3 w-3" />
              <span>{actionLabel || 'تم التعاقد'}</span>
            </>
          ) : isPendingOffer ? (
            <span>بانتظار الرد...</span>
          ) : (
            <>
              <UserPlus className="h-3 w-3" />
              <span>{actionLabel || 'تفاوض'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface TalentInspectorDrawerProps {
  item: UnifiedTalentCardData | null;
  onClose: () => void;
  onNegotiate?: () => void;
}

export function TalentInspectorDrawer({
  item,
  onClose,
  onNegotiate,
}: TalentInspectorDrawerProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-slate-950/95 p-3.5 shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 overflow-hidden rounded-xl border border-amber-500/30 bg-slate-900">
              <TalentCharacterPortraitSvg
                name={item.name}
                gender={item.gender || 'male'}
                role={item.roleLabel}
                tier={item.tier}
                age={item.age || 38}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white">{item.name}</h3>
                <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 font-mono text-[10px] font-black text-amber-300">
                  OVR {item.overall}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {item.roleLabel} {item.age ? `• ${item.age} سنة` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 bg-slate-900 p-1 text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
          {item.specialtyText}
        </p>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
            <Star className="mx-auto h-3 w-3 text-amber-400 mb-0.5" />
            <span className="block text-[9px] text-slate-400">
              {item.stat1Label}
            </span>
            <span className="font-mono text-xs font-black text-white">
              {item.stat1Val}/100
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
            <Flame className="mx-auto h-3 w-3 text-purple-400 mb-0.5" />
            <span className="block text-[9px] text-slate-400">
              {item.stat2Label}
            </span>
            <span className="font-mono text-xs font-black text-white">
              {item.stat2Val}/100
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
            <Award className="mx-auto h-3 w-3 text-emerald-400 mb-0.5" />
            <span className="block text-[9px] text-slate-400">الأجر الأساسي</span>
            <span className="font-mono text-xs font-black text-emerald-300">
              {formatMoney(item.salary)}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[32px] rounded-xl border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-300 hover:text-white"
          >
            إغلاق
          </button>
          {onNegotiate && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNegotiate();
              }}
              className="flex min-h-[32px] items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1 text-[10px] font-black text-slate-950"
            >
              <Sparkles className="h-3 w-3" />
              <span>تقديم عرض تعاقد</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
