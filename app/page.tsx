'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  useGameStore,
  formatGameDate,
  getLiveActorsWithEvolution,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { formatMoney } from '@/lib/game-engine';
import { getCurrencyLabel } from '@/lib/market-profiles';
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
import StarForgeModal from '@/components/StarForgeModal';
import { StudioOnboardingTour } from '@/components/StudioOnboardingTour';
import { TelegramMiniAppBridge } from '@/components/TelegramMiniAppBridge';
import { NeelyoInfoModal, type NeelyoInfoTab } from '@/components/NeelyoInfoModal';
import {
  DirectorChairIcon,
  FilmReelSettingsIcon,
} from '@/components/CustomCinemaIcons';
import { Coins, Calendar, Clock, BookOpen } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';

const DAY_DURATION_SECONDS = 18;

export default function HomePage() {
  const {
    uiLanguage,
    worldMarket,
    hasSelectedMarket,
    selectLanguageAndMarket,
    studioCreated,
    studioName,
    ceoName,
    cash,
    marketValue,
    currentYear,
    gameDay,
    activeScreen,
    setActiveScreen,
    advanceGameDay,
    addAiDiscoveredActor,
    addAiEmergingStudio,
    addAiRivalReleases,
    pushAiContextualNewsEvent,
    customDbPatch,
    aiGeneratedActors,
    actorDynamicState,
    emergingCompetitors,
    aiMemoryLog,
    breakingNewsQueue,
    festivalModalQueue,
    isChildModalOpen,
    isPrWarRoomOpen,
    isStarForgeOpen,
    isBankruptLiquidated,
    onboardingTourStatus,
    draft,
    groqApiKeyClient,
    preferredGroqModel,
  } = useGameStore();
  const currencyLabel = getCurrencyLabel(worldMarket);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoModalState, setInfoModalState] = useState<{
    open: boolean;
    tab: NeelyoInfoTab;
  }>({ open: false, tab: 'about' });
  const [secondsLeft, setSecondsLeft] = useState(DAY_DURATION_SECONDS);
  const [isPageActive, setIsPageActive] = useState(true);
  const [isClockDetached, setIsClockDetached] = useState(false);

  const handleOpenInfo = (tab: NeelyoInfoTab = 'about') => {
    setInfoModalState({ open: true, tab });
  };
  const isPageActiveRef = useRef(true);
  const secondsRef = useRef(DAY_DURATION_SECONDS);
  const aiTickBusyRef = useRef(false);
  const lastAiHandledDayRef = useRef(0);

  // Track vertical scroll so the time capsule merges seamlessly inside the Navbar at the top,
  // and detaches smoothly into a floating HUD pill the moment the Navbar begins scrolling away.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => {
      setIsClockDetached(window.scrollY > 44);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keep warm creamy viewport background unified across onboarding and Emperor's Desk
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.backgroundColor = '#F9F6F0';
    document.documentElement.style.backgroundColor = '#F9F6F0';
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

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
    breakingNewsQueue.length > 0 ||
    festivalModalQueue.length > 0;
  const isAnyModalOpen = isTopOverlayOpen || isChildModalOpen;
  const isClockPausedByOverlay = isAnyModalOpen || isOnboardingSpotlightActive;

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

  // Automatically pause game clock when the player leaves the game/tab/window, and auto-resume upon return
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const updateActiveState = () => {
      const visible = document.visibilityState === 'visible' && !document.hidden;
      const focused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
      const active = visible && focused;
      isPageActiveRef.current = active;
      setIsPageActive(active);
    };

    const handleVisibilityChange = () => updateActiveState();
    const handleFocus = () => {
      isPageActiveRef.current = true;
      setIsPageActive(true);
    };
    const handleBlur = () => {
      isPageActiveRef.current = false;
      setIsPageActive(false);
    };

    updateActiveState();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pageshow', handleFocus);
    window.addEventListener('pagehide', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pageshow', handleFocus);
      window.removeEventListener('pagehide', handleBlur);
    };
  }, []);

  // Automatically scroll to the top whenever the user navigates between screens
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeScreen]);

  const db = useMemo(
    () => getResolvedDatabase(customDbPatch, worldMarket),
    [customDbPatch, worldMarket]
  );

  const liveActors = useMemo(
    () =>
      getLiveActorsWithEvolution({
        baseActors: db.actors,
        aiGeneratedActors,
        actorDynamicState,
        currentYear,
        gameDay,
      }),
    [db.actors, aiGeneratedActors, actorDynamicState, currentYear, gameDay]
  );

  const allCompetitors = useMemo(
    () => [...db.competitor_studios, ...emergingCompetitors],
    [db.competitor_studios, emergingCompetitors]
  );

  // Accurate 1-day-at-a-time real-time progression
  useEffect(() => {
    if (!studioCreated) return;
    const timer = setInterval(() => {
      const isHiddenOrBlurred =
        !isPageActiveRef.current ||
        (typeof document !== 'undefined' && document.hidden);

      if (isClockPausedByOverlay || isHiddenOrBlurred) {
        return;
      }

      if (secondsRef.current <= 1) {
        secondsRef.current = DAY_DURATION_SECONDS;
        setSecondsLeft(DAY_DURATION_SECONDS);
        advanceGameDay(1);
      } else {
        secondsRef.current -= 1;
        setSecondsLeft(secondsRef.current);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [studioCreated, isClockPausedByOverlay, advanceGameDay]);

  // Background AI World Evolution
  useEffect(() => {
    if (
      !studioCreated ||
      !isPageActive ||
      isClockPausedByOverlay ||
      aiTickBusyRef.current ||
      lastAiHandledDayRef.current === gameDay
    ) {
      return;
    }

    if (gameDay > 6 && gameDay % 16 === 0) {
      lastAiHandledDayRef.current = gameDay;
      aiTickBusyRef.current = true;
      const availableRivalStars = liveActors
        .filter(
          (a) =>
            !draft.leadActorIds.includes(a.id) &&
            a.id !== draft.antagonistId &&
            (a.tier === 'S' || a.tier === 'A')
        )
        .slice(0, 14)
        .map((a) => a.name);

      fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate_ai_rival_releases',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            worldMarket,
            uiLanguage,
            studioName,
            ceoName,
            gameDay,
            currentYear,
            format: gameDay % 32 === 0 ? 'series' : 'film',
            competitorStudios: allCompetitors.map((c) => c.name),
            availableStars: availableRivalStars,
            aiMemoryLog,
          },
        }),
      })
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
      fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'discover_ai_rising_star',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            worldMarket,
            uiLanguage,
            existingNames: liveActors.map((a) => a.name),
            studioName,
            ceoName,
            gameDay,
            currentYear,
            aiMemoryLog,
          },
        }),
      })
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
      fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'discover_ai_emerging_studio',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            worldMarket,
            uiLanguage,
            studioName,
            ceoName,
            currentYear,
            gameDay,
            existingStudios: allCompetitors.map((c) => c.name),
            aiMemoryLog,
          },
        }),
      })
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
      fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate_ai_memory_news',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            worldMarket,
            uiLanguage,
            studioName,
            ceoName,
            gameDay,
            currentYear,
            marketValue,
            cash,
            aiMemoryLog,
          },
        }),
      })
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
    isPageActive,
    isClockPausedByOverlay,
    activeScreen,
    liveActors,
    allCompetitors,
    draft.leadActorIds,
    draft.antagonistId,
    studioName,
    ceoName,
    currentYear,
    marketValue,
    cash,
    aiMemoryLog,
    groqApiKeyClient,
    preferredGroqModel,
    addAiDiscoveredActor,
    addAiEmergingStudio,
    addAiRivalReleases,
    pushAiContextualNewsEvent,
  ]);

  const isStepScreen = studioCreated && activeScreen !== 'STUDIO_HUB';
  const dayProgressPercent = Math.min(
    100,
    Math.max(
      4,
      Math.round(
        ((DAY_DURATION_SECONDS - secondsLeft) / DAY_DURATION_SECONDS) * 100
      )
    )
  );

  const renderTimeClockCapsule = (detached: boolean) => (
    <motion.div
      layoutId="cinema-live-clock-dock"
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 26,
        mass: 0.85,
      }}
      className={`relative overflow-hidden transition-shadow duration-300 ${
        detached
          ? 'rounded-2xl bg-[#1A2530]/95 text-[#F9F6F0] border-2 border-[#D4AF37] px-3 py-1.5 shadow-[0_14px_34px_rgba(26,37,48,0.45),0_0_20px_rgba(212,175,55,0.28)] backdrop-blur-md'
          : 'rounded-xl bg-[#F9F6F0]/10 text-[#F9F6F0] border border-[#D4AF37]/50 px-2.5 py-1'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex shrink-0 items-center justify-center rounded-lg bg-[#D91624] text-[#D4AF37] border border-[#D4AF37]/60 transition-all ${
            detached ? 'h-6 w-6' : 'h-5 w-5'
          }`}
        >
          <Calendar className={detached ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
        </span>
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] sm:text-xs font-extrabold tracking-tight text-[#F9F6F0] whitespace-nowrap">
              {formatGameDate(gameDay, currentYear)}
            </span>
            <span
              dir="ltr"
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-typewriter text-[10px] font-black tabular-nums ${
                isClockPausedByOverlay || !isPageActive
                  ? 'bg-[#D4AF37]/25 text-[#FFF3B0] border border-[#D4AF37]/40'
                  : 'bg-[#15803D] text-white'
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              {isClockPausedByOverlay || !isPageActive ? 'مؤقت' : `${secondsLeft}s`}
            </span>
          </div>
          {/* Animated Daily Progress Bar */}
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-l from-[#D4AF37] to-[#D91624] transition-all duration-500"
              style={{ width: `${dayProgressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <LayoutGroup>
      <div
        className={`relative min-h-[100dvh] w-full bg-[#F9F6F0] text-[#1A2530] ${
          studioCreated ? 'pb-14' : 'pb-0'
        }`}
        dir="rtl"
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

        {/* UNIFIED TOP STUDIO NAVBAR (Normal flow — scrolls out smoothly so the clock detaches cleanly!) */}
        {studioCreated && (
          <header
            className={`relative z-30 bg-[#1A2530] text-[#F9F6F0] border-b-4 border-[#D4AF37] px-3 sm:px-6 py-2.5 shadow-lg transition-opacity ${
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
                  <span>مكتب الإمبراطور</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D91624] border border-[#D4AF37] text-[#D4AF37] shadow">
                    <DirectorChairIcon className="w-4 h-4" />
                  </span>
                  <span className="font-display text-sm sm:text-base text-[#F9F6F0] truncate max-w-[140px] sm:max-w-[220px]">
                    {studioName}
                  </span>
                </div>
              )}

              {/* Zone 2: Docked Time & Calendar Capsule (merges seamlessly inside Navbar at top) */}
              <div className="flex items-center justify-center min-h-[36px]">
                {!isClockDetached ? (
                  renderTimeClockCapsule(false)
                ) : (
                  <div className="h-[34px] w-[140px] sm:w-[165px]" aria-hidden="true" />
                )}
              </div>

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
                  title="عن Neelyo والخصوصية والتواصل"
                  aria-label="عن Neelyo والخصوصية والتواصل"
                >
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="p-1.5 rounded-xl bg-[#D4AF37] hover:brightness-110 text-[#1A2530] border border-[#F9F6F0]/70 shadow cursor-pointer"
                  title="إعدادات الاستوديو"
                >
                  <FilmReelSettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </header>
        )}

        {/* DETACHED FLOATING TIME & CALENDAR CAPSULE (Detaches magically when scrolling past Navbar!) */}
        {studioCreated && isClockDetached && (
          <div
            className={`fixed top-3 left-3 sm:top-4 sm:left-4 z-40 transition-opacity duration-300 ${
              isAnyModalOpen
                ? 'pointer-events-none opacity-40'
                : 'opacity-100'
            }`}
          >
            {renderTimeClockCapsule(true)}
          </div>
        )}

        {/* Main Content Container */}
        <main
          aria-hidden={isTopOverlayOpen}
          className={`transition-opacity ${
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
              transition={{ duration: 0.2 }}
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
              transition={{ duration: 0.2 }}
            >
              <Stage1StudioCreation onOpenInfo={handleOpenInfo} />
            </motion.div>
          ) : (
            <motion.div
              key={activeScreen}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
            >
              {activeScreen === 'STUDIO_HUB' && (
                <StudioHubView
                  onOpenSettings={() => setSettingsOpen(true)}
                  onOpenInfo={handleOpenInfo}
                  secondsLeft={secondsLeft}
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
    </LayoutGroup>
  );
}
