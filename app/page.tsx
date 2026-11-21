'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import { getCurrencyLabel } from '@/lib/market-profiles';
import {
  detectPreferredUiLanguage,
  getUiDir,
  readSavedUiLanguage,
  tr,
  writeSavedUiLanguage,
} from '@/lib/i18n';
import { getOrCreateStudioInstanceId } from '@/lib/supabase';
import { prewarmAdNetworks } from '@/lib/ad-mediator';
import { WelcomeMarketScreen } from '@/components/WelcomeMarketScreen';
import { Stage1StudioCreation } from '@/components/Stage1StudioCreation';
import { StudioHubView } from '@/components/StudioHubView';
import { Stage2ProjectSetup } from '@/components/Stage2ProjectSetup';
import { Stage3CrewCastCards } from '@/components/Stage3CrewCastCards';
import { Stage4ProductionCrises } from '@/components/Stage4ProductionCrises';
import { Stage5ReleaseSimulation } from '@/components/Stage5ReleaseSimulation';
import { Stage6FestivalsAwards } from '@/components/Stage6FestivalsAwards';
import { LeaderboardAndSettingsView } from '@/components/LeaderboardAndSettingsView';
import { SettingsModal } from '@/components/SettingsModal';
import { WorldPopupsOverlay } from '@/components/WorldPopupsOverlay';
import { GameFeelEffects } from '@/components/GameFeelEffects';
import { LiveGameClock } from '@/components/LiveGameClock';
import StarForgeModal from '@/components/StarForgeModal';
import { StudioOnboardingTour } from '@/components/StudioOnboardingTour';
import { TelegramMiniAppBridge } from '@/components/TelegramMiniAppBridge';
import { NeelyoInfoModal, type NeelyoInfoTab } from '@/components/NeelyoInfoModal';
import {
  DirectorChairIcon,
  FilmReelSettingsIcon,
} from '@/components/CustomCinemaIcons';
import { Coins, BookOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function HomePage() {
  // Selective shallow subscription: prevents HomePage from re-rendering on draft edits,
  // actor updates, toasts, or unrelated store mutations!
  const {
    uiLanguage,
    worldMarket,
    hasSelectedMarket,
    selectLanguageAndMarket,
    studioCreated,
    studioName,
    cash,
    currentYear,
    gameDay,
    activeScreen,
    setActiveScreen,
    addAiDiscoveredActor,
    addAiEmergingStudio,
    addAiRivalReleases,
    pushAiContextualNewsEvent,
    hasBreakingNews,
    hasFestivalModal,
    isChildModalOpen,
    isPrWarRoomOpen,
    isStarForgeOpen,
    isBankruptLiquidated,
    onboardingTourStatus,
  } = useGameStore(
    useShallow((s) => ({
      uiLanguage: s.uiLanguage,
      worldMarket: s.worldMarket,
      hasSelectedMarket: s.hasSelectedMarket,
      selectLanguageAndMarket: s.selectLanguageAndMarket,
      studioCreated: s.studioCreated,
      studioName: s.studioName,
      cash: s.cash,
      currentYear: s.currentYear,
      gameDay: s.gameDay,
      activeScreen: s.activeScreen,
      setActiveScreen: s.setActiveScreen,
      addAiDiscoveredActor: s.addAiDiscoveredActor,
      addAiEmergingStudio: s.addAiEmergingStudio,
      addAiRivalReleases: s.addAiRivalReleases,
      pushAiContextualNewsEvent: s.pushAiContextualNewsEvent,
      hasBreakingNews: s.breakingNewsQueue.length > 0,
      hasFestivalModal: s.festivalModalQueue.length > 0,
      isChildModalOpen: s.isChildModalOpen,
      isPrWarRoomOpen: s.isPrWarRoomOpen,
      isStarForgeOpen: s.isStarForgeOpen,
      isBankruptLiquidated: s.isBankruptLiquidated,
      onboardingTourStatus: s.onboardingTourStatus,
    }))
  );

  const isEn = uiLanguage === 'en';
  const uiDir = getUiDir(uiLanguage);
  const currencyLabel = getCurrencyLabel(worldMarket, uiLanguage);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoModalState, setInfoModalState] = useState<{
    open: boolean;
    tab: NeelyoInfoTab;
  }>({ open: false, tab: 'about' });
  const [isRewardedAdPlaying, setIsRewardedAdPlaying] = useState(false);

  const handleOpenInfo = useCallback((tab: NeelyoInfoTab = 'about') => {
    setInfoModalState({ open: true, tab });
  }, []);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const aiTickBusyRef = useRef(false);
  const lastAiHandledDayRef = useRef(0);

  // Prewarm AdsGram + Monetag mediation and pause game clock during rewarded ad playback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    prewarmAdNetworks();
    const handleAdState = (e: Event) => {
      const detail = (e as CustomEvent<{ open?: boolean }>).detail;
      setIsRewardedAdPlaying(Boolean(detail?.open));
    };
    window.addEventListener('neelyo:ad-state', handleAdState);
    return () => {
      window.removeEventListener('neelyo:ad-state', handleAdState);
    };
  }, []);

  // Honor saved UI language immediately and ONLY auto-detect after Zustand persist hydration finishes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resolveLanguageOnceHydrated = () => {
      const saved = readSavedUiLanguage();
      const state = useGameStore.getState();

      if (saved) {
        if (state.uiLanguage !== saved || !state.hasManuallySelectedLanguage) {
          state.setUiLanguage(saved, true);
        }
        return;
      }

      if (state.hasManuallySelectedLanguage) {
        writeSavedUiLanguage(state.uiLanguage);
        return;
      }

      const detected = detectPreferredUiLanguage();
      if (detected !== state.uiLanguage) {
        state.setUiLanguage(detected, false);
      }
    };

    const earlySaved = readSavedUiLanguage();
    if (earlySaved) {
      const current = useGameStore.getState();
      if (current.uiLanguage !== earlySaved || !current.hasManuallySelectedLanguage) {
        current.setUiLanguage(earlySaved, true);
      }
    }

    if (useGameStore.persist.hasHydrated()) {
      resolveLanguageOnceHydrated();
      return;
    }

    const unsub = useGameStore.persist.onFinishHydration(() => {
      resolveLanguageOnceHydrated();
    });
    return () => unsub();
  }, []);

  // Sync <html dir lang> dynamically on every language switch + keep warm ivory viewport background
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dir = uiDir;
    document.documentElement.lang = uiLanguage;
    document.body.style.backgroundColor = '#F9F6F0';
    document.documentElement.style.backgroundColor = '#F9F6F0';
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, [uiDir, uiLanguage]);

  const isOnboardingChoiceOpen =
    studioCreated &&
    activeScreen === 'STUDIO_HUB' &&
    onboardingTourStatus === 'pending_choice';
  const isOnboardingSpotlightActive =
    studioCreated &&
    activeScreen === 'STUDIO_HUB' &&
    onboardingTourStatus === 'active';

  const isTopOverlayOpen =
    settingsOpen ||
    infoModalState.open ||
    isPrWarRoomOpen ||
    isStarForgeOpen ||
    isBankruptLiquidated ||
    isOnboardingChoiceOpen ||
    hasBreakingNews ||
    hasFestivalModal;
  const isAnyModalOpen = isTopOverlayOpen || isChildModalOpen;
  const isClockPausedByOverlay =
    isAnyModalOpen || isOnboardingSpotlightActive || isRewardedAdPlaying;

  // Centralized Background Scroll & Touch Lock whenever ANY modal is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    if (isAnyModalOpen) {
      htmlEl.style.overflow = 'hidden';
      bodyEl.style.overflow = 'hidden';
      bodyEl.style.overscrollBehavior = 'none';
    } else {
      htmlEl.style.overflow = '';
      bodyEl.style.overflow = '';
      bodyEl.style.overscrollBehavior = '';
    }

    return () => {
      htmlEl.style.overflow = '';
      bodyEl.style.overflow = '';
      bodyEl.style.overscrollBehavior = '';
    };
  }, [isAnyModalOpen]);

  // Instant scroll reset on screen navigation (no sluggish smooth-scroll fighting on mobile)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [activeScreen]);

  // Background World Evolution — pulls from shared 12-hour /api/world-pool (0 Groq tokens per player!)
  useEffect(() => {
    if (
      !studioCreated ||
      isClockPausedByOverlay ||
      aiTickBusyRef.current ||
      lastAiHandledDayRef.current === gameDay ||
      (typeof document !== 'undefined' && document.hidden)
    ) {
      return;
    }

    const seed =
      typeof window !== 'undefined'
        ? getOrCreateStudioInstanceId() || studioName || 'studio'
        : studioName || 'studio';

    const buildPoolUrl = (type: string, extra = '') =>
      `/api/world-pool?market=${encodeURIComponent(worldMarket)}&lang=${encodeURIComponent(uiLanguage)}&type=${encodeURIComponent(type)}&seed=${encodeURIComponent(seed)}&gameDay=${gameDay}&currentYear=${currentYear}&studioName=${encodeURIComponent(studioName)}${extra}`;

    if (gameDay > 6 && gameDay % 16 === 0) {
      lastAiHandledDayRef.current = gameDay;
      aiTickBusyRef.current = true;
      const fmt = gameDay % 32 === 0 ? 'series' : 'film';
      fetch(buildPoolUrl('rival_releases', `&format=${fmt}`))
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data?.rivals) && data.rivals.length > 0) {
            addAiRivalReleases(data.rivals, data.headline, data.detail);
          }
        })
        .catch(() => {})
        .finally(() => {
          aiTickBusyRef.current = false;
        });
    } else if (activeScreen === 'STUDIO_HUB' && gameDay > 10 && gameDay % 28 === 0) {
      lastAiHandledDayRef.current = gameDay;
      aiTickBusyRef.current = true;
      fetch(buildPoolUrl('rising_star'))
        .then((r) => r.json())
        .then((data) => {
          if (data?.actor && data?.headline) {
            addAiDiscoveredActor(data.actor, data.headline, data.detail || '');
          }
        })
        .catch(() => {})
        .finally(() => {
          aiTickBusyRef.current = false;
        });
    } else if (activeScreen === 'STUDIO_HUB' && gameDay > 12 && gameDay % 34 === 0) {
      lastAiHandledDayRef.current = gameDay;
      aiTickBusyRef.current = true;
      fetch(buildPoolUrl('emerging_studio'))
        .then((r) => r.json())
        .then((data) => {
          if (data?.studio && data?.headline) {
            addAiEmergingStudio(data.studio, data.headline, data.detail || '');
          }
        })
        .catch(() => {})
        .finally(() => {
          aiTickBusyRef.current = false;
        });
    } else if (activeScreen === 'STUDIO_HUB' && gameDay > 12 && gameDay % 22 === 0) {
      lastAiHandledDayRef.current = gameDay;
      aiTickBusyRef.current = true;
      fetch(buildPoolUrl('market_news'))
        .then((r) => r.json())
        .then((data) => {
          if (data?.headline && data?.detail) {
            pushAiContextualNewsEvent(data);
          }
        })
        .catch(() => {})
        .finally(() => {
          aiTickBusyRef.current = false;
        });
    }
  }, [
    gameDay,
    studioCreated,
    worldMarket,
    uiLanguage,
    isClockPausedByOverlay,
    activeScreen,
    studioName,
    currentYear,
    addAiDiscoveredActor,
    addAiEmergingStudio,
    addAiRivalReleases,
    pushAiContextualNewsEvent,
  ]);

  const isStepScreen = studioCreated && activeScreen !== 'STUDIO_HUB';

  return (
    <div
      className={`relative min-h-[100dvh] w-full bg-[#F9F6F0] text-[#1A2530] ${
        studioCreated ? 'pb-14' : 'pb-0'
      }`}
      dir={uiDir}
    >
      {/* Telegram Mini App Native Bridge (Safe No-op in Standard Browsers) */}
      <TelegramMiniAppBridge
        hasTopUiModalOpen={infoModalState.open || settingsOpen}
        onCloseTopUiModal={() => {
          if (infoModalState.open) {
            setInfoModalState((prev) => ({ ...prev, open: false }));
          } else if (settingsOpen) {
            setSettingsOpen(false);
          }
        }}
      />

      {/* Global Clapperboard Transitions, Flying Cash Deltas & Crisis Red Alert */}
      <GameFeelEffects />

      {/* UNIFIED TOP STUDIO NAVBAR */}
      {studioCreated && (
        <header
          className={`relative z-30 bg-[#1A2530] text-[#F9F6F0] border-b-4 border-[#D4AF37] px-3 sm:px-6 py-2.5 shadow-lg transition-opacity duration-150 ${
            isAnyModalOpen ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <div
            className={`mx-auto flex items-center justify-between gap-2 ${
              activeScreen === 'STUDIO_HUB' ? 'max-w-5xl' : 'max-w-4xl'
            }`}
          >
            {/* Zone 1: Back to Emperor Desk or Studio Brand Mark */}
            {isStepScreen ? (
              <button
                type="button"
                onClick={() => setActiveScreen('STUDIO_HUB')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D91624] hover:brightness-110 text-white font-display text-xs sm:text-sm border border-[#D4AF37] shadow cursor-pointer transition shrink-0 whitespace-nowrap"
              >
                <DirectorChairIcon className="w-4 h-4 text-[#D4AF37]" />
                <span>{tr(uiLanguage, "Emperor's Desk", 'مكتب الإمبراطور')}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <Image
                  src="/images/neelyo-logo.png"
                  alt="Neelyo"
                  width={32}
                  height={32}
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 object-contain"
                />
                <span className="font-display text-sm sm:text-base text-[#F9F6F0] truncate max-w-[140px] sm:max-w-[220px]">
                  {studioName}
                </span>
              </div>
            )}

            {/* Zone 2: Isolated Live Game Clock (Zero Full-App Re-renders!) */}
            <LiveGameClock
              isPausedByOverlay={isClockPausedByOverlay}
              isAnyModalOpen={isAnyModalOpen}
            />

            {/* Zone 3: Cash Plaque, Neelyo Info Crest & Film Reel Settings */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden xs:flex sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F9F6F0]/10 border border-[#D4AF37]/45">
                <Coins className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span
                  dir="ltr"
                  className="font-typewriter text-xs font-black text-[#F9F6F0] tabular-nums"
                >
                  {formatMoney(cash)}
                </span>
                <span className="text-[10px] font-bold text-[#D4AF37]">
                  {currencyLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleOpenInfo('about')}
                className="p-1.5 rounded-xl bg-[#F9F6F0]/12 hover:bg-[#F9F6F0]/22 text-[#D4AF37] border border-[#D4AF37]/60 shadow cursor-pointer transition"
                title={isEn ? 'About Neelyo, Privacy & Contact' : 'عن Neelyo والخصوصية والتواصل'}
                aria-label={isEn ? 'About Neelyo, Privacy & Contact' : 'عن Neelyo والخصوصية والتواصل'}
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={handleOpenSettings}
                className="p-1.5 rounded-xl bg-[#D4AF37] hover:brightness-110 text-[#1A2530] border border-[#F9F6F0]/70 shadow cursor-pointer"
                title={isEn ? 'Studio Settings & Language' : 'إعدادات الاستوديو واللغة'}
              >
                <FilmReelSettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Container */}
      <main
        aria-hidden={isTopOverlayOpen}
        className={`transition-opacity duration-150 ${
          studioCreated
            ? `mx-auto px-3 sm:px-5 pt-4 sm:pt-6 ${
                activeScreen === 'STUDIO_HUB' ? 'max-w-5xl' : 'max-w-4xl'
              }`
            : 'w-full min-h-[100dvh]'
        } ${isTopOverlayOpen ? 'pointer-events-none select-none opacity-40' : ''}`}
      >
        <AnimatePresence mode="wait">
          {!studioCreated && !hasSelectedMarket ? (
            <motion.div
              key="welcome-market"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              <WelcomeMarketScreen
                initialLanguage={uiLanguage}
                initialMarket={worldMarket}
                onComplete={selectLanguageAndMarket}
                onOpenInfo={handleOpenInfo}
              />
            </motion.div>
          ) : !studioCreated ? (
            <motion.div
              key="stage1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              <Stage1StudioCreation onOpenInfo={handleOpenInfo} />
            </motion.div>
          ) : (
            <motion.div
              key={activeScreen}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {activeScreen === 'STUDIO_HUB' && (
                <StudioHubView
                  onOpenSettings={handleOpenSettings}
                  onOpenInfo={handleOpenInfo}
                />
              )}
              {activeScreen === 'PROJECT_SETUP' && <Stage2ProjectSetup />}
              {activeScreen === 'CREW_CAST_CARDS' && <Stage3CrewCastCards />}
              {activeScreen === 'PRODUCTION_CRISES' && <Stage4ProductionCrises />}
              {activeScreen === 'RELEASE_SIMULATION' && <Stage5ReleaseSimulation />}
              {activeScreen === 'FESTIVALS_AWARDS' && <Stage6FestivalsAwards />}
              {activeScreen === 'LEADERBOARD_SETTINGS' && <LeaderboardAndSettingsView />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* First-Time Studio Presentation Choice & Interactive Spotlight Tour */}
      <StudioOnboardingTour />

      {/* The Star Forge (غرفة صناعة النجوم) */}
      <StarForgeModal />

      {/* Global Popups & Smartphone PR War Room */}
      <WorldPopupsOverlay />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NeelyoInfoModal
        isOpen={infoModalState.open}
        activeTab={infoModalState.tab}
        onTabChange={(tab) => setInfoModalState((prev) => ({ ...prev, tab }))}
        onClose={() => setInfoModalState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
