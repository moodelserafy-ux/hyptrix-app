'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { CustomDbLoaderPanel } from './CustomDbLoaderPanel';
import { Settings, X, RotateCcw, Check } from 'lucide-react';

export interface SettingsModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, open, onClose }: SettingsModalProps) {
  const { resetEntireGameAndStartFresh } = useGameStore();
  const [confirmReset, setConfirmReset] = useState(false);

  const visible = isOpen ?? open ?? false;

  if (!visible) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md overscroll-contain touch-none select-none"
      dir="rtl"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] w-full max-w-lg space-y-4 overflow-y-auto overscroll-contain touch-pan-y rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-[#F4F7FF] p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-black text-slate-900">
                إعدادات الاستوديو وحزم البيانات
              </h2>
              <p className="text-[11px] font-bold text-slate-500">
                إدارة حزم الأسماء والشعارات المخصصة أو إعادة تأسيس الشركة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white p-2 text-slate-600 shadow-2xs hover:bg-rose-50 hover:text-rose-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <CustomDbLoaderPanel compact />

        <div className="flex items-center justify-between border-t border-indigo-100 pt-3">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>إعادة تأسيس الاستوديو من الصفر</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  resetEntireGameAndStartFresh();
                  setConfirmReset(false);
                  onClose();
                }}
                className="min-h-[40px] rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-black text-white"
              >
                تأكيد المسح النهائي
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700"
              >
                تراجع
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white shadow-xs hover:bg-violet-700"
          >
            <Check className="h-4 w-4" />
            <span>تم</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
