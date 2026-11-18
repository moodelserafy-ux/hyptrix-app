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
import {
  Building2,
  Coins,
  Calendar,
  Settings,
  Clock,
} from 'lucide-react';
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
    draft,
    groqApiKeyClient,
    preferredGroqModel,
  } = useGameStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DAY_DURATION_SECONDS);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPageActive, setIsPageActive] = useState(true);
  const isPageActiveRef = useRef(true);
  const secondsRef = useRef(DAY_DURATION_SECONDS);
  const aiTickBusyRef = useRef(false);
  const lastAiHandledDayRef = useRef(0);

  const isTopOverlayOpen =
    settingsOpen ||
    isPrWarRoomOpen ||
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

  // Track vertical scroll position to trigger smooth Dynamic Island Navbar animation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => {
      const scrolledNow = window.scrollY > 18;
      setIsScrolled((prev) => (prev !== scrolledNow ? scrolledNow : prev));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
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
  // Automatically pauses while ANY modal is open OR when the user leaves the game/tab/window, and resumes automatically on return.
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

  // Background AI World Evolution (Pauses automatically when a modal is open or when user leaves the game)
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
  const dayProgressPercent = Math.min(
    100,
    Math.max(
      4,
      Math.round(
        ((DAY_DURATION_SECONDS - secondsLeft) / DAY_DURATION_SECONDS) * 100
      )
    )
  );

  return (
    <div
      className={`relative min-h-screen w-full text-slate-900 ${
        studioCreated ? 'pt-18 pb-8' : 'pb-6'
      }`}
      dir="rtl"
    >
      {/* Scroll-Reactive Dynamic Cinema Island Navbar — Only 3 Clean Items, Zero Overflow */}
      {studioCreated && (
        <motion.header
          initial={{ y: -24, opacity: 0 }}
          animate={{
            y: isScrolled ? 2 : 0,
            opacity: isAnyModalOpen ? 0.35 : 1,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`fixed top-2 right-0 left-0 z-40 px-2.5 sm:px-4 ${
            isAnyModalOpen ? 'pointer-events-none select-none' : 'pointer-events-none'
          }`}
        >
          <motion.div
            layout
            animate={{
              scale: isScrolled ? 0.98 : 1,
              y: isScrolled ? -1 : 0,
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className={`relative mx-auto flex items-center justify-between gap-2 transition-all duration-300 ${
              isAnyModalOpen ? 'pointer-events-none select-none' : 'pointer-events-auto'
            } ${
              isScrolled
                ? 'max-w-[490px] rounded-full border-2 border-violet-300/95 bg-white/95 px-3 py-1.5 shadow-[0_20px_48px_-10px_rgba(79,70,229,0.34),0_4px_14px_-2px_rgba(14,165,233,0.18)] backdrop-blur-2xl'
                : 'max-w-xl rounded-2xl border-2 border-white/90 bg-white/90 px-3 py-2 shadow-[0_14px_34px_-10px_rgba(79,70,229,0.20)] backdrop-blur-xl sm:px-4'
            }`}
          >
            {/* Animated Top Specular Shimmer Line */}
            <div className="pointer-events-none absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-500/75 to-transparent" />

            {/* ITEM 1 (Right): Return to Hub Button (if in step screen) + Cash Capsule */}
            <div className="flex shrink-0 items-center gap-1.5">
              {isStepScreen && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setActiveScreen('STUDIO_HUB')}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-l from-violet-600 to-indigo-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                  <span className="whitespace-nowrap">المقر</span>
                </motion.button>
              )}

              {/* Crystal-Clear Cash Capsule — Never Clips or Overlaps at Any Amount */}
              <motion.div
                key={`cash_${cash}`}
                initial={{ scale: 0.94 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 480, damping: 22 }}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/90 bg-gradient-to-l from-emerald-50/95 via-white to-emerald-50/90 px-2.5 py-1 shadow-2xs"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <Coins className="h-3.5 w-3.5 shrink-0" />
                </span>
                <div className="flex shrink-0 items-baseline gap-1 whitespace-nowrap">
                  <span
                    dir="ltr"
                    className="font-mono text-xs font-black tracking-tight text-emerald-950 tabular-nums sm:text-[13px]"
                  >
                    {formatMoney(cash)}
                  </span>
                  <span className="text-[10px] font-black text-emerald-700">
                    ج.م
                  </span>
                </div>
              </motion.div>
            </div>

            {/* ITEM 2 (Center/Left): Live Synchronized Cinema Calendar & Day Countdown */}
            <motion.div
              layout
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-200/90 bg-gradient-to-l from-indigo-50/95 via-white to-violet-50/90 px-2.5 py-1 text-[11px] font-black text-indigo-950 shadow-2xs"
            >
              <Calendar className="h-3.5 w-3.5 shrink-0 text-violet-600" />
              <span className="whitespace-nowrap">
                {formatGameDate(gameDay, currentYear)}
              </span>
              <span
                dir="ltr"
                className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-black text-white shadow-2xs tabular-nums ${
                  !isPageActive || isAnyModalOpen
                    ? 'bg-slate-500'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600'
                }`}
              >
                <Clock className="h-2.5 w-2.5" />
                <span>{secondsLeft}s</span>
              </span>
            </motion.div>

            {/* ITEM 3 (Left, only on STUDIO_HUB): Single Compact Settings Button */}
            {!isStepScreen && (
              <motion.button
                whileHover={{ scale: 1.07, rotate: 20 }}
                whileTap={{ scale: 0.93 }}
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="الإعدادات"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-200/85 bg-white/95 text-slate-700 shadow-2xs transition hover:bg-indigo-50"
              >
                <Settings className="h-3.5 w-3.5" />
              </motion.button>
            )}

            {/* Animated Bottom Day-Cycle Progress Track inside the Island */}
            <div className="pointer-events-none absolute right-5 bottom-0 left-5 h-[2.5px] overflow-hidden rounded-full bg-indigo-100/70">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-violet-600 via-indigo-500 to-amber-500"
                initial={false}
                animate={{ width: `${dayProgressPercent}%` }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        </motion.header>
      )}

      {/* Main Content Container (Completely Frozen & Unclickable when Top Overlay Modal is Open) */}
      <main
        aria-hidden={isTopOverlayOpen}
        className={`mx-auto max-w-xl px-3 transition-opacity ${
          isTopOverlayOpen ? 'pointer-events-none select-none opacity-40' : ''
        }`}
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
                <StudioHubView onOpenSettings={() => setSettingsOpen(true)} />
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

      {/* Global Popups & Settings */}
      <WorldPopupsOverlay />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
