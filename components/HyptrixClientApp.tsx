'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  useGameStore,
  formatGameDate,
  getDaysRemainingUntilAnnualAwards,
  ActiveStageScreen,
} from '@/lib/store';
import {
  formatMoney,
  StudioFacilityId,
  DEFAULT_FACILITIES_LEVELS,
} from '@/lib/game-engine';
import { getResolvedDatabase } from '@/lib/db-resolver';
import { StudioLogoSvg } from './StudioLogoSvg';
import { StudioCampus3D } from './StudioCampus3D';
import StudioHubView from './StudioHubView';
import Stage1StudioCreation from './Stage1StudioCreation';
import Stage2ProjectSetup from './Stage2ProjectSetup';
import Stage3CrewCastCards from './Stage3CrewCastCards';
import Stage4ProductionCrises from './Stage4ProductionCrises';
import Stage5ReleaseSimulation from './Stage5ReleaseSimulation';
import Stage6FestivalsAwards from './Stage6FestivalsAwards';
import LeaderboardAndSettingsView from './LeaderboardAndSettingsView';
import WorldPopupsOverlay from './WorldPopupsOverlay';
import MonetizationModals from './MonetizationModals';
import SettingsModal from './SettingsModal';
import {
  Clapperboard,
  Award,
  Sparkles,
  Calendar,
  Settings,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Building2,
  Flame,
  Coins,
  X,
  Users,
  AlertTriangle,
  BarChart3,
  Trophy,
  TrendingUp,
  Play,
  Pause,
  FastForward,
} from 'lucide-react';
import {
  playClickSound,
  playTabSwitchSound,
  playAwardFanfareSound,
  toggleGameAudioMuted,
  getGameAudioMuted,
} from '@/lib/game-audio';

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
    vipCoins,
    activeScreen,
    draft,
    facilitiesLevels,
    aiMemoryLog,
    aiGeneratedActors,
    emergingCompetitors,
    breakingNewsQueue,
    festivalModalQueue,
    customDbPatch,
    groqApiKeyClient,
    preferredGroqModel,
    setActiveScreen,
    advanceGameDay,
    triggerAnnualAwardsCeremonyNow,
    addAiDiscoveredActor,
    addAiEmergingStudio,
    pushAiContextualNewsEvent,
  } = useGameStore();

  const [mounted, setMounted] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [selectedFacility, setSelectedFacility] =
    useState<StudioFacilityId | null>(null);
  const [cameraMode, setCameraMode] = useState<'overview' | 'focus'>('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Automatic Real-Time Calendar Clock State
  const [clockPaused, setClockPaused] = useState(false);
  const [clockSpeed, setClockSpeed] = useState<1 | 2>(1);
  const lastAiTriggeredDayRef = useRef<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      setAudioMuted(getGameAudioMuted());
      if (typeof window !== 'undefined') {
        setIsPortrait(window.innerHeight > window.innerWidth);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (typeof window === 'undefined') return;
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // =========================================================================
  // AUTOMATIC GAME CALENDAR PROGRESSION (Real Strategy Game Clock)
  // =========================================================================
  useEffect(() => {
    if (!mounted || !studioCreated || clockPaused) return;
    // Pause automatic day tick while a festival ceremony modal is open so the player doesn't miss it
    if (festivalModalQueue.length > 0) return;

    const intervalMs = clockSpeed === 2 ? 3200 : 6200;
    const interval = setInterval(() => {
      advanceGameDay(1);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    mounted,
    studioCreated,
    clockPaused,
    clockSpeed,
    festivalModalQueue.length,
    advanceGameDay,
  ]);

  // =========================================================================
  // BACKGROUND AI WORLD SIMULATION ENGINE (Rising Stars, Emerging Studios & AI News)
  // =========================================================================
  useEffect(() => {
    if (!mounted || !studioCreated) return;
    if (gameDay <= 3 || lastAiTriggeredDayRef.current === gameDay) return;
    if (breakingNewsQueue.length > 0 || festivalModalQueue.length > 0) return;

    const shouldDiscoverRisingStar = gameDay % 18 === 0;
    const shouldDiscoverEmergingStudio = gameDay % 25 === 0;
    const shouldGenerateMemoryNews = gameDay % 21 === 0;

    if (
      !shouldDiscoverRisingStar &&
      !shouldDiscoverEmergingStudio &&
      !shouldGenerateMemoryNews
    ) {
      return;
    }

    lastAiTriggeredDayRef.current = gameDay;
    const db = getResolvedDatabase(customDbPatch);

    if (shouldDiscoverRisingStar) {
      const existingNames = [
        ...db.actors.map((a) => a.name),
        ...aiGeneratedActors.map((a) => a.name),
      ];
      fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'discover_ai_rising_star',
          groqKeyOverride: groqApiKeyClient,
          preferredModel: preferredGroqModel,
          payload: {
            studioName,
            ceoName,
            gameDay,
            currentYear,
            existingNames,
            aiMemoryLog,
          },
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.actor) {
            addAiDiscoveredActor(data.actor, data.headline, data.detail);
          }
        })
        .catch(() => {});
      return;
    }

    if (shouldDiscoverEmergingStudio) {
      const existingStudios = [
        ...db.competitor_studios.map((s) => s.name),
        ...emergingCompetitors.map((s) => s.name),
      ];
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
            gameDay,
            currentYear,
            existingStudios,
            aiMemoryLog,
          },
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.studio) {
            addAiEmergingStudio(data.studio, data.headline, data.detail);
          }
        })
        .catch(() => {});
      return;
    }

    if (shouldGenerateMemoryNews) {
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
          if (data && data.headline) {
            pushAiContextualNewsEvent(data);
          }
        })
        .catch(() => {});
    }
  }, [
    mounted,
    studioCreated,
    gameDay,
    currentYear,
    studioName,
    ceoName,
    marketValue,
    cash,
    aiMemoryLog,
    aiGeneratedActors,
    emergingCompetitors,
    breakingNewsQueue.length,
    festivalModalQueue.length,
    customDbPatch,
    groqApiKeyClient,
    preferredGroqModel,
    addAiDiscoveredActor,
    addAiEmergingStudio,
    pushAiContextualNewsEvent,
  ]);

  const handleToggleFullscreen = async () => {
    playClickSound();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen restrictions
    }
  };

  const handleToggleMute = () => {
    const nextMuted = toggleGameAudioMuted();
    setAudioMuted(nextMuted);
    if (!nextMuted) {
      playClickSound();
    }
  };

  if (!mounted) {
    return null;
  }

  const isStageModalOpen =
    studioCreated &&
    activeScreen !== 'STUDIO_HUB' &&
    activeScreen !== 'STUDIO_CREATION';

  const getStageMeta = (screen: ActiveStageScreen) => {
    switch (screen) {
      case 'PROJECT_SETUP':
        return {
          title: 'تطوير العمل السينمائي والسيناريو بالذكاء الاصطناعي',
          badge: 'المرحلة 1 / 5',
          icon: Clapperboard,
        };
      case 'CREW_CAST_CARDS':
        return {
          title: 'التعاقد مع المخرج وطاقم النجوم ومفاوضات الوكلاء',
          badge: 'المرحلة 2 / 5',
          icon: Users,
        };
      case 'PRODUCTION_CRISES':
        return {
          title: 'الميزانية التفصيلية وبلاتوه التصوير',
          badge: 'المرحلة 3 / 5',
          icon: AlertTriangle,
        };
      case 'RELEASE_SIMULATION':
        return {
          title: 'العرض الأول وتتبع شباك التذاكر والمنصات',
          badge: 'المرحلة 4 / 5',
          icon: BarChart3,
        };
      case 'FESTIVALS_AWARDS':
        return {
          title: 'السجادة الحمراء والمهرجانات والجوائز السنوية',
          badge: 'المرحلة 5 / 5',
          icon: Award,
        };
      case 'LEADERBOARD_SETTINGS':
        return {
          title: 'تصنيف الإمبراطوريات والشركات المنافسة',
          badge: 'التصنيف العالمي',
          icon: Trophy,
        };
      default:
        return {
          title: 'إدارة الإنتاج',
          badge: '',
          icon: Clapperboard,
        };
    }
  };

  const stageMeta = getStageMeta(activeScreen);
  const StageIcon = stageMeta.icon;
  const daysToGala = getDaysRemainingUntilAnnualAwards(gameDay);

  return (
    <div
      dir="rtl"
      className="relative w-full h-full overflow-hidden select-none bg-[#0A0A0C] text-slate-100"
    >
      {/* =====================================================================
          LAYER 1: 3D STUDIO CITY CANVAS (z-0, Fullscreen Interactive WebGL)
      ===================================================================== */}
      <div className="absolute inset-0 z-0">
        <StudioCampus3D
          studioName={studioName || 'HYPTRIX'}
          facilitiesLevels={facilitiesLevels || DEFAULT_FACILITIES_LEVELS}
          selectedFacility={selectedFacility}
          cameraMode={cameraMode}
          onSelectFacility={(facId) => {
            playClickSound();
            setSelectedFacility(facId);
            setCameraMode('focus');
          }}
          isFilmingActive={activeScreen === 'PRODUCTION_CRISES'}
          fullScreenBackground
          isRotated90={isPortrait}
        />
      </div>

      {/* =====================================================================
          LAYER 2: TOP COMPACT FLOATING HUD BAR (z-20)
      ===================================================================== */}
      {studioCreated && (
        <header className="absolute top-0 inset-x-0 z-20 h-9 px-2.5 backdrop-blur-md bg-slate-950/75 border-b border-amber-500/25 flex items-center justify-between gap-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.65)]">
          {/* Right Section: Studio Identity & Active Project */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                playTabSwitchSound();
                setActiveScreen('STUDIO_HUB');
                setCameraMode('overview');
                setSelectedFacility(null);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-slate-900/90 px-2 py-0.5 hover:border-amber-400/60 transition-all active:scale-95"
            >
              <StudioLogoSvg config={logo} size={20} className="shrink-0" />
              <span className="text-[11px] font-black text-white truncate max-w-[90px] sm:max-w-[130px]">
                {studioName}
              </span>
            </button>

            {draft.title && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  if (activeScreen === 'STUDIO_HUB') {
                    setActiveScreen('PROJECT_SETUP');
                  } else {
                    setActiveScreen('STUDIO_HUB');
                  }
                }}
                className="hidden sm:flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20 transition-all active:scale-95"
              >
                <Clapperboard className="h-3 w-3" />
                <span className="truncate max-w-[95px]">«{draft.title}»</span>
              </button>
            )}
          </div>

          {/* Center Section: Core Game Resources + Live Automatic Calendar + Annual Awards Countdown */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide">
            {/* Treasury Cash */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setVipModalOpen(true);
              }}
              className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-slate-900/85 px-2 py-0.5 hover:border-emerald-400 transition-all active:scale-95 shrink-0"
              title="سيولة الخزينة"
            >
              <Coins className="h-3 w-3 text-emerald-400" />
              <span className="font-mono text-[10px] sm:text-[11px] font-black text-emerald-300">
                {formatMoney(cash)}
              </span>
              <span className="rounded bg-emerald-500/20 px-1 text-[8px] font-black text-emerald-300">
                +
              </span>
            </button>

            {/* Studio Market Valuation */}
            <div
              className="hidden md:flex items-center gap-1 rounded-lg border border-amber-500/25 bg-slate-900/85 px-2 py-0.5 shrink-0"
              title="القيمة السوقية للشركة"
            >
              <TrendingUp className="h-3 w-3 text-amber-400" />
              <span className="text-[9px] font-bold text-slate-400">القيمة</span>
              <span className="font-mono text-[10px] font-black text-amber-300">
                {formatMoney(marketValue)}
              </span>
            </div>

            {/* Reputation */}
            <div
              className="flex items-center gap-1 rounded-lg border border-amber-500/25 bg-slate-900/85 px-2 py-0.5 shrink-0"
              title="سمعة الاستوديو الفنية"
            >
              <Award className="h-3 w-3 text-amber-400" />
              <span className="font-mono text-[10px] font-black text-amber-300">
                {reputation}/100
              </span>
            </div>

            {/* Hype */}
            <div
              className="hidden sm:flex items-center gap-1 rounded-lg border border-rose-500/25 bg-slate-900/85 px-2 py-0.5 shrink-0"
              title="الترقب الجماهيري"
            >
              <Flame className="h-3 w-3 text-rose-400" />
              <span className="font-mono text-[10px] font-black text-rose-300">
                {draft.hypeScore}%
              </span>
            </div>

            {/* VIP Coins */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setVipModalOpen(true);
              }}
              className="hidden lg:flex items-center gap-1 rounded-lg border border-purple-500/25 bg-slate-900/85 px-2 py-0.5 shrink-0"
              title="رصيد عملات VIP"
            >
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span className="font-mono text-[10px] font-black text-purple-300">
                {vipCoins} VIP
              </span>
            </button>

            {/* Live Calendar + Play/Pause & Speed Control */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 px-2 py-0.5 text-[10px] font-bold text-slate-200 shrink-0">
              <Calendar className="h-3 w-3 text-amber-400" />
              <span>{formatGameDate(gameDay, currentYear)}</span>
              <span className="text-[9px] text-slate-400 font-mono">
                (يوم #{gameDay})
              </span>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setClockPaused((p) => !p);
                }}
                className="ml-0.5 rounded bg-slate-800 p-0.5 text-amber-300 hover:bg-slate-700"
                title={clockPaused ? 'استئناف مرور الأيام التلقائي' : 'إيقاف مرور الأيام مؤقتاً'}
              >
                {clockPaused ? (
                  <Play className="h-2.5 w-2.5" />
                ) : (
                  <Pause className="h-2.5 w-2.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setClockSpeed((s) => (s === 1 ? 2 : 1));
                  setClockPaused(false);
                }}
                className={`rounded px-1 text-[8px] font-mono font-black ${
                  clockSpeed === 2
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
                title="تغيير سرعة مرور الأيام التلقائية"
              >
                <FastForward className="inline h-2 w-2 mr-0.5" />
                {clockSpeed}x
              </button>
            </div>

            {/* Annual Awards Gala Countdown & Instant Trigger */}
            <button
              type="button"
              onClick={() => {
                playAwardFanfareSound();
                triggerAnnualAwardsCeremonyNow();
              }}
              className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300 hover:bg-amber-500/25 transition-all active:scale-95 shrink-0"
              title="موعد الحفل السنوي لتوزيع جوائز السينما والدراما (اضغط لإقامة الحفل السنوي الآن)"
            >
              <Trophy className="h-3 w-3 text-amber-400" />
              <span className="hidden sm:inline">الحفل السنوي:</span>
              <span className="font-mono">{daysToGala} يوم</span>
            </button>
          </div>

          {/* Left Section: System Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleToggleMute}
              className="flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/85 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition-all active:scale-95"
              title={audioMuted ? 'تشغيل المؤثرات الصوتية' : 'كتم المؤثرات الصوتية'}
            >
              {audioMuted ? (
                <VolumeX className="h-3 w-3 text-rose-400" />
              ) : (
                <Volume2 className="h-3 w-3 text-amber-400" />
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="hidden sm:flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/85 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition-all active:scale-95"
              title="ملء الشاشة"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setSettingsOpen(true);
              }}
              className="flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/85 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition-all active:scale-95"
              title="الإعدادات ومحرك الذكاء الاصطناعي والحفظ"
            >
              <Settings className="h-3 w-3" />
            </button>
          </div>
        </header>
      )}

      {/* =====================================================================
          LAYER 3: STUDIO HUB DOCK & BUILDING INSPECTOR (z-20)
      ===================================================================== */}
      {studioCreated && (
        <StudioHubView
          selectedFacility={selectedFacility}
          onSelectFacility={(facId) => {
            playClickSound();
            setSelectedFacility(facId);
            setCameraMode(facId ? 'focus' : 'overview');
          }}
        />
      )}

      {/* =====================================================================
          LAYER 4: STAGE 1 CREATION OR FLOATING STAGE MODALS (z-30)
      ===================================================================== */}
      {!studioCreated || activeScreen === 'STUDIO_CREATION' ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-2 sm:p-3 bg-black/55 backdrop-blur-sm">
          <div className="w-[90%] max-w-4xl max-h-[88%] overflow-y-auto scrollbar-hide">
            <Stage1StudioCreation />
          </div>
        </div>
      ) : (
        isStageModalOpen && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pt-9 pb-11 px-2 sm:px-4 pointer-events-none">
            <div className="pointer-events-auto relative flex flex-col w-[90%] sm:w-[86%] max-w-5xl max-h-[82%] rounded-2xl border border-amber-500/25 bg-slate-950/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden">
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-3 py-1.5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400">
                    <StageIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-black text-white">
                      {stageMeta.title}
                    </h2>
                    {stageMeta.badge && (
                      <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[9px] font-black text-amber-300">
                        {stageMeta.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage Quick Switcher + Minimize to 3D City Button */}
                <div className="flex items-center gap-1.5">
                  <div className="hidden md:flex items-center gap-1">
                    {(
                      [
                        { id: 'PROJECT_SETUP', label: '1. السيناريو' },
                        { id: 'CREW_CAST_CARDS', label: '2. النجوم' },
                        { id: 'PRODUCTION_CRISES', label: '3. الميزانية والتصوير' },
                        { id: 'RELEASE_SIMULATION', label: '4. الإيرادات' },
                        { id: 'FESTIVALS_AWARDS', label: '5. الجوائز' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          playTabSwitchSound();
                          setActiveScreen(st.id);
                        }}
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold transition-all ${
                          activeScreen === st.id
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActiveScreen('STUDIO_HUB');
                    }}
                    className="flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition-all active:scale-95"
                    title="معاينة مدينة الإنتاج ثلاثية الأبعاد"
                  >
                    <Building2 className="h-3 w-3 text-amber-400" />
                    <span className="hidden sm:inline">معاينة المدينة</span>
                    <X className="h-3 w-3 text-slate-400 sm:hidden" />
                  </button>
                </div>
              </div>

              {/* Modal Body Content (Bounded, Scrollbar-Hidden) */}
              <div className="flex-1 overflow-y-auto scrollbar-hide p-2.5 sm:p-3.5">
                {activeScreen === 'PROJECT_SETUP' && <Stage2ProjectSetup />}
                {activeScreen === 'CREW_CAST_CARDS' && <Stage3CrewCastCards />}
                {activeScreen === 'PRODUCTION_CRISES' && <Stage4ProductionCrises />}
                {activeScreen === 'RELEASE_SIMULATION' && <Stage5ReleaseSimulation />}
                {activeScreen === 'FESTIVALS_AWARDS' && <Stage6FestivalsAwards />}
                {activeScreen === 'LEADERBOARD_SETTINGS' && (
                  <LeaderboardAndSettingsView />
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* =====================================================================
          AUXILIARY MODALS: SETTINGS, WORLD EVENTS, & MONETIZATION STORE
      ===================================================================== */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <WorldPopupsOverlay />
      <MonetizationModals
        isOpen={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
      />
    </div>
  );
}

export default HyptrixClientApp;
