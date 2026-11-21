'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore, StudioLogoConfig, formatGameDate } from '@/lib/store';
import { FounderPerk } from '@/lib/game-engine';
import { getMarketProfile } from '@/lib/market-profiles';
import {
  getLocalizedFounderPerk,
  getLocalizedMarketInfo,
  getUiDir,
  tr,
} from '@/lib/i18n';
import { WorldFlagArt } from './WorldFlagArt';
import { LanguageSwitcher } from './LanguageSwitcher';
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
  Upload,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { NeelyoInfoTab } from './NeelyoInfoModal';
import {
  compressImageToWebp320,
  uploadImageToCloudinary,
  isCloudinaryConfigured,
} from '@/lib/cloudinary';

const PERK_ITEMS: {
  id: FounderPerk;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'visionary_director', icon: Film },
  { id: 'marketing_whale', icon: Megaphone },
  { id: 'shark_negotiator', icon: Handshake },
];

const STUDIO_SUGGESTIONS_EN: Record<string, string[]> = {
  egypt: [
    'Nile Crown Pictures',
    'Zamalek Studios',
    'Pharaoh Film House',
    'Cairo Horizon Films',
    'Golden Lotus Cinema',
  ],
  saudi: [
    'AlUla Grand Studios',
    'Riyadh Horizon Pictures',
    'Red Sea Royal Films',
    'Diriyah Cinema House',
    'Oasis Gold Studios',
  ],
};

type LogoDesignerTab = 'presets' | 'emblems' | 'frames' | 'palettes';

export function Stage1StudioCreation({
  onOpenInfo,
}: {
  onOpenInfo?: (tab: NeelyoInfoTab) => void;
} = {}) {
  const {
    uiLanguage,
    worldMarket,
    openMarketSelector,
    initializeStudio,
    logo: initialLogo,
    showToast,
    gameDay,
    currentYear,
    setChildModalOpen,
  } = useGameStore();

  const isEn = uiLanguage === 'en';
  const uiDir = getUiDir(uiLanguage);
  const marketProfile = getMarketProfile(worldMarket);
  const marketLoc = getLocalizedMarketInfo(worldMarket, uiLanguage);
  const currencyLabel = marketLoc.currencyLabel;
  const isSaudi = worldMarket === 'saudi';
  const studioSuggestions = isEn
    ? STUDIO_SUGGESTIONS_EN[worldMarket] || STUDIO_SUGGESTIONS_EN.egypt
    : marketProfile.studioNameSuggestions;

  const [step, setStep] = useState<1 | 2>(1);
  const [isLogoSheetOpen, setIsLogoSheetOpen] = useState(false);
  const [logoTab, setLogoTab] = useState<LogoDesignerTab>('presets');
  const [studioName, setStudioName] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [logoConfig, setLogoConfig] = useState<StudioLogoConfig>(initialLogo);
  const [pendingLogoBlob, setPendingLogoBlob] = useState<Blob | null>(null);
  const [selectedPerk, setSelectedPerk] =
    useState<FounderPerk>('visionary_director');
  const [isSigning, setIsSigning] = useState(false);

  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const launchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePalette =
    PALETTE_OPTIONS.find((p) => p.id === logoConfig.palette) ||
    PALETTE_OPTIONS[0];
  const activeEmblem =
    EMBLEM_OPTIONS.find((e) => e.id === logoConfig.emblem) || EMBLEM_OPTIONS[0];
  const activeFrame =
    FRAME_OPTIONS.find((f) => f.id === logoConfig.frame) || FRAME_OPTIONS[0];
  const activePerkLoc = getLocalizedFounderPerk(selectedPerk, uiLanguage);

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
    setPendingLogoBlob(null);
    setLogoConfig({
      emblem: randomEmblem,
      frame: randomFrame,
      palette: randomPalette,
      customImageUrl: undefined,
    });
  };

  const handleLogoFileSelect = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(
        tr(
          uiLanguage,
          'Please pick a valid image file (JPG, PNG, or WEBP)',
          'اختر ملف صورة صحيح (JPG أو PNG أو WEBP)'
        ),
        'warning'
      );
      return;
    }
    const compressed = await compressImageToWebp320(file, 320, 0.82);
    if (!compressed.ok || !compressed.dataUrl || !compressed.blob) {
      showToast(
        compressed.error ||
          tr(
            uiLanguage,
            'Could not process logo image—try another file.',
            'تعذر تجهيز صورة الشعار، جرب صورة أخرى'
          ),
        'warning'
      );
      return;
    }
    triggerTelegramHaptic('success');
    setPendingLogoBlob(compressed.blob);
    setLogoConfig((prev) => ({
      ...prev,
      customImageUrl: compressed.dataUrl,
    }));
  };

  const canLeaveStep1 = () => {
    if (!studioName.trim() || !ceoName.trim()) {
      triggerTelegramHaptic('warning');
      showToast(
        tr(
          uiLanguage,
          'Please enter both your studio name and CEO name first',
          'يرجى كتابة اسم شركة الإنتاج واسم المدير التنفيذي أولاً'
        ),
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

    const uploadPromise: Promise<string | undefined> =
      pendingLogoBlob && logoConfig.customImageUrl && isCloudinaryConfigured()
        ? Promise.race([
            uploadImageToCloudinary(pendingLogoBlob, 'neelyo/logos')
              .then((res) =>
                res.ok && res.secureUrl
                  ? res.secureUrl
                  : logoConfig.customImageUrl
              )
              .catch(() => logoConfig.customImageUrl),
            new Promise<string | undefined>((resolve) =>
              setTimeout(() => resolve(logoConfig.customImageUrl), 2500)
            ),
          ])
        : Promise.resolve(logoConfig.customImageUrl);

    launchTimerRef.current = setTimeout(async () => {
      const resolvedCustomLogoUrl = await uploadPromise;
      initializeStudio({
        studioName: studioName.trim(),
        ceoName: ceoName.trim(),
        logo: {
          ...logoConfig,
          customImageUrl: resolvedCustomLogoUrl,
        },
        founderPerk: selectedPerk,
        region: marketProfile.primaryRegion,
      });
    }, 900);
  };

  const BackArrow = isEn ? ArrowLeft : ArrowRight;
  const ForwardArrow = isEn ? ArrowRight : ArrowLeft;

  return (
    <div
      className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-[#F9F6F0] text-[#1A2530]"
      dir={uiDir}
    >
      {/* Zero-Cost Radial Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[360px] w-[620px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.22)_0%,rgba(212,175,55,0)_70%)]" />
        <div
          className={`absolute -bottom-24 left-1/2 h-[340px] w-[580px] -translate-x-1/2 ${
            isSaudi
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(4,106,56,0.13)_0%,rgba(4,106,56,0)_70%)]'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(217,22,36,0.11)_0%,rgba(217,22,36,0)_70%)]'
          }`}
        />
      </div>

      {/* ==================== TOP UTILITY BAR ==================== */}
      <header className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 pt-3 pb-1 sm:px-6 sm:pt-4">
        {/* Back Trigger */}
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
            <BackArrow className="h-4 w-4 text-[#D91624]" />
            <span>{tr(uiLanguage, 'Identity & Logo', 'الهوية والشعار')}</span>
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
            <BackArrow className="h-4 w-4 text-[#D91624]" />
            <span>{tr(uiLanguage, 'Change Market', 'تغيير الدولة')}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#9A7209]">
            <span>{formatGameDate(gameDay, currentYear, uiLanguage)}</span>
          </div>
        )}

        {/* Center: Compact Market Identity Indicator */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/70 bg-[#FFFDF8] px-3 py-1.5 shadow-2xs">
          <WorldFlagArt market={worldMarket} className="h-3.5 w-5 shrink-0" />
          <span className="text-[11px] font-black text-[#1A2530] whitespace-nowrap">
            {marketLoc.countryName}
          </span>
          <span className="text-[10px] font-black text-[#9A7209]" dir="ltr">
            · 75M {currencyLabel}
          </span>
        </div>

        {/* Right/End: Sleek Segmented Language Toggle + Info */}
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher variant="compact" tone="light" />

          {onOpenInfo && (
            <button
              type="button"
              onClick={() => {
                triggerTelegramHaptic('light');
                onOpenInfo('about');
              }}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37]/60 bg-[#FFFDF8] px-2.5 text-xs font-extrabold text-[#1A2530] shadow-xs hover:border-[#D4AF37] hover:bg-[#FFF9E6] transition cursor-pointer"
              aria-label={tr(uiLanguage, 'About Neelyo', 'عن Neelyo')}
            >
              <BookOpen className="h-4 w-4 text-[#D91624]" />
              <span className="hidden sm:inline">
                {tr(uiLanguage, 'About', 'عن Neelyo')}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* ==================== MAIN CONTENT STAGE ==================== */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-2 sm:px-6">
        {gameDay > 1 && step === 1 && (
          <div className="mb-3 rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530] px-4 py-2.5 text-xs font-bold text-[#F9F6F0] shadow-md">
            <span className="font-black text-[#D4AF37]">
              {tr(
                uiLanguage,
                `Market Comeback (${formatGameDate(gameDay, currentYear, uiLanguage)}): `,
                `عودة للسوق (${formatGameDate(gameDay, currentYear, uiLanguage)}): `
              )}
            </span>
            {tr(
              uiLanguage,
              `You're launching a fresh studio with 75M ${currencyLabel} in the same live timeline and star roster.`,
              `تبدأ شركة جديدة برأس مال 75M ${currencyLabel} في نفس الزمن ومع نفس النجوم.`
            )}
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
              {/* MINI LUXURY CREST CARD */}
              <div className="lg:col-span-5">
                <div className="relative overflow-hidden rounded-[24px] border-2 border-[#D4AF37] bg-gradient-to-br from-[#FFFDF8] via-[#FBF4E0] to-[#F4E6C3] p-3.5 sm:p-5 lg:p-6 shadow-[0_14px_34px_rgba(26,37,48,0.10)]">
                  <div className="pointer-events-none absolute -top-14 left-1/2 h-36 w-44 -translate-x-1/2 rounded-full bg-[#D4AF37]/20 blur-3xl" />

                  <div className="relative flex items-center gap-3.5 lg:flex-col lg:text-center">
                    <motion.div
                      key={`${logoConfig.emblem}_${logoConfig.frame}_${logoConfig.palette}_${logoConfig.customImageUrl ? 'img' : 'svg'}`}
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

                    <div className="min-w-0 flex-1 lg:w-full">
                      <span className="text-[10px] font-black tracking-wide text-[#9A7209]">
                        {tr(uiLanguage, 'OFFICIAL MOGUL CREST', 'بطاقة الإمبراطور الرسمية')}
                      </span>
                      <h1 className="mt-0.5 font-display text-lg sm:text-xl lg:text-2xl font-black text-[#1A2530] truncate lg:whitespace-normal">
                        {studioName.trim() ||
                          tr(uiLanguage, 'Production Studio Name', 'اسم شركة الإنتاج')}
                      </h1>
                      <p className="text-xs font-bold text-[#1A2530]/70 truncate">
                        {tr(uiLanguage, 'CEO:', 'المدير التنفيذي:')}{' '}
                        <span className="font-black text-[#9A7209]">
                          {ceoName.trim() ||
                            tr(uiLanguage, 'Enter your name below', 'اكتب اسمك أدناه')}
                        </span>
                      </p>

                      <div className="mt-2.5 lg:mt-4 flex items-center gap-2 lg:justify-center">
                        <button
                          type="button"
                          onClick={handleRandomizeLogo}
                          className="inline-flex min-h-[40px] flex-1 lg:flex-none items-center justify-center gap-1.5 rounded-xl border border-[#1A2530]/20 bg-[#FFFDF8] px-3 py-1.5 text-xs font-extrabold text-[#1A2530] shadow-2xs hover:border-[#D4AF37] hover:bg-white transition cursor-pointer whitespace-nowrap"
                        >
                          <Shuffle className="h-3.5 w-3.5 text-[#D91624]" />
                          <span>{tr(uiLanguage, 'Shuffle', 'عشوائي')}</span>
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
                          <span>{tr(uiLanguage, 'Customize Logo', 'تخصيص الشعار')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* INPUTS + SUGGESTIONS */}
              <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
                <div className="hidden lg:block mb-1">
                  <span className="text-xs font-black text-[#D91624]">
                    {tr(uiLanguage, 'STEP 2 OF 3 · STUDIO IDENTITY', 'الخطوة 2 من 3 · هوية الاستوديو')}
                  </span>
                  <h2 className="font-display text-2xl font-black text-[#1A2530] mt-0.5">
                    {tr(
                      uiLanguage,
                      'Name Your Empire & Sign Your Charter',
                      'أطلق اسم إمبراطوريتك ووقّع باسمك'
                    )}
                  </h2>
                </div>

                {/* Input 1: Studio Name */}
                <div className="space-y-2">
                  <label
                    htmlFor="neelyo-studio-name"
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#1A2530]"
                  >
                    <Building2 className="h-4 w-4 text-[#D91624]" />
                    <span>{tr(uiLanguage, 'Production Studio Name', 'اسم شركة الإنتاج')}</span>
                  </label>
                  <input
                    id="neelyo-studio-name"
                    type="text"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder={tr(
                      uiLanguage,
                      `e.g. ${studioSuggestions[0]}`,
                      `مثال: ${studioSuggestions[0] || marketProfile.defaultStudioName}`
                    )}
                    className="w-full min-h-[50px] rounded-2xl border-2 border-[#1A2530]/18 bg-[#FFFDF8] px-4 py-3 text-base font-extrabold text-[#1A2530] placeholder:text-[#1A2530]/40 shadow-2xs focus:border-[#D91624] focus:bg-white focus:outline-hidden transition"
                  />

                  <div className="flex flex-nowrap items-center gap-2 overflow-x-auto py-0.5">
                    {studioSuggestions.map((name) => {
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
                      <span>
                        {tr(uiLanguage, 'Founder & CEO Name', 'اسم المؤسس والمدير التنفيذي')}
                      </span>
                    </label>
                    {ceoName.trim() && (
                      <span
                        className={`${
                          isEn ? 'italic font-serif' : 'font-ruqaa'
                        } text-base text-[#9A7209] truncate max-w-[140px]`}
                      >
                        {ceoName.trim()}
                      </span>
                    )}
                  </div>
                  <input
                    id="neelyo-ceo-name"
                    type="text"
                    value={ceoName}
                    onChange={(e) => setCeoName(e.target.value)}
                    placeholder={tr(
                      uiLanguage,
                      'Type your executive signature name...',
                      'اكتب اسمك كما سيظهر في توقيع العقد...'
                    )}
                    className="w-full min-h-[50px] rounded-2xl border-2 border-[#1A2530]/18 bg-[#FFFDF8] px-4 py-3 text-base font-extrabold text-[#1A2530] placeholder:text-[#1A2530]/40 shadow-2xs focus:border-[#D91624] focus:bg-white focus:outline-hidden transition"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== SCREEN 3: PERK + FOUNDING CERTIFICATE ==================== */}
          {step === 2 && (
            <motion.div
              key="screen3_charter"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-7 items-center"
            >
              {/* 3 FOUNDER PERK CARDS */}
              <div className="lg:col-span-5 space-y-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <h1 className="font-display text-base sm:text-xl font-black text-[#1A2530]">
                    {tr(uiLanguage, 'Choose Your Executive Archetype', 'اختر شخصيتك القيادية')}
                  </h1>
                  <span className="text-[11px] font-black text-[#9A7209]">
                    {tr(uiLanguage, 'Permanent Perk', 'ميزة دائمة')}
                  </span>
                </div>

                <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-2.5">
                  {PERK_ITEMS.map(({ id, icon: Icon }) => {
                    const perk = getLocalizedFounderPerk(id, uiLanguage);
                    const isSelected = selectedPerk === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={isSigning}
                        onClick={() => {
                          triggerTelegramHaptic('selection');
                          setSelectedPerk(id);
                        }}
                        className={`relative flex flex-col lg:flex-row items-center lg:items-start gap-1.5 lg:gap-3 rounded-2xl border-2 p-2.5 sm:p-3.5 text-center ${
                          isEn ? 'lg:text-left' : 'lg:text-right'
                        } transition-all cursor-pointer ${
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
                            {perk.title}
                          </div>
                          <div
                            dir="ltr"
                            className="mt-0.5 text-[11px] sm:text-xs font-black text-[#D91624] tabular-nums"
                          >
                            {perk.badge}
                          </div>
                          <p className="mt-1 hidden lg:block text-xs font-bold leading-relaxed text-[#1A2530]/75">
                            {perk.description}
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

                <p className="lg:hidden rounded-xl border border-[#D4AF37]/50 bg-[#FFFDF8] px-3 py-2 text-[11px] font-bold text-[#1A2530]/80 text-center leading-relaxed shadow-2xs">
                  <strong className="text-[#D91624]">
                    {activePerkLoc.title}:{' '}
                  </strong>
                  {activePerkLoc.description}
                </p>
              </div>

              {/* OFFICIAL FOUNDING CERTIFICATE */}
              <div className="lg:col-span-7">
                <motion.div
                  animate={
                    isSigning
                      ? { x: [0, -5, 5, -3, 2, 0], y: [0, 3, -2, 1, 0] }
                      : undefined
                  }
                  transition={{ duration: 0.36 }}
                  className="relative overflow-hidden rounded-[24px] border-2 border-[#D4AF37] bg-gradient-to-br from-[#FFFDF8] via-[#FBF3DC] to-[#F2E3B8] p-3.5 sm:p-5 text-[#1A2530] shadow-[0_18px_42px_rgba(26,37,48,0.14)]"
                >
                  <div className="relative rounded-[18px] border border-[#B8860B]/45 bg-[#FFFDF8]/50 p-3.5 sm:p-5">
                    <div className="flex items-center justify-between gap-2 border-b border-[#1A2530]/15 pb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="shrink-0 rounded-xl border border-[#D4AF37] bg-[#1A2530] p-1 shadow-sm">
                          <StudioLogoSvg config={logoConfig} size={42} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-black tracking-wide text-[#9A7209]">
                            {tr(
                              uiLanguage,
                              `OFFICIAL STUDIO CHARTER · Neelyo ${currentYear}`,
                              `ميثاق تأسيس رسمي · Neelyo ${currentYear}`
                            )}
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
                          {marketLoc.countryName}
                        </span>
                      </div>
                    </div>

                    <div className={`mt-3 grid grid-cols-2 gap-2.5 ${isEn ? 'text-left' : 'text-right'}`}>
                      <div className="rounded-xl border border-[#1A2530]/10 bg-white/80 px-3 py-2">
                        <span className="block text-[10px] font-bold text-[#1A2530]/60">
                          {tr(uiLanguage, 'Seed Capital', 'رأس المال التأسيسي')}
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
                          {tr(uiLanguage, 'Founder Perk', 'الميزة القيادية')}
                        </span>
                        <span className="mt-0.5 block text-xs sm:text-sm font-black text-[#1A2530] truncate">
                          {activePerkLoc.title}{' '}
                          <span className="text-[#D91624]">
                            ({activePerkLoc.badge})
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Signature Area */}
                    <div className="mt-3.5 flex items-end justify-between gap-3 border-t border-dashed border-[#1A2530]/20 pt-3">
                      <div className="min-w-0 flex-1">
                        <span className="block text-[10px] font-extrabold text-[#1A2530]/60">
                          {tr(uiLanguage, 'Founder & CEO Signature', 'توقيع المؤسس والمدير التنفيذي')}
                        </span>
                        <div
                          className={`mt-0.5 ${
                            isEn ? 'italic font-serif' : 'font-ruqaa'
                          } text-2xl sm:text-3xl font-bold text-[#1A2530] leading-tight truncate`}
                        >
                          {ceoName.trim()}
                        </div>
                        <div className="mt-1 h-[2px] w-36 bg-gradient-to-l from-[#1A2530]/60 to-transparent" />
                      </div>

                      <div className="relative flex h-16 w-24 shrink-0 items-center justify-center">
                        {!isSigning && (
                          <div className="flex h-14 w-24 -rotate-6 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#B8860B]/50 text-center opacity-75">
                            <span className="text-[9px] font-black text-[#9A7209]">
                              {tr(uiLanguage, 'AWAITING SEAL', 'بانتظار الختم')}
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

                    <AnimatePresence>
                      {isSigning && (
                        <>
                          <motion.div
                            initial={{ scale: 0.4, opacity: 0.85 }}
                            animate={{ scale: 2.1, opacity: 0 }}
                            transition={{ duration: 0.55, ease: 'easeOut' }}
                            className={`pointer-events-none absolute bottom-5 ${
                              isEn ? 'right-7' : 'left-7'
                            } h-16 w-16 rounded-full border-4 border-[#D4AF37]`}
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
                            className={`pointer-events-none absolute bottom-3 ${
                              isEn ? 'right-4 sm:right-6' : 'left-4 sm:left-6'
                            } sm:bottom-4 z-20 flex flex-col items-center justify-center rounded-2xl border-[3px] border-[#B91C1C] bg-[#991B1B]/95 px-3.5 py-2 text-center shadow-[0_12px_28px_rgba(185,28,28,0.42)] ring-2 ring-[#D4AF37]`}
                          >
                            <span className="font-display text-sm sm:text-base font-black text-[#FFF3B0] leading-none">
                              {tr(uiLanguage, 'APPROVED', 'معتمد')}
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

      {/* ==================== PINNED BOTTOM CTA ==================== */}
      <footer className="relative z-20 mx-auto w-full max-w-5xl px-4 pt-2 pb-5 sm:px-6 sm:pb-7">
        <div
          className="mb-3 flex items-center justify-center gap-2"
          aria-label={
            step === 1
              ? tr(uiLanguage, 'Step 2 of 3', 'الخطوة 2 من 3')
              : tr(uiLanguage, 'Step 3 of 3', 'الخطوة 3 من 3')
          }
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
            <span>
              {tr(
                uiLanguage,
                'Next: Founder Perk & Sign Charter',
                'التالي: الشخصية وتوقيع العقد'
              )}
            </span>
            <ForwardArrow className="h-5 w-5 text-[#FFF3B0]" />
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
                <span>
                  {tr(
                    uiLanguage,
                    "Stamping charter & opening Emperor's Desk...",
                    'جارٍ اعتماد العقد وفتح مكتب الإمبراطور...'
                  )}
                </span>
              </>
            ) : (
              <>
                <PenTool className="h-5 w-5 text-[#D4AF37]" />
                <span>
                  {tr(uiLanguage, 'Sign Charter & Open Studio', 'وقّع العقد وافتتح الاستوديو')}
                </span>
              </>
            )}
          </button>
        )}
      </footer>

      {/* ==================== LOGO ATELIER BOTTOM SHEET ==================== */}
      <AnimatePresence>
        {isLogoSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsLogoSheetOpen(false)}
              className="absolute inset-0 bg-[#1A2530]/55 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-label={tr(uiLanguage, 'Customize Studio Logo', 'تخصيص شعار الاستوديو')}
              className="relative z-10 flex max-h-[84dvh] w-full sm:max-w-xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] border-t-2 sm:border-2 border-[#D4AF37] bg-[#F9F6F0] text-[#1A2530] shadow-[0_-18px_55px_rgba(26,37,48,0.35)]"
            >
              <div className="mx-auto mt-2.5 mb-1 h-1.5 w-12 rounded-full bg-[#1A2530]/20 sm:hidden" />

              <div className="flex items-center justify-between gap-3 border-b border-[#1A2530]/12 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 rounded-xl border-2 border-[#D4AF37] bg-[#1A2530] p-1.5 shadow-sm">
                    <StudioLogoSvg config={logoConfig} size={48} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-black text-[#1A2530]">
                      {tr(uiLanguage, 'Logo Design Atelier', 'استوديو تصميم الشعار')}
                    </h2>
                    <p className="text-[11px] font-bold text-[#9A7209] truncate">
                      {logoConfig.customImageUrl
                        ? tr(
                            uiLanguage,
                            'Custom uploaded crest · Compressed WebP 320×320',
                            'شعار مخصص من المعرض · مضغوط WebP 320×320'
                          )
                        : isEn
                        ? '24 Emblems · 12 Royal Frames · 18 Palettes'
                        : `${activeEmblem.name} · ${activeFrame.name} · ${activePalette.name}`}
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
                    <span>{tr(uiLanguage, 'Shuffle', 'عشوائي')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLogoSheetOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1A2530]/15 bg-[#FFFDF8] text-[#1A2530]/75 hover:text-[#1A2530] cursor-pointer"
                    aria-label={tr(uiLanguage, 'Close', 'إغلاق')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Custom Gallery Image Uploader Bar */}
              <div className="px-4 pt-3 sm:px-5">
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleLogoFileSelect(e.target.files?.[0])}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#D4AF37]/60 bg-[#FFFDF8] px-3 py-2 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1A2530] text-[#D4AF37]">
                      <Upload className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-black text-[#1A2530] truncate">
                        {logoConfig.customImageUrl
                          ? tr(uiLanguage, 'Custom gallery logo selected', 'تم اختيار صورة شعار من معرضك')
                          : tr(uiLanguage, 'Or upload your own studio logo', 'أو ارفع شعارك الخاص من المعرض')}
                      </span>
                      <span className="block text-[10px] font-bold text-[#1A2530]/60">
                        {tr(uiLanguage, 'Auto-optimized 320×320 WebP', 'ضغط فوري 320×320 WebP · خاص باستوديوك')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-[#D4AF37] bg-[#1A2530] px-3 text-[11px] font-black text-[#FFF3B0] hover:brightness-110 transition cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-[#D4AF37]" />
                      <span>
                        {logoConfig.customImageUrl
                          ? tr(uiLanguage, 'Change', 'تغيير الصورة')
                          : tr(uiLanguage, 'Upload Image', 'رفع صورة من المعرض')}
                      </span>
                    </button>
                    {logoConfig.customImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingLogoBlob(null);
                          setLogoConfig((prev) => ({
                            ...prev,
                            customImageUrl: undefined,
                          }));
                          if (logoFileInputRef.current) {
                            logoFileInputRef.current.value = '';
                          }
                        }}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-[#D91624] px-2.5 text-[11px] font-black text-white hover:brightness-110 transition cursor-pointer"
                        aria-label={tr(uiLanguage, 'Remove custom image', 'حذف الصورة المخصصة')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 Clean Sub-Tabs */}
              <div className="px-4 pt-2.5 pb-2 sm:px-5">
                <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-[#1A2530]/12 bg-[#EFE9DC] p-1">
                  {(
                    [
                      { id: 'presets', label: tr(uiLanguage, 'Presets', 'جاهزة'), icon: Sparkles },
                      { id: 'emblems', label: tr(uiLanguage, '24 Icons', 'الرمز 24'), icon: Shapes },
                      { id: 'frames', label: tr(uiLanguage, '12 Frames', 'الإطار 12'), icon: Shield },
                      { id: 'palettes', label: tr(uiLanguage, '18 Colors', 'الألوان 18'), icon: Palette },
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

              <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-5">
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
                            setPendingLogoBlob(null);
                            setLogoConfig({ ...preset, customImageUrl: undefined });
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
                            setPendingLogoBlob(null);
                            setLogoConfig((prev) => ({
                              ...prev,
                              emblem: emb.id,
                              customImageUrl: undefined,
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
                            {isEn ? emb.id.replace(/_/g, ' ') : emb.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

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
                            setPendingLogoBlob(null);
                            setLogoConfig((prev) => ({
                              ...prev,
                              frame: fr.id,
                              customImageUrl: undefined,
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
                            {isEn ? fr.id.replace(/_/g, ' ') : fr.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

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
                          className={`flex items-center gap-2.5 rounded-2xl border-2 p-2.5 ${
                            isEn ? 'text-left' : 'text-right'
                          } transition cursor-pointer ${
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
                            <span className="block truncate text-[11px] font-black text-[#1A2530] capitalize">
                              {isEn ? pal.id.replace(/_/g, ' ') : pal.name}
                            </span>
                            <span className="block text-[10px] font-bold text-[#1A2530]/55">
                              {pal.isDark
                                ? tr(uiLanguage, 'Luxury Dark', 'داكن فاخر')
                                : tr(uiLanguage, 'Classic Light', 'فاتح كلاسيكي')}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

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
                  <span>{tr(uiLanguage, 'Confirm Studio Logo', 'اعتماد الشعار')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
