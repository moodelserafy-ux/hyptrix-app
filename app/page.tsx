'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  useGameStore,
  formatGameDate,
  getLiveActorsWithEvolution,
} from '@/lib/store';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { formatMoney } from '@/lib/game-engine';
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
import {
  DirectorChairIcon,
  FilmReelSettingsIcon,
} from '@/components/CustomCinemaIcons';
import { Coins, Calendar, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const DAY_DURATION_SECONDS = 18;

export default function HomePage() {
  const {
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
    draft,
    groqApiKeyClient,
    preferredGroqModel,
  } = useGameStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DAY_DURATION_SECONDS);
  const [isPageActive, setIsPageActive] = useState(true);
  const isPageActiveRef = useRef(true);
  const secondsRef = useRef(DAY_DURATION_SECONDS);
  const aiTickBusyRef = useRef(false);
  const lastAiHandledDayRef = useRef(0);

  const isTopOverlayOpen =
    settingsOpen ||
    isPrWarRoomOpen ||
    isStarForgeOpen ||
    breakingNewsQueue.length > 0 ||
    festivalModalQueue.length > 0;
  const isAnyModalOpen = isTopOverlayOpen || isChildModalOpen;

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
    () => getResolvedDatabase(customDbPatch),
    [customDbPatch]
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

      if (isAnyModalOpen || isHiddenOrBlurred) {
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
  }, [studioCreated, isAnyModalOpen, advanceGameDay]);

  // Background AI World Evolution
  useEffect(() => {
    if (
      !studioCreated ||
      !isPageActive ||
      isAnyModalOpen ||
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
    isPageActive,
    isAnyModalOpen,
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

  return (
    <div
      className="relative min-h-screen w-full bg-[#F9F6F0] text-[#1A2530] pb-10"
      dir="rtl"
    >
      {/* Global Clapperboard Transitions, Flying Cash Deltas & Crisis Red Alert */}
      <GameFeelEffects />

      {/* Minimal Cinema Clapperboard Strip ONLY when inside sub-stages (No traditional Navbar on Emperor's Desk) */}
      {isStepScreen && (
        <div
          className={`sticky top-0 z-40 bg-[#1A2530] text-[#F9F6F0] border-b-4 border-[#D4AF37] px-3 sm:px-6 py-2.5 shadow-lg ${
            isAnyModalOpen ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <div className="mx-auto max-w-5xl flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setActiveScreen('STUDIO_HUB')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#D91624] hover:brightness-110 text-white font-display text-sm border border-[#D4AF37] shadow cursor-pointer transition"
            >
              <DirectorChairIcon className="w-4 h-4 text-[#D4AF37]" />
              <span>العودة لمكتب الإمبراطور</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F9F6F0]/10 border border-[#D4AF37]/40">
                <Coins className="w-4 h-4 text-[#D4AF37]" />
                <span
                  dir="ltr"
                  className="font-typewriter text-xs sm:text-sm font-black text-[#F9F6F0]"
                >
                  {formatMoney(cash)}
                </span>
                <span className="text-[11px] font-bold text-[#D4AF37]">ج.م</span>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F9F6F0]/10 border border-[#D4AF37]/30 text-xs font-bold">
                <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{formatGameDate(gameDay, currentYear)}</span>
                <span
                  dir="ltr"
                  className="font-typewriter text-[11px] text-[#D4AF37] flex items-center gap-0.5"
                >
                  <Clock className="w-3 h-3" />
                  {secondsLeft}s
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="p-1.5 rounded-lg bg-[#F9F6F0]/10 hover:bg-[#F9F6F0]/20 text-[#D4AF37] border border-[#D4AF37]/40 cursor-pointer"
                title="إعدادات الاستوديو"
              >
                <FilmReelSettingsIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main
        aria-hidden={isTopOverlayOpen}
        className={`mx-auto px-3 sm:px-6 pt-4 transition-opacity ${
          activeScreen === 'STUDIO_HUB' ? 'max-w-6xl' : 'max-w-4xl'
        } ${isTopOverlayOpen ? 'pointer-events-none select-none opacity-40' : ''}`}
      >
        <AnimatePresence mode="wait">
          {!studioCreated ? (
            <motion.div
              key="stage1"
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -12 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            >
              <Stage1StudioCreation />
            </motion.div>
          ) : (
            <motion.div
              key={activeScreen}
              initial={{ opacity: 0, scale: 0.985, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.985, y: -10 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              {activeScreen === 'STUDIO_HUB' && (
                <StudioHubView
                  onOpenSettings={() => setSettingsOpen(true)}
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

      {/* The Star Forge (غرفة صناعة النجوم / كاستينج الـ VIP) */}
      <StarForgeModal />

      {/* Global Popups & Smartphone PR War Room */}
      <WorldPopupsOverlay />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
