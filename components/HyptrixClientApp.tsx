'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  formatGameDate,
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
import { CustomDbLoaderPanel } from '@/components/CustomDbLoaderPanel';
import { LandscapeGuard } from '@/components/LandscapeGuard';
import { playUiClick } from '@/lib/game-audio';
import {
  Crown,
  Home,
  Settings,
  Trophy,
  Calendar,
  Wallet,
  TrendingUp,
  Maximize2,
  Film,
  Users,
  Newspaper,
  Database,
  X,
  Sparkles,
} from 'lucide-react';

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
  const [modPackOpen, setModPackOpen] = useState(false);
  const [secondsIntoDay, setSecondsIntoDay] = useState(0);
  const [isPageActive, setIsPageActive] = useState(true);

  // Studio City shared interactive camera state
  const [selectedFacility, setSelectedFacility] = useState<StudioFacilityId | null>(null);
  const [cameraMode, setCameraMode] = useState<'overview' | 'focus'>('overview');

  const secondsRef = useRef(0);
  const lastAiWorldEventDayRef = useRef(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        quickStartDemoStudio();
        document.body.dataset.state = 'playing';
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [quickStartDemoStudio]);

  useEffect(() => {
    const handleGameButtonClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('button, [role="button"]')) {
        playUiClick();
      }
    };
    document.addEventListener('click', handleGameButtonClick, true);
    return () => document.removeEventListener('click', handleGameButtonClick, true);
  }, []);

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
  const currentScreen = isStudioActive ? activeScreen : 'STUDIO_CREATION';
  const isVipActive = Boolean(mounted && vipPassExpiresAt);
  const dayProgressPercent = Math.min(
    100,
    Math.round((secondsIntoDay / SECONDS_PER_GAME_DAY) * 100)
  );

  const isHubScreen = isStudioActive && currentScreen === 'STUDIO_HUB';

  return (
    <div
      dir="rtl"
      className="hyptrix-game-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden bg-[#0A0A0C] text-right text-slate-100 select-none"
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
        isRotated90={false}
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(5,6,10,.30)_0%,rgba(7,8,13,.08)_42%,rgba(5,5,8,.48)_100%)]" />

      {/* TOP LANDSCAPE GAME HUD · HOLLYWOOD GOLD */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="relative z-30 shrink-0 px-2.5 pt-2 sm:px-4"
      >
        <div className="hyptrix-glass mx-auto max-w-[1480px] overflow-hidden rounded-2xl text-slate-100">
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

            {/* Zone 2: Current game date and day */}
            {isStudioActive && (
              <div
                data-testid="always-visible-time-bar"
                className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-black tabular-nums"
              >
                {/* Live Animated Date & Day Capsule */}
                <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-amber-100">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isPageActive ? 'animate-ping bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <Calendar className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  <span className="whitespace-nowrap">{formatGameDate(gameDay, currentYear)}</span>
                  <span className="rounded-lg bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200 whitespace-nowrap">
                    يوم {gameDay}
                  </span>
                </div>

              </div>
            )}

            {/* Zone 3: Treasury Cash, Market Value, Fullscreen & Settings */}
            <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
              {isStudioActive && (
                <>
                  <div
                    data-testid="hud-cash-pill"
                    className="flex items-center gap-1 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-black text-emerald-200 whitespace-nowrap"
                    title="سيولة الخزينة النقدية"
                  >
                    <Wallet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="hidden md:inline text-emerald-700">الخزينة:</span>
                    <span>{formatMoney(cash)}</span>
                  </div>

                  <div
                    data-testid="hud-market-value-pill"
                    className="flex items-center gap-1 rounded-xl border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[11px] font-black text-violet-200 whitespace-nowrap"
                    title="القيمة السوقية للشركة"
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                    <span className="hidden md:inline text-violet-700">السوقية:</span>
                    <span>{formatMoney(marketValue)}</span>
                  </div>
                  <div className="hidden items-center gap-1 rounded-xl border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-200 whitespace-nowrap sm:flex" title="سمعة الاستوديو وترقب الجمهور">
                    <Trophy className="h-3.5 w-3.5 shrink-0" />
                    <span>Hype</span>
                    <span className="tabular-nums">{Math.round(draft.hypeScore)}</span>
                  </div>
                  <div className="hidden items-center gap-1 rounded-xl border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-black text-red-200 whitespace-nowrap md:flex" title="سمعة الشركة">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>السمعة</span>
                    <span className="tabular-nums">{Math.round(reputation)}</span>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleRequestFullscreenLandscape}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/25 bg-white/5 text-amber-200 transition hover:bg-amber-500/10"
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
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/25 bg-white/5 text-amber-200 transition hover:bg-amber-500/10"
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
            <div className="h-1 w-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-400 to-amber-200 shadow-[0_0_12px_rgba(212,175,55,.5)] transition-all duration-300"
                style={{ width: `${isPageActive ? dayProgressPercent : 0}%` }}
              />
            </div>
          )}

        </div>
      </motion.header>

      {/* MAIN WIDESCREEN GAME VIEWPORT */}
      <main
        className={
          isHubScreen
            ? 'relative z-10 flex-1 min-h-0 w-full overflow-hidden'
            : 'relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2.5 py-1 sm:px-5'
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
                ? 'mx-auto h-full w-full max-w-none'
                : 'hyptrix-glass mx-auto flex h-full max-h-full w-[86vw] max-w-[1480px] flex-col overflow-y-auto rounded-3xl p-2.5 sm:p-4'
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
              <div className="min-h-full rounded-2xl border border-amber-500/20 bg-slate-950/75 p-3 text-slate-100 shadow-xl backdrop-blur-md sm:p-4">
                <Stage2ProjectSetup />
              </div>
            ) : currentScreen === 'CREW_CAST_CARDS' ? (
              <div className="min-h-full rounded-2xl border border-amber-500/20 bg-slate-950/75 p-3 text-slate-100 shadow-xl backdrop-blur-md sm:p-4">
                <Stage3CrewCastCards />
              </div>
            ) : currentScreen === 'PRODUCTION_CRISES' ? (
              <div className="min-h-full rounded-2xl border border-amber-500/20 bg-slate-950/75 p-3 text-slate-100 shadow-xl backdrop-blur-md sm:p-4">
                <Stage4ProductionCrises />
              </div>
            ) : currentScreen === 'RELEASE_SIMULATION' ? (
              <div className="min-h-full rounded-2xl border border-amber-500/20 bg-slate-950/75 p-3 text-slate-100 shadow-xl backdrop-blur-md sm:p-4">
                <Stage5ReleaseSimulation />
              </div>
            ) : currentScreen === 'FESTIVALS_AWARDS' ? (
              <div className="min-h-full rounded-2xl border border-amber-500/20 bg-slate-950/75 p-3 text-slate-100 shadow-xl backdrop-blur-md sm:p-4">
                <Stage6FestivalsAwards />
              </div>
            ) : (
              <div className="min-h-full rounded-2xl border border-amber-500/20 bg-slate-950/75 p-3 text-slate-100 shadow-xl backdrop-blur-md sm:p-4">
                <LeaderboardAndSettingsView />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {isStudioActive && (
        <motion.nav
          initial={{ y: 26, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className="relative z-30 mx-auto flex w-full shrink-0 items-center justify-center px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 sm:px-5"
          aria-label="شريط تحكم اللعبة"
        >
          <div className="flex w-full max-w-3xl items-center justify-around gap-1.5 rounded-2xl border border-amber-500/25 bg-[#090a0e]/90 px-2 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,.4)] backdrop-blur-xl">
            <button type="button" onClick={() => setActiveScreen('PROJECT_SETUP')} className="hyptrix-dock-button flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[9px] font-black" aria-current={currentScreen === 'PROJECT_SETUP' ? 'page' : undefined}>
              <Film className="h-5 w-5" />
              <span className="truncate">عمل جديد</span>
            </button>
            <button type="button" onClick={() => setActiveScreen('CREW_CAST_CARDS')} className="hyptrix-dock-button flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[9px] font-black" aria-current={currentScreen === 'CREW_CAST_CARDS' ? 'page' : undefined}>
              <Users className="h-5 w-5" />
              <span className="truncate">النجوم والطاقم</span>
            </button>
            <button type="button" onClick={() => setActiveScreen('LEADERBOARD_SETTINGS')} className="hyptrix-dock-button flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[9px] font-black" aria-current={currentScreen === 'LEADERBOARD_SETTINGS' ? 'page' : undefined}>
              <Newspaper className="h-5 w-5" />
              <span className="truncate">غرفة الأخبار</span>
            </button>
            <button type="button" onClick={() => setActiveScreen('FESTIVALS_AWARDS')} className="hyptrix-dock-button flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[9px] font-black" aria-current={currentScreen === 'FESTIVALS_AWARDS' ? 'page' : undefined}>
              <Trophy className="h-5 w-5" />
              <span className="truncate">المهرجانات</span>
            </button>
            <button type="button" onClick={() => setModPackOpen(true)} className="hyptrix-dock-button flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[9px] font-black">
              <Database className="h-5 w-5" />
              <span className="truncate">Mod Pack</span>
            </button>
          </div>
        </motion.nav>
      )}

      <AnimatePresence>
        {modPackOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
            onMouseDown={(event) => { if (event.target === event.currentTarget) setModPackOpen(false); }}
          >
            <motion.section
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 330, damping: 28 }}
              className="hyptrix-glass flex max-h-[86dvh] w-[min(88vw,1100px)] flex-col overflow-hidden rounded-3xl"
              dir="rtl"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-amber-500/20 px-4 py-3">
                <div>
                  <p className="text-[10px] font-black tracking-[0.16em] text-amber-300">STUDIO MOD PACK</p>
                  <h2 className="mt-0.5 font-display text-base font-black text-white">إدارة قاعدة بيانات اللعبة</h2>
                </div>
                <button type="button" onClick={() => setModPackOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white" aria-label="إغلاق">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                <CustomDbLoaderPanel compact />
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Landscape lock gate: portrait players must rotate before interacting. */}
      <LandscapeGuard />

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
