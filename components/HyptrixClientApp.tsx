'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  ActiveStageScreen,
  formatGameDate,
  getDaysRemainingUntilAnnualAwards,
} from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import { StudioLogoSvg } from '@/components/StudioLogoSvg';
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

  // Automatic Real-Time Game Clock
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

  // Calm AI World Generator (triggers every 22 game days when no popup is open)
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
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [mounted, studioCreated, activeScreen]);

  // Use safe SSR defaults before client IndexedDB hydration completes so crawlers & users never see a blank loading screen
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

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#F8FAFC] text-right text-slate-900" dir="rtl">
      {/* Clean, Uncluttered Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-2.5">
          {/* Zone 1: Brand & Studio Identity */}
          <div className="flex min-w-0 items-center gap-2.5">
            {isStudioActive && currentScreen !== 'STUDIO_HUB' && (
              <button
                type="button"
                onClick={() => setActiveScreen('STUDIO_HUB')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                title="العودة للمقر الرئيسي 3D"
                aria-label="العودة للمقر الرئيسي"
              >
                <Home className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setActiveScreen(isStudioActive ? 'STUDIO_HUB' : 'STUDIO_CREATION')
              }
              className="flex min-w-0 items-center gap-2 text-right"
            >
              <StudioLogoSvg config={logo} size={30} className="shrink-0" />
              <div className="min-w-0 truncate">
                <span className="font-display text-sm font-black tracking-tight text-slate-900 whitespace-nowrap">
                  {isStudioActive ? studioName : 'Hyptrix'}
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Clean Inline Financial & Time Telemetry (When Studio is Active) */}
          {isStudioActive && (
            <div
              data-testid="always-visible-time-bar"
              className="hidden md:flex items-center gap-3 text-xs text-slate-600 tabular-nums whitespace-nowrap"
            >
              <span data-testid="hud-cash-pill">
                الخزينة: <strong className="text-emerald-700">{formatMoney(cash)}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span data-testid="hud-market-value-pill">
                القيمة السوقية: <strong className="text-violet-700">{formatMoney(marketValue)}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatGameDate(gameDay, currentYear)}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setActiveScreen('FESTIVALS_AWARDS')}
                className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline"
              >
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span>الحفل السنوي: {daysUntilAnnualGala} يوم</span>
              </button>
            </div>
          )}

          {/* Zone 3: Compact Mobile Metrics & Primary Utility Actions */}
          <div className="flex items-center gap-2 shrink-0 tabular-nums">
            {isStudioActive && (
              <div className="flex md:hidden items-center gap-2 text-[11px] font-bold">
                <span className="text-emerald-700">{formatMoney(cash)}</span>
                <span aria-hidden="true" className="text-slate-300">/</span>
                <span className="text-violet-700">{formatMoney(marketValue)}</span>
              </div>
            )}

            <PWAInstallButton />

            <button
              type="button"
              data-testid="open-settings-button"
              onClick={() => setSettingsModalOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
              title="الإعدادات وملف البيانات وإعادة الضبط"
              aria-label="الإعدادات"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setVipModalOpen(true)}
              className={`flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-bold text-white transition whitespace-nowrap shrink-0 ${
                isVipActive ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>VIP</span>
            </button>
          </div>
        </div>

        {/* Subtle 2px Day Progress Bar */}
        {isStudioActive && (
          <div className="h-0.5 w-full bg-slate-100">
            <div
              className="h-full bg-violet-600 transition-all duration-300"
              style={{ width: `${isPageActive ? dayProgressPercent : 0}%` }}
            />
          </div>
        )}

        {/* Production Quest Stepper (Only visible during the 4 production stages) */}
        {isInProductionQuest && (
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-1.5">
            <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2">
              {QUEST_ORDER.map((q, idx) => {
                const isDone = idx < currentQuestIndex;
                const isCurrent = idx === currentQuestIndex;
                const isLocked = idx > currentQuestIndex;

                return (
                  <div
                    key={q.id}
                    className={`flex items-center justify-center gap-1 rounded-lg py-1 px-2 text-xs font-bold whitespace-nowrap ${
                      isCurrent
                        ? 'bg-violet-600 text-white'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-700'
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
      </header>

      {/* Main Game Viewport */}
      <main className="mx-auto max-w-4xl px-3 py-6 sm:px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={!isStudioActive ? 'CREATION' : currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.16 }}
          >
            {!isStudioActive || currentScreen === 'STUDIO_CREATION' ? (
              <Stage1StudioCreation />
            ) : currentScreen === 'STUDIO_HUB' ? (
              <StudioHubView onOpenSettings={() => setSettingsModalOpen(true)} />
            ) : currentScreen === 'PROJECT_SETUP' ? (
              <Stage2ProjectSetup />
            ) : currentScreen === 'CREW_CAST_CARDS' ? (
              <Stage3CrewCastCards />
            ) : currentScreen === 'PRODUCTION_CRISES' ? (
              <Stage4ProductionCrises />
            ) : currentScreen === 'RELEASE_SIMULATION' ? (
              <Stage5ReleaseSimulation />
            ) : currentScreen === 'FESTIVALS_AWARDS' ? (
              <Stage6FestivalsAwards />
            ) : (
              <LeaderboardAndSettingsView />
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
