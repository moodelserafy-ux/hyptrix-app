'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  ActiveStageScreen,
  formatGameDate,
  getDaysRemainingUntilAnnualAwards,
} from '@/lib/store';
import {
  formatMoney,
  DEFAULT_FACILITIES_LEVELS,
  StudioFacilityId,
} from '@/lib/game-engine';
import { StudioLogoSvg } from '@/components/StudioLogoSvg';
import { StudioCampus3D } from '@/components/StudioCampus3D';
import { Stage1StudioCreation } from '@/components/Stage1StudioCreation';
import { StudioHubView } from '@/components/StudioHubView';
import { Stage2ProjectSetup } from '@/components/Stage2ProjectSetup';
import { Stage3CrewCastCards } from '@/components/Stage3CrewCastCards';
import { Stage4ProductionCrises } from '@/components/Stage4ProductionCrises';
import { Stage5ReleaseSimulation } from '@/components/Stage5ReleaseSimulation';
import { Stage6FestivalsAwards } from '@/components/Stage6FestivalsAwards';
import { LeaderboardAndSettingsView } from '@/components/LeaderboardAndSettingsView';
import { VipSweatPassModal } from '@/components/MonetizationModals';
import { SettingsModal } from '@/components/SettingsModal';
import { WorldPopupsOverlay } from '@/components/WorldPopupsOverlay';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import {
  Crown,
  Home,
  Lock,
  Check,
  Settings,
  Trophy,
  Calendar,
  Wallet,
  TrendingUp,
  Smartphone,
  Maximize2,
  Play,
} from 'lucide-react';

const QUEST_ORDER: { id: ActiveStageScreen; label: string }[] = [
  { id: 'PROJECT_SETUP', label: 'السيناريو' },
  { id: 'CREW_CAST_CARDS', label: 'الطاقم' },
  { id: 'PRODUCTION_CRISES', label: 'التصوير' },
  { id: 'RELEASE_SIMULATION', label: 'العرض' },
];

const SECONDS_PER_GAME_DAY = 15;

export function HyptrixClientApp() {
  const {
    studioCreated,
    studioName,
    ceoName,
    logo,
    cash,
    marketValue,
    reputation,
    currentYear,
    gameDay,
    facilitiesLevels = DEFAULT_FACILITIES_LEVELS,
    draft,
    vipPassExpiresAt,
    activeScreen,
    aiMemoryLog,
    aiGeneratedActors,
    emergingCompetitors,
    breakingNewsQueue,
    festivalModalQueue,
    groqApiKeyClient,
    preferredGroqModel,
    setActiveScreen,
    advanceGameDay,
    addAiDiscoveredActor,
    addAiEmergingStudio,
    pushAiContextualNewsEvent,
    quickStartDemoStudio,
  } = useGameStore();

  const [mounted, setMounted] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [secondsIntoDay, setSecondsIntoDay] = useState(0);
  const [isPageActive, setIsPageActive] = useState(true);

  // Studio City shared interactive camera state
  const [selectedFacility, setSelectedFacility] = useState<StudioFacilityId | null>(null);
  const [cameraMode, setCameraMode] = useState<'overview' | 'focus'>('overview');

  // Mandatory Widescreen Landscape Game Orientation
  const [isPortraitViewport, setIsPortraitViewport] = useState(false);
  const [showRotateIntro, setShowRotateIntro] = useState(false);

  const secondsRef = useRef(0);
  const lastAiWorldEventDayRef = useRef(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autostart') === '1') {
          quickStartDemoStudio();
          document.body.dataset.state = 'playing';
        }
        const checkOrientation = () => {
          const portrait = window.innerHeight > window.innerWidth;
          setIsPortraitViewport(portrait);
          if (!portrait) {
            setShowRotateIntro(false);
          }
        };
        checkOrientation();
        if (window.innerHeight > window.innerWidth && params.get('autostart') !== '1') {
          setShowRotateIntro(true);
        }
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [quickStartDemoStudio]);

  // Track whether the player is actively inside the website
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const updateActiveStatus = () => {
      const visible = document.visibilityState === 'visible' && !document.hidden;
      const focused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
      setIsPageActive(visible && focused);
    };

    updateActiveStatus();
    document.addEventListener('visibilitychange', updateActiveStatus);
    window.addEventListener('focus', updateActiveStatus);
    window.addEventListener('blur', updateActiveStatus);
    window.addEventListener('pageshow', updateActiveStatus);
    window.addEventListener('pagehide', updateActiveStatus);

    return () => {
      document.removeEventListener('visibilitychange', updateActiveStatus);
      window.removeEventListener('focus', updateActiveStatus);
      window.removeEventListener('blur', updateActiveStatus);
      window.removeEventListener('pageshow', updateActiveStatus);
      window.removeEventListener('pagehide', updateActiveStatus);
    };
  }, []);

  // Automatic Real-Time Game Clock (Advances only while player is inside the site)
  useEffect(() => {
    if (!mounted || !studioCreated || !isPageActive) return;

    const interval = setInterval(() => {
      if (document.hidden || (typeof document.hasFocus === 'function' && !document.hasFocus())) {
        return;
      }
      secondsRef.current += 1;
      if (secondsRef.current >= SECONDS_PER_GAME_DAY) {
        secondsRef.current = 0;
        setSecondsIntoDay(0);
        advanceGameDay(1);
      } else {
        setSecondsIntoDay(secondsRef.current);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mounted, studioCreated, isPageActive, advanceGameDay]);

  // Dynamic World Events Generator (triggers every 22 game days when no popup is open)
  useEffect(() => {
    if (!mounted || !studioCreated) return;
    if (breakingNewsQueue.length > 0 || festivalModalQueue.length > 0) return;

    if (gameDay > lastAiWorldEventDayRef.current && gameDay % 22 === 0) {
      lastAiWorldEventDayRef.current = gameDay;
      const cycle = Math.floor(gameDay / 22) % 3;

      if (cycle === 1) {
        fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'discover_ai_rising_star',
            groqKeyOverride: groqApiKeyClient,
            preferredModel: preferredGroqModel,
            payload: {
              gameDay,
              currentYear,
              studioName,
              ceoName,
              existingNames: aiGeneratedActors.map((a) => a.name),
              aiMemoryLog: aiMemoryLog.slice(0, 8),
            },
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data && data.actor && data.actor.name) {
              addAiDiscoveredActor(data.actor, data.headline, data.detail);
            }
          })
          .catch(() => {});
      } else if (cycle === 2) {
        fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'discover_ai_emerging_studio',
            groqKeyOverride: groqApiKeyClient,
            preferredModel: preferredGroqModel,
            payload: {
              gameDay,
              currentYear,
              studioName,
              ceoName,
              existingStudios: emergingCompetitors.map((s) => s.name),
              aiMemoryLog: aiMemoryLog.slice(0, 8),
            },
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data && data.studio && data.studio.name) {
              addAiEmergingStudio(data.studio, data.headline, data.detail);
            }
          })
          .catch(() => {});
      } else {
        fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'generate_ai_memory_news',
            groqKeyOverride: groqApiKeyClient,
            preferredModel: preferredGroqModel,
            payload: {
              gameDay,
              currentYear,
              studioName,
              ceoName,
              cash,
              marketValue,
              reputation,
              aiMemoryLog: aiMemoryLog.slice(0, 12),
            },
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data && typeof data.headline === 'string' && typeof data.detail === 'string') {
              pushAiContextualNewsEvent({
                headline: data.headline,
                detail: data.detail,
                badgeLabel: data.badgeLabel || 'عاجل · الصحافة الفنية',
                category: data.category || 'production_news',
                marketValueDelta: Number(data.marketValueDelta || 0),
                cashDelta: Number(data.cashDelta || 0),
                reputationDelta: Number(data.reputationDelta || 0),
                hypeDelta: Number(data.hypeDelta || 0),
                rivalStudioName: data.rivalStudioName,
                rivalNetWorthDelta: Number(data.rivalNetWorthDelta || 0),
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [
    mounted,
    studioCreated,
    gameDay,
    currentYear,
    studioName,
    ceoName,
    cash,
    marketValue,
    reputation,
    aiMemoryLog,
    aiGeneratedActors,
    emergingCompetitors,
    breakingNewsQueue.length,
    festivalModalQueue.length,
    groqApiKeyClient,
    preferredGroqModel,
    addAiDiscoveredActor,
    addAiEmergingStudio,
    pushAiContextualNewsEvent,
  ]);

  useEffect(() => {
    if (!mounted) return;
    document.body.dataset.state = studioCreated ? 'playing' : 'title';
  }, [mounted, studioCreated, activeScreen]);

  const handleRequestFullscreenLandscape = async () => {
    setShowRotateIntro(false);
    try {
      if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
      const scr = window.screen as Screen & {
        orientation?: { lock?: (mode: string) => Promise<void> };
      };
      if (scr?.orientation?.lock) {
        await scr.orientation.lock('landscape').catch(() => {});
      }
    } catch {
      // Mandatory landscape container already locks orientation visually
    }
  };

  // Safe SSR defaults before client hydration completes
  const isStudioActive = mounted && studioCreated;
  const currentScreen: ActiveStageScreen = isStudioActive ? activeScreen : 'STUDIO_CREATION';
  const isVipActive = Boolean(mounted && vipPassExpiresAt);
  const currentQuestIndex = QUEST_ORDER.findIndex((q) => q.id === currentScreen);
  const isInProductionQuest = isStudioActive && currentQuestIndex !== -1;
  const daysUntilAnnualGala = getDaysRemainingUntilAnnualAwards(gameDay);
  const dayProgressPercent = Math.min(
    100,
    Math.round((secondsIntoDay / SECONDS_PER_GAME_DAY) * 100)
  );

  const isHubScreen = isStudioActive && currentScreen === 'STUDIO_HUB';

  return (
    <div
      dir="rtl"
      className={
        isPortraitViewport
          ? 'fixed top-1/2 left-1/2 z-50 flex h-[100dvw] w-[100dvh] -translate-x-1/2 -translate-y-1/2 rotate-90 flex-col overflow-hidden bg-[#DBEAFE] text-right text-slate-900 select-none'
          : 'fixed inset-0 z-50 flex h-dvh w-dvw flex-col overflow-hidden bg-[#DBEAFE] text-right text-slate-900 select-none'
      }
    >
      {/* PERSISTENT FULL-SCREEN SUNLIT DAYTIME STUDIO CITY BACKGROUND (Always visible underneath UI) */}
      <StudioCampus3D
        studioName={isStudioActive ? studioName : 'HYPTRIX STUDIOS'}
        facilitiesLevels={facilitiesLevels}
        isFilmingActive={Boolean(
          draft.filmingStartDay !== null &&
            draft.filmingDaysElapsed < draft.filmingDurationDays
        )}
        selectedFacility={selectedFacility}
        cameraMode={isHubScreen ? cameraMode : 'overview'}
        onSelectFacility={(facId) => {
          setSelectedFacility(facId);
          setCameraMode('focus');
          if (isStudioActive && currentScreen !== 'STUDIO_HUB') {
            setActiveScreen('STUDIO_HUB');
          }
        }}
        fullScreenBackground={true}
        isRotated90={isPortraitViewport}
      />

      {/* BRIGHT LIGHT-THEMED ANIMATED "ROTATE PHONE TO LANDSCAPE" INTRO OVERLAY */}
      <AnimatePresence>
        {showRotateIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-sky-950/35 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 14 }}
              className="mx-auto flex max-w-xl items-center gap-5 rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-300 bg-white/95 p-5 text-right text-slate-900 shadow-2xl"
            >
              {/* Animated Rotating Smartphone Graphic */}
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 via-sky-50 to-amber-50">
                <motion.div
                  animate={{ rotate: [0, -90, -90, 0] }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    times: [0, 0.35, 0.75, 1],
                  }}
                  className="flex h-14 w-9 flex-col items-center justify-between rounded-xl border-2 border-violet-600 bg-white p-1 shadow-md"
                >
                  <div className="h-1 w-3 rounded-full bg-indigo-200" />
                  <Smartphone className="h-4 w-4 text-violet-600" />
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                </motion.div>
              </div>

              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-[11px] font-black text-amber-800">
                  نظام اللعب بالعرض مفعّل تلقائياً
                </span>
                <h2 className="font-display mt-1 text-lg font-black text-slate-900 sm:text-xl">
                  اقلب الموبايل بالعرض للاستمتاع بالمدينة الإنتاجية!
                </h2>
                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-600">
                  تعمل اللعبة بالعرض الكامل لتمنحك تحكماً مريحاً في مباني الاستوديو وشريط المهام والأيام.
                </p>

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRequestFullscreenLandscape}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border-b-4 border-violet-900 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-5 py-2.5 text-xs font-black text-white shadow-md transition active:border-b-0 active:translate-y-0.5"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>بدء اللعب بملء الشاشة بالعرض</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRotateIntro(false)}
                    className="rounded-2xl border-2 border-indigo-100 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-indigo-50"
                  >
                    متابعة الآن
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP WIDESCREEN LANDSCAPE GAME HUD NAVBAR (Bright Light Theme) */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="relative z-30 shrink-0 px-2.5 pt-2 sm:px-4"
      >
        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border-2 border-indigo-100 bg-white/95 text-slate-900 shadow-[0_8px_24px_rgba(99,102,241,0.12)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4">
            {/* Zone 1: Studio Brand & Back to Studio City Button */}
            <div className="flex min-w-0 items-center gap-2">
              {isStudioActive && currentScreen !== 'STUDIO_HUB' && (
                <button
                  type="button"
                  onClick={() => setActiveScreen('STUDIO_HUB')}
                  className="flex h-8 items-center gap-1.5 rounded-xl border-2 border-indigo-100 bg-indigo-50 px-2.5 text-xs font-black text-indigo-800 transition hover:bg-indigo-100"
                  title="العودة للمدينة الإنتاجية"
                  aria-label="العودة للمقر الرئيسي"
                >
                  <Home className="h-3.5 w-3.5 text-violet-600" />
                  <span className="hidden sm:inline">المدينة</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setActiveScreen(isStudioActive ? 'STUDIO_HUB' : 'STUDIO_CREATION')
                }
                className="flex min-w-0 items-center gap-2 text-right"
              >
                <StudioLogoSvg config={logo} size={28} className="shrink-0" />
                <div className="min-w-0 truncate">
                  <span className="font-display text-xs font-black tracking-tight text-slate-900 sm:text-sm whitespace-nowrap">
                    {isStudioActive ? studioName : 'Hyptrix'}
                  </span>
                </div>
              </button>
            </div>

            {/* Zone 2: Live Calendar Date, Day Counter & Annual Awards Countdown */}
            {isStudioActive && (
              <div
                data-testid="always-visible-time-bar"
                className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-black tabular-nums"
              >
                {/* Live Animated Date & Day Capsule */}
                <div className="flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/80 px-2.5 py-1 text-indigo-950">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isPageActive ? 'animate-ping bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <Calendar className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  <span className="whitespace-nowrap">{formatGameDate(gameDay, currentYear)}</span>
                  <span className="rounded-lg bg-violet-600 px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap">
                    يوم {gameDay}
                  </span>
                </div>

                {/* Annual Festival Countdown Pill */}
                <button
                  type="button"
                  onClick={() => setActiveScreen('FESTIVALS_AWARDS')}
                  className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900 transition hover:bg-amber-100 whitespace-nowrap"
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>الحفل السنوي: {daysUntilAnnualGala} يوم</span>
                </button>
              </div>
            )}

            {/* Zone 3: Treasury Cash, Market Value, Fullscreen & Settings */}
            <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
              {isStudioActive && (
                <>
                  <div
                    data-testid="hud-cash-pill"
                    className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-800 whitespace-nowrap"
                    title="سيولة الخزينة النقدية"
                  >
                    <Wallet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="hidden md:inline text-emerald-700">الخزينة:</span>
                    <span>{formatMoney(cash)}</span>
                  </div>

                  <div
                    data-testid="hud-market-value-pill"
                    className="flex items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-900 whitespace-nowrap"
                    title="القيمة السوقية للشركة"
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                    <span className="hidden md:inline text-violet-700">السوقية:</span>
                    <span>{formatMoney(marketValue)}</span>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleRequestFullscreenLandscape}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-100 bg-slate-50 text-slate-700 transition hover:bg-indigo-50"
                title="ملء الشاشة بالعرض"
                aria-label="ملء الشاشة"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>

              <PWAInstallButton />

              <button
                type="button"
                data-testid="open-settings-button"
                onClick={() => setSettingsModalOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-100 bg-slate-50 text-slate-700 transition hover:bg-indigo-50"
                title="الإعدادات وملف البيانات وإعادة الضبط"
                aria-label="الإعدادات"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setVipModalOpen(true)}
                className={`flex h-8 items-center gap-1 rounded-xl px-2.5 text-[11px] font-black text-white transition whitespace-nowrap shrink-0 ${
                  isVipActive
                    ? 'bg-emerald-600'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-105'
                }`}
              >
                <Crown className="h-3.5 w-3.5 shrink-0" />
                <span>VIP</span>
              </button>
            </div>
          </div>

          {/* Animated Live Day Progress Bar */}
          {isStudioActive && (
            <div className="h-1 w-full bg-indigo-50">
              <div
                className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${isPageActive ? dayProgressPercent : 0}%` }}
              />
            </div>
          )}

          {/* Production Quest Stepper (Visible during the 4 movie/series production stages) */}
          {isInProductionQuest && (
            <div className="border-t border-indigo-100 bg-[#F8FAFF] px-3 py-1">
              <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1.5">
                {QUEST_ORDER.map((q, idx) => {
                  const isDone = idx < currentQuestIndex;
                  const isCurrent = idx === currentQuestIndex;
                  const isLocked = idx > currentQuestIndex;

                  return (
                    <div
                      key={q.id}
                      className={`flex items-center justify-center gap-1 rounded-lg py-1 px-2 text-[11px] font-black whitespace-nowrap ${
                        isCurrent
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {isDone && <Check className="h-3 w-3 shrink-0" />}
                      {isLocked && <Lock className="h-3 w-3 shrink-0" />}
                      {isCurrent && <span className="tabular-nums">{idx + 1}.</span>}
                      <span className="truncate">{q.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.header>

      {/* MAIN WIDESCREEN GAME VIEWPORT */}
      <main
        className={
          isHubScreen
            ? 'relative z-10 flex-1 min-h-0 w-full overflow-hidden'
            : 'relative z-10 flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden px-2.5 py-2 sm:px-4'
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={!isStudioActive ? 'CREATION' : currentScreen}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className={
              isHubScreen
                ? 'mx-auto h-full w-full max-w-6xl'
                : 'mx-auto w-full max-w-5xl pb-4'
            }
          >
            {!isStudioActive || currentScreen === 'STUDIO_CREATION' ? (
              <Stage1StudioCreation />
            ) : currentScreen === 'STUDIO_HUB' ? (
              <StudioHubView
                onOpenSettings={() => setSettingsModalOpen(true)}
                selectedFacility={selectedFacility}
                onSelectFacility={setSelectedFacility}
                cameraMode={cameraMode}
                onChangeCameraMode={setCameraMode}
              />
            ) : currentScreen === 'PROJECT_SETUP' ? (
              <div className="rounded-3xl border-2 border-indigo-100 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-5">
                <Stage2ProjectSetup />
              </div>
            ) : currentScreen === 'CREW_CAST_CARDS' ? (
              <div className="rounded-3xl border-2 border-indigo-100 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-5">
                <Stage3CrewCastCards />
              </div>
            ) : currentScreen === 'PRODUCTION_CRISES' ? (
              <div className="rounded-3xl border-2 border-indigo-100 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-5">
                <Stage4ProductionCrises />
              </div>
            ) : currentScreen === 'RELEASE_SIMULATION' ? (
              <div className="rounded-3xl border-2 border-indigo-100 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-5">
                <Stage5ReleaseSimulation />
              </div>
            ) : currentScreen === 'FESTIVALS_AWARDS' ? (
              <div className="rounded-3xl border-2 border-indigo-100 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-5">
                <Stage6FestivalsAwards />
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-indigo-100 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-5">
                <LeaderboardAndSettingsView />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sudden World Breaking News & Automatic Festival Ceremonies Popups */}
      {mounted && <WorldPopupsOverlay />}

      {/* Studio Settings & Data Reset Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      {/* VIP Studio Pass Modal */}
      <VipSweatPassModal
        isOpen={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
      />
    </div>
  );
}
