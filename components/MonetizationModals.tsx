'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import {
  Coins,
  Tv,
  Sparkles,
  X,
  CheckCircle2,
  Play,
} from 'lucide-react';
import {
  playClickSound,
  playContractSignedSound,
} from '@/lib/game-audio';

interface MonetizationModalsProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function MonetizationModals({
  isOpen = false,
  onClose,
}: MonetizationModalsProps) {
  const {
    cash,
    vipCoins,
    vipAdProgress,
    watchVipAdStep,
  } = useGameStore();

  const [rewardMsg, setRewardMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleWatchStep = () => {
    playContractSignedSound();
    watchVipAdStep();
    if (vipAdProgress + 1 >= 5) {
      setRewardMsg('تم إكمال مراحل الرعاية الخمس وإيداع +40M في الخزينة + 500 عملة VIP!');
    } else {
      setRewardMsg('تم تسجيل خطوة رعاية إعلانية (+50 عملة VIP)!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
      <div className="w-[88%] max-w-lg rounded-2xl border border-amber-500/35 bg-slate-950/95 p-3.5 shadow-2xl space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400">
              <Coins className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-xs sm:text-sm font-black text-white">
              صندوق الرعاية والتمويل الاستثماري
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose?.();
            }}
            className="rounded-lg border border-slate-800 bg-slate-900 p-1 text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Current Balances */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-center">
            <span className="block text-[9px] text-slate-400">
              سيولة الخزينة الحالية
            </span>
            <span className="font-mono text-xs font-black text-emerald-300">
              {formatMoney(cash)}
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-center">
            <span className="block text-[9px] text-slate-400">
              رصيد عملات VIP
            </span>
            <span className="font-mono text-xs font-black text-purple-300">
              {vipCoins} VIP
            </span>
          </div>
        </div>

        {rewardMsg && (
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-black text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{rewardMsg}</span>
          </div>
        )}

        {/* VIP Sponsorship Progress Card */}
        <div className="rounded-xl border border-amber-500/30 bg-slate-900/85 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-black text-white">
                برنامج الرعاية الإعلامية للاستوديو ({vipAdProgress} / 5)
              </h3>
            </div>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-300">
              مكافأة الكبرى: +40M
            </span>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            فعّل عقود الرعاية الإعلامية خطوة بخطوة للحصول على عملات VIP فورية وتمويل ضخم لخزينة الاستوديو عند اكتمال الشريط.
          </p>

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full ${
                  step <= vipAdProgress
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleWatchStep}
            className="flex min-h-[32px] w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1.5 text-xs font-black text-slate-950 shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>تفعيل خطوة الرعاية التالية</span>
          </button>
        </div>
      </div>
    </div>
  );
}
