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
  TrendingUp,
  Trophy,
  Calendar,
  Settings,
  BarChart3,
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
    draft,
    groqApiKeyClient,
    preferredGroqModel,
  } = useGameStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DAY_DURATION_SECONDS);
  const secondsRef = useRef(DAY_DURATION_SECONDS);
  const aiTickBusyRef = useRef(false);
  const lastAiHandledDayRef = useRef(0);

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

  const pendingOffersCount = useMemo(
    () =>
      Object.values(draft.talentOffers || {}).filter((o) => o.status === 'pending')
        .length,
    [draft.talentOffers]
  );

  // Accurate 1-day-at-a-time real-time progression (never called inside a React setState updater!)
  // Automatically pauses while any modal (Settings, Breaking News, Festival Gala, or Contract Negotiation) is open.
  useEffect(() => {
    if (!studioCreated) return;
    const timer = setInterval(() => {
      const isModalBlocking =
        settingsOpen ||
        breakingNewsQueue.length > 0 ||
        festivalModalQueue.length > 0 ||
        (typeof document !== 'undefined' &&
          document.body.style.overflow === 'hidden');

      if (isModalBlocking) {
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
  }, [
    studioCreated,
    settingsOpen,
    breakingNewsQueue.length,
    festivalModalQueue.length,
    advanceGameDay,
  ]);

  // Background AI World Evolution (AI creates rival films/series, emerging studios, rising stars, and industry news)
  useEffect(() => {
    if (
      !studioCreated ||
      aiTickBusyRef.current ||
      breakingNewsQueue.length > 0 ||
      festivalModalQueue.length > 0 ||
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
    activeScreen,
    breakingNewsQueue.length,
    festivalModalQueue.length,
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
        studioCreated ? 'pt-16 pb-8' : 'pb-6'
      }`}
      dir="rtl"
    >
      {/* Dynamic Animated Glassmorphic Island Navbar (Zero Overflow, Live Day Shimmer, No Studio Name/Logo) */}
      {studioCreated && (
        <motion.header
          layout
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="pointer-events-none fixed top-2.5 right-0 left-0 z-40 px-2.5 sm:px-4"
        >
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass-nav pointer-events-auto relative mx-auto flex max-w-xl items-center justify-between gap-1.5 overflow-hidden rounded-2xl px-2.5 py-2 sm:gap-2.5 sm:px-3.5 sm:py-2"
          >
            {/* Subtle Animated Top Ambient Highlight */}
            <div className="pointer-events-none absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

            {isStepScreen ? (
              <>
                {/* Return to Hub Button */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => setActiveScreen('STUDIO_HUB')}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-l from-violet-600 to-indigo-600 px-2.5 py-1.5 text-[11px] font-black text-white shadow-sm"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                  <span className="whitespace-nowrap">المقر</span>
                </motion.button>

                {/* Center Telemetry Capsules (Contained & Non-Overflowing) */}
                <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden">
                  <div className="flex shrink-0 items-center gap-1 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-2 py-1">
                    <Coins className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="font-mono text-[11px] font-black whitespace-nowrap text-emerald-950 tabular-nums">
                      {formatMoney(cash)}
                    </span>
                  </div>

                  <div className="flex min-w-0 shrink-0 items-center gap-1 rounded-xl border border-indigo-200/80 bg-indigo-50/85 px-2 py-1 text-[11px] font-black text-indigo-950">
                    <Calendar className="h-3 w-3 shrink-0 text-violet-600" />
                    <span className="whitespace-nowrap">
                      {formatGameDate(gameDay, currentYear)}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-violet-600 px-1.5 py-0.5 font-mono text-[9px] font-black text-white tabular-nums">
                      <Clock className="h-2.5 w-2.5" />
                      {secondsLeft}ث
                    </span>
                  </div>

                  {pendingOffersCount > 0 && (
                    <div
                      title="عروض قيد الدراسة"
                      className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-xl border border-amber-300/90 bg-amber-100/90 px-2 py-1 text-[10px] font-black text-amber-950"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                      <span className="whitespace-nowrap">
                        {pendingOffersCount} عروض
                      </span>
                    </div>
                  )}
                </div>

                {/* Settings Action Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  title="الإعدادات"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-200/80 bg-white/90 text-slate-700 shadow-2xs transition hover:bg-indigo-50"
                >
                  <Settings className="h-3.5 w-3.5" />
                </motion.button>
              </>
            ) : (
              <>
                {/* Right Side: Financial Capsules */}
                <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                  <div className="flex shrink-0 items-center gap-1 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-2 py-1">
                    <Coins className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="hidden text-[10px] font-bold text-emerald-800 sm:inline">
                      السيولة:
                    </span>
                    <span className="font-mono text-[11px] font-black whitespace-nowrap text-emerald-950 tabular-nums sm:text-xs">
                      {formatMoney(cash)}
                    </span>
                  </div>

                  <div className="hidden xs:flex sm:flex shrink-0 items-center gap-1 rounded-xl border border-violet-200/90 bg-violet-50/90 px-2 py-1">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                    <span className="hidden text-[10px] font-bold text-violet-800 md:inline">
                      القيمة:
                    </span>
                    <span className="font-mono text-[11px] font-black whitespace-nowrap text-violet-950 tabular-nums sm:text-xs">
                      {formatMoney(marketValue)}
                    </span>
                  </div>
                </div>

                {/* Center: Synchronized Live Day & Countdown Capsule */}
                <div className="flex min-w-0 shrink-0 items-center gap-1 rounded-xl border border-indigo-200/85 bg-indigo-50/90 px-2 py-1 text-[11px] font-black text-indigo-950">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="whitespace-nowrap">
                    {formatGameDate(gameDay, currentYear)}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-1.5 py-0.5 font-mono text-[9px] font-black text-white tabular-nums">
                    {secondsLeft}ث
                  </span>
                </div>

                {/* Left Side: Compact Animated Icon Buttons */}
                <div className="flex shrink-0 items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.06, y: -1 }}
                    whileTap={{ scale: 0.94 }}
                    type="button"
                    onClick={() => setActiveScreen('FESTIVALS_AWARDS')}
                    title="سجل الجوائز والمهرجانات"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-200/90 bg-amber-50/90 text-amber-600 shadow-2xs transition hover:bg-amber-100"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.06, y: -1 }}
                    whileTap={{ scale: 0.94 }}
                    type="button"
                    onClick={() => setActiveScreen('LEADERBOARD_SETTINGS')}
                    title="ترتيب الشركات المنافسة"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-200/80 bg-white/90 text-indigo-600 shadow-2xs transition hover:bg-indigo-50"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.06, y: -1 }}
                    whileTap={{ scale: 0.94 }}
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    title="الإعدادات"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-200/80 bg-white/90 text-slate-700 shadow-2xs transition hover:bg-indigo-50"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              </>
            )}

            {/* Animated Bottom Day-Cycle Progress Bar inside the Navbar Box */}
            <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-[3px] overflow-hidden bg-indigo-100/70">
              <motion.div
                className="h-full bg-gradient-to-l from-violet-600 via-indigo-500 to-amber-500"
                initial={false}
                animate={{ width: `${dayProgressPercent}%` }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        </motion.header>
      )}

      {/* Main Content Container */}
      <main className="mx-auto max-w-xl px-3">
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
