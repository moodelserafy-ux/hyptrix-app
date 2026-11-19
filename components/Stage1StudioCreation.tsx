'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore, StudioLogoConfig, formatGameDate } from '@/lib/store';
import { FounderPerk } from '@/lib/game-engine';
import { getMarketProfile } from '@/lib/market-profiles';
import { WorldFlagArt } from './WorldFlagArt';
import { triggerTelegramHaptic } from './TelegramMiniAppBridge';
import { playHeavyIronStamp, playClapperboardSnap } from '@/lib/sound-fx';
import {
  StudioLogoSvg,
  EMBLEM_OPTIONS,
  FRAME_OPTIONS,
  PALETTE_OPTIONS,
  PREMADE_LOGO_COMBINATIONS,
} from './StudioLogoSvg';
import {
  Sparkles,
  Film,
  Megaphone,
  Handshake,
  Building2,
  UserCheck,
  Check,
  Palette,
  Shuffle,
  Crown,
  Shield,
  Shapes,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  PenTool,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { NeelyoInfoTab } from './NeelyoInfoModal';

const PERKS: {
  id: FounderPerk;
  title: string;
  shortTitle: string;
  metric: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'visionary_director',
    title: 'المخرج العبقري',
    shortTitle: 'المخرج',
    metric: '+8% جودة',
    desc: 'دفعة دائمة +8% في الجودة الفنية وتقييمات النقاد والمهرجانات.',
    icon: Film,
  },
  {
    id: 'marketing_whale',
    title: 'حوت الدعاية',
    shortTitle: 'الدعاية',
    metric: '+10% شباك',
    desc: 'يرفع إيرادات الافتتاح +10% وصفقات المنصات والقنوات.',
    icon: Megaphone,
  },
  {
    id: 'shark_negotiator',
    title: 'صديق النجوم',
    shortTitle: 'النجوم',
    metric: '-15% أجور',
    desc: 'يخفض أجور النجوم والمخرجين 15% ويقلل صدامات الغرور.',
    icon: Handshake,
  },
];

type LogoDesignerTab = 'presets' | 'emblems' | 'frames' | 'palettes';

export function Stage1StudioCreation({
  onOpenInfo,
}: {
  onOpenInfo?: (tab: NeelyoInfoTab) => void;
} = {}) {
  const {
    worldMarket,
    openMarketSelector,
    initializeStudio,
    logo: initialLogo,
    showToast,
    gameDay,
    currentYear,
    setChildModalOpen,
  } = useGameStore();

  const marketProfile = getMarketProfile(worldMarket);
  const currencyLabel = marketProfile.currencyLabel;
  const isSaudi = worldMarket === 'saudi';

  const [step, setStep] = useState<1 | 2>(1);
  const [isLogoSheetOpen, setIsLogoSheetOpen] = useState(false);
  const [logoTab, setLogoTab] = useState<LogoDesignerTab>('presets');
  const [studioName, setStudioName] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [logoConfig, setLogoConfig] = useState<StudioLogoConfig>(initialLogo);
  const [selectedPerk, setSelectedPerk] =
    useState<FounderPerk>('visionary_director');
  const [isSigning, setIsSigning] = useState(false);

  const launchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePalette =
    PALETTE_OPTIONS.find((p) => p.id === logoConfig.palette) ||
    PALETTE_OPTIONS[0];
  const activeEmblem =
    EMBLEM_OPTIONS.find((e) => e.id === logoConfig.emblem) || EMBLEM_OPTIONS[0];
  const activeFrame =
    FRAME_OPTIONS.find((f) => f.id === logoConfig.frame) || FRAME_OPTIONS[0];
  const activePerkObj = PERKS.find((p) => p.id === selectedPerk) || PERKS[0];

  // Sync bottom sheet modal with store & Telegram native BackButton
  useEffect(() => {
    setChildModalOpen(isLogoSheetOpen);
    return () => setChildModalOpen(false);
  }, [isLogoSheetOpen, setChildModalOpen]);

  useEffect(() => {
    if (!isLogoSheetOpen) return;
    const handleTelegramBack = () => setIsLogoSheetOpen(false);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLogoSheetOpen(false);
    };
    window.addEventListener('neelyo:telegram-back', handleTelegramBack);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('neelyo:telegram-back', handleTelegramBack);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isLogoSheetOpen]);

  // Cleanup stamp timers on unmount
  useEffect(() => {
    return () => {
      if (launchTimerRef.current) clearTimeout(launchTimerRef.current);
      if (hapticTimerRef.current) clearTimeout(hapticTimerRef.current);
    };
  }, []);

  const handleRandomizeLogo = () => {
    triggerTelegramHaptic('light');
    const randomEmblem =
      EMBLEM_OPTIONS[Math.floor(Math.random() * EMBLEM_OPTIONS.length)].id;
    const randomFrame =
      FRAME_OPTIONS[Math.floor(Math.random() * FRAME_OPTIONS.length)].id;
    const randomPalette =
      PALETTE_OPTIONS[Math.floor(Math.random() * PALETTE_OPTIONS.length)].id;
    setLogoConfig({
      emblem: randomEmblem,
      frame: randomFrame,
      palette: randomPalette,
    });
  };

  const canLeaveStep1 = () => {
    if (!studioName.trim() || !ceoName.trim()) {
      triggerTelegramHaptic('warning');
      showToast(
        'يرجى كتابة اسم شركة الإنتاج واسم المدير التنفيذي أولاً',
        'warning'
      );
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!canLeaveStep1()) return;
    triggerTelegramHaptic('medium');
    playClapperboardSnap();
    setStep(2);
  };

  const handleSignAndLaunch = () => {
    if (isSigning) return;
    if (!canLeaveStep1()) {
      setStep(1);
      return;
    }
    setIsSigning(true);
    playHeavyIronStamp();
    triggerTelegramHaptic('heavy');

    hapticTimerRef.current = setTimeout(() => {
      triggerTelegramHaptic('success');
    }, 320);

    launchTimerRef.current = setTimeout(() => {
      initializeStudio({
        studioName: studioName.trim(),
        ceoName: ceoName.trim(),
        logo: logoConfig,
        founderPerk: selectedPerk,
        region: marketProfile.primaryRegion,
      });
    }, 900);
  };

  return (
    <div
      className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-[#F9F6F0] text-[#1A2530]"
      dir="rtl"
    >
      {/* Warm Creamy Ivory & Golden Ambient Glow matching the Main Interface */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-[320px] w-[540px] -translate-x-1/2 rounded-full bg-[#D4AF37]/18 blur-[90px]" />
        <div
          className={`absolute bottom-[-95px] left-1/2 h-[280px] w-[460px] -translate-x-1/2 rounded-full blur-[100px] ${
            isSaudi ? 'bg-[#046A38]/10' : 'bg-[#D91624]/10'
          }`}
        />
      </div>

      {/* ==================== TOP UTILITY BAR ==================== */}
      <header className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 pt-3 pb-1 sm:px-6 sm:pt-4">
        {/* Right: Back Trigger */}
        {step === 2 ? (
          <button
            type="button"
            disabled={isSigning}
            onClick={() => {
              triggerTelegramHaptic('light');
              setStep(1);
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#1A2530]/15 bg-[#FFFDF8] px-3 text-xs font-extrabold text-[#1A2530] shadow-xs hover:border-[#D4AF37] hover:bg-[#FFF9E6] transition cursor-pointer disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4 text-[#D91624]" />
            <span>الهوية والشعار</span>
          </button>
        ) : gameDay <= 1 ? (
          <button
            type="button"
            onClick={() => {
              triggerTelegramHaptic('light');
              openMarketSelector();
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#1A2530]/15 bg-[#FFFDF8] px-3 text-xs font-extrabold text-[#1A2530] shadow-xs hover:border-[#D4AF37] hover:bg-[#FFF9E6] transition cursor-pointer"
          >
            <ArrowRight className="h-4 w-4 text-[#D91624]" />
            <span>تغيير الدولة</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#9A7209]">
            <span>{formatGameDate(gameDay, currentYear)}</span>
          </div>
        )}

        {/* Center: Compact Market Identity Indicator */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/70 bg-[#FFFDF8] px-3 py-1.5 shadow-2xs">
          <WorldFlagArt market={worldMarket} className="h-3.5 w-5 shrink-0" />
          <span className="text-[11px] font-black text-[#1A2530] whitespace-nowrap">
            {marketProfile.countryNameAr}
          </span>
          <span className="text-[10px] font-black text-[#9A7209]">
            · 75M {currencyLabel}
          </span>
        </div>

        {/* Left: Info Button */}
        {onOpenInfo ? (
          <button
            type="button"
            onClick={() => {
              triggerTelegramHaptic('light');
              onOpenInfo('about');
            }}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37]/60 bg-[#FFFDF8] px-2.5 text-xs font-extrabold text-[#1A2530] shadow-xs hover:border-[#D4AF37] hover:bg-[#FFF9E6] transition cursor-pointer"
            aria-label="عن Neelyo"
          >
            <BookOpen className="h-4 w-4 text-[#D91624]" />
            <span className="hidden sm:inline">عن Neelyo</span>
          </button>
        ) : (
          <div className="w-[44px]" />
        )}
      </header>

      {/* ==================== MAIN CONTENT STAGE ==================== */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-2 sm:px-6">
        {gameDay > 1 && step === 1 && (
          <div className="mb-3 rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530] px-4 py-2.5 text-xs font-bold text-[#F9F6F0] shadow-md">
            <span className="font-black text-[#D4AF37]">
              عودة للسوق ({formatGameDate(gameDay, currentYear)}):{' '}
            </span>
            تبدأ شركة جديدة برأس مال 75M {currencyLabel} في نفس الزمن ومع نفس النجوم.
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ==================== SCREEN 2: EMPEROR IDENTITY CARD ==================== */}
          {step === 1 && (
            <motion.div
              key="screen2_identity"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-7 items-center"
            >
              {/* RIGHT / TOP: MINI LUXURY CREST CARD (Warm Creamy-Gold Plaque) */}
              <div className="lg:col-span-5">
                <div className="relative overflow-hidden rounded-[24px] border-2 border-[#D4AF37] bg-gradient-to-br from-[#FFFDF8] via-[#FBF4E0] to-[#F4E6C3] p-3.5 sm:p-5 lg:p-6 shadow-[0_14px_34px_rgba(26,37,48,0.10)]">
                  <div className="pointer-events-none absolute -top-14 left-1/2 h-36 w-44 -translate-x-1/2 rounded-full bg-[#D4AF37]/20 blur-3xl" />

                  <div className="relative flex items-center gap-3.5 lg:flex-col lg:text-center">
                    {/* Illuminated Live Studio Crest */}
                    <motion.div
                      key={`${logoConfig.emblem}_${logoConfig.frame}_${logoConfig.palette}`}
                      initial={{ scale: 0.9, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0 rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530] p-2 lg:p-3 shadow-[0_10px_24px_rgba(26,37,48,0.22)]"
                    >
                      <StudioLogoSvg
                        config={logoConfig}
                        size={112}
                        className="h-[68px] w-[68px] sm:h-[82px] sm:w-[82px] lg:h-[120px] lg:w-[120px]"
                      />
                    </motion.div>

                    {/* Live Studio Title & CEO */}
                    <div className="min-w-0 flex-1 lg:w-full">
                      <span className="text-[10px] font-black tracking-wide text-[#9A7209]">
                        بطاقة الإمبراطور الرسمية
                      </span>
                      <h1 className="mt-0.5 font-display text-lg sm:text-xl lg:text-2xl font-black text-[#1A2530] truncate lg:whitespace-normal">
                        {studioName.trim() || 'اسم شركة الإنتاج'}
                      </h1>
                      <p className="text-xs font-bold text-[#1A2530]/70 truncate">
                        المدير التنفيذي:{' '}
                        <span className="font-black text-[#9A7209]">
                          {ceoName.trim() || 'اكتب اسمك أدناه'}
                        </span>
                      </p>

                      {/* 2 Direct Logo Controls Right Inside Card */}
                      <div className="mt-2.5 lg:mt-4 flex items-center gap-2 lg:justify-center">
                        <button
                          type="button"
                          onClick={handleRandomizeLogo}
                          className="inline-flex min-h-[40px] flex-1 lg:flex-none items-center justify-center gap-1.5 rounded-xl border border-[#1A2530]/20 bg-[#FFFDF8] px-3 py-1.5 text-xs font-extrabold text-[#1A2530] shadow-2xs hover:border-[#D4AF37] hover:bg-white transition cursor-pointer whitespace-nowrap"
                        >
                          <Shuffle className="h-3.5 w-3.5 text-[#D91624]" />
                          <span>عشوائي</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerTelegramHaptic('light');
                            setIsLogoSheetOpen(true);
                          }}
                          className="inline-flex min-h-[40px] flex-1 lg:flex-none items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37] bg-[#1A2530] px-3.5 py-1.5 text-xs font-black text-[#FFF3B0] shadow-xs hover:brightness-110 transition cursor-pointer whitespace-nowrap"
                        >
                          <Palette className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>تخصيص الشعار</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LEFT / BOTTOM: TWO CLEAN SPACIOUS INPUTS + HORIZONTAL SWIPE SUGGESTIONS */}
              <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
                <div className="hidden lg:block mb-1">
                  <span className="text-xs font-black text-[#D91624]">
                    الخطوة 2 من 3 · هوية الاستوديو
                  </span>
                  <h2 className="font-display text-2xl font-black text-[#1A2530] mt-0.5">
                    أطلق اسم إمبراطوريتك ووقّع باسمك
                  </h2>
                </div>

                {/* Input 1: Studio Name */}
                <div className="space-y-2">
                  <label
                    htmlFor="neelyo-studio-name"
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#1A2530]"
                  >
                    <Building2 className="h-4 w-4 text-[#D91624]" />
                    <span>اسم شركة الإنتاج</span>
                  </label>
                  <input
                    id="neelyo-studio-name"
                    type="text"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder={`مثال: ${
                      marketProfile.studioNameSuggestions[0] ||
                      marketProfile.defaultStudioName
                    }`}
                    className="w-full min-h-[50px] rounded-2xl border-2 border-[#1A2530]/18 bg-[#FFFDF8] px-4 py-3 text-base font-extrabold text-[#1A2530] placeholder:text-[#1A2530]/40 shadow-2xs focus:border-[#D91624] focus:bg-white focus:outline-hidden transition"
                  />

                  {/* Single-Row Horizontally Swipeable Suggestions Strip */}
                  <div className="flex flex-nowrap items-center gap-2 overflow-x-auto py-0.5">
                    {marketProfile.studioNameSuggestions.map((name) => {
                      const active = studioName.trim() === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            triggerTelegramHaptic('selection');
                            setStudioName(name);
                          }}
                          className={`shrink-0 min-h-[36px] rounded-xl border px-3 py-1 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                            active
                              ? 'border-[#D91624] bg-[#FFF5D6] text-[#1A2530] shadow-2xs'
                              : 'border-[#1A2530]/15 bg-[#FFFDF8] text-[#1A2530]/75 hover:border-[#D4AF37] hover:text-[#1A2530]'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Input 2: CEO Name */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="neelyo-ceo-name"
                      className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#1A2530]"
                    >
                      <UserCheck className="h-4 w-4 text-[#D91624]" />
                      <span>اسم المؤسس والمدير التنفيذي</span>
                    </label>
                    {ceoName.trim() && (
                      <span className="font-ruqaa text-base text-[#9A7209] truncate max-w-[140px]">
                        {ceoName.trim()}
                      </span>
                    )}
                  </div>
                  <input
                    id="neelyo-ceo-name"
                    type="text"
                    value={ceoName}
                    onChange={(e) => setCeoName(e.target.value)}
                    placeholder="اكتب اسمك كما سيظهر في توقيع العقد..."
                    className="w-full min-h-[50px] rounded-2xl border-2 border-[#1A2530]/18 bg-[#FFFDF8] px-4 py-3 text-base font-extrabold text-[#1A2530] placeholder:text-[#1A2530]/40 shadow-2xs focus:border-[#D91624] focus:bg-white focus:outline-hidden transition"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== SCREEN 3: PERK + MAGICAL FOUNDING CERTIFICATE ==================== */}
          {step === 2 && (
            <motion.div
              key="screen3_charter"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-7 items-center"
            >
              {/* RIGHT / TOP: 3 CRISP FOUNDER PERK CARDS */}
              <div className="lg:col-span-5 space-y-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <h1 className="font-display text-base sm:text-xl font-black text-[#1A2530]">
                    اختر شخصيتك القيادية
                  </h1>
                  <span className="text-[11px] font-black text-[#9A7209]">
                    ميزة دائمة
                  </span>
                </div>

                {/* 3-Up Compact Cards on Mobile, Generous Stacked on Desktop */}
                <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-2.5">
                  {PERKS.map((perk) => {
                    const Icon = perk.icon;
                    const isSelected = selectedPerk === perk.id;
                    return (
                      <button
                        key={perk.id}
                        type="button"
                        disabled={isSigning}
                        onClick={() => {
                          triggerTelegramHaptic('selection');
                          setSelectedPerk(perk.id);
                        }}
                        className={`relative flex flex-col lg:flex-row items-center lg:items-start gap-1.5 lg:gap-3 rounded-2xl border-2 p-2.5 sm:p-3.5 text-center lg:text-right transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#D91624] bg-gradient-to-b lg:bg-gradient-to-l from-[#FFFDF7] to-[#FDF1CC] shadow-[0_10px_24px_rgba(217,22,36,0.12)] ring-1 ring-[#D4AF37]'
                            : 'border-[#1A2530]/14 bg-[#FFFDF8] hover:border-[#D4AF37] shadow-2xs'
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition ${
                            isSelected
                              ? 'bg-[#D91624] text-[#FFF3B0] border border-[#D4AF37]'
                              : 'bg-[#1A2530] text-[#D4AF37]'
                          }`}
                        >
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-display text-xs sm:text-sm font-black text-[#1A2530] leading-tight truncate">
                            <span className="sm:hidden">{perk.shortTitle}</span>
                            <span className="hidden sm:inline">{perk.title}</span>
                          </div>
                          <div
                            dir="ltr"
                            className="mt-0.5 text-[11px] sm:text-xs font-black text-[#D91624] tabular-nums"
                          >
                            {perk.metric}
                          </div>
                          <p className="mt-1 hidden lg:block text-xs font-bold leading-relaxed text-[#1A2530]/75">
                            {perk.desc}
                          </p>
                        </div>

                        {isSelected && (
                          <span className="hidden lg:flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D91624] text-white">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Crisp 1-Line Active Perk Summary on Mobile */}
                <p className="lg:hidden rounded-xl border border-[#D4AF37]/50 bg-[#FFFDF8] px-3 py-2 text-[11px] font-bold text-[#1A2530]/80 text-center leading-relaxed shadow-2xs">
                  <strong className="text-[#D91624]">
                    {activePerkObj.title}:{' '}
                  </strong>
                  {activePerkObj.desc}
                </p>
              </div>

              {/* LEFT / BOTTOM: OFFICIAL LUXURY FOUNDING CERTIFICATE + CALLIGRAPHY + STAMP */}
              <div className="lg:col-span-7">
                <motion.div
                  animate={
                    isSigning
                      ? {
                          x: [0, -5, 5, -3, 2, 0],
                          y: [0, 3, -2, 1, 0],
                        }
                      : undefined
                  }
                  transition={{ duration: 0.36 }}
                  className="relative overflow-hidden rounded-[24px] border-2 border-[#D4AF37] bg-gradient-to-br from-[#FFFDF8] via-[#FBF3DC] to-[#F2E3B8] p-3.5 sm:p-5 text-[#1A2530] shadow-[0_18px_42px_rgba(26,37,48,0.14)]"
                >
                  {/* Inner Decorative Charter Frame */}
                  <div className="relative rounded-[18px] border border-[#B8860B]/45 bg-[#FFFDF8]/50 p-3.5 sm:p-5">
                    {/* Top Charter Crest Row */}
                    <div className="flex items-center justify-between gap-2 border-b border-[#1A2530]/15 pb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="shrink-0 rounded-xl border border-[#D4AF37] bg-[#1A2530] p-1 shadow-sm">
                          <StudioLogoSvg config={logoConfig} size={42} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-black tracking-wide text-[#9A7209]">
                            ميثاق تأسيس رسمي · Neelyo {currentYear}
                          </div>
                          <h2 className="font-display text-lg sm:text-2xl font-black text-[#1A2530] truncate">
                            {studioName.trim()}
                          </h2>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end">
                        <WorldFlagArt
                          market={worldMarket}
                          className="h-5 w-8 shadow-xs"
                        />
                        <span className="mt-0.5 text-[10px] font-black text-[#1A2530]/75">
                          {marketProfile.countryNameAr}
                        </span>
                      </div>
                    </div>

                    {/* Charter Key Terms */}
                    <div className="mt-3 grid grid-cols-2 gap-2.5 text-right">
                      <div className="rounded-xl border border-[#1A2530]/10 bg-white/80 px-3 py-2">
                        <span className="block text-[10px] font-bold text-[#1A2530]/60">
                          رأس المال التأسيسي
                        </span>
                        <span
                          dir="ltr"
                          className="mt-0.5 block font-typewriter text-sm sm:text-base font-black text-[#15803D] tabular-nums"
                        >
                          75M {currencyLabel}
                        </span>
                      </div>

                      <div className="rounded-xl border border-[#1A2530]/10 bg-white/80 px-3 py-2">
                        <span className="block text-[10px] font-bold text-[#1A2530]/60">
                          الميزة القيادية
                        </span>
                        <span className="mt-0.5 block text-xs sm:text-sm font-black text-[#1A2530] truncate">
                          {activePerkObj.title}{' '}
                          <span className="text-[#D91624]">
                            ({activePerkObj.metric})
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Live Arabic Ruqaa Signature Area */}
                    <div className="mt-3.5 flex items-end justify-between gap-3 border-t border-dashed border-[#1A2530]/20 pt-3">
                      <div className="min-w-0 flex-1">
                        <span className="block text-[10px] font-extrabold text-[#1A2530]/60">
                          توقيع المؤسس والمدير التنفيذي
                        </span>
                        <div className="mt-0.5 font-ruqaa text-2xl sm:text-3xl font-bold text-[#1A2530] leading-tight truncate">
                          {ceoName.trim()}
                        </div>
                        <div className="mt-1 h-[2px] w-36 bg-gradient-to-l from-[#1A2530]/60 to-transparent" />
                      </div>

                      {/* Resting Unstamped Seal Outline (Replaced by Animated Stamp on Launch) */}
                      <div className="relative flex h-16 w-24 shrink-0 items-center justify-center">
                        {!isSigning && (
                          <div className="flex h-14 w-24 -rotate-6 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#B8860B]/50 text-center opacity-75">
                            <span className="text-[9px] font-black text-[#9A7209]">
                              بانتظار الختم
                            </span>
                            <span
                              dir="ltr"
                              className="font-typewriter text-[10px] font-black text-[#1A2530]/65"
                            >
                              75M
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DRAMATIC ANIMATED CRIMSON-GOLD IRON STAMP SEAL ("معتمد · 75M") */}
                    <AnimatePresence>
                      {isSigning && (
                        <>
                          <motion.div
                            initial={{ scale: 0.4, opacity: 0.85 }}
                            animate={{ scale: 2.1, opacity: 0 }}
                            transition={{ duration: 0.55, ease: 'easeOut' }}
                            className="pointer-events-none absolute bottom-5 left-7 h-16 w-16 rounded-full border-4 border-[#D4AF37]"
                          />
                          <motion.div
                            initial={{ scale: 2.8, opacity: 0, rotate: -28 }}
                            animate={{ scale: 1, opacity: 1, rotate: -11 }}
                            transition={{
                              type: 'spring',
                              stiffness: 420,
                              damping: 20,
                              mass: 0.85,
                            }}
                            className="pointer-events-none absolute bottom-3 left-4 sm:bottom-4 sm:left-6 z-20 flex flex-col items-center justify-center rounded-2xl border-[3px] border-[#B91C1C] bg-[#991B1B]/95 px-3.5 py-2 text-center shadow-[0_12px_28px_rgba(185,28,28,0.42)] ring-2 ring-[#D4AF37]"
                          >
                            <span className="font-display text-sm sm:text-base font-black text-[#FFF3B0] leading-none">
                              معتمد
                            </span>
                            <span
                              dir="ltr"
                              className="mt-0.5 font-typewriter text-[11px] font-black text-white tracking-wider"
                            >
                              75M · {currentYear}
                            </span>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ==================== PINNED THUMB-ZONE BOTTOM CTA ==================== */}
      <footer className="relative z-20 mx-auto w-full max-w-5xl px-4 pt-2 pb-5 sm:px-6 sm:pb-7">
        {/* Unified 3-Step Opening Progress Indicator */}
        <div
          className="mb-3 flex items-center justify-center gap-2"
          aria-label={step === 1 ? 'الخطوة 2 من 3' : 'الخطوة 3 من 3'}
        >
          <span className="h-1.5 w-2 rounded-full bg-[#D4AF37]" />
          <span
            className={`h-1.5 rounded-full transition-all ${
              step === 1
                ? isSaudi
                  ? 'w-8 bg-[#046A38]'
                  : 'w-8 bg-[#D91624]'
                : 'w-2 bg-[#D4AF37]'
            }`}
          />
          <span
            className={`h-1.5 rounded-full transition-all ${
              step === 2
                ? isSaudi
                  ? 'w-8 bg-[#046A38]'
                  : 'w-8 bg-[#D91624]'
                : 'w-2 bg-[#1A2530]/20'
            }`}
          />
        </div>

        {step === 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className={`flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-[#D4AF37] px-6 py-3 text-sm sm:text-base font-display font-black text-white shadow-[0_12px_28px_rgba(26,37,48,0.22)] transition hover:brightness-110 active:scale-[0.985] cursor-pointer ${
              isSaudi
                ? 'bg-gradient-to-l from-[#046A38] via-[#067D42] to-[#024725]'
                : 'bg-gradient-to-l from-[#D91624] via-[#B8121E] to-[#8C0E18]'
            }`}
          >
            <span>التالي: الشخصية وتوقيع العقد</span>
            <ArrowLeft className="h-5 w-5 text-[#FFF3B0]" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSigning}
            onClick={handleSignAndLaunch}
            className="flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530] px-6 py-3 text-sm sm:text-base font-display font-black text-[#FFF3B0] shadow-[0_14px_30px_rgba(26,37,48,0.28)] transition hover:brightness-110 active:scale-[0.985] cursor-pointer disabled:opacity-90"
          >
            {isSigning ? (
              <>
                <Crown className="h-5 w-5 text-[#D4AF37]" />
                <span>جارٍ اعتماد العقد وفتح مكتب الإمبراطور...</span>
              </>
            ) : (
              <>
                <PenTool className="h-5 w-5 text-[#D4AF37]" />
                <span>وقّع العقد وافتتح الاستوديو</span>
              </>
            )}
          </button>
        )}
      </footer>

      {/* ==================== LUXURY CREAMY BOTTOM SHEET: LOGO ATELIER ==================== */}
      <AnimatePresence>
        {isLogoSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsLogoSheetOpen(false)}
              className="absolute inset-0 bg-[#1A2530]/55 backdrop-blur-sm"
            />

            {/* Sliding Creamy Sheet Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-label="تخصيص شعار الاستوديو"
              className="relative z-10 flex max-h-[84dvh] w-full sm:max-w-xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] border-t-2 sm:border-2 border-[#D4AF37] bg-[#F9F6F0] text-[#1A2530] shadow-[0_-18px_55px_rgba(26,37,48,0.35)]"
            >
              {/* Drag Handle Affordance */}
              <div className="mx-auto mt-2.5 mb-1 h-1.5 w-12 rounded-full bg-[#1A2530]/20 sm:hidden" />

              {/* Sheet Header with Live Crest Preview */}
              <div className="flex items-center justify-between gap-3 border-b border-[#1A2530]/12 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 rounded-xl border-2 border-[#D4AF37] bg-[#1A2530] p-1.5 shadow-sm">
                    <StudioLogoSvg config={logoConfig} size={48} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-black text-[#1A2530]">
                      استوديو تصميم الشعار
                    </h2>
                    <p className="text-[11px] font-bold text-[#9A7209] truncate">
                      {activeEmblem.name} · {activeFrame.name} ·{' '}
                      {activePalette.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleRandomizeLogo}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-[#D4AF37] bg-[#FFF9E6] px-3 text-xs font-black text-[#1A2530] hover:bg-[#FFF3B0] transition cursor-pointer"
                  >
                    <Shuffle className="h-3.5 w-3.5 text-[#D91624]" />
                    <span>عشوائي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLogoSheetOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1A2530]/15 bg-[#FFFDF8] text-[#1A2530]/75 hover:text-[#1A2530] cursor-pointer"
                    aria-label="إغلاق"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 4 Clean Sub-Tabs */}
              <div className="px-4 pt-3 pb-2 sm:px-5">
                <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-[#1A2530]/12 bg-[#EFE9DC] p-1">
                  {(
                    [
                      { id: 'presets', label: 'جاهزة', icon: Sparkles },
                      { id: 'emblems', label: 'الرمز 24', icon: Shapes },
                      { id: 'frames', label: 'الإطار 12', icon: Shield },
                      { id: 'palettes', label: 'الألوان 18', icon: Palette },
                    ] as const
                  ).map((t) => {
                    const Icon = t.icon;
                    const active = logoTab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          triggerTelegramHaptic('selection');
                          setLogoTab(t.id);
                        }}
                        className={`flex min-h-[42px] items-center justify-center gap-1 rounded-xl px-1.5 text-[11px] sm:text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[#1A2530] text-[#D4AF37] shadow-xs'
                            : 'text-[#1A2530]/75 hover:bg-white/70 hover:text-[#1A2530]'
                        }`}
                      >
                        <Icon className="hidden sm:block h-3.5 w-3.5 shrink-0" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Sheet Body */}
              <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-5">
                {/* Tab 1: Curated Presets */}
                {logoTab === 'presets' && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pb-2">
                    {PREMADE_LOGO_COMBINATIONS.map((preset, idx) => {
                      const isCurrent =
                        logoConfig.emblem === preset.emblem &&
                        logoConfig.frame === preset.frame &&
                        logoConfig.palette === preset.palette;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            triggerTelegramHaptic('selection');
                            setLogoConfig(preset);
                          }}
                          className={`flex items-center justify-center rounded-2xl border-2 p-2.5 transition cursor-pointer ${
                            isCurrent
                              ? 'border-[#D91624] bg-[#FFF9E6] shadow-sm'
                              : 'border-[#1A2530]/12 bg-[#FFFDF8] hover:border-[#D4AF37]'
                          }`}
                        >
                          <StudioLogoSvg config={preset} size={58} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tab 2: 24 Emblems */}
                {logoTab === 'emblems' && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-2">
                    {EMBLEM_OPTIONS.map((emb) => {
                      const active = logoConfig.emblem === emb.id;
                      return (
                        <button
                          key={emb.id}
                          type="button"
                          onClick={() => {
                            triggerTelegramHaptic('selection');
                            setLogoConfig((prev) => ({
                              ...prev,
                              emblem: emb.id,
                            }));
                          }}
                          className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2 transition cursor-pointer ${
                            active
                              ? 'border-[#D91624] bg-[#FFF9E6] shadow-xs'
                              : 'border-[#1A2530]/12 bg-[#FFFDF8] hover:border-[#D4AF37]'
                          }`}
                        >
                          <StudioLogoSvg
                            config={{
                              emblem: emb.id,
                              frame: 'no_frame',
                              palette: logoConfig.palette,
                            }}
                            size={44}
                          />
                          <span className="max-w-full truncate text-[10px] font-extrabold text-[#1A2530]">
                            {emb.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tab 3: 12 Frames */}
                {logoTab === 'frames' && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-2">
                    {FRAME_OPTIONS.map((fr) => {
                      const active = logoConfig.frame === fr.id;
                      return (
                        <button
                          key={fr.id}
                          type="button"
                          onClick={() => {
                            triggerTelegramHaptic('selection');
                            setLogoConfig((prev) => ({
                              ...prev,
                              frame: fr.id,
                            }));
                          }}
                          className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2 transition cursor-pointer ${
                            active
                              ? 'border-[#D91624] bg-[#FFF9E6] shadow-xs'
                              : 'border-[#1A2530]/12 bg-[#FFFDF8] hover:border-[#D4AF37]'
                          }`}
                        >
                          <StudioLogoSvg
                            config={{
                              emblem: logoConfig.emblem,
                              frame: fr.id,
                              palette: logoConfig.palette,
                            }}
                            size={46}
                          />
                          <span className="max-w-full truncate text-[10px] font-extrabold text-[#1A2530]">
                            {fr.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tab 4: 18 Palettes */}
                {logoTab === 'palettes' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
                    {PALETTE_OPTIONS.map((pal) => {
                      const active = logoConfig.palette === pal.id;
                      return (
                        <button
                          key={pal.id}
                          type="button"
                          onClick={() => {
                            triggerTelegramHaptic('selection');
                            setLogoConfig((prev) => ({
                              ...prev,
                              palette: pal.id,
                            }));
                          }}
                          className={`flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-right transition cursor-pointer ${
                            active
                              ? 'border-[#D91624] bg-[#FFF9E6] shadow-xs'
                              : 'border-[#1A2530]/12 bg-[#FFFDF8] hover:border-[#D4AF37]'
                          }`}
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/15 shadow-inner"
                            style={{
                              background: `linear-gradient(135deg, ${pal.bg}, ${pal.bgEnd})`,
                            }}
                          >
                            <span
                              className="h-4 w-4 rounded-full border border-white/50"
                              style={{
                                background: `linear-gradient(135deg, ${pal.primary}, ${pal.secondary})`,
                              }}
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-black text-[#1A2530]">
                              {pal.name}
                            </span>
                            <span className="block text-[10px] font-bold text-[#1A2530]/55">
                              {pal.isDark ? 'داكن فاخر' : 'فاتح كلاسيكي'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pinned Bottom Confirmation Bar */}
              <div className="border-t border-[#1A2530]/12 bg-[#F4EFE4] px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => {
                    triggerTelegramHaptic('success');
                    setIsLogoSheetOpen(false);
                  }}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530] px-5 text-sm font-display font-black text-[#FFF3B0] shadow-md transition hover:brightness-110 cursor-pointer"
                >
                  <Check className="h-4 w-4 stroke-[3] text-[#D4AF37]" />
                  <span>اعتماد الشعار</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
