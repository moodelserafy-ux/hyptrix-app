'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '@/lib/store';
import { getUiDir, getLocalizedMarketInfo, tr } from '@/lib/i18n';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { WorldFlagArt } from './WorldFlagArt';
import { CustomDbLoaderPanel } from './CustomDbLoaderPanel';
import { LanguageSwitcher } from './LanguageSwitcher';
import { triggerTelegramHaptic } from './TelegramMiniAppBridge';
import {
  X,
  RotateCcw,
  Check,
  Globe,
  Database,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';

export interface SettingsModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, open, onClose }: SettingsModalProps) {
  const {
    worldMarket,
    uiLanguage,
    customDbPatch,
    resetEntireGameAndStartFresh,
    openMarketSelector,
  } = useGameStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSwitchMarket, setConfirmSwitchMarket] = useState(false);
  const [modsExpanded, setModsExpanded] = useState(false);

  const visible = isOpen ?? open ?? false;
  const marketInfo = getLocalizedMarketInfo(worldMarket, uiLanguage);
  const resolvedDb = getResolvedDatabase(customDbPatch, worldMarket);
  const dir = getUiDir(uiLanguage);

  const handleClose = () => {
    setConfirmReset(false);
    setConfirmSwitchMarket(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4 overscroll-contain select-none"
          dir={dir}
        >
          {/* Mobile-First Bottom Sheet on Phones -> Centered Luxury Dialog on Desktop */}
          <motion.div
            key="settings-sheet"
            initial={{ y: 48, opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 56, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[28px] border-t-2 border-[#D4AF37] bg-[#F9F6F0] text-[#1A2530] shadow-[0_-18px_50px_rgba(0,0,0,0.35)] sm:max-h-[86dvh] sm:max-w-lg sm:rounded-3xl sm:border-2 sm:shadow-2xl"
          >
            {/* Mobile Drag Handle Affordance */}
            <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
              <span
                aria-hidden="true"
                className="h-1.5 w-11 rounded-full bg-[#1A2530]/20"
              />
            </div>

            {/* Sticky Compact Sheet Header */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#1A2530]/10 px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <h2 className="font-display text-lg sm:text-xl font-black text-[#1A2530] leading-tight">
                  {tr(uiLanguage, 'Studio Settings', 'إعدادات الاستوديو')}
                </h2>
                <p className="mt-0.5 text-xs font-bold text-[#1A2530]/60 truncate">
                  {tr(
                    uiLanguage,
                    'Language · Market World · Mod Packs',
                    'اللغة · عالم الإنتاج · حزم المود'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label={tr(uiLanguage, 'Close settings', 'إغلاق الإعدادات')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EDE6D6] text-[#1A2530] hover:bg-[#1A2530] hover:text-[#F9F6F0] active:scale-95 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Scrollable Mobile-First Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-4 py-4 space-y-5 sm:px-5">
              {/* SECTION 1: INTERFACE & AI LANGUAGE */}
              <section className="space-y-2">
                <div className="flex items-baseline justify-between gap-2 px-0.5">
                  <h3 className="text-xs font-black text-[#1A2530]/75">
                    {tr(uiLanguage, 'Interface & AI Language', 'لغة الواجهة والذكاء الاصطناعي')}
                  </h3>
                  <span className="text-[11px] font-bold text-[#9A7209]">
                    {tr(uiLanguage, 'Saved automatically', 'تُحفظ تلقائياً')}
                  </span>
                </div>

                <LanguageSwitcher variant="card" tone="light" />
              </section>

              {/* SECTION 2: ACTIVE PRODUCTION WORLD */}
              <section className="space-y-2">
                <h3 className="px-0.5 text-xs font-black text-[#1A2530]/75">
                  {tr(uiLanguage, 'Production Market', 'عالم الإنتاج النشط')}
                </h3>

                <div className="overflow-hidden rounded-2xl bg-[#1A2530] text-[#F9F6F0] ring-1 ring-[#D4AF37]/45">
                  <div className="flex items-center gap-3.5 p-4">
                    <div className="w-14 shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-white/15">
                      <WorldFlagArt market={worldMarket} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-black text-white truncate">
                        {marketInfo.marketHeadline}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-[#F9F6F0]/70 truncate">
                        {marketInfo.countryName} · {marketInfo.currencyFullName} ({marketInfo.currencyLabel})
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 px-4 py-3">
                    {!confirmSwitchMarket ? (
                      <button
                        type="button"
                        onClick={() => {
                          triggerTelegramHaptic('light');
                          setConfirmSwitchMarket(true);
                          setConfirmReset(false);
                        }}
                        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/70 px-4 text-xs font-black text-[#FFF3B0] hover:bg-[#D4AF37] hover:text-[#1A2530] active:scale-[0.98] transition cursor-pointer"
                      >
                        <Globe className="h-4 w-4" />
                        <span>
                          {tr(uiLanguage, 'Switch Country / Market', 'تغيير الدولة أو السوق')}
                        </span>
                      </button>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-[#F9F6F0]/90 leading-relaxed">
                          {tr(
                            uiLanguage,
                            'Switching markets (Egypt ⇄ Saudi Arabia) starts a fresh studio with its own stars, currency, and festivals. Your language stays saved.',
                            'الانتقال لسوق آخر (مصر ⇄ السعودية) يبدأ استوديو جديداً بنجومه وعملته ومهرجاناته، مع الاحتفاظ بلغتك المختارة.'
                          )}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              triggerTelegramHaptic('medium');
                              openMarketSelector();
                              setConfirmSwitchMarket(false);
                              onClose();
                            }}
                            className="min-h-[44px] rounded-xl bg-[#D4AF37] px-3 text-xs font-black text-[#1A2530] active:scale-[0.98] transition cursor-pointer"
                          >
                            {tr(uiLanguage, 'Open Markets', 'فتح الأسواق')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmSwitchMarket(false)}
                            className="min-h-[44px] rounded-xl border border-white/25 bg-white/5 px-3 text-xs font-bold text-[#F9F6F0] active:scale-[0.98] transition cursor-pointer"
                          >
                            {tr(uiLanguage, 'Cancel', 'تراجع')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION 3: CUSTOM MOD PACKS (COLLAPSIBLE MOBILE DRAWER ROW) */}
              <section className="space-y-2">
                <h3 className="px-0.5 text-xs font-black text-[#1A2530]/75">
                  {tr(uiLanguage, 'Custom Database & Mod Packs', 'حزم المود وقاعدة البيانات')}
                </h3>

                <div className="overflow-hidden rounded-2xl border border-[#1A2530]/12 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      triggerTelegramHaptic('light');
                      setModsExpanded((prev) => !prev);
                    }}
                    aria-expanded={modsExpanded}
                    className="flex min-h-[58px] w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-[#F9F6F0]/60 transition cursor-pointer"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A2530] text-[#D4AF37]">
                        <Database className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#1A2530] truncate">
                          {tr(uiLanguage, 'Load Custom Mod Pack (.json)', 'تحميل حزمة مود مخصصة (.json)')}
                        </p>
                        <p className="text-[11px] font-bold text-[#1A2530]/60 truncate">
                          {tr(uiLanguage, 'Active:', 'الحالي:')} {resolvedDb.meta.pack_name}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[#1A2530]/50 transition-transform duration-200 ${
                        modsExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {modsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-[#1A2530]/10"
                      >
                        <div className="p-3 bg-[#F9F6F0]/50">
                          <CustomDbLoaderPanel compact embedded />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* SECTION 4: DANGER ZONE — STUDIO RESET */}
              <section className="space-y-2 pb-1">
                <h3 className="px-0.5 text-xs font-black text-[#D91624]/85">
                  {tr(uiLanguage, 'Studio Reset', 'إعادة التأسيس')}
                </h3>

                <div className="rounded-2xl border border-[#D91624]/25 bg-[#FFF7F7] p-3.5">
                  {!confirmReset ? (
                    <button
                      type="button"
                      onClick={() => {
                        triggerTelegramHaptic('warning');
                        setConfirmReset(true);
                        setConfirmSwitchMarket(false);
                      }}
                      className="flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl px-2 text-start text-sm font-black text-[#D91624] hover:bg-[#D91624]/10 active:scale-[0.99] transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <RotateCcw className="h-4 w-4 shrink-0" />
                        <span>
                          {tr(
                            uiLanguage,
                            'Reset Studio From Scratch',
                            'إعادة تأسيس الاستوديو من الصفر'
                          )}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-[#D91624]/70">
                        {tr(uiLanguage, 'Year 1', 'السنة 1')}
                      </span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5 text-xs font-bold text-[#1A2530]">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D91624]" />
                        <p className="leading-relaxed">
                          {tr(
                            uiLanguage,
                            'This wipes your current studio, projects, and treasury cash so you can found a brand-new studio from Year 1. Your selected language stays saved.',
                            'سيتم مسح الاستوديو الحالي وأعماله وخزينته لتبدأ شركة جديدة من السنة الأولى، مع الاحتفاظ بلغتك المختارة.'
                          )}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            triggerTelegramHaptic('heavy');
                            resetEntireGameAndStartFresh();
                            setConfirmReset(false);
                            onClose();
                          }}
                          className="min-h-[46px] rounded-xl bg-[#D91624] px-3 text-xs font-black text-white active:scale-[0.98] transition cursor-pointer"
                        >
                          {tr(uiLanguage, 'Confirm Wipe', 'تأكيد المسح النهائي')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmReset(false)}
                          className="min-h-[46px] rounded-xl border border-[#1A2530]/20 bg-white px-3 text-xs font-black text-[#1A2530] active:scale-[0.98] transition cursor-pointer"
                        >
                          {tr(uiLanguage, 'Cancel', 'تراجع')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Sticky Thumb-Zone Bottom CTA Bar */}
            <footer className="shrink-0 border-t border-[#1A2530]/10 bg-[#F9F6F0]/95 px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-5 sm:pb-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1A2530] border border-[#D4AF37]/80 px-5 text-sm font-black text-[#F9F6F0] shadow-[0_8px_20px_rgba(26,37,48,0.2)] hover:brightness-110 active:scale-[0.985] transition cursor-pointer"
              >
                <Check className="h-4.5 w-4.5 text-[#D4AF37]" />
                <span>{tr(uiLanguage, 'Done', 'حفظ وإغلاق')}</span>
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SettingsModal;
