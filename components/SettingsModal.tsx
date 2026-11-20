'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { getUiDir, getLocalizedMarketInfo, tr } from '@/lib/i18n';
import { WorldFlagArt } from './WorldFlagArt';
import { CustomDbLoaderPanel } from './CustomDbLoaderPanel';
import { Settings, X, RotateCcw, Check, Globe, Languages } from 'lucide-react';

export interface SettingsModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, open, onClose }: SettingsModalProps) {
  const {
    worldMarket,
    uiLanguage,
    setUiLanguage,
    resetEntireGameAndStartFresh,
    openMarketSelector,
  } = useGameStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSwitchMarket, setConfirmSwitchMarket] = useState(false);

  const visible = isOpen ?? open ?? false;
  const marketInfo = getLocalizedMarketInfo(worldMarket, uiLanguage);
  const dir = getUiDir(uiLanguage);

  if (!visible) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3.5 backdrop-blur-md overscroll-contain touch-none select-none"
      dir={dir}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] w-full max-w-lg space-y-4 overflow-y-auto overscroll-contain touch-pan-y rounded-3xl border-4 border-[#D4AF37] bg-[#F9F6F0] p-4 sm:p-5 text-[#1A2530] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b-2 border-[#1A2530]/15 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A2530] text-[#D4AF37] border border-[#D4AF37]">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-black text-[#1A2530]">
                {tr(uiLanguage, 'Studio Settings & Archive', 'إعدادات مكتب الإمبراطور والأرشيف')}
              </h2>
              <p className="text-[11px] font-bold text-[#1A2530]/70">
                {tr(
                  uiLanguage,
                  'Switch language, change production market, manage mods, or reset',
                  'تبديل اللغة، تغيير عالم الإنتاج، إدارة حزم المود، أو إعادة تأسيس الاستوديو'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr(uiLanguage, 'Close settings', 'إغلاق الإعدادات')}
            className="rounded-xl bg-[#1A2530] p-2 text-[#F9F6F0] hover:bg-[#D91624] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Interface Language Switcher (English <-> Arabic) */}
        <div className="rounded-2xl border-2 border-[#D4AF37] bg-white p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1A2530] text-[#D4AF37]">
                <Languages className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black text-[#1A2530]">
                  {tr(uiLanguage, 'Interface & AI Language', 'لغة الواجهة والذكاء الاصطناعي')}
                </p>
                <p className="text-[10px] font-bold text-[#1A2530]/65">
                  {tr(
                    uiLanguage,
                    'Instant switch across menus, AI stories, reviews, and layout direction',
                    'تبديل فوري للقوائم، أخبار العالم، تقييمات النقاد، واتجاه الشاشة'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUiLanguage('en', true)}
              className={`min-h-[42px] rounded-xl border-2 px-3 py-2 text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                uiLanguage === 'en'
                  ? 'border-[#D4AF37] bg-[#1A2530] text-[#D4AF37] shadow-sm'
                  : 'border-[#1A2530]/15 bg-[#F9F6F0] text-[#1A2530] hover:border-[#D4AF37]'
              }`}
            >
              <span>English (Global)</span>
              {uiLanguage === 'en' && <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setUiLanguage('ar', true)}
              className={`min-h-[42px] rounded-xl border-2 px-3 py-2 text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                uiLanguage === 'ar'
                  ? 'border-[#D4AF37] bg-[#1A2530] text-[#D4AF37] shadow-sm'
                  : 'border-[#1A2530]/15 bg-[#F9F6F0] text-[#1A2530] hover:border-[#D4AF37]'
              }`}
            >
              <span>العربية</span>
              {uiLanguage === 'ar' && <Check className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Active Production World Switcher */}
        <div className="rounded-2xl border-2 border-[#D4AF37]/60 bg-[#1A2530] p-3.5 text-[#F9F6F0] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <WorldFlagArt market={worldMarket} className="h-8 w-12 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[#D4AF37]">
                  {tr(uiLanguage, 'Active Production World', 'عالم الإنتاج النشط حالياً')}
                </p>
                <p className="font-display text-sm font-black text-white truncate">
                  {marketInfo.marketHeadline}
                </p>
                <p className="text-[11px] font-bold text-[#F9F6F0]/70 truncate">
                  {tr(uiLanguage, 'Currency', 'العملة')}: {marketInfo.currencyFullName} ({marketInfo.currencyLabel})
                </p>
              </div>
            </div>

            {!confirmSwitchMarket ? (
              <button
                type="button"
                onClick={() => {
                  setConfirmSwitchMarket(true);
                  setConfirmReset(false);
                }}
                className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl border border-[#D4AF37] bg-[#D4AF37]/15 px-3 py-1.5 text-xs font-black text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1A2530] transition cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{tr(uiLanguage, 'Switch Market', 'تغيير السوق / الدولة')}</span>
              </button>
            ) : null}
          </div>

          {confirmSwitchMarket && (
            <div className="rounded-xl border border-[#D4AF37]/40 bg-black/25 p-2.5 space-y-2">
              <p className="text-[11px] font-bold text-[#F9F6F0]/90 leading-relaxed">
                {tr(
                  uiLanguage,
                  'Switching to another market (Egypt ⇄ Saudi Arabia) starts a fresh studio in that country with its own roster, currency, and annual festivals. Continue?',
                  'الانتقال إلى سوق آخر (مصر ⇄ السعودية) سيبدأ استوديو جديداً في الدولة المختارة بقاعدة نجومها وعملتها ومهرجاناتها. هل تريد المتابعة؟'
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openMarketSelector();
                    setConfirmSwitchMarket(false);
                    onClose();
                  }}
                  className="min-h-[36px] rounded-xl bg-[#D4AF37] px-3.5 py-1.5 text-xs font-black text-[#1A2530] hover:brightness-110 cursor-pointer"
                >
                  {tr(uiLanguage, 'Yes, Choose Market', 'نعم، افتح اختيار الدولة')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmSwitchMarket(false)}
                  className="min-h-[36px] rounded-xl border border-white/25 px-3 py-1.5 text-xs font-bold text-[#F9F6F0] hover:bg-white/10 cursor-pointer"
                >
                  {tr(uiLanguage, 'Cancel', 'تراجع')}
                </button>
              </div>
            </div>
          )}
        </div>

        <CustomDbLoaderPanel compact />

        <div className="flex items-center justify-between border-t-2 border-[#1A2530]/15 pt-3">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => {
                setConfirmReset(true);
                setConfirmSwitchMarket(false);
              }}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-[#D91624] bg-[#D91624]/10 px-3.5 py-2 text-xs font-black text-[#D91624] hover:bg-[#D91624] hover:text-white transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{tr(uiLanguage, 'Reset Studio From Scratch', 'إعادة تأسيس الاستوديو من الصفر')}</span>
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
                className="min-h-[40px] rounded-xl bg-[#D91624] px-3.5 py-2 text-xs font-black text-white cursor-pointer"
              >
                {tr(uiLanguage, 'Confirm Full Wipe', 'تأكيد المسح النهائي')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[40px] rounded-xl border border-[#1A2530]/25 bg-white px-3.5 py-2 text-xs font-bold text-[#1A2530] cursor-pointer"
              >
                {tr(uiLanguage, 'Cancel', 'تراجع')}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#1A2530] border-2 border-[#D4AF37] px-5 py-2 text-xs font-black text-[#F9F6F0] shadow-xs hover:brightness-110 cursor-pointer"
          >
            <Check className="h-4 w-4 text-[#D4AF37]" />
            <span>{tr(uiLanguage, 'Save & Close', 'حفظ وإغلاق')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
