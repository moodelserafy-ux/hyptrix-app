'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  ActiveStageScreen,
  formatGameDate,
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
  Wallet,
  Calendar,
  Home,
  Lock,
  Check,
  Gem,
  Clock,
  PauseCircle,
  Settings,
} from 'lucide-react';

const QUEST_ORDER: { id: ActiveStageScreen; label: string }[] = [
  { id: 'PROJECT_SETUP', label: 'تطوير السيناريو' },
  { id: 'CREW_CAST_CARDS', label: 'سوق الممثلين' },
  { id: 'PRODUCTION_CRISES', label: 'التصوير' },
  { id: 'RELEASE_SIMULATION', label: 'العرض والإيرادات' },
  { id: 'FESTIVALS_AWARDS', label: 'المهرجانات' },
];

const SECONDS_PER_GAME_DAY = 15;

export default function HyptrixMainPage() {
  const {
    studioCreated,
    studioName,
    logo,
    cash,
    currentYear,
    gameDay,
    vipCoins,
    vipPassExpiresAt,
    activeScreen,
    groqApiKeyClient,
    preferredGroqModel,
    setActiveScreen,
    advanceGameDay,
    addAiDiscoveredActor,
    quickStartDemoStudio,
  } = useGameStore();

  const [mounted, setMounted] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [secondsIntoDay, setSecondsIntoDay] = useState(0);
  const [isPageActive, setIsPageActive] = useState(true);
  const secondsRef = useRef(0);
  const lastAiTickDayRef = useRef(1);

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

  // Track whether the player is actively inside the website (tab visible and window focused)
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

  // Automatic Real-Time Game Clock (NO manual day skip button):
  // Advances automatically ONLY when the player has founded a studio AND is actively inside the website.
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

  // Periodically ask the AI engine to invent a brand-new rising talent as days progress
  useEffect(() => {
    if (!mounted || !studioCreated) return;
    if (gameDay > lastAiTickDayRef.current && gameDay % 15 === 0) {
      lastAiTickDayRef.current = gameDay;
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
    }
  }, [
    mounted,
    studioCreated,
    gameDay,
    currentYear,
    groqApiKeyClient,
    preferredGroqModel,
    addAiDiscoveredActor,
  ]);

  useEffect(() => {
    if (!mounted) return;
    document.body.dataset.state = studioCreated ? 'playing' : 'title';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [mounted, studioCreated, activeScreen]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F5FF] text-slate-900">
        <div className="text-center">
          <div className="font-display text-3xl font-black tracking-widest text-violet-600">
            HYPTRIX
          </div>
          <div className="mt-1.5 text-xs font-bold text-slate-500">
            جاري تجهيز مقر الاستوديو...
          </div>
        </div>
      </div>
    );
  }

  const isVipActive = Boolean(vipPassExpiresAt);
  const currentQuestIndex = QUEST_ORDER.findIndex((q) => q.id === activeScreen);
  const isInProductionQuest = studioCreated && currentQuestIndex !== -1;

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden bg-[#F2F5FF] text-right text-slate-900"
      dir="rtl"
    >
      {/* Luminous Studio Backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="absolute top-32 -left-24 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute bottom-10 right-1/3 h-72 w-72 rounded-full bg-rose-300/20 blur-3xl" />
      </div>

      {/* Top Executive Studio HUD Bar */}
      <header className="sticky top-0 z-30 border-b-2 border-indigo-100/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-3 py-2 sm:px-4">
          {/* Studio Identity + Home Return */}
          <div className="flex min-w-0 items-center gap-2">
            {studioCreated && activeScreen !== 'STUDIO_HUB' && (
              <button
                type="button"
                onClick={() => setActiveScreen('STUDIO_HUB')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-[#F5F7FF] text-violet-700 transition active:border-b-2 active:translate-y-0.5"
                title="العودة للمقر الرئيسي"
                aria-label="العودة للمقر الرئيسي"
              >
                <Home className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setActiveScreen(studioCreated ? 'STUDIO_HUB' : 'STUDIO_CREATION')
              }
              className="flex min-w-0 items-center gap-2 text-right"
            >
              <div className="rounded-2xl border-2 border-indigo-100 bg-white p-1 shadow-xs">
                <StudioLogoSvg config={logo} size={32} className="shrink-0" />
              </div>
              <div className="min-w-0 truncate">
                <div className="font-display text-sm font-black tracking-tight text-violet-700">
                  HYPTRIX
                </div>
                <div className="truncate text-[11px] font-black text-slate-700">
                  {studioCreated ? studioName : 'تأسيس الاستوديو'}
                </div>
              </div>
            </button>
          </div>

          {/* Studio Financial, Settings & VIP Controls */}
          <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
            {studioCreated && (
              <>
                <div
                  data-testid="hud-cash-pill"
                  className="flex items-center gap-1 rounded-2xl border-2 border-emerald-100 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-black text-emerald-700"
                >
                  <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{formatMoney(cash)}</span>
                </div>

                <div className="hidden xs:flex items-center gap-1 rounded-2xl border-2 border-violet-100 bg-violet-50 px-2 py-1 text-[11px] font-black text-violet-700">
                  <Gem className="h-3.5 w-3.5 text-violet-600" />
                  <span>{vipCoins}</span>
                </div>
              </>
            )}

            <PWAInstallButton />

            {/* Dedicated Settings Button (JSON Import & Full Reset) */}
            <button
              type="button"
              data-testid="open-settings-button"
              onClick={() => setSettingsModalOpen(true)}
              className="flex min-h-[38px] items-center gap-1 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-[#F5F7FF] px-2.5 py-1.5 text-xs font-black text-slate-700 transition hover:border-violet-300 hover:text-violet-700 active:border-b-2 active:translate-y-0.5"
              title="الإعدادات وملف البيانات وإعادة الضبط"
              aria-label="الإعدادات"
            >
              <Settings className="h-4 w-4 text-violet-600" />
              <span className="hidden sm:inline">الإعدادات</span>
            </button>

            <button
              type="button"
              onClick={() => setVipModalOpen(true)}
              className={`flex min-h-[38px] items-center gap-1 rounded-2xl border-b-4 px-3 py-1.5 text-xs font-black text-white shadow-xs transition active:border-b-0 active:translate-y-1 whitespace-nowrap shrink-0 ${
                isVipActive
                  ? 'border-emerald-800/40 bg-emerald-500'
                  : 'border-indigo-950/30 bg-gradient-to-r from-violet-600 to-fuchsia-600'
              }`}
            >
              <Crown className="h-3.5 w-3.5 shrink-0" />
              <span>VIP</span>
            </button>
          </div>
        </div>

        {/* Active-Session Calendar & Time Bar (Automatic Only — No Manual Day Skip Button!) */}
        {studioCreated && (
          <div
            data-testid="always-visible-time-bar"
            className="border-t border-indigo-100/80 bg-gradient-to-r from-indigo-50/95 via-violet-50/90 to-cyan-50/90 px-3 py-1.5"
          >
            <div className="mx-auto flex max-w-xl items-center justify-between gap-2 text-[11px] tabular-nums">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center gap-1 font-display font-black text-indigo-950">
                  <Calendar className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  <span>{formatGameDate(gameDay, currentYear)}</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  · اليوم #{gameDay}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isPageActive ? (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-indigo-100">
                    <Clock className="h-3 w-3 text-violet-600 animate-spin" />
                    <span>
                      يمر تلقائياً ({Math.max(1, SECONDS_PER_GAME_DAY - secondsIntoDay)}ث لليوم الجديد)
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                    <PauseCircle className="h-3 w-3 text-amber-600" />
                    <span>متوقف مؤقتاً</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Production Stage Stepper */}
        {isInProductionQuest && (
          <div className="border-t border-indigo-100 bg-[#F7F9FF] px-3 py-2">
            <div className="mx-auto grid max-w-xl grid-cols-5 gap-1.5">
              {QUEST_ORDER.map((q, idx) => {
                const isDone = idx < currentQuestIndex;
                const isCurrent = idx === currentQuestIndex;
                const isLocked = idx > currentQuestIndex;

                return (
                  <div
                    key={q.id}
                    className={`flex items-center justify-center gap-1 rounded-xl border py-1.5 px-1 text-[10px] font-black transition-all ${
                      isCurrent
                        ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                        : isDone
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200/70 bg-slate-100/80 text-slate-400'
                    }`}
                  >
                    {isDone && <Check className="h-3 w-3 shrink-0 stroke-[3]" />}
                    {isLocked && <Lock className="h-2.5 w-2.5 shrink-0" />}
                    {isCurrent && <span className="tabular-nums">{idx + 1}.</span>}
                    <span className="truncate">{q.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Mobile Game Viewport */}
      <main className="mx-auto max-w-xl px-3 pt-3 pb-12 sm:px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={!studioCreated ? 'CREATION' : activeScreen}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {!studioCreated || activeScreen === 'STUDIO_CREATION' ? (
              <Stage1StudioCreation />
            ) : activeScreen === 'STUDIO_HUB' ? (
              <StudioHubView onOpenSettings={() => setSettingsModalOpen(true)} />
            ) : activeScreen === 'PROJECT_SETUP' ? (
              <Stage2ProjectSetup />
            ) : activeScreen === 'CREW_CAST_CARDS' ? (
              <Stage3CrewCastCards />
            ) : activeScreen === 'PRODUCTION_CRISES' ? (
              <Stage4ProductionCrises />
            ) : activeScreen === 'RELEASE_SIMULATION' ? (
              <Stage5ReleaseSimulation />
            ) : activeScreen === 'FESTIVALS_AWARDS' ? (
              <Stage6FestivalsAwards />
            ) : (
              <LeaderboardAndSettingsView />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sudden World Breaking News & Automatic Festival Ceremonies Popups */}
      <WorldPopupsOverlay />

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
