'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { Crown, PlayCircle, Sparkles, ShieldAlert, CheckCircle2, X } from 'lucide-react';

export function VipSweatPassModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { vipAdProgress, vipPassExpiresAt, watchVipAdStep } = useGameStore();
  const [watchingAd, setWatchingAd] = useState(false);

  if (!isOpen) return null;

  const isVipActive = Boolean(vipPassExpiresAt);

  const handleWatchSingleAd = () => {
    setWatchingAd(true);
    setTimeout(() => {
      watchVipAdStep();
      setWatchingAd(false);
    }, 350);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vip-modal-title"
    >
      <div className="max-h-[88%] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white p-5 text-right shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Crown className="h-6 w-6" />
            </div>
            <h2 id="vip-modal-title" className="text-base font-black text-slate-900">
              بوابة الـ VIP المجانية (24 ساعة)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة الـ VIP"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-600">
          احصل على باقة <strong className="text-violet-700">رئيس الاستوديو VIP لمدة 24 ساعة</strong> مجاناً عبر مشاهدة 5 إعلانات سريعة.
        </p>

        <div className="mt-4 space-y-2 rounded-2xl border border-indigo-100 bg-[#F5F7FF] p-3.5 text-xs font-medium text-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <span>منحة طوارئ فورية بقيمة <strong className="text-emerald-700">+40,000,000 ج.م</strong>.</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <span>فتح أسرار تناغم التصنيفات وقدرات النجوم المخفية.</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <span>+500 جوهرة VIP سحابية في حسابك.</span>
          </div>
        </div>

        {/* Interactive 1/5 to 5/5 progress bar */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs font-black">
            <span className="text-slate-600">شريط التقدم التفاعلي</span>
            <span className="text-violet-700 tabular-nums">{vipAdProgress} / 5 مكتمل</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((step) => {
              const done = vipAdProgress >= step;
              return (
                <div
                  key={step}
                  className={`flex h-9 items-center justify-center rounded-xl border-2 text-xs font-black tabular-nums transition-all ${
                    done
                      ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                      : 'border-indigo-100 bg-[#F5F7FF] text-slate-400'
                  }`}
                >
                  {step}/5
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          {isVipActive || vipAdProgress >= 5 ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-200 bg-emerald-50 py-3 text-xs font-black text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>وضع رئيس الاستوديو VIP مفعل الآن لمدة 24 ساعة!</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleWatchSingleAd}
              disabled={watchingAd}
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-950/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:border-b-0 active:translate-y-1 disabled:opacity-50"
            >
              <PlayCircle className="h-5 w-5" />
              <span>
                {watchingAd
                  ? 'جاري عرض الإعلان المكافئ...'
                  : `مشاهدة الإعلان (${vipAdProgress + 1}/5) لتفعيل الـ VIP`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ContextualRescueButton({
  label,
  sublabel,
  onTrigger,
  disabled,
  completedLabel,
}: {
  label: string;
  sublabel: string;
  onTrigger: () => void;
  disabled?: boolean;
  completedLabel?: string;
}) {
  const [busy, setBusy] = useState(false);

  const handleClick = () => {
    if (disabled || busy) return;
    setBusy(true);
    setTimeout(() => {
      onTrigger();
      setBusy(false);
    }, 300);
  };

  if (disabled && completedLabel) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span>{completedLabel}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      className="flex min-h-[50px] w-full items-center justify-between gap-3 rounded-2xl border-2 border-violet-200 border-b-4 border-b-violet-300 bg-gradient-to-l from-violet-50 to-cyan-50/70 px-4 py-2.5 text-right shadow-xs transition hover:border-violet-400 active:border-b-2 active:translate-y-0.5 disabled:opacity-50"
    >
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="h-5 w-5 shrink-0 text-violet-600" />
        <div>
          <div className="text-xs font-black text-slate-900">
            {busy ? 'جاري تشغيل مكافأة الإنقاذ...' : label}
          </div>
          <div className="text-[10px] font-bold text-slate-600">{sublabel}</div>
        </div>
      </div>
      <span className="rounded-xl bg-violet-600 px-2.5 py-1 text-[10px] font-black text-white whitespace-nowrap shrink-0">
        مكافأة AD
      </span>
    </button>
  );
}
