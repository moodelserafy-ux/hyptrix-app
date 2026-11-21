'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MARKET_PROFILES,
  type UiLanguageId,
  type WorldMarketId,
} from '@/lib/market-profiles';
import { getLocalizedMarketInfo, getUiDir, tr } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { WorldFlagArt } from './WorldFlagArt';
import { LanguageSwitcher } from './LanguageSwitcher';
import { triggerTelegramHaptic } from './TelegramMiniAppBridge';
import { playClapperboardSnap } from '@/lib/sound-fx';
import Image from 'next/image';
import {
  Lock,
  Check,
  ArrowLeft,
  ArrowRight,
  Crown,
  BookOpen,
  Mail,
  X,
} from 'lucide-react';
import type { NeelyoInfoTab } from './NeelyoInfoModal';

export function WelcomeMarketScreen({
  initialLanguage = 'en',
  initialMarket = 'egypt',
  onComplete,
  onOpenInfo,
}: {
  initialLanguage?: UiLanguageId;
  initialMarket?: WorldMarketId;
  onComplete: (language: UiLanguageId, market: WorldMarketId) => void;
  onOpenInfo?: (tab: NeelyoInfoTab) => void;
}) {
  const storeLang = useGameStore((s) => s.uiLanguage);

  const selectedLang: UiLanguageId = storeLang || initialLanguage;
  const [selectedMarket, setSelectedMarket] = useState<WorldMarketId>(
    initialMarket === 'saudi' ? 'saudi' : 'egypt'
  );
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const isEn = selectedLang === 'en';
  const uiDir = getUiDir(selectedLang);

  const featuredMarkets = [MARKET_PROFILES.egypt, MARKET_PROFILES.saudi];
  const upcomingMarkets = [
    MARKET_PROFILES.turkey,
    MARKET_PROFILES.korea,
    MARKET_PROFILES.usa,
  ];

  const activeMarketLoc = getLocalizedMarketInfo(selectedMarket, selectedLang);
  const isSaudiSelected = selectedMarket === 'saudi';

  useEffect(() => {
    if (!lockedNotice) return;
    const timer = setTimeout(() => setLockedNotice(null), 3400);
    return () => clearTimeout(timer);
  }, [lockedNotice]);

  const handleSelectMarket = (marketId: WorldMarketId, available: boolean) => {
    if (!available) {
      triggerTelegramHaptic('light');
      const loc = getLocalizedMarketInfo(marketId, selectedLang);
      setLockedNotice(
        tr(
          selectedLang,
          `${loc.countryName} is coming soon with its own stars, festivals, and box office!`,
          `عالم ${loc.countryName} قادم قريباً بقاعدة نجومه ومهرجاناته الخاصة!`
        )
      );
      return;
    }
    if (selectedMarket !== marketId) {
      triggerTelegramHaptic('selection');
      playClapperboardSnap();
    } else {
      triggerTelegramHaptic('light');
    }
    setLockedNotice(null);
    setSelectedMarket(marketId);
  };

  const handleEnterMarket = () => {
    triggerTelegramHaptic('medium');
    playClapperboardSnap();
    onComplete(selectedLang, selectedMarket);
  };

  const CtaArrow = isEn ? ArrowRight : ArrowLeft;

  return (
    <div
      className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-[#F9F6F0] text-[#1A2530]"
      dir={uiDir}
    >
      {/* Warm Creamy Ivory & Golden Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-[320px] w-[540px] -translate-x-1/2 rounded-full bg-[#D4AF37]/18 blur-[90px]" />
        <motion.div
          animate={{
            backgroundColor: isSaudiSelected
              ? 'rgba(4, 106, 56, 0.11)'
              : 'rgba(217, 22, 36, 0.10)',
          }}
          transition={{ duration: 0.45 }}
          className="absolute bottom-[-90px] left-1/2 h-[290px] w-[480px] -translate-x-1/2 rounded-full blur-[100px]"
        />
      </div>

      {/* Transient Non-Shifting Floating Notice for Locked Items */}
      <AnimatePresence>
        {lockedNotice && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
          >
            <div className="flex items-center justify-between gap-2.5 rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530] px-4 py-2.5 text-xs font-extrabold text-[#F9F6F0] shadow-[0_14px_34px_rgba(26,37,48,0.28)]">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                <span className="truncate">{lockedNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setLockedNotice(null)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#F9F6F0]/75 hover:text-white cursor-pointer"
                aria-label={tr(selectedLang, 'Close notice', 'إغلاق التنبيه')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== TOP UTILITY BAR ==================== */}
      <header className="relative z-30 mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-3 pb-1 sm:px-6 sm:pt-4">
        {/* Quick Info Links */}
        <div className="flex items-center gap-1.5">
          {onOpenInfo && (
            <button
              type="button"
              onClick={() => {
                triggerTelegramHaptic('light');
                onOpenInfo('about');
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#D4AF37]/60 bg-[#FFFDF8] px-3 text-xs font-extrabold text-[#1A2530] shadow-xs hover:border-[#D4AF37] hover:bg-[#FFF9E6] transition cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#D91624]" />
              <span>{tr(selectedLang, 'About Neelyo', 'عن Neelyo')}</span>
            </button>
          )}
          {onOpenInfo && (
            <button
              type="button"
              onClick={() => {
                triggerTelegramHaptic('light');
                onOpenInfo('contact');
              }}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#1A2530]/15 bg-[#FFFDF8] px-2.5 text-xs font-extrabold text-[#1A2530]/80 shadow-xs hover:border-[#D4AF37] hover:text-[#1A2530] transition cursor-pointer"
              aria-label={tr(selectedLang, 'Contact us', 'تواصل معنا')}
            >
              <Mail className="h-3.5 w-3.5 text-[#B8860B]" />
              <span className="hidden sm:inline">
                {tr(selectedLang, 'Contact', 'تواصل')}
              </span>
            </button>
          )}
        </div>

        {/* Sleek Segmented Language Toggle (EN | عربي) */}
        <LanguageSwitcher variant="compact" tone="light" />
      </header>

      {/* ==================== MAIN ROYAL OPENING STAGE ==================== */}
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-4 px-4 py-2 sm:gap-6 sm:px-6">
        {/* Brand Crest & Single Punchy Headline */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-2 flex items-center gap-2.5"
          >
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border-2 border-[#D4AF37] bg-[#0D1824] p-1.5 shadow-[0_8px_22px_rgba(26,37,48,0.18)]">
              <Image
                src="/images/neelyo-logo.png"
                alt="Neelyo"
                width={32}
                height={32}
                priority
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="font-display text-2xl sm:text-3xl font-black tracking-wide text-[#1A2530]">
              Neelyo
            </span>
          </motion.div>

          <h1 className="font-display text-2xl sm:text-4xl font-black text-[#1A2530] leading-tight text-balance">
            {tr(
              selectedLang,
              'Choose Your Cinema Arena',
              'اختر ساحة المعركة السينمائية'
            )}
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-bold text-[#1A2530]/65">
            {tr(
              selectedLang,
              'Dedicated stars, seasons, awards & currency · 75M Starting Capital',
              'عالم مستقل بنجومه ومواسمه وعملته · رأس مال افتتاحي 75M'
            )}
          </p>
        </div>

        {/* 2 FEATURED OPEN MARKETS — SIDE-BY-SIDE LUXURY CREAMY POSTER CARDS */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 items-stretch">
          {featuredMarkets.map((market) => {
            const isSelected = selectedMarket === market.id;
            const isSaudi = market.id === 'saudi';
            const loc = getLocalizedMarketInfo(market.id, selectedLang);

            return (
              <motion.button
                key={market.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectMarket(market.id, true)}
                className={`group relative flex flex-col overflow-hidden rounded-[22px] sm:rounded-[28px] border-2 ${
                  isEn ? 'text-left' : 'text-right'
                } transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? isSaudi
                      ? 'border-[#046A38] bg-gradient-to-b from-[#FFFDF8] via-[#F7FBF8] to-[#ECF7F0] shadow-[0_16px_38px_rgba(4,106,56,0.18)] ring-2 ring-[#D4AF37]/75'
                      : 'border-[#D91624] bg-gradient-to-b from-[#FFFDF8] via-[#FFF9EE] to-[#FDF1D6] shadow-[0_16px_38px_rgba(217,22,36,0.16)] ring-2 ring-[#D4AF37]/75'
                    : 'border-[#D4AF37]/40 bg-[#FFFDF8]/95 hover:border-[#D4AF37] shadow-[0_8px_22px_rgba(26,37,48,0.06)]'
                }`}
              >
                {/* Silk Flag Showcase Header */}
                <div
                  className={`relative px-3 pt-3 pb-2.5 sm:px-5 sm:pt-4 sm:pb-3.5 ${
                    isSaudi
                      ? 'bg-gradient-to-br from-[#033A1E] via-[#06522B] to-[#0E2419]'
                      : 'bg-gradient-to-br from-[#2B0C10] via-[#1A2530] to-[#121922]'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <span className="text-[10px] sm:text-xs font-black tracking-wide text-[#FFF3B0] truncate">
                      {loc.countryName} · {loc.currencyLabel}
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                        isSelected
                          ? 'bg-[#D4AF37] text-[#1A2530] shadow-md'
                          : 'border border-white/40 bg-black/25'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </span>
                  </div>

                  {/* Silk Flag Poster Visual */}
                  <div className="relative mx-auto w-full max-w-[230px] aspect-[320/190] drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:scale-[1.03]">
                    <WorldFlagArt market={market.id} />
                  </div>
                </div>

                {/* Creamy Luxury Copy Footer */}
                <div className="relative mt-auto flex flex-col justify-between gap-1 px-3 py-3 sm:px-5 sm:py-4">
                  <h2 className="font-display text-sm sm:text-xl font-black text-[#1A2530] leading-snug">
                    {loc.nativeTitle}
                  </h2>
                  <p className="text-[11px] sm:text-xs font-bold text-[#1A2530]/70 line-clamp-2 leading-relaxed">
                    {loc.hqSubtitle} · {loc.highlights[0]}
                  </p>
                  <div className="mt-1 hidden sm:flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-extrabold text-[#9A7209]">
                    {loc.highlights.map((h, i) => (
                      <React.Fragment key={h}>
                        {i > 0 && <span aria-hidden="true">·</span>}
                        <span>{h}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* UPCOMING GLOBAL WORLDS — COMPACT HORIZONTAL STRIP */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 text-[11px] font-extrabold text-[#1A2530]/60">
            <span>
              {tr(selectedLang, 'Upcoming Global Markets', 'أسواق عالمية قادمة قريباً')}
            </span>
            <span className="text-[#9A7209]">
              {tr(selectedLang, 'Global Expansions', 'توسعات دولية')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {upcomingMarkets.map((market) => {
              const shortLabel = isEn
                ? market.id === 'turkey'
                  ? 'Turkey'
                  : market.id === 'korea'
                  ? 'Korea'
                  : 'Hollywood'
                : market.id === 'turkey'
                ? 'تركيا'
                : market.id === 'korea'
                ? 'كوريا'
                : 'هوليوود';
              return (
                <button
                  key={market.id}
                  type="button"
                  onClick={() => handleSelectMarket(market.id, false)}
                  className={`group flex min-h-[54px] items-center justify-between gap-1.5 rounded-2xl border border-[#D4AF37]/40 bg-[#FFFDF8]/90 px-2.5 py-2 sm:px-3.5 sm:py-2.5 ${
                    isEn ? 'text-left' : 'text-right'
                  } shadow-2xs transition hover:border-[#D4AF37] hover:bg-[#FFF9E6] cursor-pointer`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <div className="w-7 sm:w-10 shrink-0 opacity-90 group-hover:opacity-100 transition">
                      <WorldFlagArt market={market.id} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-black text-[#1A2530] whitespace-nowrap">
                        {shortLabel}
                      </div>
                      <div className="text-[10px] font-extrabold text-[#9A7209]">
                        {tr(selectedLang, 'Soon', 'قريباً')}
                      </div>
                    </div>
                  </div>
                  <Lock className="h-3.5 w-3.5 shrink-0 text-[#B8860B]" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================== PINNED THUMB-ZONE BOTTOM CTA ==================== */}
      <footer className="relative z-20 mx-auto w-full max-w-4xl px-4 pt-2 pb-5 sm:px-6 sm:pb-7">
        {/* Unified 3-Step Opening Progress Dots */}
        <div
          className="mb-3 flex items-center justify-center gap-2"
          aria-label={tr(selectedLang, 'Step 1 of 3', 'الخطوة 1 من 3')}
        >
          <span
            className={`h-1.5 w-8 rounded-full transition-colors ${
              isSaudiSelected ? 'bg-[#046A38]' : 'bg-[#D91624]'
            }`}
          />
          <span className="h-1.5 w-2 rounded-full bg-[#1A2530]/20" />
          <span className="h-1.5 w-2 rounded-full bg-[#1A2530]/20" />
        </div>

        <button
          type="button"
          onClick={handleEnterMarket}
          className={`flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-[#D4AF37] px-6 py-3 text-sm sm:text-base font-display font-black text-white shadow-[0_12px_28px_rgba(26,37,48,0.22)] transition hover:brightness-110 active:scale-[0.985] cursor-pointer ${
            isSaudiSelected
              ? 'bg-gradient-to-l from-[#046A38] via-[#067D42] to-[#024725]'
              : 'bg-gradient-to-l from-[#D91624] via-[#B8121E] to-[#8C0E18]'
          }`}
        >
          <Crown className="h-5 w-5 text-[#FFF3B0]" />
          <span>
            {tr(
              selectedLang,
              `Enter ${activeMarketLoc.countryName} Market`,
              `دخول سوق ${activeMarketLoc.countryName}`
            )}
          </span>
          <CtaArrow className="h-5 w-5 text-[#FFF3B0]" />
        </button>
      </footer>
    </div>
  );
}

export default WelcomeMarketScreen;
