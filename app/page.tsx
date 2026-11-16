'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
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
  Wallet,
  TrendingUp,
  Calendar,
  Clock,
  PauseCircle,
  Settings,
  Trophy,
} from 'lucide-react';

const SECONDS_PER_GAME_DAY = 15;

export default function HyptrixMainPage() {
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
  const [isScrolled, setIsScrolled] = useState(false);
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

  // Track scroll position for floating animated mobile game navbar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Automatic Real-Time Game Clock:
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

  // Calm, non-spammy AI World Generator (triggers only every 22 game days when no popup is open):
  // Rotates between AI-generated contextual industry news, AI-invented rising stars, and AI-invented emerging studios.
  useEffect(() => {
    if (!mounted || !studioCreated) return;
    if (breakingNewsQueue.length > 0 || festivalModalQueue.length > 0) return;

    if (gameDay > lastAiWorldEventDayRef.current && gameDay % 22 === 0) {
      lastAiWorldEventDayRef.current = gameDay;
      const cycle = Math.floor(gameDay / 22) % 3;

      if (cycle === 1) {
        // 1. AI invents a brand-new Rising Star Actor/Actress
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
        // 2. AI invents a brand-new Emerging Competitor Production Studio
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
        // 3. AI generates contextual journalistic breaking news from the player's AI memory log
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
                category: data.category || 'ai_industry_report',
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
  const daysUntilAnnualGala = getDaysRemainingUntilAnnualAwards(gameDay);

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

      {/* Compact cinematic studio HUD */}
      <motion.header
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="fixed top-0 right-0 left-0 z-40 px-2 pt-2 sm:px-4"
      >
        <motion.div
          animate={{ scale: isScrolled ? 0.99 : 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className={`relative mx-auto max-w-5xl overflow-hidden rounded-[24px] border bg-white/95 shadow-[0_14px_38px_-16px_rgba(67,56,202,0.28)] backdrop-blur-xl transition-all duration-300 ${
            isScrolled ? 'border-violet-200 shadow-[0_18px_44px_-16px_rgba(99,102,241,0.38)]' : 'border-white/80'
          }`}
        >
          <div className="h-0.5 w-full bg-gradient-to-l from-cyan-400 via-violet-500 to-fuchsia-500" />
          <div className="flex min-h-[58px] items-center justify-between gap-2 px-2.5 py-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveScreen(studioCreated ? 'STUDIO_HUB' : 'STUDIO_CREATION')}
                className="group flex min-w-0 items-center gap-2 text-right"
              >
                <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-1 shadow-sm transition group-hover:scale-105">
                  <StudioLogoSvg config={logo} size={28} className="shrink-0" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-display bg-gradient-to-r from-violet-700 via-indigo-600 to-cyan-600 bg-clip-text text-[11px] font-black tracking-tight text-transparent">
                      HYPTRIX
                    </span>
                    {studioCreated && (
                      <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[8px] font-black text-violet-700">
                        {reputation}%
                      </span>
                    )}
                  </div>
                  <div className="max-w-[118px] truncate text-[10px] font-black text-slate-800 sm:max-w-[180px] sm:text-[11px]">
                    {studioCreated ? studioName : 'تأسيس الاستوديو'}
                  </div>
                </div>
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 tabular-nums">
              {studioCreated && (
                <>
                  <div
                    data-testid="hud-cash-pill"
                    title="الخزينة النقدية المتاحة للإنتاج والأجور"
                    className="flex h-8 items-center gap-1 rounded-xl border border-emerald-100 bg-emerald-50/85 px-1.5 text-[9px] font-black text-emerald-800 sm:px-2 sm:text-[10px]"
                  >
                    <Wallet className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{formatMoney(cash)}</span>
                  </div>
                  <div
                    data-testid="hud-market-value-pill"
                    title="القيمة السوقية الإجمالية للشركة"
                    className="hidden h-8 items-center gap-1 rounded-xl border border-violet-100 bg-violet-50/85 px-1.5 text-[9px] font-black text-violet-800 sm:flex sm:px-2 sm:text-[10px]"
                  >
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                    <span>{formatMoney(marketValue)}</span>
                  </div>
                </>
              )}

              <PWAInstallButton />

              <button
                type="button"
                data-testid="open-settings-button"
                onClick={() => setSettingsModalOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
                title="الإعدادات وملف البيانات وإعادة الضبط"
                aria-label="الإعدادات"
              >
                <Settings className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setVipModalOpen(true)}
                aria-label="عضوية VIP"
                className={`flex h-8 items-center gap-1 rounded-xl px-2 text-[10px] font-black text-white shadow-sm transition hover:brightness-105 ${
                  vipPassExpiresAt
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-l from-amber-500 via-fuchsia-600 to-violet-600'
                }`}
              >
                <Crown className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">VIP</span>
              </button>
            </div>
          </div>

          {studioCreated && (
            <div
              data-testid="always-visible-time-bar"
              className="flex items-center justify-between gap-2 border-t border-slate-100 bg-gradient-to-l from-slate-950 via-indigo-950 to-violet-950 px-3 py-1.5 text-white sm:px-4"
            >
              <div className="flex min-w-0 items-center gap-1.5 text-[10px] tabular-nums sm:text-[11px]">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span className="truncate font-display font-black">{formatGameDate(gameDay, currentYear)}</span>
                <span className="shrink-0 text-[9px] font-bold text-indigo-200">· يوم {gameDay}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveScreen('FESTIVALS_AWARDS')}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-[9px] font-black text-amber-200 transition hover:bg-amber-400/20 sm:text-[10px]"
                  title="العد التنازلي للحفل السنوي التلقائي"
                >
                  <Trophy className="h-3 w-3" />
                  <span>{daysUntilAnnualGala} يوم للحفل</span>
                </button>
                {isPageActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold text-cyan-100">
                    <Clock className="h-3 w-3 animate-spin text-cyan-300" />
                    {Math.max(1, SECONDS_PER_GAME_DAY - secondsIntoDay)}ث
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[9px] font-bold text-amber-100">
                    <PauseCircle className="h-3 w-3 text-amber-300" />
                    متوقف
                  </span>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.header>

      {/* Main Mobile Game Viewport with top spacing for the floating navbar */}
      <main
        className={`mx-auto max-w-xl px-3 pb-8 sm:px-4 ${
          studioCreated ? 'pt-28' : 'pt-20'
        }`}
      >
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
