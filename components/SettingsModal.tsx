'use client';

import React, { useState } from 'react';
import {
  useGameStore,
  GROQ_MODEL_OPTIONS,
  GroqModelId,
} from '@/lib/store';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Check,
  Brain,
  Database,
} from 'lucide-react';
import {
  playClickSound,
  toggleGameAudioMuted,
  getGameAudioMuted,
} from '@/lib/game-audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    preferredGroqModel,
    setPreferredGroqModel,
    customDbPatch,
    clearCustomDatabase,
    resetEntireGameAndStartFresh,
  } = useGameStore();

  const [muted, setMuted] = useState(() => getGameAudioMuted());
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleToggleAudio = () => {
    const next = toggleGameAudioMuted();
    setMuted(next);
    if (!next) playClickSound();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[88%] overflow-y-auto scrollbar-hide rounded-2xl border border-amber-500/30 bg-slate-950/95 p-3.5 shadow-2xl space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs sm:text-sm font-black text-white">
              إعدادات الصوت والذكاء الاصطناعي والنظام
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 bg-slate-900 p-1 text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Audio Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
          <div>
            <span className="block text-xs font-black text-white">
              المؤثرات الصوتية السينمائية
            </span>
            <span className="text-[10px] text-slate-400">
              أصوات النقرات، توقيع العقود، واحتفالات الجوائز
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleAudio}
            className={`flex min-h-[30px] items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
              muted
                ? 'border border-rose-500/30 bg-rose-500/15 text-rose-300'
                : 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {muted ? (
              <>
                <VolumeX className="h-3 w-3" />
                <span>مكتوم</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3 w-3" />
                <span>مفعّل</span>
              </>
            )}
          </button>
        </div>

        {/* AI Engine Selector */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 space-y-1.5">
          <span className="flex items-center gap-1 text-xs font-black text-white">
            <Brain className="h-3.5 w-3.5 text-amber-400" />
            <span>نموذج الذكاء الاصطناعي التوليدي المفضل</span>
          </span>
          <div className="grid grid-cols-3 gap-1">
            {GROQ_MODEL_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  playClickSound();
                  setPreferredGroqModel(m.id as GroqModelId);
                }}
                className={`rounded-lg border px-2 py-1 text-[9px] font-bold transition-all ${
                  preferredGroqModel === m.id
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-black'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {m.provider}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Database Status */}
        {customDbPatch && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px]">
            <span className="flex items-center gap-1 font-bold text-amber-300">
              <Database className="h-3.5 w-3.5" />
              <span>ملف بيانات مخصص مفعّل</span>
            </span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                clearCustomDatabase();
              }}
              className="rounded bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-rose-300"
            >
              استعادة الافتراضي
            </button>
          </div>
        )}

        {/* Reset Studio */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-2">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex min-h-[30px] items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500/20"
            >
              <RotateCcw className="h-3 w-3" />
              <span>إعادة تأسيس من الصفر</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  resetEntireGameAndStartFresh();
                  setConfirmReset(false);
                  onClose();
                }}
                className="min-h-[30px] rounded-lg bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white"
              >
                تأكيد المسح النهائي
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[30px] rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-slate-300"
              >
                تراجع
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[30px] items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-200 hover:text-white"
          >
            <Check className="h-3 w-3" />
            <span>تم</span>
          </button>
        </div>
      </div>
    </div>
  );
}
